import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const exportQuerySchema = z.object({
  photos: z
    .string()
    .transform((str) => str.split(','))
    .pipe(z.array(z.string().uuid())),
  quality: z.enum(['original', 'compressed']).default('compressed'),
});

// GET /api/admin/gallery/export/zip
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);

    const query = exportQuerySchema.parse({
      photos: searchParams.get('photos'),
      quality: searchParams.get('quality'),
    });

    const supabase = await createServerSupabaseServiceClient();

    // Get photo data
    const { data: photos, error } = await supabase
      .from('photos')
      .select(
        `
        id, original_filename, storage_path, preview_path,
        events!inner(name, school),
        photo_students!left(
          students!inner(name, grade, section)
        )
      `
      )
      .in('id', query.photos);

    if (error) {
      throw error;
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: 'No photos found for export' },
        { status: 404 }
      );
    }

    // Generate signed URLs for each photo
    const downloadData: Array<{
      filename: string;
      url: string;
      path: string;
      studentName?: string;
      eventName: string;
    }> = [];

    for (const photo of photos) {
      const path =
        query.quality === 'original' ? photo.storage_path : photo.preview_path;

      if (path) {
        const { data: signedUrl } = await supabase.storage
          .from('photos')
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (signedUrl?.signedUrl) {
          // Build organized filename with context
          const eventName = `${photo.events.school} - ${photo.events.name}`;
          const studentName = photo.photo_students?.[0]?.students?.name;
          const grade = photo.photo_students?.[0]?.students?.grade;
          const section = photo.photo_students?.[0]?.students?.section;

          let organizePath = '';
          if (studentName) {
            const studentInfo = [studentName, grade, section]
              .filter(Boolean)
              .join(' - ');
            organizePath = `${studentInfo}/`;
          }

          downloadData.push({
            filename: photo.original_filename,
            url: signedUrl.signedUrl,
            path: `${eventName}/${organizePath}${photo.original_filename}`,
            studentName,
            eventName,
          });
        }
      }
    }

    if (downloadData.length === 0) {
      return NextResponse.json(
        { error: 'No downloadable photos found' },
        { status: 404 }
      );
    }

    // For client-side ZIP creation, return the download data
    // In a production environment, you might want to create the ZIP server-side
    return NextResponse.json({
      success: true,
      photos: downloadData,
      metadata: {
        totalPhotos: downloadData.length,
        quality: query.quality,
        exportedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/gallery/export/zip:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

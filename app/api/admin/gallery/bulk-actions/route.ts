import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const bulkActionSchema = z.object({
  action: z.enum([
    'approve',
    'reject',
    'tag_students',
    'move_to_course',
    'delete',
    'export',
  ]),
  photoIds: z.array(z.string()).min(1, 'At least one photo ID required'),
  context: z.object({
    path: z.object({
      event: z.object({ id: z.string(), name: z.string() }).optional(),
      level: z.object({ id: z.string(), name: z.string() }).optional(),
      course: z
        .object({ id: z.string(), name: z.string(), isFolder: z.boolean() })
        .optional(),
      student: z.object({ id: z.string(), name: z.string() }).optional(),
    }),
  }),
  metadata: z
    .object({
      studentIds: z.array(z.string()).optional(),
      targetCourseId: z.string().optional(),
      approvalReason: z.string().optional(),
      exportFormat: z.enum(['zip', 'folder']).optional(),
      exportQuality: z.enum(['original', 'compressed']).optional(),
    })
    .optional(),
});

// POST /api/admin/gallery/bulk-actions
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validatedData = bulkActionSchema.parse(body);

    const supabase = await createServerSupabaseServiceClient();

    // Process in batches to avoid timeouts
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < validatedData.photoIds.length; i += batchSize) {
      batches.push(validatedData.photoIds.slice(i, i + batchSize));
    }

    let totalProcessed = 0;
    let totalFailed = 0;
    const errors: string[] = [];
    let downloadUrl: string | undefined;

    // Process each batch
    for (const batch of batches) {
      try {
        const result = await processBatch(
          supabase,
          validatedData.action,
          batch,
          validatedData.metadata || {}
        );
        totalProcessed += result.processed;
        totalFailed += result.failed;

        if (result.errors) {
          errors.push(...result.errors);
        }

        if (result.downloadUrl) {
          downloadUrl = result.downloadUrl;
        }
      } catch (error) {
        console.error(`Batch processing error:`, error);
        totalFailed += batch.length;
        errors.push(
          `Batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: totalProcessed > 0,
      processed: totalProcessed,
      failed: totalFailed,
      errors: errors.length > 0 ? errors : undefined,
      downloadUrl,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/gallery/bulk-actions:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

async function processBatch(
  supabase: any,
  action: string,
  photoIds: string[],
  metadata: any
): Promise<{
  processed: number;
  failed: number;
  errors?: string[];
  downloadUrl?: string;
}> {
  switch (action) {
    case 'approve':
      return await approvePhotos(supabase, photoIds, metadata.approvalReason);

    case 'reject':
      return await rejectPhotos(supabase, photoIds, metadata.approvalReason);

    case 'tag_students':
      return await tagStudentsToPhotos(supabase, photoIds, metadata.studentIds);

    case 'move_to_course':
      return await movePhotosToCourse(
        supabase,
        photoIds,
        metadata.targetCourseId
      );

    case 'delete':
      return await deletePhotos(supabase, photoIds);

    case 'export':
      return await exportPhotos(
        supabase,
        photoIds,
        metadata.exportFormat,
        metadata.exportQuality
      );

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

async function approvePhotos(
  supabase: any,
  photoIds: string[],
  reason?: string
) {
  try {
    const { data, error } = await supabase
      .from('photos')
      .update({
        approved: true,
        updated_at: new Date().toISOString(),
        ...(reason && { approval_reason: reason }),
      })
      .in('id', photoIds)
      .select('id');

    if (error) {
      throw error;
    }

    return {
      processed: data?.length || 0,
      failed: photoIds.length - (data?.length || 0),
    };
  } catch (error) {
    return {
      processed: 0,
      failed: photoIds.length,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

async function rejectPhotos(
  supabase: any,
  photoIds: string[],
  reason?: string
) {
  try {
    const { data, error } = await supabase
      .from('photos')
      .update({
        approved: false,
        updated_at: new Date().toISOString(),
        ...(reason && { rejection_reason: reason }),
      })
      .in('id', photoIds)
      .select('id');

    if (error) {
      throw error;
    }

    return {
      processed: data?.length || 0,
      failed: photoIds.length - (data?.length || 0),
    };
  } catch (error) {
    return {
      processed: 0,
      failed: photoIds.length,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

async function tagStudentsToPhotos(
  supabase: any,
  photoIds: string[],
  studentIds: string[]
) {
  if (!studentIds || studentIds.length === 0) {
    throw new Error('No students provided for tagging');
  }

  try {
    let totalProcessed = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    // For each photo, tag it with all selected students
    for (const photoId of photoIds) {
      try {
        // Remove existing tags for this photo
        await supabase.from('photo_students').delete().eq('photo_id', photoId);

        // Add new tags
        const taggingData = studentIds.map((studentId) => ({
          photo_id: photoId,
          student_id: studentId,
          tagged_at: new Date().toISOString(),
        }));

        const { error: taggingError } = await supabase
          .from('photo_students')
          .insert(taggingData);

        if (taggingError) {
          throw taggingError;
        }

        // Update photo as tagged
        await supabase
          .from('photos')
          .update({
            tagged: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', photoId);

        totalProcessed++;
      } catch (error) {
        totalFailed++;
        errors.push(
          `Photo ${photoId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      processed: totalProcessed,
      failed: totalFailed,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      processed: 0,
      failed: photoIds.length,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

async function movePhotosToCourse(
  supabase: any,
  photoIds: string[],
  targetCourseId: string
) {
  if (!targetCourseId) {
    throw new Error('No target course provided');
  }

  try {
    // Get all students from the target course
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('course_id', targetCourseId)
      .eq('active', true);

    if (studentsError) {
      throw studentsError;
    }

    if (!students || students.length === 0) {
      throw new Error('Target course has no active students');
    }

    let totalProcessed = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    // For each photo, remove old associations and add to target course
    for (const photoId of photoIds) {
      try {
        // Remove existing student associations
        await supabase.from('photo_students').delete().eq('photo_id', photoId);

        // Note: For bulk move, we're not auto-tagging students
        // The photographer will need to manually tag students later
        totalProcessed++;
      } catch (error) {
        totalFailed++;
        errors.push(
          `Photo ${photoId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      processed: totalProcessed,
      failed: totalFailed,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      processed: 0,
      failed: photoIds.length,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

async function deletePhotos(supabase: any, photoIds: string[]) {
  try {
    let totalProcessed = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    for (const photoId of photoIds) {
      try {
        // Get photo info for storage cleanup
        const { data: photo } = await supabase
          .from('photos')
          .select('storage_path, preview_path')
          .eq('id', photoId)
          .single();

        // Delete from storage
        if (photo?.storage_path) {
          const { error: storageError } = await supabase.storage
            .from('photos')
            .remove([photo.storage_path]);

          if (storageError) {
            console.warn(
              `Failed to delete storage file: ${photo.storage_path}`,
              storageError
            );
          }
        }

        if (photo?.preview_path) {
          const { error: previewError } = await supabase.storage
            .from('photos')
            .remove([photo.preview_path]);

          if (previewError) {
            console.warn(
              `Failed to delete preview file: ${photo.preview_path}`,
              previewError
            );
          }
        }

        // Delete database record (cascading will handle related tables)
        const { error: dbError } = await supabase
          .from('photos')
          .delete()
          .eq('id', photoId);

        if (dbError) {
          throw dbError;
        }

        totalProcessed++;
      } catch (error) {
        totalFailed++;
        errors.push(
          `Photo ${photoId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      processed: totalProcessed,
      failed: totalFailed,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      processed: 0,
      failed: photoIds.length,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

async function exportPhotos(
  supabase: any,
  photoIds: string[],
  format: 'zip' | 'folder' = 'zip',
  quality: 'original' | 'compressed' = 'compressed'
) {
  try {
    // Get photo data
    const { data: photos, error } = await supabase
      .from('photos')
      .select('id, original_filename, storage_path, preview_path')
      .in('id', photoIds);

    if (error) {
      throw error;
    }

    if (!photos || photos.length === 0) {
      throw new Error('No photos found for export');
    }

    // Generate signed URLs for download
    const downloadUrls: Array<{ filename: string; url: string }> = [];

    for (const photo of photos) {
      const path =
        quality === 'original' ? photo.storage_path : photo.preview_path;

      if (path) {
        const { data: signedUrl } = await supabase.storage
          .from('photos')
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (signedUrl?.signedUrl) {
          downloadUrls.push({
            filename: photo.original_filename,
            url: signedUrl.signedUrl,
          });
        }
      }
    }

    if (format === 'zip') {
      // For ZIP format, we would typically create a zip file server-side
      // For now, return the download URLs - client can handle zipping
      // In production, you might want to use a service like AWS Lambda or similar
      return {
        processed: downloadUrls.length,
        failed: photoIds.length - downloadUrls.length,
        downloadUrl: `/api/admin/gallery/export/zip?photos=${photoIds.join(',')}`,
      };
    } else {
      // For folder format, return structured download data
      return {
        processed: downloadUrls.length,
        failed: photoIds.length - downloadUrls.length,
        downloadUrl: `/api/admin/gallery/export/folder?photos=${photoIds.join(',')}`,
      };
    }
  } catch (error) {
    return {
      processed: 0,
      failed: photoIds.length,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

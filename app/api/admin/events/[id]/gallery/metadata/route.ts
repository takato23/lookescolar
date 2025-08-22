import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const GalleryMetadataQuerySchema = z.object({
  level_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
});

// GET /api/admin/events/[id]/gallery/metadata
export const GET = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const eventId = params.id;
    const { searchParams } = new URL(req.url);
    
    // Parse and validate query parameters
    const queryResult = GalleryMetadataQuerySchema.safeParse({
      level_id: searchParams.get('level_id') || undefined,
      course_id: searchParams.get('course_id') || undefined,
      student_id: searchParams.get('student_id') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const { level_id, course_id, student_id } = queryResult.data;

    const supabase = await createServerSupabaseServiceClient();

    // Get or create gallery metadata
    const { data, error } = await supabase.rpc('get_or_create_gallery_metadata', {
      p_event_id: eventId,
      p_level_id: level_id,
      p_course_id: course_id,
      p_student_id: student_id,
    });

    if (error) {
      console.error('Error fetching gallery metadata:', error);
      return NextResponse.json(
        { error: 'Failed to fetch gallery metadata', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      metadata: data,
    });

  } catch (error) {
    console.error('Error in GET /api/admin/events/[id]/gallery/metadata:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

const GalleryMetadataUpdateSchema = z.object({
  level_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  cover_photo_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.string(), z.any()).optional(),
  sort_order: z.number().optional(),
  active: z.boolean().optional(),
});

// POST /api/admin/events/[id]/gallery/metadata
export const POST = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const eventId = params.id;
    const body = await req.json();

    // Validate input
    const validatedData = GalleryMetadataUpdateSchema.parse(body);
    const {
      level_id,
      course_id,
      student_id,
      title,
      description,
      cover_photo_id,
      tags,
      custom_fields,
      sort_order,
      active
    } = validatedData;

    const supabase = await createServerSupabaseServiceClient();

    // Update gallery metadata
    const { data, error } = await supabase.rpc('update_gallery_metadata', {
      p_event_id: eventId,
      p_level_id: level_id,
      p_course_id: course_id,
      p_student_id: student_id,
      p_title: title,
      p_description: description,
      p_cover_photo_id: cover_photo_id,
      p_tags: tags,
      p_custom_fields: custom_fields ? JSON.stringify(custom_fields) : undefined,
      p_sort_order: sort_order,
      p_active: active,
    });

    if (error) {
      console.error('Error updating gallery metadata:', error);
      return NextResponse.json(
        { error: 'Failed to update gallery metadata', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Gallery metadata updated successfully',
      metadata: data,
    });

  } catch (error) {
    console.error('Error in POST /api/admin/events/[id]/gallery/metadata:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
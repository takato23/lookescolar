import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { SecurityLogger } from '@/lib/middleware/auth.middleware';
import { withRobustAuth } from '@/lib/middleware/auth-robust.middleware';
import {
  photoUpdateSchema,
  SecurityValidator,
  isValidUUID,
} from '@/lib/security/validation';

// PATCH - Edit photo
async function handlePATCH(
  request: NextRequest,
  context: { params: { id: string }; user: any; requestId: string }
) {
  const { params, user, requestId } = context;
  const userId = user?.id || 'unknown';

  try {
    const { id } = params;

    // Validate photo ID
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid photo ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input with schema
    const validation = photoUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Sanitize filename if provided
    if (updateData.original_filename) {
      updateData.original_filename = SecurityValidator.sanitizeFilename(
        updateData.original_filename
      );
    }

    SecurityLogger.logSecurityEvent(
      'photo_update_attempt',
      {
        requestId,
        userId,
        photoId: id,
        fields: Object.keys(updateData),
      },
      'info'
    );

    const supabase = await createServerSupabaseServiceClient();

    // First verify the photo exists and user has access
    const { data: existingPhoto, error: fetchError } = await supabase
      .from('photos')
      .select('id, event_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingPhoto) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const targetEventId = existingPhoto.event_id;
    if (!targetEventId) {
      return NextResponse.json(
        { error: 'Photo is not associated with an event' },
        { status: 400 }
      );
    }

    // Update the photo
    const { data, error } = await supabase
      .from('photos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      SecurityLogger.logSecurityEvent(
        'photo_update_error',
        {
          requestId,
          userId,
          photoId: id,
          eventId: targetEventId,
          error: error.message,
        },
        'error'
      );

      return NextResponse.json(
        { error: 'Error updating photo' },
        { status: 500 }
      );
    }

    SecurityLogger.logSecurityEvent(
      'photo_updated',
      {
        requestId,
        userId,
        photoId: id,
        eventId: targetEventId,
      },
      'info'
    );

    return NextResponse.json({ success: true, eventId: targetEventId, photo: data });
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'photo_update_exception',
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete photo
async function handleDELETE(
  request: NextRequest,
  context: { params: { id: string }; user: any; requestId: string }
) {
  const { params, user, requestId } = context;
  const userId = user?.id || 'unknown';

  try {
    const { id } = params;

    // Validate photo ID
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid photo ID format' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // First get the photo to retrieve storage paths and verify access
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('storage_path, preview_path, event_id')
      .eq('id', id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    if (!photo.event_id) {
      return NextResponse.json(
        { error: 'Photo is not associated with an event' },
        { status: 400 }
      );
    }

    SecurityLogger.logSecurityEvent(
      'photo_deletion_attempt',
      {
        requestId,
        userId,
        photoId: id,
        eventId: photo.event_id,
      },
      'info'
    );

    // Validate and collect storage paths
    const filesToDelete: string[] = [];

    if (photo.storage_path) {
      if (SecurityValidator.isValidStoragePath(photo.storage_path)) {
        filesToDelete.push(photo.storage_path);
      } else {
        SecurityLogger.logSecurityEvent(
          'invalid_storage_path_delete',
          {
            requestId,
            userId,
            photoId: id,
            path: SecurityValidator.maskSensitiveData(
              photo.storage_path,
              'url'
            ),
          },
          'warning'
        );
      }
    }

    if (photo.preview_path) {
      if (SecurityValidator.isValidStoragePath(photo.preview_path)) {
        filesToDelete.push(photo.preview_path);
      } else {
        SecurityLogger.logSecurityEvent(
          'invalid_preview_path_delete',
          {
            requestId,
            userId,
            photoId: id,
            path: SecurityValidator.maskSensitiveData(
              photo.preview_path,
              'url'
            ),
          },
          'warning'
        );
      }
    }

    // Delete files from storage
    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove(filesToDelete);

      if (storageError) {
        SecurityLogger.logSecurityEvent(
          'storage_deletion_error',
          {
            requestId,
            userId,
            photoId: id,
            error: storageError.message,
          },
          'error'
        );
        // Continue with database deletion even if storage fails
      }
    }

    // Delete record from database
    const { error: deleteError } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      SecurityLogger.logSecurityEvent(
        'photo_deletion_error',
        {
          requestId,
          userId,
          photoId: id,
          eventId: photo.event_id,
          error: deleteError.message,
        },
        'error'
      );

      return NextResponse.json(
        { error: 'Error deleting photo' },
        { status: 500 }
      );
    }

    SecurityLogger.logSecurityEvent(
      'photo_deleted',
      {
        requestId,
        userId,
        photoId: id,
        filesDeleted: filesToDelete.length,
        eventId: photo.event_id,
      },
      'info'
    );

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully',
      eventId: photo.event_id,
    });
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'photo_deletion_exception',
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export wrapped with authentication
export const PATCH = withRobustAuth(handlePATCH);
export const DELETE = withRobustAuth(handleDELETE);

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';

const paramsSchema = z.object({
  id: z.string().uuid('Invalid folder ID'),
});

// Helper function for unpublish action
async function handleUnpublishAction(
  supabase: any,
  id: string,
  folder: any,
  request: NextRequest
): Promise<NextResponse> {
  try {
    const { error: updateError } = await supabase
      .from('folders')
      .update({
        is_published: false,
        share_token: null,
        published_at: null,
        publish_settings: null
      })
      .eq('id', id);

    if (updateError) {
      console.error('[API] Migration columns not available:', updateError);
      return NextResponse.json(
        { 
          error: 'Database migration required. Please apply the folder sharing migration first.',
          details: 'Migration file: 20250826_folder_sharing_system.sql'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      folder_id: id,
      folder_name: folder.name,
      unpublished_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Error unpublishing folder:', error);
    return NextResponse.json(
      { error: 'Failed to unpublish folder' },
      { status: 500 }
    );
  }
}

const bodySchema = z.object({
  action: z.enum(['publish', 'unpublish', 'rotate']).optional().default('publish'),
  settings: z.object({
    allowDownload: z.boolean().optional().default(false),
    watermarkLevel: z.enum(['light', 'medium', 'heavy']).optional().default('medium'),
  }).optional().default({}),
});

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Validate params
    const { id } = paramsSchema.parse(await params);
    
    // Validate request body
    const body = await request.json().catch(() => ({}));
    const { action, settings } = bodySchema.parse(body);

    // Get Supabase client
    const supabase = await createServerSupabaseServiceClient();

    // Optimized: Get folder info AND check publish status in a single query
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, event_id, is_published, share_token, published_at')
      .eq('id', id)
      .single();

    if (folderError || !folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Handle different actions
    if (action === 'unpublish') {
      return handleUnpublishAction(supabase, id, folder, request);
    }

    // Optimized: Get photo count and verify folder has photos in a single query
    const { count: photoCount, error: countError } = await supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('folder_id', id)
      .eq('status', 'ready');

    if (countError) {
      console.error('[API] Error counting photos:', countError);
      return NextResponse.json(
        { error: 'Error checking folder photos' },
        { status: 500 }
      );
    }

    if (!photoCount || photoCount === 0) {
      return NextResponse.json(
        { error: 'Cannot publish empty folder' },
        { status: 400 }
      );
    }

    // Check if folder is already published (we already have this info from the initial query)
    if (folder.is_published && folder.share_token) {
      if (action === 'rotate') {
        // Generate new token for rotation
        const newShareToken = nanoid(32);
        const { error: rotateError } = await supabase
          .from('folders')
          .update({
            share_token: newShareToken,
            published_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (rotateError) {
          return NextResponse.json(
            { error: 'Failed to rotate token' },
            { status: 500 }
          );
        }

        const origin = request.headers.get('origin') || 'http://localhost:3000';
        return NextResponse.json({
          success: true,
          newToken: newShareToken,
          share_token: newShareToken,
          family_url: `${origin}/f/${newShareToken}`,
          qr_url: `${origin}/api/qr?token=${newShareToken}`,
          photo_count: photoCount,
        });
      }

      // Already published, return existing info
      const origin = request.headers.get('origin') || 'http://localhost:3000';
      return NextResponse.json({
        success: true,
        already_published: true,
        folder_id: folder.id,
        folder_name: folder.name,
        share_token: folder.share_token,
        family_url: `${origin}/f/${folder.share_token}`,
        qr_url: `${origin}/api/qr?token=${folder.share_token}`,
        photo_count: photoCount,
      });
    }

    // Generate a unique share token
    const shareToken = nanoid(32);
    const publishedAt = new Date().toISOString();

    try {
      // Try to update with migration columns if they exist
      const { error: updateError } = await supabase
        .from('folders')
        .update({
          is_published: true,
          share_token: shareToken,
          published_at: publishedAt,
          publish_settings: {
            ...settings,
            published_by: 'admin',
            publish_method: 'folder_share'
          }
        })
        .eq('id', id);

      if (updateError) {
        console.error('[API] Migration columns not available:', updateError);
        return NextResponse.json(
          { 
            error: 'Database migration required. Please apply the folder sharing migration first.',
            details: 'Migration file: 20250826_folder_sharing_system.sql'
          },
          { status: 500 }
        );
      }

      // Build response URLs
      const origin = request.headers.get('origin') || 'http://localhost:3000';
      const responseData = {
        success: true,
        folder_id: id,
        folder_name: folder.name,
        share_token: shareToken,
        family_url: `${origin}/f/${shareToken}`,
        qr_url: `${origin}/api/qr?token=${shareToken}`,
        photo_count: photoCount,
        published_at: publishedAt,
        settings,
      };

      return NextResponse.json(responseData);
    } catch (error) {
      console.error('[API] Error publishing folder:', error);
      return NextResponse.json(
        { error: 'Failed to publish folder' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Folder publish error:', error);
    
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
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Validate params
    const { id } = paramsSchema.parse(await params);

    // Get Supabase client
    const supabase = await createServerSupabaseServiceClient();

    // Check if folder exists (optimized to get all needed info in one query)
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, is_published, share_token')
      .eq('id', id)
      .single();

    if (folderError || !folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    try {
      // Try to unpublish using migration columns
      const { error: updateError } = await supabase
        .from('folders')
        .update({
          is_published: false,
          share_token: null,
          published_at: null,
          publish_settings: null
        })
        .eq('id', id);

      if (updateError) {
        console.error('[API] Migration columns not available:', updateError);
        return NextResponse.json(
          { 
            error: 'Database migration required. Please apply the folder sharing migration first.',
            details: 'Migration file: 20250826_folder_sharing_system.sql'
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        folder_id: id,
        folder_name: folder.name,
        unpublished_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[API] Error unpublishing folder:', error);
      return NextResponse.json(
        { error: 'Failed to unpublish folder' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Folder unpublish error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid folder ID' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export handlers with admin authentication middleware
export const POST = withAdminAuth(handlePOST);
export const DELETE = withAdminAuth(handleDELETE);
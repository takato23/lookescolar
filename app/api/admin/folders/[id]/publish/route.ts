import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
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
        publish_settings: null,
      })
      .eq('id', id);

    if (updateError) {
      console.error('[API] Migration columns not available:', updateError);
      return NextResponse.json(
        {
          error:
            'Database migration required. Please apply the folder sharing migration first.',
          details: 'Migration file: 20250826_folder_sharing_system.sql',
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
  action: z
    .enum(['publish', 'unpublish', 'rotate'])
    .optional()
    .default('publish'),
  settings: z
    .object({
      allowDownload: z.boolean().optional().default(false),
      watermarkLevel: z
        .enum(['light', 'medium', 'heavy'])
        .optional()
        .default('medium'),
    })
    .optional()
    .default({}),
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
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Handle different actions
    if (action === 'unpublish') {
      // Expire/unactivate associated share_tokens (unified sharing)
      try {
        await supabase
          .from('share_tokens')
          .update({
            expires_at: new Date().toISOString(),
            is_active: false,
            metadata: {
              revoked: true,
              revoked_reason: 'unpublished_folder',
              revoked_at: new Date().toISOString(),
            },
          })
          .eq('folder_id', id)
          .eq('is_active', true);
      } catch {}
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
        // Generate new token(s) for rotation
        const newShareToken32 = nanoid(32);
        const newShareToken64 = crypto.randomBytes(32).toString('hex');

        const { error: rotateError } = await supabase
          .from('folders')
          .update({
            share_token: newShareToken32,
            published_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (rotateError) {
          return NextResponse.json(
            { error: 'Failed to rotate token' },
            { status: 500 }
          );
        }

        // Upsert share_tokens (unified sharing)
        try {
          const { data: existing } = await supabase
            .from('share_tokens')
            .select('id')
            .eq('folder_id', id)
            .eq('is_active', true)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('share_tokens')
              .update({ token: newShareToken64, updated_at: new Date().toISOString() })
              .eq('id', (existing as any).id);
          } else {
            await supabase.from('share_tokens').insert({
              event_id: folder.event_id,
              folder_id: id,
              token: newShareToken64,
              share_type: 'folder',
              is_active: true,
              allow_download: false,
              allow_comments: false,
              metadata: { source: 'admin_rotate', folder_share_token: newShareToken32 },
            });
          }
        } catch {}

        const origin = request.headers.get('origin') || 'http://localhost:3000';
        return NextResponse.json({
          success: true,
          newToken: newShareToken32,
          share_token: newShareToken32,
          unified_share_token: newShareToken64,
          family_url: `${origin}/s/${newShareToken32}`,
          store_url: `${origin}/store-unified/${newShareToken64}`,
          qr_url: `${origin}/api/qr?token=${newShareToken32}`,
          photo_count: photoCount,
        });
      }

      // Already published, ensure unified share token exists
      let unifiedToken = '';
      try {
        const { data: existing } = await supabase
          .from('share_tokens')
          .select('token')
          .eq('folder_id', id)
          .eq('is_active', true)
          .maybeSingle();
        if (existing?.token) unifiedToken = (existing as any).token;
      } catch {}

      const origin = request.headers.get('origin') || 'http://localhost:3000';
      return NextResponse.json({
        success: true,
        already_published: true,
        folder_id: folder.id,
        folder_name: folder.name,
        share_token: folder.share_token,
        unified_share_token: unifiedToken || null,
        family_url: `${origin}/s/${folder.share_token}`,
        store_url: unifiedToken ? `${origin}/store-unified/${unifiedToken}` : null,
        qr_url: `${origin}/api/qr?token=${folder.share_token}`,
        photo_count: photoCount,
      });
    }

    // Generate unique share tokens (32 for folders table, 64 unified)
    const shareToken32 = nanoid(32);
    const shareToken64 = crypto.randomBytes(32).toString('hex');
    const publishedAt = new Date().toISOString();

    try {
      // Update folder (legacy fields)
      const { error: updateError } = await supabase
        .from('folders')
        .update({
          is_published: true,
          share_token: shareToken32,
          published_at: publishedAt,
          publish_settings: {
            ...settings,
            published_by: 'admin',
            publish_method: 'folder_share',
          },
        })
        .eq('id', id);

      if (updateError) {
        console.error('[API] Migration columns not available:', updateError);
        return NextResponse.json(
          {
            error:
              'Database migration required. Please apply the folder sharing migration first.',
            details: 'Migration file: 20250826_folder_sharing_system.sql',
          },
          { status: 500 }
        );
      }

      // Ensure unified share_tokens row exists
      try {
        const { data: existing } = await supabase
          .from('share_tokens')
          .select('id')
          .eq('folder_id', id)
          .eq('is_active', true)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('share_tokens')
            .update({ token: shareToken64, updated_at: new Date().toISOString(), is_active: true })
            .eq('id', (existing as any).id);
        } else {
          await supabase.from('share_tokens').insert({
            event_id: folder.event_id,
            folder_id: id,
            token: shareToken64,
            share_type: 'folder',
            is_active: true,
            allow_download: false,
            allow_comments: false,
            metadata: { source: 'admin_publish', folder_share_token: shareToken32 },
          });
        }
      } catch (e) {
        console.warn('[API] Could not upsert share_tokens for folder', e);
      }

      // Build response URLs
      const origin = request.headers.get('origin') || 'http://localhost:3000';
      const responseData = {
        success: true,
        folder_id: id,
        folder_name: folder.name,
        share_token: shareToken32,
        unified_share_token: shareToken64,
        family_url: `${origin}/s/${shareToken32}`,
        store_url: `${origin}/store-unified/${shareToken64}`,
        qr_url: `${origin}/api/qr?token=${shareToken32}`,
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
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    try {
      // Try to unpublish using migration columns
      const { error: updateError } = await supabase
        .from('folders')
        .update({
          is_published: false,
          share_token: null,
          published_at: null,
          publish_settings: null,
        })
        .eq('id', id);

      if (updateError) {
        console.error('[API] Migration columns not available:', updateError);
        return NextResponse.json(
          {
            error:
              'Database migration required. Please apply the folder sharing migration first.',
            details: 'Migration file: 20250826_folder_sharing_system.sql',
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
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 });
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

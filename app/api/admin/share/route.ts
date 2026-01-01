import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Shape expected by PhotoAdmin.tsx (adapter sobre el sistema actual)
const CreateShareAdapterSchema = z.object({
  eventId: z.string().uuid().optional(),
  shareType: z.enum(['folder', 'photos', 'event']).default('folder'),
  folderId: z.string().uuid().optional(),
  photoIds: z.array(z.string().uuid()).optional(),
  title: z.string().optional(),
  password: z.string().optional(),
  allowDownload: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const input = CreateShareAdapterSchema.parse(body);

    // Requiere eventId (PhotoAdmin lo deriva antes de llamar)
    if (!input.eventId) {
      return NextResponse.json(
        { error: 'eventId requerido' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Handle folder-specific validation
    if (input.shareType === 'folder') {
      if (!input.folderId) {
        return NextResponse.json(
          { error: 'folderId requerido para shareType folder' },
          { status: 400 }
        );
      }
      
      // Validate folder exists and belongs to event
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('id, event_id')
        .eq('id', input.folderId)
        .single();
        
      if (folderError || !folder || folder.event_id !== input.eventId) {
        return NextResponse.json(
          { error: 'Carpeta no encontrada o no pertenece al evento' },
          { status: 400 }
        );
      }
    }

    // Use the current folder-based sharing system
    let data, error;
    
    if (input.shareType === 'folder' && input.folderId) {
      // Generate a unique share token for the folder
      const shareToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Update the folder directly with share token
      console.log('🔍 [SHARE API] Updating folder with share token:', { 
        folderId: input.folderId, 
        shareToken: shareToken.slice(0, 8) + '...',
        title: input.title 
      });
      
      const { data: folderResult, error: folderError } = await supabase
        .from('folders')
        .update({
          share_token: shareToken,
          is_published: true,
          published_at: new Date().toISOString(),
          publish_settings: {
            published_by: req.headers.get('x-user-id'),
            publish_method: 'folder_share',
            title: input.title ?? 'Galería de Carpeta'
          }
        })
        .eq('id', input.folderId)
        .select()
        .single();
      
      console.log('📡 [SHARE API] Folder update result:', { 
        success: !folderError && folderResult, 
        error: folderError,
        folderId: folderResult?.id,
        shareToken: folderResult?.share_token?.slice(0, 8) + '...'
      });
      
      if (folderError || !folderResult) {
        console.error('[share] folder update error', folderError);
        return NextResponse.json(
          { error: 'No se pudo crear el enlace de carpeta' },
          { status: 500 }
        );
      }
      
      // Transform the result to match expected format
      data = {
        id: folderResult.id,
        token: folderResult.share_token,
        custom_message: input.title ?? 'Galería de Carpeta',
        created_at: folderResult.published_at,
        expires_at: input.expiresAt || null
      };
    } else {
      // For non-folder shares, fall back to creating a share token manually
      // Generate a unique token for the share
      const shareToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Insert into share_tokens table if it exists, otherwise use folders approach
      const { data: shareResult, error: shareError } = await supabase
        .from('share_tokens')
        .insert({
          token: shareToken,
          event_id: input.eventId,
          is_active: true,
          expires_at: input.expiresAt,
          metadata: {
            title: input.title ?? 'Galería del Evento',
            share_type: input.shareType,
            allow_download: input.allowDownload ?? true,
            created_by: req.headers.get('x-user-id')
          }
        })
        .select()
        .single();
      
      if (shareError) {
        console.error('[share] share_tokens insert error', shareError);
        return NextResponse.json(
          { error: 'No se pudo crear el enlace' },
          { status: 500 }
        );
      }
      
      data = {
        id: shareResult.id,
        token: shareResult.token,
        custom_message: input.title ?? 'Galería del Evento',
        created_at: shareResult.created_at,
        expires_at: shareResult.expires_at
      };
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No se pudo crear el enlace' },
        { status: 500 }
      );
    }

    // Build complete URL with proper fallbacks
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      if (process.env.VERCEL_URL) {
        siteUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        // Use the same port as the request
        const host = req.headers.get('host') || 'localhost:3000';
        siteUrl = `http://${host}`;
      }
    }
    const shareUrl = `${siteUrl}/store-unified/${data.token}`;

    // Adapter shape esperado por PhotoAdmin y EventPhotoManager
    return NextResponse.json({
      success: true,
      share: {
        shareUrl: shareUrl,
        storeUrl: shareUrl, 
        id: data.id,
        token: data.token,
        title: input.title ?? data.custom_message ?? 'Escaparate',
        created_at: data.created_at,
      },
      shareToken: {
        id: data.id,
        token: data.token,
        title: input.title ?? data.custom_message ?? 'Escaparate',
        created_at: data.created_at,
      },
      links: {
        store: shareUrl,
        gallery: shareUrl,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: err.flatten() },
        { status: 400 }
      );
    }
    console.error('[share] POST unexpected', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
});

// GET /api/admin/share?eventId=...
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    if (!eventId) {
      return NextResponse.json({ shares: [] });
    }
    const supabase = await createServerSupabaseServiceClient();
    // Try to get shares from both folders and share_tokens tables
    const [foldersResult, tokensResult] = await Promise.allSettled([
      supabase
        .from('folders')
        .select('id, name, share_token, is_published, published_at, event_id')
        .eq('event_id', eventId)
        .not('share_token', 'is', null)
        .order('published_at', { ascending: false })
        .limit(50),
      supabase
        .from('share_tokens')
        .select('id, token, created_at, expires_at, metadata, event_id, is_active')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    const shares: any[] = [];
    // Build complete URL with proper fallbacks
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      if (process.env.VERCEL_URL) {
        siteUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        // Use the same port as the request
        const host = req.headers.get('host') || 'localhost:3000';
        siteUrl = `http://${host}`;
      }
    }

    // Add folder shares
    if (foldersResult.status === 'fulfilled' && foldersResult.value.data) {
      const folderShares = foldersResult.value.data.map((row: any) => ({
        id: row.id,
        title: row.name || 'Carpeta',
        share_type: 'folder',
        created_at: row.published_at,
        expires_at: null, // Folders don't have expiration in the current schema
        password_hash: null,
        links: { store: `${siteUrl}/store-unified/${row.share_token}` },
        token: row.share_token,
      }));
      shares.push(...folderShares);
    }

    // Add token shares
    if (tokensResult.status === 'fulfilled' && tokensResult.value.data) {
      const tokenShares = tokensResult.value.data.map((row: any) => ({
        id: row.id,
        title: row.metadata?.title || 'Enlace',
        share_type: row.metadata?.share_type || 'event',
        created_at: row.created_at,
        expires_at: row.expires_at,
        password_hash: null,
        links: { store: `${siteUrl}/store-unified/${row.token}` },
        token: row.token,
      }));
      shares.push(...tokenShares);
    }

    // Sort by creation date
    shares.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ shares });
  } catch (err) {
    console.error('[share] GET unexpected', err);
    return NextResponse.json({ shares: [] });
  }
});

// DELETE /api/admin/share?id=...
export const DELETE = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({}, { status: 204 });

    const supabase = await createServerSupabaseServiceClient();
    
    // Try to deactivate in both tables
    const [folderResult, tokenResult] = await Promise.allSettled([
      // Try to unpublish folder by direct update
      supabase
        .from('folders')
        .update({
          share_token: null,
          is_published: false,
          published_at: null,
          publish_settings: {
            unpublished_at: new Date().toISOString(),
            unpublished_by: req.headers.get('x-user-id')
          }
        })
        .eq('id', id),
      // Try to deactivate share token
      supabase
        .from('share_tokens')
        .update({ is_active: false })
        .eq('id', id)
    ]);
    
    // Success if either operation succeeded
    const folderSuccess = folderResult.status === 'fulfilled' && !folderResult.value.error;
    const tokenSuccess = tokenResult.status === 'fulfilled' && !tokenResult.value.error;
    
    if (!folderSuccess && !tokenSuccess) {
      console.error('[share] DELETE error - both attempts failed', {
        folder: folderResult,
        token: tokenResult
      });
      return NextResponse.json({ error: 'No se pudo desactivar' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[share] DELETE unexpected', err);
    return NextResponse.json({ success: true });
  }
});

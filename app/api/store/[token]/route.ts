/**
 * API Pública para Acceso a Tiendas
 * GET /api/store/[token] - Obtener datos de tienda pública
 * POST /api/store/[token]/order - Crear orden de compra (futuro)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateShareTokenPassword } from '@/lib/middleware/password-validation.middleware';

const QuerySchema = z.object({
  include_assets: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true'),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  password: z.string().optional(),
  folder_id: z.string().optional(),
});

// GET - Obtener datos de la tienda
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const { include_assets, limit, offset, password, folder_id } = QuerySchema.parse(queryParams);

    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    // Check for password in header as alternative to query param
    const passwordFromHeader = request.headers.get('X-Store-Password');
    const passwordToValidate = password || passwordFromHeader;

    // Validar formato del token
    if (!token || token.length < 8 || !/^[a-z0-9]+$/.test(token)) {
      return NextResponse.json(
        { error: 'Invalid store token format' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Primero intentar buscar en share_tokens (tokens de 64 caracteres)
    let shareTokenData = null;
    let storeData = null;
    let selectedPhotoIds: string[] = [];
    
    if (token.length === 64) {
      // Es probable que sea un share_token
      const { data: shareToken } = await supabase
        .from('share_tokens')
        .select('*, events(name, date)')
        .eq('token', token)
        .eq('is_active', true)
        .single();
      
      if (shareToken) {
        shareTokenData = shareToken;

        // Validate password if required
        const passwordValidation = await validateShareTokenPassword(
          token,
          passwordToValidate,
          clientIp
        );

        if (!passwordValidation.isValid) {
          return NextResponse.json(
            {
              error: passwordValidation.error || 'Authentication required',
              requiresPassword: passwordValidation.requiresPassword
            },
            { status: passwordValidation.statusCode || 401 }
          );
        }

        // Handle folder navigation for share_token
        const targetFolderId = folder_id !== undefined ? folder_id : shareToken.folder_id;

        // If navigating to a different folder, fetch its data
        if (folder_id !== undefined && folder_id !== shareToken.folder_id) {
          // Verify this folder is accessible from the share token
          const { data: navigationData } = await supabase
            .rpc('get_folder_navigation_data', {
              p_token: token,
              p_folder_id: folder_id || null
            })
            .single();

          if (navigationData) {
            storeData = navigationData;
          }
        } else {
          // Si tiene photo_ids específicos, guardarlos
          if (shareToken.photo_ids && shareToken.photo_ids.length > 0) {
            selectedPhotoIds = shareToken.photo_ids;
          }
        }

        // Incrementar contador de vistas (only after successful authentication)
        await supabase
          .from('share_tokens')
          .update({ view_count: shareToken.view_count + 1 })
          .eq('id', shareToken.id);

        // Only build storeData if not already set by navigation
        if (!storeData) {
          // Construir storeData compatible con jerarquía
          storeData = {
            folder_id: shareToken.folder_id,
            folder_name: shareToken.title || 'Fotos Compartidas',
            folder_path: shareToken.folder_path || shareToken.title || 'Fotos Compartidas',
            parent_id: shareToken.parent_id || null,
            parent_name: shareToken.parent_name || null,
            depth: shareToken.depth || 0,
            event_id: shareToken.event_id,
            event_name: shareToken.events?.name || 'Evento',
            event_date: shareToken.events?.date,
            store_settings: shareToken.metadata || {},
            view_count: shareToken.view_count + 1,
            asset_count: selectedPhotoIds.length || 0,
            share_type: shareToken.share_type,
            selected_photo_ids: selectedPhotoIds,
            child_folders: shareToken.child_folders || []
          };
        }
      }
    }
    
    // Si no se encontró en share_tokens, buscar en folders (tokens de 16 caracteres)
    if (!storeData) {
      // Check if we need to use the new navigation RPC
      const rpcName = folder_id !== undefined ? 'get_folder_navigation_data' : 'get_store_data';
      const rpcParams = folder_id !== undefined
        ? { p_token: token, p_folder_id: folder_id || null }
        : { p_token: token };

      const { data: folderData, error: storeError } = await supabase
        .rpc(rpcName, rpcParams)
        .single();

      if (storeError || !folderData) {
        return NextResponse.json(
          { error: 'Store not found or not published' },
          { status: 404 }
        );
      }

      storeData = folderData;

      // Check for selected photo IDs in publish_settings
      if (folderData.publish_settings?.selected_photo_ids) {
        storeData.selected_photo_ids = folderData.publish_settings.selected_photo_ids;
      }
    }

    let assets = [];
    let pagination = null;

    // Incluir assets si se solicita
    if (include_assets) {
      // Intentar primero con assets, luego con photos como fallback
      let assetsData: any = null;
      let assetsError: any = null;
      let count = 0;

      try {
        // Si hay photo_ids específicos seleccionados, buscar solo esos
        if (storeData.selected_photo_ids && storeData.selected_photo_ids.length > 0) {
          // Primero intentar con assets usando los IDs específicos
          const assetsResult = await supabase
            .from('assets')
            .select('*', { count: 'exact' })
            .in('id', storeData.selected_photo_ids)
            .eq('status', 'ready')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (assetsResult.data && assetsResult.data.length > 0) {
            assetsData = assetsResult.data;
            count = assetsResult.count || assetsResult.data.length;
          } else {
            // Fallback a photos si assets está vacío
            const photosResult = await supabase
              .from('photos')
              .select('*', { count: 'exact' })
              .in('id', storeData.selected_photo_ids)
              .order('created_at', { ascending: false })
              .range(offset, offset + limit - 1);

            if (photosResult.data) {
              assetsData = photosResult.data;
              count = photosResult.count || photosResult.data.length;
            }
          }
        } else if (storeData.folder_id) {
          // Si no hay photo_ids específicos, buscar por folder_id
          console.log('🔍 Filtering by folder_id:', storeData.folder_id);

          const assetsResult = await supabase
            .from('assets')
            .select('*', { count: 'exact' })
            .eq('folder_id', storeData.folder_id)
            .eq('status', 'ready')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (assetsResult.data && assetsResult.data.length > 0) {
            assetsData = assetsResult.data;
            count = assetsResult.count || assetsResult.data.length;
          } else {
            // Fallback a photos si assets está vacío
            console.log('📸 Fallback to photos table, filtering by folder_id:', storeData.folder_id);

            const photosResult = await supabase
              .from('photos')
              .select('*', { count: 'exact' })
              .eq('folder_id', storeData.folder_id)
              .order('created_at', { ascending: false })
              .range(offset, offset + limit - 1);

            if (photosResult.data) {
              console.log(`📸 Found ${photosResult.data.length} photos in folder ${storeData.folder_id}`);
              assetsData = photosResult.data;
              count = photosResult.count || photosResult.data.length;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching assets/photos:', error);
        assetsError = error;
      }

      if (assetsError) {
        console.error('Error fetching store assets:', assetsError);
        // No fallar completamente, solo no incluir assets
      } else {
        // Mapear datos de assets o photos a formato unificado
        if (assetsData && assetsData.length > 0) {
          console.log(
            '🔍 Debug assetsData[0]:',
            JSON.stringify(assetsData[0], null, 2)
          );

          const buildPublicUrl = (path?: string | null) => {
            if (!path) return null;
            if (path.startsWith('http')) return path;
            // Extract just the filename or relative path
            const normalized = path.replace(/^\/+/, '');
            // Use our public preview endpoint
            return `/api/public/preview/${normalized}`;
          };

          assets = assetsData.map((item: any) => {
            // Try different URL patterns for watermarked previews
            let previewUrl =
              buildPublicUrl(item.preview_path) ||
              buildPublicUrl(item.preview_url) ||
              buildPublicUrl(item.watermark_path) ||
              buildPublicUrl(item.watermark_url) ||
              buildPublicUrl(item.storage_path);
            
            // If still no URL and we have storage_path, use it through our preview endpoint
            if (!previewUrl && item.storage_path) {
              const path = item.storage_path.replace(/^\/+/, '');
              previewUrl = `/api/public/preview/${path}`;
            }
            
            const wmUrl =
              buildPublicUrl(item.watermark_path) || 
              buildPublicUrl(item.watermark_url) ||
              previewUrl;

            return {
              id: item.id,
              filename:
                item.filename ||
                item.original_filename ||
                item.storage_path?.split('/').pop() ||
                'foto',
              preview_url: previewUrl,
              watermark_url: wmUrl,
              file_size: item.file_size || item.file_size_bytes || 0,
              created_at: item.created_at || item.uploaded_at || item.created_at,
              storage_path: item.storage_path || null,
              status: item.status || 'ready',
            };
          });
        } else {
          assets = [];
        }

        pagination = {
          limit,
          offset,
          total: count || 0,
          hasMore: count ? count > offset + limit : false,
        };
      }
    }

    // Formatear respuesta con información de jerarquía
    const storeResponse = {
      store: {
        token,
        name: storeData.folder_name,
        folder_path: storeData.folder_path || storeData.folder_name,
        parent_id: storeData.parent_id || null,
        parent_name: storeData.parent_name || null,
        depth: storeData.depth || 0,
        child_folders: storeData.child_folders || [],
        view_count: storeData.view_count,
        settings: storeData.store_settings || {},
        asset_count: storeData.asset_count,
        share_type: storeData.share_type || 'folder',
        is_preselected: !!(storeData.selected_photo_ids && storeData.selected_photo_ids.length > 0),
        selected_count: storeData.selected_photo_ids?.length || 0,
      },
      event: {
        id: storeData.event_id,
        name: storeData.event_name,
        date: storeData.event_date,
      },
      assets: include_assets ? assets : undefined,
      pagination: include_assets ? pagination : undefined,
    };

    // Headers para cache público
    const headers = {
      'Cache-Control': 'public, max-age=300, s-maxage=600', // 5 min browser, 10 min CDN
      Vary: 'Accept-Encoding',
    };

    return NextResponse.json(storeResponse, { headers });
  } catch (error) {
    console.error('Store access error:', error);

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
}

// POST - Crear orden de compra (placeholder para futuro)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // TODO: Implementar sistema de órdenes
    // - Validar token de tienda
    // - Validar assets seleccionados
    // - Crear orden en MercadoPago
    // - Guardar orden en base de datos

    return NextResponse.json(
      { error: 'Order system not implemented yet' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Store order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

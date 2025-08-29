/**
 * API Pública para Acceso a Tiendas
 * GET /api/store/[token] - Obtener datos de tienda pública
 * POST /api/store/[token]/order - Crear orden de compra (futuro)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const QuerySchema = z.object({
  include_assets: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true'),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
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
    const { include_assets, limit, offset } = QuerySchema.parse(queryParams);

    // Validar formato del token
    if (!token || token.length < 8 || !/^[a-z0-9]+$/.test(token)) {
      return NextResponse.json(
        { error: 'Invalid store token format' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Obtener datos de la tienda (incrementa view_count automáticamente)
    const { data: storeData, error: storeError } = await supabase
      .rpc('get_store_data', { p_token: token })
      .single();

    if (storeError || !storeData) {
      return NextResponse.json(
        { error: 'Store not found or not published' },
        { status: 404 }
      );
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
        // Primero intentar con assets
        const assetsResult = await supabase
          .from('assets')
          .select('*')
          .eq('folder_id', storeData.folder_id)
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
            .select('*')
            .eq('folder_id', storeData.folder_id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (photosResult.data) {
            assetsData = photosResult.data;
            count = photosResult.count || photosResult.data.length;
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

          assets = assetsData.map((item: any) => {
            // Construir URLs completas para previews
            let previewUrl = null;
            console.log(
              '🔍 Processing item:',
              item.filename,
              'preview_path:',
              item.preview_path,
              'preview_url:',
              item.preview_url
            );

            // Usar preview_path si existe, sino preview_url
            const previewPath = item.preview_path || item.preview_url;

            if (previewPath) {
              // Si es una URL relativa, convertir a URL completa
              if (previewPath.startsWith('previews/')) {
                previewUrl = `/admin/previews/${previewPath.split('/').pop()}`;
                console.log('🔍 Converted preview URL:', previewUrl);
              } else {
                previewUrl = previewPath;
                console.log('🔍 Using original preview URL:', previewUrl);
              }
            } else {
              console.log('🔍 No preview path found for:', item.filename);
            }

            return {
              id: item.id,
              filename:
                item.filename ||
                item.original_filename ||
                item.storage_path?.split('/').pop() ||
                'foto',
              preview_url: previewUrl,
              watermark_url: item.watermark_url || item.watermark_path || null,
              file_size: item.file_size || item.file_size_bytes || 0,
              created_at:
                item.created_at || item.uploaded_at || item.created_at,
              // Agregar campos adicionales según la tabla
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
          hasMore: (count || 0) > offset + limit,
        };
      }
    }

    // Formatear respuesta
    const storeResponse = {
      store: {
        token,
        name: storeData.folder_name,
        view_count: storeData.view_count,
        settings: storeData.store_settings || {},
        asset_count: storeData.asset_count,
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

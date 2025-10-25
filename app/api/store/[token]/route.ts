/**
 * API Pública para Acceso a Tiendas
 * GET /api/store/[token] - Obtener datos de tienda pública
 * POST /api/store/[token]/order - Crear orden de compra (futuro)
 */

import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateShareTokenPassword } from '@/lib/middleware/password-validation.middleware';
import { photoClassificationService } from '@/lib/services/photo-classification.service';
import {
  galleryService,
  GalleryServiceError,
  type GalleryResult,
} from '@/lib/services/gallery.service';

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
  context: RouteContext<{ token: string }>
) {
  const params = await context.params;
  try {
    const { token } = params;
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

    // Validar formato del token (permitir guiones para tokens de prueba)
    if (!token || token.length < 8 || !/^[a-z0-9-]+$/.test(token)) {
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
      // Usar get_store_data para tokens de folder
      const { data: folderData, error: storeError } = await supabase
        .rpc('get_store_data', { p_token: token })
        .single();

      if (storeError || !folderData) {
        return NextResponse.json(
          { error: 'Store not found or not published' },
          { status: 404 }
        );
      }

      storeData = folderData;
    }

    let assets = [];
    let pagination: any = null;
    let galleryPayload: GalleryResult | null = null;

    if (include_assets) {
      try {
        const pageFromOffset = Math.floor(offset / limit) + 1;
        galleryPayload = await galleryService.getGallery({
          token,
          page: pageFromOffset,
          limit,
          ipAddress: clientIp,
          userAgent: request.headers.get('user-agent') ?? undefined,
          includeCatalog: true,
          skipRateLimit: true,
        });

        assets = galleryPayload.items.map((item) => ({
          id: item.id,
          filename: item.filename,
          preview_url: item.previewUrl ?? item.signedUrl ?? null,
          watermark_url: item.signedUrl ?? null,
          file_size: item.size ?? 0,
          created_at: item.createdAt ?? new Date().toISOString(),
          storage_path: item.storagePath ?? null,
          status: 'ready',
          is_group_photo: item.type === 'group',
        }));

        pagination = {
          limit,
          offset,
          total: galleryPayload.pagination.total,
          hasMore: galleryPayload.pagination.hasMore,
          page: galleryPayload.pagination.page,
          total_pages: galleryPayload.pagination.totalPages,
        };
      } catch (error) {
        if (error instanceof GalleryServiceError) {
          console.warn('Unified gallery fallback (store route)', {
            token,
            code: error.code,
            message: error.message,
          });
        } else {
          console.error('Unified gallery unexpected error', error);
        }
        galleryPayload = null;
      }
    }

    // Incluir assets legacy si no está disponible la galería unificada
    if (include_assets && !galleryPayload) {
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
            .select('*, photos!left(metadata, file_size, created_at)', { count: 'exact' })
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
          const assetsResult = await supabase
            .from('assets')
            .select('*, photos!left(metadata, file_size, created_at)', { count: 'exact' })
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
              .select('*', { count: 'exact' })
              .eq('folder_id', storeData.folder_id)
              .order('created_at', { ascending: false })
              .range(offset, offset + limit - 1);

            if (photosResult.data) {
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

            // Handle different path formats
            const normalized = path.replace(/^\/+/, '');

            // If path already includes 'previews/' or 'watermarks/', use it directly
            if (normalized.includes('previews/') || normalized.includes('watermarks/')) {
              return `/api/public/preview/${normalized}`;
            }

            // For storage paths, assume they're in previews directory
            return `/api/public/preview/previews/${normalized}`;
          };

          // Get photo assignments in batch for better performance
          const photoIds = assetsData.map(item => item.id);

          // Get all photo assignments at once
          const { data: photoAssignments } = await supabase
            .from('photo_students')
            .select('photo_id, student_id')
            .in('photo_id', photoIds);

          const { data: courseAssignments } = await supabase
            .from('photo_courses')
            .select('photo_id, course_id')
            .in('photo_id', photoIds);

          const { data: legacyAssignments } = await supabase
            .from('photo_assignments')
            .select('photo_id, subject_id')
            .in('photo_id', photoIds);

          // Create lookup maps for efficient checking
          const studentPhotoMap = new Set(photoAssignments?.map(pa => pa.photo_id) || []);
          const coursePhotoMap = new Set(courseAssignments?.map(ca => ca.photo_id) || []);
          const legacyPhotoMap = new Set(legacyAssignments?.map(la => la.photo_id) || []);

          // Get unassigned photos for AI classification
          const unassignedPhotos = assetsData.filter(item =>
            !coursePhotoMap.has(item.id) &&
            !studentPhotoMap.has(item.id) &&
            !legacyPhotoMap.has(item.id)
          );

          // Classify unassigned photos
          const classificationPromises = unassignedPhotos.map(async (item) => {
            try {
              const classification = await photoClassificationService.classifyPhoto(item.id);
              return {
                id: item.id,
                isGroupPhoto: classification.isGroupPhoto && classification.confidence > 0.7,
                confidence: classification.confidence,
                reason: classification.reason
              };
            } catch (error) {
              console.error(`Error classifying photo ${item.id}:`, error);
              return {
                id: item.id,
                isGroupPhoto: false,
                confidence: 0,
                reason: 'Classification failed'
              };
            }
          });

          const classifications = await Promise.all(classificationPromises);

          // Create classification map
          const classificationMap = new Map(classifications.map(c => [c.id, c]));

          // Log classifications
          classifications.forEach(
            ({ id, isGroupPhoto, confidence, reason }) => {
              console.log(`AI Classification for ${id}: ${isGroupPhoto ? 'GROUP' : 'INDIVIDUAL'} (${confidence.toFixed(2)} confidence) - ${reason}`);
            }
          );

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
              const storagePath = item.storage_path.replace(/^\/+/, '');

              // If storage path already includes previews/ or watermarks/, use it directly
              if (storagePath.includes('previews/') || storagePath.includes('watermarks/')) {
                previewUrl = `/api/public/preview/${storagePath}`;
              } else {
                // Otherwise, assume it's in previews directory
                previewUrl = `/api/public/preview/previews/${storagePath}`;
              }
            }

            const wmUrl =
              buildPublicUrl(item.watermark_path) ||
              buildPublicUrl(item.watermark_url) ||
              previewUrl;

            // Determine if this is a group photo using the pre-fetched data
            let isGroupPhoto = false;

            if (coursePhotoMap.has(item.id)) {
              // Photo is assigned to a course → group photo
              isGroupPhoto = true;
            } else if (studentPhotoMap.has(item.id) || legacyPhotoMap.has(item.id)) {
              // Photo is assigned to students → individual photo
              isGroupPhoto = false;
            } else {
              // Photo is not assigned anywhere - use AI classification
              const classification = classificationMap.get(item.id);
              if (classification) {
                isGroupPhoto = classification.isGroupPhoto;
              }
            }

            return {
              id: item.id,
              filename:
                item.filename ||
                item.original_filename ||
                item.storage_path?.split('/').pop() ||
                'foto',
              preview_url: previewUrl,
              watermark_url: wmUrl,
              file_size: item.photos?.file_size || item.file_size || item.file_size_bytes || 0,
              created_at: item.photos?.created_at || item.created_at || item.uploaded_at || new Date().toISOString(),
              storage_path: item.storage_path || null,
              status: item.status || 'ready',
              is_group_photo: isGroupPhoto,
            };
          });
        } else {
          assets = [];
        }

        const totalItems = count || 0;
        pagination = {
          limit,
          offset,
          total: totalItems,
          hasMore: totalItems ? totalItems > offset + limit : false,
          page: Math.floor(offset / limit) + 1,
          total_pages: totalItems ? Math.max(1, Math.ceil(totalItems / limit)) : 1,
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
      gallery: include_assets ? galleryPayload ?? undefined : undefined,
      gallery_rate_limit:
        include_assets && galleryPayload ? galleryPayload.rateLimit : undefined,
      gallery_catalog:
        include_assets && galleryPayload
          ? galleryPayload.catalog ?? null
          : undefined,
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
  request: NextRequest, context: RouteContext<{ token: string }>) {
  const params = await context.params;
  try {
    const { token } = params;

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

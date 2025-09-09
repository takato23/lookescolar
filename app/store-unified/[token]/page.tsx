/**
 * UNIFIED STORE PAGE - /store-unified/[token]
 *
 * Página unificada de tienda que maneja TODOS los tipos de tokens:
 * - Event tokens (/s/[token])
 * - Course tokens (/s/[token])
 * - Family tokens (/f/[token])
 * - Store tokens (/store/[token])
 *
 * Características:
 * - Una sola interfaz para todas las familias
 * - Misma experiencia de usuario
 * - Contenido filtrado según el token
 * - Sistema de carrito unificado
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { absoluteUrl } from '@/lib/absoluteUrl';
import { UnifiedStore } from '@/components/store/UnifiedStore';
import { hierarchicalGalleryService } from '@/lib/services/hierarchical-gallery.service';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generar metadata dinámica basada en el token
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;

  try {
    // Validar token y obtener contexto
    const validation = await hierarchicalGalleryService.validateAccess(token);

    if (!validation.isValid || !validation.context) {
      // Fallback para tokens de sharing público - use direct database access
      const isShareToken = /^[a-f0-9]{32}$/i.test(token) || /^[a-f0-9]{64}$/i.test(token);
      const isFolderShareToken = !isShareToken && token.length >= 16 && token.length <= 64;
      
      // Metadata para share_tokens (32/64 hex)
      if (isShareToken) {
        try {
          const supabase = await createServerSupabaseServiceClient();
          const { data: st } = await supabase
            .from('share_tokens')
            .select('share_type, event_id, folder_id')
            .eq('token', token)
            .maybeSingle();
          if (st) {
            let title = 'Tienda de Fotos | LookEscolar';
            if (st.share_type === 'event' && st.event_id) {
              const { data: ev } = await supabase.from('events').select('name, school').eq('id', st.event_id).maybeSingle();
              const name = (ev as any)?.name || (ev as any)?.school || 'Galería';
              title = `${name} - Tienda de Fotos | LookEscolar`;
            }
            if (st.share_type === 'folder' && st.folder_id) {
              const { data: fo } = await supabase.from('folders').select('name, event_id').eq('id', st.folder_id).single();
              let eventName = fo?.name || 'Álbum';
              try {
                const { data: ev } = await supabase.from('events').select('name, school').eq('id', fo?.event_id).maybeSingle();
                eventName = (ev as any)?.name || (ev as any)?.school || fo?.name || 'Álbum';
              } catch {}
              title = `${eventName} - Tienda de Fotos | LookEscolar`;
            }
            return {
              title,
              description: 'Compra fotos seleccionadas de esta galería',
              robots: 'noindex, nofollow',
              referrer: 'no-referrer',
            } as any;
          }
        } catch {}
      }

      if (isFolderShareToken) {
        try {
          const supabase = await createServerSupabaseServiceClient();

          // Get folder info for metadata
          const { data: folder } = await supabase
            .from('folders')
            .select('id, event_id, name, is_published')
            .eq('share_token', token)
            .eq('is_published', true)
            .single();

          if (folder) {
            // Get event name
            let eventName = 'Galería';
            try {
              const { data: ev } = await supabase
                .from('events')
                .select('name, school')
                .eq('id', folder.event_id)
                .maybeSingle();
              eventName = (ev as any)?.name || (ev as any)?.school || folder.name || 'Galería';
            } catch {}

            return {
              title: `${eventName} - Tienda de Fotos | LookEscolar`,
              description: 'Compra fotos seleccionadas de esta galería',
              robots: 'noindex, nofollow',
              referrer: 'no-referrer',
            } as any;
          }
        } catch {}
      }
      return {
        title: 'Tienda no disponible - LookEscolar',
        description: 'El enlace de la tienda no es válido o ha expirado.',
        robots: 'noindex, nofollow',
      };
    }

    const { context } = validation;
    const scopeName =
      context.scope === 'event'
        ? 'Evento'
        : context.scope === 'course'
          ? 'Curso'
          : 'Familia';

    return {
      title: `${scopeName}: ${context.resourceName} - Tienda de Fotos | LookEscolar`,
      description: `Compra fotos profesionales de ${context.resourceName}. Galería de fotos con opciones de paquetes y copias adicionales.`,
      openGraph: {
        title: `${context.resourceName} - Tienda de Fotos`,
        description: `Compra fotos profesionales de ${context.resourceName}`,
        type: 'website',
        url: `/store-unified/${token}`,
      },
      robots: {
        index: false, // No indexar por privacidad
        follow: false,
        nocache: true,
        noarchive: true,
        nosnippet: true,
      },
      referrer: 'no-referrer',
    };
  } catch (error) {
    return {
      title: 'Tienda de Fotos - LookEscolar',
      description: 'Galería de fotos profesionales con opciones de compra.',
      robots: { index: false, follow: false, nocache: true },
      referrer: 'no-referrer',
    };
  }
}

export default async function UnifiedStorePage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const searchParamsObj = await searchParams;
  const page = Math.max(1, parseInt((searchParamsObj?.page as string) || '1'));
  const limit = Math.min(100, Math.max(1, parseInt((searchParamsObj?.limit as string) || '60')));
  const stepParam = (searchParamsObj?.step as string) || '';
  const allowedSteps = new Set(['package', 'photos', 'extras', 'contact', 'payment']);
  const initialStep = allowedSteps.has(stepParam) ? (stepParam as any) : undefined;

  try {
    // Validar token y obtener contexto
    const validation = await hierarchicalGalleryService.validateAccess(token);

    let photos:
      | Array<{ id: string; filename: string; preview_url: string; size: number; width: number; height: number }>
      | null = null;
    let subject: any = null;
    let isShareToken = false;
    let ctx: any = null;

    if (!validation.isValid) {
      // Fallback: tokens de sharing público (tabla share_tokens: 32 o 64 hex)
      isShareToken = /^[a-f0-9]{32}$/i.test(token) || /^[a-f0-9]{64}$/i.test(token);
      const isFolderShareToken = !isShareToken && token.length >= 16 && token.length <= 64;
      
      // Aceptar tokens de share (32/64 hex) o tokens de carpeta (16-64 chars legacy)
      if (!isShareToken && !isFolderShareToken) {
        console.error('Token validation failed - not a valid share token:', validation.reason);
        notFound();
      }

      // Direct database access for share tokens
      try {
        const supabase = await createServerSupabaseServiceClient();

        // First try to find in share_tokens table (event/folder/photos shares)
        if (isShareToken) {
          const { data: shareTokenData } = await supabase
            .from('share_tokens')
            .select('id, token, event_id, folder_id, photo_ids, share_type, metadata, is_active, expires_at')
            .eq('token', token)
            .eq('is_active', true)
            .single();

          if (shareTokenData && (!shareTokenData.expires_at || new Date(shareTokenData.expires_at) > new Date())) {
            console.log('✅ [UNIFIED STORE] Found valid share token:', {
              tokenId: shareTokenData.id,
              eventId: shareTokenData.event_id,
              shareType: shareTokenData.share_type,
              token: token.slice(0, 8) + '...'
            });

            // Share type specific handling (folder/photos), otherwise event
            const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const publicBuckets = ['assets', 'photos', 'photo-public'];
            const buildPublicUrl = (path?: string | null) => {
              if (!path || !baseUrl) return null;
              for (const b of publicBuckets) {
                return `${baseUrl}/storage/v1/object/public/${b}/${path}`;
              }
              return null;
            };
            const offset = (page - 1) * limit;
            const subjectId = (shareTokenData as any).subject_id || (shareTokenData.metadata && (shareTokenData.metadata as any).subject_id) || null;
            const baseSelect = 'id, folder_id, filename, original_path, preview_path, watermark_path, file_size, mime_type, created_at, status';

            if (shareTokenData.share_type === 'folder' && shareTokenData.folder_id) {
              // Folder subtree
              let allowedFolderIds: string[] = [];
              try {
                const { data: rows } = await supabase.rpc('get_descendant_folders', { p_folder_id: shareTokenData.folder_id });
                allowedFolderIds = (rows || []).map((r: any) => r.id);
                if (!allowedFolderIds.includes(shareTokenData.folder_id)) allowedFolderIds.push(shareTokenData.folder_id);
              } catch { allowedFolderIds = [shareTokenData.folder_id]; }

              let q = supabase.from('assets').select(baseSelect).eq('status', 'ready').in('folder_id', allowedFolderIds);
              if (subjectId) {
                const selectExpr = `${baseSelect}, asset_subjects!inner(subject_id)`;
                q = supabase.from('assets').select(selectExpr).eq('status','ready').in('folder_id', allowedFolderIds).eq('asset_subjects.subject_id', subjectId);
              }
              const { data: foAssets, error: assetsErr } = await q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
              if (assetsErr) { console.error('❌ [UNIFIED STORE] Failed to fetch folder assets:', assetsErr); notFound(); }

              const mapped = (foAssets || []).map((a: any) => {
                const wm = a.watermark_path || a.watermark_url || null;
                const pre = a.preview_path || a.preview_url || null;
                const orig = a.original_path || a.storage_path || null;
                const direct = typeof pre === 'string' && pre.startsWith('http') ? pre : null;
                const url = direct || buildPublicUrl(wm) || buildPublicUrl(pre) || buildPublicUrl(orig) || '';
                return { id: a.id, filename: a.filename || a.original_filename || 'foto', preview_url: url, size: a.file_size || 0, width: 800, height: 600 };
              });

              // Folder and event info
              const { data: folderInfo } = await supabase
                .from('folders')
                .select('id, name, event_id')
                .eq('id', shareTokenData.folder_id)
                .single();
              let eventName: string | null = null;
              try {
                const { data: ev } = await supabase
                  .from('events')
                  .select('name, school')
                  .eq('id', folderInfo?.event_id)
                  .maybeSingle();
                eventName = (ev as any)?.name || (ev as any)?.school || null;
              } catch {}
              photos = mapped;
              subject = {
                id: folderInfo?.event_id,
                name: eventName || folderInfo?.name || 'Álbum',
                grade_section: 'Evento',
                event: { name: eventName || folderInfo?.name || 'Álbum', school_name: 'Escuela', theme: 'default' },
              };

              return (
                <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
                  <UnifiedStore token={token} photos={photos || []} subject={subject} callbackBase="f" initialStep={initialStep} />
                </div>
              );
            }

            if (shareTokenData.share_type === 'photos' && Array.isArray(shareTokenData.photo_ids) && shareTokenData.photo_ids.length > 0) {
              let q = supabase.from('assets').select(baseSelect).eq('status','ready').in('id', shareTokenData.photo_ids);
              if (subjectId) {
                const selectExpr = `${baseSelect}, asset_subjects!inner(subject_id)`;
                q = supabase.from('assets').select(selectExpr).eq('status','ready').in('id', shareTokenData.photo_ids).eq('asset_subjects.subject_id', subjectId);
              }
              const { data: phAssets, error: assetsErr } = await q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
              if (assetsErr) { console.error('❌ [UNIFIED STORE] Failed to fetch selected photos:', assetsErr); notFound(); }

              const mapped = (phAssets || []).map((a: any) => {
                const wm = a.watermark_path || a.watermark_url || null;
                const pre = a.preview_path || a.preview_url || null;
                const orig = a.original_path || a.storage_path || null;
                const direct = typeof pre === 'string' && pre.startsWith('http') ? pre : null;
                const url = direct || buildPublicUrl(wm) || buildPublicUrl(pre) || buildPublicUrl(orig) || '';
                return { id: a.id, filename: a.filename || a.original_filename || 'foto', preview_url: url, size: a.file_size || 0, width: 800, height: 600 };
              });

              // Event header
              const { data: eventData } = await supabase
                .from('events')
                .select('id, name, school')
                .eq('id', shareTokenData.event_id)
                .maybeSingle();
              photos = mapped;
              subject = {
                id: shareTokenData.event_id,
                name: (eventData as any)?.name || (eventData as any)?.school || 'Fotos seleccionadas',
                grade_section: 'Evento',
                event: { name: (eventData as any)?.name || (eventData as any)?.school || 'Evento', school_name: 'Escuela', theme: 'default' },
              };

              return (
                <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
                  <UnifiedStore token={token} photos={photos || []} subject={subject} callbackBase="f" initialStep={initialStep} />
                </div>
              );
            }

            // Get event info (default)
            const { data: eventData } = await supabase
              .from('events')
              .select('id, name, location, date')
              .eq('id', shareTokenData.event_id)
              .single();

            if (eventData) {
              // Get photos from event (all folders in event)
              const offset = (page - 1) * limit;
              
              // Get all folders for this event
              const { data: eventFolders } = await supabase
                .from('folders')
                .select('id')
                .eq('event_id', shareTokenData.event_id);
              
              const folderIds = (eventFolders || []).map(f => f.id);
              
              if (folderIds.length > 0) {
                // Get assets from all folders in the event
                const { data: assets, error: assetsErr } = await supabase
                  .from('assets')
                  .select('id, folder_id, filename, original_path, preview_path, watermark_path, file_size, mime_type, created_at, status')
                  .eq('status', 'ready')
                  .in('folder_id', folderIds)
                  .order('created_at', { ascending: false })
                  .range(offset, offset + limit - 1);

                if (!assetsErr && assets) {
                  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                  const publicBuckets = ['assets', 'photos', 'photo-public'];

                  const buildPublicUrl = (path?: string | null) => {
                    if (!path || !baseUrl) return null;
                    for (const b of publicBuckets) {
                      return `${baseUrl}/storage/v1/object/public/${b}/${path}`;
                    }
                    return null;
                  };

                  photos = assets.map((a: any) => {
                    const wm = a.watermark_path || a.watermark_url || null;
                    const pre = a.preview_path || a.preview_url || null;
                    const orig = a.original_path || a.storage_path || null;
                    const direct = typeof pre === 'string' && pre.startsWith('http') ? pre : null;
                    const url = direct || buildPublicUrl(wm) || buildPublicUrl(pre) || buildPublicUrl(orig) || '';
                    return {
                      id: a.id,
                      filename: a.filename || a.original_filename || 'foto',
                      preview_url: url,
                      size: a.file_size || 0,
                      width: 800,
                      height: 600,
                    };
                  });

                  subject = {
                    id: eventData.id,
                    name: eventData.name || eventData.location || 'Evento',
                    grade_section: 'Evento',
                    event: {
                      name: eventData.name || eventData.location || 'Evento',
                      school_name: eventData.location || 'Escuela',
                      theme: 'default',
                    },
                  };

                  console.log('✅ [UNIFIED STORE] Event share token processed successfully:', {
                    token: token.slice(0, 8) + '...',
                    photosCount: photos.length,
                    eventName: subject.name
                  });

                  // Return early with successful event share data
                  return (
                    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
                      <UnifiedStore
                        token={token}
                        photos={photos || []}
                        subject={subject}
                        callbackBase="f"
                        initialStep={initialStep}
                      />
                    </div>
                  );

                } else {
                  console.error('❌ [UNIFIED STORE] Failed to fetch event assets:', assetsErr);
                  notFound();
                }
              } else {
                console.log('⚠️ [UNIFIED STORE] No folders found for event');
                notFound();
              }
            } else {
              console.error('❌ [UNIFIED STORE] Event not found for share token');
              notFound();
            }
          } else {
            // Not found in share_tokens; continue with legacy folder token fallback below
            console.log('ℹ️ [UNIFIED STORE] Token not in share_tokens; trying folder.share_token fallback');
          }
        }

        // If not an event share token or event token failed, try to find folder by share token
        let { data: folder, error: folderErr } = await supabase
          .from('folders')
          .select('id, event_id, name, is_published, share_token')
          .eq('share_token', token)
          .single();

        // If folder not found by share token, try to find by any existing share tokens and create a new one
        if (folderErr || !folder) {
          console.log('⚠️ [UNIFIED STORE] Token not found, attempting recovery...');
          
          // Try to find any published folders that might need a share token
          const { data: folders, error: foldersErr } = await supabase
            .from('folders')
            .select('id, event_id, name, is_published')
            .eq('is_published', true)
            .is('share_token', null)
            .limit(1);

          if (!foldersErr && folders && folders.length > 0) {
            // Generate a new share token for the first available folder
            const newShareToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');

            const { data: updatedFolder, error: updateErr } = await supabase
              .from('folders')
              .update({
                share_token: newShareToken,
                is_published: true,
                published_at: new Date().toISOString()
              })
              .eq('id', folders[0].id)
              .select('id, event_id, name, is_published, share_token')
              .single();

            if (!updateErr && updatedFolder) {
              console.log('✅ [UNIFIED STORE] Created new share token for recovery');
              // Use the updated folder with the new token
              folder = updatedFolder;
            } else {
              console.log('ℹ️ [UNIFIED STORE] No published folders available for recovery');
              notFound();
            }
          } else {
            console.log('ℹ️ [UNIFIED STORE] No folders found that could be published');
            notFound();
          }
        }

        if (!folder.is_published) {
          console.error('❌ [UNIFIED STORE] Folder not published:', { 
            folderId: folder.id,
            token: token.slice(0, 8) + '...' 
          });
          notFound();
        }

        // Get all descendant folders (including the root)
        let allowedFolderIds: string[] = [];
        try {
          const { data: rows } = await supabase.rpc('get_descendant_folders', {
            p_folder_id: folder.id,
          });
          allowedFolderIds = (rows || []).map((r: any) => r.id);
          if (!allowedFolderIds.includes(folder.id)) allowedFolderIds.push(folder.id);
        } catch {
          allowedFolderIds = [folder.id];
        }

        // Get assets
        const offset = (page - 1) * limit;
        const { data: assets, error: assetsErr, count } = await supabase
          .from('assets')
          .select('id, folder_id, filename, original_path, preview_path, file_size, mime_type, created_at, status', { count: 'exact' })
          .eq('status', 'ready')
          .in('folder_id', allowedFolderIds)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (assetsErr) {
          console.error('❌ [UNIFIED STORE] Failed to fetch assets:', assetsErr);
          notFound();
        }

        // Event branding
        let eventName: string | null = null;
        try {
          const { data: ev } = await supabase
            .from('events')
            .select('name, school')
            .eq('id', folder.event_id)
            .maybeSingle();
          eventName = (ev as any)?.name || (ev as any)?.school || null;
        } catch {}

        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const publicBuckets = ['assets', 'photos', 'photo-public'];

        const buildPublicUrl = (path?: string | null) => {
          if (!path || !baseUrl) return null;
          for (const b of publicBuckets) {
            return `${baseUrl}/storage/v1/object/public/${b}/${path}`;
          }
          return null;
        };

        photos = (assets || []).map((a: any) => {
          const wm = a.watermark_path || a.watermark_url || null;
          const pre = a.preview_path || a.preview_url || null;
          const orig = a.original_path || a.storage_path || null;
          const direct = typeof pre === 'string' && pre.startsWith('http') ? pre : null;
          const url = direct || buildPublicUrl(wm) || buildPublicUrl(pre) || buildPublicUrl(orig) || '';
          return {
            id: a.id,
            filename: a.filename || a.original_filename || 'foto',
            preview_url: url,
            size: a.file_size || 0,
            width: 800,
            height: 600,
          };
        });

        subject = {
          id: folder.event_id,
          name: eventName || folder.name || 'Evento',
          grade_section: 'Evento',
          event: {
            name: eventName || folder.name || 'Evento',
            school_name: 'Escuela',
            theme: 'default',
          },
        };

        console.log('✅ [UNIFIED STORE] Direct database access successful:', {
          token: token.slice(0, 8) + '...',
          photosCount: photos.length,
          eventName: subject.name
        });

      } catch (error) {
        console.error('❌ [UNIFIED STORE] Direct database access failed:', error);
        notFound();
      }
    } else {
      const context = validation.context!;
      ctx = context;
      console.log('✅ [UNIFIED STORE] Token válido:', {
        scope: context.scope,
        resourceName: context.resourceName,
        canDownload: context.canDownload,
        queryParams: searchParamsObj,
      });

      // Obtener datos según el scope del token
      const offset = (page - 1) * limit;
      const assets = await hierarchicalGalleryService.getAssetsPaginated(
        token,
        undefined,
        limit,
        offset
      );

      photos = assets.assets.map((asset) => ({
        id: asset.id,
        filename: asset.filename,
        // Use hierarchical preview endpoint (validates scope and signs URL)
        preview_url: `/api/hierarchical/${token}/preview/${asset.id}`,
        size: asset.fileSize || 0,
        // Width/height may be unknown at this stage; use sensible defaults
        width: 800,
        height: 600,
      }));

      // Crear subject unificado basado en el contexto
      subject = {
        id: context.resourceId,
        name: context.resourceName,
        grade_section:
          context.scope === 'event'
            ? 'Evento'
            : context.scope === 'course'
              ? 'Curso'
              : 'Familia',
        event: {
          name: context.resourceName,
          school_name:
            context.scope === 'event' ? context.resourceName : 'Escuela',
          theme: 'default',
        },
      };

      // Log de acceso exitoso
      await hierarchicalGalleryService.logAccess(token, 'store_access', {
        success: true,
        responseTimeMs: 0,
        notes: `Unified store access to ${context.scope} gallery with params: ${JSON.stringify(searchParamsObj)}`,
      });
    }

    // Mostrar información de debug en desarrollo
    const isDevelopment = process.env.NODE_ENV === 'development';
    const debugScope = ctx?.scope || (isShareToken ? 'share' : 'unknown');
    const debugResourceName = ctx?.resourceName || subject?.name || 'Galería';
    const debugInfo = isDevelopment
      ? {
          token: token.slice(0, 8) + '...',
          scope: debugScope,
          resourceName: debugResourceName,
          photosCount: photos?.length || 0,
          queryParams: searchParamsObj,
          redirectSource: (searchParamsObj as any).source || 'direct',
        }
      : null;

    // Debug logging for the page
    console.log('📄 UnifiedStorePage rendering:', {
      token: token.slice(0, 8) + '...',
      photosCount: photos?.length || 0,
      subjectName: subject?.event?.name,
      debugScope
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <UnifiedStore
          token={token}
          photos={photos || []}
          subject={subject}
          // Mantener callbacks existentes bajo /f/[token]/payment/*
          callbackBase="f"
          // Permite deep-linkear a un paso específico del checkout
          initialStep={initialStep}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading unified store:', error);
    notFound();
  }
}

// Habilitar ISR para mejor rendimiento
export const revalidate = 300; // 5 minutos

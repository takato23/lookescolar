import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { SecurityLogger } from '@/lib/middleware/auth.middleware';
import type { Database } from '@/types/database';

/**
 * Genera URLs firmadas SEGURAS que NUNCA exponen originales
 * Prioriza watermark_path > preview_path, bloquea storage_path directo
 */
export async function getSecureImageUrl(
  photoId: string,
  expiresSec = 900,
  allowPreviewFallback = true
): Promise<string | null> {
  const sb = await createServerSupabaseServiceClient();
  const requestId = `sec_${Math.random().toString(36).slice(2)}`;

  try {
    // Obtener paths de la foto
    type PhotoRow = Pick<
      Database['public']['Tables']['photos']['Row'],
      'id' | 'watermark_path' | 'preview_path' | 'storage_path'
    >;

    const { data: photo, error } = await sb
      .from('photos')
      .select('id, watermark_path, preview_path, storage_path')
      .eq('id', photoId)
      .returns<PhotoRow>()
      .single();

    if (error || !photo) {
      SecurityLogger.logSecurityEvent(
        'secure_image_photo_not_found',
        { requestId, photoId },
        'warning'
      );
      return null;
    }

    // PRIORIDAD 1: watermark_path (máxima seguridad)
    if (photo.watermark_path) {
      try {
        const url = await createSignedUrlSafe(
          photo.watermark_path,
          expiresSec,
          requestId
        );
        if (url) {
          SecurityLogger.logSecurityEvent(
            'secure_image_watermark_served',
            { requestId, photoId, path: 'watermark' },
            'info'
          );
          return url;
        }
      } catch (error) {
        console.warn('Watermark URL failed, trying fallback:', error);
      }
    }

    // PRIORIDAD 2: preview_path (solo si se permite fallback)
    if (allowPreviewFallback && photo.preview_path) {
      try {
        const url = await createSignedUrlSafe(
          photo.preview_path,
          expiresSec,
          requestId
        );
        if (url) {
          SecurityLogger.logSecurityEvent(
            'secure_image_preview_served',
            { requestId, photoId, path: 'preview' },
            'warning' // Warning porque no es watermark
          );
          return url;
        }
      } catch (error) {
        console.warn('Preview URL failed:', error);
      }
    }

    // NUNCA servir storage_path (original) directamente
    SecurityLogger.logSecurityEvent(
      'secure_image_no_safe_path',
      {
        requestId,
        photoId,
        hasWatermark: !!photo.watermark_path,
        hasPreview: !!photo.preview_path,
        allowPreviewFallback,
      },
      'error'
    );

    return null;
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'secure_image_error',
      { requestId, photoId, error: (error as any)?.message || 'unknown' },
      'error'
    );
    return null;
  }
}

/**
 * Crea signed URL de manera segura, detectando bucket automáticamente
 */
async function createSignedUrlSafe(
  key: string,
  expiresSec: number,
  requestId: string
): Promise<string | null> {
  const sb = await createServerSupabaseServiceClient();
  const ORIGINAL_BUCKET =
    process.env['STORAGE_BUCKET_ORIGINAL'] ||
    process.env['STORAGE_BUCKET'] ||
    'photo-private';
  const PREVIEW_BUCKET = process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';

  // SEGURIDAD: Bloquear cualquier intento de acceder a originales directamente
  if (isOriginalPath(key)) {
    SecurityLogger.logSecurityEvent(
      'secure_image_original_blocked',
      { requestId, key: maskPath(key) },
      'error'
    );
    throw new Error('Access to original images is forbidden');
  }

  // Detectar bucket correcto
  const bucket =
    /(^|\/)previews\//.test(key) || /watermark/i.test(key)
      ? PREVIEW_BUCKET
      : ORIGINAL_BUCKET;

  const { data, error } = await sb.storage
    .from(bucket)
    .createSignedUrl(key, expiresSec);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

/**
 * Detecta si un path es de imagen original (no watermark/preview)
 */
function isOriginalPath(key: string): boolean {
  // Paths que indican originales (sin procesar)
  const originalPatterns = [
    /^events\/[^/]+\/[^/]+\.(jpg|jpeg|png)$/i, // events/eventId/photo.jpg
    /^uploads\/[^/]+\.(jpg|jpeg|png)$/i, // uploads/photo.jpg
    /^photos\/[^/]+\/[^/]+\.(jpg|jpeg|png)$/i, // photos/eventId/photo.jpg
  ];

  // Paths seguros (procesados)
  const safePatterns = [
    /\/previews\//i,
    /\/watermarks?\//i,
    /watermark/i,
    /preview/i,
    /\.webp$/i, // WebP generalmente indica procesado
  ];

  // Si coincide con patrón seguro, permitir
  if (safePatterns.some((pattern) => pattern.test(key))) {
    return false;
  }

  // Si coincide con patrón original, bloquear
  if (originalPatterns.some((pattern) => pattern.test(key))) {
    return true;
  }

  // Por defecto, ser conservador y considerar original si no está claro
  return true;
}

/**
 * Enmascara paths sensibles para logs
 */
function maskPath(path: string): string {
  return path.replace(/\/[^/]+\.(jpg|jpeg|png|webp)$/i, '/***.$1');
}

/**
 * Función de conveniencia para obtener URL de watermark específicamente
 */
export async function getWatermarkUrl(
  photoId: string,
  expiresSec = 900
): Promise<string | null> {
  return await getSecureImageUrl(photoId, expiresSec, false); // Solo watermark, no preview
}

/**
 * Función de conveniencia para obtener URL con fallback a preview
 */
export async function getImageUrlWithFallback(
  photoId: string,
  expiresSec = 900
): Promise<string | null> {
  return await getSecureImageUrl(photoId, expiresSec, true); // Watermark preferido, preview como fallback
}

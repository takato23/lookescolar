import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { SecurityLogger } from '@/lib/middleware/auth.middleware';

interface TransformOptions {
  width?: number;
  height?: number;
  resize?: 'contain' | 'cover' | 'fill';
  quality?: number;
}

interface SignedUrlOptions {
  expiresIn?: number;
  transform?: TransformOptions;
  // When true, avoid warning logs for missing objects (useful for soft lookups)
  quietMissing?: boolean;
}

export async function signedUrlForKey(
  key: string,
  options?: SignedUrlOptions | number
): Promise<string> {
  // Handle backward compatibility
  const expiresSec =
    typeof options === 'number' ? options : options?.expiresIn || 900;
  const sb = await createServerSupabaseServiceClient();
  const ORIGINAL_BUCKET =
    process.env['STORAGE_BUCKET_ORIGINAL'] ||
    process.env['STORAGE_BUCKET'] ||
    'photo-private';
  const PREVIEW_BUCKET = process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';
  // Decide bucket based on key path: previews/watermarks live in public PREVIEW bucket; originals in private ORIGINAL bucket
  let bucket =
    /(^|\/)previews\//.test(key) || /watermark/i.test(key)
      ? PREVIEW_BUCKET
      : ORIGINAL_BUCKET;
  const requestId = `sig_${Math.random().toString(36).slice(2)}`;

  // Buckets are always set due to fallbacks above

  // Build signed URL with transform options if provided
  const transform = typeof options === 'object' ? options.transform : undefined;
  const quietMissing = typeof options === 'object' && options.quietMissing === true;
  let { data, error } = await sb.storage
    .from(bucket)
    .createSignedUrl(key, expiresSec, {
      transform: transform
        ? {
            width: transform.width,
            height: transform.height,
            resize: transform.resize,
            quality: transform.quality,
          }
        : undefined,
    });
  // If object not found, attempt the other bucket as a safety net
  const isMissing =
    error &&
    ((error as any)?.status === 404 ||
      (error as any)?.statusCode === '404' ||
      String((error as any)?.message || '')
        .toLowerCase()
        .includes('not found'));
  if (isMissing) {
    const fallback =
      bucket === ORIGINAL_BUCKET ? PREVIEW_BUCKET : ORIGINAL_BUCKET;
    const attempt = await sb.storage
      .from(fallback)
      .createSignedUrl(key, expiresSec, {
        transform: transform
          ? {
              width: transform.width,
              height: transform.height,
              resize: transform.resize,
              quality: transform.quality,
            }
          : undefined,
      });
    if (!attempt.error && attempt.data?.signedUrl) {
      SecurityLogger.logSecurityEvent(
        'signed_url_fallback_bucket',
        { requestId, from: bucket, to: fallback, key },
        'warning'
      );
      bucket = fallback;
      data = attempt.data;
      error = undefined as any;
    }
  }
  if (error || !data?.signedUrl) {
    const stillMissing =
      (error as any)?.status === 404 ||
      (error as any)?.statusCode === '404' ||
      String((error as any)?.message || '')
        .toLowerCase()
        .includes('not found');

    if (stillMissing) {
      if (!quietMissing) {
        SecurityLogger.logSecurityEvent(
          'signed_url_object_missing',
          { requestId, bucket, key },
          'warning'
        );
      }
    } else {
      SecurityLogger.logSecurityEvent(
        'signed_url_error',
        { requestId, bucket, key, error: (error as any)?.message || 'unknown' },
        'error'
      );
    }
    throw error ?? new Error('No signed URL');
  }
  return data.signedUrl;
}

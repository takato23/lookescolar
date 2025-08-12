import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { SecurityLogger } from '@/lib/middleware/auth.middleware';

export async function signedUrlForKey(key: string, expiresSec = 3600): Promise<string> {
  const sb = await createServerSupabaseServiceClient();
  let bucket = process.env.STORAGE_BUCKET || (process.env.NODE_ENV === 'development' ? 'photos' : undefined);
  const requestId = `sig_${Math.random().toString(36).slice(2)}`;

  if (!bucket) {
    const err = new Error('STORAGE_BUCKET not set');
    SecurityLogger.logSecurityEvent('signed_url_config_error', { requestId }, 'error');
    throw err;
  }

  let { data, error } = await sb.storage.from(bucket).createSignedUrl(key, expiresSec);
  // If object not found and we recently migrated bucket name, attempt fallback bucket
  const isMissing = error && (
    (error as any)?.status === 404 ||
    (error as any)?.statusCode === '404' ||
    String((error as any)?.message || '').toLowerCase().includes('not found')
  );
  if (isMissing && bucket !== 'photos-bucket') {
    const fallback = 'photos-bucket';
    const attempt = await sb.storage.from(fallback).createSignedUrl(key, expiresSec);
    if (!attempt.error && attempt.data?.signedUrl) {
      SecurityLogger.logSecurityEvent('signed_url_fallback_bucket', { requestId, from: bucket, to: fallback, key }, 'warning');
      bucket = fallback;
      data = attempt.data;
      error = undefined as any;
    }
  }
  if (error || !data?.signedUrl) {
    const stillMissing =
      (error as any)?.status === 404 ||
      (error as any)?.statusCode === '404' ||
      String((error as any)?.message || '').toLowerCase().includes('not found');

    if (stillMissing) {
      SecurityLogger.logSecurityEvent(
        'signed_url_object_missing',
        { requestId, bucket, key },
        'warning'
      );
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



import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function signedUrlForKey(key: string, expiresSec = 3600): Promise<string> {
  const sb = await createServerSupabaseServiceClient();
  const bucket = process.env.STORAGE_BUCKET!;
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(key, expiresSec);
  if (error || !data?.signedUrl) throw error ?? new Error('No signed URL');
  return data.signedUrl;
}



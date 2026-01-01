import crypto from 'crypto';
import { redirect } from 'next/navigation';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

interface PublicGalleryPageProps {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

type SearchParams = Record<string, string | string[] | undefined>;

function buildRedirectUrl(token: string, searchParams: SearchParams) {
  const queryString = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((v) => queryString.append(key, v));
    } else {
      queryString.append(key, value);
    }
  });

  const qs = queryString.toString();
  return qs ? `/store-unified/${token}?${qs}` : `/store-unified/${token}`;
}

export default async function PublicGalleryPage({
  params,
  searchParams,
}: PublicGalleryPageProps) {
  const { eventId } = await params;
  const resolvedSearchParams =
    searchParams && typeof (searchParams as any).then === 'function'
      ? await (searchParams as Promise<SearchParams>)
      : (searchParams ?? {});

  // Validación robusta del eventId
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!eventId) {
    redirect(buildRedirectUrl('invalid-event', resolvedSearchParams));
  }

  if (!uuidRegex.test(eventId)) {
    redirect(buildRedirectUrl(eventId, resolvedSearchParams));
  }

  const supabase = await createServerSupabaseServiceClient();
  const nowIso = new Date().toISOString();

  const { data: shareToken } = await supabase
    .from('share_tokens')
    .select('token, expires_at, is_active')
    .eq('event_id', eventId)
    .eq('share_type', 'event')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    shareToken?.token &&
    (!shareToken.expires_at || shareToken.expires_at > nowIso)
  ) {
    redirect(buildRedirectUrl(shareToken.token, resolvedSearchParams));
  }

  const { data: eventRow } = await supabase
    .from('events')
    .select('id, public_gallery_enabled')
    .eq('id', eventId)
    .maybeSingle();

  if (eventRow?.public_gallery_enabled) {
    const newToken = crypto.randomBytes(32).toString('hex');
    await supabase.from('share_tokens').insert({
      event_id: eventId,
      token: newToken,
      share_type: 'event',
      is_active: true,
      allow_download: true,
      allow_comments: false,
      metadata: { source: 'public_gallery_legacy_redirect' },
    });
    redirect(buildRedirectUrl(newToken, resolvedSearchParams));
  }

  redirect(buildRedirectUrl(eventId, resolvedSearchParams));
}

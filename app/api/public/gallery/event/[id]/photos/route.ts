import crypto from 'crypto';
import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveEventToken(eventId: string) {
  if (!eventId) return 'invalid-event';
  if (!UUID_REGEX.test(eventId)) return eventId;

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
    return shareToken.token;
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
    return newToken;
  }

  return eventId;
}

export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const { id: eventId } = await context.params;
  const token = await resolveEventToken(eventId);
  const redirectUrl = new URL(`/api/store/${token}`, request.url);
  const existingParams = new URL(request.url).searchParams;
  redirectUrl.search = existingParams.toString();
  if (!redirectUrl.searchParams.has('include_assets')) {
    redirectUrl.searchParams.set('include_assets', 'true');
  }

  return NextResponse.redirect(redirectUrl, 307);
}

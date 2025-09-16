// Server wrapper for optional SSR hydration on /admin/publish?event_id=...
import PublishClient from './PublishClient';
import { fetchCounter } from '@/lib/services/fetch-counter';
import CentralitaPublishClient from '@/components/admin/centralita/centralita-publish-client';
import ModernPublishClientWrapper from './ModernPublishClientWrapper';

export default async function PublishPage(props: {
  searchParams?: Promise<{ event_id?: string; tab?: string }> | { event_id?: string; tab?: string };
}) {
  const sp = (await (props.searchParams as any)) || (props.searchParams as any) || {};
  const eventId = sp?.event_id as string | undefined;
  const centralitaEnabled = process.env.NEXT_PUBLIC_CENTRALITA_ENABLED === 'true';

  if (!eventId) {
    if (centralitaEnabled) {
      return <CentralitaPublishClient />;
    }
    // Use modern design by default
    return <ModernPublishClientWrapper />;
  }

  // Fetch event details (best-effort)
  let event: { id: string; name: string; date?: string } | null = null;
  try {
    fetchCounter.increment('SSR/admin/events', eventId);
    const eventRes = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/admin/events/${eventId}`,
      { cache: 'no-store', credentials: 'include' }
    );
    if (eventRes.ok) {
      const ejson = await eventRes.json();
      const ev = (ejson as any).event || ejson;
      if (ev?.id) event = { id: ev.id, name: ev.name, date: ev.date || undefined };
    }
  } catch (e) {
    console.warn('[SSR] Failed to fetch event details for /admin/publish:', e);
  }

  // Fetch first page of folders for this event for initial hydration
  let folders: any[] = [];
  try {
    const qp = new URLSearchParams({
      include_unpublished: 'true',
      limit: '100',
      order_by: 'published_desc',
      event_id: eventId,
    });
    fetchCounter.increment('SSR/admin/folders/published', eventId);
    const foldersRes = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/admin/folders/published?${qp.toString()}`,
      { cache: 'no-store', credentials: 'include' }
    );
    if (foldersRes.ok) {
      const fjson = await foldersRes.json();
      folders = (fjson.folders || []).map((f: any) => ({
        id: String(f.id),
        name: String(f.name || 'Untitled Folder'),
        event_id: f.event_id as string | null,
        photo_count: Number(f.photo_count || f.photos_count || 0),
        is_published: Boolean(f.is_published),
        share_token: f.share_token as string | null,
        unified_share_token: (f.unified_share_token as string | null) ?? null,
        store_url: (f.store_url as string | null) ?? null,
        published_at: f.published_at as string | null,
        family_url: f.family_url as string | null,
        qr_url: f.qr_url as string | null,
        event_name: f.event_name as string | null,
        event_date: f.event_date as string | null,
      }));
      if (!event && folders[0]?.event_id) {
        event = {
          id: folders[0].event_id,
          name: folders[0].event_name || '',
          date: folders[0].event_date || undefined,
        };
      }
    } else {
      const txt = await foldersRes.text().catch(() => '');
      console.error('[SSR] /admin/folders/published error:', foldersRes.status, txt);
    }
  } catch (e) {
    console.warn('[SSR] Failed to fetch folders for /admin/publish:', e);
  }

  const initialData = { folders, event };

  if (centralitaEnabled) {
    return (
      <CentralitaPublishClient
        initialSelectedEventId={eventId}
        initialData={initialData}
      />
    );
  }

  // Use modern design with initial data
  return <ModernPublishClientWrapper initialSelectedEventId={eventId} initialData={initialData} />;
}

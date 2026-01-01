// Server wrapper: fetch initial data for the event-scoped publish page
import CleanPublishPage from '@/components/admin/publish/CleanPublishPage';

export default async function EventScopedPublishPage({ params }: any) {
  const eventId = params.id;

  // Fetch event details
  const eventRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/admin/events/${eventId}`, {
    cache: 'no-store',
    credentials: 'include',
  }).catch(() => null);

  let event: { id: string; name: string; date?: string } | null = null;
  if (eventRes && eventRes.ok) {
    const ejson = await eventRes.json();
    const ev = ejson.event || ejson;
    if (ev?.id) {
      event = { id: ev.id, name: ev.name, date: ev.date || undefined };
    }
  }

  // Fetch folders list for this event (first page, sufficient for initial render)
  const qp = new URLSearchParams({
    include_unpublished: 'true',
    limit: '100',
    order_by: 'published_desc',
    event_id: eventId,
  });
  const foldersRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/admin/folders/published?${qp.toString()}`, {
    cache: 'no-store',
    credentials: 'include',
  }).catch(() => null);

  let folders: any[] = [];
  if (foldersRes && foldersRes.ok) {
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
  }

  const initialData = { folders, event };

  return (
    <CleanPublishPage
      initialSelectedEventId={eventId}
      initialData={initialData}
    />
  );
}

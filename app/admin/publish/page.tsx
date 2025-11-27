// Server wrapper for /admin/publish with SSR hydration
import CleanPublishPage from '@/components/admin/publish/CleanPublishPage';
import { fetchCounter } from '@/lib/services/fetch-counter';

// Feature flag for clean design - matches other admin pages
const USE_CLEAN_DESIGN = true;

// Legacy imports (kept for potential rollback)
import PublishClient from './PublishClient';

type FolderData = {
  id: string;
  name: string;
  event_id: string | null;
  photo_count: number;
  is_published: boolean | null;
  share_token: string | null;
  unified_share_token: string | null;
  store_url: string | null;
  published_at: string | null;
  family_url: string | null;
  qr_url: string | null;
  event_name: string | null;
  event_date: string | null;
};

type EventData = {
  id: string;
  name: string;
  date?: string;
};

export default async function PublishPage({
  searchParams,
}: {
  searchParams?: Promise<{ event_id?: string; tab?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const eventId = sp?.event_id as string | undefined;

  // Fetch event details (best-effort) if eventId is provided
  let event: EventData | null = null;
  let folders: FolderData[] = [];

  if (eventId) {
    try {
      fetchCounter.increment('SSR/admin/events', eventId);
      const eventRes = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/admin/events/${eventId}`,
        { cache: 'no-store', credentials: 'include' }
      );
      if (eventRes.ok) {
        const ejson = await eventRes.json();
        const ev = (ejson as { event?: { id: string; name: string; date?: string } }).event || ejson;
        if (ev?.id) event = { id: ev.id, name: ev.name, date: ev.date || undefined };
      }
    } catch (e) {
      console.warn('[SSR] Failed to fetch event details for /admin/publish:', e);
    }

    // Fetch first page of folders for this event for initial hydration
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
        folders = ((fjson as { folders?: unknown[] }).folders || []).map((f: unknown) => {
          const folder = f as Record<string, unknown>;
          return {
            id: String(folder.id),
            name: String(folder.name || 'Untitled Folder'),
            event_id: (folder.event_id as string | null) ?? null,
            photo_count: Number(folder.photo_count || folder.photos_count || 0),
            is_published: Boolean(folder.is_published),
            share_token: (folder.share_token as string | null) ?? null,
            unified_share_token: (folder.unified_share_token as string | null) ?? null,
            store_url: (folder.store_url as string | null) ?? null,
            published_at: (folder.published_at as string | null) ?? null,
            family_url: (folder.family_url as string | null) ?? null,
            qr_url: (folder.qr_url as string | null) ?? null,
            event_name: (folder.event_name as string | null) ?? null,
            event_date: (folder.event_date as string | null) ?? null,
          };
        });
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
  }

  const initialData = eventId ? { folders, event } : undefined;

  // Use clean design if feature flag is enabled
  if (USE_CLEAN_DESIGN) {
    return (
      <CleanPublishPage
        initialSelectedEventId={eventId}
        initialData={initialData}
      />
    );
  }

  // Legacy: Use the old PublishClient
  return (
    <PublishClient
      initialSelectedEventId={eventId}
      initialData={initialData}
    />
  );
}


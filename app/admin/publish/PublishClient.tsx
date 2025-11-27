'use client';

import React from 'react';
import CleanPublishPage from '@/components/admin/publish/CleanPublishPage';

// Types matching useFolderPublishData hook
interface FolderRow {
  id: string;
  name: string;
  event_id: string | null;
  photo_count: number;
  is_published: boolean | null;
  share_token: string | null;
  unified_share_token?: string | null;
  store_url?: string | null;
  published_at: string | null;
  family_url: string | null;
  qr_url: string | null;
  event_name: string | null;
  event_date: string | null;
}

interface EventInfo {
  id: string;
  name: string;
  date?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;
  has_previous: boolean;
}

type InitialData = {
  folders: FolderRow[];
  event: EventInfo | null;
  pagination?: PaginationInfo;
};

interface PublishClientProps {
  initialSelectedEventId?: string;
  initialData?: InitialData;
}

export default function PublishClient(props?: PublishClientProps) {
  return (
    <React.Suspense fallback={<PublishLoadingState />}>
      <CleanPublishPage
        initialSelectedEventId={props?.initialSelectedEventId}
        initialData={props?.initialData as {
          folders: FolderRow[];
          event: EventInfo | null;
          pagination?: PaginationInfo;
        } | undefined}
      />
    </React.Suspense>
  );
}

function PublishLoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--clean-border)] border-t-[var(--clean-accent)] rounded-full animate-spin" />
        <p className="text-sm text-[var(--clean-text-muted)]">Cargando publicaciones...</p>
      </div>
    </div>
  );
}

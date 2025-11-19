'use client';

import { useSearchParams } from 'next/navigation';
import { PublishCommandCenter } from './PublishCommandCenter';
import { EventPublishMatrix } from './EventPublishMatrix';
import { PublishMetricsDashboard } from './PublishMetricsDashboard';

interface CentralitaOverviewProps {
  stats: {
    total: number;
    published: number;
    unpublished: number;
    totalPhotos: number
  };
  getPublicUrl: () => string;
  hasEvent: boolean;
  folders?: Array<{
    id: string;
    name: string;
    event_id: string | null;
    photo_count: number;
    is_published: boolean | null;
    published_at: string | null;
    event_name: string | null;
  }>;
}

export default function CentralitaOverview({
  stats,
  getPublicUrl,
  hasEvent,
  folders = [],
}: CentralitaOverviewProps) {
  const sp = useSearchParams();
  const eventId = sp.get('event_id') || '';

  return (
    <div className="centralita-overview space-y-6">
      {/* Command Center - Quick Actions */}
      <PublishCommandCenter
        eventId={eventId}
        onQuickAction={(action) => {
          console.log('Quick action:', action);
        }}
      />

      {/* Metrics Dashboard */}
      <PublishMetricsDashboard stats={stats} />

      {/* Event Publish Matrix */}
      <EventPublishMatrix
        folders={folders}
        selectedEventId={eventId}
      />
    </div>
  );
}


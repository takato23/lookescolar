'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Calendar,
  Image as ImageIcon,
  Lock,
  Folder,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types from the API
type AdminEventStats = {
  totalPhotos: number;
  totalSubjects: number;
  totalRevenue: number;
  completionRate: number;
  totalOrders: number;
  conversionRate: number;
};

type AdminEvent = {
  id: string;
  name: string | null;
  school: string | null;
  location: string | null;
  date: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  price_per_photo: number | null;
  stats: AdminEventStats;
  cover_url?: string | null;
  cover_urls?: string[];
};

type EventsError =
  | {
      type: 'warning';
      message: string;
      details?: string;
    }
  | {
      type: 'error';
      message: string;
      details?: string;
      timestamp: string;
    };

// Internal display type
interface DisplayEvent {
  id: string;
  name: string;
  date: string;
  status: 'draft' | 'active' | 'published' | 'inactive';
  photoCount: number;
  coverPhotos: string[];
  hasPassword?: boolean;
}

// Filter options
type StatusFilter = 'all' | 'draft' | 'active' | 'published' | 'inactive';

interface CleanEventsPageProps {
  events?: AdminEvent[] | null;
  error?: EventsError | null;
}

const normalizeCoverUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http')) return trimmed;
  // Build Supabase public URL for photos bucket
  // url is like "previews/filename_preview.webp"
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/photos/${trimmed}`;
};

const normalizeCoverUrls = (urls?: string[] | null): string[] => {
  if (!urls || urls.length === 0) return [];
  return urls.map(url => normalizeCoverUrl(url)).filter((url): url is string => url !== null);
};

// Transform API events to display format
function transformEvents(apiEvents: AdminEvent[] | null | undefined): DisplayEvent[] {
  if (!apiEvents) return [];

  return apiEvents.map((event) => {
    // Map status
    let status: DisplayEvent['status'] = 'draft';
    if (event.status === 'active') status = 'active';
    else if (event.status === 'published') status = 'published';
    else if (event.status === 'inactive') status = 'inactive';

    // Format date
    let formattedDate = 'Sin fecha';
    if (event.date) {
      try {
        const dateObj = new Date(event.date);
        formattedDate = dateObj.toLocaleDateString('es-AR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      } catch {
        formattedDate = event.date;
      }
    }

    return {
      id: event.id,
      name: event.name || event.school || 'Sin nombre',
      date: formattedDate,
      status,
      photoCount: event.stats?.totalPhotos || 0,
      coverPhotos: normalizeCoverUrls(event.cover_urls),
      hasPassword: false,
    };
  });
}

export default function CleanEventsPage({ events, error }: CleanEventsPageProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Transform API events to display format
  const displayEvents = useMemo(() => transformEvents(events), [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (statusFilter === 'all') return displayEvents;
    return displayEvents.filter((event) => event.status === statusFilter);
  }, [displayEvents, statusFilter]);

  // Count events by status
  const statusCounts = useMemo(() => {
    const counts = { all: displayEvents.length, draft: 0, active: 0, published: 0, inactive: 0 };
    displayEvents.forEach((event) => {
      counts[event.status]++;
    });
    return counts;
  }, [displayEvents]);

  return (
    <div className="clean-events">
      {/* Error/Warning Banner */}
      {error && (
        <div className={cn(
          'clean-alert mb-6',
          error.type === 'error' ? 'clean-alert--error' : 'clean-alert--warning'
        )}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">{error.message}</p>
            {error.details && (
              <p className="text-sm opacity-80 mt-1">{error.details}</p>
            )}
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="clean-page-header">
        <h1 className="clean-page-title">Eventos</h1>
        <div className="clean-page-actions">
          <Link href="/admin/events/new" className="clean-btn clean-btn--primary">
            <Plus className="clean-btn-icon" />
            Nuevo Evento
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="clean-filters">
        <FilterChip
          label="Todos"
          count={statusCounts.all}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <FilterChip
          label="Activo"
          count={statusCounts.active}
          active={statusFilter === 'active'}
          onClick={() => setStatusFilter('active')}
        />
        <FilterChip
          label="Borrador"
          count={statusCounts.draft}
          active={statusFilter === 'draft'}
          onClick={() => setStatusFilter('draft')}
        />
        <FilterChip
          label="Publicado"
          count={statusCounts.published}
          active={statusFilter === 'published'}
          onClick={() => setStatusFilter('published')}
        />
        {statusCounts.inactive > 0 && (
          <FilterChip
            label="Inactivo"
            count={statusCounts.inactive}
            active={statusFilter === 'inactive'}
            onClick={() => setStatusFilter('inactive')}
          />
        )}
      </div>

      {/* Events Count */}
      <p className="text-sm text-[var(--clean-text-muted)] mb-5">
        {filteredEvents.length} {filteredEvents.length === 1 ? 'evento' : 'eventos'}
      </p>

      {/* Events Grid */}
      {filteredEvents.length > 0 ? (
        <div className="clean-events-grid">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <EmptyState hasEvents={displayEvents.length > 0} />
      )}
    </div>
  );
}

// Filter Chip Component
function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn('clean-filter-chip', active && 'clean-filter-chip--active')}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="clean-filter-count">{count}</span>
      )}
    </button>
  );
}

// Event Card Component - Pixieset style
function EventCard({ event }: { event: DisplayEvent }) {
  const statusConfig = {
    draft: { class: 'clean-status--draft', label: 'Borrador' },
    active: { class: 'clean-status--active', label: 'Activo' },
    published: { class: 'clean-status--published', label: 'Publicado' },
    inactive: { class: 'clean-status--inactive', label: 'Inactivo' },
  };

  const { class: statusClass, label: statusLabel } = statusConfig[event.status];

  // Build 4 slots: photos first, then placeholders
  const coverSlots = Array.from({ length: 4 }, (_, index) => {
    const photo = event.coverPhotos[index];
    return { hasPhoto: !!photo, url: photo || null, index };
  });

  return (
    <Link href={`/admin/events/${event.id}`} className="clean-event-card group">
      {/* Cover Grid - 4 photos like Pixieset */}
      <div className="clean-event-cover relative">
        {coverSlots.map((slot) => (
          slot.hasPhoto ? (
            <div key={slot.index} className="relative">
              <Image
                src={slot.url!}
                alt={`${event.name} - foto ${slot.index + 1}`}
                fill
                className="clean-event-cover-img object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
          ) : (
            <CoverPlaceholder key={slot.index} index={slot.index} />
          )
        ))}

        {/* Event name overlay on cover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-center pointer-events-none">
          <h3 className="text-white font-semibold text-lg px-3 pb-3 text-center drop-shadow-lg line-clamp-2">
            {event.name}
          </h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="clean-event-body">
        <div className="clean-event-meta">
          <span className={cn('clean-status', statusClass)}>
            <span className="clean-status-dot" />
            {statusLabel}
          </span>
          <span className="clean-event-meta-item">
            <ImageIcon className="w-3.5 h-3.5" />
            {event.photoCount} {event.photoCount === 1 ? 'foto' : 'fotos'}
          </span>
          <span className="clean-event-meta-item">
            <Calendar className="w-3.5 h-3.5" />
            {event.date}
          </span>
        </div>
      </div>
    </Link>
  );
}

// Cover Placeholder with subtle gradient variation
function CoverPlaceholder({ index }: { index: number }) {
  const gradients = [
    'from-gray-100 to-gray-200',
    'from-gray-50 to-gray-150',
    'from-gray-100 to-gray-150',
    'from-gray-75 to-gray-175',
  ];

  return (
    <div className={cn(
      'clean-event-cover-placeholder',
      `bg-gradient-to-br ${gradients[index % gradients.length]}`
    )}>
      <ImageIcon className="w-6 h-6 text-gray-400" />
    </div>
  );
}

// Empty State
function EmptyState({ hasEvents }: { hasEvents: boolean }) {
  return (
    <div className="clean-empty">
      <Folder className="clean-empty-icon" />
      <h3 className="clean-empty-title">
        {hasEvents ? 'No hay eventos con este filtro' : 'No hay eventos'}
      </h3>
      <p className="clean-empty-description">
        {hasEvents
          ? 'Prueba cambiando los filtros para ver otros eventos.'
          : 'Crea tu primer evento para empezar a organizar tus fotos escolares.'}
      </p>
      {!hasEvents && (
        <Link href="/admin/events/new" className="clean-btn clean-btn--primary">
          <Plus className="clean-btn-icon" />
          Crear Evento
        </Link>
      )}
    </div>
  );
}

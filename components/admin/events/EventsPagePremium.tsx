'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Calendar,
  Image as ImageIcon,
  MapPin,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  Truck,
  Download,
  Globe,
  QrCode,
  MoreVertical,
  Eye,
  Settings,
  Share2,
  BarChart3,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Camera,
  Printer,
  Send,
  Filter,
  Search,
  LayoutGrid,
  List,
  Star,
  Zap,
  Activity,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
type DeliveryChannel = 'digital' | 'physical' | 'hybrid';
type EventStatus = 'draft' | 'active' | 'published' | 'completed' | 'archived';

interface EventStats {
  totalPhotos: number;
  totalSubjects: number;
  totalRevenue: number;
  totalOrders: number;
  digitalDownloads: number;
  physicalOrders: number;
  pendingOrders: number;
  conversionRate: number;
}

interface AdminEvent {
  id: string;
  name: string | null;
  location: string | null;
  date: string | null;
  status: string | null;
  created_at: string | null;
  price_per_photo: number | null;
  delivery_channel?: DeliveryChannel;
  stats: EventStats;
  cover_url?: string | null;
  featured?: boolean;
}

interface EventsPagePremiumProps {
  events?: AdminEvent[] | null;
  error?: {
    type: 'warning' | 'error';
    message: string;
    details?: string;
  } | null;
}

// Status configuration
const statusConfig: Record<EventStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: {
    label: 'Borrador',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    icon: Clock,
  },
  active: {
    label: 'Activo',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
    icon: Zap,
  },
  published: {
    label: 'Publicado',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30',
    icon: Globe,
  },
  completed: {
    label: 'Completado',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30',
    icon: CheckCircle2,
  },
  archived: {
    label: 'Archivado',
    color: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30',
    icon: Layers,
  },
};

// Delivery channel configuration
const channelConfig: Record<DeliveryChannel, { label: string; icon: React.ElementType; color: string }> = {
  digital: { label: 'Digital', icon: Download, color: 'text-cyan-600' },
  physical: { label: 'Físico', icon: Printer, color: 'text-orange-600' },
  hybrid: { label: 'Híbrido', icon: Layers, color: 'text-violet-600' },
};

// Format helpers
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'Sin fecha';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatNumber = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
};

// Global Stats Summary Component
function GlobalStatsSummary({ events }: { events: AdminEvent[] }) {
  const totals = useMemo(() => {
    return events.reduce(
      (acc, event) => ({
        photos: acc.photos + (event.stats?.totalPhotos || 0),
        revenue: acc.revenue + (event.stats?.totalRevenue || 0),
        orders: acc.orders + (event.stats?.totalOrders || 0),
        subjects: acc.subjects + (event.stats?.totalSubjects || 0),
        digitalDownloads: acc.digitalDownloads + (event.stats?.digitalDownloads || 0),
        physicalOrders: acc.physicalOrders + (event.stats?.physicalOrders || 0),
      }),
      { photos: 0, revenue: 0, orders: 0, subjects: 0, digitalDownloads: 0, physicalOrders: 0 }
    );
  }, [events]);

  const stats = [
    {
      label: 'Ingresos Totales',
      value: formatCurrency(totals.revenue),
      icon: DollarSign,
      trend: '+12%',
      trendUp: true,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Fotos Subidas',
      value: formatNumber(totals.photos),
      icon: Camera,
      trend: '+8%',
      trendUp: true,
      color: 'from-violet-500 to-purple-600',
    },
    {
      label: 'Pedidos Totales',
      value: formatNumber(totals.orders),
      icon: ShoppingCart,
      subStats: [
        { label: 'Digital', value: totals.digitalDownloads, icon: Download },
        { label: 'Físico', value: totals.physicalOrders, icon: Package },
      ],
      color: 'from-sky-500 to-blue-600',
    },
    {
      label: 'Clientes',
      value: formatNumber(totals.subjects),
      icon: Users,
      trend: '+5%',
      trendUp: true,
      color: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group relative overflow-hidden rounded-2xl border border-slate-300 bg-white p-5 shadow-md ring-1 ring-black/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/5"
        >
          {/* Gradient accent */}
          <div className={cn('absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r', stat.color)} />

          {/* Icon */}
          <div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg', stat.color)}>
            <stat.icon className="h-6 w-6 text-white" />
          </div>

          {/* Value */}
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</p>

          {/* Label and trend */}
          <div className="mt-1 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{stat.label}</p>
            {stat.trend && (
              <span className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
                stat.trendUp ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
              )}>
                {stat.trendUp ? <TrendingUp className="h-3.5 w-3.5 stroke-[2.5]" /> : <TrendingDown className="h-3.5 w-3.5 stroke-[2.5]" />}
                {stat.trend}
              </span>
            )}
          </div>

          {/* Sub stats for orders */}
          {stat.subStats && (
            <div className="mt-4 flex gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              {stat.subStats.map((sub) => (
                <div key={sub.label} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <sub.icon className="h-3.5 w-3.5 text-slate-400" />
                  <span>{sub.value} {sub.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Sortable Event Card wrapper
function SortableEventCard({
  event,
  featured,
  isReorderMode
}: {
  event: AdminEvent;
  featured?: boolean;
  isReorderMode?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id, disabled: !isReorderMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'z-50 opacity-60')}
    >
      <EventCardPremium
        event={event}
        featured={featured}
        isReorderMode={isReorderMode}
        dragHandleProps={isReorderMode ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}

// Event Card Component - Premium version
function EventCardPremium({
  event,
  featured,
  isReorderMode,
  dragHandleProps,
}: {
  event: AdminEvent;
  featured?: boolean;
  isReorderMode?: boolean;
  dragHandleProps?: Record<string, unknown>;
}) {
  const status = (event.status as EventStatus) || 'draft';
  const statusInfo = statusConfig[status] || statusConfig.draft;
  const StatusIcon = statusInfo.icon;
  const channel = event.delivery_channel || 'digital';
  const channelInfo = channelConfig[channel];
  const ChannelIcon = channelInfo.icon;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:shadow-xl dark:bg-slate-900',
        !isReorderMode && 'hover:-translate-y-1',
        featured
          ? 'border-violet-300 ring-2 ring-violet-500/20 dark:border-violet-500/50'
          : 'border-slate-300 shadow-md ring-1 ring-black/5 dark:border-slate-700 dark:ring-white/5', // High Def borders and shadows
        isReorderMode && 'ring-2 ring-dashed ring-violet-300/50'
      )}
    >
      {/* Drag handle for reorder mode */}
      {isReorderMode && dragHandleProps && (
        <button
          {...dragHandleProps}
          className="absolute left-3 top-3 z-20 flex h-8 w-8 cursor-grab items-center justify-center rounded-lg bg-white/90 shadow-lg backdrop-blur transition hover:bg-violet-100 active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5 text-violet-600" />
        </button>
      )}

      {/* Featured badge */}
      {featured && !isReorderMode && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
          <Star className="h-3 w-3" />
          Destacado
        </div>
      )}

      {/* Cover image area */}
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <Image
          src={event.cover_url || '/placeholders/school-1.png'}
          alt={event.name || 'Evento'}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Quick actions on hover */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 transition-all duration-300 group-hover:opacity-100">
          <div className="flex gap-2">
            <Link
              href={`/admin/events/${event.id}`}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-white/95 px-3 text-xs font-bold text-slate-700 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-slate-900"
            >
              <Eye className="h-3.5 w-3.5" />
              Ver
            </Link>
            <Link
              href={`/admin/events/${event.id}/settings`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-slate-700 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-slate-900"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-slate-700 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-slate-900">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold text-slate-900 dark:text-white leading-tight">
              {event.name || 'Evento sin nombre'}
            </h3>
            <div className="mt-2 flex flex-col gap-1.5 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {formatDate(event.date)}
              </span>
              {event.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="max-w-[150px] truncate">{event.location}</span>
                </span>
              )}
            </div>
          </div>
          <Link
            href={`/admin/events/${event.id}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition hover:bg-white hover:border-slate-300 hover:text-slate-600 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Status and channel badges */}
        <div className="mb-5 flex flex-wrap gap-2">
          <span className={cn('flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide', statusInfo.bgColor, statusInfo.color)}>
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </span>
          <span className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <ChannelIcon className="h-3 w-3" />
            {channelInfo.label}
          </span>
        </div>

        {/* Stats grid - High Definition */}
        <div className="grid grid-cols-4 divide-x divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50 dark:divide-slate-700">
          <div className="p-2 text-center transition-colors hover:bg-white dark:hover:bg-slate-800 rounded-l-xl">
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {formatNumber(event.stats?.totalPhotos || 0)}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fotos</p>
          </div>
          <div className="p-2 text-center transition-colors hover:bg-white dark:hover:bg-slate-800">
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {formatNumber(event.stats?.totalSubjects || 0)}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fam</p>
          </div>
          <div className="p-2 text-center transition-colors hover:bg-white dark:hover:bg-slate-800">
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {formatNumber(event.stats?.totalOrders || 0)}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Peds</p>
          </div>
          <div className="p-2 text-center transition-colors hover:bg-white dark:hover:bg-slate-800 rounded-r-xl">
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(event.stats?.totalRevenue || 0)}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ingr</p>
          </div>
        </div>

        {/* Delivery breakdown - only if hybrid or has both */}
        {(event.stats?.digitalDownloads || 0) > 0 || (event.stats?.physicalOrders || 0) > 0 ? (
          <div className="mt-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                <Download className="h-3.5 w-3.5" />
                <span>{event.stats?.digitalDownloads || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 dark:text-orange-400">
                <Package className="h-3.5 w-3.5" />
                <span>{event.stats?.physicalOrders || 0}</span>
              </div>
            </div>
            {(event.stats?.pendingOrders || 0) > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shadow-sm border border-amber-200/50">
                <Clock className="h-3 w-3" />
                {event.stats?.pendingOrders}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Quick Actions Bar
function QuickActionsBar() {
  const actions = [
    { label: 'Nuevo Evento', icon: Plus, href: '/admin/events/new', primary: true },
    { label: 'Subir Fotos', icon: Camera, href: '/admin/photos' },
    { label: 'Generar QRs', icon: QrCode, href: '/admin/qr' },
    { label: 'Ver Pedidos', icon: ShoppingCart, href: '/admin/orders' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
            action.primary
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02]'
              : 'bg-white text-slate-700 border border-slate-200 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-violet-500 dark:hover:text-violet-400'
          )}
        >
          <action.icon className="h-4 w-4" />
          {action.label}
        </Link>
      ))}
    </div>
  );
}

// Filters and view controls
function FiltersBar({
  statusFilter,
  setStatusFilter,
  channelFilter,
  setChannelFilter,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
}: {
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  channelFilter: string;
  setChannelFilter: (v: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (v: 'grid' | 'list') => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar eventos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {['all', 'active', 'draft', 'completed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-bold transition',
              statusFilter === s
                ? 'bg-violet-600 text-white shadow-md hover:bg-violet-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {s === 'all' ? 'Todos' : statusConfig[s as EventStatus]?.label || s}
          </button>
        ))}
      </div>

      {/* Channel filter */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {['all', 'digital', 'physical', 'hybrid'].map((c) => (
          <button
            key={c}
            onClick={() => setChannelFilter(c)}
            className={cn(
              'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition',
              channelFilter === c
                ? 'bg-violet-600 text-white shadow-md hover:bg-violet-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {c !== 'all' && React.createElement(channelConfig[c as DeliveryChannel].icon, { className: 'h-3.5 w-3.5' })}
            {c === 'all' ? 'Todos' : channelConfig[c as DeliveryChannel].label}
          </button>
        ))}
      </div>

      {/* View mode */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <button
          onClick={() => setViewMode('grid')}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg transition',
            viewMode === 'grid' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          )}
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg transition',
            viewMode === 'list' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          )}
        >
          <List className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Empty State
// Empty State
function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-16 text-center dark:border-slate-700 dark:bg-slate-800/50">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 shadow-sm dark:bg-slate-800">
        <Camera className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
        {hasFilter ? 'No hay eventos con este filtro' : 'No hay eventos todavía'}
      </h3>
      <p className="mb-6 max-w-sm text-sm font-medium text-slate-500">
        {hasFilter
          ? 'Intenta ajustar los filtros para encontrar lo que buscas.'
          : 'Crea tu primer evento para comenzar a organizar y vender tus fotografías profesionales.'}
      </p>
      {!hasFilter && (
        <Link
          href="/admin/events/new"
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-700 hover:shadow-violet-500/40 hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4 stroke-[3px]" />
          Crear Primer Evento
        </Link>
      )}
    </div>
  );
}

// Main component
export default function EventsPagePremium({ events, error }: EventsPagePremiumProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [orderedEventIds, setOrderedEventIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    setOrderedEventIds((prev) => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);

      if (oldIndex === -1 || newIndex === -1) return prev;

      const newOrder = [...prev];
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);
      return newOrder;
    });

    toast.success('Orden actualizado');
  }, []);

  // Initialize ordered event IDs when events change
  React.useEffect(() => {
    if (events && events.length > 0 && orderedEventIds.length === 0) {
      setOrderedEventIds(events.map((e) => e.id));
    }
  }, [events, orderedEventIds.length]);

  // Transform and filter events
  const displayEvents = useMemo(() => {
    if (!events) return [];

    const mapped = events
      .map((event) => ({
        ...event,
        delivery_channel: (event.delivery_channel || 'digital') as DeliveryChannel,
        stats: {
          totalPhotos: event.stats?.totalPhotos || 0,
          totalSubjects: event.stats?.totalSubjects || 0,
          totalRevenue: event.stats?.totalRevenue || 0,
          totalOrders: event.stats?.totalOrders || 0,
          digitalDownloads: event.stats?.digitalDownloads || 0,
          physicalOrders: event.stats?.physicalOrders || 0,
          pendingOrders: event.stats?.pendingOrders || 0,
          conversionRate: event.stats?.conversionRate || 0,
        },
      }))
      .filter((event) => {
        // Status filter
        if (statusFilter !== 'all' && event.status !== statusFilter) return false;
        // Channel filter
        if (channelFilter !== 'all' && event.delivery_channel !== channelFilter) return false;
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const name = (event.name || '').toLowerCase();
          const location = (event.location || '').toLowerCase();
          if (!name.includes(query) && !location.includes(query)) return false;
        }
        return true;
      });

    // Apply custom order if in reorder mode
    if (orderedEventIds.length > 0) {
      mapped.sort((a, b) => {
        const aIndex = orderedEventIds.indexOf(a.id);
        const bIndex = orderedEventIds.indexOf(b.id);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }

    return mapped;
  }, [events, statusFilter, channelFilter, searchQuery, orderedEventIds]);

  // Separate featured events
  const featuredEvents = displayEvents.filter((e) => e.featured);
  const regularEvents = displayEvents.filter((e) => !e.featured);

  const hasFilter = statusFilter !== 'all' || channelFilter !== 'all' || searchQuery !== '';

  return (
    <div className="space-y-8">
      {/* Error/Warning Banner */}
      {error && (
        <div
          className={cn(
            'flex items-start gap-3 rounded-xl border p-4',
            error.type === 'error'
              ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'
              : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
          )}
        >
          <AlertCircle
            className={cn('h-5 w-5 flex-shrink-0', error.type === 'error' ? 'text-rose-600' : 'text-amber-600')}
          />
          <div>
            <p className={cn('font-medium', error.type === 'error' ? 'text-rose-900' : 'text-amber-900')}>
              {error.message}
            </p>
            {error.details && (
              <p className={cn('mt-1 text-sm', error.type === 'error' ? 'text-rose-700' : 'text-amber-700')}>
                {error.details}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Eventos</h1>
              <p className="text-sm text-slate-500">
                Gestiona tus sesiones fotográficas y distribución
              </p>
            </div>
          </div>
        </div>
        <QuickActionsBar />
      </div>

      {/* Global Stats */}
      {events && events.length > 0 && <GlobalStatsSummary events={events} />}

      {/* Filters */}
      <FiltersBar
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        channelFilter={channelFilter}
        setChannelFilter={setChannelFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Events count and reorder toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {displayEvents.length} {displayEvents.length === 1 ? 'evento' : 'eventos'}
          {hasFilter && ` (filtrado de ${events?.length || 0} total)`}
        </p>
        {displayEvents.length > 1 && viewMode === 'grid' && (
          <button
            onClick={() => setIsReorderMode(!isReorderMode)}
            className={cn(
              'flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-all',
              isReorderMode
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800'
            )}
          >
            <GripVertical className="h-4 w-4" />
            {isReorderMode ? 'Listo' : 'Reordenar'}
          </button>
        )}
      </div>

      {/* Reorder mode banner */}
      {isReorderMode && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
          <GripVertical className="h-4 w-4" />
          <span>
            Arrastra las tarjetas para cambiar el orden de los eventos
          </span>
        </div>
      )}

      {/* Events Grid/List */}
      {displayEvents.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayEvents.map((e) => e.id)}
            strategy={rectSortingStrategy}
          >
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'flex flex-col gap-4'
              )}
            >
              {/* Featured events first */}
              {featuredEvents.map((event) => (
                <SortableEventCard
                  key={event.id}
                  event={event}
                  featured
                  isReorderMode={isReorderMode}
                />
              ))}
              {/* Regular events */}
              {regularEvents.map((event) => (
                <SortableEventCard
                  key={event.id}
                  event={event}
                  isReorderMode={isReorderMode}
                />
              ))}
            </div>
          </SortableContext>

          {/* Drag overlay */}
          <DragOverlay>
            {activeId && displayEvents.find((e) => e.id === activeId) ? (
              <div className="rounded-2xl border-2 border-violet-400 bg-white/95 p-4 shadow-2xl backdrop-blur dark:bg-slate-900/95">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-violet-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {displayEvents.find((e) => e.id === activeId)?.name || 'Evento'}
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <EmptyState hasFilter={hasFilter} />
      )}
    </div>
  );
}

'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  DollarSign,
  MoreVertical,
  Camera,
  Users,
  ShoppingCart,
  Download,
  Edit3,
  Trash2,
  FileText,
  QrCode,
  Eye,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  User,
  Image,
  Play,
  Pause,
  BarChart3,
  Activity,
  Zap,
  Star,
  Clock,
  Target,
  Layers,
  PieChart,
  Hash,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Draggable, DragHandle } from '@/components/ui/DragDrop';

interface Event {
  id: string;
  school: string;
  date: string;
  active: boolean | null;
  photo_price?: number;
  created_at: string | null;
  updated_at: string | null;
  // Enhanced computed stats
  stats?: {
    totalPhotos: number;
    totalSubjects: number;
    totalOrders: number;
    revenue: number;
    untaggedPhotos: number;
    pendingOrders: number;
    approvedPhotos?: number;
    deliveredOrders?: number;
    completionRate?: number;
    engagementRate?: number;
    avgOrderValue?: number;
    recentActivity?: {
      lastPhotoUpload?: string;
      lastOrder?: string;
      photosThisWeek?: number;
      ordersThisWeek?: number;
    };
    photoPreview?: Array<{
      id: string;
      url: string;
      thumbnail: string;
    }>;
  };
  // Enhanced metadata
  metadata?: {
    colorScheme?: string;
    priority?: 'high' | 'medium' | 'low';
    tags?: string[];
    category?: string;
    estimatedRevenue?: number;
    targetPhotos?: number;
    isArchived?: boolean;
  };
}

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
  onView?: (event: Event) => void;
  onSelect?: (event: Event, selected: boolean) => void;
  className?: string;
  compact?: boolean;
  showProgress?: boolean;
  showPreview?: boolean;
  showAnalytics?: boolean;
  isSelected?: boolean;
  animationDelay?: number;
  isDraggable?: boolean;
  dragIndex?: number;
}

const statusConfig = {
  draft: {
    label: 'Borrador',
    variant: 'secondary' as const,
    icon: AlertCircle,
    color: 'gray',
  },
  active: {
    label: 'Activo',
    variant: 'secondary' as const,
    icon: CheckCircle2,
    color: 'green',
  },
  completed: {
    label: 'Completado',
    variant: 'outline' as const,
    icon: CheckCircle2,
    color: 'blue',
  },
};

export function EventCard({
  event,
  onEdit,
  onDelete,
  onView,
  onSelect,
  className,
  compact = false,
  showProgress = true,
  showPreview = true,
  showAnalytics = false,
  isSelected = false,
  animationDelay = 0,
  isDraggable = false,
  dragIndex = 0,
}: EventCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showMicroChart, setShowMicroChart] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const status = event.active ? statusConfig.active : statusConfig.draft;
  const eventDate = new Date(event.date);
  const isUpcoming = eventDate > new Date();
  const isPast = eventDate < new Date();

  // Enhanced calculations
  const completionRate = event.stats?.completionRate || 0;
  const engagementRate = event.stats?.engagementRate || 0;
  const averageOrderValue = event.stats?.avgOrderValue || 0;
  const revenueTarget = event.metadata?.estimatedRevenue || 0;
  const revenueProgress =
    revenueTarget > 0
      ? Math.min(((event.stats?.revenue || 0) / revenueTarget) * 100, 100)
      : 0;

  // Priority badge
  const priority = event.metadata?.priority || 'medium';
  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };

  // Animation and interaction effects
  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.animationDelay = `${animationDelay}ms`;
    }
  }, [animationDelay]);

  useEffect(() => {
    const timer = setTimeout(
      () => setShowMicroChart(true),
      300 + animationDelay
    );
    return () => clearTimeout(timer);
  }, [animationDelay]);

  const handleAction = async (action: () => void) => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced color scheme for neural glass effect
  const getColorScheme = () => {
    // Priority-based coloring
    if (priority === 'high') {
      return {
        primary: 'from-rose-500 to-pink-600',
        secondary: 'from-rose-400 to-pink-500',
        accent: 'text-rose-600',
        badge: 'bg-rose-100 text-rose-800 border-rose-200',
        statIcon: 'text-rose-500',
        gradient: 'bg-gradient-to-br from-rose-50/50 to-pink-50/50',
        glow: 'shadow-rose-200/50',
      };
    }

    if (event.active && completionRate > 80) {
      return {
        primary: 'from-emerald-500 to-teal-600',
        secondary: 'from-emerald-400 to-teal-500',
        accent: 'text-emerald-600',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        statIcon: 'text-emerald-500',
        gradient: 'bg-gradient-to-br from-emerald-50/50 to-teal-50/50',
        glow: 'shadow-emerald-200/50',
      };
    }

    if (event.active) {
      return {
        primary: 'from-blue-500 to-indigo-600',
        secondary: 'from-blue-400 to-indigo-500',
        accent: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-800 border-blue-200',
        statIcon: 'text-blue-500',
        gradient: 'bg-gradient-to-br from-blue-50/50 to-indigo-50/50',
        glow: 'shadow-blue-200/50',
      };
    }

    return {
      primary: 'from-gray-400 to-gray-500',
      secondary: 'from-gray-300 to-gray-400',
      accent: 'text-muted-foreground',
      badge: 'bg-muted text-foreground border-border',
      statIcon: 'text-gray-500',
      gradient: 'bg-gradient-to-br from-gray-50/50 to-gray-100/50',
      glow: 'shadow-gray-200/50',
    };
  };

  const colorScheme = getColorScheme();

  // Calculate progress percentage for photo tagging
  const photoTaggingProgress = event.stats?.totalPhotos
    ? Math.round(
        ((event.stats.totalPhotos - (event.stats.untaggedPhotos || 0)) /
          event.stats.totalPhotos) *
          100
      )
    : 0;

  // Micro chart data for revenue trend
  const MicroChart = ({
    progress,
    color,
    className,
  }: {
    progress: number;
    color: string;
    className?: string;
  }) => {
    const segments = 12;
    const bars = Array.from({ length: segments }, (_, i) => {
      const height =
        Math.sin((i / segments) * Math.PI) * 100 + Math.random() * 20;
      const opacity = i < (segments * progress) / 100 ? 1 : 0.3;
      return { height, opacity };
    });

    return (
      <div className={cn('flex h-8 items-end gap-0.5', className)}>
        {bars.map((bar, i) => (
          <div
            key={i}
            className={`w-1 ${color} rounded-sm transition-all duration-300`}
            style={{
              height: `${Math.max(bar.height * 0.3, 10)}%`,
              opacity: bar.opacity,
              animationDelay: `${i * 50}ms`,
            }}
          />
        ))}
      </div>
    );
  };

  // Progress ring component
  const ProgressRing = ({
    progress,
    size = 24,
    strokeWidth = 2,
    color,
  }: {
    progress: number;
    size?: number;
    strokeWidth?: number;
    color: string;
  }) => {
    const radius = (size - strokeWidth * 2) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="-rotate-90 transform">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200 dark:text-foreground"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className={color}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-medium ${colorScheme.accent}`}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    );
  };

  const cardContent = (
    <div
      ref={cardRef}
      className={cn(
        'neural-glass-card group relative overflow-hidden transition-all duration-500',
        'hover:-translate-y-3 hover:scale-[1.02] hover:shadow-2xl',
        `hover:${colorScheme.glow}`,
        compact ? 'neural-event-card-compact' : 'min-h-[380px]',
        isSelected && 'scale-[1.01] ring-2 ring-blue-500 ring-offset-2',
        isLoading && 'pointer-events-none opacity-75',
        isDraggable && 'cursor-move',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Neural refractive background with enhanced gradients */}
      <div
        className={`absolute inset-0 ${colorScheme.gradient} opacity-40 transition-opacity duration-500`}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/5 opacity-60" />

      {/* Status accent bar with pulse animation */}
      <div
        className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${colorScheme.primary} transition-all duration-500`}
      >
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>

      {/* Drag Handle */}
      {isDraggable && (
        <div className="absolute left-3 top-3 z-20">
          <DragHandle className="neural-glass-card rounded-lg bg-white/80 hover:bg-white" />
        </div>
      )}

      {/* Selection checkbox */}
      {onSelect && (
        <div
          className={cn(
            'absolute top-3 z-10',
            isDraggable ? 'left-12' : 'left-3'
          )}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(event, !isSelected);
            }}
            className={cn(
              'neural-glass-card flex h-6 w-6 items-center justify-center rounded-lg transition-all duration-200',
              isSelected
                ? `${colorScheme.badge} scale-110`
                : 'border border-border bg-white/80 hover:border-border hover:bg-white'
            )}
          >
            {isSelected && <CheckCircle2 className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Priority indicator */}
      {priority !== 'medium' && (
        <div className="absolute right-3 top-3 z-10">
          <div
            className={cn(
              'neural-glass-card rounded-lg px-2 py-1 text-xs font-medium',
              priorityColors[priority]
            )}
          >
            <Star className="mr-1 inline h-3 w-3" />
            {priority.toUpperCase()}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        className={cn(
          'relative flex h-full flex-col',
          compact ? 'p-4' : 'p-5 sm:p-6'
        )}
      >
        {/* Header Section */}
        <div className="mb-4 flex items-start justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={status.variant}
                className={`neural-glass-card text-xs ${colorScheme.badge}`}
              >
                <status.icon className="mr-1 h-3 w-3" />
                {status.label}
              </Badge>
              {isUpcoming && (
                <Badge
                  variant="outline"
                  className="neural-glass-card border-primary-200 bg-primary-50/50 text-xs text-primary-600"
                >
                  <Clock className="mr-1 h-3 w-3" />
                  Próximo
                </Badge>
              )}
              {event.stats?.untaggedPhotos &&
                event.stats.untaggedPhotos > 0 && (
                  <Badge
                    variant="outline"
                    className="neural-glass-card border-primary-200 bg-primary-50/50 text-xs text-primary-600"
                  >
                    <Hash className="mr-1 h-3 w-3" />
                    {event.stats.untaggedPhotos} pendientes
                  </Badge>
                )}
              {completionRate > 90 && (
                <Badge
                  variant="outline"
                  className="neural-glass-card border-emerald-200 bg-emerald-50/50 text-xs text-emerald-600"
                >
                  <Target className="mr-1 h-3 w-3" />
                  Completo
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <h3
                className={cn(
                  'neural-title font-bold transition-colors group-hover:text-blue-700',
                  compact ? 'line-clamp-1 text-lg' : 'line-clamp-2 text-xl'
                )}
              >
                {event.school}
              </h3>
              {!compact && (
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-300">
                    <Calendar className="h-4 w-4" />
                    {eventDate.toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      weekday: 'short',
                    })}
                  </p>
                  {event.metadata?.tags && event.metadata.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {event.metadata.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="rounded-full border bg-muted/80 px-2 py-1 text-xs text-gray-500 dark:text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                      {event.metadata.tags.length > 3 && (
                        <span className="rounded-full bg-muted/80 px-2 py-1 text-xs text-gray-500">
                          +{event.metadata.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="neural-glass-card rounded-xl border-white/20 p-2 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
                disabled={isLoading}
              >
                <MoreVertical className="h-4 w-4 text-foreground dark:text-gray-300" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="neural-glass-card w-56 border-white/20"
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onView && onView(event);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/admin/events/${event.id}/unified`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Administrar fotos
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/admin/publish`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Compartir salón
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/20" />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit(event);
                }}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Editar evento
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete(event);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar evento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Quick Info Section */}
        {!compact && (
          <div className="mb-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center text-muted-foreground dark:text-gray-300">
              <Calendar className="mr-2 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium text-foreground dark:text-white">
                  {eventDate.toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {eventDate.toLocaleDateString('es-AR', { weekday: 'long' })}
                </div>
              </div>
            </div>

            {event.photo_price && (
              <div className="flex items-center text-muted-foreground dark:text-gray-300">
                <DollarSign className="mr-2 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium text-foreground dark:text-white">
                    ${event.photo_price.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    por foto
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compact Date Info */}
        {compact && (
          <div className="mb-3 flex items-center text-sm text-muted-foreground dark:text-gray-300">
            <Calendar className="mr-2 h-4 w-4" />
            <span className="font-medium">
              {eventDate.toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* Stats Grid */}
        {event.stats && (
          <div
            className={cn(
              'mb-3 grid gap-3 border-t border-white/20 pt-3',
              compact ? 'grid-cols-3' : 'grid-cols-3'
            )}
          >
            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <Image className={`h-4 w-4 ${colorScheme.statIcon}`} />
              </div>
              <div
                className={cn(
                  'font-bold text-foreground dark:text-white',
                  compact ? 'text-sm' : 'text-lg'
                )}
              >
                {event.stats.totalPhotos || 0}
              </div>
              <div className="text-xs text-muted-foreground dark:text-gray-300">
                Fotos
              </div>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <User className="h-4 w-4 text-purple-500" />
              </div>
              <div
                className={cn(
                  'font-bold text-foreground dark:text-white',
                  compact ? 'text-sm' : 'text-lg'
                )}
              >
                {event.stats.totalSubjects || 0}
              </div>
              <div className="text-xs text-muted-foreground dark:text-gray-300">
                Clientes
              </div>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-green-500" />
              </div>
              <div
                className={cn(
                  'font-bold text-foreground dark:text-white',
                  compact ? 'text-sm' : 'text-lg'
                )}
              >
                {event.stats.totalOrders || 0}
              </div>
              <div className="text-xs text-muted-foreground dark:text-gray-300">
                Pedidos
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Progress Indicators */}
        {showProgress && event.stats && (
          <div className="mb-4 space-y-3 border-t border-white/20 pt-4">
            {/* Photo Tagging Progress */}
            {event.stats.totalPhotos > 0 && (
              <div className="flex items-center gap-3">
                <ProgressRing
                  progress={photoTaggingProgress}
                  size={32}
                  color={colorScheme.accent}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground dark:text-gray-300">
                      Etiquetado
                    </span>
                    <span className="text-xs font-bold">
                      {photoTaggingProgress}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-muted dark:bg-gray-700">
                    <div
                      className={`h-1.5 rounded-full bg-gradient-to-r ${colorScheme.primary} transition-all duration-700 ease-out`}
                      style={{ width: `${photoTaggingProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Revenue Progress */}
            {revenueTarget > 0 && (
              <div className="flex items-center gap-3">
                <ProgressRing
                  progress={revenueProgress}
                  size={32}
                  color="text-green-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground dark:text-gray-300">
                      Meta de ingresos
                    </span>
                    <span className="text-xs font-bold">
                      {Math.round(revenueProgress)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-muted dark:bg-gray-700">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700 ease-out"
                      style={{ width: `${revenueProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Completion Rate */}
            {completionRate > 0 && (
              <div className="flex items-center gap-3">
                <ProgressRing
                  progress={completionRate}
                  size={32}
                  color="text-blue-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground dark:text-gray-300">
                      Completado
                    </span>
                    <span className="text-xs font-bold">
                      {Math.round(completionRate)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-muted dark:bg-gray-700">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-700 ease-out"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Photo Preview Grid */}
        {showPreview &&
          event.stats?.photoPreview &&
          event.stats.photoPreview.length > 0 && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground dark:text-gray-300">
                  Vista previa
                </span>
                <span className="text-xs text-gray-500">
                  {event.stats.totalPhotos} fotos
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 overflow-hidden rounded-lg">
                {event.stats.photoPreview.slice(0, 4).map((photo, index) => (
                  <div
                    key={photo.id}
                    className="group aspect-square cursor-pointer overflow-hidden rounded-lg bg-muted dark:bg-gray-800"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <img
                      src={photo.thumbnail}
                      alt={`Foto ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                    {index === 3 &&
                      event.stats &&
                      event.stats.totalPhotos > 4 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <span className="text-xs font-bold text-white">
                            +{(event.stats?.totalPhotos || 0) - 3}
                          </span>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Analytics Dashboard */}
        {showAnalytics && event.stats && showMicroChart && (
          <div className="mb-4 space-y-3 border-t border-white/20 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground dark:text-gray-300">
                Tendencia
              </span>
              <Activity className="h-4 w-4 text-gray-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Revenue Chart */}
              <div className="text-center">
                <MicroChart
                  progress={revenueProgress}
                  color="bg-green-500"
                  className="mb-2 justify-center"
                />
                <div className="text-xs text-muted-foreground dark:text-gray-400">
                  Ingresos
                </div>
                <div className="text-sm font-bold text-green-600">
                  ${(event.stats.revenue || 0).toLocaleString()}
                </div>
              </div>

              {/* Engagement Chart */}
              <div className="text-center">
                <MicroChart
                  progress={engagementRate}
                  color="bg-purple-500"
                  className="mb-2 justify-center"
                />
                <div className="text-xs text-muted-foreground dark:text-gray-400">
                  Engagement
                </div>
                <div className="text-sm font-bold text-purple-600">
                  {Math.round(engagementRate)}%
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {event.stats.recentActivity && (
              <div className="rounded-lg bg-gradient-to-r from-blue-50/50 to-purple-50/50 p-3 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="mb-2 flex items-center gap-2">
                  <Zap className="h-3 w-3 text-blue-500" />
                  <span className="text-xs font-medium text-foreground dark:text-gray-300">
                    Actividad reciente
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {event.stats.recentActivity.photosThisWeek && (
                    <div className="flex items-center gap-1">
                      <Camera className="h-3 w-3 text-blue-500" />
                      <span className="text-muted-foreground dark:text-gray-400">
                        {event.stats.recentActivity.photosThisWeek} esta semana
                      </span>
                    </div>
                  )}
                  {event.stats.recentActivity.ordersThisWeek && (
                    <div className="flex items-center gap-1">
                      <ShoppingCart className="h-3 w-3 text-green-500" />
                      <span className="text-muted-foreground dark:text-gray-400">
                        {event.stats.recentActivity.ordersThisWeek} pedidos
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons - Bottom */}
        <div className="mt-auto flex flex-col gap-3 border-t border-white/20 pt-3">
          {!compact && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Creado{' '}
              {event.created_at
                ? new Date(event.created_at).toLocaleDateString('es-AR')
                : 'N/A'}
            </div>
          )}

          <div className="flex gap-2">
            <Link href={`/admin/events/${event.id}`} className="flex-1">
              <Button
                className="neural-glass-card w-full border-white/20 hover:bg-white/20"
                size={compact ? 'sm' : 'md'}
              >
                <Eye className="mr-2 h-4 w-4" />
                Gestionar
              </Button>
            </Link>
            <Link href={`/gallery/${event.id}`}>
              <Button
                variant="outline"
                className="neural-glass-card border-white/20 hover:bg-white/20"
                size={compact ? 'sm' : 'md'}
              >
                <Eye className="h-3 w-3" />
                {compact ? '' : 'Vista'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  if (isDraggable) {
    return (
      <Draggable
        id={event.id}
        data={{ event, index: dragIndex }}
        className="transition-transform duration-200"
      >
        {cardContent}
      </Draggable>
    );
  }

  return cardContent;
}

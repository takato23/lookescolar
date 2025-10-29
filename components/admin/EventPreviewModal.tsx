'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Camera,
  ShoppingCart,
  TrendingUp,
  Eye,
  Edit3,
  Trash2,
  Share2,
  Download,
  QrCode,
  Zap,
  Target,
  Star,
  Clock,
  Image as ImageIcon,
  BarChart3,
  Activity,
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EventPreviewModalProps {
  event: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (event: any) => void;
  onDelete?: (event: any) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export function EventPreviewModal({
  event,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: EventPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'photos' | 'analytics' | 'orders'
  >('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  if (!isOpen || !event) return null;

  const eventDate = new Date(event.date);
  const isUpcoming = eventDate > new Date();
  const isPast = eventDate < new Date();

  // Enhanced calculations
  const completionRate = event.stats?.completionRate || 0;
  const photoTaggingProgress = event.stats?.totalPhotos
    ? Math.round(
        ((event.stats.totalPhotos - (event.stats.untaggedPhotos || 0)) /
          event.stats.totalPhotos) *
          100
      )
    : 0;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrevious) onPrevious?.();
          break;
        case 'ArrowRight':
          if (hasNext) onNext?.();
          break;
        case 'e':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            onEdit?.(event);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    hasNext,
    hasPrevious,
    onClose,
    onNext,
    onPrevious,
    onEdit,
    event,
  ]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Evento: ${event.school}`,
          text: `Ver fotos del evento en ${event.school} - ${eventDate.toLocaleDateString()}`,
          url: `${window.location.origin}/gallery/${event.id}`,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      const url = `${window.location.origin}/gallery/${event.id}`;
      navigator.clipboard.writeText(url);
      // Could show a toast notification here
    }
  };

  const handleExport = () => {
    const data = {
      event: event.school,
      date: eventDate.toLocaleDateString(),
      photos: event.stats?.totalPhotos || 0,
      subjects: event.stats?.totalSubjects || 0,
      orders: event.stats?.totalOrders || 0,
      revenue: event.stats?.revenue || 0,
    };

    const csv = Object.entries(data)
      .map(([key, value]) => `${key},${value}`)
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.school}-${eventDate.toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="neural-glass-card animate-modal-enter relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 p-6">
          <div className="flex items-center gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              {hasPrevious && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onPrevious}
                  className="neural-glass-card hover:bg-white/20"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              {hasNext && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onNext}
                  className="neural-glass-card hover:bg-white/20"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {event.school}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {eventDate.toLocaleDateString('es-AR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Status Badge */}
            <Badge
              variant={event.active ? 'default' : 'secondary'}
              className={cn(
                'neural-glass-card',
                event.active
                  ? 'border-green-200 bg-green-100 text-green-800'
                  : 'border-border bg-muted text-foreground'
              )}
            >
              {event.active ? (
                <>
                  <Zap className="mr-1 h-3 w-3" />
                  Activo
                </>
              ) : (
                <>
                  <Clock className="mr-1 h-3 w-3" />
                  Borrador
                </>
              )}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleShare}
              className="neural-glass-card hover:bg-white/20"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleExport}
              className="neural-glass-card hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
            </Button>
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(event)}
                className="neural-glass-card hover:bg-white/20"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="neural-glass-card hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border/50">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Resumen', icon: Eye },
              { id: 'photos', label: 'Fotos', icon: Camera },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-border hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="neural-glass-card p-4 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/30">
                    <ImageIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {event.stats?.totalPhotos || 0}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Fotos</div>
                </div>

                <div className="neural-glass-card p-4 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {event.stats?.totalSubjects || 0}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Familias</div>
                </div>

                <div className="neural-glass-card p-4 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                    <ShoppingCart className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {event.stats?.totalOrders || 0}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Pedidos</div>
                </div>

                <div className="neural-glass-card p-4 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100">
                    <TrendingUp className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    ${(event.stats?.revenue || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Ingresos</div>
                </div>
              </div>

              {/* Progress Indicators */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="neural-glass-card p-4">
                  <h4 className="mb-3 flex items-center gap-2 font-semibold">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Progreso del Evento
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>Completado</span>
                        <span>{Math.round(completionRate)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>Fotos etiquetadas</span>
                        <span>{photoTaggingProgress}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-green-500 transition-all duration-500"
                          style={{ width: `${photoTaggingProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="neural-glass-card p-4">
                  <h4 className="mb-3 flex items-center gap-2 font-semibold">
                    <Activity className="h-5 w-5 text-purple-600" />
                    Información del Evento
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Precio por foto:</span>
                      <span className="font-medium">
                        ${event.photo_price?.toLocaleString() || 'No definido'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Creado:</span>
                      <span className="font-medium">
                        {event.created_at
                          ? new Date(event.created_at).toLocaleDateString(
                              'es-AR'
                            )
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        Última actualización:
                      </span>
                      <span className="font-medium">
                        {event.updated_at
                          ? new Date(event.updated_at).toLocaleDateString(
                              'es-AR'
                            )
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="neural-glass-card p-4">
                <h4 className="mb-3 font-semibold">Acciones rápidas</h4>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Ver fotos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Generar QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir galería
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sincronizar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="space-y-4">
              <div className="text-center text-gray-500">
                <Camera className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <h3 className="mb-2 text-lg font-medium">Gestión de Fotos</h3>
                <p className="text-sm">La galería de fotos se cargará aquí</p>
                <Button className="mt-4" size="sm">
                  <Camera className="mr-2 h-4 w-4" />
                  Administrar Fotos
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <div className="text-center text-gray-500">
                <BarChart3 className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <h3 className="mb-2 text-lg font-medium">
                  Analytics Avanzados
                </h3>
                <p className="text-sm">
                  Los gráficos y métricas detalladas se mostrarán aquí
                </p>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="text-center text-gray-500">
                <ShoppingCart className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <h3 className="mb-2 text-lg font-medium">Gestión de Pedidos</h3>
                <p className="text-sm">
                  Los pedidos y transacciones se mostrarán aquí
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/50 bg-muted/50 px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <span>Navegación:</span>
              <kbd className="rounded bg-muted px-2 py-0.5 text-xs">←</kbd>
              <kbd className="rounded bg-muted px-2 py-0.5 text-xs">→</kbd>
            </div>
            <div className="flex items-center gap-1">
              <span>Editar:</span>
              <kbd className="rounded bg-muted px-2 py-0.5 text-xs">⌘E</kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/gallery/${event.id}`, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver galería pública
            </Button>
            <Button
              size="sm"
              onClick={() => window.open(`/admin/events/${event.id}`, '_blank')}
            >
              <Eye className="mr-2 h-4 w-4" />
              Administrar evento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

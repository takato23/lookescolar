'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, DollarSign, Users, Camera, ShoppingCart, TrendingUp, Eye, Edit3, Trash2, Share2, Download, QrCode, Zap, Target, Star, Clock, Image as ImageIcon, BarChart3, Activity, ArrowLeft, ArrowRight, Play, Pause, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

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
  hasPrevious = false
}: EventPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'photos' | 'analytics' | 'orders'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  if (!isOpen || !event) return null;

  const eventDate = new Date(event.date);
  const isUpcoming = eventDate > new Date();
  const isPast = eventDate < new Date();
  
  // Enhanced calculations
  const completionRate = event.stats?.completionRate || 0;
  const photoTaggingProgress = event.stats?.totalPhotos 
    ? Math.round(((event.stats.totalPhotos - (event.stats.untaggedPhotos || 0)) / event.stats.totalPhotos) * 100)
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
  }, [isOpen, hasNext, hasPrevious, onClose, onNext, onPrevious, onEdit, event]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Evento: ${event.school}`,
          text: `Ver fotos del evento en ${event.school} - ${eventDate.toLocaleDateString()}`,
          url: `${window.location.origin}/gallery/${event.id}`
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
      revenue: event.stats?.revenue || 0
    };
    
    const csv = Object.entries(data).map(([key, value]) => `${key},${value}`).join('\n');
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
      <div className="relative w-full max-w-4xl max-h-[90vh] neural-glass-card bg-white/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-modal-enter">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
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
              <h2 className="text-2xl font-bold text-gray-900">{event.school}</h2>
              <p className="text-sm text-gray-600">
                {eventDate.toLocaleDateString('es-AR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            {/* Status Badge */}
            <Badge 
              variant={event.active ? 'default' : 'secondary'}
              className={cn(
                "neural-glass-card",
                event.active 
                  ? "bg-green-100 text-green-800 border-green-200" 
                  : "bg-gray-100 text-gray-800 border-gray-200"
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
        <div className="border-b border-gray-200/50">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Resumen', icon: Eye },
              { id: 'photos', label: 'Fotos', icon: Camera },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'orders', label: 'Pedidos', icon: ShoppingCart }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="neural-glass-card p-4 text-center">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 rounded-xl bg-blue-100">
                    <ImageIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{event.stats?.totalPhotos || 0}</div>
                  <div className="text-sm text-gray-600">Fotos</div>
                </div>
                
                <div className="neural-glass-card p-4 text-center">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 rounded-xl bg-purple-100">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{event.stats?.totalSubjects || 0}</div>
                  <div className="text-sm text-gray-600">Familias</div>
                </div>
                
                <div className="neural-glass-card p-4 text-center">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 rounded-xl bg-green-100">
                    <ShoppingCart className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{event.stats?.totalOrders || 0}</div>
                  <div className="text-sm text-gray-600">Pedidos</div>
                </div>
                
                <div className="neural-glass-card p-4 text-center">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 rounded-xl bg-yellow-100">
                    <TrendingUp className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">${(event.stats?.revenue || 0).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Ingresos</div>
                </div>
              </div>
              
              {/* Progress Indicators */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="neural-glass-card p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Progreso del Evento
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Completado</span>
                        <span>{Math.round(completionRate)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Fotos etiquetadas</span>
                        <span>{photoTaggingProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${photoTaggingProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="neural-glass-card p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    Información del Evento
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Precio por foto:</span>
                      <span className="font-medium">${event.photo_price?.toLocaleString() || 'No definido'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Creado:</span>
                      <span className="font-medium">
                        {event.created_at ? new Date(event.created_at).toLocaleDateString('es-AR') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Última actualización:</span>
                      <span className="font-medium">
                        {event.updated_at ? new Date(event.updated_at).toLocaleDateString('es-AR') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="neural-glass-card p-4">
                <h4 className="font-semibold mb-3">Acciones rápidas</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Camera className="h-4 w-4 mr-2" />
                    Ver fotos
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <QrCode className="h-4 w-4 mr-2" />
                    Generar QR
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir galería
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizar
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'photos' && (
            <div className="space-y-4">
              <div className="text-center text-gray-500">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Gestión de Fotos</h3>
                <p className="text-sm">La galería de fotos se cargará aquí</p>
                <Button className="mt-4" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  Administrar Fotos
                </Button>
              </div>
            </div>
          )}
          
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <div className="text-center text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Analytics Avanzados</h3>
                <p className="text-sm">Los gráficos y métricas detalladas se mostrarán aquí</p>
              </div>
            </div>
          )}
          
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="text-center text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Gestión de Pedidos</h3>
                <p className="text-sm">Los pedidos y transacciones se mostrarán aquí</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200/50 bg-gray-50/50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span>Navegación:</span>
              <kbd className="px-2 py-0.5 bg-gray-200 rounded text-xs">←</kbd>
              <kbd className="px-2 py-0.5 bg-gray-200 rounded text-xs">→</kbd>
            </div>
            <div className="flex items-center gap-1">
              <span>Editar:</span>
              <kbd className="px-2 py-0.5 bg-gray-200 rounded text-xs">⌘E</kbd>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/gallery/${event.id}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver galería pública
            </Button>
            <Button
              size="sm"
              onClick={() => window.open(`/admin/events/${event.id}`, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Administrar evento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
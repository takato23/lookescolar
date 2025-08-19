'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import PhotoGalleryLiquid from '@/components/admin/PhotoGalleryLiquid';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  FolderIcon, 
  RefreshCwIcon, 
  AlertCircleIcon,
  CheckCircleIcon,
  Loader2Icon,
  ChevronDownIcon,
  ImageIcon,
  InfoIcon
} from 'lucide-react';
import { buildPhotosUrl } from '@/lib/utils/photos-url-builder';
import { cn } from '@/lib/utils';

interface Photo {
  id: string;
  original_filename: string;
  storage_path: string;
  preview_url?: string;
  file_size: number;
  created_at: string;
  approved: boolean;
  tagged: boolean;
  event_id?: string;
  event?: {
    id: string;
    name: string;
  };
  subject?: {
    id: string;
    name: string;
  };
  width?: number;
  height?: number;
}

interface Event {
  id: string;
  name: string;
  event_date?: string;
  school_name?: string;
  photo_count?: number;
  created_at: string;
}

// Performance optimization with React.memo
const ModernPhotosPage = React.memo(function ModernPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useSearchParams();
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedEventId = params.get('eventId');
  const selectedCourseId = params.get('courseId');
  const selectedCodeId = params.get('codeId');

  // Load photos with abort controller for better performance
  const loadPhotos = useCallback(async (isRefresh = false) => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      let url = '';
      if (selectedEventId) {
        url = buildPhotosUrl({
          eventId: selectedEventId,
          codeId: selectedCodeId ?? null,
          limit: 100
        });
      } else {
        const usp = new URLSearchParams();
        usp.set('limit', '100');
        if (selectedCodeId) {
          usp.set('code_id', selectedCodeId);
        }
        url = `/api/admin/photos?${usp.toString()}`;
      }
      
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (response.ok && data && typeof data === 'object' && 'photos' in data) {
        setPhotos(Array.isArray(data.photos) ? data.photos : []);
      } else {
        setPhotos([]);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error loading photos:', error);
        setError(error.message || 'Error al cargar las fotos');
        toast.error('Error al cargar las fotos');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      abortControllerRef.current = null;
    }
  }, [selectedEventId, selectedCodeId]);

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/events-simple');
      const data = await response.json();
      
      if (data.success && data.events) {
        // Count photos per event
         const eventsWithCount = data.events.map((event: Event) => ({
          ...event,
          photo_count: photos.filter(p => p.event_id === event.id).length
        }));
        setEvents(eventsWithCount);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Error al cargar los eventos');
    }
  }, [photos]);

  const handleSelectFromSidebar = useCallback((sel: { eventId?: string | null; courseId?: string | null; codeId?: string | 'null' | null }) => {
    const usp = new URLSearchParams(Array.from(params.entries()));
    if (sel.eventId !== undefined) {
      if (sel.eventId) usp.set('eventId', sel.eventId); else usp.delete('eventId');
    }
    if (sel.courseId !== undefined) {
      if (sel.courseId) usp.set('courseId', sel.courseId); else usp.delete('courseId');
    }
    if (sel.codeId !== undefined) {
      if (sel.codeId === null || sel.codeId === 'null') {
        usp.set('codeId', 'null');
      } else if (sel.codeId) {
        usp.set('codeId', sel.codeId);
      } else {
        usp.delete('codeId');
      }
    }
    router.replace(`?${usp.toString()}`);
  }, [params, router]);

  const PhotosSidebarFolders = useMemo(
    () => dynamic(() => import('../../../components/admin/PhotosSidebarFolders'), { ssr: false }) as React.ComponentType<{
      events: Event[];
      selected: { eventId?: string | null; courseId?: string | null; codeId?: string | 'null' | null };
      onSelect: (sel: { eventId?: string | null; courseId?: string | null; codeId?: string | 'null' | null }) => void;
      onCountsChanged?: () => void;
    }>,
    []
  );

  // QR status panel state with loading state
  const [qrStats, setQrStats] = useState<{ detected?: number; unmatched?: number; assigned?: number; unassigned?: number; anchors_unmatched?: number } | null>(null);
  const [qrStatsLoading, setQrStatsLoading] = useState(false);
  
  const refreshQRStats = useCallback(async () => {
    if (!selectedEventId) return;
    
    setQrStatsLoading(true);
    try {
      const [detectResp, dryResp] = await Promise.all([
        fetch('/api/admin/anchor-detect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: selectedEventId, onlyMissing: true }) }),
        fetch('/api/admin/group', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: selectedEventId, dryRun: true }) })
      ]);
      const detect = await detectResp.json();
      const group = await dryResp.json();
      setQrStats({
        detected: Array.isArray(detect?.detected) ? detect.detected.length : 0,
        unmatched: Array.isArray(detect?.unmatched) ? detect.unmatched.length : 0,
        assigned: Number(group?.assigned || 0),
        unassigned: Number(group?.unassigned || 0),
        anchors_unmatched: Array.isArray(group?.anchors_unmatched) ? group.anchors_unmatched.length : 0,
      });
    } catch (error) {
      console.error('Error refreshing QR stats:', error);
      toast.error('Error al actualizar estadísticas QR');
    } finally {
      setQrStatsLoading(false);
    }
  }, [selectedEventId]);

  const handleRegroupNow = useCallback(async () => {
    if (!selectedEventId) return;
    
    const loadingToast = toast.loading('Reagrupando fotos...');
    try {
      const response = await fetch('/api/admin/group', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ eventId: selectedEventId }) 
      });
      
      if (!response.ok) {
        throw new Error('Error al reagrupar');
      }
      
      await Promise.all([refreshQRStats(), loadPhotos(true)]);
      toast.success('Fotos reagrupadas exitosamente', { id: loadingToast });
    } catch (error) {
      console.error('Error regrouping:', error);
      toast.error('Error al reagrupar las fotos', { id: loadingToast });
    }
  }, [selectedEventId, refreshQRStats, loadPhotos]);

  // Handle photo upload - works with or without eventId
  const handlePhotoUpload = async (files: File[], eventId?: string) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (eventId) {
      formData.append('event_id', eventId);
    }

    // Use the simple-upload endpoint which has auto QR detection
    const response = await fetch('/api/admin/photos/simple-upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Error uploading photos');
    }

    // Show quick navigation after upload
    if (result?.success && result?.uploaded?.length > 0) {
      const ev = result.uploaded[0]?.event_id || eventId;
      if (ev) {
        // Ensure we are pointing to the event and to unassigned by default
        router.replace(`/admin/photos?eventId=${ev}&codeId=null`);
      } else {
        // No event: show general gallery focusing on unassigned (sin carpeta)
        const usp = new URLSearchParams();
        usp.set('codeId', 'null');
        router.replace(`/admin/photos?${usp.toString()}`);
      }
    }

    // Show QR detection stats if available
    if (result.qr_detection) {
      const { detected, auto_assigned } = result.qr_detection;
      if (detected > 0) {
        toast.success(`QR detectado: ${detected} fotos, ${auto_assigned} asignadas automáticamente`);
      }
    }

    await loadPhotos();
  };

  // Handle photo deletion (chunked to respect API batch limits)
  const handlePhotoDelete = async (photoIds: string[]) => {
    const MAX_BATCH = 50; // mirror server SECURITY_CONSTANTS.MAX_BATCH_SIZE
    const chunks: string[][] = [];
    for (let i = 0; i < photoIds.length; i += MAX_BATCH) {
      chunks.push(photoIds.slice(i, i + MAX_BATCH));
    }

    for (const chunk of chunks) {
      const response = await fetch('/api/admin/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: chunk }),
      });
      if (!response.ok) {
        const j = await response.json().catch(() => ({}));
        throw new Error(j?.error || 'Error deleting photos');
      }
    }
  };

  // Handle photo approval
  const handlePhotoApprove = async (photoIds: string[], approved: boolean) => {
    const response = await fetch('/api/admin/photos/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoIds, approved }),
    });

    if (!response.ok) {
      throw new Error('Error updating photo status');
    }
  };

  // Handle photo tagging
  const handlePhotoTag = async (photoId: string, subjectId: string) => {
    const response = await fetch('/api/admin/tagging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId, codeId: subjectId }),
    });

    if (!response.ok) {
      throw new Error('Error tagging photo');
    }
  };

  // Sin autogenerar eventos
  useEffect(() => { setIsInitializing(false); }, []);

  // Load photos after initialization with cleanup
  useEffect(() => {
    if (!isInitializing) {
      loadPhotos();
    }
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isInitializing, selectedEventId, selectedCodeId, loadPhotos]);

  // Refresh QR stats when event changes
  useEffect(() => {
    if (selectedEventId) {
      refreshQRStats();
    }
  }, [selectedEventId, refreshQRStats]);

  useEffect(() => {
    if (photos.length > 0 || !loading) {
      loadEvents();
    }
  }, [photos, loading, loadEvents]);

  // Enhanced loading state with better UX
  if (isInitializing || (loading && !photos.length)) {
    return (
      <div className="liquid-glass-app flex items-center justify-center min-h-screen">
        <div className="liquid-card p-8 text-center max-w-sm">
          <Loader2Icon className="h-12 w-12 animate-spin text-primary-600 mx-auto" />
          <p className="liquid-nav-text mt-4 font-medium">
            {isInitializing && !selectedEventId ? 'Preparando galería...' : 
             isInitializing ? 'Inicializando...' : 
             'Cargando fotos...'}
          </p>
          <p className="liquid-description text-sm mt-2">
            Esto puede tomar unos segundos
          </p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error && !photos.length) {
    return (
      <div className="liquid-glass-app flex items-center justify-center min-h-screen">
        <div className="liquid-card p-8 text-center max-w-md">
          <AlertCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="liquid-title text-xl font-bold mb-2">Error al cargar las fotos</h2>
          <p className="liquid-description mb-4">{error}</p>
          <Button 
            onClick={() => loadPhotos()}
            className="liquid-button"
          >
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // No longer require eventId - show general gallery

  return (
    <div className="liquid-glass-app min-h-screen">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="px-2 pt-1 space-y-3">
          {/* Compact Mobile header */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary-600" />
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Fotos ({photos.length})
              </h1>
            </div>
            {selectedEventId && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {events.find(e => e.id === selectedEventId)?.name || 'Evento'}
              </Badge>
            )}
          </div>
          
          {/* Mobile folders - enhanced accordion */}
          <div className="liquid-card">
            <details className="group">
              <summary className="p-3 cursor-pointer liquid-nav-text font-semibold text-sm flex items-center justify-between hover:bg-gray-50/50 rounded-t-lg transition-colors">
                <div className="flex items-center">
                  <FolderIcon className="w-4 h-4 mr-2" />
                  Carpetas y Eventos
                </div>
                <ChevronDownIcon className="w-4 h-4 transform transition-transform group-open:rotate-180" />
              </summary>
              <div className="p-3 pt-0 border-t border-white/10">
                <PhotosSidebarFolders
                  events={events}
                  selected={{ eventId: selectedEventId, courseId: selectedCourseId, codeId: selectedCodeId }}
                  onSelect={handleSelectFromSidebar}
                  onCountsChanged={() => loadPhotos(true)}
                />
              </div>
            </details>
          </div>

          {/* QR Status - enhanced mobile UI */}
          {selectedEventId && (qrStats?.detected || 0) > 0 && (
            <div className="liquid-card bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 border border-blue-200/50 dark:border-blue-700/50">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center">
                  <div className="liquid-number font-bold text-lg text-blue-700 dark:text-blue-400">
                    {qrStatsLoading ? (
                      <Loader2Icon className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      qrStats?.detected ?? 0
                    )}
                  </div>
                  <div className="liquid-description text-xs text-blue-600 dark:text-blue-300">QR detectados</div>
                </div>
                <div className="text-center">
                  <div className="liquid-number font-bold text-lg text-orange-700 dark:text-orange-400">
                    {qrStatsLoading ? (
                      <Loader2Icon className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      qrStats?.unassigned ?? 0
                    )}
                  </div>
                  <div className="liquid-description text-xs text-orange-600 dark:text-orange-300">Sin carpeta</div>
                </div>
              </div>
              <div className="flex gap-2">
                {(qrStats?.unassigned ?? 0) > 0 && (
                  <button 
                    className="liquid-button flex-1 h-8 text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    onClick={() => handleSelectFromSidebar({ eventId: selectedEventId, codeId: 'null' })}
                  >
                    Ver sin carpeta
                  </button>
                )}
                <button 
                  className="liquid-button h-8 text-xs px-3 py-1 rounded-lg"
                  onClick={refreshQRStats}
                  disabled={qrStatsLoading}
                >
                  <RefreshCwIcon className={cn(
                    "w-4 h-4",
                    qrStatsLoading && "animate-spin"
                  )} />
                </button>
              </div>
            </div>
          )}

          {/* Mobile Photo Gallery with refresh indicator */}
          <div className="min-h-[60vh] relative">
            {isRefreshing && (
              <div className="absolute top-2 right-2 z-10">
                <div className="liquid-card bg-white/90 dark:bg-gray-900/90 px-2 py-1 flex items-center gap-1">
                  <Loader2Icon className="w-3 h-3 animate-spin text-blue-600" />
                  <span className="text-xs font-medium">Actualizando...</span>
                </div>
              </div>
            )}
            <PhotoGalleryLiquid
              initialPhotos={photos}
              initialEvents={events}
              onCountsChanged={() => loadPhotos(true)}
              onPhotoUpload={handlePhotoUpload}
              onPhotoDelete={handlePhotoDelete}
              hideSidebar
              hideHeader
              compact
              externalSelectedEvent={selectedEventId}
              externalCodeId={selectedCodeId ?? null}
            />
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-6 pt-2">
          {/* Compact Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-2 mb-2">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-6 h-6 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Fotos</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedEventId ? events.find(e => e.id === selectedEventId)?.name + ' • ' : ''}
                  {photos.length} fotos en total
                </p>
              </div>
            </div>
            {isRefreshing && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2Icon className="w-4 h-4 animate-spin" />
                <span>Actualizando...</span>
              </div>
            )}
          </div>
          
          <div className="grid md:grid-cols-[320px_1fr] gap-8">
            <div className="space-y-4">
              {/* Sidebar enhanced */}
              <div className="liquid-card p-4">
                <h3 className="liquid-nav-text font-semibold mb-3 flex items-center">
                  <FolderIcon className="w-5 h-5 mr-2" />
                  Carpetas y Eventos
                </h3>
                <PhotosSidebarFolders
                  events={events}
                  selected={{ eventId: selectedEventId, courseId: selectedCourseId, codeId: selectedCodeId }}
                  onSelect={handleSelectFromSidebar}
                  onCountsChanged={() => loadPhotos(true)}
                />
              </div>
              
              {/* Quick stats card */}
              <div className="liquid-card p-4">
                <h3 className="liquid-nav-text font-semibold mb-3 flex items-center">
                  <InfoIcon className="w-5 h-5 mr-2" />
                  Estadísticas Rápidas
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="liquid-description">Total de fotos:</span>
                    <span className="liquid-number font-semibold">{photos.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="liquid-description">Aprobadas:</span>
                    <span className="liquid-number font-semibold text-green-600">
                      {photos.filter(p => p.approved).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="liquid-description">Etiquetadas:</span>
                    <span className="liquid-number font-semibold text-blue-600">
                      {photos.filter(p => p.tagged).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* QR Status Panel enhanced */}
              {selectedEventId && (
                <div className="liquid-card p-4 bg-gradient-to-r from-blue-50/30 to-indigo-50/30 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200/50 dark:border-blue-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="liquid-nav-text font-semibold">Estado del Evento</h3>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="liquid-label bg-blue-50 text-blue-700">
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                          QR detectados: {qrStats?.detected ?? '-'}
                        </Badge>
                        <Badge variant="outline" className="liquid-label bg-yellow-50 text-yellow-700">
                          <AlertCircleIcon className="w-3 h-3 mr-1" />
                          Para revisar: {qrStats?.unmatched ?? '-'}
                        </Badge>
                        <Badge variant="outline" className="liquid-label bg-green-50 text-green-700">
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                          Asignadas: {qrStats?.assigned ?? '-'}
                        </Badge>
                        <Badge variant="outline" className="liquid-label bg-red-50 text-red-700">
                          <InfoIcon className="w-3 h-3 mr-1" />
                          Sin carpeta: {qrStats?.unassigned ?? '-'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(qrStats?.unassigned ?? 0) > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="liquid-button text-blue-700 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/50"
                          onClick={() => handleSelectFromSidebar({ eventId: selectedEventId, codeId: 'null' })}
                        >
                          Ver sin carpeta
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="liquid-button"
                        onClick={refreshQRStats}
                        disabled={qrStatsLoading}
                        aria-label="Refrescar estado QR"
                      >
                        {qrStatsLoading ? (
                          <Loader2Icon className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCwIcon className="w-4 h-4" />
                        )}
                        <span className="ml-2 hidden sm:inline">Refrescar</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="liquid-button"
                        onClick={handleRegroupNow}
                        disabled={qrStatsLoading}
                        aria-label="Reagrupar ahora"
                      >
                        Reagrupar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative">
                {isRefreshing && (
                  <div className="absolute top-2 right-2 z-10">
                    <div className="liquid-card bg-white/90 dark:bg-gray-900/90 px-3 py-2 flex items-center gap-2">
                      <Loader2Icon className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm font-medium">Actualizando...</span>
                    </div>
                  </div>
                )}
                <PhotoGalleryLiquid
                  initialPhotos={photos}
                  initialEvents={events}
                  onPhotoUpload={handlePhotoUpload}
                  onPhotoDelete={handlePhotoDelete}
                  onPhotoApprove={handlePhotoApprove}
                  onPhotoTag={handlePhotoTag}
                  onRefresh={() => loadPhotos(true)}
                  hideSidebar
                  hideHeader
                  compact
                  externalSelectedEvent={selectedEventId}
                  externalCodeId={selectedCodeId ?? null}
                  onCountsChanged={() => loadPhotos(true)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ModernPhotosPage;
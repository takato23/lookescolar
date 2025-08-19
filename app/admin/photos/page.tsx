'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import PhotoGalleryLiquid from '@/components/admin/PhotoGalleryLiquid';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FolderIcon } from 'lucide-react';
import { buildPhotosUrl } from '@/lib/utils/photos-url-builder';
// import { cn } from '@/lib/utils';

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

export default function ModernPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const params = useSearchParams();
  const router = useRouter();

  const selectedEventId = params.get('eventId');
  const selectedCourseId = params.get('courseId');
  const selectedCodeId = params.get('codeId');

  // Mostrar galería general si no hay eventId

  // Load photos - soporta sin eventId (galería general)
  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
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
      
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data && typeof data === 'object' && 'photos' in data) {
        setPhotos(Array.isArray(data.photos) ? data.photos : []);
      } else {
        setPhotos([]);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.error('Error al cargar las fotos');
    } finally {
      setLoading(false);
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

  // QR status panel state
  const [qrStats, setQrStats] = useState<{ detected?: number; unmatched?: number; assigned?: number; unassigned?: number; anchors_unmatched?: number } | null>(null);
  const refreshQRStats = useCallback(async () => {
    if (!selectedEventId) return;
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
    } catch {}
  }, [selectedEventId]);

  const handleRegroupNow = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      await fetch('/api/admin/group', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: selectedEventId }) });
      await Promise.all([refreshQRStats(), loadPhotos()]);
      toast.success('Reagrupado');
    } catch {
      toast.error('Error al reagrupar');
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

  // Load photos after initialization
  useEffect(() => {
    if (!isInitializing) loadPhotos();
  }, [isInitializing, selectedEventId, selectedCodeId, loadPhotos]);

  useEffect(() => {
    if (photos.length > 0 || !loading) {
      loadEvents();
    }
  }, [photos, loading, loadEvents]);

  if (isInitializing || loading) {
    return (
      <div className="liquid-glass-app flex items-center justify-center min-h-screen">
        <div className="liquid-card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="liquid-nav-text mt-4">
            {isInitializing && !selectedEventId ? 'Creando evento rápido...' : 
             isInitializing ? 'Inicializando...' : 
             'Cargando fotos...'}
          </p>
        </div>
      </div>
    );
  }

  // No longer require eventId - show general gallery

  return (
    <div className="liquid-glass-app min-h-screen">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="p-2 space-y-3">
          {/* Mobile header - mejorado */}
          <div className="liquid-card p-3">
            <div className="flex items-center justify-between mb-2">
              <h1 className="liquid-title text-xl font-bold">
                Fotos ({photos.length})
              </h1>
              {selectedEventId && (
                <Badge variant="outline" className="liquid-label text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {events.find(e => e.id === selectedEventId)?.name || 'Evento'}
                </Badge>
              )}
            </div>
            
            {/* Controles móviles viven dentro de PhotoGalleryModern */}
          </div>
          
          {/* Mobile folders - organizado */}
          <div className="liquid-card">
            <details className="group">
              <summary className="p-3 cursor-pointer liquid-nav-text font-semibold text-sm flex items-center justify-between hover:bg-gray-50/50 rounded-t-lg transition-colors">
                <div className="flex items-center">
                  <FolderIcon className="w-4 h-4 mr-2" />
                  Carpetas y Eventos
                </div>
                <div className="transform transition-transform group-open:rotate-180">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </summary>
              <div className="p-3 pt-0 border-t border-white/10">
                <PhotosSidebarFolders
                  events={events}
                  selected={{ eventId: selectedEventId, courseId: selectedCourseId, codeId: selectedCodeId }}
                  onSelect={handleSelectFromSidebar}
                  onCountsChanged={loadPhotos}
                />
              </div>
            </details>
          </div>

          {/* QR Status - only if event selected and has data */}
          {selectedEventId && (qrStats?.detected || 0) > 0 && (
            <div className="liquid-card bg-blue-50/50 dark:bg-blue-900/20 p-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center">
                  <div className="liquid-number font-semibold text-blue-700">{qrStats?.detected ?? 0}</div>
                  <div className="liquid-description text-blue-600">QR detectados</div>
                </div>
                <div className="text-center">
                  <div className="liquid-number font-semibold text-orange-700">{qrStats?.unassigned ?? 0}</div>
                  <div className="liquid-description text-orange-600">Sin carpeta</div>
                </div>
              </div>
              {(qrStats?.unassigned ?? 0) > 0 && (
                <button 
                  className="liquid-button w-full mt-2 h-8 text-xs px-3 py-1 rounded-lg"
                  onClick={() => handleSelectFromSidebar({ eventId: selectedEventId, codeId: 'null' })}
                >
                  <span className="liquid-button-text">Ver sin carpeta</span>
                </button>
              )}
            </div>
          )}

          {/* Mobile Photo Gallery */}
          <div className="min-h-[60vh]">
            <PhotoGalleryModern
              initialPhotos={photos}
              initialEvents={events}
              onCountsChanged={loadPhotos}
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
        <div className="container mx-auto p-6">
          {/* Header mejorado para escritorio */}
          <div className="mb-6 liquid-card p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="liquid-title text-3xl font-bold">Gestión de Fotos</h1>
                <p className="liquid-subtitle mt-1">
                  {selectedEventId ? events.find(e => e.id === selectedEventId)?.name + ' • ' : ''}
                  {photos.length} fotos en total
                </p>
              </div>
              {/* Controles de filtros/selectores viven dentro de PhotoGalleryModern */}
            </div>
          </div>
          
          <div className="grid md:grid-cols-[320px_1fr] gap-8">
            <div className="space-y-4">
              {/* Sidebar mejorada */}
              <div className="liquid-card p-4">
                <h3 className="liquid-nav-text font-semibold mb-3 flex items-center">
                  <FolderIcon className="w-5 h-5 mr-2" />
                  Carpetas y Eventos
                </h3>
                <PhotosSidebarFolders
                  events={events}
                  selected={{ eventId: selectedEventId, courseId: selectedCourseId, codeId: selectedCodeId }}
                  onSelect={handleSelectFromSidebar}
                  onCountsChanged={loadPhotos}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              {/* QR Status Panel mejorado */}
              {selectedEventId && (
                <div className="liquid-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="liquid-nav-text font-semibold">Estado del Evento</h3>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="liquid-label bg-blue-50 text-blue-700">
                          QR detectados: {qrStats?.detected ?? '-'}
                        </Badge>
                        <Badge variant="outline" className="liquid-label bg-yellow-50 text-yellow-700">
                          Para revisar: {qrStats?.unmatched ?? '-'}
                        </Badge>
                        <Badge variant="outline" className="liquid-label bg-green-50 text-green-700">
                          Asignadas: {qrStats?.assigned ?? '-'}
                        </Badge>
                        <Badge variant="outline" className="liquid-label bg-red-50 text-red-700">
                          Sin carpeta: {qrStats?.unassigned ?? '-'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        className="liquid-button text-blue-700 border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg"
                        onClick={() => handleSelectFromSidebar({ eventId: selectedEventId, codeId: 'null' })}
                      >
                        <span className="liquid-button-text">Ver sin carpeta</span>
                      </button>
                      <button 
                        className="liquid-button px-3 py-1.5 rounded-lg" 
                        onClick={refreshQRStats} 
                        aria-label="Refrescar estado QR"
                      >
                        <span className="liquid-button-text">Refrescar</span>
                      </button>
                      <button 
                        className="liquid-button px-3 py-1.5 rounded-lg" 
                        onClick={handleRegroupNow} 
                        aria-label="Reagrupar ahora"
                      >
                        <span className="liquid-button-text">Reagrupar ahora</span>
                      </button>
                    </div>
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
                onRefresh={loadPhotos}
                hideSidebar
                externalSelectedEvent={selectedEventId}
                externalCodeId={selectedCodeId ?? null}
                onCountsChanged={loadPhotos}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
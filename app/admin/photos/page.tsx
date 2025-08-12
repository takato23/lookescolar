'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import PhotoGalleryModern from '@/components/admin/PhotoGalleryModern';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

  // Load photos - can work without eventId (shows all photos)
  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      
      let url: string;
      if (selectedEventId) {
        // Load photos for specific event
        url = buildPhotosUrl({
          eventId: selectedEventId,
          codeId: selectedCodeId || undefined,
          limit: 100
        });
      } else {
        // Load ALL photos (galería general)
        url = '/api/admin/photos?limit=100';
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

    // Show QR detection stats if available
    if (result.qr_detection) {
      const { detected, auto_assigned } = result.qr_detection;
      if (detected > 0) {
        toast.success(`QR detectado: ${detected} fotos, ${auto_assigned} asignadas automáticamente`);
      }
    }

    await loadPhotos();
  };

  // Handle photo deletion
  const handlePhotoDelete = async (photoIds: string[]) => {
    const response = await fetch('/api/admin/photos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoIds }),
    });

    if (!response.ok) {
      throw new Error('Error deleting photos');
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

  // Don't force event creation - let user work without events
  useEffect(() => {
    setIsInitializing(false);
  }, []);

  // Load photos after initialization (with or without eventId)
  useEffect(() => {
    if (!isInitializing) {
      loadPhotos();
    }
  }, [isInitializing, selectedEventId, selectedCodeId, loadPhotos]);

  useEffect(() => {
    if (photos.length > 0 || !loading) {
      loadEvents();
    }
  }, [photos, loading, loadEvents]);

  if (isInitializing || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
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
    <div className="container mx-auto p-6">
      <div className="grid md:grid-cols-[280px_1fr] gap-8">
        <div>
          <PhotosSidebarFolders
            events={events}
            selected={{ eventId: selectedEventId, courseId: selectedCourseId, codeId: selectedCodeId }}
            onSelect={handleSelectFromSidebar}
            onCountsChanged={loadPhotos}
          />
        </div>
        <div className="space-y-4">
          {/* QR Status Panel */}
          {selectedEventId && (
            <Card className="p-3 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">QR detectados: {qrStats?.detected ?? '-'}</Badge>
                <Badge variant="secondary">Para revisar: {qrStats?.unmatched ?? '-'}</Badge>
                <Badge variant="secondary">Asignadas: {qrStats?.assigned ?? '-'}</Badge>
                <Badge variant="secondary">Sin carpeta: {qrStats?.unassigned ?? '-'}</Badge>
                <Badge variant="secondary">Anclas sin código: {qrStats?.anchors_unmatched ?? '-'}</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleSelectFromSidebar({ codeId: null })}>Ver sin carpeta</Button>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={refreshQRStats} aria-label="Refrescar estado QR">Refrescar</Button>
                <Button size="sm" onClick={handleRegroupNow} aria-label="Reagrupar ahora">Reagrupar ahora</Button>
              </div>
            </Card>
          )}

          <PhotoGalleryModern
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
  );
}
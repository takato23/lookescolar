'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import PhotoGalleryLiquid from '@/components/admin/PhotoGalleryLiquid';
import { PhotoTypeSelector } from '@/components/admin/PhotoTypeSelector';
import { PhotoUploadButton } from '@/components/admin/PhotoUploadButton';
import PhotoFilters, { type PhotoFilters as PhotoFiltersType, type ViewSettings } from '@/components/admin/PhotoFilters';
import EventContextChip from '@/components/admin/EventContextChip';
import BulkActionsBar from '@/components/admin/BulkActionsBar';
import { createPostUploadToast } from '@/components/admin/PostUploadToast';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
  InfoIcon,
  ArrowLeft,
  Home,
  CheckSquareIcon,
  MoveIcon,
  CheckIcon,
  TrashIcon
} from 'lucide-react';
import { buildPhotosUrl } from '@/lib/utils/photos-url-builder';
import { fetchPhotosSimple } from '@/lib/utils/photos-url-builder-simple';
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
  const [photoType, setPhotoType] = useState<'private' | 'public' | 'classroom'>('private');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [availableFolders, setAvailableFolders] = useState<Array<{id: string, name: string, eventName?: string, type?: string}>>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  
  // Load subjects for filter dropdown
  const [subjects, setSubjects] = useState<Array<{
    id: string;
    name: string;
    event_id: string;
    event_name?: string;
  }>>([]);
  const params = useSearchParams();
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedEventId = params.get('eventId');
  const selectedCourseId = params.get('courseId');
  const selectedCodeId = params.get('codeId');
  
  // New filter and view state using the advanced components
  const [filters, setFilters] = useState<PhotoFiltersType>({
    search: '',
    eventId: selectedEventId || undefined,
    approved: undefined,
    tagged: undefined,
    withFolder: undefined
  });
  
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    mode: 'grid',
    density: 'normal'
  });

  // Filter and sort photos using new filter system
  const filteredAndSortedPhotos = useMemo(() => {
    let filtered = photos;
    
    // Apply search filter
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(photo => 
        photo.original_filename.toLowerCase().includes(query) ||
        photo.event?.name?.toLowerCase().includes(query) ||
        photo.subject?.name?.toLowerCase().includes(query)
      );
    }
    
    // Apply event filter
    if (filters.eventId) {
      filtered = filtered.filter(photo => photo.event_id === filters.eventId);
    }
    
    // Apply subject filter
    if (filters.subjectId) {
      if (filters.subjectId === 'null') {
        filtered = filtered.filter(photo => !photo.subject?.id);
      } else {
        filtered = filtered.filter(photo => photo.subject?.id === filters.subjectId);
      }
    }
    
    // Apply status filters
    if (filters.approved !== undefined) {
      filtered = filtered.filter(photo => photo.approved === filters.approved);
    }
    
    if (filters.tagged !== undefined) {
      filtered = filtered.filter(photo => photo.tagged === filters.tagged);
    }
    
    if (filters.withFolder !== undefined) {
      if (filters.withFolder) {
        filtered = filtered.filter(photo => photo.subject?.id);
      } else {
        filtered = filtered.filter(photo => !photo.subject?.id);
      }
    }
    
    // Apply date range filter
    if (filters.dateRange) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filters.dateRange) {
        case 'today':
          filtered = filtered.filter(photo => {
            const photoDate = new Date(photo.created_at);
            return photoDate >= today;
          });
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(photo => {
            const photoDate = new Date(photo.created_at);
            return photoDate >= weekAgo;
          });
          break;
        case 'month':
          const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
          filtered = filtered.filter(photo => {
            const photoDate = new Date(photo.created_at);
            return photoDate >= monthAgo;
          });
          break;
      }
    }
    
    // Apply sorting (default to recent)
    const sorted = [...filtered].sort((a, b) => {
      // Always sort by recent for now, more sorting options can be added to filters
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return sorted;
  }, [photos, filters]);

  // Load subjects/folders for filter dropdown
  const loadSubjects = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/codes');
      const data = await response.json();
      const codes = Array.isArray(data) ? data : (data.codes || []);
      
      const subjectsData = codes.map((code: any) => ({
        id: code.id,
        name: code.code_value || 'Sin nombre',
        event_id: code.event_id || '',
        event_name: code.events?.name || 'Evento desconocido'
      }));
      
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  }, []);

  // Sync URL params with filters
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      eventId: selectedEventId || undefined
    }));
  }, [selectedEventId]);

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

  // Load events with real statistics
  const loadEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/events?include_stats=true');
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        // Use real photo counts from API stats
        const eventsWithCount = data.map((event: any) => ({
          id: event.id,
          name: event.school || event.name,
          event_date: event.date,
          school_name: event.school || event.name,
          photo_count: event.stats?.totalPhotos || 0,
          created_at: event.created_at
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
    // Include photo type
    formData.append('photo_type', photoType);

    // Show uploading toast with context
    const eventName = eventId ? events.find(e => e.id === eventId)?.name : null;
    const photoTypeLabel = photoType === 'private' ? 'Familiares' : 
                          photoType === 'classroom' ? 'del Salón' : 'Públicas';
    
    const uploadingToast = toast.loading(
      `Subiendo ${files.length} fotos ${photoTypeLabel}...`,
      {
        description: eventName ? `Evento: ${eventName}` : 'Sin evento específico',
      }
    );

    // Use the simple-upload endpoint which has auto QR detection
    const response = await fetch('/api/admin/photos/simple-upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    if (!response.ok) {
      toast.error('Error subiendo fotos', { 
        id: uploadingToast,
        description: result.error || 'Error desconocido'
      });
      throw new Error(result.error || 'Error uploading photos');
    }

    // Show enhanced post-upload toast
    const uploadedCount = result?.uploaded?.length || files.length;
    const ev = result.uploaded?.[0]?.event_id || eventId;
    const actualEventName = ev ? events.find(e => e.id === ev)?.name : null;

    const uploadResult = {
      uploadedCount,
      eventId: ev,
      eventName: actualEventName,
      photoType,
      qrDetection: result.qr_detection
    };

    // Create custom toast with quick actions
    const toastOptions = createPostUploadToast(uploadResult, {
      onViewPhotos: () => {
        if (ev) {
          router.replace(`/admin/photos?eventId=${ev}&codeId=null`);
        } else {
          const usp = new URLSearchParams();
          usp.set('codeId', 'null');
          router.replace(`/admin/photos?${usp.toString()}`);
        }
      },
      onTagNow: () => {
        // Navigate to tagging interface if needed
        if (ev) {
          router.push(`/admin/events/${ev}/tagging`);
        }
      },
      duration: 8000
    });

    toast.custom(() => toastOptions.component, {
      id: uploadingToast,
      duration: toastOptions.duration
    });

    // Show quick navigation after upload
    if (result?.success && result?.uploaded?.length > 0) {
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

  // Load available folders for move operation
  const loadAvailableFolders = async () => {
    try {
      console.log('Loading available folders...');
      
      // Obtener carpetas (codes) - las carpetas se guardan en la tabla codes
      const codesResponse = await fetch('/api/admin/codes');
      
      console.log('Codes response status:', codesResponse.status);
      
      const codesData = await codesResponse.json();
      
      console.log('Codes data:', codesData);
      
      const codes = Array.isArray(codesData) ? codesData : (codesData.codes || []);
      
      console.log('Processed codes:', codes);
      
      // Mapear codes a folders
      const folders = codes.map((code: any) => ({
        id: code.id,
        name: code.code_value || 'Sin nombre',
        eventName: code.events?.name || 'Evento desconocido',
        type: 'code'
      }));
      
      console.log('Final folders:', folders);
      setAvailableFolders(folders);
    } catch (error) {
      console.error('Error loading folders:', error);
      toast.error('Error al cargar las carpetas disponibles');
    }
  };

  // Handle move photos to folder
  const handleMovePhotos = async (folderId: string) => {
    if (selectedPhotos.length === 0) return;
    
    try {
      const promises = selectedPhotos.map(photoId => 
        fetch(`/api/admin/photos/${photoId}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codeId: folderId })
        })
      );
      
      await Promise.all(promises);
      setSelectedPhotos([]);
      setShowMoveModal(false);
      toast.success(`${selectedPhotos.length} fotos movidas exitosamente`);
      await loadPhotos(true);
    } catch (error) {
      toast.error('Error al mover las fotos');
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

  // Load subjects when component mounts
  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  // Bulk actions functions
  const handleSelectAll = useCallback(() => {
    const allIds = filteredAndSortedPhotos.map(photo => photo.id);
    setSelectedPhotos(allIds);
  }, [filteredAndSortedPhotos]);

  const handleDeselectAll = useCallback(() => {
    setSelectedPhotos([]);
  }, []);

  const handleBulkApprove = useCallback(async () => {
    await handlePhotoApprove(selectedPhotos, true);
    setSelectedPhotos([]);
    await loadPhotos(true);
  }, [selectedPhotos, handlePhotoApprove, loadPhotos]);

  const handleBulkDelete = useCallback(async () => {
    await handlePhotoDelete(selectedPhotos);
    setSelectedPhotos([]);
    await loadPhotos(true);
  }, [selectedPhotos, handlePhotoDelete, loadPhotos]);

  const handleBulkMove = useCallback(async (folderId: string) => {
    const promises = selectedPhotos.map(photoId => 
      fetch(`/api/admin/photos/${photoId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId: folderId })
      })
    );
    
    await Promise.all(promises);
    setSelectedPhotos([]);
    await loadPhotos(true);
  }, [selectedPhotos, loadPhotos]);

  const handleBulkTag = useCallback(() => {
    // Open tagging modal or navigate to tagging interface
    console.log('Bulk tagging for:', selectedPhotos);
    // This could open a modal or navigate to a tagging interface
  }, [selectedPhotos]);

  const clearAllFilters = useCallback(() => {
    setFilters({
      search: '',
      eventId: undefined,
      approved: undefined,
      tagged: undefined,
      withFolder: undefined
    });
  }, []);

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
          {/* Mobile Breadcrumb */}
          {selectedEventId && events.find(e => e.id === selectedEventId) && (
            <nav className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link 
                href="/admin/events" 
                className="flex items-center gap-1 transition-colors hover:text-primary-600"
              >
                <Home className="h-3 w-3" />
                Eventos
              </Link>
              <span>/</span>
              <Link
                href={`/admin/events/${selectedEventId}`}
                className="transition-colors hover:text-primary-600 truncate max-w-24"
              >
                {events.find(e => e.id === selectedEventId)?.name}
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">Fotos</span>
            </nav>
          )}
          
          {/* Compact Mobile header */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary-600" />
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Fotos ({filteredAndSortedPhotos.length}
                {filteredAndSortedPhotos.length !== photos.length && ` de ${photos.length}`})
              </h1>
              {selectedEventId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/events/${selectedEventId}`)}
                  className="text-xs px-2 py-1 h-6"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Volver
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <PhotoUploadButton
                onUpload={(files) => handlePhotoUpload(files, selectedEventId || undefined)}
                variant="default"
                size="sm"
                className="h-8 text-xs"
              >
                Subir Fotos
              </PhotoUploadButton>
            </div>
          </div>
          
          {/* Mobile Event Context */}
          {selectedEventId && events.find(e => e.id === selectedEventId) && (
            <div className="mb-3">
              <EventContextChip
                event={events.find(e => e.id === selectedEventId)!}
                photoCount={photos.length}
                filteredCount={filteredAndSortedPhotos.length}
                onRemoveFilter={() => {
                  const newFilters = { ...filters, eventId: undefined };
                  setFilters(newFilters);
                  router.replace('/admin/photos');
                }}
                compact={true}
              />
            </div>
          )}
          
          {/* Mobile Photo Type Badge */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge 
              variant="outline" 
              className={`text-xs ${
                photoType === 'private' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                photoType === 'classroom' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                'bg-green-50 text-green-700 border-green-200'
              }`}
            >
              {photoType === 'private' ? '👨‍👩‍👧‍👦' : 
               photoType === 'classroom' ? '🏫' : '🌍'}
              {' '}
              {photoType === 'private' ? 'Familiares' : 
               photoType === 'classroom' ? 'Del Salón' : 'Públicas'}
            </Badge>
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

          {/* Mobile Photo Type Selector */}
          <div className="liquid-card p-3">
            <PhotoTypeSelector
              selectedType={photoType}
              onTypeChange={setPhotoType}
              compact={true}
            />
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
              initialPhotos={filteredAndSortedPhotos}
              initialEvents={events}
              onCountsChanged={() => loadPhotos(true)}
              onPhotoUpload={handlePhotoUpload}
              onPhotoDelete={handlePhotoDelete}
              hideSidebar
              hideHeader
              compact
              viewMode={viewSettings.mode}
              selectedPhotos={selectedPhotos}
              onPhotosSelected={setSelectedPhotos}
              externalSelectedEvent={selectedEventId}
              externalCodeId={selectedCodeId ?? null}
            />
          </div>
        </div>
      </div>

                {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-6 pt-2">
          {/* Event Context Chip */}
          {selectedEventId && events.find(e => e.id === selectedEventId) && (
            <div className="mb-6">
              <EventContextChip
                event={events.find(e => e.id === selectedEventId)!}
                photoCount={photos.length}
                filteredCount={filteredAndSortedPhotos.length}
                onRemoveFilter={() => {
                  const newFilters = { ...filters, eventId: undefined };
                  setFilters(newFilters);
                  router.replace('/admin/photos');
                }}
              />
            </div>
          )}
          
          {/* Header with Controls */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-6 h-6 text-primary-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Gestión de Fotos
                </h1>
                {isRefreshing && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-700">
                    <Loader2Icon className="w-4 h-4 animate-spin" />
                    <span>Actualizando...</span>
                  </div>
                )}
              </div>
              
              <PhotoUploadButton
                onUpload={(files) => handlePhotoUpload(files, selectedEventId || undefined)}
                variant="default"
                size="default"
              >
                Subir Fotos
              </PhotoUploadButton>
            </div>
            
            {/* Advanced Filters Component */}
            <PhotoFilters
              events={events}
              subjects={subjects}
              filters={filters}
              onFiltersChange={setFilters}
              viewSettings={viewSettings}
              onViewSettingsChange={setViewSettings}
              resultCount={filteredAndSortedPhotos.length}
              totalCount={photos.length}
              isLoading={loading}
            />
          </div>

          {/* Content area with gallery */}
          <div className="space-y-4">
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
              
              {/* Photo Type Selector */}
              <div className="liquid-card p-4">
                <PhotoTypeSelector
                  selectedType={photoType}
                  onTypeChange={setPhotoType}
                  compact={false}
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
                {/* Empty States */}
                {filteredAndSortedPhotos.length === 0 && photos.length > 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      No hay fotos que coincidan con los filtros
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
                      Ajusta los filtros o la búsqueda para ver más resultados
                    </p>
                    <Button
                      variant="outline"
                      onClick={clearAllFilters}
                      className="text-blue-700 border-blue-300 hover:bg-blue-50"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                )}
                
                {photos.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {!selectedEventId ? 'Elegí un evento para ver sus fotos' : 'No hay fotos en este evento'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
                      {!selectedEventId 
                        ? 'Selecciona un evento desde el sidebar para gestionar sus fotos y carpetas.'
                        : 'Sube fotos para comenzar a organizar y gestionar tu galería.'
                      }
                    </p>
                    {!selectedEventId ? (
                      <Button
                        variant="outline"
                        onClick={() => router.push('/admin/events')}
                        className="text-blue-700 border-blue-300 hover:bg-blue-50"
                      >
                        Ver eventos
                      </Button>
                    ) : (
                      <PhotoUploadButton
                        onUpload={(files) => handlePhotoUpload(files, selectedEventId)}
                        variant="default"
                      >
                        Subir Fotos
                      </PhotoUploadButton>
                    )}
                  </div>
                )}

                {selectedCodeId === 'null' && filteredAndSortedPhotos.length === 0 && photos.length > 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
                      <FolderIcon className="w-8 h-8 text-orange-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      No hay fotos sin carpeta
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
                      Todas las fotos están organizadas en carpetas. Puedes arrastrar fotos aquí o usar "Mover a carpeta" para organizarlas.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => handleSelectFromSidebar({ eventId: selectedEventId })}
                      className="text-blue-700 border-blue-300 hover:bg-blue-50"
                    >
                      Ver todas las fotos
                    </Button>
                  </div>
                )}

                {filteredAndSortedPhotos.length > 0 && (
                  <PhotoGalleryLiquid
                    initialPhotos={filteredAndSortedPhotos}
                    initialEvents={events}
                    onPhotoUpload={handlePhotoUpload}
                    onPhotoDelete={handlePhotoDelete}
                    onPhotoApprove={handlePhotoApprove}
                    onPhotoTag={handlePhotoTag}
                    onRefresh={() => loadPhotos(true)}
                    hideSidebar
                    hideHeader
                    compact
                    selectedPhotos={selectedPhotos}
                    onPhotosSelected={setSelectedPhotos}
                    viewMode={viewSettings.mode}
                    externalSelectedEvent={selectedEventId}
                    externalCodeId={selectedCodeId ?? null}
                    onCountsChanged={() => loadPhotos(true)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedPhotos.length}
          totalCount={filteredAndSortedPhotos.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onApprove={handleBulkApprove}
          onDelete={handleBulkDelete}
          onMove={handleBulkMove}
          onTag={handleBulkTag}
          availableFolders={subjects}
          isLoading={loading}
        />
        
        {/* Modal para mover fotos */}
        {showMoveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                Mover {selectedPhotos.length} foto(s) a carpeta
              </h3>
              
              <div className="space-y-2 mb-6">
                {availableFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleMovePhotos(folder.id)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium">{folder.name}</div>
                    <div className="text-sm text-gray-500">{folder.eventName}</div>
                  </button>
                ))}
                
                {availableFolders.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay carpetas disponibles
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowMoveModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Selection Bar */}
        {/* Note: This would be handled by PhotoGalleryLiquid component */}
      </div>
    </div>
  );
});

export default ModernPhotosPage;
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import PhotoGalleryLiquid from '@/components/admin/PhotoGalleryLiquid';
import { PhotoTypeSelector } from '@/components/admin/PhotoTypeSelector';
import { PhotoUploadButton } from '@/components/admin/PhotoUploadButton';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name' | 'size'>('recent');
  const [activeFilters, setActiveFilters] = useState<{
    approved?: boolean;
    tagged?: boolean;
    withFolder?: boolean;
  }>({});
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<Array<{id: string, name: string, eventName?: string, type?: string}>>([]);
  const params = useSearchParams();
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedEventId = params.get('eventId');
  const selectedCourseId = params.get('courseId');
  const selectedCodeId = params.get('codeId');

  // Filter and sort photos
  const filteredAndSortedPhotos = useMemo(() => {
    let filtered = photos;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(photo => 
        photo.original_filename.toLowerCase().includes(query) ||
        photo.event?.name?.toLowerCase().includes(query) ||
        photo.subject?.name?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filters
    if (activeFilters.approved !== undefined) {
      filtered = filtered.filter(photo => photo.approved === activeFilters.approved);
    }
    
    if (activeFilters.tagged !== undefined) {
      filtered = filtered.filter(photo => photo.tagged === activeFilters.tagged);
    }
    
    if (activeFilters.withFolder !== undefined) {
      if (activeFilters.withFolder) {
        filtered = filtered.filter(photo => photo.subject?.id);
      } else {
        filtered = filtered.filter(photo => !photo.subject?.id);
      }
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name':
          return a.original_filename.localeCompare(b.original_filename);
        case 'size':
          return b.file_size - a.file_size;
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [photos, searchQuery, activeFilters, sortBy]);

  // Toggle filter functions
  const toggleFilter = (filterKey: keyof typeof activeFilters, value?: boolean) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: prev[filterKey] === value ? undefined : value
    }));
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setSearchQuery('');
  };

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

    // Show success with detailed information
    const uploadedCount = result?.uploaded?.length || files.length;
    const ev = result.uploaded?.[0]?.event_id || eventId;
    const actualEventName = ev ? events.find(e => e.id === ev)?.name : null;

    let successMessage = `✅ ${uploadedCount} fotos ${photoTypeLabel} subidas`;
    let successDescription = '';

    if (actualEventName) {
      successDescription = `Evento: ${actualEventName}`;
    }

    // Add QR detection info to description
    if (result.qr_detection && result.qr_detection.detected > 0) {
      const { detected, auto_assigned } = result.qr_detection;
      const qrInfo = `🔍 QR: ${detected} detectados, ${auto_assigned} asignados`;
      successDescription = successDescription ? `${successDescription} • ${qrInfo}` : qrInfo;
    }

    // Add photo type info
    const typeInfo = photoType === 'private' ? '👨‍👩‍👧‍👦 Familiares' : 
                    photoType === 'classroom' ? '🏫 Del Salón' : '🌍 Públicas';
    successDescription = successDescription ? `${successDescription} • ${typeInfo}` : typeInfo;

    toast.success(successMessage, { 
      id: uploadingToast,
      description: successDescription,
      duration: 5000
    });

    // Show quick navigation after upload
    if (result?.success && result?.uploaded?.length > 0) {
      // DON'T redirect - just refresh the current view to show new photos
      loadPhotos(true);
      loadEvents();
      
      // If we have an event context, just refresh without navigation
      if (ev && selectedEventId === ev) {
        // Already in the right context, just refresh
        console.log('Staying in current event context after upload');
      } else if (ev) {
        // Only navigate if we're not already in the event context
        console.log('Navigating to event context:', ev);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('eventId', ev);
        if (selectedCodeId) {
          newUrl.searchParams.set('codeId', selectedCodeId);
        }
        window.history.replaceState({}, '', newUrl.toString());
      }
    }

    // Refresh photos and events to show new uploads
    // Add a small delay to ensure database transaction has committed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await Promise.all([
      loadPhotos(true), // Force refresh
      loadEvents() // Update event stats
    ]);
    
    // Log the refresh for debugging
    console.log('Photo upload completed, photos refreshed');
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
          
          {/* Mobile badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedEventId && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                📸 {events.find(e => e.id === selectedEventId)?.name || 'Evento'}
              </Badge>
            )}
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
              onCountsChanged={() => {
                // Force refresh when photo counts change (after upload, delete, etc.)
                loadPhotos(true);
                loadEvents();
              }}
              onPhotoUpload={handlePhotoUpload}
              onPhotoDelete={handlePhotoDelete}
              hideSidebar
              hideHeader
              compact
              viewMode={viewMode}
              externalSelectedEvent={selectedEventId}
              externalCodeId={selectedCodeId ?? null}
            />
          </div>
        </div>
      </div>

                {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-6 pt-2">
          {/* Breadcrumb with Event Context */}
          {selectedEventId && events.find(e => e.id === selectedEventId) && (
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link 
                href="/admin/events" 
                className="flex items-center gap-1 transition-colors hover:text-primary-600"
              >
                <Home className="h-4 w-4" />
                Eventos
              </Link>
              <span>/</span>
              <Link
                href={`/admin/events/${selectedEventId}`}
                className="transition-colors hover:text-primary-600"
              >
                {events.find(e => e.id === selectedEventId)?.name}
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">Gestión de Fotos</span>
            </nav>
          )}
          
          {/* Header with Context and Controls */}
          <div className="space-y-4 mb-6">
            {/* Top Context Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-primary-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Fotos</h1>
                {selectedEventId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/events/${selectedEventId}`)}
                    className="text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Volver al evento
                  </Button>
                )}
              </div>
              
              {/* Context Pill (sticky) */}
              <div className="flex items-center gap-3">
                {(selectedEventId || selectedCodeId) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-full px-4 py-2 text-sm font-medium text-blue-800">
                    <span className="text-blue-600">Subiendo a:</span>
                    <span className="ml-1">
                      {selectedEventId ? events.find(e => e.id === selectedEventId)?.name || 'Evento' : 'Todas las fotos'}
                      {selectedCodeId && selectedCodeId !== 'null' ? (
                        <span className="text-blue-700"> › Carpeta específica</span>
                      ) : selectedCodeId === 'null' ? (
                        <span className="text-orange-700"> › Sin carpeta</span>
                      ) : (
                        <span className="text-blue-700"> › General</span>
                      )}
                    </span>
                  </div>
                )}
                {isRefreshing && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                    <Loader2Icon className="w-4 h-4 animate-spin" />
                    <span>Actualizando...</span>
                  </div>
                )}
                <PhotoUploadButton
                  onUpload={(files) => handlePhotoUpload(files, selectedEventId || undefined)}
                  variant="default"
                  size="sm"
                >
                  Subir Fotos
                </PhotoUploadButton>
              </div>
            </div>

            {/* Controls Bar Reorganizada */}
            <div className="space-y-3 p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              
              {/* Primera fila: Búsqueda y controles principales */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Search */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre, etiqueta o carpeta…"
                      className="pl-10 pr-4 py-2 w-80 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* View Toggle */}
                  <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        viewMode === 'grid' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Grid
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        viewMode === 'list' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Lista
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Sort */}
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="recent">Recientes</option>
                    <option value="oldest">Más antiguas</option>
                    <option value="name">A–Z</option>
                    <option value="size">Tamaño</option>
                  </select>
                </div>
              </div>

              {/* Segunda fila: Botones de acción y filtros */}
              <div className="flex items-center justify-between gap-4">
                
                {/* Botones de acción principales */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      console.log('Select all clicked. Current selectedPhotos:', selectedPhotos);
                      console.log('filteredAndSortedPhotos count:', filteredAndSortedPhotos.length);
                      
                      const allVisibleSelected = filteredAndSortedPhotos.length > 0 && 
                        filteredAndSortedPhotos.every(photo => selectedPhotos.includes(photo.id));
                      
                      if (allVisibleSelected) {
                        // Deselect all visible
                        const newSelection = selectedPhotos.filter(id => !filteredAndSortedPhotos.some(photo => photo.id === id));
                        console.log('Deselecting. New selection:', newSelection);
                        setSelectedPhotos(newSelection);
                      } else {
                        // Select all visible
                        const visibleIds = filteredAndSortedPhotos.map(photo => photo.id);
                        const newSelection = Array.from(new Set([...selectedPhotos, ...visibleIds]));
                        console.log('Selecting all. Visible IDs:', visibleIds);
                        console.log('New selection:', newSelection);
                        setSelectedPhotos(newSelection);
                      }
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      filteredAndSortedPhotos.length > 0 && 
                      filteredAndSortedPhotos.every(photo => selectedPhotos.includes(photo.id))
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <CheckSquareIcon className="w-4 h-4 mr-2" />
                    Seleccionar todas ({filteredAndSortedPhotos.length})
                  </button>

                  {selectedPhotos.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('Move button clicked. Selected photos:', selectedPhotos);
                          loadAvailableFolders();
                          setShowMoveModal(true);
                        }}
                        className="text-green-700 border-green-300 hover:bg-green-50"
                      >
                        <MoveIcon className="w-4 h-4 mr-2" />
                        Mover ({selectedPhotos.length})
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await handlePhotoApprove(selectedPhotos, true);
                            setSelectedPhotos([]);
                            toast.success(`${selectedPhotos.length} fotos aprobadas`);
                            loadPhotos(true); // Refresh photos
                          } catch (error) {
                            toast.error('Error al aprobar fotos');
                          }
                        }}
                        className="text-green-700 border-green-300 hover:bg-green-50"
                      >
                        <CheckIcon className="w-4 h-4 mr-2" />
                        Aprobar ({selectedPhotos.length})
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (confirm(`¿Eliminar ${selectedPhotos.length} fotos seleccionadas?`)) {
                            try {
                              await handlePhotoDelete(selectedPhotos);
                              setSelectedPhotos([]);
                              toast.success(`${selectedPhotos.length} fotos eliminadas`);
                              await loadPhotos(true);
                            } catch (error) {
                              toast.error('Error al eliminar fotos');
                            }
                          }
                        }}
                        className="text-red-700 border-red-300 hover:bg-red-50"
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Eliminar ({selectedPhotos.length})
                      </Button>
                    </>
                  )}
                </div>

                {/* Filtros en desplegable */}
                <div className="relative">
                  <details className="group">
                    <summary className="cursor-pointer flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                      </svg>
                      Filtros
                      {(Object.keys(activeFilters).length > 0) && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                          {Object.keys(activeFilters).length}
                        </Badge>
                      )}
                    </summary>
                    
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-3">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Estado de aprobación</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleFilter('approved', true)}
                              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                                activeFilters.approved === true
                                  ? 'bg-green-100 text-green-700 border-green-300'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-green-50'
                              }`}
                            >
                              Aprobadas
                            </button>
                            <button
                              onClick={() => toggleFilter('approved', false)}
                              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                                activeFilters.approved === false
                                  ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-yellow-50'
                              }`}
                            >
                              Pendientes
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Organización</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleFilter('withFolder', false)}
                              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                                activeFilters.withFolder === false
                                  ? 'bg-orange-100 text-orange-700 border-orange-300'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-orange-50'
                              }`}
                            >
                              Sin carpeta
                            </button>
                            <button
                              onClick={() => toggleFilter('tagged', true)}
                              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                                activeFilters.tagged === true
                                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50'
                              }`}
                            >
                              Con etiqueta
                            </button>
                            <button
                              onClick={() => toggleFilter('tagged', false)}
                              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                                activeFilters.tagged === false
                                  ? 'bg-purple-100 text-purple-700 border-purple-300'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-purple-50'
                              }`}
                            >
                              Sin etiqueta
                            </button>
                          </div>
                        </div>

                        {(Object.keys(activeFilters).length > 0 || searchQuery) && (
                          <div className="pt-2 border-t border-gray-200">
                            <button
                              onClick={clearAllFilters}
                              className="w-full text-sm px-3 py-2 rounded-lg bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-colors"
                            >
                              Limpiar todos los filtros
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredAndSortedPhotos.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total
                  {filteredAndSortedPhotos.length !== photos.length && (
                    <span className="text-xs text-blue-600 ml-1">({photos.length} sin filtrar)</span>
                  )}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-green-600">{filteredAndSortedPhotos.filter(p => p.approved).length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Aprobadas</div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-orange-600">{filteredAndSortedPhotos.filter(p => !p.approved).length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pendientes</div>
              </div>
            </div>

            {/* Active Filters Display */}
            {(Object.keys(activeFilters).length > 0 || searchQuery) && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Filtros activos:</span>
                <div className="flex gap-1 flex-wrap">
                  {searchQuery && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                      Búsqueda: "{searchQuery}"
                    </Badge>
                  )}
                  {activeFilters.approved === true && (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      Aprobadas
                    </Badge>
                  )}
                  {activeFilters.approved === false && (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                      Pendientes
                    </Badge>
                  )}
                  {activeFilters.withFolder === false && (
                    <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                      Sin carpeta
                    </Badge>
                  )}
                  {activeFilters.tagged === true && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                      Con etiqueta
                    </Badge>
                  )}
                  {activeFilters.tagged === false && (
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                      Sin etiqueta
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="ml-auto text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  Limpiar filtros
                </Button>
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
                    onRefresh={() => {
                      // Gentle refresh - only reload photos when manually requested
                      console.log('Manual refresh of photos requested');
                      loadPhotos(true);
                    }}
                    hideSidebar
                    hideHeader
                    compact
                    selectedPhotos={selectedPhotos}
                    onPhotosSelected={setSelectedPhotos}
                    viewMode={viewMode}
                    externalSelectedEvent={selectedEventId}
                    externalCodeId={selectedCodeId ?? null}
                    onCountsChanged={() => {
                      // Gentle refresh when photo counts change - no forced reload
                      console.log('Photo counts changed, gentle refresh');
                      loadPhotos(true);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        
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
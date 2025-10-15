'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Share,
  Trash2,
  Edit,
  Eye,
  Grid3X3,
  List,
  Filter,
  Search,
  MoreVertical,
  Heart,
  MessageCircle,
  Calendar,
  MapPin,
  User,
  Camera,
  X,
  ZoomIn,
  RotateCcw,
  Check,
  Upload,
  Settings,
  FolderOpen,
  ArrowLeft,
  Plus,
  Package,
  LinkIcon,
  Star,
  CheckCircle2,
  Tag,
  Maximize2,
  ImageIcon,
  RefreshCw,
  CheckSquare,
  Square,
  FileUser,
  ShoppingCart,
  DollarSign,
  Users,
} from 'lucide-react';
import { clsx } from 'clsx';
import { cn } from '@/lib/utils';

// Types
interface Event {
  id: string;
  name: string;
  school?: string;
  date: string;
  location?: string;
  status: string;
  active: boolean;
  stats?: {
    totalPhotos?: number;
    totalSubjects?: number;
    totalRevenue?: number;
    pendingOrders?: number;
    totalOrders?: number;
  };
}

interface Folder {
  id: string;
  name: string;
  path: string;
  depth: number;
  photoCount: number;
  type: 'level' | 'course' | 'student';
  parentId?: string;
  children?: Folder[];
}

interface Photo {
  id: string;
  original_filename: string;
  preview_url?: string;
  thumbnail_url?: string;
  file_size: number;
  width?: number;
  height?: number;
  created_at: string;
  approved: boolean;
  tagged: boolean;
  students?: Array<{ id: string; name: string }>;
}

interface MobileEventPhotoManagerProps {
  eventId: string;
  initialEvent?: Event;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'date' | 'name' | 'size';
type DrawerView = 'folders' | 'actions' | null;

export function MobileEventPhotoManager({
  eventId,
  initialEvent,
  className,
}: MobileEventPhotoManagerProps) {
  const router = useRouter();

  // Estado del evento
  const [event, setEvent] = useState<Event | null>(() => {
    if (!initialEvent) return null;

    // Sanitizar el evento inicial para evitar valores undefined
    return {
      ...initialEvent,
      stats: {
        totalPhotos: Number(initialEvent.stats?.totalPhotos) || 0,
        totalSubjects: Number(initialEvent.stats?.totalSubjects) || 0,
        totalRevenue: Number(initialEvent.stats?.totalRevenue) || 0,
        pendingOrders: Number(initialEvent.stats?.pendingOrders) || 0,
        totalOrders: Number(initialEvent.stats?.totalOrders) || 0,
      }
    };
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado de carpetas y fotos
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [drawerView, setDrawerView] = useState<DrawerView>(null);
  const [showUploadInterface, setShowUploadInterface] = useState(false);

  // Pagination
  const ASSETS_PAGE_SIZE = 60;
  const [hasMoreAssets, setHasMoreAssets] = useState(true);
  const [loadingMoreAssets, setLoadingMoreAssets] = useState(false);

  // Cargar datos del evento
  const loadEventData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const eventResponse = await fetch(`/api/admin/events/${eventId}`);
      if (!eventResponse.ok) throw new Error('Error loading event');
      const eventData = await eventResponse.json();
      setEvent(eventData.event ? {
        ...eventData.event,
        stats: {
          totalPhotos: Number(eventData.event.stats?.totalPhotos) || 0,
          totalSubjects: Number(eventData.event.stats?.totalSubjects) || 0,
          totalRevenue: Number(eventData.event.stats?.totalRevenue) || 0,
          pendingOrders: Number(eventData.event.stats?.pendingOrders) || 0,
          totalOrders: Number(eventData.event.stats?.totalOrders) || 0,
        }
      } : null);

      // Cargar carpetas
      const allFolders = await fetchAllEventFolders();
      setFolders(allFolders);

      const root = allFolders.find((f) => f.parentId === null) || allFolders[0];
      if (root) {
        setSelectedFolderId(root.id);
      } else {
        // No hay carpetas, crear una carpeta raíz por defecto
        try {
          const response = await fetch(`/api/admin/events/${eventId}/folders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'Galería Principal',
              parent_id: null,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            const newFolder = result.folder;
            if (newFolder?.id) {
              setFolders([{
                id: newFolder.id,
                name: newFolder.name || 'Galería Principal',
                path: `/${(newFolder.name || 'galeria-principal').toLowerCase().replace(/\s+/g, '-')}`,
                depth: newFolder.depth || 0,
                photoCount: newFolder.photo_count || 0,
                type: 'level',
                parentId: newFolder.parent_id,
                children: []
              }]);
              setSelectedFolderId(newFolder.id);
            }
          }
        } catch (error) {
          console.error('Error creating default folder:', error);
        }
      }

    } catch (err) {
      console.error('Error loading event data:', err);
      setError(err instanceof Error ? err.message : 'Error loading event');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const fetchAllEventFolders = async () => {
    const all: Folder[] = [];
    const limit = 50;
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const url = `/api/admin/folders?event_id=${encodeURIComponent(eventId)}&limit=${limit}&offset=${offset}`;
      const res = await fetch(url);
      if (!res.ok) break;

      const json = await res.json();
      const batch: Folder[] = (json.folders || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        path: f.path || `/${f.name?.toLowerCase?.().replace(/\s+/g, '-')}`,
        depth: f.depth ?? 0,
        photoCount: Number(f.photo_count) || 0,
        type: f.type || 'level',
        parentId: f.parent_id,
        children: []
      }));

      total = typeof json.count === 'number' ? json.count : batch.length;
      all.push(...batch);
      offset += limit;
      if (batch.length < limit) break;
    }

    return all;
  };

  const loadPhotos = useCallback(async (folderId: string) => {
    if (!folderId) {
      setPhotos([]);
      setFilteredPhotos([]);
      return;
    }

    try {
      const params = new URLSearchParams({
        folder_id: folderId,
        limit: String(ASSETS_PAGE_SIZE),
        offset: '0',
      });

      const res = await fetch(`/api/admin/assets?${params.toString()}`);
      if (!res.ok) throw new Error('Error loading photos');

      const json = await res.json();
      const items = (json.assets || []) as Array<any>;

      const mappedPhotos: Photo[] = items.map((a) => ({
        id: a.id,
        original_filename: a.filename || 'archivo',
        preview_url: a.preview_url || null,
        thumbnail_url: a.preview_url || null,
        file_size: a.file_size || 0,
        created_at: typeof a.created_at === 'string' ? a.created_at : new Date().toISOString(),
        approved: true,
        tagged: false,
      }));

      setPhotos(mappedPhotos);
      setHasMoreAssets(mappedPhotos.length >= ASSETS_PAGE_SIZE);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  }, []);

  // Efectos
  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  useEffect(() => {
    if (selectedFolderId) {
      loadPhotos(selectedFolderId);
    }
  }, [selectedFolderId, loadPhotos]);

  useEffect(() => {
    let filtered = photos;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(photo =>
        photo.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'name':
          return a.original_filename.localeCompare(b.original_filename);
        case 'size':
          return b.file_size - a.file_size;
        default:
          return 0;
      }
    });

    setFilteredPhotos(filtered);
  }, [photos, searchTerm, sortBy]);

  // Funciones de manejo
  const handlePhotoClick = (photo: Photo, index: number) => {
    if (isSelectionMode) {
      togglePhotoSelection(photo.id);
    } else {
      setCurrentPhotoIndex(index);
      setShowLightbox(true);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleBulkAction = async (action: string) => {
    if (selectedPhotos.length === 0) return;

    try {
      if (action === 'approve') {
        const res = await fetch('/api/admin/photos/bulk-approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_ids: selectedPhotos, event_id: eventId }),
        });

        if (res.ok) {
          setPhotos(prev => prev.map(photo =>
            selectedPhotos.includes(photo.id)
              ? { ...photo, approved: true }
              : photo
          ));
        }
      } else if (action === 'delete') {
        const res = await fetch('/api/admin/assets/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asset_ids: selectedPhotos }),
        });

        if (res.ok) {
          setPhotos(prev => prev.filter(p => !selectedPhotos.includes(p.id)));
        }
      }

      setSelectedPhotos([]);
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Bulk action error:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || typeof dateString !== 'string') {
      return 'Fecha no disponible';
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }

      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Fecha no disponible';
    }
  };

  // Swipe para lightbox
  const handleSwipe = (event: any, info: PanInfo) => {
    if (info.offset.x > 50) {
      setCurrentPhotoIndex(prev => Math.max(0, prev - 1));
    } else if (info.offset.x < -50) {
      setCurrentPhotoIndex(prev => Math.min(filteredPhotos.length - 1, prev + 1));
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando evento...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h3 className="text-lg font-medium text-destructive mb-2">Error al cargar el evento</h3>
            <p className="text-destructive/80 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => router.push('/admin/events')}
                className="inline-flex items-center rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a eventos
              </button>
              <button
                onClick={loadEventData}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando evento...</p>
        </div>
      </div>
    );
  }

  const PhotoCard = ({ photo, index }: { photo: Photo; index: number }) => {
    const isSelected = selectedPhotos.includes(photo.id);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{
          delay: index * 0.08,
          type: "spring",
          stiffness: 100,
          damping: 15
        }}
        className={clsx(
          'relative group cursor-pointer',
          viewMode === 'grid' ? 'aspect-square' : 'flex items-center space-x-4 p-4',
          'bg-gradient-to-br from-white via-white to-gray-50/50 rounded-2xl border border-border/80 overflow-hidden',
          'transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 active:scale-95',
          'min-h-[120px] shadow-sm',
          isSelected && 'ring-2 ring-primary-500 shadow-lg shadow-primary/20'
        )}
        onClick={() => handlePhotoClick(photo, index)}
      >
        {/* Selection indicator */}
        {isSelectionMode && (
          <div className="absolute top-2 left-2 z-10">
            <div className={clsx(
              'w-6 h-6 rounded-full border-2 flex items-center justify-center',
              isSelected
                ? 'bg-primary border-primary'
                : 'bg-background border-border'
            )}>
              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
          </div>
        )}

        {/* Photo thumbnail */}
        <div className={clsx(
          'relative overflow-hidden',
          viewMode === 'grid' ? 'w-full h-full' : 'w-16 h-16 flex-shrink-0 rounded-xl'
        )}>
          <img
            src={photo.thumbnail_url || photo.preview_url}
            alt={photo.original_filename}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />

          {/* Status badges */}
          <div className="absolute top-3 right-3 flex gap-1.5">
            {photo.approved && (
              <div className="w-5 h-5 rounded-full bg-green-500/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
                <CheckCircle2 className="h-3 w-3 text-foreground" />
              </div>
            )}
            {photo.tagged && (
              <div className="w-5 h-5 rounded-full bg-blue-500/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
                <Tag className="h-3 w-3 text-foreground" />
              </div>
            )}
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>

        {/* Photo info (list view) */}
        {viewMode === 'list' && (
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{photo.original_filename}</h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{formatFileSize(photo.file_size)}</span>
              <span>•</span>
              <span>{formatDate(photo.created_at)}</span>
            </div>
            {photo.width && photo.height && (
              <p className="text-xs text-muted-foreground">{photo.width}×{photo.height}</p>
            )}
          </div>
        )}

        {/* Actions menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Show actions menu
            }}
            className="p-1.5 rounded-full bg-black/50 text-foreground hover:bg-black/70"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    );
  };

  const Lightbox = () => {
    const currentPhoto = filteredPhotos[currentPhotoIndex];

    if (!currentPhoto) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setShowLightbox(false)}
        >
          {/* Navigation arrows */}
          {filteredPhotos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPhotoIndex(prev => Math.max(0, prev - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-foreground hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPhotoIndex(prev => Math.min(filteredPhotos.length - 1, prev + 1));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-foreground hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Close button */}
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-3 rounded-full bg-black/50 text-foreground hover:bg-black/70 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Photo counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-foreground px-3 py-1 rounded-full text-sm">
            {currentPhotoIndex + 1} / {filteredPhotos.length}
          </div>

          {/* Photo container */}
          <motion.div
            key={currentPhoto.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="max-w-[90vw] max-h-[80vh] relative"
            onClick={(e) => e.stopPropagation()}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleSwipe}
          >
            <img
              src={currentPhoto.preview_url}
              alt={currentPhoto.original_filename}
              className="max-w-full max-h-full object-contain rounded-lg"
            />

            {/* Photo info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
              <div className="text-foreground space-y-2">
                <h3 className="font-semibold text-lg">{currentPhoto.original_filename}</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <span>{formatFileSize(currentPhoto.file_size)}</span>
                  <span>{formatDate(currentPhoto.created_at)}</span>
                  {currentPhoto.width && currentPhoto.height && (
                    <span>{currentPhoto.width}×{currentPhoto.height}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {currentPhoto.approved && (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-green-300">Aprobada</span>
                    </div>
                  )}
                  {currentPhoto.tagged && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-blue-300">Etiquetada</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const Drawer = () => {
    return (
      <AnimatePresence>
        {drawerView && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setDrawerView(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-80 bg-background border-l border-border z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">
                    {drawerView === 'folders' ? 'Carpetas' : 'Acciones'}
                  </h2>
                  <button
                    onClick={() => setDrawerView(null)}
                    className="p-2 rounded-lg hover:bg-muted"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {drawerView === 'folders' ? (
                  <div className="space-y-2">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          setSelectedFolderId(folder.id);
                          setDrawerView(null);
                        }}
                        className={clsx(
                          'w-full text-left p-3 rounded-lg border transition-colors',
                          selectedFolderId === folder.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'hover:bg-muted border-border'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{folder.name}</p>
                            <p className="text-sm opacity-75">{folder.photoCount} fotos</p>
                          </div>
                          <FolderOpen className="h-5 w-5" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setShowUploadInterface(true);
                        setDrawerView(null);
                      }}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Upload className="h-5 w-5" />
                      <span>Subir Fotos</span>
                    </button>

                    <button
                      onClick={() => {
                        // Share event
                        setDrawerView(null);
                      }}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg bg-muted hover:bg-muted/80"
                    >
                      <LinkIcon className="h-5 w-5" />
                      <span>Compartir Evento</span>
                    </button>

                    <button
                      onClick={() => {
                        router.push(`/admin/store-settings?eventId=${eventId}`);
                        setDrawerView(null);
                      }}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg bg-muted hover:bg-muted/80"
                    >
                      <Settings className="h-5 w-5" />
                      <span>Configurar Tienda</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className={clsx('w-full min-h-screen bg-background', className)}>
      {/* Mobile Header */}
      <div className="sticky top-0 z-30 border-b border-border/80 bg-surface/95 shadow-sm backdrop-blur-lg dark:bg-surface/90">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/admin/events')}
              className="rounded-xl p-2.5 text-muted-foreground transition-colors duration-200 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-foreground truncate">{event.school || event.name}</h1>
              <p className="text-sm text-muted-foreground truncate">
                {event.date ? new Date(event.date).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                }) : 'Sin fecha'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setDrawerView('actions')}
            className="rounded-xl p-2.5 text-muted-foreground transition-colors duration-200 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        {/* Metrics Bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                <Camera className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">{Number(event.stats?.totalPhotos) || 0}</span>
              </div>
              <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-700">{Number(event.stats?.totalSubjects) || 0}</span>
              </div>
              <div className="flex items-center space-x-2 bg-purple-50 px-3 py-2 rounded-lg">
                <ShoppingCart className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-700">{Number(event.stats?.totalOrders) || 0}</span>
              </div>
            </div>
            <button
              onClick={() => setDrawerView('folders')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted transition-colors"
            >
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Carpetas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar fotos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* View mode toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid3X3 className="h-5 w-5" />}
              <span className="text-sm">{viewMode === 'grid' ? 'Lista' : 'Cuadrícula'}</span>
            </button>

            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <Filter className="h-5 w-5" />
              <span className="text-sm">Filtros</span>
            </button>
          </div>

          {/* Selection mode */}
          <button
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedPhotos([]);
            }}
            className={clsx(
              'px-4 py-2 rounded-lg transition-colors font-medium',
              isSelectionMode
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {isSelectionMode ? 'Cancelar' : 'Seleccionar'}
          </button>
        </div>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">Filtros</h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="date">Por fecha</option>
                  <option value="name">Por nombre</option>
                  <option value="size">Por tamaño</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk actions */}
      <AnimatePresence>
        {isSelectionMode && selectedPhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mb-4 bg-primary/10 border border-primary/20 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-primary">
                {selectedPhotos.length} foto{selectedPhotos.length > 1 ? 's' : ''} seleccionada{selectedPhotos.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="px-3 py-1.5 bg-green-600 text-foreground text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1.5 bg-destructive text-destructive-foreground text-sm rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedPhotos([]);
                  }}
                  className="px-3 py-1.5 bg-muted text-muted-foreground text-sm rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current folder info */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filteredPhotos.length} foto{filteredPhotos.length !== 1 ? 's' : ''}
            {searchTerm && ` para "${searchTerm}"`}
          </span>
          {selectedFolderId && (
            <span>
              {folders.find(f => f.id === selectedFolderId)?.name || 'Carpeta'}
            </span>
          )}
        </div>
      </div>

      {/* Photos grid/list */}
      <div
        className={clsx(
          'px-4 pb-4',
          viewMode === 'grid'
            ? 'grid grid-cols-2 gap-4'
            : 'space-y-3'
        )}
        style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}
      >
        <AnimatePresence mode="popLayout">
          {filteredPhotos.map((photo, index) => (
            <PhotoCard key={photo.id} photo={photo} index={index} />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {filteredPhotos.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchTerm ? 'No se encontraron fotos' : 'No hay fotos en esta carpeta'}
          </h3>
          <p className="text-muted-foreground text-center mb-4">
            {searchTerm
              ? 'Intenta con otros términos de búsqueda'
              : 'Las fotos que subas aparecerán aquí'
            }
          </p>
          <button
            onClick={() => setShowUploadInterface(true)}
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Upload className="h-4 w-4 mr-2" />
            Subir fotos
          </button>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {showLightbox && <Lightbox />}
      </AnimatePresence>

      {/* Drawer */}
      <Drawer />
    </div>
  );
}


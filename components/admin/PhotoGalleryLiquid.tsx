'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderIcon,
  ImageIcon,
  UploadIcon,
  DownloadIcon,
  TrashIcon,
  GridIcon,
  ListIcon,
  CheckIcon,
  XIcon,
  SearchIcon,
  MoreVerticalIcon,
  MoveIcon,
  TagIcon,
  UserIcon,
  User,
  CheckSquareIcon,
  RefreshCw,
  QrCode,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { buildPhotosUrl } from '@/lib/utils/photos-url-builder';
import QRScannerModal, { type StudentInfo } from './QRScannerModal';
import TaggingModal from './TaggingModal';
import { PhotoModal as GalleryPhotoModal } from '@/components/gallery/PhotoModal';
import { SimpleTooltip } from '@/components/ui/tooltip';
// Using CSS liquid glass styles instead of liquid-glass-react library

// Theme Context
import { createContext, useContext, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    // Apply theme to document root for Tailwind dark mode
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme === 'dark' ? 'dark' : ''}>{children}</div>
    </ThemeContext.Provider>
  );
};

// Types adapted for LookEscolar
interface PhotoItem {
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

interface FolderItem {
  id: string;
  name: string;
  school_name?: string;
  photo_count?: number;
  created_at: string;
}

interface CodeRow {
  id: string;
  code: string;
  student_name?: string;
  created_at: string;
}

interface PhotoGalleryLiquidProps {
  initialPhotos?: PhotoItem[];
  initialEvents?: FolderItem[];
  onPhotoUpload?: (files: File[], eventId: string) => Promise<void>;
  onPhotoDelete?: (photoIds: string[]) => Promise<void>;
  onPhotoApprove?: (photoIds: string[], approved: boolean) => Promise<void>;
  onPhotoTag?: (photoId: string, subjectId: string) => Promise<void>;
  onRefresh?: () => void;
  hideSidebar?: boolean;
  externalSelectedEvent?: string | null;
  externalCodeId?: string | null;
  onCountsChanged?: () => void;
  compact?: boolean;
  hideHeader?: boolean;
  viewMode?: 'grid' | 'list';
  selectedPhotos?: string[];
  onPhotosSelected?: (photoIds: string[]) => void;
}

// Liquid Glass Photo Card Component
const LiquidPhotoCard: React.FC<{
  photo: PhotoItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onOpenPreview: () => void;
  onApprove: (id: string) => void;
  onTag: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onMove: (id: string) => void;
  viewMode: 'grid' | 'list';
  handleDragStart?: (photoId: string, e: React.DragEvent) => void;
  handleDragEnd?: () => void;
}> = ({
  photo,
  isSelected,
  onSelect,
  onOpenPreview,
  onApprove,
  onTag,
  onDelete,
  onDownload,
  onMove,
  viewMode,
  handleDragStart,
  handleDragEnd,
}) => {
  const { theme } = useTheme();
  const [imageLoadState, setImageLoadState] = useState<
    'loading' | 'loaded' | 'error'
  >('loading');
  const [isDragging, setIsDragging] = useState(false);

  const statusColor = photo.approved
    ? 'bg-emerald-500'
    : photo.tagged
      ? 'bg-blue-500'
      : 'bg-amber-500';

  const statusText = photo.approved
    ? 'Aprobada'
    : photo.tagged
      ? 'Etiquetada'
      : 'Pendiente';

  const statusTooltip = photo.approved
    ? 'Foto aprobada - Lista para venta y descarga'
    : photo.tagged
      ? 'Foto etiquetada - Asignada a un estudiante pero pendiente de aprobación'
      : 'Foto pendiente - Sin asignar estudiante ni aprobar';

  if (viewMode === 'list') {
    return (
      <div className="group transform cursor-pointer rounded-xl bg-white shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg dark:bg-gray-800">
        <div className="flex items-center space-x-4 p-4">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
            {photo.preview_url ? (
              <img
                src={photo.preview_url}
                alt={photo.original_filename}
                className="h-full w-full rounded-xl object-cover"
                onLoad={() => {
                  console.log('Image loaded:', photo.original_filename);
                  setImageLoadState('loaded');
                }}
                onError={(e) => {
                  console.log('Image error:', photo.original_filename, e);
                  setImageLoadState('error');
                }}
                style={{
                  display: imageLoadState === 'error' ? 'none' : 'block',
                }}
              />
            ) : null}
            {(!photo.preview_url || imageLoadState === 'error') && (
              <ImageIcon size={24} className="text-white/70" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
              {photo.original_filename}
            </h3>
            <div className="mt-1 flex items-center space-x-2">
              <SimpleTooltip text={statusTooltip} side="top">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium text-white ${statusColor}`}
                >
                  {statusText}
                </span>
              </SimpleTooltip>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {Math.round(photo.file_size / 1024)} KB
              </span>
            </div>
          </div>

          {/* Action Buttons - aparecen en hover */}
          <div className="flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <SimpleTooltip text="Mover a carpeta" side="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(photo.id);
                }}
                className="flex h-8 w-8 transform items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-green-600"
              >
                <MoveIcon size={14} />
              </button>
            </SimpleTooltip>
            <SimpleTooltip text="Descargar foto" side="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload();
                }}
                className="flex h-8 w-8 transform items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-blue-600"
              >
                <DownloadIcon size={14} />
              </button>
            </SimpleTooltip>
            <SimpleTooltip text="Eliminar foto" side="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex h-8 w-8 transform items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-red-600"
              >
                <TrashIcon size={14} />
              </button>
            </SimpleTooltip>
          </div>

          {/* Simple Checkbox */}
          <div
            className={`flex h-6 w-6 transform cursor-pointer items-center justify-center rounded-full shadow-sm transition-all hover:scale-110 ${
              isSelected
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(photo.id);
            }}
          >
            {isSelected && <CheckIcon size={14} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="transform cursor-pointer overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 dark:bg-gray-800"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-checkbox]')) {
          onSelect(photo.id);
        } else {
          onOpenPreview();
        }
      }}
    >
      <div className="overflow-hidden">
        <div className="relative aspect-square">
          {/* Simple Checkbox */}
          <div className="absolute left-3 top-3 z-10">
            <div
              className={`flex h-6 w-6 transform cursor-pointer items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/90 text-gray-600 backdrop-blur-sm dark:bg-gray-800/90 dark:text-gray-300'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(photo.id);
              }}
            >
              {isSelected && <CheckIcon size={14} />}
            </div>
          </div>

          {/* Status Badge with Better Contrast */}
          <div className="absolute right-3 top-3 z-10">
            <SimpleTooltip text={statusTooltip} side="left">
              <div
                className={`px-2 py-1 text-xs font-medium text-white ${statusColor} rounded-full shadow-lg`}
              >
                {statusText}
              </div>
            </SimpleTooltip>
          </div>

          {/* Photo Content */}
          <div className="group relative flex h-full w-full items-center justify-center">
            {photo.preview_url ? (
              <img
                src={photo.preview_url}
                alt={photo.original_filename}
                className="h-full w-full object-cover"
                onLoad={() => setImageLoadState('loaded')}
                onError={() => setImageLoadState('error')}
                style={{
                  display: imageLoadState === 'error' ? 'none' : 'block',
                }}
              />
            ) : null}
            {(!photo.preview_url || imageLoadState === 'error') && (
              <div className="liquid-card transform transition-transform duration-300 hover:scale-105">
                <div className="flex h-16 w-16 items-center justify-center p-4">
                  <ImageIcon className="h-full w-full text-white/80 drop-shadow-lg" />
                </div>
              </div>
            )}

            {/* Action Buttons - aparecen en hover */}
            <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <SimpleTooltip text="Mover a carpeta" side="left">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(photo.id);
                  }}
                  className="flex h-8 w-8 transform items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-green-600"
                >
                  <MoveIcon size={14} />
                </button>
              </SimpleTooltip>
              <SimpleTooltip text="Descargar foto" side="left">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload();
                  }}
                  className="flex h-8 w-8 transform items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-blue-600"
                >
                  <DownloadIcon size={14} />
                </button>
              </SimpleTooltip>
              <SimpleTooltip text="Eliminar foto" side="left">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="flex h-8 w-8 transform items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-red-600"
                >
                  <TrashIcon size={14} />
                </button>
              </SimpleTooltip>
            </div>
          </div>
        </div>

        {/* Photo Info with Better Contrast */}
        <div className="rounded-b-2xl bg-white/90 backdrop-blur-sm dark:bg-gray-800/90">
          <div className="p-3">
            <div className="mb-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">
              {photo.original_filename}
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{Math.round(photo.file_size / 1024)} KB</span>
              <span>{new Date(photo.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
const PhotoGalleryLiquid: React.FC<PhotoGalleryLiquidProps> = ({
  initialPhotos = [],
  initialEvents = [],
  onPhotoUpload,
  onPhotoDelete,
  onPhotoApprove,
  onPhotoTag,
  onRefresh,
  hideSidebar = false,
  externalSelectedEvent = null,
  externalCodeId = null,
  onCountsChanged,
  compact = false,
  hideHeader = false,
  viewMode = 'grid',
  selectedPhotos: externalSelectedPhotos,
  onPhotosSelected,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [events, setEvents] = useState<FolderItem[]>(initialEvents);
  // Use external selectedPhotos if provided, otherwise use internal state
  const [internalSelectedPhotos, setInternalSelectedPhotos] = useState<
    string[]
  >([]);
  const selectedPhotos = externalSelectedPhotos || internalSelectedPhotos;
  const setSelectedPhotos = onPhotosSelected || setInternalSelectedPhotos;
  const [selectedEvent, setSelectedEvent] = useState<string | null>(
    externalSelectedEvent
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'approved' | 'pending' | 'tagged'
  >('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // QR Tagging Mode State
  const [isQRTagMode, setIsQRTagMode] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<StudentInfo | null>(
    null
  );
  const [isAssigningPhotos, setIsAssigningPhotos] = useState(false);

  // Manual Tagging State
  const [showTaggingModal, setShowTaggingModal] = useState(false);
  const [taggingPhoto, setTaggingPhoto] = useState<PhotoItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // Move Modal State
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<
    Array<{ id: string; name: string; eventName?: string }>
  >([]);

  // Codes state for move operations
  const [codes, setCodes] = useState<CodeRow[]>([]);

  // Filter options
  const filterOptions = [
    { value: 'all' as const, label: 'Todas' },
    { value: 'approved' as const, label: 'Aprobadas' },
    { value: 'pending' as const, label: 'Pendientes' },
    { value: 'tagged' as const, label: 'Etiquetadas' },
  ];

  // Update photos when initialPhotos changes
  useEffect(() => {
    console.log(
      'PhotoGalleryLiquid: initialPhotos changed',
      initialPhotos.length,
      initialPhotos
    );
    setPhotos(initialPhotos);

    // Clear selection when photos change
    if (selectedPhotos.length > 0) {
      const validSelectedPhotos = selectedPhotos.filter((id) =>
        initialPhotos.some((photo) => photo.id === id)
      );
      if (validSelectedPhotos.length !== selectedPhotos.length) {
        setSelectedPhotos(validSelectedPhotos);
      }
    }
  }, [initialPhotos, selectedPhotos, setSelectedPhotos]);

  // Update events when initialEvents changes
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  // Update selected event when external changes
  useEffect(() => {
    setSelectedEvent(externalSelectedEvent);
  }, [externalSelectedEvent]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    const filtered = photos.filter((photo) => {
      // Search filter
      if (
        searchQuery &&
        !photo.original_filename
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (filterStatus === 'approved' && !photo.approved) return false;
      if (filterStatus === 'pending' && photo.approved) return false;
      if (filterStatus === 'tagged' && !photo.tagged) return false;

      return true;
    });
    console.log(
      'PhotoGalleryLiquid: filteredPhotos',
      filtered.length,
      filtered
    );
    return filtered;
  }, [photos, searchQuery, filterStatus]);

  // Selection handlers
  const handlePhotoSelect = (photoId: string) => {
    setSelectedPhotos((prev: string[]) =>
      prev.includes(photoId)
        ? prev.filter((id: string) => id !== photoId)
        : [...prev, photoId]
    );
  };

  const toggleSelectAll = () => {
    const allVisibleSelected =
      filteredPhotos.length > 0 &&
      filteredPhotos.every((photo) => selectedPhotos.includes(photo.id));

    if (allVisibleSelected) {
      // Deselect all visible
      setSelectedPhotos((prev: string[]) =>
        prev.filter(
          (id: string) => !filteredPhotos.some((photo) => photo.id === id)
        )
      );
    } else {
      // Select all visible
      const visibleIds = filteredPhotos.map((photo) => photo.id);
      setSelectedPhotos((prev: string[]) =>
        Array.from(new Set([...prev, ...visibleIds]))
      );
    }
  };

  const allVisibleSelected =
    filteredPhotos.length > 0 &&
    filteredPhotos.every((photo) => selectedPhotos.includes(photo.id));
  const hasSelection = selectedPhotos.length > 0;
  const selectedCount = selectedPhotos.length;

  // Action handlers
  const handleFabAction = () => {
    if (hasSelection) {
      console.log('Process selected photos:', selectedPhotos);
      toast.success(
        `Procesando ${selectedCount} foto${selectedCount === 1 ? '' : 's'}`
      );
    } else {
      console.log('Upload new photos');
      fileInputRef.current?.click();
    }
  };

  const handleApprove = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo || !onPhotoApprove) return;

    try {
      await onPhotoApprove([photoId], !photo.approved);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, approved: !p.approved } : p
        )
      );
      toast.success(photo.approved ? 'Foto desaprobada' : 'Foto aprobada');
    } catch (error) {
      toast.error('Error al cambiar el estado de aprobación');
    }
  };

  const handleOpenTaggingModal = (photo: PhotoItem) => {
    setTaggingPhoto(photo);
    setShowTaggingModal(true);
  };

  // Load available folders for move operation
  const loadAvailableFolders = async () => {
    try {
      // Obtener carpetas (subjects) y eventos
      const [subjectsResponse, eventsResponse] = await Promise.all([
        fetch('/api/admin/subjects'),
        fetch('/api/admin/events'),
      ]);

      const subjectsData = await subjectsResponse.json();
      const eventsData = await eventsResponse.json();

      const subjects = Array.isArray(subjectsData)
        ? subjectsData
        : subjectsData.data || [];
      const events = Array.isArray(eventsData)
        ? eventsData
        : eventsData.data || [];

      // Crear mapa de eventos para obtener nombres
      const eventMap = new Map(
        events.map((event: any) => [event.id, event.name || event.school])
      );

      // Combinar subjects con información de eventos
      const folders = subjects.map((subject: any) => ({
        id: subject.id,
        name: subject.name || 'Sin nombre',
        eventName: eventMap.get(subject.event_id) || 'Evento desconocido',
        type: 'subject',
      }));

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
      const promises = selectedPhotos.map((photoId) =>
        fetch(`/api/admin/photos/${photoId}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codeId: folderId }),
        })
      );

      await Promise.all(promises);
      setSelectedPhotos([]);
      setShowMoveModal(false);
      toast.success(`${selectedPhotos.length} fotos movidas exitosamente`);
      onRefresh?.();
    } catch (error) {
      toast.error('Error al mover las fotos');
    }
  };

  const handleDownloadPhoto = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo?.preview_url) return;

    try {
      const response = await fetch(photo.preview_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = photo.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Descarga iniciada');
    } catch (error) {
      toast.error('Error al descargar la foto');
    }
  };

  return (
    <div
      className={`liquid-glass-app ${compact ? 'min-h-0' : 'min-h-screen'} ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900' : compact ? 'bg-transparent' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} transition-colors duration-500 ${compact ? '' : 'overflow-hidden'}`}
    >
      {!hideHeader && (
        <>
          {/* Desktop Layout */}
          <div className="hidden lg:block">
            <div className="mx-auto min-h-screen max-w-7xl">
              {/* Header with Liquid Glass */}
              <div className="liquid-card sticky top-0 z-40 w-full">
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center space-x-4">
                    <div className="liquid-button">
                      <div className="flex h-8 w-8 items-center justify-center p-2">
                        <FolderIcon
                          className={`h-full w-full drop-shadow-sm ${
                            theme === 'dark' ? 'text-slate-200' : 'text-white'
                          }`}
                        />
                      </div>
                    </div>
                    <h1
                      className={`text-2xl font-bold drop-shadow-sm ${
                        theme === 'dark' ? 'text-slate-100' : 'text-white'
                      }`}
                    >
                      Galería de Fotos ({filteredPhotos.length})
                    </h1>
                  </div>

                  {/* Theme Toggle */}
                  <div
                    className="liquid-button transform cursor-pointer transition-transform duration-200 hover:scale-110"
                    onClick={toggleTheme}
                  >
                    <div className="flex h-10 w-10 items-center justify-center p-2">
                      {theme === 'dark' ? (
                        <Sun
                          size={20}
                          className="animate-pulse text-yellow-300 drop-shadow-md"
                        />
                      ) : (
                        <Moon size={20} className="text-white drop-shadow-md" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="space-y-4 p-6">
                {/* Search Bar */}
                <div className="liquid-card relative w-full">
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-6">
                      <SearchIcon
                        size={20}
                        className={
                          theme === 'dark' ? 'text-slate-300' : 'text-white/80'
                        }
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar fotos por nombre..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full bg-transparent py-4 pl-14 pr-6 transition-all focus:outline-none ${
                        theme === 'dark'
                          ? 'text-slate-100 placeholder-slate-400 focus:placeholder-slate-500'
                          : 'text-white placeholder-white/70 focus:placeholder-white/50'
                      }`}
                    />
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center justify-center">
                  <div className="liquid-card inline-flex">
                    <div className="flex items-center space-x-1 p-2">
                      {filterOptions.map((filter) => (
                        <div
                          key={filter.value}
                          data-displacement={
                            filterStatus === filter.value ? 12 : 8
                          }
                          data-blur={
                            filterStatus === filter.value ? 0.03 : 0.02
                          }
                          data-saturation={
                            filterStatus === filter.value ? 110 : 100
                          }
                          data-aberration={
                            filterStatus === filter.value ? 0.5 : 0.2
                          }
                          data-elasticity={0.3}
                          data-radius={999}
                          data-light={theme === 'light'}
                          onClick={() => setFilterStatus(filter.value)}
                          className="transform cursor-pointer transition-transform duration-200 hover:scale-105"
                        >
                          <div
                            className={`px-4 py-2 text-sm font-medium transition-all ${
                              filterStatus === filter.value
                                ? theme === 'dark'
                                  ? 'font-semibold text-slate-100 drop-shadow-md'
                                  : 'font-semibold text-white drop-shadow-md'
                                : theme === 'dark'
                                  ? 'text-slate-300 hover:text-slate-100'
                                  : 'text-white/90 hover:text-white'
                            }`}
                          >
                            {filter.label}
                          </div>
                        </div>
                      ))}
                      <div className="ml-2 flex items-center space-x-2">
                        <div
                          data-displacement={8}
                          data-blur={0.02}
                          data-saturation={105}
                          data-elasticity={0.3}
                          data-radius={8}
                          data-light={theme === 'light'}
                          onClick={() =>
                            toast.info(
                              'Controla la vista desde los controles superiores'
                            )
                          }
                          className="transform cursor-pointer transition-transform duration-200 hover:scale-110"
                        >
                          <div className="p-2 text-white/80 transition-colors hover:text-white">
                            <GridIcon size={18} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Select All Toggle */}
                <div className="flex items-center justify-center">
                  <div
                    data-displacement={15}
                    data-blur={0.04}
                    data-saturation={110}
                    data-aberration={0.5}
                    data-elasticity={0.3}
                    data-radius={16}
                    data-light={theme === 'light'}
                    onClick={toggleSelectAll}
                    className="transform cursor-pointer transition-transform duration-200 hover:scale-105"
                  >
                    <div className="flex items-center space-x-3 p-3">
                      <div
                        data-displacement={allVisibleSelected ? 12 : 8}
                        data-blur={0.03}
                        data-saturation={allVisibleSelected ? 115 : 105}
                        data-aberration={allVisibleSelected ? 0.6 : 0.3}
                        data-elasticity={0.3}
                        data-radius={6}
                        data-light={!allVisibleSelected}
                      >
                        <div
                          className={`flex h-6 w-6 items-center justify-center transition-all ${
                            allVisibleSelected
                              ? 'text-purple-600'
                              : theme === 'dark'
                                ? 'border-2 border-slate-300'
                                : 'border-2 border-white/50'
                          }`}
                        >
                          {allVisibleSelected && (
                            <CheckIcon size={14} className="drop-shadow-sm" />
                          )}
                        </div>
                      </div>
                      <span
                        className={`font-medium drop-shadow-sm ${
                          theme === 'dark' ? 'text-slate-200' : 'text-white'
                        }`}
                      >
                        Seleccionar todas
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Photos Grid */}
              <div className="px-6 pb-24 pt-2">
                {filteredPhotos.length > 0 ? (
                  <div
                    className={`grid gap-6 ${
                      viewMode === 'grid'
                        ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
                        : 'mx-auto max-w-4xl grid-cols-1'
                    }`}
                  >
                    <AnimatePresence>
                      {filteredPhotos.map((photo, idx) => (
                        <LiquidPhotoCard
                          key={photo.id}
                          photo={photo}
                          isSelected={selectedPhotos.includes(photo.id)}
                          onSelect={handlePhotoSelect}
                          onOpenPreview={() => {
                            setPreviewIndex(idx);
                            setIsPreviewOpen(true);
                          }}
                          onApprove={handleApprove}
                          onTag={() => handleOpenTaggingModal(photo)}
                          onDownload={() => handleDownloadPhoto(photo.id)}
                          onMove={() => {}}
                          onDelete={async () => {
                            if (
                              confirm('¿Estás seguro de eliminar esta foto?')
                            ) {
                              try {
                                await onPhotoDelete?.([photo.id]);
                                setPhotos((prev) =>
                                  prev.filter((p) => p.id !== photo.id)
                                );
                                toast.success('Foto eliminada');
                              } catch (error) {
                                toast.error('Error al eliminar la foto');
                              }
                            }
                          }}
                          viewMode={viewMode}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div
                    data-displacement={20}
                    data-blur={0.06}
                    data-saturation={105}
                    data-aberration={0.6}
                    data-elasticity={0.3}
                    data-radius={16}
                    data-light={theme === 'light'}
                    className="text-center"
                  >
                    <div className="p-12">
                      <div
                        data-displacement={15}
                        data-blur={0.04}
                        data-saturation={105}
                        data-aberration={0.4}
                        data-elasticity={0.3}
                        data-radius={999}
                        data-light={theme === 'light'}
                        className="mb-4 inline-block"
                      >
                        <div className="flex h-20 w-20 items-center justify-center p-5">
                          <ImageIcon className="h-full w-full text-white/80 drop-shadow-lg" />
                        </div>
                      </div>
                      <h3
                        className={`mb-2 text-xl font-semibold drop-shadow-sm ${
                          theme === 'dark' ? 'text-slate-200' : 'text-white'
                        }`}
                      >
                        No se encontraron fotos
                      </h3>
                      <p
                        className={`drop-shadow-sm ${
                          theme === 'dark' ? 'text-slate-400' : 'text-white/80'
                        }`}
                      >
                        {searchQuery
                          ? `No hay fotos que coincidan con "${searchQuery}".`
                          : 'No hay fotos disponibles con los filtros seleccionados.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="min-h-screen lg:hidden">
            <div className="space-y-4 p-4">
              {/* Mobile Header */}
              <div
                data-displacement={15}
                data-blur={0.04}
                data-saturation={105}
                data-aberration={0.4}
                data-elasticity={0.2}
                data-radius={16}
                data-light={theme === 'light'}
                className="w-full"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3">
                    <div
                      data-displacement={8}
                      data-blur={0.02}
                      data-saturation={100}
                      data-elasticity={0.3}
                      data-radius={8}
                      data-light={theme === 'light'}
                    >
                      <div className="flex h-8 w-8 items-center justify-center p-2">
                        <FolderIcon
                          className={`h-full w-full drop-shadow-sm ${
                            theme === 'dark' ? 'text-slate-200' : 'text-white'
                          }`}
                        />
                      </div>
                    </div>
                    <h1
                      className={`text-lg font-semibold drop-shadow-sm ${
                        theme === 'dark' ? 'text-slate-100' : 'text-white'
                      }`}
                    >
                      Fotos ({filteredPhotos.length})
                    </h1>
                  </div>

                  {/* Theme Toggle */}
                  <div
                    data-displacement={12}
                    data-blur={0.03}
                    data-saturation={110}
                    data-aberration={0.4}
                    data-elasticity={0.3}
                    data-radius={8}
                    data-light={theme === 'light'}
                    onClick={toggleTheme}
                    className="transform cursor-pointer transition-transform duration-200 hover:scale-110"
                  >
                    <div className="flex h-8 w-8 items-center justify-center p-2">
                      {theme === 'dark' ? (
                        <Sun
                          size={16}
                          className="animate-pulse text-yellow-300 drop-shadow-md"
                        />
                      ) : (
                        <Moon size={16} className="text-white drop-shadow-md" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Search */}
              <div
                data-displacement={12}
                data-blur={0.04}
                data-saturation={105}
                data-aberration={0.3}
                data-elasticity={0.2}
                data-radius={999}
                data-light={theme === 'light'}
                className="relative w-full"
              >
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4">
                    <SearchIcon
                      size={16}
                      className={
                        theme === 'dark' ? 'text-slate-300' : 'text-white/80'
                      }
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar fotos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full bg-transparent py-3 pl-12 pr-4 text-sm transition-all focus:outline-none ${
                      theme === 'dark'
                        ? 'text-slate-100 placeholder-slate-400 focus:placeholder-slate-500'
                        : 'text-white placeholder-white/70 focus:placeholder-white/50'
                    }`}
                  />
                </div>
              </div>

              {/* Mobile Filter Pills */}
              <div className="flex items-center justify-center">
                <div
                  data-displacement={15}
                  data-blur={0.03}
                  data-saturation={105}
                  data-aberration={0.4}
                  data-elasticity={0.2}
                  data-radius={999}
                  data-light={theme === 'light'}
                  className="inline-flex"
                >
                  <div className="flex items-center space-x-1 p-2">
                    {filterOptions.map((filter) => (
                      <div
                        key={filter.value}
                        data-displacement={
                          filterStatus === filter.value ? 10 : 6
                        }
                        data-blur={0.02}
                        data-saturation={
                          filterStatus === filter.value ? 110 : 100
                        }
                        data-aberration={
                          filterStatus === filter.value ? 0.4 : 0.2
                        }
                        data-elasticity={0.3}
                        data-radius={999}
                        data-light={theme === 'light'}
                        onClick={() => setFilterStatus(filter.value)}
                        className="transform cursor-pointer transition-transform duration-200 hover:scale-105"
                      >
                        <div
                          className={`px-3 py-2 text-xs font-medium transition-all ${
                            filterStatus === filter.value
                              ? theme === 'dark'
                                ? 'font-semibold text-slate-100 drop-shadow-md'
                                : 'font-semibold text-white drop-shadow-md'
                              : theme === 'dark'
                                ? 'text-slate-300 hover:text-slate-100'
                                : 'text-white/90 hover:text-white'
                          }`}
                        >
                          {filter.label}
                        </div>
                      </div>
                    ))}
                    <div className="ml-2">
                      <div
                        data-displacement={6}
                        data-blur={0.02}
                        data-saturation={105}
                        data-elasticity={0.3}
                        data-radius={8}
                        data-light={theme === 'light'}
                        onClick={() =>
                          toast.info(
                            'Controla la vista desde los controles superiores'
                          )
                        }
                        className="transform cursor-pointer transition-transform duration-200 hover:scale-110"
                      >
                        <div className="p-2 text-white/80 transition-colors hover:text-white">
                          <GridIcon size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Select All */}
              <div className="flex items-center justify-center">
                <div
                  data-displacement={12}
                  data-blur={0.03}
                  data-saturation={110}
                  data-aberration={0.4}
                  data-elasticity={0.3}
                  data-radius={16}
                  data-light={theme === 'light'}
                  onClick={toggleSelectAll}
                  className="transform cursor-pointer transition-transform duration-200 hover:scale-105"
                >
                  <div className="flex items-center space-x-3 p-3">
                    <div
                      data-displacement={allVisibleSelected ? 8 : 6}
                      data-blur={0.02}
                      data-saturation={allVisibleSelected ? 115 : 105}
                      data-aberration={allVisibleSelected ? 0.5 : 0.3}
                      data-elasticity={0.3}
                      data-radius={6}
                      data-light={!allVisibleSelected}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center transition-all ${
                          allVisibleSelected
                            ? 'text-purple-600'
                            : theme === 'dark'
                              ? 'border-2 border-slate-300'
                              : 'border-2 border-white/50'
                        }`}
                      >
                        {allVisibleSelected && (
                          <CheckIcon size={12} className="drop-shadow-sm" />
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium drop-shadow-sm ${
                        theme === 'dark' ? 'text-slate-200' : 'text-white'
                      }`}
                    >
                      Seleccionar todas
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile Photos Grid */}
              <div className="pb-20">
                {filteredPhotos.length > 0 ? (
                  <div
                    className={`grid gap-3 ${
                      viewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-1'
                    }`}
                  >
                    <AnimatePresence>
                      {filteredPhotos.map((photo, idx) => (
                        <LiquidPhotoCard
                          key={photo.id}
                          photo={photo}
                          isSelected={selectedPhotos.includes(photo.id)}
                          onSelect={handlePhotoSelect}
                          onOpenPreview={() => {
                            setPreviewIndex(idx);
                            setIsPreviewOpen(true);
                          }}
                          onApprove={handleApprove}
                          onTag={() => handleOpenTaggingModal(photo)}
                          onDownload={() => handleDownloadPhoto(photo.id)}
                          onMove={() => {}}
                          onDelete={async () => {
                            if (
                              confirm('¿Estás seguro de eliminar esta foto?')
                            ) {
                              try {
                                await onPhotoDelete?.([photo.id]);
                                setPhotos((prev) =>
                                  prev.filter((p) => p.id !== photo.id)
                                );
                                toast.success('Foto eliminada');
                              } catch (error) {
                                toast.error('Error al eliminar la foto');
                              }
                            }
                          }}
                          viewMode={viewMode}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div
                    data-displacement={15}
                    data-blur={0.05}
                    data-saturation={105}
                    data-aberration={0.5}
                    data-elasticity={0.3}
                    data-radius={16}
                    data-light={theme === 'light'}
                    className="text-center"
                  >
                    <div className="p-8">
                      <div
                        data-displacement={12}
                        data-blur={0.03}
                        data-saturation={105}
                        data-aberration={0.4}
                        data-elasticity={0.3}
                        data-radius={999}
                        data-light={theme === 'light'}
                        className="mb-4 inline-block"
                      >
                        <div className="flex h-16 w-16 items-center justify-center p-4">
                          <ImageIcon className="h-full w-full text-white/80 drop-shadow-lg" />
                        </div>
                      </div>
                      <h3
                        className={`mb-2 font-medium drop-shadow-sm ${
                          theme === 'dark' ? 'text-slate-200' : 'text-white'
                        }`}
                      >
                        No se encontraron fotos
                      </h3>
                      <p
                        className={`text-sm drop-shadow-sm ${
                          theme === 'dark' ? 'text-slate-400' : 'text-white/80'
                        }`}
                      >
                        {searchQuery
                          ? `No hay fotos que coincidan con "${searchQuery}".`
                          : 'No hay fotos disponibles con los filtros seleccionados.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Compact Gallery (when header is hidden) */}
      {hideHeader && (
        <div className="p-4">
          {filteredPhotos.length > 0 ? (
            <div
              className={`grid gap-3 ${
                viewMode === 'grid'
                  ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
                  : 'mx-auto max-w-4xl grid-cols-1'
              }`}
            >
              <AnimatePresence>
                {filteredPhotos.map((photo, idx) => (
                  <LiquidPhotoCard
                    key={photo.id}
                    photo={photo}
                    isSelected={selectedPhotos.includes(photo.id)}
                    onSelect={handlePhotoSelect}
                    onOpenPreview={() => {
                      setPreviewIndex(idx);
                      setIsPreviewOpen(true);
                    }}
                    onApprove={handleApprove}
                    onTag={() => handleOpenTaggingModal(photo)}
                    onDownload={() => handleDownloadPhoto(photo.id)}
                    onMove={() => {}}
                    onDelete={async () => {
                      if (confirm('¿Estás seguro de eliminar esta foto?')) {
                        try {
                          await onPhotoDelete?.([photo.id]);
                          setPhotos((prev) =>
                            prev.filter((p) => p.id !== photo.id)
                          );
                          toast.success('Foto eliminada');
                        } catch (error) {
                          toast.error('Error al eliminar la foto');
                        }
                      }
                    }}
                    viewMode={viewMode}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="inline-block rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 p-4 dark:bg-gray-700">
                  <ImageIcon className="h-full w-full text-gray-400" />
                </div>
                <h3 className="mb-2 font-medium text-gray-800 dark:text-gray-200">
                  No se encontraron fotos
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {searchQuery
                    ? `No hay fotos que coincidan con "${searchQuery}".`
                    : 'No hay fotos disponibles con los filtros seleccionados.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simple Liquid Glass FAB */}
      <div className="fixed bottom-6 right-6 z-50">
        <div
          data-displacement={hasSelection ? 25 : 20}
          data-blur={0.08}
          data-saturation={hasSelection ? 110 : 105}
          data-aberration={hasSelection ? 0.8 : 0.6}
          data-elasticity={0.1}
          data-radius={999}
          data-light={false}
          onClick={handleFabAction}
          className="flex h-16 w-16 transform cursor-pointer items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
          style={{
            background: hasSelection
              ? 'linear-gradient(135deg, #10b981, #059669, #047857)'
              : 'linear-gradient(135deg, #3b82f6, #2563eb, #1d4ed8)',
            boxShadow: hasSelection
              ? `0 20px 40px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
              : `0 20px 40px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
          }}
        >
          <div className="relative z-10 text-white">
            {hasSelection ? (
              <div className="flex animate-pulse flex-col items-center justify-center">
                <div
                  data-displacement={8}
                  data-blur={0.02}
                  data-saturation={105}
                  data-aberration={0.3}
                  data-elasticity={0.3}
                  data-radius={4}
                  data-light={true}
                  className="mb-1"
                >
                  <CheckIcon size={18} className="text-white drop-shadow-lg" />
                </div>
                {selectedCount > 0 && (
                  <div
                    data-displacement={6}
                    data-blur={0.02}
                    data-saturation={105}
                    data-aberration={0.2}
                    data-elasticity={0.3}
                    data-radius={999}
                    data-light={false}
                  >
                    <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-bold backdrop-blur-sm">
                      {selectedCount > 99 ? '99+' : selectedCount}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                data-displacement={8}
                data-blur={0.02}
                data-saturation={105}
                data-aberration={0.3}
                data-elasticity={0.3}
                data-radius={6}
                data-light={true}
              >
                <UploadIcon size={20} className="drop-shadow-lg" />
              </div>
            )}
          </div>

          {/* Animated glow effect */}
          <div
            className={`absolute inset-0 -z-10 rounded-full opacity-0 transition-opacity duration-300 hover:opacity-100 ${
              hasSelection
                ? 'bg-gradient-to-br from-emerald-300/30 to-emerald-600/30'
                : 'bg-gradient-to-br from-blue-300/30 to-blue-600/30'
            } scale-150 animate-pulse blur-xl`}
          />
        </div>
      </div>

      {/* File input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0 && onPhotoUpload && selectedEvent) {
            setIsUploading(true);
            try {
              await onPhotoUpload(files, selectedEvent);
              toast.success(
                `${files.length} foto${files.length === 1 ? '' : 's'} subida${files.length === 1 ? '' : 's'}`
              );
            } catch (error) {
              toast.error('Error al subir las fotos');
            } finally {
              setIsUploading(false);
            }
          }
        }}
      />

      {/* Modals */}
      {showTaggingModal && taggingPhoto && (
        <TaggingModal
          photo={taggingPhoto}
          isOpen={showTaggingModal}
          onClose={() => {
            setShowTaggingModal(false);
            setTaggingPhoto(null);
          }}
          onPhotoTag={onPhotoTag}
        />
      )}

      {/* Floating Selection Bar */}
      {selectedPhotos.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="flex items-center gap-4 rounded-full border border-gray-200 bg-white px-6 py-3 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <CheckSquareIcon className="h-4 w-4" />
              <span>
                {selectedPhotos.length} seleccionada
                {selectedPhotos.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowMoveModal(true);
                  loadAvailableFolders();
                }}
                className="h-8 px-3 text-xs"
              >
                <MoveIcon className="mr-1 h-3 w-3" />
                Mover
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await onPhotoApprove?.(selectedPhotos, true);
                    setSelectedPhotos([]);
                    toast.success(`${selectedPhotos.length} fotos aprobadas`);
                    onRefresh?.();
                  } catch (error) {
                    toast.error('Error al aprobar fotos');
                  }
                }}
                className="h-8 border-green-300 px-3 text-xs text-green-700 hover:bg-green-50"
              >
                <CheckIcon className="mr-1 h-3 w-3" />
                Aprobar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await onPhotoApprove?.(selectedPhotos, false);
                    setSelectedPhotos([]);
                    toast.success(
                      `${selectedPhotos.length} fotos marcadas como pendientes`
                    );
                    onRefresh?.();
                  } catch (error) {
                    toast.error('Error al cambiar estado');
                  }
                }}
                className="h-8 border-yellow-300 px-3 text-xs text-yellow-700 hover:bg-yellow-50"
              >
                <XIcon className="mr-1 h-3 w-3" />
                Rechazar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Implement assign to subject
                  toast.info('Función "Asignar sujeto" próximamente');
                }}
                className="h-8 px-3 text-xs"
              >
                <TagIcon className="mr-1 h-3 w-3" />
                Asignar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (
                    confirm(
                      `¿Eliminar ${selectedPhotos.length} fotos seleccionadas?`
                    )
                  ) {
                    try {
                      await onPhotoDelete?.(selectedPhotos);
                      setSelectedPhotos([]);
                      toast.success(
                        `${selectedPhotos.length} fotos eliminadas`
                      );
                      onRefresh?.();
                    } catch (error) {
                      toast.error('Error al eliminar fotos');
                    }
                  }
                }}
                className="h-8 border-red-300 px-3 text-xs text-red-700 hover:bg-red-50"
              >
                <TrashIcon className="mr-1 h-3 w-3" />
                Eliminar
              </Button>
            </div>

            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPhotos([])}
              className="h-8 px-2 text-xs text-gray-500 hover:text-gray-700"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      )}

      {isPreviewOpen && filteredPhotos.length > 0 && (
        <GalleryPhotoModal
          photo={
            filteredPhotos[previewIndex]
              ? {
                  id: filteredPhotos[previewIndex].id,
                  storage_path:
                    filteredPhotos[previewIndex].watermark_path ||
                    filteredPhotos[previewIndex].preview_path ||
                    filteredPhotos[previewIndex].storage_path,
                  width: filteredPhotos[previewIndex].width || null,
                  height: filteredPhotos[previewIndex].height || null,
                  created_at: filteredPhotos[previewIndex].created_at,
                }
              : null
          }
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onPrevious={() =>
            setPreviewIndex((prev) =>
              prev > 0 ? prev - 1 : filteredPhotos.length - 1
            )
          }
          onNext={() =>
            setPreviewIndex((prev) =>
              prev < filteredPhotos.length - 1 ? prev + 1 : 0
            )
          }
          currentIndex={previewIndex}
          totalPhotos={filteredPhotos.length}
        />
      )}

      {showQRScanner && (
        <QRScannerModal
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onStudentScanned={(student) => {
            setCurrentStudent(student);
            setShowQRScanner(false);
          }}
        />
      )}

      {/* Move Photos Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
            <div className="border-b border-gray-200 p-6 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Mover {selectedPhotos.length} foto
                {selectedPhotos.length !== 1 ? 's' : ''}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Selecciona una carpeta de destino
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto p-6">
              {availableFolders.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <FolderIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">No hay carpetas disponibles</p>
                  <p className="text-xs">Crea carpetas desde el sidebar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Option to move to "Sin carpeta" */}
                  <button
                    onClick={() => handleMovePhotos('null')}
                    className="w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-orange-300 hover:bg-orange-50"
                  >
                    <div className="flex items-center gap-3">
                      <FolderIcon className="h-5 w-5 text-orange-600" />
                      <div>
                        <div className="font-medium text-gray-900">
                          Sin carpeta
                        </div>
                        <div className="text-xs text-gray-500">
                          Mover a fotos no organizadas
                        </div>
                      </div>
                    </div>
                  </button>

                  {availableFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleMovePhotos(folder.id)}
                      className="w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                    >
                      <div className="flex items-center gap-3">
                        <FolderIcon className="h-5 w-5 text-blue-600" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-gray-900">
                            {folder.name}
                          </div>
                          {folder.eventName && (
                            <div className="truncate text-xs text-gray-500">
                              {folder.eventName}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setShowMoveModal(false)}
                className="px-4 py-2"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapper with ThemeProvider
const PhotoGalleryLiquidWrapper: React.FC<PhotoGalleryLiquidProps> = (
  props
) => {
  return (
    <ThemeProvider>
      <PhotoGalleryLiquid {...props} />
    </ThemeProvider>
  );
};

export default PhotoGalleryLiquidWrapper;

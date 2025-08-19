'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { buildPhotosUrl } from "@/lib/utils/photos-url-builder";
import QRScannerModal, { type StudentInfo } from "./QRScannerModal";
import TaggingModal from "./TaggingModal";
import { PhotoModal as GalleryPhotoModal } from "@/components/gallery/PhotoModal";
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
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme === 'dark' ? 'dark' : ''}>
        {children}
      </div>
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
  handleDragEnd 
}) => {
  const { theme } = useTheme();
  const [imageLoadState, setImageLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
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

  if (viewMode === 'list') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg cursor-pointer transform hover:scale-[1.02] transition-all duration-300">
        <div className="p-4 flex items-center space-x-4">
          <div className="relative w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center overflow-hidden">
            {photo.preview_url ? (
              <img
                src={photo.preview_url}
                alt={photo.original_filename}
                className="w-full h-full object-cover rounded-xl"
                onLoad={() => {
                  console.log('Image loaded:', photo.original_filename);
                  setImageLoadState('loaded');
                }}
                onError={(e) => {
                  console.log('Image error:', photo.original_filename, e);
                  setImageLoadState('error');
                }}
                style={{ display: imageLoadState === 'error' ? 'none' : 'block' }}
              />
            ) : null}
            {(!photo.preview_url || imageLoadState === 'error') && (
              <ImageIcon size={24} className="text-white/70" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate text-gray-800 dark:text-gray-200">
              {photo.original_filename}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${statusColor}`}>
                {statusText}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {Math.round(photo.file_size / 1024)} KB
              </span>
            </div>
          </div>

          {/* Simple Checkbox */}
          <div 
            className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transform hover:scale-110 transition-all shadow-sm ${
              isSelected 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(photo.id);
            }}
          >
            {isSelected && (
              <CheckIcon size={14} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl cursor-pointer transform hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
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
          <div className="absolute top-3 left-3 z-10">
            <div 
              className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transform hover:scale-110 transition-all shadow-lg ${
                isSelected 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 backdrop-blur-sm'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(photo.id);
              }}
            >
              {isSelected && (
                <CheckIcon size={14} />
              )}
            </div>
          </div>

          {/* Status Badge with Better Contrast */}
          <div className="absolute top-3 right-3 z-10">
            <div className={`px-2 py-1 text-white text-xs font-medium ${statusColor} rounded-full shadow-lg`}>
              {statusText}
            </div>
          </div>

          {/* Photo Content */}
          <div className="w-full h-full flex items-center justify-center relative">
            {photo.preview_url ? (
              <img
                src={photo.preview_url}
                alt={photo.original_filename}
                className="w-full h-full object-cover"
                onLoad={() => setImageLoadState('loaded')}
                onError={() => setImageLoadState('error')}
                style={{ display: imageLoadState === 'error' ? 'none' : 'block' }}
              />
            ) : null}
            {(!photo.preview_url || imageLoadState === 'error') && (
              <div className="liquid-card transform hover:scale-105 transition-transform duration-300">
                <div className="w-16 h-16 flex items-center justify-center p-4">
                  <ImageIcon className="w-full h-full text-white/80 drop-shadow-lg" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Photo Info with Better Contrast */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-b-2xl">
          <div className="p-3">
            <div className="font-medium text-sm mb-1 truncate text-gray-800 dark:text-gray-200">
              {photo.original_filename}
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{Math.round(photo.file_size / 1024)} KB</span>
              <span>
                {new Date(photo.created_at).toLocaleDateString()}
              </span>
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
}) => {
  const { theme, toggleTheme } = useTheme();
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [events, setEvents] = useState<FolderItem[]>(initialEvents);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(externalSelectedEvent);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'tagged'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // QR Tagging Mode State
  const [isQRTagMode, setIsQRTagMode] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<StudentInfo | null>(null);
  const [isAssigningPhotos, setIsAssigningPhotos] = useState(false);

  // Manual Tagging State
  const [showTaggingModal, setShowTaggingModal] = useState(false);
  const [taggingPhoto, setTaggingPhoto] = useState<PhotoItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

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
    console.log('PhotoGalleryLiquid: initialPhotos changed', initialPhotos.length, initialPhotos);
    setPhotos(initialPhotos);
  }, [initialPhotos]);

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
    const filtered = photos.filter(photo => {
      // Search filter
      if (searchQuery && !photo.original_filename.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Status filter
      if (filterStatus === 'approved' && !photo.approved) return false;
      if (filterStatus === 'pending' && photo.approved) return false;
      if (filterStatus === 'tagged' && !photo.tagged) return false;

      return true;
    });
    console.log('PhotoGalleryLiquid: filteredPhotos', filtered.length, filtered);
    return filtered;
  }, [photos, searchQuery, filterStatus]);

  // Selection handlers
  const handlePhotoSelect = (photoId: string) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const toggleSelectAll = () => {
    const allVisibleSelected = filteredPhotos.length > 0 && 
      filteredPhotos.every(photo => selectedPhotos.includes(photo.id));
    
    if (allVisibleSelected) {
      // Deselect all visible
      setSelectedPhotos(prev => prev.filter(id => !filteredPhotos.some(photo => photo.id === id)));
    } else {
      // Select all visible
      const visibleIds = filteredPhotos.map(photo => photo.id);
      setSelectedPhotos(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const allVisibleSelected = filteredPhotos.length > 0 && 
    filteredPhotos.every(photo => selectedPhotos.includes(photo.id));
  const hasSelection = selectedPhotos.length > 0;
  const selectedCount = selectedPhotos.length;

  // Action handlers
  const handleFabAction = () => {
    if (hasSelection) {
      console.log('Process selected photos:', selectedPhotos);
      toast.success(`Procesando ${selectedCount} foto${selectedCount === 1 ? '' : 's'}`);
    } else {
      console.log('Upload new photos');
      fileInputRef.current?.click();
    }
  };

  const handleApprove = async (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo || !onPhotoApprove) return;

    try {
      await onPhotoApprove([photoId], !photo.approved);
      setPhotos(prev => prev.map(p => 
        p.id === photoId ? { ...p, approved: !p.approved } : p
      ));
      toast.success(photo.approved ? 'Foto desaprobada' : 'Foto aprobada');
    } catch (error) {
      toast.error('Error al cambiar el estado de aprobación');
    }
  };

  const handleOpenTaggingModal = (photo: PhotoItem) => {
    setTaggingPhoto(photo);
    setShowTaggingModal(true);
  };

  const handleDownloadPhoto = async (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
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
    <div className={`liquid-glass-app ${compact ? 'min-h-0' : 'min-h-screen'} ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900' : compact ? 'bg-transparent' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} transition-colors duration-500 ${compact ? '' : 'overflow-hidden'}`}>
      
      {!hideHeader && (
        <>
          {/* Desktop Layout */}
          <div className="hidden lg:block">
            <div className="max-w-7xl mx-auto min-h-screen">
              
              {/* Header with Liquid Glass */}
              <div className="liquid-card w-full sticky top-0 z-40">
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center space-x-4">
                    <div className="liquid-button">
                      <div className="w-8 h-8 flex items-center justify-center p-2">
                        <FolderIcon className={`w-full h-full drop-shadow-sm ${
                          theme === 'dark' ? 'text-slate-200' : 'text-white'
                        }`} />
                      </div>
                    </div>
                    <h1 className={`text-2xl font-bold drop-shadow-sm ${
                      theme === 'dark' ? 'text-slate-100' : 'text-white'
                    }`}>
                      Galería de Fotos ({filteredPhotos.length})
                    </h1>
                  </div>
                  
                  {/* Theme Toggle */}
                  <div 
                    className="liquid-button cursor-pointer transform hover:scale-110 transition-transform duration-200"
                    onClick={toggleTheme}
                  >
                    <div className="w-10 h-10 flex items-center justify-center p-2">
                      {theme === 'dark' ? (
                        <Sun size={20} className="text-yellow-300 drop-shadow-md animate-pulse" />
                      ) : (
                        <Moon size={20} className="text-white drop-shadow-md" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="p-6 space-y-4">
                
                {/* Search Bar */}
                <div className="liquid-card w-full relative">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none z-10">
                      <SearchIcon size={20} className={theme === 'dark' ? 'text-slate-300' : 'text-white/80'} />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar fotos por nombre..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-14 pr-6 py-4 bg-transparent focus:outline-none transition-all ${
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
                          data-displacement={filterStatus === filter.value ? 12 : 8}
                          data-blur={filterStatus === filter.value ? 0.03 : 0.02}
                          data-saturation={filterStatus === filter.value ? 110 : 100}
                          data-aberration={filterStatus === filter.value ? 0.5 : 0.2}
                          data-elasticity={0.3}
                          data-radius={999}
                          data-light={theme === 'light'}
                          onClick={() => setFilterStatus(filter.value)}
                          className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
                        >
                          <div className={`px-4 py-2 text-sm font-medium transition-all ${
                            filterStatus === filter.value
                              ? (theme === 'dark' ? 'text-slate-100 drop-shadow-md font-semibold' : 'text-white drop-shadow-md font-semibold')
                              : (theme === 'dark' ? 'text-slate-300 hover:text-slate-100' : 'text-white/90 hover:text-white')
                          }`}>
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
                          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                          className="cursor-pointer transform hover:scale-110 transition-transform duration-200"
                        >
                          <div className="p-2 text-white/80 hover:text-white transition-colors">
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
                    className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
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
                        <div className={`w-6 h-6 flex items-center justify-center transition-all ${
                          allVisibleSelected
                            ? 'text-purple-600'
                            : (theme === 'dark' ? 'border-2 border-slate-300' : 'border-2 border-white/50')
                        }`}>
                          {allVisibleSelected && <CheckIcon size={14} className="drop-shadow-sm" />}
                        </div>
                      </div>
                      <span className={`font-medium drop-shadow-sm ${
                        theme === 'dark' ? 'text-slate-200' : 'text-white'
                      }`}>Seleccionar todas</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Photos Grid */}
              <div className="px-6 pb-24 pt-2">
                {filteredPhotos.length > 0 ? (
                  <div className={`grid gap-6 ${
                    viewMode === 'grid' 
                      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6' 
                      : 'grid-cols-1 max-w-4xl mx-auto'
                  }`}>
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
                                setPhotos(prev => prev.filter(p => p.id !== photo.id));
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
                        className="inline-block mb-4"
                      >
                        <div className="w-20 h-20 flex items-center justify-center p-5">
                          <ImageIcon className="w-full h-full text-white/80 drop-shadow-lg" />
                        </div>
                      </div>
                      <h3 className={`text-xl font-semibold mb-2 drop-shadow-sm ${
                        theme === 'dark' ? 'text-slate-200' : 'text-white'
                      }`}>No se encontraron fotos</h3>
                      <p className={`drop-shadow-sm ${
                        theme === 'dark' ? 'text-slate-400' : 'text-white/80'
                      }`}>
                        {searchQuery ? 
                          `No hay fotos que coincidan con "${searchQuery}".` :
                          'No hay fotos disponibles con los filtros seleccionados.'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden min-h-screen">
            <div className="p-4 space-y-4">
              
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
                      <div className="w-8 h-8 flex items-center justify-center p-2">
                        <FolderIcon className={`w-full h-full drop-shadow-sm ${
                          theme === 'dark' ? 'text-slate-200' : 'text-white'
                        }`} />
                      </div>
                    </div>
                    <h1 className={`text-lg font-semibold drop-shadow-sm ${
                      theme === 'dark' ? 'text-slate-100' : 'text-white'
                    }`}>Fotos ({filteredPhotos.length})</h1>
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
                    className="cursor-pointer transform hover:scale-110 transition-transform duration-200"
                  >
                    <div className="w-8 h-8 flex items-center justify-center p-2">
                      {theme === 'dark' ? (
                        <Sun size={16} className="text-yellow-300 drop-shadow-md animate-pulse" />
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
                className="w-full relative"
              >
                                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <SearchIcon size={16} className={theme === 'dark' ? 'text-slate-300' : 'text-white/80'} />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar fotos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-12 pr-4 py-3 bg-transparent focus:outline-none transition-all text-sm ${
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
                        data-displacement={filterStatus === filter.value ? 10 : 6}
                        data-blur={0.02}
                        data-saturation={filterStatus === filter.value ? 110 : 100}
                        data-aberration={filterStatus === filter.value ? 0.4 : 0.2}
                        data-elasticity={0.3}
                        data-radius={999}
                        data-light={theme === 'light'}
                        onClick={() => setFilterStatus(filter.value)}
                        className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
                      >
                        <div className={`px-3 py-2 text-xs font-medium transition-all ${
                          filterStatus === filter.value
                            ? (theme === 'dark' ? 'text-slate-100 drop-shadow-md font-semibold' : 'text-white drop-shadow-md font-semibold')
                            : (theme === 'dark' ? 'text-slate-300 hover:text-slate-100' : 'text-white/90 hover:text-white')
                        }`}>
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
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        className="cursor-pointer transform hover:scale-110 transition-transform duration-200"
                      >
                        <div className="p-2 text-white/80 hover:text-white transition-colors">
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
                  className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
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
                      <div className={`w-5 h-5 flex items-center justify-center transition-all ${
                        allVisibleSelected
                          ? 'text-purple-600'
                          : (theme === 'dark' ? 'border-2 border-slate-300' : 'border-2 border-white/50')
                      }`}>
                        {allVisibleSelected && <CheckIcon size={12} className="drop-shadow-sm" />}
                      </div>
                    </div>
                    <span className={`text-sm font-medium drop-shadow-sm ${
                      theme === 'dark' ? 'text-slate-200' : 'text-white'
                    }`}>Seleccionar todas</span>
                  </div>
                </div>
              </div>

              {/* Mobile Photos Grid */}
              <div className="pb-20">
                {filteredPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
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
                                setPhotos(prev => prev.filter(p => p.id !== photo.id));
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
                        className="inline-block mb-4"
                      >
                        <div className="w-16 h-16 flex items-center justify-center p-4">
                          <ImageIcon className="w-full h-full text-white/80 drop-shadow-lg" />
                        </div>
                      </div>
                      <h3 className={`font-medium mb-2 drop-shadow-sm ${
                        theme === 'dark' ? 'text-slate-200' : 'text-white'
                      }`}>No se encontraron fotos</h3>
                      <p className={`text-sm drop-shadow-sm ${
                        theme === 'dark' ? 'text-slate-400' : 'text-white/80'
                      }`}>
                        {searchQuery ? 
                          `No hay fotos que coincidan con "${searchQuery}".` :
                          'No hay fotos disponibles con los filtros seleccionados.'
                        }
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
            <div className={`grid gap-3 ${
              viewMode === 'grid' 
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6' 
                : 'grid-cols-1 max-w-4xl mx-auto'
            }`}>
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
                          setPhotos(prev => prev.filter(p => p.id !== photo.id));
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
            <div className="text-center py-12">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 inline-block">
                <div className="w-16 h-16 flex items-center justify-center p-4 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                  <ImageIcon className="w-full h-full text-gray-400" />
                </div>
                <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                  No se encontraron fotos
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {searchQuery ? 
                    `No hay fotos que coincidan con "${searchQuery}".` :
                    'No hay fotos disponibles con los filtros seleccionados.'
                  }
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
          className="cursor-pointer transform hover:scale-110 active:scale-95 transition-all duration-300 w-16 h-16 flex items-center justify-center shadow-2xl"
          style={{
            background: hasSelection 
              ? 'linear-gradient(135deg, #10b981, #059669, #047857)' 
              : 'linear-gradient(135deg, #3b82f6, #2563eb, #1d4ed8)',
            boxShadow: hasSelection
              ? `0 20px 40px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
              : `0 20px 40px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
          }}
        >
          <div className="text-white relative z-10">
            {hasSelection ? (
              <div className="flex flex-col items-center justify-center animate-pulse">
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
                  <CheckIcon size={18} className="drop-shadow-lg text-white" />
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
                    <span className="text-xs font-bold px-1.5 py-0.5 bg-white/20 rounded-full backdrop-blur-sm">
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
          <div className={`absolute inset-0 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-300 -z-10 ${
            hasSelection 
              ? 'bg-gradient-to-br from-emerald-300/30 to-emerald-600/30' 
              : 'bg-gradient-to-br from-blue-300/30 to-blue-600/30'
          } blur-xl scale-150 animate-pulse`} />
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
              toast.success(`${files.length} foto${files.length === 1 ? '' : 's'} subida${files.length === 1 ? '' : 's'}`);
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

      {isPreviewOpen && filteredPhotos.length > 0 && (
        <GalleryPhotoModal
          photo={filteredPhotos[previewIndex] ? {
            id: filteredPhotos[previewIndex].id,
            storage_path: filteredPhotos[previewIndex].storage_path,
            width: filteredPhotos[previewIndex].width || null,
            height: filteredPhotos[previewIndex].height || null,
            created_at: filteredPhotos[previewIndex].created_at,
            signed_url: filteredPhotos[previewIndex].preview_url || ''
          } : null}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onPrevious={() => setPreviewIndex(prev => prev > 0 ? prev - 1 : filteredPhotos.length - 1)}
          onNext={() => setPreviewIndex(prev => prev < filteredPhotos.length - 1 ? prev + 1 : 0)}
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
    </div>
  );
};

// Wrapper with ThemeProvider
const PhotoGalleryLiquidWrapper: React.FC<PhotoGalleryLiquidProps> = (props) => {
  return (
    <ThemeProvider>
      <PhotoGalleryLiquid {...props} />
    </ThemeProvider>
  );
};

export default PhotoGalleryLiquidWrapper;

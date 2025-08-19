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
import { PhotoModal as PublicPhotoModal } from "@/components/public/PhotoModal";
import LiquidGlass from 'liquid-glass-react';

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
      <LiquidGlass 
        displacementScale={15}
        blurAmount={0.04}
        saturation={105}
        aberrationIntensity={0.4}
        elasticity={0.2}
        cornerRadius={12}
        overLight={theme === 'light'}
        className="cursor-pointer transform hover:scale-[1.02] transition-transform duration-300"
      >
        <div className="p-4 flex items-center space-x-4">
          <div className="relative w-16 h-16 bg-gradient-to-br from-white/10 to-white/5 rounded-xl flex items-center justify-center">
            {photo.preview_url && imageLoadState === 'loaded' ? (
              <img
                src={photo.preview_url}
                alt={photo.original_filename}
                className="w-full h-full object-cover rounded-xl"
                onLoad={() => setImageLoadState('loaded')}
                onError={() => setImageLoadState('error')}
              />
            ) : (
              <ImageIcon size={24} className="text-white/70" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-sm truncate drop-shadow-sm">
              {photo.original_filename}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${statusColor}`}>
                {statusText}
              </span>
              <span className="text-white/70 text-xs">{Math.round(photo.file_size / 1024)} KB</span>
            </div>
          </div>

          {/* Liquid Glass Checkbox */}
          <LiquidGlass 
            displacementScale={isSelected ? 12 : 8}
            blurAmount={0.03}
            saturation={isSelected ? 115 : 105}
            aberrationIntensity={isSelected ? 0.6 : 0.3}
            elasticity={0.3}
            cornerRadius={6}
            overLight={!isSelected}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(photo.id);
            }}
            className="cursor-pointer transform hover:scale-110 transition-transform"
          >
            <div className="w-6 h-6 flex items-center justify-center p-1">
              {isSelected && (
                <CheckIcon size={14} className="text-purple-600 drop-shadow-md animate-pulse" />
              )}
            </div>
          </LiquidGlass>
        </div>
      </LiquidGlass>
    );
  }

  return (
    <LiquidGlass 
      displacementScale={25}
      blurAmount={0.06}
      saturation={105}
      aberrationIntensity={0.8}
      elasticity={0.2}
      cornerRadius={16}
      overLight={theme === 'light'}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-checkbox]')) {
          onSelect(photo.id);
        } else {
          onOpenPreview();
        }
      }}
      className="cursor-pointer transform hover:scale-105 active:scale-95 transition-transform duration-300"
    >
      <div className="overflow-hidden">
        <div className="relative aspect-square">
          {/* Liquid Glass Checkbox */}
          <div className="absolute top-3 left-3 z-10">
            <LiquidGlass 
              displacementScale={isSelected ? 12 : 8}
              blurAmount={isSelected ? 0.03 : 0.02}
              saturation={isSelected ? 115 : 105}
              aberrationIntensity={isSelected ? 0.6 : 0.3}
              elasticity={0.3}
              cornerRadius={6}
              overLight={!isSelected}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(photo.id);
              }}
              className="cursor-pointer transform hover:scale-110 transition-transform"
            >
              <div data-checkbox className="w-6 h-6 flex items-center justify-center p-1">
                {isSelected && (
                  <CheckIcon size={14} className="text-purple-600 drop-shadow-md animate-pulse" />
                )}
              </div>
            </LiquidGlass>
          </div>

          {/* Liquid Glass Status Badge */}
          <div className="absolute top-3 right-3 z-10">
            <LiquidGlass 
              displacementScale={10}
              blurAmount={0.02}
              saturation={110}
              aberrationIntensity={0.4}
              elasticity={0.3}
              cornerRadius={999}
              overLight={false}
            >
              <div className={`px-3 py-1 text-white text-xs font-semibold ${statusColor} rounded-full`}>
                {statusText}
              </div>
            </LiquidGlass>
          </div>

          {/* Photo Content */}
          <div className="w-full h-full flex items-center justify-center relative">
            {photo.preview_url && imageLoadState === 'loaded' ? (
              <img
                src={photo.preview_url}
                alt={photo.original_filename}
                className="w-full h-full object-cover"
                onLoad={() => setImageLoadState('loaded')}
                onError={() => setImageLoadState('error')}
              />
            ) : (
              <LiquidGlass 
                displacementScale={15}
                blurAmount={0.04}
                saturation={105}
                aberrationIntensity={0.5}
                elasticity={0.3}
                cornerRadius={12}
                overLight={theme === 'light'}
                className="transform hover:scale-105 transition-transform duration-300"
              >
                <div className="w-16 h-16 flex items-center justify-center p-4">
                  <ImageIcon className="w-full h-full text-white/80 drop-shadow-lg" />
                </div>
              </LiquidGlass>
            )}
          </div>
        </div>

        {/* Photo Info with Liquid Glass */}
        <LiquidGlass 
          displacementScale={12}
          blurAmount={0.03}
          saturation={105}
          aberrationIntensity={0.4}
          elasticity={0.2}
          cornerRadius={0}
          overLight={theme === 'light'}
        >
          <div className="p-3">
            <div className="text-white font-medium text-sm mb-1 drop-shadow-sm truncate">
              {photo.original_filename}
            </div>
            <div className="flex justify-between text-white/80 text-xs">
              <span className="drop-shadow-sm">{Math.round(photo.file_size / 1024)} KB</span>
              <span className="drop-shadow-sm">
                {new Date(photo.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </LiquidGlass>
      </div>
    </LiquidGlass>
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
    return photos.filter(photo => {
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
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600'} transition-colors duration-500 overflow-hidden`}>
      
      {!hideHeader && (
        <>
          {/* Desktop Layout */}
          <div className="hidden lg:block">
            <div className="max-w-7xl mx-auto min-h-screen">
              
              {/* Header with Liquid Glass */}
              <LiquidGlass 
                displacementScale={20}
                blurAmount={0.05}
                saturation={100}
                aberrationIntensity={0.5}
                elasticity={0.2}
                cornerRadius={0}
                overLight={theme === 'light'}
                className="w-full sticky top-0 z-40"
              >
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center space-x-4">
                    <LiquidGlass 
                      displacementScale={10}
                      blurAmount={0.02}
                      saturation={100}
                      elasticity={0.3}
                      cornerRadius={8}
                      overLight={theme === 'light'}
                    >
                      <div className="w-8 h-8 flex items-center justify-center p-2">
                        <FolderIcon className="w-full h-full text-white drop-shadow-sm" />
                      </div>
                    </LiquidGlass>
                    <h1 className="text-white text-2xl font-bold drop-shadow-sm">
                      Galería de Fotos ({filteredPhotos.length})
                    </h1>
                  </div>
                  
                  {/* Theme Toggle */}
                  <LiquidGlass 
                    displacementScale={15}
                    blurAmount={0.03}
                    saturation={110}
                    aberrationIntensity={0.5}
                    elasticity={0.3}
                    cornerRadius={8}
                    overLight={theme === 'light'}
                    onClick={toggleTheme}
                    className="cursor-pointer transform hover:scale-110 transition-transform duration-200"
                  >
                    <div className="w-10 h-10 flex items-center justify-center p-2">
                      {theme === 'dark' ? (
                        <Sun size={20} className="text-yellow-300 drop-shadow-md animate-pulse" />
                      ) : (
                        <Moon size={20} className="text-white drop-shadow-md" />
                      )}
                    </div>
                  </LiquidGlass>
                </div>
              </LiquidGlass>

              {/* Search and Filters */}
              <div className="p-6 space-y-4">
                
                {/* Search Bar */}
                <LiquidGlass 
                  displacementScale={15}
                  blurAmount={0.05}
                  saturation={105}
                  aberrationIntensity={0.3}
                  elasticity={0.2}
                  cornerRadius={999}
                  overLight={theme === 'light'}
                  className="w-full relative"
                >
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none z-10">
                      <SearchIcon size={20} className="text-white/80 drop-shadow-sm" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar fotos por nombre..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-transparent text-white placeholder-white/70 focus:outline-none focus:placeholder-white/50 transition-all"
                    />
                  </div>
                </LiquidGlass>

                {/* Filter Pills */}
                <div className="flex items-center justify-center">
                  <LiquidGlass 
                    displacementScale={18}
                    blurAmount={0.04}
                    saturation={105}
                    aberrationIntensity={0.4}
                    elasticity={0.2}
                    cornerRadius={999}
                    overLight={theme === 'light'}
                    className="inline-flex"
                  >
                    <div className="flex items-center space-x-1 p-2">
                      {filterOptions.map((filter) => (
                        <LiquidGlass 
                          key={filter.value}
                          displacementScale={filterStatus === filter.value ? 12 : 8}
                          blurAmount={filterStatus === filter.value ? 0.03 : 0.02}
                          saturation={filterStatus === filter.value ? 110 : 100}
                          aberrationIntensity={filterStatus === filter.value ? 0.5 : 0.2}
                          elasticity={0.3}
                          cornerRadius={999}
                          overLight={theme === 'light'}
                          onClick={() => setFilterStatus(filter.value)}
                          className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
                        >
                          <div className={`px-4 py-2 text-sm font-medium transition-all ${
                            filterStatus === filter.value
                              ? 'text-white drop-shadow-md font-semibold'
                              : 'text-white/90 hover:text-white'
                          }`}>
                            {filter.label}
                          </div>
                        </LiquidGlass>
                      ))}
                      <div className="ml-2 flex items-center space-x-2">
                        <LiquidGlass 
                          displacementScale={8}
                          blurAmount={0.02}
                          saturation={105}
                          elasticity={0.3}
                          cornerRadius={8}
                          overLight={theme === 'light'}
                          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                          className="cursor-pointer transform hover:scale-110 transition-transform duration-200"
                        >
                          <div className="p-2 text-white/80 hover:text-white transition-colors">
                            <GridIcon size={18} />
                          </div>
                        </LiquidGlass>
                      </div>
                    </div>
                  </LiquidGlass>
                </div>

                {/* Select All Toggle */}
                <div className="flex items-center justify-center">
                  <LiquidGlass 
                    displacementScale={15}
                    blurAmount={0.04}
                    saturation={110}
                    aberrationIntensity={0.5}
                    elasticity={0.3}
                    cornerRadius={16}
                    overLight={theme === 'light'}
                    onClick={toggleSelectAll}
                    className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
                  >
                    <div className="flex items-center space-x-3 p-3">
                      <LiquidGlass 
                        displacementScale={allVisibleSelected ? 12 : 8}
                        blurAmount={0.03}
                        saturation={allVisibleSelected ? 115 : 105}
                        aberrationIntensity={allVisibleSelected ? 0.6 : 0.3}
                        elasticity={0.3}
                        cornerRadius={6}
                        overLight={!allVisibleSelected}
                      >
                        <div className={`w-6 h-6 flex items-center justify-center transition-all ${
                          allVisibleSelected
                            ? 'text-purple-600'
                            : 'border-2 border-white/50'
                        }`}>
                          {allVisibleSelected && <CheckIcon size={14} className="drop-shadow-sm" />}
                        </div>
                      </LiquidGlass>
                      <span className="text-white font-medium drop-shadow-sm">Seleccionar todas</span>
                    </div>
                  </LiquidGlass>
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
                  <LiquidGlass 
                    displacementScale={20}
                    blurAmount={0.06}
                    saturation={105}
                    aberrationIntensity={0.6}
                    elasticity={0.3}
                    cornerRadius={16}
                    overLight={theme === 'light'}
                    className="text-center"
                  >
                    <div className="p-12">
                      <LiquidGlass 
                        displacementScale={15}
                        blurAmount={0.04}
                        saturation={105}
                        aberrationIntensity={0.4}
                        elasticity={0.3}
                        cornerRadius={999}
                        overLight={theme === 'light'}
                        className="inline-block mb-4"
                      >
                        <div className="w-20 h-20 flex items-center justify-center p-5">
                          <ImageIcon className="w-full h-full text-white/80 drop-shadow-lg" />
                        </div>
                      </LiquidGlass>
                      <h3 className="text-white text-xl font-semibold mb-2 drop-shadow-sm">No se encontraron fotos</h3>
                      <p className="text-white/80 drop-shadow-sm">
                        {searchQuery ? 
                          `No hay fotos que coincidan con "${searchQuery}".` :
                          'No hay fotos disponibles con los filtros seleccionados.'
                        }
                      </p>
                    </div>
                  </LiquidGlass>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden min-h-screen">
            <div className="p-4 space-y-4">
              
              {/* Mobile Header */}
              <LiquidGlass 
                displacementScale={15}
                blurAmount={0.04}
                saturation={105}
                aberrationIntensity={0.4}
                elasticity={0.2}
                cornerRadius={16}
                overLight={theme === 'light'}
                className="w-full"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3">
                    <LiquidGlass 
                      displacementScale={8}
                      blurAmount={0.02}
                      saturation={100}
                      elasticity={0.3}
                      cornerRadius={8}
                      overLight={theme === 'light'}
                    >
                      <div className="w-8 h-8 flex items-center justify-center p-2">
                        <FolderIcon className="w-full h-full text-white drop-shadow-sm" />
                      </div>
                    </LiquidGlass>
                    <h1 className="text-white text-lg font-semibold drop-shadow-sm">Fotos ({filteredPhotos.length})</h1>
                  </div>
                  
                  {/* Theme Toggle */}
                  <LiquidGlass 
                    displacementScale={12}
                    blurAmount={0.03}
                    saturation={110}
                    aberrationIntensity={0.4}
                    elasticity={0.3}
                    cornerRadius={8}
                    overLight={theme === 'light'}
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
                  </LiquidGlass>
                </div>
              </LiquidGlass>

              {/* Mobile Search */}
              <LiquidGlass 
                displacementScale={12}
                blurAmount={0.04}
                saturation={105}
                aberrationIntensity={0.3}
                elasticity={0.2}
                cornerRadius={999}
                overLight={theme === 'light'}
                className="w-full relative"
              >
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <SearchIcon size={16} className="text-white/80 drop-shadow-sm" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar fotos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-transparent text-white placeholder-white/70 focus:outline-none focus:placeholder-white/50 transition-all text-sm"
                  />
                </div>
              </LiquidGlass>

              {/* Mobile Filter Pills */}
              <div className="flex items-center justify-center">
                <LiquidGlass 
                  displacementScale={15}
                  blurAmount={0.03}
                  saturation={105}
                  aberrationIntensity={0.4}
                  elasticity={0.2}
                  cornerRadius={999}
                  overLight={theme === 'light'}
                  className="inline-flex"
                >
                  <div className="flex items-center space-x-1 p-2">
                    {filterOptions.map((filter) => (
                      <LiquidGlass 
                        key={filter.value}
                        displacementScale={filterStatus === filter.value ? 10 : 6}
                        blurAmount={0.02}
                        saturation={filterStatus === filter.value ? 110 : 100}
                        aberrationIntensity={filterStatus === filter.value ? 0.4 : 0.2}
                        elasticity={0.3}
                        cornerRadius={999}
                        overLight={theme === 'light'}
                        onClick={() => setFilterStatus(filter.value)}
                        className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
                      >
                        <div className={`px-3 py-2 text-xs font-medium transition-all ${
                          filterStatus === filter.value
                            ? 'text-white drop-shadow-md font-semibold'
                            : 'text-white/90 hover:text-white'
                        }`}>
                          {filter.label}
                        </div>
                      </LiquidGlass>
                    ))}
                    <div className="ml-2">
                      <LiquidGlass 
                        displacementScale={6}
                        blurAmount={0.02}
                        saturation={105}
                        elasticity={0.3}
                        cornerRadius={8}
                        overLight={theme === 'light'}
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        className="cursor-pointer transform hover:scale-110 transition-transform duration-200"
                      >
                        <div className="p-2 text-white/80 hover:text-white transition-colors">
                          <GridIcon size={14} />
                        </div>
                      </LiquidGlass>
                    </div>
                  </div>
                </LiquidGlass>
              </div>

              {/* Mobile Select All */}
              <div className="flex items-center justify-center">
                <LiquidGlass 
                  displacementScale={12}
                  blurAmount={0.03}
                  saturation={110}
                  aberrationIntensity={0.4}
                  elasticity={0.3}
                  cornerRadius={16}
                  overLight={theme === 'light'}
                  onClick={toggleSelectAll}
                  className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
                >
                  <div className="flex items-center space-x-3 p-3">
                    <LiquidGlass 
                      displacementScale={allVisibleSelected ? 8 : 6}
                      blurAmount={0.02}
                      saturation={allVisibleSelected ? 115 : 105}
                      aberrationIntensity={allVisibleSelected ? 0.5 : 0.3}
                      elasticity={0.3}
                      cornerRadius={6}
                      overLight={!allVisibleSelected}
                    >
                      <div className={`w-5 h-5 flex items-center justify-center transition-all ${
                        allVisibleSelected
                          ? 'text-purple-600'
                          : 'border-2 border-white/50'
                      }`}>
                        {allVisibleSelected && <CheckIcon size={12} className="drop-shadow-sm" />}
                      </div>
                    </LiquidGlass>
                    <span className="text-white text-sm font-medium drop-shadow-sm">Seleccionar todas</span>
                  </div>
                </LiquidGlass>
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
                  <LiquidGlass 
                    displacementScale={15}
                    blurAmount={0.05}
                    saturation={105}
                    aberrationIntensity={0.5}
                    elasticity={0.3}
                    cornerRadius={16}
                    overLight={theme === 'light'}
                    className="text-center"
                  >
                    <div className="p-8">
                      <LiquidGlass 
                        displacementScale={12}
                        blurAmount={0.03}
                        saturation={105}
                        aberrationIntensity={0.4}
                        elasticity={0.3}
                        cornerRadius={999}
                        overLight={theme === 'light'}
                        className="inline-block mb-4"
                      >
                        <div className="w-16 h-16 flex items-center justify-center p-4">
                          <ImageIcon className="w-full h-full text-white/80 drop-shadow-lg" />
                        </div>
                      </LiquidGlass>
                      <h3 className="text-white font-medium mb-2 drop-shadow-sm">No se encontraron fotos</h3>
                      <p className="text-white/80 text-sm drop-shadow-sm">
                        {searchQuery ? 
                          `No hay fotos que coincidan con "${searchQuery}".` :
                          'No hay fotos disponibles con los filtros seleccionados.'
                        }
                      </p>
                    </div>
                  </LiquidGlass>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Simple Liquid Glass FAB */}
      <div className="fixed bottom-6 right-6 z-50">
        <LiquidGlass 
          displacementScale={hasSelection ? 25 : 20}
          blurAmount={0.08}
          saturation={hasSelection ? 110 : 105}
          aberrationIntensity={hasSelection ? 0.8 : 0.6}
          elasticity={0.1}
          cornerRadius={999}
          overLight={false}
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
                <LiquidGlass 
                  displacementScale={8}
                  blurAmount={0.02}
                  saturation={105}
                  aberrationIntensity={0.3}
                  elasticity={0.3}
                  cornerRadius={4}
                  overLight={true}
                  className="mb-1"
                >
                  <CheckIcon size={18} className="drop-shadow-lg text-white" />
                </LiquidGlass>
                {selectedCount > 0 && (
                  <LiquidGlass 
                    displacementScale={6}
                    blurAmount={0.02}
                    saturation={105}
                    aberrationIntensity={0.2}
                    elasticity={0.3}
                    cornerRadius={999}
                    overLight={false}
                  >
                    <span className="text-xs font-bold px-1.5 py-0.5 bg-white/20 rounded-full backdrop-blur-sm">
                      {selectedCount > 99 ? '99+' : selectedCount}
                    </span>
                  </LiquidGlass>
                )}
              </div>
            ) : (
              <LiquidGlass 
                displacementScale={8}
                blurAmount={0.02}
                saturation={105}
                aberrationIntensity={0.3}
                elasticity={0.3}
                cornerRadius={6}
                overLight={true}
              >
                <UploadIcon size={20} className="drop-shadow-lg" />
              </LiquidGlass>
            )}
          </div>
          
          {/* Animated glow effect */}
          <div className={`absolute inset-0 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-300 -z-10 ${
            hasSelection 
              ? 'bg-gradient-to-br from-emerald-300/30 to-emerald-600/30' 
              : 'bg-gradient-to-br from-blue-300/30 to-blue-600/30'
          } blur-xl scale-150 animate-pulse`} />
        </LiquidGlass>
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
        <PublicPhotoModal
          photos={filteredPhotos.map(p => ({ ...p, url: p.preview_url || '' }))}
          currentIndex={previewIndex}
          onClose={() => setIsPreviewOpen(false)}
          onIndexChange={setPreviewIndex}
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

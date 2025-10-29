'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  Grid3X3,
  List,
  Filter,
  Search,
  MoreVertical,
  Camera,
  X,
  RotateCcw,
  Check,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';
import { clsx } from 'clsx';

interface Photo {
  id: string;
  url?: string;
  thumbnail?: string;
  preview_url?: string;
  filename: string;
  size: number;
  uploadedAt: Date;
  eventId?: string;
  eventName?: string;
  studentName?: string;
  tags?: string[];
  status: 'approved' | 'pending' | 'rejected';
  dimensions?: { width: number; height: number };
}

interface MobilePhotoGalleryProps {
  photos: Photo[];
  onPhotoSelect?: (photo: Photo) => void;
  onPhotoEdit?: (photo: Photo) => void;
  onPhotoDelete?: (photo: Photo) => void;
  onBulkAction?: (action: string, photos: Photo[]) => void;
  selectedPhotos?: string[];
  onSelectionChange?: (photoIds: string[]) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'date' | 'name' | 'size' | 'event';

export default function MobilePhotoGallery({
  photos,
  onPhotoEdit,
  onPhotoDelete,
  onBulkAction,
  selectedPhotos = [],
  onSelectionChange,
  className,
}: MobilePhotoGalleryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showPhotoActions, setShowPhotoActions] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter and sort photos
  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = searchTerm === '' ||
      photo.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.studentName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = selectedFilter === 'all' || photo.status === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  const sortedPhotos = [...filteredPhotos].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      case 'name':
        return a.filename.localeCompare(b.filename);
      case 'size':
        return b.size - a.size;
      case 'event':
        return (a.eventName || '').localeCompare(b.eventName || '');
      default:
        return 0;
    }
  });

  const handlePhotoClick = (photo: Photo, index: number) => {
    if (isSelectionMode) {
      togglePhotoSelection(photo.id);
    } else {
      setCurrentPhotoIndex(index);
      setShowLightbox(true);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = selectedPhotos.includes(photoId)
      ? selectedPhotos.filter(id => id !== photoId)
      : [...selectedPhotos, photoId];

    onSelectionChange?.(newSelection);
  };

  const handleBulkAction = (action: string) => {
    const selectedPhotoObjects = photos.filter(photo => selectedPhotos.includes(photo.id));
    onBulkAction?.(action, selectedPhotoObjects);
    setIsSelectionMode(false);
    onSelectionChange?.([]);
  };

  const formatFileSize = (bytes: number | undefined | null) => {
    if (bytes == null || bytes === undefined || isNaN(bytes)) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (date: Date | string | undefined | null) => {
    if (!date) {
      return 'Fecha no disponible';
    }

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return 'Fecha no válida';
      }

      return dateObj.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Fecha no disponible';
    }
  };


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
          'bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden',
          'transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/40 hover:-translate-y-0.5 active:scale-98', // Refined touch feedback
          'min-h-[120px]', // Minimum height for better touch targets
          isSelected && 'ring-2 ring-blue-500 shadow-lg shadow-blue-100/50 bg-blue-50/30'
        )}
        onClick={() => handlePhotoClick(photo, index)}
      >
        {/* Selection indicator premium */}
        {isSelectionMode && (
          <div className="absolute top-3 left-3 z-10">
            <div className={clsx(
              'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200',
              isSelected
                ? 'bg-primary-600 border-primary-600 scale-110 shadow-lg'
                : 'bg-background border-border hover:border-primary-300'
            )}>
              {isSelected && <Check className="h-3 w-3 text-foreground" />}
            </div>
          </div>
        )}

        {/* Photo thumbnail premium */}
        <div className={clsx(
          'relative overflow-hidden',
          viewMode === 'grid' ? 'w-full h-full' : 'w-20 h-20 flex-shrink-0'
        )}>
          <img
            src={photo.preview_url || photo.thumbnail || '/placeholder-image.svg'}
            alt={photo.filename}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== '/placeholder-image.svg') {
                target.src = '/placeholder-image.svg';
              }
            }}
          />

          {/* Status badge premium */}
          <div className="absolute top-2 right-2">
            <div className={clsx(
              'w-5 h-5 rounded-full backdrop-blur-sm shadow-sm flex items-center justify-center',
              photo.status === 'approved' ? 'bg-green-500/90' :
              photo.status === 'pending' ? 'bg-yellow-500/90' : 'bg-red-500/90'
            )}>
              {photo.status === 'approved' && <CheckCircle2 className="h-3 w-3 text-foreground" />}
              {photo.status === 'pending' && <Clock className="h-3 w-3 text-foreground" />}
              {photo.status === 'rejected' && <X className="h-3 w-3 text-foreground" />}
            </div>
          </div>

          {/* Overlay gradient for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>

        {/* Photo info (list view) premium */}
        {viewMode === 'list' && (
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate text-base">{photo.filename}</h3>
            <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-1">
              <span className="font-medium">{formatFileSize(photo.size)}</span>
              <span className="text-muted-foreground">•</span>
              <span>{formatDate(photo.uploadedAt)}</span>
            </div>
            {photo.eventName && (
              <p className="text-xs text-muted-foreground truncate mt-1 bg-muted px-2 py-1 rounded-full w-fit">
                {photo.eventName}
              </p>
            )}
            {photo.studentName && (
              <p className="text-xs text-blue-600 truncate mt-1">
                👤 {photo.studentName}
              </p>
            )}
          </div>
        )}

        {/* Actions menu premium */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPhotoActions(showPhotoActions === photo.id ? null : photo.id);
            }}
            className="p-2 rounded-full bg-black/60 backdrop-blur-sm text-foreground hover:bg-black/80 shadow-lg transition-all duration-200 scale-90 group-hover:scale-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {/* Actions dropdown premium */}
        <AnimatePresence>
          {showPhotoActions === photo.id && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50"
                onClick={() => setShowPhotoActions(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-12 right-3 z-50 bg-popover/95 backdrop-blur-lg border border-border/50 rounded-xl shadow-2xl p-2 min-w-[180px]"
              >
                <button
                  onClick={() => {
                    onPhotoEdit?.(photo);
                    setShowPhotoActions(null);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm hover:bg-accent/80 rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Editar foto</span>
                </button>
                <button
                  onClick={() => {
                    onPhotoDelete?.(photo);
                    setShowPhotoActions(null);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm hover:bg-accent/80 rounded-lg transition-colors text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="font-medium">Eliminar</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const Lightbox = () => {
    const currentPhoto = sortedPhotos[currentPhotoIndex];

    if (!currentPhoto) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          {/* Navigation arrows premium */}
          {sortedPhotos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPhotoIndex(prev => Math.max(0, prev - 1));
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-surface/10 backdrop-blur-md text-foreground hover:bg-surface/20 transition-all duration-200 shadow-2xl border border-border/20"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPhotoIndex(prev => Math.min(sortedPhotos.length - 1, prev + 1));
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-surface/10 backdrop-blur-md text-foreground hover:bg-surface/20 transition-all duration-200 shadow-2xl border border-border/20"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}

          {/* Close button premium */}
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-6 right-6 p-4 rounded-full bg-surface/10 backdrop-blur-md text-foreground hover:bg-surface/20 transition-all duration-200 shadow-2xl border border-border/20"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Photo counter premium */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-surface/10 backdrop-blur-md text-foreground px-4 py-2 rounded-full text-sm font-medium border border-border/20">
            {currentPhotoIndex + 1} / {sortedPhotos.length}
          </div>

          {/* Photo container premium */}
          <motion.div
            key={currentPhoto.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="max-w-[90vw] max-h-[80vh] relative rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              // Enhanced swipe detection
              if (info.offset.x > 100 && currentPhotoIndex > 0) {
                setCurrentPhotoIndex(prev => prev - 1);
              } else if (info.offset.x < -100 && currentPhotoIndex < sortedPhotos.length - 1) {
                setCurrentPhotoIndex(prev => prev + 1);
              }
            }}
            whileDrag={{ scale: 0.98 }}
          >
            <img
              src={currentPhoto.url || currentPhoto.preview_url}
              alt={currentPhoto.filename}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              style={{ filter: 'contrast(1.05) brightness(1.02)' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== '/placeholder-image.svg') {
                  target.src = '/placeholder-image.svg';
                }
              }}
            />

            {/* Photo info overlay premium */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-6"
            >
              <div className="text-foreground space-y-4 max-w-4xl mx-auto">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-3 leading-tight">{currentPhoto.filename}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="bg-surface/15 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/20">
                        {formatFileSize(currentPhoto.size)}
                      </span>
                      <span className="bg-surface/15 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/20">
                        {formatDate(currentPhoto.uploadedAt)}
                      </span>
                      {currentPhoto.eventName && (
                        <span className="bg-blue-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-blue-100 border border-blue-400/30">
                          📅 {currentPhoto.eventName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center space-x-2">
                    <div className={clsx(
                      'w-5 h-5 rounded-full backdrop-blur-sm shadow-lg flex items-center justify-center border-2',
                      currentPhoto.status === 'approved' ? 'bg-green-500/90 border-green-400/50' :
                      currentPhoto.status === 'pending' ? 'bg-amber-500/90 border-amber-400/50' : 'bg-red-500/90 border-red-400/50'
                    )}>
                      {currentPhoto.status === 'approved' && <CheckCircle2 className="h-3 w-3 text-foreground" />}
                      {currentPhoto.status === 'pending' && <Clock className="h-3 w-3 text-foreground" />}
                      {currentPhoto.status === 'rejected' && <X className="h-3 w-3 text-foreground" />}
                    </div>
                    <span className="text-sm font-semibold capitalize bg-surface/15 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/20">
                      {currentPhoto.status === 'approved' ? '✓ Aprobada' :
                       currentPhoto.status === 'pending' ? '⏳ Pendiente' : '✗ Rechazada'}
                    </span>
                  </div>
                </div>

                {currentPhoto.studentName && (
                  <div className="pt-3 border-t border-border/20">
                    <p className="text-blue-100 flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">👤 {currentPhoto.studentName}</span>
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // Loading state premium
  if (photos.length === 0 && !searchTerm) {
    return (
      <div className="flex items-center justify-center py-12 min-h-[60vh]">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-border border-t-primary-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-12 w-12 border-2 border-transparent border-r-primary-400 animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Cargando galería</h3>
          <p className="text-muted-foreground">Obteniendo tus fotos más recientes...</p>
        </div>
      </div>
    );
  }

  // Error state premium
  if (photos.length === 0 && searchTerm) {
    return (
      <div className="flex items-center justify-center py-12 min-h-[60vh]">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-red-900 mb-3">Error al cargar fotos</h3>
            <p className="text-red-700 mb-6 leading-relaxed">
              No se pudieron cargar las fotos. Esto puede deberse a problemas de conexión o permisos.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-red-600 hover:bg-red-700 text-foreground font-medium py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <RotateCcw className="h-5 w-5" />
                <span>Reintentar</span>
              </button>
              <button
                onClick={() => {
                  // Clear search and try again
                  setSearchTerm('');
                  window.location.reload();
                }}
                className="w-full bg-muted hover:bg-muted text-foreground font-medium py-3 px-6 rounded-xl transition-colors duration-200"
              >
                Limpiar búsqueda
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('w-full min-h-screen bg-background', className)}>
      {/* Mobile Header Premium - Refined Design */}
      <div className="sticky top-0 z-30 border-b border-border/80 bg-surface/95 shadow-sm backdrop-blur-xl dark:bg-surface/90">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-foreground tracking-tight">📸 Galería de Fotos</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {sortedPhotos.length} foto{sortedPhotos.length !== 1 ? 's' : ''}
                {searchTerm && (
                  <span className="font-medium text-primary"> • "{searchTerm}"</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="rounded-xl p-2.5 text-muted-foreground transition-colors duration-200 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Filter className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="rounded-xl p-2.5 text-muted-foreground transition-colors duration-200 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid3X3 className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Metrics Bar - More Compact */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 bg-gradient-to-r from-blue-50 to-blue-100/50 px-3 py-1.5 rounded-full">
                <Camera className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-bold text-blue-700">{sortedPhotos.length}</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-gradient-to-r from-green-50 to-green-100/50 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-bold text-green-700">
                  {sortedPhotos.filter(p => p.status === 'approved').length}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-50 to-amber-100/50 px-3 py-1.5 rounded-full">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-bold text-amber-700">
                  {sortedPhotos.filter(p => p.status === 'pending').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar - Modern Design */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="🔍 Buscar fotos por nombre, evento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-12 py-3.5 bg-muted/80 border border-border rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-card transition-all duration-200 placeholder:text-muted-foreground"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
              if (isSelectionMode) onSelectionChange?.([]);
            }}
            className={clsx(
              'px-4 py-2 rounded-lg transition-colors font-medium',
              isSelectionMode
                ? 'bg-primary-600 text-foreground'
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

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">Todas las fotos</option>
                  <option value="approved">Aprobadas</option>
                  <option value="pending">Pendientes</option>
                  <option value="rejected">Rechazadas</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="date">Por fecha</option>
                  <option value="name">Por nombre</option>
                  <option value="size">Por tamaño</option>
                  <option value="event">Por evento</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk actions premium */}
      <AnimatePresence>
        {isSelectionMode && selectedPhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-6 shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-base font-semibold text-blue-900">
                    {selectedPhotos.length} foto{selectedPhotos.length > 1 ? 's' : ''} seleccionada{selectedPhotos.length > 1 ? 's' : ''}
                  </span>
                  <p className="text-sm text-blue-700">¿Qué acción quieres realizar?</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-foreground text-sm font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Aprobar</span>
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-foreground text-sm font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Eliminar</span>
                </button>
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    onSelectionChange?.([]);
                  }}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-muted hover:bg-muted text-foreground text-sm font-medium rounded-xl transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                  <span>Cancelar</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {sortedPhotos.length} foto{sortedPhotos.length !== 1 ? 's' : ''}
          {searchTerm && ` para "${searchTerm}"`}
        </span>
        {selectedPhotos.length > 0 && (
          <span>{selectedPhotos.length} seleccionada{selectedPhotos.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Photos grid/list - Mobile optimized */}
      <div
        ref={scrollRef}
        className={clsx(
          'overflow-y-auto pb-6 px-4',
          viewMode === 'grid'
            ? 'grid grid-cols-2 gap-3' // Optimized gaps for mobile
            : 'space-y-4' // More space between items in list view
        )}
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        <AnimatePresence mode="popLayout">
          {sortedPhotos.map((photo, index) => (
            <PhotoCard key={photo.id} photo={photo} index={index} />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state premium */}
      {sortedPhotos.length === 0 && (
        <div className="flex items-center justify-center py-20 min-h-[60vh]">
          <div className="text-center max-w-sm mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative mb-8"
            >
              <div className="w-32 h-32 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-blue-100/50">
                <Camera className="h-16 w-16 text-blue-500" />
              </div>
              <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <span className="text-foreground font-bold text-lg">📷</span>
              </div>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-foreground mb-4"
            >
              {searchTerm ? '🔍 No se encontraron fotos' : '📸 Galería vacía'}
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground mb-8 leading-relaxed text-base"
            >
              {searchTerm
                ? 'No encontramos fotos que coincidan con tu búsqueda. Intenta con otros términos o verifica la ortografía.'
                : 'Aún no tienes fotos en tu galería. ¡Sube tus primeras fotos para comenzar a organizarlas y crear recuerdos inolvidables!'
              }
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <button
                onClick={() => {
                  // Simulate upload action
                  console.log('Upload photos');
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-foreground font-semibold py-4 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Camera className="h-5 w-5" />
                <span>📤 Subir fotos</span>
              </button>

              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="w-full bg-muted hover:bg-muted text-foreground font-medium py-3.5 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Limpiar búsqueda</span>
                </button>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {showLightbox && <Lightbox />}
      </AnimatePresence>
    </div>
  );
}

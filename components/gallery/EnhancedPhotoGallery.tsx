'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useLayoutEffect,
} from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Search,
  Filter,
  Grid,
  List,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Download,
  Share2,
  Heart,
  ShoppingCart,
  X,
  Loader2,
  ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePhotoGalleryOptimized } from '@/hooks/usePhotoGalleryOptimized';
import { VirtualizedPhotoGrid } from '@/components/ui/virtualized-photo-grid';

// Types
interface Photo {
  id: string;
  original_filename: string;
  preview_url?: string;
  file_size: number;
  created_at: string;
  approved: boolean;
  tagged: boolean;
  width?: number;
  height?: number;
}

interface EnhancedPhotoGalleryProps {
  eventId?: string;
  subjectId?: string;
  className?: string;
  showCart?: boolean;
  showFilters?: boolean;
  enableSelection?: boolean;
  onPhotoSelect?: (photo: Photo) => void;
  onCartAdd?: (photoId: string) => void;
}

// Responsive breakpoints
const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>(
    'desktop'
  );

  useLayoutEffect(() => {
    const updateBreakpoint = () => {
      if (window.innerWidth < 768) {
        setBreakpoint('mobile');
      } else if (window.innerWidth < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
};

// Enhanced Photo Card with lazy loading and accessibility
const PhotoCard = React.memo<{
  photo: Photo;
  index: number;
  viewMode: 'grid' | 'list';
  isSelected?: boolean;
  onPhotoClick: (photo: Photo, index: number) => void;
  onCartAdd?: (photoId: string) => void;
  showCart?: boolean;
}>(
  ({
    photo,
    index,
    viewMode,
    isSelected = false,
    onPhotoClick,
    onCartAdd,
    showCart = false,
  }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isIntersecting, setIsIntersecting] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const shouldReduceMotion = useReducedMotion();

    // Intersection Observer for lazy loading
    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            observer.disconnect();
          }
        },
        {
          threshold: 0.1,
          rootMargin: '50px',
        }
      );

      const currentRef = imgRef.current;
      if (currentRef) {
        observer.observe(currentRef.parentElement!);
      }

      return () => {
        if (currentRef) {
          observer.disconnect();
        }
      };
    }, []);

    const handleClick = useCallback(() => {
      onPhotoClick(photo, index);
    }, [photo, index, onPhotoClick]);

    const handleCartAdd = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onCartAdd?.(photo.id);
        toast.success('Foto agregada al carrito');
      },
      [photo.id, onCartAdd]
    );

    const formatFileSize = useCallback((bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }, []);

    const cardVariants = {
      hidden: { opacity: 0, scale: 0.8 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: {
          duration: shouldReduceMotion ? 0 : 0.3,
          ease: 'easeOut',
        },
      },
      hover: {
        scale: shouldReduceMotion ? 1 : 1.02,
        transition: { duration: 0.2 },
      },
    };

    if (viewMode === 'list') {
      return (
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
          layout
        >
          <Card
            className={cn(
              'flex cursor-pointer items-center gap-4 p-4 transition-all duration-200',
              'hover:bg-accent/5 focus-within:ring-primary focus-within:ring-2 hover:shadow-md',
              isSelected && 'ring-primary bg-primary/5 ring-2'
            )}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }}
            aria-label={`Ver foto ${photo.original_filename}`}
          >
            <div className="bg-muted relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
              {isIntersecting && !imageError ? (
                <>
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                    </div>
                  )}
                  <img
                    ref={imgRef}
                    src={photo.preview_url || '/placeholder.jpg'}
                    alt={photo.original_filename}
                    className={cn(
                      'h-full w-full object-cover transition-opacity duration-200',
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                    loading="lazy"
                  />
                </>
              ) : imageError ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="text-muted-foreground h-4 w-4" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium">
                {photo.original_filename}
              </h3>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  {formatFileSize(photo.file_size)}
                </span>
                {photo.width && photo.height && (
                  <span className="text-muted-foreground text-xs">
                    {photo.width} × {photo.height}
                  </span>
                )}
              </div>
            </div>

            {showCart && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCartAdd}
                className="shrink-0"
                aria-label={`Agregar ${photo.original_filename} al carrito`}
              >
                <ShoppingCart className="h-4 w-4" />
              </Button>
            )}
          </Card>
        </motion.div>
      );
    }

    // Grid view
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        layout
      >
        <Card
          className={cn(
            'group relative cursor-pointer overflow-hidden transition-all duration-200',
            'focus-within:ring-primary focus-within:ring-2 hover:shadow-lg',
            isSelected && 'ring-primary shadow-lg ring-2'
          )}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          aria-label={`Ver foto ${photo.original_filename}`}
        >
          <div className="bg-muted relative aspect-square">
            {isIntersecting && !imageError ? (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                  </div>
                )}
                <img
                  ref={imgRef}
                  src={photo.preview_url || '/placeholder.jpg'}
                  alt={photo.original_filename}
                  className={cn(
                    'h-full w-full object-cover transition-all duration-200',
                    imageLoaded ? 'opacity-100' : 'opacity-0',
                    !shouldReduceMotion && 'group-hover:scale-105'
                  )}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  loading="lazy"
                />
              </>
            ) : imageError ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="text-muted-foreground h-8 w-8" />
              </div>
            )}

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/20" />

            {/* Action buttons */}
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Button variant="secondary" size="sm" className="h-8 w-8 p-0">
                <ZoomIn className="h-4 w-4" />
                <span className="sr-only">Ampliar foto</span>
              </Button>
              {showCart && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleCartAdd}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="sr-only">Agregar al carrito</span>
                </Button>
              )}
            </div>

            {/* Status badges */}
            <div className="absolute bottom-2 left-2 flex gap-1">
              <AnimatePresence>
                {photo.approved && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <Badge variant="default" className="text-xs">
                      Aprobada
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <CardContent className="p-3">
            <h3 className="truncate text-sm font-medium">
              {photo.original_filename}
            </h3>
            <div className="text-muted-foreground mt-1 flex items-center justify-between text-xs">
              <span>{formatFileSize(photo.file_size)}</span>
              {photo.width && photo.height && (
                <span>
                  {photo.width} × {photo.height}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
);

PhotoCard.displayName = 'PhotoCard';

// Main Gallery Component
export function EnhancedPhotoGallery({
  eventId,
  subjectId,
  className,
  showCart = false,
  showFilters = true,
  enableSelection = false,
  onPhotoSelect,
  onCartAdd,
}: EnhancedPhotoGalleryProps) {
  const breakpoint = useBreakpoint();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use optimized gallery hook
  const {
    photos,
    totalCount,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    filters,
    updateFilters,
    selection,
    togglePhotoSelection,
    clearSelection,
  } = usePhotoGalleryOptimized({
    pageSize: breakpoint === 'mobile' ? 20 : 50,
    enableInfiniteScroll: true,
    prefetchNextPage: true,
  });

  // Apply initial filters
  useEffect(() => {
    updateFilters({
      eventId,
      subjectId,
      approved: true, // Only show approved photos in public gallery
    });
  }, [eventId, subjectId, updateFilters]);

  // Handle scroll events for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        setShowScrollTop(scrollRef.current.scrollTop > 500);
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handlePhotoClick = useCallback(
    (photo: Photo, index: number) => {
      if (enableSelection) {
        togglePhotoSelection(photo.id, index);
        onPhotoSelect?.(photo);
      } else {
        setSelectedPhoto(photo);
      }
    },
    [enableSelection, togglePhotoSelection, onPhotoSelect]
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Responsive grid sizing
  const getItemSize = useMemo(() => {
    switch (breakpoint) {
      case 'mobile':
        return viewMode === 'grid' ? 150 : 80;
      case 'tablet':
        return viewMode === 'grid' ? 200 : 100;
      default:
        return viewMode === 'grid' ? 280 : 120;
    }
  }, [breakpoint, viewMode]);

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <AlertCircle className="mb-4 h-16 w-16 text-red-500" />
        <h3 className="mb-2 text-lg font-semibold">
          Error al cargar las fotos
        </h3>
        <p className="text-muted-foreground mb-4">
          {error?.message || 'Ocurrió un error inesperado'}
        </p>
        <Button onClick={() => window.location.reload()}>
          Intentar nuevamente
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header with filters and controls */}
      {showFilters && (
        <div className="flex flex-col gap-4 border-b p-4">
          {/* Search and view controls */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Buscar fotos..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                aria-label="Vista de cuadrícula"
              >
                <Grid className="h-4 w-4" />
                {breakpoint !== 'mobile' && (
                  <span className="ml-2">Cuadrícula</span>
                )}
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                aria-label="Vista de lista"
              >
                <List className="h-4 w-4" />
                {breakpoint !== 'mobile' && <span className="ml-2">Lista</span>}
              </Button>
            </div>
          </div>

          {/* Results info */}
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                `${totalCount} foto${totalCount !== 1 ? 's' : ''} encontrada${totalCount !== 1 ? 's' : ''}`
              )}
            </span>
            {selection.selectedPhotos.size > 0 && (
              <div className="flex items-center gap-2">
                <span>
                  {selection.selectedPhotos.size} seleccionada
                  {selection.selectedPhotos.size !== 1 ? 's' : ''}
                </span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Limpiar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        {isLoading && photos.length === 0 ? (
          <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <ImageIcon className="text-muted-foreground mb-4 h-16 w-16" />
            <h3 className="mb-2 text-lg font-semibold">
              No se encontraron fotos
            </h3>
            <p className="text-muted-foreground">
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        ) : (
          <VirtualizedPhotoGrid
            items={photos}
            hasNextPage={hasNextPage}
            isLoading={isFetchingNextPage}
            onLoadMore={handleLoadMore}
            onPhotoClick={handlePhotoClick}
            onPhotoSelect={enableSelection ? togglePhotoSelection : undefined}
            selectedPhotos={selection.selectedPhotos}
            viewMode={viewMode}
            itemSize={getItemSize}
            enableSelection={enableSelection}
            showMetadata={true}
            onPhotoAction={(action, photo) => {
              if (action === 'download') {
                window.open(photo.preview_url, '_blank');
              } else if (action === 'cart' && onCartAdd) {
                onCartAdd(photo.id);
              }
            }}
            className="p-4"
          />
        )}
      </div>

      {/* Photo modal */}
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={() => setSelectedPhoto(null)}
      >
        <DialogContent className="h-[90vh] w-full max-w-4xl p-0">
          {selectedPhoto && (
            <div className="relative flex h-full flex-col">
              <DialogHeader className="border-b p-4">
                <DialogTitle className="flex items-center justify-between">
                  <span className="truncate">
                    {selectedPhoto.original_filename}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPhoto(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>

              <div className="relative flex flex-1 items-center justify-center bg-black">
                <img
                  src={selectedPhoto.preview_url}
                  alt={selectedPhoto.original_filename}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="bg-background border-t p-4">
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground text-sm">
                    {selectedPhoto.width && selectedPhoto.height && (
                      <span>
                        {selectedPhoto.width} × {selectedPhoto.height} •{' '}
                      </span>
                    )}
                    <span>
                      {(selectedPhoto.file_size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Share2 className="mr-2 h-4 w-4" />
                      Compartir
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Descargar
                    </Button>
                    {showCart && (
                      <Button
                        size="sm"
                        onClick={() => {
                          onCartAdd?.(selectedPhoto.id);
                          setSelectedPhoto(null);
                        }}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Agregar al carrito
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scroll to top button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Button
              variant="default"
              size="sm"
              onClick={scrollToTop}
              className="h-10 w-10 rounded-full p-0 shadow-lg"
              aria-label="Volver arriba"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

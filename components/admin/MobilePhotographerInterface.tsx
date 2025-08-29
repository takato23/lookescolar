'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Camera,
  Upload,
  Search,
  Filter,
  Menu,
  X,
  Grid3X3,
  List,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  Eye,
  Heart,
  Share2,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  Settings,
  Users,
  Folder,
  Home,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';

interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  filename: string;
  approved: boolean;
  tagged: boolean;
  studentNames: string[];
}

interface MobilePhotographerInterfaceProps {
  eventId: string;
  photos: Photo[];
  onPhotoSelect: (photo: Photo) => void;
  onPhotoApprove: (photoId: string) => void;
  onPhotoTag: (photoId: string, studentIds: string[]) => void;
  onUpload: () => void;
}

export default function MobilePhotographerInterface({
  eventId,
  photos,
  onPhotoSelect,
  onPhotoApprove,
  onPhotoTag,
  onUpload,
}: MobilePhotographerInterfaceProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showMetadata, setShowMetadata] = useState(false);
  const [quickActions, setQuickActions] = useState(false);

  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Touch-friendly grid sizing
  const getGridCols = () => {
    if (isMobile) return 2;
    if (isTablet) return 3;
    return 4;
  };

  // Handle photo selection
  const handlePhotoSelect = useCallback(
    (photo: Photo, index: number) => {
      setSelectedPhoto(photo);
      setCurrentPhotoIndex(index);
      onPhotoSelect(photo);
    },
    [onPhotoSelect]
  );

  // Navigation between photos
  const navigatePhoto = useCallback(
    (direction: 'prev' | 'next') => {
      const newIndex =
        direction === 'prev'
          ? Math.max(0, currentPhotoIndex - 1)
          : Math.min(photos.length - 1, currentPhotoIndex + 1);

      const newPhoto = photos[newIndex];
      if (newPhoto) {
        setCurrentPhotoIndex(newIndex);
        setSelectedPhoto(newPhoto);
        onPhotoSelect(newPhoto);
      }
    },
    [currentPhotoIndex, photos, onPhotoSelect]
  );

  // Zoom controls
  const handleZoom = useCallback((action: 'in' | 'out' | 'reset') => {
    switch (action) {
      case 'in':
        setZoomLevel((prev) => Math.min(prev * 1.5, 5));
        break;
      case 'out':
        setZoomLevel((prev) => Math.max(prev / 1.5, 0.5));
        break;
      case 'reset':
        setZoomLevel(1);
        break;
    }
  }, []);

  // Touch gesture handling for photo viewer
  useEffect(() => {
    if (!isFullscreen || !selectedPhoto) return;

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches && e.changedTouches[0]) {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = startX - endX;
        const diffY = startY - endY;

        // Horizontal swipe
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
          if (diffX > 0) {
            navigatePhoto('next');
          } else {
            navigatePhoto('prev');
          }
        }
        // Vertical swipe down to close
        else if (diffY < -100) {
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isFullscreen, selectedPhoto, navigatePhoto]);

  // Photo grid component
  const PhotoGrid = () => (
    <div className={cn('grid gap-2 p-4', `grid-cols-${getGridCols()}`)}>
      {photos.map((photo, index) => (
        <Card
          key={photo.id}
          className={cn(
            'cursor-pointer transition-all duration-200 hover:shadow-lg',
            'touch-manipulation', // Better touch performance
            selectedPhoto?.id === photo.id && 'ring-2 ring-blue-500'
          )}
          onClick={() => handlePhotoSelect(photo, index)}
        >
          <CardContent className="relative p-0">
            <div className="aspect-square overflow-hidden rounded-t bg-gray-100">
              <img
                src={photo.thumbnailUrl}
                alt={photo.filename}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Status indicators */}
            <div className="absolute left-2 top-2 flex gap-1">
              {photo.approved && (
                <Badge className="bg-green-500 px-1 py-0 text-xs text-white">
                  <Check className="h-3 w-3" />
                </Badge>
              )}
              {photo.tagged && (
                <Badge className="bg-blue-500 px-1 py-0 text-xs text-white">
                  <Users className="h-3 w-3" />
                </Badge>
              )}
            </div>

            {/* Quick actions overlay */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity hover:opacity-100">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhoto(photo);
                  setIsFullscreen(true);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onPhotoApprove(photo.id);
                }}
              >
                <Heart className="h-4 w-4" />
              </Button>
            </div>

            {/* Photo info */}
            <div className="p-2">
              <p className="truncate text-xs font-medium">{photo.filename}</p>
              {photo.studentNames.length > 0 && (
                <p className="text-muted-foreground truncate text-xs">
                  {photo.studentNames.join(', ')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Mobile toolbar
  const MobileToolbar = () => (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-lg">
      <div className="flex items-center justify-around p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUpload}
          className="flex h-auto flex-col items-center gap-1 py-2"
        >
          <Upload className="h-5 w-5" />
          <span className="text-xs">Subir</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          className="flex h-auto flex-col items-center gap-1 py-2"
        >
          {viewMode === 'grid' ? (
            <List className="h-5 w-5" />
          ) : (
            <Grid3X3 className="h-5 w-5" />
          )}
          <span className="text-xs">Vista</span>
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex h-auto flex-col items-center gap-1 py-2"
            >
              <Filter className="h-5 w-5" />
              <span className="text-xs">Filtros</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[300px]">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Personaliza la vista de fotos</SheetDescription>
            </SheetHeader>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-12">
                Solo aprobadas
              </Button>
              <Button variant="outline" className="h-12">
                Sin etiquetar
              </Button>
              <Button variant="outline" className="h-12">
                Subidas hoy
              </Button>
              <Button variant="outline" className="h-12">
                Favoritas
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setQuickActions(!quickActions)}
          className="flex h-auto flex-col items-center gap-1 py-2"
        >
          <Settings className="h-5 w-5" />
          <span className="text-xs">Más</span>
        </Button>
      </div>
    </div>
  );

  // Fullscreen photo viewer
  const FullscreenViewer = () => {
    if (!isFullscreen || !selectedPhoto) return null;

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        {/* Header */}
        <div className="flex items-center justify-between bg-black/50 p-4 text-white">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
            <span className="text-sm">
              {currentPhotoIndex + 1} de {photos.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMetadata(!showMetadata)}
              className="text-white hover:bg-white/20"
            >
              <Eye className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPhotoApprove(selectedPhoto.id)}
              className="text-white hover:bg-white/20"
            >
              <Heart className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Photo container */}
        <div className="relative flex-1 overflow-hidden">
          <img
            src={selectedPhoto.url}
            alt={selectedPhoto.filename}
            className="h-full w-full object-contain"
            style={{
              transform: `scale(${zoomLevel})`,
              transition: 'transform 0.2s ease',
            }}
          />

          {/* Navigation arrows */}
          <Button
            variant="ghost"
            size="lg"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
            onClick={() => navigatePhoto('prev')}
            disabled={currentPhotoIndex === 0}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
            onClick={() => navigatePhoto('next')}
            disabled={currentPhotoIndex === photos.length - 1}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-between bg-black/50 p-4 text-white">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleZoom('out')}
              className="text-white hover:bg-white/20"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <span className="text-sm">{Math.round(zoomLevel * 100)}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleZoom('in')}
              className="text-white hover:bg-white/20"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom('reset')}
            className="text-white hover:bg-white/20"
          >
            <RotateCw className="h-5 w-5" />
          </Button>
        </div>

        {/* Metadata overlay */}
        {showMetadata && (
          <div className="absolute bottom-20 left-4 right-4 rounded-lg bg-black/80 p-4 text-white">
            <h3 className="mb-2 font-medium">{selectedPhoto.filename}</h3>
            <div className="space-y-1 text-sm">
              <p>Estado: {selectedPhoto.approved ? 'Aprobada' : 'Pendiente'}</p>
              <p>
                Etiquetas:{' '}
                {selectedPhoto.studentNames.length > 0
                  ? selectedPhoto.studentNames.join(', ')
                  : 'Sin etiquetar'}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="sticky top-0 z-40 border-b bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Gestión de Fotos</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
              <Input placeholder="Buscar..." className="w-48 pl-9" />
            </div>
          </div>
        </div>
      </div>

      {/* Photo grid */}
      <PhotoGrid />

      {/* Mobile toolbar */}
      <MobileToolbar />

      {/* Fullscreen viewer */}
      <FullscreenViewer />

      {/* Padding for mobile toolbar */}
      <div className="h-20" />
    </div>
  );
}

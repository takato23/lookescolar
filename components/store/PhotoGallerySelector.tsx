'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { LazyImage } from '@/components/ui/lazy-image';
import { 
  Check, 
  X, 
  Camera, 
  Users, 
  Image,
  ZoomIn,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ProductOption } from '@/lib/types/unified-store';

interface Photo {
  id: string;
  url: string;
  alt: string;
  student?: string;
  subject?: string;
  isGroupPhoto?: boolean;
}

interface PhotoGallerySelectorProps {
  photos: Photo[];
  selectedPackage: ProductOption | null;
  selectedIndividual: string[];
  selectedGroup: string | null;
  onSelectIndividual: (photoId: string) => void;
  onSelectGroup: (photoId: string) => void;
  onRemoveIndividual: (photoId: string) => void;
  onRemoveGroup: () => void;
  className?: string;
}

export function PhotoGallerySelector({
  photos,
  selectedPackage,
  selectedIndividual,
  selectedGroup,
  onSelectIndividual,
  onSelectGroup,
  onRemoveIndividual,
  onRemoveGroup,
  className,
}: PhotoGallerySelectorProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('grid');
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!selectedPackage) {
    return (
      <Card className={cn("p-8 text-center", className)}>
        <Camera className="h-12 w-12 mx-auto mb-4 text-gray-500 dark:text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">Seleccioná un Paquete Primero</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Elegí entre Opción A u Opción B para comenzar a seleccionar tus fotos
        </p>
      </Card>
    );
  }

  const needsIndividual = selectedIndividual.length < selectedPackage.contents.individualPhotos;
  const needsGroup = selectedPackage.contents.groupPhotos > 0 && !selectedGroup;
  const isComplete = !needsIndividual && !needsGroup;

  const canSelectMoreIndividual = selectedIndividual.length < selectedPackage.contents.individualPhotos;

  const handlePhotoClick = (photo: Photo) => {
    if (needsIndividual && !selectedIndividual.includes(photo.id)) {
      onSelectIndividual(photo.id);
    } else if (needsGroup && photo.isGroupPhoto) {
      onSelectGroup(photo.id);
    } else {
      setSelectedPhoto(photo);
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selection Status Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Individual Photos Status */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                selectedIndividual.length === selectedPackage.contents.individualPhotos
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              )}>
                {selectedIndividual.length === selectedPackage.contents.individualPhotos ? (
                  <Check className="h-4 w-4" />
                ) : (
                  selectedIndividual.length
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Fotos Individuales</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedIndividual.length} de {selectedPackage.contents.individualPhotos}
                </p>
              </div>
            </div>

            {/* Group Photo Status */}
            {selectedPackage.contents.groupPhotos > 0 && (
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  selectedGroup
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700"
                )}>
                  {selectedGroup ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">Foto Grupal</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedGroup ? 'Seleccionada' : 'Pendiente'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
            >
              <Image className="h-4 w-4 mr-1" />
              Grilla
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'carousel' ? 'default' : 'outline'}
              onClick={() => setViewMode('carousel')}
            >
              <Camera className="h-4 w-4 mr-1" />
              Carrusel
            </Button>
          </div>
        </div>

        {/* Instructions */}
        {!isComplete && (
          <div className="mt-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-sm">
              {needsIndividual && (
                <>
                  <span className="font-medium">👆 Hacé click</span> en {selectedPackage.contents.individualPhotos - selectedIndividual.length} foto{selectedPackage.contents.individualPhotos - selectedIndividual.length > 1 ? 's' : ''} individual{selectedPackage.contents.individualPhotos - selectedIndividual.length > 1 ? 'es' : ''}
                </>
              )}
              {needsIndividual && needsGroup && ' y '}
              {needsGroup && (
                <>
                  en <span className="font-medium">1 foto grupal</span>
                </>
              )}
            </p>
          </div>
        )}

        {isComplete && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" />
            <span className="font-medium">¡Selección completa! Podés revisar o agregar copias extras.</span>
          </div>
        )}
      </div>

      {/* Photo Gallery */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {photos.map((photo) => {
            const isIndividualSelected = selectedIndividual.includes(photo.id);
            const isGroupSelected = selectedGroup === photo.id;
            const isSelected = isIndividualSelected || isGroupSelected;
            const isSelectable = (needsIndividual && !photo.isGroupPhoto) || 
                                (needsGroup && photo.isGroupPhoto);

            return (
              <div
                key={photo.id}
                className={cn(
                  "relative group cursor-pointer rounded-lg overflow-hidden transition-all duration-200",
                  "hover:shadow-lg hover:scale-105",
                  isSelected && "ring-2 ring-primary ring-offset-2",
                  !isSelectable && !isSelected && "opacity-50"
                )}
                onClick={() => handlePhotoClick(photo)}
              >
                {/* Photo */}
                <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800">
                  <LazyImage
                    src={photo.url}
                    alt={photo.alt}
                    className="w-full h-full object-cover"
                    showProtectionBadge={false}
                  />
                </div>

                {/* Selection Overlay */}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="bg-primary text-white rounded-full p-2">
                      <Check className="h-6 w-6" />
                    </div>
                  </div>
                )}

                {/* Photo Type Badge */}
                {photo.isGroupPhoto && (
                  <Badge className="absolute top-2 left-2 bg-purple-500 text-white">
                    <Users className="h-3 w-3 mr-1" />
                    Grupal
                  </Badge>
                )}

                {/* Selection Type Badge */}
                {isIndividualSelected && (
                  <Badge className="absolute top-2 right-2 bg-blue-500 text-white">
                    Individual {selectedIndividual.indexOf(photo.id) + 1}
                  </Badge>
                )}

                {/* Hover Actions */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex justify-between items-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/20 h-7 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPhoto(photo);
                      }}
                    >
                      <ZoomIn className="h-3 w-3" />
                    </Button>
                    {isSelected && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/20 h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isIndividualSelected) {
                            onRemoveIndividual(photo.id);
                          } else if (isGroupSelected) {
                            onRemoveGroup();
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Carousel View */
        <div className="relative">
          <div className="flex items-center justify-center gap-4">
            <Button
              size="icon"
              variant="outline"
              onClick={handlePrev}
              className="absolute left-0 z-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="max-w-2xl mx-auto">
              {photos[currentIndex] && (
                <div className="space-y-4">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden">
                    <LazyImage
                      src={photos[currentIndex].url}
                      alt={photos[currentIndex].alt}
                      className="w-full h-full object-cover"
                      showProtectionBadge={false}
                    />
                  </div>
                  
                  <div className="flex justify-center gap-3">
                    {canSelectMoreIndividual && !photos[currentIndex].isGroupPhoto && (
                      <Button
                        onClick={() => onSelectIndividual(photos[currentIndex].id)}
                        disabled={selectedIndividual.includes(photos[currentIndex].id)}
                      >
                        {selectedIndividual.includes(photos[currentIndex].id) 
                          ? 'Seleccionada como Individual'
                          : 'Seleccionar como Individual'}
                      </Button>
                    )}
                    
                    {needsGroup && photos[currentIndex].isGroupPhoto && (
                      <Button
                        onClick={() => onSelectGroup(photos[currentIndex].id)}
                        disabled={selectedGroup === photos[currentIndex].id}
                      >
                        {selectedGroup === photos[currentIndex].id
                          ? 'Seleccionada como Grupal'
                          : 'Seleccionar como Grupal'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button
              size="icon"
              variant="outline"
              onClick={handleNext}
              className="absolute right-0 z-10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Carousel Indicators */}
          <div className="flex justify-center gap-1 mt-4">
            {photos.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentIndex 
                    ? "bg-primary w-6" 
                    : "bg-gray-300 dark:bg-gray-600"
                )}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Photo Detail Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="aspect-[3/4] rounded-lg overflow-hidden">
                <LazyImage
                  src={selectedPhoto.url}
                  alt={selectedPhoto.alt}
                  className="w-full h-full object-cover"
                  showProtectionBadge={false}
                  loading="eager"
                />
              </div>
              
              <div className="flex justify-center gap-3">
                {canSelectMoreIndividual && !selectedPhoto.isGroupPhoto && (
                  <Button
                    onClick={() => {
                      onSelectIndividual(selectedPhoto.id);
                      setSelectedPhoto(null);
                    }}
                    disabled={selectedIndividual.includes(selectedPhoto.id)}
                  >
                    {selectedIndividual.includes(selectedPhoto.id) 
                      ? 'Ya seleccionada'
                      : 'Seleccionar como Individual'}
                  </Button>
                )}
                
                {needsGroup && selectedPhoto.isGroupPhoto && (
                  <Button
                    onClick={() => {
                      onSelectGroup(selectedPhoto.id);
                      setSelectedPhoto(null);
                    }}
                    disabled={selectedGroup === selectedPhoto.id}
                  >
                    {selectedGroup === selectedPhoto.id
                      ? 'Ya seleccionada'
                      : 'Seleccionar como Grupal'}
                  </Button>
                )}

                {selectedIndividual.includes(selectedPhoto.id) && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onRemoveIndividual(selectedPhoto.id);
                      setSelectedPhoto(null);
                    }}
                  >
                    Quitar Selección
                  </Button>
                )}

                {selectedGroup === selectedPhoto.id && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onRemoveGroup();
                      setSelectedPhoto(null);
                    }}
                  >
                    Quitar Selección
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
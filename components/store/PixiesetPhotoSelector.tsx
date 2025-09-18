'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  ShoppingCart,
  Users,
  User,
  Check,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Photo {
  id: string;
  url: string;
  preview_url?: string;
  alt: string;
  student?: string;
  subject?: string;
  isGroupPhoto?: boolean;
}

interface PackageOption {
  id: string;
  name: string;
  price: number;
  description: string;
  itemCount: number;
  contents: {
    individualPhotos: number;
    groupPhotos: number;
    copyPhotos: number;
  };
}

interface SelectedPhotos {
  individual: string[];
  group: string[];
}

interface PixiesetPhotoSelectorProps {
  package: PackageOption;
  photos: Photo[];
  onBack: () => void;
  onAddToCart: (selectedPhotos: SelectedPhotos) => void;
  className?: string;
  settings?: any;
  theme?: any;
}

export function PixiesetPhotoSelector({
  package: selectedPackage,
  photos,
  onBack,
  onAddToCart,
  className,
  settings,
  theme
}: PixiesetPhotoSelectorProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhotos>({
    individual: [],
    group: []
  });

  // SIMPLIFICADO: Todas las fotos están disponibles para ambas categorías
  // Los usuarios eligen según su criterio y la descripción del paquete
  const individualPhotos = useMemo(() => photos, [photos]);
  const groupPhotos = useMemo(() => photos, [photos]);

  // Verificar si se pueden seleccionar más fotos
  const canSelectMoreIndividual = selectedPhotos.individual.length < selectedPackage.contents.individualPhotos;
  const canSelectMoreGroup = selectedPhotos.group.length < selectedPackage.contents.groupPhotos;

  // Verificar si la selección está completa
  const isSelectionComplete = 
    selectedPhotos.individual.length === selectedPackage.contents.individualPhotos &&
    selectedPhotos.group.length === selectedPackage.contents.groupPhotos;

  const formatPrice = (price: number) => {
    return `$${(price / 100).toLocaleString('es-AR')}`;
  };

  const handleIndividualPhotoClick = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newIndividual = prev.individual.includes(photoId)
        ? prev.individual.filter(id => id !== photoId)
        : canSelectMoreIndividual
          ? [...prev.individual, photoId]
          : [...prev.individual.slice(1), photoId]; // Reemplazar la primera si está lleno

      return { ...prev, individual: newIndividual };
    });
  };

  const handleGroupPhotoClick = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newGroup = prev.group.includes(photoId)
        ? prev.group.filter(id => id !== photoId)
        : canSelectMoreGroup
          ? [...prev.group, photoId]
          : [photoId]; // Solo se permite una foto grupal

      return { ...prev, group: newGroup };
    });
  };

  const handleAddToCart = () => {
    if (isSelectionComplete) {
      onAddToCart(selectedPhotos);
    }
  };

  return (
    <div 
      className={cn("min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100", className)}
    >
      {/* Header - Mobile optimized */}
      <div className="border-b sticky top-0 z-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-3 py-2 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              onClick={onBack}
              className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 flex-shrink-0 min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm sm:text-base">Volver</span>
            </Button>

            <div className="text-center min-w-0 flex-1">
              <h1 className="text-sm sm:text-xl font-medium truncate">{selectedPackage.name}</h1>
              <p className="text-xs sm:text-sm opacity-75">{formatPrice(selectedPackage.price)}</p>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Badge variant={isSelectionComplete ? "default" : "secondary"} className="text-xs">
                <span className="hidden sm:inline">{selectedPhotos.individual.length + selectedPhotos.group.length} / {selectedPackage.contents.individualPhotos + selectedPackage.contents.groupPhotos} seleccionadas</span>
                <span className="sm:hidden">{selectedPhotos.individual.length + selectedPhotos.group.length}/{selectedPackage.contents.individualPhotos + selectedPackage.contents.groupPhotos}</span>
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Package Summary - Mobile optimized */}
      <div
        className="border-b bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      >
        <div className="max-w-7xl mx-auto px-3 py-3 sm:px-6 sm:py-6">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base text-foreground">Fotos Individuales</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{selectedPackage.contents.individualPhotos} foto{selectedPackage.contents.individualPhotos > 1 ? 's' : ''} (15x21)</p>
                    <p className="text-xs sm:text-sm font-medium text-blue-600">
                      {selectedPhotos.individual.length} / {selectedPackage.contents.individualPhotos} seleccionadas
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base text-foreground">Foto Grupal</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">1 foto (15x21)</p>
                    <p className="text-xs sm:text-sm font-medium text-green-600">
                      {selectedPhotos.group.length} / 1 seleccionada
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-4 w-4 sm:h-6 sm:w-6 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base text-foreground">Copias 4x5</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{selectedPackage.contents.copyPhotos} copias de las individuales</p>
                    <p className="text-xs sm:text-sm font-medium text-orange-600">Se generan automáticamente</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Photo Selection - Mobile optimized */}
      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 sm:py-8">
        {/* Individual Photos Section */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <h2 className="text-lg sm:text-2xl font-medium">
              Seleccionar Foto{selectedPackage.contents.individualPhotos > 1 ? 's' : ''} Individual{selectedPackage.contents.individualPhotos > 1 ? 'es' : ''}
            </h2>
            <Badge variant={selectedPhotos.individual.length === selectedPackage.contents.individualPhotos ? "default" : "secondary"} className="text-xs">
              {selectedPhotos.individual.length} / {selectedPackage.contents.individualPhotos}
            </Badge>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-blue-800 dark:text-blue-200 text-xs sm:text-sm leading-relaxed">
              💡 <strong>Fotos Individuales:</strong> Elegí foto{selectedPackage.contents.individualPhotos > 1 ? 's' : ''} donde se vea bien {selectedPackage.contents.individualPhotos === 1 ? 'al estudiante' : 'a los estudiantes'} que querés en tamaño 15x21.
              {selectedPackage.contents.copyPhotos > 0 && ` También recibirás ${selectedPackage.contents.copyPhotos} copia${selectedPackage.contents.copyPhotos > 1 ? 's' : ''} en tamaño 4x5 de ${selectedPackage.contents.individualPhotos === 1 ? 'esta foto' : 'estas fotos'}.`}
            </p>
          </div>

          {individualPhotos.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <User className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 opacity-30" />
              <p className="text-sm sm:text-base">No hay fotos individuales disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
              {individualPhotos.map((photo) => {
                const isSelected = selectedPhotos.individual.includes(photo.id);
                const canSelect = isSelected || canSelectMoreIndividual;
                
                return (
                  <div 
                    key={photo.id}
                    className={cn(
                      "relative aspect-square group cursor-pointer rounded-lg overflow-hidden transition-all",
                      isSelected 
                        ? "ring-4 ring-blue-500 ring-opacity-75 scale-95" 
                        : canSelect 
                          ? "hover:scale-105 hover:shadow-lg" 
                          : "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => canSelect && handleIndividualPhotoClick(photo.id)}
                  >
                    <img 
                      src={photo.preview_url || photo.url}
                      alt={photo.alt}
                      className="w-full h-full object-cover"
                    />
                    
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-600 bg-opacity-20 flex items-center justify-center">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 sm:h-5 sm:w-5 text-white" />
                        </div>
                      </div>
                    )}

                    {!canSelect && !isSelected && (
                      <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
                        <p className="text-white text-xs sm:text-sm text-center px-1 sm:px-2 leading-tight">
                          Máximo {selectedPackage.contents.individualPhotos} foto{selectedPackage.contents.individualPhotos > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    {photo.student && (
                      <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded">
                        <span className="text-xs">{photo.student}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Group Photos Section */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            <h2 className="text-lg sm:text-2xl font-medium">Seleccionar Foto Grupal</h2>
            <Badge variant={selectedPhotos.group.length === 1 ? "default" : "secondary"} className="text-xs">
              {selectedPhotos.group.length} / 1
            </Badge>
          </div>

          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-green-800 dark:text-green-200 text-xs sm:text-sm leading-relaxed">
              👥 <strong>Foto Grupal:</strong> Elegí una foto donde aparezca la clase, el grupo o varios estudiantes juntos.
              Esta foto se imprimirá en tamaño 15x21 y va incluida en tu carpeta.
            </p>
          </div>

          {groupPhotos.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <Users className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 opacity-30" />
              <p className="text-sm sm:text-base">No hay fotos grupales disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
              {groupPhotos.map((photo) => {
                const isSelected = selectedPhotos.group.includes(photo.id);
                
                return (
                  <div 
                    key={photo.id}
                    className={cn(
                      "relative aspect-square group cursor-pointer rounded-lg overflow-hidden transition-all",
                      isSelected 
                        ? "ring-4 ring-green-500 ring-opacity-75 scale-95" 
                        : "hover:scale-105 hover:shadow-lg"
                    )}
                    onClick={() => handleGroupPhotoClick(photo.id)}
                  >
                    <img 
                      src={photo.preview_url || photo.url}
                      alt={photo.alt}
                      className="w-full h-full object-cover"
                    />
                    
                    {isSelected && (
                      <div className="absolute inset-0 bg-green-600 bg-opacity-20 flex items-center justify-center">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 sm:h-5 sm:w-5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selection Summary and Add to Cart - Mobile optimized */}
        <div className="border-t pt-4 sm:pt-8">
          {!isSelectionComplete && (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <p className="text-orange-800 dark:text-orange-200 font-medium text-sm sm:text-base">
                  Complete la selección para continuar
                </p>
              </div>
              <ul className="text-orange-700 dark:text-orange-300 text-xs sm:text-sm mt-2 ml-6 sm:ml-7 space-y-1">
                {selectedPhotos.individual.length < selectedPackage.contents.individualPhotos && (
                  <li>• Seleccione {selectedPackage.contents.individualPhotos - selectedPhotos.individual.length} foto{selectedPackage.contents.individualPhotos - selectedPhotos.individual.length > 1 ? 's' : ''} individual{selectedPackage.contents.individualPhotos - selectedPhotos.individual.length > 1 ? 'es' : ''} más</li>
                )}
                {selectedPhotos.group.length < selectedPackage.contents.groupPhotos && (
                  <li>• Seleccione 1 foto grupal</li>
                )}
              </ul>
            </div>
          )}

          <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-medium mb-2 text-foreground">{selectedPackage.name}</h3>
                  <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                    <p>✓ {selectedPhotos.individual.length} foto{selectedPhotos.individual.length !== 1 ? 's' : ''} individual{selectedPhotos.individual.length !== 1 ? 'es' : ''} (15x21)</p>
                    <p>✓ {selectedPhotos.group.length} foto grupal (15x21)</p>
                    <p>✓ {selectedPackage.contents.copyPhotos} copias 4x5 (de las individuales)</p>
                    <p>✓ Carpeta impresa personalizada (20x30)</p>
                  </div>
                </div>

                <div className="text-center sm:text-right">
                  <p className="text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-0">{formatPrice(selectedPackage.price)}</p>
                  <Button
                    onClick={handleAddToCart}
                    disabled={!isSelectionComplete}
                    variant={isSelectionComplete ? "success" : "secondary"}
                    className="w-full sm:w-auto mt-2 sm:mt-4 px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-lg font-medium min-h-[44px]"
                  >
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">AGREGAR AL CARRITO</span>
                    <span className="sm:hidden">AGREGAR</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default PixiesetPhotoSelector;

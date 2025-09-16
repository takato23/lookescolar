'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  MapPin,
  Share,
  Heart,
  Download,
  ShoppingCart,
  Grid3X3,
  Camera,
  Star,
  Users,
  ArrowRight
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
  isFavorite?: boolean;
}

interface EventInfo {
  name: string;
  date: string;
  location?: string;
  photographer?: string;
  totalPhotos: number;
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

interface PixiesetGalleryMainProps {
  eventInfo: EventInfo;
  photos: Photo[];
  packages?: PackageOption[]; // Agregar packages como prop opcional
  onPhotoClick: (photo: Photo) => void;
  onBuyPhoto: (photo: Photo) => void;
  onPackageSelect?: (packageId: string) => void; // Nueva función para seleccionar packages
  onToggleFavorite?: (photoId: string) => void;
  onShareEvent?: () => void;
  className?: string;
  settings?: any;
  theme?: any;
}

export function PixiesetGalleryMain({
  eventInfo,
  photos,
  packages = [],
  onPhotoClick,
  onBuyPhoto,
  onPackageSelect,
  onToggleFavorite,
  onShareEvent,
  className,
  settings,
  theme
}: PixiesetGalleryMainProps) {
  const [hoveredPhoto, setHoveredPhoto] = useState<string | null>(null);
  const [view, setView] = useState<'all'>('all');

  // SIMPLIFICADO: Mostrar todas las fotos sin filtrar por tipo
  // Los usuarios verán todas las fotos y elegirán según su criterio
  const currentPhotos = photos;

  return (
    <div 
      className={cn("min-h-screen", className)}
      style={{ 
        backgroundColor: theme?.colors?.background || '#ffffff',
        color: theme?.colors?.text || 'inherit',
        fontFamily: theme?.branding?.fontFamily || 'inherit'
      }}
    >
      {/* Header - Mobile optimized */}
      <div
        className="border-b sticky top-0 z-10"
        style={{
          backgroundColor: theme?.colors?.surface || '#ffffff',
          borderColor: theme?.colors?.secondary + '30' || '#e5e7eb'
        }}
      >
        <div className="max-w-7xl mx-auto px-3 py-2 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <h1
                className="text-base sm:text-xl font-medium truncate"
                style={{ color: theme?.colors?.text || 'inherit' }}
              >
                {theme?.branding?.brandName || eventInfo.name || 'GALERÍA FOTOGRÁFICA'}
              </h1>
              <span
                className="text-xs sm:text-sm uppercase hidden sm:block"
                style={{ color: theme?.colors?.textSecondary || '#6b7280' }}
              >
                {eventInfo.photographer || 'BALOSKIER'}
              </span>
            </div>

            {/* Mobile: Only essential buttons */}
            <div className="flex items-center gap-1 sm:gap-4">
              <button
                onClick={onShareEvent}
                className="text-gray-600 hover:text-gray-800 text-xs sm:text-sm p-2 sm:p-0"
                title="Tienda"
              >
                <span className="hidden sm:inline">Tienda</span>
                <ShoppingCart className="h-4 w-4 sm:hidden" />
              </button>
              <button className="text-gray-600 hover:text-gray-800 text-xs sm:text-sm p-2 sm:p-0 hidden sm:inline-block">
                Ver Galería
              </button>
              <button className="text-gray-600 hover:text-gray-800 text-xs sm:text-sm p-2 sm:p-0">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button className="text-gray-600 hover:text-gray-800 text-xs sm:text-sm p-2 sm:p-0">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button className="text-gray-600 hover:text-gray-800 text-xs sm:text-sm p-2 sm:p-0">
                <Share className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button className="text-gray-600 hover:text-gray-800 text-xs sm:text-sm hidden sm:inline-block">
                Presentación
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section - Mobile optimized */}
      <div className="relative h-[40vh] sm:h-[50vh] lg:h-[70vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-black/20 z-10" />
        
        {/* Hero Background - Elegant stock images para galería escolar */}
        <div className="h-full flex">
          <div className="w-2/3 relative">
            <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 relative overflow-hidden">
              {/* Patrón decorativo */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                <div className="absolute top-32 right-20 w-24 h-24 bg-yellow-300 rounded-full blur-2xl"></div>
                <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-pink-300 rounded-full blur-3xl"></div>
              </div>
              
              {/* Iconos decorativos */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/20 text-center">
                  <div className="flex items-center gap-8 mb-6">
                    <Camera className="h-20 w-20" />
                    <Users className="h-24 w-24" />
                    <Star className="h-18 w-18" />
                  </div>
                  <p className="text-3xl font-light tracking-wide">GALERÍA FOTOGRÁFICA</p>
                  <p className="text-lg mt-2 opacity-80">Recuerdos que duran para siempre</p>
                </div>
              </div>
            </div>
          </div>
          <div className="w-1/3 relative">
            <div className="w-full h-full bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 relative overflow-hidden">
              {/* Patrón decorativo */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-16 right-12 w-28 h-28 bg-white rounded-full blur-2xl"></div>
                <div className="absolute bottom-24 left-8 w-36 h-36 bg-lime-300 rounded-full blur-3xl"></div>
              </div>
              
              {/* Icono central */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/25 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                    <Heart className="h-12 w-12 fill-current" />
                  </div>
                  <p className="text-sm font-medium tracking-wider">MOMENTOS</p>
                  <p className="text-sm font-medium tracking-wider">ESPECIALES</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Info Overlay - Mobile optimized */}
        <div className="absolute left-3 bottom-3 sm:left-8 sm:bottom-8 z-20 text-white">
          <h2 className="text-lg sm:text-2xl lg:text-4xl font-light mb-1 sm:mb-2 leading-tight">{(eventInfo.name || theme?.branding?.brandName || 'GALERÍA ESCOLAR').toUpperCase()}</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm opacity-90">
            <div className="flex items-center gap-1 sm:gap-2">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{eventInfo.date}</span>
            </div>
            {eventInfo.location && (
              <div className="flex items-center gap-1 sm:gap-2">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{eventInfo.location}</span>
              </div>
            )}
          </div>

          <Button
            className="mt-2 sm:mt-4 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-sm"
            style={{
              backgroundColor: theme?.colors?.primary || '#d97706',
              borderColor: theme?.colors?.primary || '#d97706'
            }}
            onClick={() => document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' })}
          >
            VER GALERÍA
          </Button>
        </div>
      </div>

      {/* Packages Section */}
      {packages.length > 0 && (
        <div className="py-6 sm:py-12 border-b bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-3 sm:px-6">
            <div className="text-center mb-4 sm:mb-8">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium mb-2 sm:mb-4 text-gray-900 dark:text-gray-100">Paquetes Disponibles</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Elegí tu paquete preferido y luego seleccioná las fotos que quieras incluir.
                Cada paquete incluye una carpeta impresa personalizada (20x30).
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-3 sm:p-4 mt-3 sm:mt-4 max-w-3xl mx-auto">
                <p className="text-amber-800 dark:text-amber-200 text-xs sm:text-sm leading-relaxed">
                  💡 <strong>Tip:</strong> Las "fotos individuales" son de estudiantes específicos (15x21),
                  las "grupales" son de la clase/grupo completo (15x21). ¡Vos elegís cuáles te gustan más de todas las fotos disponibles!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 max-w-4xl mx-auto">
              {packages.map((pkg) => (
                <Card 
                  key={pkg.id}
                  className="bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 hover:border-blue-300"
                  onClick={() => onPackageSelect?.(pkg.id)}
                >
                  <CardContent className="p-4 sm:p-8">
                    <div className="text-center mb-4 sm:mb-6">
                      <div className="w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                        <div className="text-white text-lg sm:text-2xl font-bold">
                          {pkg.id === 'opcionA' || pkg.id === 'carpetaA' ? 'A' : 'B'}
                        </div>
                      </div>
                      <h3 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">{pkg.name}</h3>
                      <div className="text-xl sm:text-3xl font-bold text-blue-600">
                        ${(pkg.price / 100).toLocaleString('es-AR')}
                      </div>
                    </div>

                    <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-600 text-xs sm:text-sm font-bold">{pkg.contents.individualPhotos}</span>
                        </div>
                        <span className="text-gray-700 text-sm sm:text-base">Foto{pkg.contents.individualPhotos > 1 ? 's' : ''} Individual{pkg.contents.individualPhotos > 1 ? 'es' : ''} (15x21)</span>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 text-xs sm:text-sm font-bold">1</span>
                        </div>
                        <span className="text-gray-700 text-sm sm:text-base">Foto Grupal (15x21)</span>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-orange-600 text-xs sm:text-sm font-bold">{pkg.contents.copyPhotos}</span>
                        </div>
                        <span className="text-gray-700 text-sm sm:text-base">Copias 4x5 de las individuales</span>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 text-xs sm:text-sm font-bold">1</span>
                        </div>
                        <span className="text-gray-700 text-sm sm:text-base">Carpeta personalizada (20x30)</span>
                      </div>
                    </div>
                    
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 sm:py-3 text-sm sm:text-lg font-medium min-h-[44px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPackageSelect?.(pkg.id);
                      }}
                    >
                      ELEGIR {pkg.name.toUpperCase()} →
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-center mt-4 sm:mt-8">
              <p className="text-xs sm:text-sm text-gray-500 px-4">
                💡 Con la compra de cualquier opción, podés pedir copias sueltas adicionales de diferentes tamaños
              </p>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

export default PixiesetGalleryMain;

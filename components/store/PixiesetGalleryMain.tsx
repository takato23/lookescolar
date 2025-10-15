'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Calendar,
  MapPin,
  Camera,
  Sparkles,
  Users,
  Share2,
  Heart,
  ShoppingBag,
  Image as ImageIcon,
  Filter,
  ArrowRight,
  Star,
  BookmarkCheck,
  Loader2,
} from 'lucide-react';

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
  subtitle?: string;
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
  packages?: PackageOption[];
  onPhotoClick: (photo: Photo) => void;
  onBuyPhoto: (photo: Photo) => void;
  onPackageSelect?: (packageId: string) => void;
  onToggleFavorite?: (photoId: string) => void;
  onShareEvent?: () => void;
  className?: string;
  settings?: any;
  theme?: any;
}

// Componente auxiliar para manejar imágenes con loading states y fallbacks
function PhotoCard({
  photo,
  isHovered,
  isFavorite,
  onPhotoClick,
  onToggleFavorite,
  onBuyPhoto
}: {
  photo: Photo;
  isHovered: boolean;
  isFavorite?: boolean;
  onPhotoClick: (photo: Photo) => void;
  onToggleFavorite?: (photoId: string) => void;
  onBuyPhoto: (photo: Photo) => void;
}) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const imageSrc = photo.preview_url || photo.url;

  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 dark:from-slate-800 dark:to-slate-900"
    >
      {/* Favorite button */}
      <button
        type="button"
        className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition-all duration-200 hover:bg-white hover:scale-110 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:bg-slate-800"
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite?.(photo.id);
        }}
      >
        <Heart className={cn('h-4 w-4 transition-colors', isFavorite && 'fill-red-500 text-red-500')} />
      </button>

      {/* Image container */}
      <button
        type="button"
        className="relative block aspect-[3/4] w-full overflow-hidden"
        onClick={() => onPhotoClick(photo)}
      >
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        )}

        {!imageError ? (
          <img
            src={imageSrc}
            alt={photo.alt}
            className={cn(
              "h-full w-full object-cover transition-all duration-500 group-hover:scale-110",
              imageLoading && "opacity-0"
            )}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
            <div className="text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-xs text-slate-500">Imagen no disponible</p>
            </div>
          </div>
        )}

        {/* Overlay on hover */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-300',
            isHovered && 'opacity-100'
          )}
        />
      </button>

      {/* Photo info */}
      <div className="relative bg-white p-4 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-slate-900 line-clamp-1 dark:text-slate-100">
              {photo.student || 'Foto individual'}
            </p>
            <p className="text-xs text-slate-600 line-clamp-1 dark:text-slate-400">
              {photo.subject || 'Colección LookEscolar'}
            </p>
          </div>
          {photo.isGroupPhoto ? (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
              Grupal
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Individual
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 flex-1 border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => onPhotoClick(photo)}
          >
            Ver
          </Button>
          <Button
            size="sm"
            className="h-9 flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            onClick={() => onBuyPhoto(photo)}
          >
            Seleccionar
          </Button>
        </div>
      </div>
    </div>
  );
}

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'individual', label: 'Individuales' },
  { id: 'group', label: 'Grupales' },
  { id: 'favorites', label: 'Favoritas' },
];

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
  theme,
}: PixiesetGalleryMainProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [hoveredPhoto, setHoveredPhoto] = useState<string | null>(null);

  const primaryColor = theme?.colors?.primary || '#2F6FED';
  const accentColor = theme?.colors?.accent || '#F7B731';
  const surfaceColor = theme?.colors?.surface || '#F5F7FB';

  const metrics = useMemo(() => {
    const primaryPackage = packages[0];
    const averagePrice = packages.length
      ? packages.reduce((sum, pkg) => sum + pkg.price, 0) / packages.length
      : 0;

    return [
      {
        label: 'Fotos disponibles',
        value: eventInfo.totalPhotos,
        icon: <Camera className="h-4 w-4" />,
      },
      {
        label: 'Paquetes curados',
        value: packages.length,
        icon: <ShoppingBag className="h-4 w-4" />,
      },
      {
        label: 'Valor promedio',
        value: averagePrice ? formatCurrency(averagePrice / 100) : '—',
        icon: <Sparkles className="h-4 w-4" />,
      },
    ];
  }, [eventInfo.totalPhotos, packages]);

  const filteredPhotos = useMemo(() => {
    switch (activeFilter) {
      case 'group':
        return photos.filter((photo) => photo.isGroupPhoto);
      case 'individual':
        return photos.filter((photo) => !photo.isGroupPhoto);
      case 'favorites':
        return photos.filter((photo) => photo.isFavorite);
      default:
        return photos;
    }
  }, [photos, activeFilter]);

  const heroTitle =
    theme?.texts?.hero_title || settings?.texts?.hero_title || eventInfo.name;
  const heroSubtitle =
    theme?.texts?.hero_subtitle ||
    settings?.texts?.hero_subtitle ||
    eventInfo.subtitle ||
    'Elegí tus mejores recuerdos en minutos';

  const handleExplorePackages = () => {
    if (packages.length > 0 && onPackageSelect) {
      onPackageSelect(packages[0].id);
    }
  };

  return (
    <div className={cn('looke-store min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100', className)}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background - Configurable banner image or default gradient */}
        {settings?.banner_url ? (
          <div className="absolute inset-0">
            <img
              src={settings.banner_url}
              alt="Banner personalizado"
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-black/30" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05),transparent_50%)]" />
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-20">
            <div className="max-w-2xl space-y-8">
              <div className="space-y-4">
                <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 flex items-center gap-2 text-sm px-4 py-2 shadow-lg">
                  <Sparkles className="h-4 w-4" /> Experiencia LookEscolar Premium
                </Badge>
                <div className="space-y-6">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
                    {heroTitle}
                  </h1>
                  <p className="text-lg sm:text-xl text-white/90 leading-relaxed max-w-xl">
                    {heroSubtitle}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-white/80 text-sm">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">{eventInfo.date}</span>
                </div>
                {eventInfo.location && (
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">{eventInfo.location}</span>
                  </div>
                )}
                {eventInfo.photographer && (
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{eventInfo.photographer}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Button
                  onClick={handleExplorePackages}
                  className="group relative px-8 py-6 text-lg font-semibold bg-white text-slate-900 hover:bg-slate-50 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                >
                  Comenzar a elegir
                  <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={onShareEvent}
                  className="text-white hover:bg-white/20 backdrop-blur-sm border-white/30 hover:border-white/50 px-6 py-6 text-lg"
                >
                  Compartir galería
                  <Share2 className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Stats Card - Improved design */}
            <div className="w-full max-w-lg">
              <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl p-8 shadow-2xl">
                <h3 className="text-xl font-semibold text-white mb-6 text-center">Resumen de tu evento</h3>
                <div className="grid gap-4">
                  {metrics.map((metric, index) => (
                    <div
                      key={metric.label}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 text-white"
                      style={{
                        animationDelay: `${index * 100}ms`,
                        animation: 'fadeInUp 0.6s ease-out forwards'
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                          {metric.icon}
                        </span>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-white/70 font-medium">
                            {metric.label}
                          </p>
                          <p className="text-2xl font-bold">{metric.value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      </section>

      {/* Body */}
      <section className="relative z-10 -mt-16 pb-20 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-2xl dark:border-slate-700/60 dark:bg-slate-900/80">
            <div className="p-6 sm:p-8 lg:p-10">
              {/* Header with improved design */}
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8">
                <div className="space-y-3 max-w-2xl">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Tu galería fotográfica
                  </h2>
                  <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                    Explora, marca tus favoritas y selecciona las fotografías que acompañarán tus paquetes.
                    Las vistas previas están optimizadas para cargar rápido en cualquier dispositivo.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end lg:gap-4">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    onClick={() => setActiveFilter('favorites')}
                  >
                    <Heart className="h-4 w-4" />
                    Favoritas ({photos.filter((p) => p.isFavorite).length})
                  </Button>
                  <Button
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={handleExplorePackages}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Ver paquetes
                  </Button>
                </div>
              </div>

              {/* Filters with improved design */}
              <div className="flex flex-wrap items-center gap-3 mb-8 p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl backdrop-blur-sm">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Filter className="h-4 w-4" />
                  Filtrar por:
                </span>
                {FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={cn(
                      'rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 transform hover:scale-105',
                      activeFilter === filter.id
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Gallery Grid with improved responsive design */}
              {filteredPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-16 text-center">
                  <div className="rounded-full bg-slate-200 dark:bg-slate-700 p-6">
                    <BookmarkCheck className="h-12 w-12 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="space-y-3 max-w-md">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      No encontramos fotos para este filtro
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Prueba con otra categoría o vuelve a ver todas las imágenes disponibles.
                    </p>
                  </div>
                  <Button
                    onClick={() => setActiveFilter('all')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                  >
                    Ver todas las fotos
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredPhotos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="animate-fade-in-up"
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animationFillMode: 'both'
                      }}
                    >
                      <PhotoCard
                        photo={photo}
                        isHovered={hoveredPhoto === photo.id}
                        isFavorite={photo.isFavorite}
                        onPhotoClick={onPhotoClick}
                        onToggleFavorite={onToggleFavorite}
                        onBuyPhoto={onBuyPhoto}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Custom CSS for animations */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .animate-fade-in-up {
              animation: fadeInUp 0.6s ease-out;
              animation-fill-mode: both;
            }

            .shadow-soft {
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }

            .shadow-3xl {
              box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
            }
          `
        }} />
      </section>
    </div>
  );
}

export default PixiesetGalleryMain;

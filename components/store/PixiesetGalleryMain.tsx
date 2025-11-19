'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Check,
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

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
    <motion.div
      variants={itemVariants}
      className="group relative overflow-hidden rounded-3xl bg-white/50 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1 dark:bg-slate-900/50 border border-white/20 dark:border-white/10 backdrop-blur-sm"
    >
      {/* Favorite button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={cn(
          "absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-300 backdrop-blur-md border border-white/20",
          isFavorite
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-white/80 text-slate-600 hover:bg-white dark:bg-black/50 dark:text-white/80"
        )}
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite?.(photo.id);
        }}
      >
        <Heart className={cn('h-5 w-5 transition-colors', isFavorite && 'fill-current')} />
      </motion.button>

      {/* Image container */}
      <button
        type="button"
        className="relative block aspect-[3/4] w-full overflow-hidden"
        onClick={() => onPhotoClick(photo)}
      >
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {!imageError ? (
          <motion.img
            src={imageSrc}
            alt={photo.alt}
            className={cn(
              "h-full w-full object-cover transition-all duration-700 group-hover:scale-105",
              imageLoading ? "opacity-0" : "opacity-100"
            )}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800">
            <div className="text-center p-4">
              <ImageIcon className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">Imagen no disponible</p>
            </div>
          </div>
        )}

        {/* Overlay on hover */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300',
            isHovered && 'opacity-100'
          )}
        />

        {/* Quick action overlay */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px]",
          isHovered && "opacity-100"
        )}>
          <div className="transform translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-slate-900 shadow-lg backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Ver detalles
            </span>
          </div>
        </div>
      </button>

      {/* Photo info */}
      <div className="relative p-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-t border-white/20 dark:border-white/5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-slate-900 line-clamp-1 dark:text-slate-100">
              {photo.student || 'Foto individual'}
            </p>
            <p className="text-xs text-slate-500 line-clamp-1 dark:text-slate-400">
              {photo.subject || 'Colección LookEscolar'}
            </p>
          </div>
          {photo.isGroupPhoto ? (
            <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200/50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50 backdrop-blur-sm">
              Grupal
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-slate-100/50 text-slate-700 border-slate-200/50 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50 backdrop-blur-sm">
              Individual
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-slate-200 bg-white/50 hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:text-slate-300 transition-all duration-200"
            onClick={() => onPhotoClick(photo)}
          >
            Ver
          </Button>
          <Button
            size="sm"
            className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-md hover:shadow-lg transition-all duration-200"
            onClick={() => onBuyPhoto(photo)}
          >
            Seleccionar
          </Button>
        </div>
      </div>
    </motion.div>
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
    <div className={cn('looke-store min-h-screen bg-slate-50/50 dark:bg-slate-950', className)}>
      {/* Hero Section */}
      <section className="relative overflow-hidden pb-12 pt-20 lg:pt-32">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          {settings?.banner_url ? (
            <>
              <img
                src={settings.banner_url}
                alt="Banner"
                className="h-full w-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-50 dark:to-slate-950" />
            </>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-slate-50 dark:to-slate-950" />
            </div>
          )}
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl space-y-8"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Badge className="bg-white/10 text-white backdrop-blur-md border-white/20 hover:bg-white/20 transition-colors px-4 py-1.5 text-sm font-medium">
                    <Sparkles className="mr-2 h-3.5 w-3.5 text-amber-300" />
                    Experiencia Premium
                  </Badge>
                </motion.div>

                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-sm">
                  {heroTitle}
                </h1>
                <p className="max-w-xl text-lg text-white/90 sm:text-xl leading-relaxed font-light">
                  {heroSubtitle}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-white/80">
                <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/10">
                  <Calendar className="h-4 w-4" />
                  <span>{eventInfo.date}</span>
                </div>
                {eventInfo.location && (
                  <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/10">
                    <MapPin className="h-4 w-4" />
                    <span>{eventInfo.location}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  size="lg"
                  onClick={handleExplorePackages}
                  className="group relative overflow-hidden bg-white text-slate-900 hover:bg-slate-50 hover:shadow-2xl hover:shadow-white/20 transition-all duration-300"
                >
                  <span className="relative z-10 flex items-center gap-2 font-semibold">
                    Ver Paquetes
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onShareEvent}
                  className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 backdrop-blur-sm transition-all duration-300"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartir
                </Button>
              </div>
            </motion.div>

            {/* Stats Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="w-full max-w-md lg:w-auto"
            >
              <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl shadow-2xl lg:min-w-[320px]">
                <h3 className="mb-6 text-center text-lg font-medium text-white">Resumen del evento</h3>
                <div className="space-y-4">
                  {metrics.map((metric, index) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="flex items-center justify-between rounded-2xl bg-white/5 p-4 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                          {metric.icon}
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-white/60">
                            {metric.label}
                          </p>
                          <p className="text-xl font-bold text-white">{metric.value}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="relative z-20 -mt-8 pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2.5rem] border border-white/40 bg-white/80 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80 sm:p-10">

            {/* Header & Filters */}
            <div className="mb-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                  Galería Fotográfica
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  Explora la colección completa. Selecciona tus fotos favoritas para incluirlas en tu paquete personalizado.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2 rounded-full bg-slate-100/80 p-1.5 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700">
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                        activeFilter === filter.id
                          ? 'bg-white text-slate-900 shadow-md dark:bg-slate-700 dark:text-white'
                          : 'text-slate-600 hover:bg-white/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-white'
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Gallery Grid */}
            <AnimatePresence mode="wait">
              {filteredPhotos.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center py-24 text-center"
                >
                  <div className="mb-6 rounded-full bg-slate-100 p-6 dark:bg-slate-800">
                    <BookmarkCheck className="h-12 w-12 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    No hay fotos en esta categoría
                  </h3>
                  <p className="mt-2 max-w-sm text-slate-500 dark:text-slate-400">
                    Intenta cambiar el filtro o explora todas las fotos disponibles.
                  </p>
                  <Button
                    variant="link"
                    onClick={() => setActiveFilter('all')}
                    className="mt-4 text-indigo-600 dark:text-indigo-400"
                  >
                    Ver todas las fotos
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                >
                  {filteredPhotos.map((photo) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      isHovered={hoveredPhoto === photo.id}
                      isFavorite={photo.isFavorite}
                      onPhotoClick={onPhotoClick}
                      onToggleFavorite={onToggleFavorite}
                      onBuyPhoto={onBuyPhoto}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PixiesetGalleryMain;

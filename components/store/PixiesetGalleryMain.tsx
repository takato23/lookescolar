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
  ShoppingBag,
  Image as ImageIcon,
  ArrowRight,
  BookmarkCheck,
  Loader2,
  Heart,
  Share2
} from 'lucide-react';
import {
  resolveStoreDesign,
  getPaletteTokens,
  getTypographyPreset,
  getGridClasses,
} from '@/lib/store/store-design';

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
  onBuyPhoto,
  design
}: {
  photo: Photo;
  isHovered: boolean;
  isFavorite?: boolean;
  onPhotoClick: (photo: Photo) => void;
  onToggleFavorite?: (photoId: string) => void;
  onBuyPhoto: (photo: Photo) => void;
  design: any;
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
      className={cn(
        "group relative overflow-hidden bg-white/50 transition-all duration-500 hover:-translate-y-1 dark:bg-slate-900/50 backdrop-blur-sm",
        design.cover.variant === 'journal' ? "rounded-sm" : "rounded-3xl",
        design.cover.variant === 'outline' ? "border border-current" : "shadow-sm hover:shadow-xl",
      )}
      style={{
        borderColor: 'var(--border)',
      }}
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
        className={cn("relative block w-full overflow-hidden",
          design.grid.style === 'horizontal' ? 'aspect-[4/3]' : 'aspect-[3/4]'
        )}
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
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-md"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              Ver detalles
            </span>
          </div>
        </div>
      </button>

      {/* Photo info */}
      <div
        className="relative p-4 backdrop-blur-md border-t border-white/5"
        style={{ backgroundColor: 'var(--background)' }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--text)' }}>
              {photo.student || 'Foto individual'}
            </p>
            <p className="text-xs line-clamp-1 opacity-70" style={{ color: 'var(--text-secondary)' }}>
              {photo.subject || 'Colección LookEscolar'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full transition-all duration-200"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            onClick={() => onPhotoClick(photo)}
          >
            Ver
          </Button>
          <Button
            size="sm"
            className="w-full shadow-md hover:shadow-lg transition-all duration-200"
            style={{ backgroundColor: 'var(--text)', color: 'var(--background)' }}
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
  theme: legacyTheme,
}: PixiesetGalleryMainProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [hoveredPhoto, setHoveredPhoto] = useState<string | null>(null);

  // Resolve Design
  const design = useMemo(() => resolveStoreDesign(settings?.design), [settings?.design]);
  const palette = useMemo(() => getPaletteTokens(design.color.palette), [design.color.palette]);
  const typography = useMemo(() => getTypographyPreset(design.typography.preset), [design.typography.preset]);
  const grid = useMemo(() => getGridClasses(design.grid), [design.grid]);

  // CSS Variables for dynamic theming
  const themeStyle = {
    '--primary': palette.accent,
    '--secondary': palette.accentSoft,
    '--background': palette.background,
    '--surface': palette.surface,
    '--text': palette.text,
    '--text-secondary': palette.muted,
    '--border': palette.border,
  } as React.CSSProperties;

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
    legacyTheme?.texts?.hero_title || settings?.texts?.hero_title || eventInfo.name;
  const heroSubtitle =
    legacyTheme?.texts?.hero_subtitle ||
    settings?.texts?.hero_subtitle ||
    eventInfo.subtitle ||
    'Elegí tus mejores recuerdos en minutos';

  const handleExplorePackages = () => {
    if (packages.length > 0 && onPackageSelect) {
      onPackageSelect(packages[0].id);
    }
  };

  // Hero Layout Logic
  const isCentered = design.cover.style === 'center' || design.cover.style === 'joy';
  const isLeft = design.cover.style === 'left' || design.cover.style === 'novel';
  const isFrame = design.cover.style === 'frame' || design.cover.style === 'border';

  const heroTextClass = cn(
    typography.baseClass,
    isCentered ? "text-center mx-auto" : "text-left",
    "max-w-3xl"
  );

  const heroBgStyle = settings?.banner_url ? {
    backgroundImage: `url(${settings.banner_url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : {
    background: `linear-gradient(to bottom right, ${palette.accent}, ${palette.text})`
  };

  return (
    <div
      className={cn('looke-store min-h-screen transition-colors duration-500', className, typography.baseClass)}
      style={themeStyle}
    >
      <style jsx global>{`
           :root {
              --font-theme: ${design.typography.preset === 'serif' ? 'serif' : 'sans-serif'};
           }
        `}</style>

      {/* Hero Section */}
      <section className={cn(
        "relative overflow-hidden",
        design.cover.style === 'none' ? "pb-6 pt-12" : "pb-12 pt-20 lg:pt-32"
      )}>
        {/* Background Elements */}
        {design.cover.style !== 'none' && (
          <div className="absolute inset-0 z-0 opacity-100">
            {isFrame ? (
              <div className="absolute inset-4 md:inset-8 border-[12px] opacity-20" style={{ borderColor: 'var(--surface)' }} />
            ) : null}

            <div
              className={cn(
                "absolute inset-0 transition-opacity",
                isFrame ? "opacity-90" : "opacity-100"
              )}
              style={heroBgStyle}
            />
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, ${palette.background} 95%)` }}
            />
          </div>
        )}

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={cn(
            "flex flex-col gap-12",
            isCentered ? "items-center" : "lg:flex-row lg:items-center lg:justify-between"
          )}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className={cn("space-y-8", heroTextClass)}
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: isCentered ? 0 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className={cn(isCentered && "flex justify-center")}
                >
                  <Badge
                    className="backdrop-blur-md border hover:bg-white/20 transition-colors px-4 py-1.5 text-sm font-medium"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: 'white'
                    }}
                  >
                    <Sparkles className="mr-2 h-3.5 w-3.5 text-amber-300" />
                    Experiencia Premium
                  </Badge>
                </motion.div>

                <h1
                  className={cn(
                    "text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl drop-shadow-sm",
                    typography.headingClass
                  )}
                  style={{ color: design.cover.style === 'none' ? 'var(--text)' : 'white' }}
                >
                  {heroTitle}
                </h1>
                <p
                  className="text-lg sm:text-2xl leading-relaxed font-light"
                  style={{ color: design.cover.style === 'none' ? 'var(--text-secondary)' : 'rgba(255,255,255,0.9)' }}
                >
                  {heroSubtitle}
                </p>
              </div>

              <div className={cn("flex flex-wrap gap-4 text-sm", isCentered && "justify-center")}>
                {[
                  { icon: Calendar, text: eventInfo.date },
                  { icon: MapPin, text: eventInfo.location },
                ].map((item, i) => (
                  item.text && (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-full px-4 py-2 backdrop-blur-sm border"
                      style={{
                        backgroundColor: design.cover.style === 'none' ? 'var(--surface)' : 'rgba(255,255,255,0.1)',
                        borderColor: design.cover.style === 'none' ? 'var(--border)' : 'rgba(255,255,255,0.1)',
                        color: design.cover.style === 'none' ? 'var(--text-secondary)' : 'rgba(255,255,255,0.9)'
                      }}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.text}</span>
                    </div>
                  )
                ))}
              </div>

              <div className={cn("flex gap-4 sm:flex-row", isCentered ? "justify-center" : "")}>
                <Button
                  size="lg"
                  onClick={handleExplorePackages}
                  className="group relative overflow-hidden transition-all duration-300 shadow-xl hover:shadow-2xl"
                  style={{ backgroundColor: 'var(--text)', color: 'var(--background)' }}
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
                  className="backdrop-blur-sm transition-all duration-300"
                  style={{
                    borderColor: design.cover.style === 'none' ? 'var(--border)' : 'rgba(255,255,255,0.3)',
                    color: design.cover.style === 'none' ? 'var(--text)' : 'white',
                    backgroundColor: 'transparent'
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartir
                </Button>
              </div>
            </motion.div>

            {/* Stats Card (Only for non-centered layouts to balance) */}
            {!isCentered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="w-full max-w-md lg:min-w-[320px]"
              >
                <div
                  className="rounded-3xl p-6 backdrop-blur-xl shadow-2xl border"
                  style={{
                    backgroundColor: design.cover.style === 'none' ? 'var(--surface)' : 'rgba(255,255,255,0.1)',
                    borderColor: design.cover.style === 'none' ? 'var(--border)' : 'rgba(255,255,255,0.2)'
                  }}
                >
                  <h3 className={cn("mb-6 text-center text-lg font-medium", design.cover.style === 'none' && "text-[var(--text)]")}>
                    Resumen del evento
                  </h3>
                  <div className="space-y-4">
                    {metrics.map((metric, index) => (
                      <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        className="flex items-center justify-between rounded-2xl p-4 border transition-colors"
                        style={{
                          backgroundColor: design.cover.style === 'none' ? 'var(--background)' : 'rgba(255,255,255,0.05)',
                          borderColor: design.cover.style === 'none' ? 'var(--border)' : 'rgba(255,255,255,0.1)'
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor: design.cover.style === 'none' ? 'var(--surface)' : 'rgba(255,255,255,0.1)',
                              color: design.cover.style === 'none' ? 'var(--primary)' : 'white'
                            }}
                          >
                            {metric.icon}
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider opacity-60" style={{ color: design.cover.style === 'none' ? 'var(--text-secondary)' : 'white' }}>
                              {metric.label}
                            </p>
                            <p className="text-xl font-bold" style={{ color: design.cover.style === 'none' ? 'var(--text)' : 'white' }}>{metric.value}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="relative z-20 pb-24 transition-colors duration-500" style={{ backgroundColor: 'var(--background)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              "rounded-[2.5rem] border shadow-xl backdrop-blur-xl sm:p-10 p-6",
              design.cover.style !== 'none' && "-mt-16"
            )}
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)'
            }}
          >

            {/* Header & Filters */}
            <div className="mb-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4 max-w-2xl">
                <h2 className={cn("text-3xl font-bold tracking-tight sm:text-4xl", typography.headingClass)} style={{ color: 'var(--text)' }}>
                  Galería Fotográfica
                </h2>
                <p className="text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Explora la colección completa. Selecciona tus fotos favoritas para incluirlas en tu paquete personalizado.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div
                  className="flex flex-wrap items-center gap-2 rounded-full p-1.5 backdrop-blur-sm border"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                >
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                        activeFilter === filter.id && 'shadow-md'
                      )}
                      style={{
                        backgroundColor: activeFilter === filter.id ? 'var(--surface)' : 'transparent',
                        color: activeFilter === filter.id ? 'var(--accent)' : 'var(--text-secondary)'
                      }}
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
                  <div className="mb-6 rounded-full p-6" style={{ backgroundColor: 'var(--background)' }}>
                    <BookmarkCheck className="h-12 w-12 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
                    No hay fotos en esta categoría
                  </h3>
                  <p className="mt-2 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                    Intenta cambiar el filtro o explora todas las fotos disponibles.
                  </p>
                  <Button
                    variant="link"
                    onClick={() => setActiveFilter('all')}
                    className="mt-4"
                    style={{ color: 'var(--primary)' }}
                  >
                    Ver todas las fotos
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className={cn(
                    "grid",
                    grid.colsClass,
                    grid.gapClass
                  )}
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
                      design={design}
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

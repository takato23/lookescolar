'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Users,
  User,
  Layers,
  CheckCircle2,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  resolveStoreDesign,
  getPaletteTokens,
  getTypographyPreset,
} from '@/lib/store/store-design';

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
}: PixiesetPhotoSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<'individual' | 'group'>('individual');
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhotos>({
    individual: [],
    group: [],
  });

  // Resolve Design
  const design = useMemo(() => resolveStoreDesign(settings?.design), [settings?.design]);
  const palette = useMemo(() => getPaletteTokens(design.color.palette), [design.color.palette]);
  const typography = useMemo(() => getTypographyPreset(design.typography.preset), [design.typography.preset]);

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


  const individualPhotos = useMemo(() => photos.filter((photo) => !photo.isGroupPhoto), [photos]);
  const groupPhotos = useMemo(() => photos.filter((photo) => photo.isGroupPhoto), [photos]);

  const canSelectMoreIndividual =
    selectedPhotos.individual.length < selectedPackage.contents.individualPhotos;
  const canSelectMoreGroup =
    selectedPhotos.group.length < (selectedPackage.contents.groupPhotos || 1);

  // Si no hay fotos grupales disponibles, no las requerimos para completar la selección
  const groupPhotosRequired = selectedPackage.contents.groupPhotos > 0 && groupPhotos.length > 0;

  const isSelectionComplete =
    selectedPhotos.individual.length === selectedPackage.contents.individualPhotos &&
    (!groupPhotosRequired || selectedPhotos.group.length === selectedPackage.contents.groupPhotos);

  const toggleIndividualSelection = (photoId: string) => {
    setSelectedPhotos((prev) => {
      const alreadySelected = prev.individual.includes(photoId);
      if (alreadySelected) {
        return { ...prev, individual: prev.individual.filter((id) => id !== photoId) };
      }

      if (!canSelectMoreIndividual) {
        return prev;
      }

      return { ...prev, individual: [...prev.individual, photoId] };
    });
  };

  const toggleGroupSelection = (photoId: string) => {
    setSelectedPhotos((prev) => {
      const alreadySelected = prev.group.includes(photoId);
      if (alreadySelected) {
        return { ...prev, group: prev.group.filter((id) => id !== photoId) };
      }

      if (!canSelectMoreGroup) {
        return prev;
      }

      return { ...prev, group: [...prev.group, photoId] };
    });
  };

  const handleAddToCart = () => {
    if (isSelectionComplete) {
      onAddToCart(selectedPhotos);
    }
  };

  const renderPhotoCard = (photo: Photo, isSelected: boolean, onToggle: (id: string) => void) => (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      key={photo.id}
      type="button"
      onClick={() => onToggle(photo.id)}
      className={cn(
        'group relative overflow-hidden rounded-3xl border bg-white/60 shadow-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:bg-slate-900/60',
        isSelected ? 'ring-2' : ''
      )}
      style={{
        borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
        boxShadow: isSelected ? '0 0 0 2px var(--primary)' : ''
      }}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        <img
          src={photo.preview_url || photo.url}
          alt={photo.alt}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className={cn(
          "absolute inset-0 transition-opacity duration-300",
          isSelected ? "opacity-40" : "opacity-0 group-hover:opacity-100"
        )}
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}
        />

        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px]"
              style={{ backgroundColor: 'rgba(var(--primary), 0.2)' }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg text-white"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                <Check className="h-6 w-6" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isSelected && (
          <span
            className="absolute left-3 top-3 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold shadow-lg text-white"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <CheckCircle2 className="h-3 w-3" /> Seleccionada
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0 text-left">
          <p className="text-sm font-bold line-clamp-1" style={{ color: 'var(--text)' }}>
            {photo.student || 'Foto individual'}
          </p>
          <p className="text-xs line-clamp-1 opacity-70" style={{ color: 'var(--text-secondary)' }}>
            {photo.subject || 'Colección LookEscolar'}
          </p>
        </div>
        <Badge variant={isSelected ? 'default' : 'secondary'}
          className="transition-colors"
          style={{
            backgroundColor: isSelected ? 'var(--primary)' : 'var(--secondary)',
            color: isSelected ? 'var(--background)' : 'var(--text)'
          }}
        >
          {photo.isGroupPhoto ? 'Grupal' : 'Individual'}
        </Badge>
      </div>
    </motion.button>
  );

  const renderCategoryGrid = (type: 'individual' | 'group') => {
    if (type === 'individual') {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {individualPhotos.map((photo) =>
              renderPhotoCard(photo, selectedPhotos.individual.includes(photo.id), toggleIndividualSelection)
            )}
          </AnimatePresence>
        </div>
      );
    }

    if (groupPhotos.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-dashed p-12 text-center text-sm backdrop-blur-sm"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text-secondary)'
          }}
        >
          <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-50" />
          No encontramos fotos grupales todavía. Podés continuar y las seleccionaremos por vos cuando estén disponibles.
        </motion.div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {groupPhotos.map((photo) =>
            renderPhotoCard(photo, selectedPhotos.group.includes(photo.id), toggleGroupSelection)
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div
      className={cn('looke-store min-h-screen transition-colors duration-500', className, typography.baseClass)}
      style={{ ...themeStyle, backgroundColor: 'var(--background)', color: 'var(--text)' }}
    >
      <style jsx global>{`
           :root {
              --font-theme: ${design.typography.preset === 'serif' ? 'serif' : 'sans-serif'};
           }
      `}</style>

      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-xl transition-colors"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="group flex items-center gap-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ color: 'var(--text)' }}
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Volver al paquete
          </Button>

          <div
            className="hidden items-center gap-2 text-xs sm:flex"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ShieldCheck className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            Guardamos tus selecciones automáticamente
          </div>

          <Badge
            variant={isSelectionComplete ? 'default' : 'secondary'}
            className={cn(
              "text-xs transition-colors",
              isSelectionComplete ? "text-white" : ""
            )}
            style={{
              backgroundColor: isSelectionComplete ? '#22c55e' : 'var(--secondary)',
              color: isSelectionComplete ? 'white' : 'var(--text)'
            }}
          >
            {selectedPhotos.individual.length + selectedPhotos.group.length} /{' '}
            {selectedPackage.contents.individualPhotos + selectedPackage.contents.groupPhotos} fotos seleccionadas
          </Badge>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <section
          className="grid gap-6 rounded-[2rem] border p-6 shadow-lg backdrop-blur-md sm:grid-cols-[minmax(0,1fr)_320px]"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="space-y-4">
            <Badge
              className="transition-colors border bg-opacity-20"
              style={{
                backgroundColor: 'var(--secondary)',
                color: 'var(--primary)',
                borderColor: 'var(--border)'
              }}
            >
              Paso 3 · Seleccioná tus fotos
            </Badge>
            <h1 className={cn("text-3xl font-bold tracking-tight", typography.headingClass)} style={{ color: 'var(--text)' }}>{selectedPackage.name}</h1>
            <p className="text-sm max-w-2xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Elegí <strong style={{ color: 'var(--text)' }}>{selectedPackage.contents.individualPhotos} foto(s) individual(es)</strong>
              {groupPhotosRequired && (
                <> y <strong style={{ color: 'var(--text)' }}>{selectedPackage.contents.groupPhotos} foto(s) grupal(es)</strong></>
              )}
              {!groupPhotosRequired && selectedPackage.contents.groupPhotos > 0 && (
                <> (las fotos grupales se agregarán cuando estén disponibles)</>
              )}. Podés cambiar tu selección antes de finalizar el pedido.
            </p>

            <div
              className="grid gap-3 rounded-2xl border p-4 text-sm backdrop-blur-sm"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-opacity-20"
                    style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}
                  >
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--text)' }}>
                      Fotos individuales
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Seleccionadas: {selectedPhotos.individual.length} / {selectedPackage.contents.individualPhotos}
                    </p>
                  </div>
                </div>
                {/* Status Badge */}
                <Badge
                  variant={canSelectMoreIndividual ? 'outline' : 'default'}
                  className={cn(!canSelectMoreIndividual && "text-white border-transparent")}
                  style={!canSelectMoreIndividual ? { backgroundColor: '#22c55e' } : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  {canSelectMoreIndividual ? 'Seleccioná tus favoritas' : 'Completado'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-opacity-20"
                    style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}
                  >
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--text)' }}>Foto grupal</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Seleccionadas: {selectedPhotos.group.length} / {selectedPackage.contents.groupPhotos}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={canSelectMoreGroup ? 'outline' : 'default'}
                  className={cn(!canSelectMoreGroup && "text-white border-transparent")}
                  style={!canSelectMoreGroup ? { backgroundColor: '#22c55e' } : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  {canSelectMoreGroup ? 'Seleccioná la preferida' : 'Completado'}
                </Badge>
              </div>
            </div>
          </div>

          <aside
            className="hidden rounded-2xl border p-6 backdrop-blur-sm lg:flex lg:flex-col lg:gap-4"
            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-opacity-20"
                style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}
              >
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Tips rápidos</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tocá una foto para seleccionarla.</p>
              </div>
            </div>
            <div className="space-y-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-amber-500" /> Elegí fotos nítidas y con buena iluminación.
              </div>
              <div className="flex items-center gap-2">
                <Layers className="h-3 w-3 text-blue-500" /> Las copias 4x5 se generan automáticamente.
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3 w-3 text-green-500" /> Nuestro equipo revisa cada selección.
              </div>
            </div>
          </aside>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: 'var(--secondary)', color: 'var(--text-secondary)' }}
            >
              <Layers className="h-3 w-3" /> Categoría
            </div>
            <div
              className="flex gap-2 rounded-full border p-1 backdrop-blur-md"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
            >
              <button
                type="button"
                onClick={() => setActiveCategory('individual')}
                className={cn(
                  'rounded-full px-5 py-2 text-xs font-bold transition-all',
                  activeCategory === 'individual' && 'shadow-md'
                )}
                style={{
                  backgroundColor: activeCategory === 'individual' ? 'var(--primary)' : 'transparent',
                  color: activeCategory === 'individual' ? 'var(--surface)' : 'var(--text-secondary)'
                }}
              >
                Individuales
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('group')}
                className={cn(
                  'rounded-full px-5 py-2 text-xs font-bold transition-all',
                  activeCategory === 'group' && 'shadow-md'
                )}
                style={{
                  backgroundColor: activeCategory === 'group' ? 'var(--primary)' : 'transparent',
                  color: activeCategory === 'group' ? 'var(--surface)' : 'var(--text-secondary)'
                }}
              >
                Grupales
              </button>
            </div>
          </div>

          {renderCategoryGrid(activeCategory)}
        </section>
      </main>

      <footer
        className="sticky bottom-0 z-40 border-t backdrop-blur-xl"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="text-sm font-medium">
            {isSelectionComplete ? (
              <span className="flex items-center gap-2" style={{ color: '#22c55e' }}>
                <CheckCircle2 className="h-5 w-5" /> Selección completa. Podés continuar.
              </span>
            ) : (
              <span className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                {groupPhotosRequired ? (
                  <>
                    Faltan {selectedPackage.contents.individualPhotos - selectedPhotos.individual.length} individual(es) y{' '}
                    {selectedPackage.contents.groupPhotos - selectedPhotos.group.length} grupal(es).
                  </>
                ) : (
                  <>
                    Faltan {selectedPackage.contents.individualPhotos - selectedPhotos.individual.length} individual(es) más.
                  </>
                )}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="ghost"
              onClick={onBack}
              className="w-full sm:w-auto hover:bg-slate-100 dark:hover:bg-slate-800"
              style={{ color: 'var(--text)' }}
            >
              Revisar paquete
            </Button>
            <Button
              onClick={handleAddToCart}
              disabled={!isSelectionComplete}
              className={cn(
                "w-full sm:w-auto shadow-lg transition-all hover:scale-[1.02]",
                !isSelectionComplete && "opacity-50 cursor-not-allowed"
              )}
              style={isSelectionComplete ? {
                background: `linear-gradient(to right, var(--primary), var(--text))`,
                color: 'white'
              } : {}}
            >
              Continuar al carrito
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PixiesetPhotoSelector;

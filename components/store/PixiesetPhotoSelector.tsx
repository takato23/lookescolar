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
}: PixiesetPhotoSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<'individual' | 'group'>('individual');
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhotos>({
    individual: [],
    group: [],
  });

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
        isSelected
          ? 'ring-2 ring-blue-500 border-blue-500 dark:ring-blue-400 dark:border-blue-400'
          : 'border-white/40 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-900/80'
      )}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        <img
          src={photo.preview_url || photo.url}
          alt={photo.alt}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent transition-opacity duration-300",
          isSelected ? "opacity-40" : "opacity-0 group-hover:opacity-100"
        )} />

        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-blue-500/20 backdrop-blur-[2px]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg">
                <Check className="h-6 w-6" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isSelected && (
          <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-blue-500 text-white px-3 py-1 text-xs font-bold shadow-lg">
            <CheckCircle2 className="h-3 w-3" /> Seleccionada
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0 text-left">
          <p className="text-sm font-bold text-foreground line-clamp-1">
            {photo.student || 'Foto individual'}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {photo.subject || 'Colección LookEscolar'}
          </p>
        </div>
        <Badge variant={isSelected ? 'default' : 'secondary'} className={cn(
          isSelected ? "bg-blue-500 hover:bg-blue-600" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
        )}>
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
          className="rounded-3xl border border-dashed border-slate-300 bg-white/40 p-12 text-center text-sm text-muted-foreground backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/40"
        >
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
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
    <div className={cn('looke-store min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100', className)}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-900/70 dark:border-slate-800/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="group flex items-center gap-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Volver al paquete
          </Button>

          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Guardamos tus selecciones automáticamente
          </div>

          <Badge
            variant={isSelectionComplete ? 'default' : 'secondary'}
            className={cn(
              "text-xs transition-colors",
              isSelectionComplete
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            {selectedPhotos.individual.length + selectedPhotos.group.length} /{' '}
            {selectedPackage.contents.individualPhotos + selectedPackage.contents.groupPhotos} fotos seleccionadas
          </Badge>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-6 rounded-[2rem] border border-white/40 bg-white/60 p-6 shadow-lg backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-900/60 sm:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
              Paso 3 · Seleccioná tus fotos
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{selectedPackage.name}</h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Elegí <strong className="text-foreground">{selectedPackage.contents.individualPhotos} foto(s) individual(es)</strong>
              {groupPhotosRequired && (
                <> y <strong className="text-foreground">{selectedPackage.contents.groupPhotos} foto(s) grupal(es)</strong></>
              )}
              {!groupPhotosRequired && selectedPackage.contents.groupPhotos > 0 && (
                <> (las fotos grupales se agregarán cuando estén disponibles)</>
              )}. Podés cambiar tu selección antes de finalizar el pedido.
            </p>

            <div className="grid gap-3 rounded-2xl border border-white/40 bg-white/40 p-4 text-sm backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">
                      Fotos individuales
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Seleccionadas: {selectedPhotos.individual.length} / {selectedPackage.contents.individualPhotos}
                    </p>
                  </div>
                </div>
                <Badge variant={canSelectMoreIndividual ? 'outline' : 'default'} className={cn(
                  !canSelectMoreIndividual && "bg-green-500 hover:bg-green-600 text-white border-transparent"
                )}>
                  {canSelectMoreIndividual ? 'Seleccioná tus favoritas' : 'Completado'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Foto grupal</p>
                    <p className="text-xs text-muted-foreground">
                      Seleccionadas: {selectedPhotos.group.length} / {selectedPackage.contents.groupPhotos}
                    </p>
                  </div>
                </div>
                <Badge variant={canSelectMoreGroup ? 'outline' : 'default'} className={cn(
                  !canSelectMoreGroup && "bg-green-500 hover:bg-green-600 text-white border-transparent"
                )}>
                  {canSelectMoreGroup ? 'Seleccioná la preferida' : 'Completado'}
                </Badge>
              </div>
            </div>
          </div>

          <aside className="hidden rounded-2xl border border-white/40 bg-white/40 p-6 backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-900/30 lg:flex lg:flex-col lg:gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Tips rápidos</p>
                <p className="text-xs text-muted-foreground">Tocá una foto para seleccionarla.</p>
              </div>
            </div>
            <div className="space-y-3 text-xs text-muted-foreground">
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
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <Layers className="h-3 w-3" /> Categoría
            </div>
            <div className="flex gap-2 rounded-full border border-white/20 bg-white/40 p-1 backdrop-blur-md dark:border-slate-700/30 dark:bg-slate-900/40">
              <button
                type="button"
                onClick={() => setActiveCategory('individual')}
                className={cn(
                  'rounded-full px-5 py-2 text-xs font-bold transition-all',
                  activeCategory === 'individual'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-muted-foreground hover:bg-white/50 dark:hover:bg-slate-800/50'
                )}
              >
                Individuales
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('group')}
                className={cn(
                  'rounded-full px-5 py-2 text-xs font-bold transition-all',
                  activeCategory === 'group'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-muted-foreground hover:bg-white/50 dark:hover:bg-slate-800/50'
                )}
              >
                Grupales
              </button>
            </div>
          </div>

          {renderCategoryGrid(activeCategory)}
        </section>
      </main>

      <footer className="sticky bottom-0 z-40 border-t border-white/20 bg-white/80 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="text-sm font-medium">
            {isSelectionComplete ? (
              <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" /> Selección completa. Podés continuar.
              </span>
            ) : (
              <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
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
            >
              Revisar paquete
            </Button>
            <Button
              onClick={handleAddToCart}
              disabled={!isSelectionComplete}
              className={cn(
                "w-full sm:w-auto shadow-lg transition-all hover:scale-[1.02]",
                isSelectionComplete
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  : "opacity-50 cursor-not-allowed"
              )}
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

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
} from 'lucide-react';

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

  const isSelectionComplete =
    selectedPhotos.individual.length === selectedPackage.contents.individualPhotos &&
    selectedPhotos.group.length === (selectedPackage.contents.groupPhotos || 0);

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
    <button
      key={photo.id}
      type="button"
      onClick={() => onToggle(photo.id)}
      className={cn(
        'group relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        <img
          src={photo.preview_url || photo.url}
          alt={photo.alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {isSelected ? (
          <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold shadow-lg">
            <CheckCircle2 className="h-4 w-4" /> Seleccionada
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground line-clamp-1">
            {photo.student || 'Foto individual'}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {photo.subject || 'Colección LookEscolar'}
          </p>
        </div>
        <Badge variant={isSelected ? 'default' : 'secondary'}>
          {photo.isGroupPhoto ? 'Grupal' : 'Individual'}
        </Badge>
      </div>
    </button>
  );

  const renderCategoryGrid = (type: 'individual' | 'group') => {
    if (type === 'individual') {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {individualPhotos.map((photo) =>
            renderPhotoCard(photo, selectedPhotos.individual.includes(photo.id), toggleIndividualSelection)
          )}
        </div>
      );
    }

    if (groupPhotos.length === 0) {
      return (
        <div className="rounded-3xl border border-dashed border-border bg-card/60 p-12 text-center text-sm text-muted-foreground">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          No encontramos fotos grupales todavía. Podés continuar y las seleccionaremos por vos cuando estén disponibles.
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groupPhotos.map((photo) =>
          renderPhotoCard(photo, selectedPhotos.group.includes(photo.id), toggleGroupSelection)
        )}
      </div>
    );
  };

  return (
    <div className={cn('looke-store min-h-screen bg-background text-foreground', className)}>
      <header className="border-b border-border/70 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 text-sm font-medium">
            <ArrowLeft className="h-4 w-4" /> Volver al paquete
          </Button>

          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="h-4 w-4 text-primary" /> Guardamos tus selecciones automáticamente
          </div>

          <Badge variant={isSelectionComplete ? 'default' : 'secondary'} className="text-xs">
            {selectedPhotos.individual.length + selectedPhotos.group.length} /{' '}
            {selectedPackage.contents.individualPhotos + selectedPackage.contents.groupPhotos} fotos seleccionadas
          </Badge>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-6 rounded-4xl border border-border bg-card p-6 shadow-soft sm:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Badge className="bg-primary/10 text-primary border-primary/20">Paso 3 · Seleccioná tus fotos</Badge>
            <h1 className="text-2xl font-semibold tracking-tight">{selectedPackage.name}</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Elegí {selectedPackage.contents.individualPhotos} foto(s) individual(es) y{' '}
              {selectedPackage.contents.groupPhotos} foto(s) grupal(es). Podés cambiar tu selección antes de finalizar el pedido.
            </p>

            <div className="grid gap-3 rounded-3xl border border-border/60 bg-surface p-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">
                      Fotos individuales
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Seleccionadas: {selectedPhotos.individual.length} / {selectedPackage.contents.individualPhotos}
                    </p>
                  </div>
                </div>
                <Badge variant={canSelectMoreIndividual ? 'outline' : 'default'}>
                  {canSelectMoreIndividual ? 'Seleccioná tus favoritas' : 'Completado'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">Foto grupal</p>
                    <p className="text-xs text-muted-foreground">
                      Seleccionadas: {selectedPhotos.group.length} / {selectedPackage.contents.groupPhotos}
                    </p>
                  </div>
                </div>
                <Badge variant={canSelectMoreGroup ? 'outline' : 'default'}>
                  {canSelectMoreGroup ? 'Seleccioná la preferida' : 'Completado'}
                </Badge>
              </div>
            </div>
          </div>

          <aside className="hidden rounded-3xl border border-border/60 bg-surface p-6 lg:flex lg:flex-col lg:gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ImageIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Tips rápidos</p>
                <p className="text-xs text-muted-foreground">Podés tocar nuevamente una foto para deseleccionarla.</p>
              </div>
            </div>
            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Elegí fotos nítidas y con buena iluminación.
              </div>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Las copias 4x5 se generan automáticamente en base a tus selecciones individuales.
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Nuestro equipo revisa cada selección antes de imprimir.
              </div>
            </div>
          </aside>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Layers className="h-4 w-4" /> Categoría
            </div>
            <div className="flex gap-2 rounded-full border border-border/60 bg-card p-1">
              <button
                type="button"
                onClick={() => setActiveCategory('individual')}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
                  activeCategory === 'individual'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                Individuales
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('group')}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
                  activeCategory === 'group'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                Grupales
              </button>
            </div>
          </div>

          {renderCategoryGrid(activeCategory)}
        </section>
      </main>

      <footer className="sticky bottom-0 border-t border-border/60 bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="text-sm text-muted-foreground">
            {isSelectionComplete ? (
              <span className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" /> Selección completa. Podés continuar.
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-accent" />
                Elegí {selectedPackage.contents.individualPhotos - selectedPhotos.individual.length} foto(s) individual(es) y{' '}
                {selectedPackage.contents.groupPhotos - selectedPhotos.group.length} grupal(es) para continuar.
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={onBack} className="w-full sm:w-auto">
              Revisar paquete
            </Button>
            <Button
              onClick={handleAddToCart}
              disabled={!isSelectionComplete}
              className="w-full sm:w-auto"
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

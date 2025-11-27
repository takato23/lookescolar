'use client';

import Image from 'next/image';
import { Check, Heart, ShoppingCart } from 'lucide-react';

interface Photo {
  id: string;
  signed_url: string;
  storage_path?: string;
}

interface GalleryStyleProps {
  photos: Photo[];
  isItemInCart: (id: string) => boolean;
  onPhotoClick: (index: number) => void;
  onToggleSelect: (photo: Photo) => void;
}

// =============================================================================
// ESTILO 1: MAGAZINE - Cards grandes con mucho espacio en blanco
// Ideal para fotos de baja calidad porque las muestra más pequeñas con contexto
// =============================================================================
export function MagazineStyle({ photos, isItemInCart, onPhotoClick, onToggleSelect }: GalleryStyleProps) {
  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        {photos.map((photo, index) => (
          <article
            key={photo.id}
            className="group animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Photo container with lots of padding */}
            <div
              className="relative bg-[#f8f8f8] p-8 cursor-pointer overflow-hidden"
              onClick={() => onPhotoClick(index)}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={photo.signed_url}
                  alt=""
                  fill
                  className="object-cover transition-all duration-700 ease-out group-hover:scale-105"
                  unoptimized
                />
              </div>

              {/* Subtle overlay on hover */}
              <div className="absolute inset-8 bg-black/0 group-hover:bg-black/10 transition-colors duration-500 pointer-events-none" />
            </div>

            {/* Info bar below */}
            <div className="flex items-center justify-between mt-4 px-2">
              <span className="text-xs text-gray-400 font-mono">
                {String(index + 1).padStart(3, '0')}
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleSelect(photo); }}
                  className={`flex items-center gap-2 px-4 py-2 text-xs tracking-wider transition-all duration-300 ${
                    isItemInCart(photo.id)
                      ? 'bg-gray-900 text-white transform scale-105'
                      : 'border border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900'
                  }`}
                >
                  {isItemInCart(photo.id) ? (
                    <>
                      <Check className="w-3 h-3 animate-scale-in" />
                      SELECCIONADA
                    </>
                  ) : (
                    'SELECCIONAR'
                  )}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ESTILO 2: POLAROID - Fotos con marco blanco grueso y sombras suaves
// El marco blanco distrae de la baja calidad y da un look nostálgico
// =============================================================================
export function PolaroidStyle({ photos, isItemInCart, onPhotoClick, onToggleSelect }: GalleryStyleProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 bg-[#e8e4df]">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {photos.map((photo, index) => {
          // Random slight rotation for organic feel
          const rotation = (index % 5 - 2) * 1.5;

          return (
            <div
              key={photo.id}
              className="group cursor-pointer animate-fade-in-up hover:z-10"
              style={{
                transform: `rotate(${rotation}deg)`,
                animationDelay: `${index * 30}ms`
              }}
              onClick={() => onPhotoClick(index)}
            >
              {/* Polaroid frame */}
              <div className="bg-white p-3 pb-14 shadow-lg hover:shadow-2xl transition-all duration-500 relative hover:-translate-y-2 hover:rotate-0">
                {/* Photo */}
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <Image
                    src={photo.signed_url}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                </div>

                {/* Selection indicator */}
                {isItemInCart(photo.id) && (
                  <div className="absolute top-5 right-5 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-scale-in">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}

                {/* Bottom area - like polaroid writing space */}
                <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-handwriting">
                    #{String(index + 1).padStart(2, '0')}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(photo); }}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      isItemInCart(photo.id)
                        ? 'bg-emerald-500 text-white scale-110'
                        : 'bg-gray-100 text-gray-500 hover:bg-emerald-500 hover:text-white hover:scale-110'
                    }`}
                  >
                    <Heart className={`w-4 h-4 transition-transform duration-300 ${isItemInCart(photo.id) ? 'fill-current scale-110' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// ESTILO 3: EDITORIAL - Grid asimétrico tipo revista de moda
// Mezcla de tamaños grandes y pequeños, muy elegante
// =============================================================================
export function EditorialStyle({ photos, isItemInCart, onPhotoClick, onToggleSelect }: GalleryStyleProps) {
  // Create layout pattern: large, small, small, large, etc
  const getGridClass = (index: number) => {
    const pattern = index % 6;
    if (pattern === 0) return 'md:col-span-2 md:row-span-2';
    if (pattern === 3) return 'md:col-span-2';
    return '';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={`group relative cursor-pointer overflow-hidden ${getGridClass(index)} animate-fade-in`}
            style={{ animationDelay: `${index * 40}ms` }}
            onClick={() => onPhotoClick(index)}
          >
            <div className="relative aspect-square overflow-hidden bg-gray-900">
              <Image
                src={photo.signed_url}
                alt=""
                fill
                className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out"
                unoptimized
              />

              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Selection badge */}
              {isItemInCart(photo.id) && (
                <div className="absolute top-3 left-3 bg-white px-3 py-1 text-xs font-medium tracking-wider animate-slide-in-left">
                  SELECCIONADA
                </div>
              )}

              {/* Bottom action bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
                <span className="text-white text-sm font-light">
                  Foto {index + 1}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleSelect(photo); }}
                  className={`px-4 py-2 text-xs tracking-wider transition-all duration-300 ${
                    isItemInCart(photo.id)
                      ? 'bg-white text-black'
                      : 'bg-white/20 backdrop-blur text-white hover:bg-white hover:text-black'
                  }`}
                >
                  {isItemInCart(photo.id) ? 'QUITAR' : 'AGREGAR'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ESTILO 4: MINIMAL CARDS - Cards flotantes con sombras suaves
// Clean, moderno, las sombras hacen que las fotos se vean premium
// =============================================================================
export function MinimalCardsStyle({ photos, isItemInCart, onPhotoClick, onToggleSelect }: GalleryStyleProps) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 bg-gray-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer animate-fade-in-up hover:-translate-y-2"
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => onPhotoClick(index)}
          >
            {/* Photo */}
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image
                src={photo.signed_url}
                alt=""
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                unoptimized
              />

              {/* Selection overlay */}
              {isItemInCart(photo.id) && (
                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center animate-fade-in">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center animate-scale-in">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Card footer */}
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Fotografía #{index + 1}</p>
                <p className="text-xs text-gray-400 mt-1">Digital + Impresa</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSelect(photo); }}
                className={`p-3 rounded-full transition-all duration-300 ${
                  isItemInCart(photo.id)
                    ? 'bg-emerald-500 text-white scale-110 rotate-12'
                    : 'bg-gray-100 text-gray-600 hover:bg-emerald-500 hover:text-white hover:scale-110 hover:rotate-12'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ESTILO 5: FILM STRIP - Estilo película de cine/fotografía análoga
// Bordes negros que simulan película, muy artístico
// =============================================================================
export function FilmStripStyle({ photos, isItemInCart, onPhotoClick, onToggleSelect }: GalleryStyleProps) {
  return (
    <div className="bg-neutral-900 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Film strip effect */}
        <div className="relative">
          {/* Sprocket holes decoration - animated */}
          <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-around py-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-sm bg-neutral-800 mx-auto animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-8 flex flex-col justify-around py-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-sm bg-neutral-800 mx-auto animate-pulse"
                style={{ animationDelay: `${i * 100 + 50}ms` }}
              />
            ))}
          </div>

          {/* Photos grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-12">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 60}ms` }}
                onClick={() => onPhotoClick(index)}
              >
                {/* Film frame */}
                <div className="bg-black p-2 rounded transition-all duration-500 group-hover:bg-neutral-800">
                  <div className="relative aspect-[3/2] overflow-hidden">
                    <Image
                      src={photo.signed_url}
                      alt=""
                      fill
                      className="object-cover transition-all duration-500 group-hover:brightness-110"
                      unoptimized
                    />

                    {/* Hover overlay with film grain effect */}
                    <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/20 transition-colors duration-500 mix-blend-overlay" />

                    {/* Selection */}
                    {isItemInCart(photo.id) && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center animate-scale-in">
                        <Check className="w-4 h-4 text-black" />
                      </div>
                    )}
                  </div>

                  {/* Frame number */}
                  <div className="flex items-center justify-between mt-2 px-1">
                    <span className="text-amber-500/80 text-xs font-mono">
                      {String(index + 1).padStart(2, '0')}A
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSelect(photo); }}
                      className={`text-xs tracking-wider px-3 py-1 transition-all duration-300 ${
                        isItemInCart(photo.id)
                          ? 'bg-amber-500 text-black'
                          : 'text-amber-500/60 hover:text-amber-500 hover:bg-amber-500/10'
                      }`}
                    >
                      {isItemInCart(photo.id) ? 'SELEC.' : 'SELECT'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ESTILO 6: PIXIESET CLASSIC - Grid limpio edge-to-edge con animaciones
// =============================================================================
export function PixiesetStyle({ photos, isItemInCart, onPhotoClick, onToggleSelect }: GalleryStyleProps) {
  return (
    <div className="max-w-[1800px] mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative aspect-square cursor-pointer group animate-fade-in overflow-hidden"
            style={{ animationDelay: `${index * 20}ms` }}
            onClick={() => onPhotoClick(index)}
          >
            <Image
              src={photo.signed_url}
              alt=""
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />

            {/* Hover actions */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSelect(photo); }}
                className={`p-3 rounded-full transition-all duration-300 transform scale-75 group-hover:scale-100 ${
                  isItemInCart(photo.id)
                    ? 'bg-white text-gray-900'
                    : 'bg-white/80 backdrop-blur text-gray-700 hover:bg-white'
                }`}
              >
                {isItemInCart(photo.id) ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <ShoppingCart className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Selection indicator */}
            {isItemInCart(photo.id) && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg animate-scale-in">
                <Check className="w-4 h-4 text-gray-900" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// CONFIGURACIÓN DE ESTILOS
// =============================================================================
export type GalleryStyleType = 'pixieset' | 'magazine' | 'polaroid' | 'editorial' | 'cards' | 'film';

export interface GalleryStyleConfig {
  id: GalleryStyleType;
  name: string;
  description: string;
  previewBg: string;
  previewAccent: string;
}

export const GALLERY_STYLES: GalleryStyleConfig[] = [
  {
    id: 'pixieset',
    name: 'Clásico',
    description: 'Grid limpio y elegante',
    previewBg: 'bg-white',
    previewAccent: 'bg-gray-200'
  },
  {
    id: 'magazine',
    name: 'Magazine',
    description: 'Cards grandes con espacio',
    previewBg: 'bg-gray-100',
    previewAccent: 'bg-gray-300'
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    description: 'Marcos blancos nostálgicos',
    previewBg: 'bg-[#e8e4df]',
    previewAccent: 'bg-white'
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Grid asimétrico de revista',
    previewBg: 'bg-gray-900',
    previewAccent: 'bg-gray-700'
  },
  {
    id: 'cards',
    name: 'Cards',
    description: 'Tarjetas con sombras suaves',
    previewBg: 'bg-gray-50',
    previewAccent: 'bg-white'
  },
  {
    id: 'film',
    name: 'Film',
    description: 'Estilo película análoga',
    previewBg: 'bg-neutral-900',
    previewAccent: 'bg-amber-500'
  },
];

// Helper para obtener el componente de estilo
export function getStyleComponent(style: GalleryStyleType) {
  switch (style) {
    case 'magazine': return MagazineStyle;
    case 'polaroid': return PolaroidStyle;
    case 'editorial': return EditorialStyle;
    case 'cards': return MinimalCardsStyle;
    case 'film': return FilmStripStyle;
    case 'pixieset':
    default: return PixiesetStyle;
  }
}

// Helper para obtener los colores de fondo según el estilo
export function getStyleColors(style: GalleryStyleType) {
  switch (style) {
    case 'film':
      return {
        background: 'bg-neutral-900',
        header: 'bg-neutral-900 border-neutral-800',
        text: 'text-white',
        textMuted: 'text-gray-500',
        accent: 'text-amber-500',
        accentBg: 'bg-amber-500',
        border: 'border-neutral-800'
      };
    case 'polaroid':
      return {
        background: 'bg-[#e8e4df]',
        header: 'bg-white/90 backdrop-blur border-gray-200',
        text: 'text-gray-900',
        textMuted: 'text-gray-500',
        accent: 'text-emerald-600',
        accentBg: 'bg-emerald-500',
        border: 'border-gray-200'
      };
    case 'cards':
      return {
        background: 'bg-gray-50',
        header: 'bg-white border-gray-100',
        text: 'text-gray-900',
        textMuted: 'text-gray-400',
        accent: 'text-emerald-600',
        accentBg: 'bg-emerald-500',
        border: 'border-gray-100'
      };
    case 'editorial':
      return {
        background: 'bg-white',
        header: 'bg-white border-gray-100',
        text: 'text-gray-900',
        textMuted: 'text-gray-400',
        accent: 'text-gray-900',
        accentBg: 'bg-gray-900',
        border: 'border-gray-100'
      };
    default:
      return {
        background: 'bg-white',
        header: 'bg-white border-gray-100',
        text: 'text-gray-900',
        textMuted: 'text-gray-400',
        accent: 'text-gray-900',
        accentBg: 'bg-gray-900',
        border: 'border-gray-100'
      };
  }
}

'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check, MoreHorizontal } from 'lucide-react';
import { PLACEHOLDER_IMAGES } from '@/lib/config/placeholder-images';

export type TemplateType =
  | 'pixieset'
  | 'editorial'
  | 'minimal'
  | 'modern-minimal'
  | 'bold-vibrant'
  | 'premium-photography'
  | 'studio-dark'
  | 'classic-gallery'
  | 'fashion-editorial'
  | 'modern'
  | 'classic'
  | 'premium-store';

// Cover style types matching Pixieset's design
export type CoverStyleType = 'stripe' | 'divider' | 'journal' | 'stamp' | 'outline' | 'classic' | 'none';

interface CoverStyleInfo {
  id: CoverStyleType;
  name: string;
  preview: React.ReactNode;
}

// Visual preview components for each cover style
function StripePreview() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm">
      <img
        src={PLACEHOLDER_IMAGES.heroes.groupPrimary}
        alt=""
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/90 px-4 py-1.5">
          <span className="text-[10px] font-semibold tracking-[0.15em] text-gray-800">TITLE</span>
        </div>
      </div>
    </div>
  );
}

function DividerPreview() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm">
      <img
        src={PLACEHOLDER_IMAGES.heroes.groupPrimary}
        alt=""
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="h-px w-8 bg-white/80" />
        <span className="my-2 text-[10px] font-semibold tracking-[0.15em] text-white drop-shadow-md">TITLE</span>
        <div className="h-px w-8 bg-white/80" />
      </div>
    </div>
  );
}

function JournalPreview() {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-sm bg-[#f5f3ef]">
      <div className="flex w-1/2 items-center justify-center p-2">
        <span className="text-[9px] font-medium tracking-[0.1em] text-gray-700">TITLE</span>
      </div>
      <div className="w-1/2">
        <img
          src={PLACEHOLDER_IMAGES.heroes.groupPrimary}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}

function StampPreview() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm">
      <img
        src={PLACEHOLDER_IMAGES.heroes.groupPrimary}
        alt=""
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/90 bg-transparent">
          <span className="text-[7px] font-bold tracking-wider text-white drop-shadow-md">TITLE</span>
        </div>
      </div>
    </div>
  );
}

function OutlinePreview() {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-sm bg-[#f5f3ef]">
      <div className="relative">
        <img
          src={PLACEHOLDER_IMAGES.heroes.groupPrimary}
          alt=""
          className="h-12 w-16 object-cover opacity-30"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="border border-gray-400 px-2 py-0.5 text-[9px] font-medium tracking-[0.1em] text-gray-600">
            TITLE
          </span>
        </div>
      </div>
    </div>
  );
}

function ClassicPreview() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm">
      <img
        src={PLACEHOLDER_IMAGES.heroes.groupPrimary}
        alt=""
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <span className="text-[8px] font-medium tracking-[0.1em] text-white">TITLE</span>
      </div>
    </div>
  );
}

function NonePreview() {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-sm border-2 border-dashed border-gray-200 bg-gray-50">
      <div className="h-8 w-12 rounded border border-gray-300 bg-white" />
    </div>
  );
}

function MorePreview() {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-sm border border-gray-200 bg-white">
      <MoreHorizontal className="h-5 w-5 text-gray-400" />
    </div>
  );
}

const COVER_STYLES: CoverStyleInfo[] = [
  { id: 'stripe', name: 'Stripe', preview: <StripePreview /> },
  { id: 'divider', name: 'Divider', preview: <DividerPreview /> },
  { id: 'journal', name: 'Journal', preview: <JournalPreview /> },
  { id: 'stamp', name: 'Stamp', preview: <StampPreview /> },
  { id: 'outline', name: 'Outline', preview: <OutlinePreview /> },
  { id: 'classic', name: 'Classic', preview: <ClassicPreview /> },
];

// Map templates to cover styles
const TEMPLATE_TO_COVER: Record<TemplateType, CoverStyleType> = {
  'pixieset': 'divider',
  'editorial': 'journal',
  'minimal': 'outline',
  'modern-minimal': 'stripe',
  'bold-vibrant': 'classic',
  'premium-photography': 'divider',
  'studio-dark': 'classic',
  'classic-gallery': 'classic',
  'fashion-editorial': 'journal',
  'modern': 'stripe',
  'classic': 'classic',
  'premium-store': 'divider',
};

// Map cover styles to templates (primary mapping)
const COVER_TO_TEMPLATE: Record<CoverStyleType, TemplateType> = {
  'stripe': 'modern-minimal',
  'divider': 'pixieset',
  'journal': 'editorial',
  'stamp': 'premium-store',
  'outline': 'minimal',
  'classic': 'classic',
  'none': 'minimal',
};

interface TemplateSelectorProps {
  currentTemplate: TemplateType;
  onTemplateChange: (template: TemplateType) => void;
  className?: string;
  showPreview?: boolean;
}

export function TemplateSelector({
  currentTemplate,
  onTemplateChange,
  className = '',
  showPreview = true,
}: TemplateSelectorProps) {
  const [selectedCover, setSelectedCover] = useState<CoverStyleType>(
    TEMPLATE_TO_COVER[currentTemplate] || 'divider'
  );

  // Sync with external template changes
  useEffect(() => {
    const coverStyle = TEMPLATE_TO_COVER[currentTemplate];
    if (coverStyle && coverStyle !== selectedCover) {
      setSelectedCover(coverStyle);
    }
  }, [currentTemplate]);

  const handleCoverSelect = (coverId: CoverStyleType) => {
    setSelectedCover(coverId);
    const template = COVER_TO_TEMPLATE[coverId];
    if (template) {
      onTemplateChange(template);
    }
  };

  // Get the current selected style info
  const selectedStyleInfo = COVER_STYLES.find((s) => s.id === selectedCover);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cover</h3>
          <p className="mt-0.5 text-sm text-gray-500">
            Elige el estilo de portada para tu galeria
          </p>
        </div>
      </div>

      {/* Cover Style Grid - Pixieset Style */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {COVER_STYLES.map((style) => {
          const isSelected = selectedCover === style.id;

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => handleCoverSelect(style.id)}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-lg transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2',
                isSelected
                  ? 'ring-2 ring-emerald-500 ring-offset-1'
                  : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1'
              )}
            >
              {/* Preview Container */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                {style.preview}

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </div>
                )}

                {/* Hover overlay */}
                <div
                  className={cn(
                    'absolute inset-0 bg-black/0 transition-all duration-200',
                    !isSelected && 'group-hover:bg-black/5'
                  )}
                />
              </div>

              {/* Label */}
              <div className="py-2 text-center">
                <span
                  className={cn(
                    'text-sm font-medium transition-colors',
                    isSelected ? 'text-emerald-600' : 'text-gray-700'
                  )}
                >
                  {style.name}
                </span>
              </div>
            </button>
          );
        })}

        {/* None option */}
        <button
          type="button"
          onClick={() => handleCoverSelect('none')}
          className={cn(
            'group relative flex flex-col overflow-hidden rounded-lg transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2',
            selectedCover === 'none'
              ? 'ring-2 ring-emerald-500 ring-offset-1'
              : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1'
          )}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
            <NonePreview />
            {selectedCover === 'none' && (
              <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                <Check className="h-3 w-3" strokeWidth={3} />
              </div>
            )}
          </div>
          <div className="py-2 text-center">
            <span
              className={cn(
                'text-sm font-medium transition-colors',
                selectedCover === 'none' ? 'text-emerald-600' : 'text-gray-700'
              )}
            >
              None
            </span>
          </div>
        </button>

        {/* More option */}
        <button
          type="button"
          disabled
          className="group relative flex cursor-not-allowed flex-col overflow-hidden rounded-lg opacity-60"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <MorePreview />
          </div>
          <div className="py-2 text-center">
            <span className="text-sm font-medium text-gray-500">More</span>
          </div>
        </button>
      </div>

      {/* Live Preview Panel */}
      {showPreview && selectedStyleInfo && (
        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-[#f8f7f4] shadow-sm">
          {/* Preview Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">Mi Coleccion</span>
              <span className="rounded border border-gray-300 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                BORRADOR
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Vista previa</span>
              <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white">
                Publicar
              </span>
            </div>
          </div>

          {/* Preview Content */}
          <div className="p-6">
            <div className="mx-auto max-w-md overflow-hidden rounded-xl bg-white shadow-sm">
              {/* Cover Preview */}
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <img
                  src={PLACEHOLDER_IMAGES.heroes.groupPrimary}
                  alt="Cover preview"
                  className="h-full w-full object-cover"
                />

                {/* Render cover style overlay based on selection */}
                {selectedCover === 'stripe' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/95 px-8 py-3 shadow-sm">
                      <span className="text-lg font-semibold tracking-[0.2em] text-gray-800">
                        MY COLLECTION
                      </span>
                    </div>
                  </div>
                )}

                {selectedCover === 'divider' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="h-px w-16 bg-white/80" />
                    <span className="my-3 text-xl font-semibold tracking-[0.25em] text-white drop-shadow-lg">
                      MY COLLECTION
                    </span>
                    <div className="h-px w-16 bg-white/80" />
                    <p className="mt-2 text-xs tracking-[0.15em] text-white/70">
                      Diciembre 2025
                    </p>
                  </div>
                )}

                {selectedCover === 'journal' && (
                  <>
                    <div className="absolute inset-y-0 left-0 flex w-2/5 items-center justify-center bg-[#f5f3ef]">
                      <div className="text-center">
                        <span className="text-lg font-medium tracking-[0.15em] text-gray-700">
                          MY COLLECTION
                        </span>
                        <p className="mt-1 text-xs text-gray-500">Diciembre 2025</p>
                      </div>
                    </div>
                    <div className="absolute inset-y-0 right-0 w-3/5">
                      <img
                        src={PLACEHOLDER_IMAGES.heroes.groupPrimary}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </>
                )}

                {selectedCover === 'stamp' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-white/90 bg-black/20 backdrop-blur-sm">
                      <span className="text-[10px] tracking-[0.2em] text-white/80">COLLECTION</span>
                      <span className="mt-1 text-sm font-bold tracking-wider text-white">2025</span>
                    </div>
                  </div>
                )}

                {selectedCover === 'outline' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#f5f3ef]/90">
                    <div className="border-2 border-gray-400 px-6 py-3">
                      <span className="text-lg font-medium tracking-[0.2em] text-gray-600">
                        MY COLLECTION
                      </span>
                    </div>
                  </div>
                )}

                {selectedCover === 'classic' && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-6">
                    <span className="text-xl font-semibold tracking-[0.15em] text-white">
                      MY COLLECTION
                    </span>
                    <p className="mt-1 text-sm text-white/70">Diciembre 2025</p>
                  </div>
                )}

                {selectedCover === 'none' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white">
                    <div className="text-center">
                      <span className="text-lg font-medium text-gray-800">MY COLLECTION</span>
                      <p className="mt-1 text-sm text-gray-500">Sin portada de imagen</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Gallery Preview */}
              <div className="border-t border-gray-100 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Galeria
                  </span>
                  <span className="text-xs text-gray-400">24 fotos</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square overflow-hidden rounded bg-gray-100"
                    >
                      <img
                        src={
                          i % 2 === 0
                            ? PLACEHOLDER_IMAGES.gallery.portraitGirl
                            : PLACEHOLDER_IMAGES.gallery.portraitBoy
                        }
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Device Toggle */}
          <div className="flex items-center justify-center gap-2 border-t border-gray-200 bg-white px-4 py-2">
            <button className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.5" />
                <path d="M8 21h8M12 17v4" strokeWidth="1.5" />
              </svg>
            </button>
            <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="5" y="2" width="14" height="20" rx="2" strokeWidth="1.5" />
                <path d="M12 18h.01" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateSelector;

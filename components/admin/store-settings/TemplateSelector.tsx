'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  EVENT_CATEGORIES,
  TEMPLATE_PRESETS,
  getPaletteTokens,
  getTypographyPreset,
  type EventCategory,
  type StoreDesignSettings,
  type TemplatePreset,
} from '@/lib/store/store-design';
import {
  Sparkles,
  Star,
  Monitor,
  Smartphone,
  Tablet,
  X,
  Check,
  Heart,
  ShoppingCart,
  Share2,
  ChevronRight,
} from 'lucide-react';
import { PLACEHOLDER_IMAGES } from '@/lib/config/placeholder-images';

interface TemplateSelectorProps {
  currentDesign?: StoreDesignSettings | null;
  onSelect: (design: StoreDesignSettings) => void;
  className?: string;
}

// Use local placeholder images for reliable mockups
const SAMPLE_PHOTOS = [
  PLACEHOLDER_IMAGES.gallery.portraitGirl,
  PLACEHOLDER_IMAGES.gallery.portraitBoy,
  PLACEHOLDER_IMAGES.gallery.candidActivity,
  PLACEHOLDER_IMAGES.gallery.classPhoto,
  PLACEHOLDER_IMAGES.gallery.portraitGirl,
  PLACEHOLDER_IMAGES.gallery.portraitBoy,
];

// Realistic template mockup component
const TemplateMockup = ({
  design,
  name,
  className,
}: {
  design: StoreDesignSettings;
  name: string;
  className?: string;
}) => {
  const palette = getPaletteTokens(design.color.palette);
  const typography = getTypographyPreset(design.typography.preset);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border shadow-sm transition-all',
        className
      )}
      style={{ backgroundColor: palette.background }}
    >
      {/* Mini Header */}
      <div
        className="flex items-center justify-between px-2 py-1.5"
        style={{ backgroundColor: palette.surface, borderBottom: `1px solid ${palette.border}` }}
      >
        <div className="flex items-center gap-1">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: palette.accent }}
          />
          <span
            className="text-[6px] font-medium"
            style={{ color: palette.text }}
          >
            Studio
          </span>
        </div>
        <div className="flex items-center gap-1" style={{ color: palette.muted }}>
          <Heart className="h-2 w-2" />
          <ShoppingCart className="h-2 w-2" />
        </div>
      </div>

      {/* Mini Hero */}
      {design.cover.style !== 'none' && (
        <div
          className="relative px-2 py-2"
          style={{ backgroundColor: palette.surface }}
        >
          <div
            className={cn(
              'relative overflow-hidden rounded-md',
              design.cover.style === 'center' && 'text-center',
              design.cover.style === 'frame' && 'border-2',
              design.cover.style === 'stripe' && 'border-t-2'
            )}
            style={{ borderColor: palette.accent }}
          >
            {/* Cover image placeholder */}
            <div
              className="h-10 w-full bg-gradient-to-br"
              style={{
                backgroundImage: `linear-gradient(135deg, ${palette.accentSoft} 0%, ${palette.accent}40 100%)`,
              }}
            />
            {/* Title overlay */}
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center',
                typography.baseClass
              )}
            >
              <span
                className={cn('text-[7px] font-semibold', typography.headingClass)}
                style={{ color: palette.text }}
              >
                {name.split(' ')[0]}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mini Photo Grid */}
      <div className="px-2 pb-2">
        <div
          className={cn(
            'grid',
            design.grid.style === 'horizontal' ? 'grid-cols-2' : 'grid-cols-3',
            design.grid.spacing === 'large' ? 'gap-1' : 'gap-0.5'
          )}
        >
          {SAMPLE_PHOTOS.slice(0, design.grid.style === 'horizontal' ? 4 : 6).map((_, i) => (
            <div
              key={i}
              className={cn(
                'overflow-hidden rounded-sm',
                design.grid.style === 'horizontal' ? 'aspect-[4/3]' : 'aspect-[3/4]',
                design.grid.thumb === 'large' && 'rounded-md'
              )}
              style={{ backgroundColor: palette.accentSoft }}
            >
              {/* Photo placeholder with gradient */}
              <div
                className="h-full w-full"
                style={{
                  backgroundImage: `linear-gradient(${135 + i * 30}deg, ${palette.border} 0%, ${palette.accentSoft} 100%)`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Full-screen preview component
const FullScreenPreview = ({
  template,
  isOpen,
  onClose,
  onSelect,
}: {
  template: TemplatePreset | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: () => void;
}) => {
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  if (!template) return null;

  const palette = getPaletteTokens(template.design.color.palette);
  const typography = getTypographyPreset(template.design.typography.preset);

  const previewWidth = {
    desktop: 'w-full max-w-4xl',
    tablet: 'w-[768px] max-w-full',
    mobile: 'w-[375px] max-w-full',
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg">{template.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Device toggle */}
              <div className="flex items-center gap-1 rounded-lg border p-1">
                <button
                  type="button"
                  onClick={() => setDeviceView('desktop')}
                  className={cn(
                    'rounded-md p-1.5 transition',
                    deviceView === 'desktop' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'
                  )}
                >
                  <Monitor className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceView('tablet')}
                  className={cn(
                    'rounded-md p-1.5 transition',
                    deviceView === 'tablet' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'
                  )}
                >
                  <Tablet className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceView('mobile')}
                  className={cn(
                    'rounded-md p-1.5 transition',
                    deviceView === 'mobile' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'
                  )}
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
              <Button onClick={onSelect} className="gap-2">
                <Check className="h-4 w-4" />
                Usar este diseño
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Preview area */}
        <div className="flex-1 overflow-auto bg-slate-100 p-6 flex items-start justify-center">
          <div
            className={cn(
              'transition-all duration-300 rounded-xl overflow-hidden shadow-2xl',
              previewWidth[deviceView]
            )}
            style={{ backgroundColor: palette.background }}
          >
            {/* Full preview header */}
            <header
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ backgroundColor: palette.surface, borderColor: palette.border }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: palette.accentSoft }}
                >
                  <span style={{ color: palette.accent }} className="text-lg font-bold">L</span>
                </div>
                <div>
                  <div className={cn('font-semibold', typography.baseClass)} style={{ color: palette.text }}>
                    LookEscolar Studio
                  </div>
                  <div className="text-xs" style={{ color: palette.muted }}>Tu galería escolar</div>
                </div>
              </div>
              <div className="flex items-center gap-4" style={{ color: palette.muted }}>
                <Heart className="h-5 w-5" />
                <ShoppingCart className="h-5 w-5" />
                <Share2 className="h-5 w-5" />
              </div>
            </header>

            {/* Hero section */}
            {template.design.cover.style !== 'none' && (
              <section className="p-6" style={{ backgroundColor: palette.surface }}>
                <div
                  className={cn(
                    'relative rounded-2xl overflow-hidden',
                    template.design.cover.variant === 'border' && 'border-4',
                    template.design.cover.variant === 'album' && 'shadow-xl'
                  )}
                  style={{ borderColor: palette.border }}
                >
                  <div
                    className="h-48 md:h-64"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${palette.accentSoft} 0%, ${palette.accent}60 50%, ${palette.text}30 100%)`,
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                    <div
                      className="text-xs uppercase tracking-[0.3em] mb-2"
                      style={{ color: palette.muted }}
                    >
                      Colección Escolar
                    </div>
                    <h1
                      className={cn('text-3xl md:text-4xl font-bold mb-3', typography.baseClass, typography.headingClass)}
                      style={{ color: palette.text }}
                    >
                      Gala Primavera 2024
                    </h1>
                    <p className="text-sm mb-4" style={{ color: palette.muted }}>
                      Ordena tus recuerdos en una experiencia premium
                    </p>
                    <button
                      className="px-6 py-2 rounded-full text-sm font-semibold"
                      style={{ backgroundColor: palette.accent, color: '#fff' }}
                    >
                      Ver galería
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Photo grid */}
            <section className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-widest" style={{ color: palette.muted }}>
                  Galería
                </span>
                <span className="text-xs" style={{ color: palette.muted }}>36 fotos</span>
              </div>
              <div
                className={cn(
                  'grid',
                  template.design.grid.style === 'horizontal'
                    ? 'grid-cols-2 md:grid-cols-3'
                    : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
                  template.design.grid.spacing === 'large' ? 'gap-4' : 'gap-2'
                )}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded-lg overflow-hidden',
                      template.design.grid.style === 'horizontal' ? 'aspect-[4/3]' : 'aspect-[3/4]'
                    )}
                    style={{
                      backgroundColor: palette.accentSoft,
                      backgroundImage: `linear-gradient(${135 + i * 15}deg, ${palette.border} 0%, ${palette.accentSoft} 100%)`,
                    }}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function TemplateSelector({
  currentDesign,
  onSelect,
  className,
}: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<TemplatePreset | null>(null);

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return TEMPLATE_PRESETS;
    return TEMPLATE_PRESETS.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  const popularTemplates = useMemo(() => TEMPLATE_PRESETS.filter((t) => t.isPopular), []);

  const handleSelectTemplate = (template: TemplatePreset) => {
    onSelect(template.design);
    setPreviewTemplate(null);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Plantillas de tienda</h3>
          <p className="text-sm text-muted-foreground">
            Elige una plantilla prediseñada o personaliza cada detalle
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          {TEMPLATE_PRESETS.length} plantillas
        </Badge>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'rounded-full px-3 py-1.5 text-sm font-medium transition',
            selectedCategory === 'all'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          Todas
        </button>
        {EVENT_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition flex items-center gap-1.5',
              selectedCategory === category.id
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <span>{category.emoji}</span>
            <span>{category.label}</span>
          </button>
        ))}
      </div>

      {/* Popular section */}
      {selectedCategory === 'all' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">Populares</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {popularTemplates.map((template) => (
              <Card
                key={template.id}
                className="group cursor-pointer overflow-hidden transition hover:shadow-lg hover:ring-2 hover:ring-emerald-200"
                onClick={() => setPreviewTemplate(template)}
              >
                <TemplateMockup
                  design={template.design}
                  name={template.name}
                  className="h-36"
                />
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{template.name}</span>
                    {template.isPopular && (
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {template.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1">
                      {template.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All templates grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {selectedCategory === 'all' ? 'Todas las plantillas' : EVENT_CATEGORIES.find(c => c.id === selectedCategory)?.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {filteredTemplates.length} plantillas
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="group cursor-pointer overflow-hidden transition hover:shadow-lg hover:ring-2 hover:ring-emerald-200"
              onClick={() => setPreviewTemplate(template)}
            >
              <TemplateMockup
                design={template.design}
                name={template.name}
                className="h-32"
              />
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{template.name}</span>
                  {template.isNew && (
                    <Badge className="text-[9px] px-1 py-0 bg-emerald-500">Nuevo</Badge>
                  )}
                  {template.isPopular && (
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {template.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Full-screen preview modal */}
      <FullScreenPreview
        template={previewTemplate}
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onSelect={() => previewTemplate && handleSelectTemplate(previewTemplate)}
      />
    </div>
  );
}

export default TemplateSelector;

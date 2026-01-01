'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  APP_DENSITY_OPTIONS,
  APP_HEADER_OPTIONS,
  COLOR_PALETTES,
  COVER_STYLE_OPTIONS,
  COVER_VARIANT_OPTIONS,
  GRID_NAV_OPTIONS,
  GRID_SPACING_OPTIONS,
  GRID_STYLE_OPTIONS,
  GRID_THUMB_OPTIONS,
  TYPOGRAPHY_PRESETS,
  getGridClasses,
  getPaletteTokens,
  getTypographyPreset,
  resolveStoreDesign,
  type StoreDesignSettings,
} from '@/lib/store/store-design';
import {
  ImageIcon,
  Type,
  Palette,
  Grid3X3,
  SlidersHorizontal,
  Heart,
  ShoppingCart,
  Share2,
  LayoutTemplate,
  Wand2,
} from 'lucide-react';
import { TemplateSelector } from './TemplateSelector';

interface StoreDesignPanelProps {
  design?: StoreDesignSettings | null;
  onChange: (design: StoreDesignSettings) => void;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  className?: string;
}

type DesignSection = 'cover' | 'typography' | 'color' | 'grid' | 'app';

const SECTION_ITEMS: Array<{
  id: DesignSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'cover', label: 'Portada', icon: ImageIcon },
  { id: 'typography', label: 'Tipografía', icon: Type },
  { id: 'color', label: 'Color', icon: Palette },
  { id: 'grid', label: 'Grilla', icon: Grid3X3 },
  { id: 'app', label: 'Ajustes de app', icon: SlidersHorizontal },
];

const OptionCard = ({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-full rounded-xl border px-3 py-3 text-left transition',
      selected
        ? 'border-emerald-400 bg-emerald-50/70 text-emerald-900 shadow-sm'
        : 'border-border bg-white/80 text-foreground hover:border-emerald-200'
    )}
  >
    <div className="text-sm font-semibold">{title}</div>
    {description && (
      <div className="mt-1 text-xs text-muted-foreground">{description}</div>
    )}
  </button>
);

// Visual thumbnail component for cover styles (Pixieset-style) - now with dynamic colors
const CoverStyleThumbnail = ({
  styleId,
  selected,
  label,
  onClick,
  palette,
}: {
  styleId: string;
  selected: boolean;
  label: string;
  onClick: () => void;
  palette: ReturnType<typeof getPaletteTokens>;
}) => {
  // Generate thumbnails using actual palette colors
  const getThumbnailStyle = (id: string): React.ReactNode => {
    switch (id) {
      case 'stripe':
        return (
          <div className="relative h-full w-full overflow-hidden rounded-md" style={{ background: `linear-gradient(135deg, ${palette.accentSoft} 0%, ${palette.surface} 100%)` }}>
            <div className="absolute inset-x-0 top-1/3 h-[2px]" style={{ backgroundColor: palette.accent }} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-bold uppercase tracking-widest" style={{ color: palette.text }}>
              TITLE
            </div>
          </div>
        );
      case 'divider':
        return (
          <div className="flex h-full w-full overflow-hidden rounded-md">
            <div className="w-1/2" style={{ background: `linear-gradient(135deg, ${palette.accentSoft} 0%, ${palette.accent}60 100%)` }} />
            <div className="flex w-1/2 items-center justify-center" style={{ backgroundColor: palette.surface }}>
              <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: palette.text }}>TITLE</span>
            </div>
          </div>
        );
      case 'journal':
        return (
          <div className="flex h-full w-full items-center gap-2 overflow-hidden rounded-md p-2" style={{ backgroundColor: palette.surface }}>
            <div className="h-full w-1/3 rounded" style={{ background: `linear-gradient(135deg, ${palette.accentSoft} 0%, ${palette.accent}60 100%)` }} />
            <div className="flex flex-1 flex-col justify-center">
              <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: palette.text }}>TITLE</span>
            </div>
          </div>
        );
      case 'stamp':
        return (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-md p-2" style={{ backgroundColor: palette.surface }}>
            <div className="h-8 w-10 rounded" style={{ background: `linear-gradient(135deg, ${palette.accentSoft} 0%, ${palette.accent}60 100%)` }} />
            <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: palette.text }}>TITLE</span>
          </div>
        );
      case 'outline':
        return (
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-md p-2" style={{ backgroundColor: palette.surface }}>
            <div className="flex h-full w-full items-center justify-center border-2" style={{ borderColor: palette.accent, background: `linear-gradient(135deg, ${palette.accentSoft}50 0%, ${palette.accentSoft} 100%)` }}>
              <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: palette.accent }}>TITLE</span>
            </div>
          </div>
        );
      case 'classic':
        return (
          <div className="relative h-full w-full overflow-hidden rounded-md">
            <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${palette.accentSoft} 0%, ${palette.accent} 100%)` }} />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent p-1">
              <span className="text-[6px] font-medium text-white">Title</span>
            </div>
          </div>
        );
      case 'center':
        return (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-md p-2" style={{ background: `linear-gradient(135deg, ${palette.background} 0%, ${palette.surface} 100%)` }}>
            <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: palette.text }}>TITLE</span>
            <div className="h-1 w-6 rounded-full" style={{ backgroundColor: palette.border }} />
          </div>
        );
      case 'joy':
        return (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-md p-2" style={{ background: `linear-gradient(135deg, ${palette.accentSoft}50 0%, ${palette.accentSoft} 100%)` }}>
            <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: palette.accent }}>TITLE</span>
            <div className="h-4 w-10 rounded-full" style={{ backgroundColor: palette.accent, opacity: 0.8 }} />
          </div>
        );
      case 'left':
        return (
          <div className="flex h-full w-full overflow-hidden rounded-md" style={{ backgroundColor: palette.surface }}>
            <div className="flex w-1/3 flex-col justify-center p-1">
              <span className="text-[6px] font-bold uppercase" style={{ color: palette.text }}>TITLE</span>
            </div>
            <div className="w-2/3" style={{ background: `linear-gradient(135deg, ${palette.accentSoft} 0%, ${palette.accent}60 100%)` }} />
          </div>
        );
      case 'novel':
        return (
          <div className="flex h-full w-full flex-col items-start justify-center gap-0.5 overflow-hidden rounded-md p-2" style={{ backgroundColor: palette.surface }}>
            <span className="font-serif text-[10px] font-bold italic" style={{ color: palette.text }}>Title</span>
            <div className="h-px w-full" style={{ backgroundColor: palette.border }} />
          </div>
        );
      case 'vintage':
        return (
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-md p-1" style={{ background: `linear-gradient(135deg, ${palette.background} 0%, ${palette.accentSoft}50 100%)` }}>
            <div className="rounded border border-dashed px-2 py-1" style={{ borderColor: palette.accent }}>
              <span className="text-[7px] font-bold uppercase tracking-widest" style={{ color: palette.accent }}>TITLE</span>
            </div>
          </div>
        );
      case 'frame':
        return (
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-md p-1" style={{ backgroundColor: palette.surface }}>
            <div className="h-full w-full rounded border-4" style={{ borderColor: palette.border, background: `linear-gradient(135deg, ${palette.background} 0%, ${palette.accentSoft} 100%)` }} />
          </div>
        );
      case 'none':
      default:
        return (
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-md" style={{ backgroundColor: palette.background }}>
            <span className="text-[8px]" style={{ color: palette.muted }}>—</span>
          </div>
        );
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-all',
        selected
          ? 'border-emerald-400 bg-emerald-50/50 shadow-sm'
          : 'border-transparent hover:border-emerald-200 hover:bg-slate-50'
      )}
    >
      <div className={cn(
        'h-16 w-20 overflow-hidden rounded-lg border shadow-sm transition-transform group-hover:scale-105',
        selected ? 'border-emerald-300' : 'border-slate-200'
      )}>
        {getThumbnailStyle(styleId)}
      </div>
      <span className={cn(
        'text-xs font-medium',
        selected ? 'text-emerald-700' : 'text-slate-600'
      )}>
        {label}
      </span>
    </button>
  );
};

// Typography preview component
const TypographyPreview = ({
  preset,
  selected,
  onClick,
}: {
  preset: { id: string; label: string; description: string; baseClass: string; headingClass: string };
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all',
      selected
        ? 'border-emerald-400 bg-emerald-50/50 shadow-sm'
        : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
    )}
  >
    <div className={cn('text-lg font-semibold leading-tight', preset.baseClass, preset.headingClass)}>
      Gala Primavera
    </div>
    <div className={cn('text-[11px] text-slate-500', preset.baseClass)}>
      Tus recuerdos escolares
    </div>
    <div className="mt-1 flex items-center gap-2 border-t pt-2">
      <span className={cn('text-xs font-medium', selected ? 'text-emerald-700' : 'text-slate-700')}>
        {preset.label}
      </span>
      <span className="text-[10px] text-slate-400">{preset.description}</span>
    </div>
  </button>
);

type DesignMode = 'templates' | 'custom';

export function StoreDesignPanel({
  design,
  onChange,
  bannerUrl,
  logoUrl,
  className,
}: StoreDesignPanelProps) {
  const [designMode, setDesignMode] = useState<DesignMode>('templates');
  const [activeSection, setActiveSection] = useState<DesignSection>('cover');
  const resolvedDesign = useMemo(
    () => resolveStoreDesign(design ?? null),
    [design]
  );

  const palette = getPaletteTokens(resolvedDesign.color.palette);
  const typography = getTypographyPreset(resolvedDesign.typography.preset);
  const grid = getGridClasses(resolvedDesign.grid);

  const updateDesign = (next: StoreDesignSettings) => onChange(next);

  const previewPadding =
    resolvedDesign.app.density === 'compact'
      ? 'p-4'
      : resolvedDesign.app.density === 'airy'
      ? 'p-8'
      : 'p-6';

  const heroLayout =
    resolvedDesign.cover.style === 'center' || resolvedDesign.cover.style === 'joy'
      ? 'grid-cols-1'
      : 'md:grid-cols-3';
  const heroTextAlign =
    resolvedDesign.cover.style === 'center' || resolvedDesign.cover.style === 'joy'
      ? 'text-center items-center'
      : 'text-left items-start';

  const coverFrameClass = cn(
    'relative overflow-hidden',
    resolvedDesign.cover.style === 'frame' && 'rounded-3xl border-4',
    resolvedDesign.cover.style === 'stripe' && 'rounded-2xl p-3',
    resolvedDesign.cover.style === 'divider' && 'rounded-2xl border-l-4',
    resolvedDesign.cover.variant === 'journal' && 'border border-dashed',
    resolvedDesign.cover.variant === 'stamp' && 'border-2 border-dotted',
    resolvedDesign.cover.variant === 'outline' && 'border',
    resolvedDesign.cover.variant === 'border' && 'border-4',
    resolvedDesign.cover.variant === 'album' && 'rounded-3xl shadow-lg',
    resolvedDesign.cover.variant === 'cliff' && 'rounded-t-[2.5rem] rounded-b-2xl',
    resolvedDesign.cover.variant === 'split' && 'rounded-2xl',
    resolvedDesign.cover.variant === 'none' && 'rounded-2xl'
  );

  const showCoverImage = resolvedDesign.cover.style !== 'none';
  const showCoverLabel = resolvedDesign.cover.variant === 'label';

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Diseño de la tienda</h3>
          <p className="text-sm text-muted-foreground">
            Elige una plantilla prediseñada o personaliza cada detalle.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex items-center rounded-lg border bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setDesignMode('templates')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
                designMode === 'templates'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <LayoutTemplate className="h-4 w-4" />
              Plantillas
            </button>
            <button
              type="button"
              onClick={() => setDesignMode('custom')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
                designMode === 'custom'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <Wand2 className="h-4 w-4" />
              Personalizar
            </button>
          </div>
          <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-200">
            Vista previa en vivo
          </Badge>
        </div>
      </div>

      {/* Template selector mode */}
      {designMode === 'templates' && (
        <TemplateSelector
          currentDesign={resolvedDesign}
          onSelect={(newDesign) => {
            onChange(newDesign);
            // Optionally switch to custom mode after selecting
          }}
        />
      )}

      {/* Custom editor mode */}
      {designMode === 'custom' && (
      <div className={cn('grid gap-6 lg:grid-cols-[240px_360px_minmax(0,1fr)]')}>
        <aside className="rounded-2xl border border-border bg-white/90 px-4 py-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Diseño
          </div>
          <div className="mt-5 space-y-2">
            {SECTION_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                  activeSection === item.id
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-4">
          {activeSection === 'cover' && (
            <>
              <Card className="rounded-2xl border border-border bg-white/90 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">Cover</div>
                  <div className="flex items-center gap-3 text-xs">
                    <button className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700">
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>Cover Photo</span>
                    </button>
                    <button className="flex items-center gap-1 text-slate-500 hover:text-slate-700">
                      <span className="text-[10px]">⊕</span>
                      <span>Focal</span>
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {COVER_STYLE_OPTIONS.map((style) => (
                    <CoverStyleThumbnail
                      key={style.id}
                      styleId={style.id}
                      label={style.label}
                      selected={resolvedDesign.cover.style === style.id}
                      palette={palette}
                      onClick={() =>
                        updateDesign({
                          ...resolvedDesign,
                          cover: {
                            ...resolvedDesign.cover,
                            style: style.id as StoreDesignSettings['cover']['style'],
                          },
                        })
                      }
                    />
                  ))}
                </div>
              </Card>

              <Card className="rounded-2xl border border-border bg-white/90 p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Variante de marco</div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {COVER_VARIANT_OPTIONS.slice(0, 6).map((variant) => (
                    <CoverStyleThumbnail
                      key={variant.id}
                      styleId={variant.id}
                      label={variant.label}
                      selected={resolvedDesign.cover.variant === variant.id}
                      palette={palette}
                      onClick={() =>
                        updateDesign({
                          ...resolvedDesign,
                          cover: {
                            ...resolvedDesign.cover,
                            variant: variant.id as StoreDesignSettings['cover']['variant'],
                          },
                        })
                      }
                    />
                  ))}
                </div>
                {COVER_VARIANT_OPTIONS.length > 6 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
                      Más opciones...
                    </summary>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {COVER_VARIANT_OPTIONS.slice(6).map((variant) => (
                        <CoverStyleThumbnail
                          key={variant.id}
                          styleId={variant.id}
                          label={variant.label}
                          selected={resolvedDesign.cover.variant === variant.id}
                          palette={palette}
                          onClick={() =>
                            updateDesign({
                              ...resolvedDesign,
                              cover: {
                                ...resolvedDesign.cover,
                                variant: variant.id as StoreDesignSettings['cover']['variant'],
                              },
                            })
                          }
                        />
                      ))}
                    </div>
                  </details>
                )}
              </Card>
            </>
          )}

          {activeSection === 'typography' && (
            <Card className="rounded-2xl border border-border bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Tipografía</div>
                <span className="text-[10px] text-slate-400">6 estilos disponibles</span>
              </div>
              <div className="mt-4 space-y-3">
                {TYPOGRAPHY_PRESETS.map((preset) => (
                  <TypographyPreview
                    key={preset.id}
                    preset={preset}
                    selected={resolvedDesign.typography.preset === preset.id}
                    onClick={() =>
                      updateDesign({
                        ...resolvedDesign,
                        typography: {
                          preset: preset.id as StoreDesignSettings['typography']['preset'],
                        },
                      })
                    }
                  />
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'color' && (
            <Card className="rounded-2xl border border-border bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Paleta de colores</div>
                <span className="text-[10px] text-slate-400">{COLOR_PALETTES.length} paletas</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {COLOR_PALETTES.map((paletteOption) => (
                  <button
                    key={paletteOption.id}
                    type="button"
                    onClick={() =>
                      updateDesign({
                        ...resolvedDesign,
                        color: {
                          palette: paletteOption.id as StoreDesignSettings['color']['palette'],
                        },
                      })
                    }
                    className={cn(
                      'group flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-all',
                      resolvedDesign.color.palette === paletteOption.id
                        ? 'border-emerald-400 bg-emerald-50/50 shadow-sm'
                        : 'border-transparent hover:border-emerald-200 hover:bg-slate-50'
                    )}
                  >
                    {/* Swatch visual preview - stacked bars like Pixieset */}
                    <div className={cn(
                      'h-14 w-16 overflow-hidden rounded-lg border shadow-sm transition-transform group-hover:scale-105',
                      resolvedDesign.color.palette === paletteOption.id ? 'border-emerald-300' : 'border-slate-200'
                    )}>
                      <div className="flex h-full flex-col">
                        <div
                          className="h-1/2 w-full"
                          style={{ backgroundColor: paletteOption.tokens.background }}
                        />
                        <div
                          className="h-1/4 w-full"
                          style={{ backgroundColor: paletteOption.tokens.accent }}
                        />
                        <div
                          className="h-1/4 w-full"
                          style={{ backgroundColor: paletteOption.tokens.text }}
                        />
                      </div>
                    </div>
                    <span className={cn(
                      'text-xs font-medium',
                      resolvedDesign.color.palette === paletteOption.id ? 'text-emerald-700' : 'text-slate-600'
                    )}>
                      {paletteOption.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Preview section for selected palette */}
              <div className="mt-4 rounded-xl border border-slate-200 p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Vista previa
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-1">
                    <div
                      className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: palette.background }}
                      title="Fondo"
                    />
                    <div
                      className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: palette.surface }}
                      title="Superficie"
                    />
                    <div
                      className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: palette.accent }}
                      title="Acento"
                    />
                    <div
                      className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: palette.accentSoft }}
                      title="Acento suave"
                    />
                    <div
                      className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: palette.text }}
                      title="Texto"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-700">
                      {COLOR_PALETTES.find(p => p.id === resolvedDesign.color.palette)?.label || 'Luz'}
                    </span>
                    <span className="text-[10px] text-slate-400">5 tokens de color</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'grid' && (
            <Card className="rounded-2xl border border-border bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Grilla de fotos</div>
              </div>
              <div className="mt-4 space-y-5">
                {/* Grid Style - Visual thumbnails */}
                <div>
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Orientación
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {GRID_STYLE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          updateDesign({
                            ...resolvedDesign,
                            grid: {
                              ...resolvedDesign.grid,
                              style: option.id as StoreDesignSettings['grid']['style'],
                            },
                          })
                        }
                        className={cn(
                          'group flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all',
                          resolvedDesign.grid.style === option.id
                            ? 'border-emerald-400 bg-emerald-50/50 shadow-sm'
                            : 'border-transparent hover:border-emerald-200 hover:bg-slate-50'
                        )}
                      >
                        <div className={cn(
                          'overflow-hidden rounded-lg border shadow-sm transition-transform group-hover:scale-105',
                          resolvedDesign.grid.style === option.id ? 'border-emerald-300' : 'border-slate-200'
                        )}>
                          <div className="grid grid-cols-3 gap-0.5 bg-slate-200 p-1">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  'bg-slate-100',
                                  option.id === 'vertical' ? 'h-6 w-4' : 'h-4 w-6'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                        <span className={cn(
                          'text-xs font-medium',
                          resolvedDesign.grid.style === option.id ? 'text-emerald-700' : 'text-slate-600'
                        )}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thumbnail size - Visual preview */}
                <div>
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Tamaño
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {GRID_THUMB_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          updateDesign({
                            ...resolvedDesign,
                            grid: {
                              ...resolvedDesign.grid,
                              thumb: option.id as StoreDesignSettings['grid']['thumb'],
                            },
                          })
                        }
                        className={cn(
                          'group flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all',
                          resolvedDesign.grid.thumb === option.id
                            ? 'border-emerald-400 bg-emerald-50/50 shadow-sm'
                            : 'border-transparent hover:border-emerald-200 hover:bg-slate-50'
                        )}
                      >
                        <div className={cn(
                          'overflow-hidden rounded-lg border shadow-sm transition-transform group-hover:scale-105',
                          resolvedDesign.grid.thumb === option.id ? 'border-emerald-300' : 'border-slate-200'
                        )}>
                          <div className={cn(
                            'grid gap-0.5 bg-slate-200 p-1',
                            option.id === 'regular' ? 'grid-cols-4' : 'grid-cols-2'
                          )}>
                            {Array.from({ length: option.id === 'regular' ? 8 : 4 }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  'bg-slate-100',
                                  option.id === 'regular' ? 'h-3 w-3' : 'h-5 w-5'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                        <span className={cn(
                          'text-xs font-medium',
                          resolvedDesign.grid.thumb === option.id ? 'text-emerald-700' : 'text-slate-600'
                        )}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spacing - Visual preview */}
                <div>
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Espaciado
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {GRID_SPACING_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          updateDesign({
                            ...resolvedDesign,
                            grid: {
                              ...resolvedDesign.grid,
                              spacing: option.id as StoreDesignSettings['grid']['spacing'],
                            },
                          })
                        }
                        className={cn(
                          'group flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all',
                          resolvedDesign.grid.spacing === option.id
                            ? 'border-emerald-400 bg-emerald-50/50 shadow-sm'
                            : 'border-transparent hover:border-emerald-200 hover:bg-slate-50'
                        )}
                      >
                        <div className={cn(
                          'overflow-hidden rounded-lg border shadow-sm transition-transform group-hover:scale-105',
                          resolvedDesign.grid.spacing === option.id ? 'border-emerald-300' : 'border-slate-200'
                        )}>
                          <div className={cn(
                            'grid grid-cols-3 bg-slate-200 p-1',
                            option.id === 'regular' ? 'gap-0.5' : 'gap-1.5'
                          )}>
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div key={i} className="h-4 w-4 bg-slate-100" />
                            ))}
                          </div>
                        </div>
                        <span className={cn(
                          'text-xs font-medium',
                          resolvedDesign.grid.spacing === option.id ? 'text-emerald-700' : 'text-slate-600'
                        )}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigation style */}
                <div>
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Navegación
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {GRID_NAV_OPTIONS.map((option) => (
                      <OptionCard
                        key={option.id}
                        title={option.label}
                        selected={resolvedDesign.grid.nav === option.id}
                        onClick={() =>
                          updateDesign({
                            ...resolvedDesign,
                            grid: {
                              ...resolvedDesign.grid,
                              nav: option.id as StoreDesignSettings['grid']['nav'],
                            },
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'app' && (
            <Card className="rounded-2xl border border-border bg-white/90 p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Ajustes de app</div>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Densidad
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {APP_DENSITY_OPTIONS.map((option) => (
                      <OptionCard
                        key={option.id}
                        title={option.label}
                        selected={resolvedDesign.app.density === option.id}
                        onClick={() =>
                          updateDesign({
                            ...resolvedDesign,
                            app: {
                              ...resolvedDesign.app,
                              density: option.id as StoreDesignSettings['app']['density'],
                            },
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Encabezado
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {APP_HEADER_OPTIONS.map((option) => (
                      <OptionCard
                        key={option.id}
                        title={option.label}
                        selected={resolvedDesign.app.header === option.id}
                        onClick={() =>
                          updateDesign({
                            ...resolvedDesign,
                            app: {
                              ...resolvedDesign.app,
                              header: option.id as StoreDesignSettings['app']['header'],
                            },
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <Card
          className={cn(
            'rounded-2xl border border-border shadow-sm',
            typography.baseClass
          )}
          style={{
            backgroundColor: palette.background,
            color: palette.text,
          }}
        >
          <div className={cn('space-y-6', previewPadding)}>
            <div
              className={cn(
                'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3',
                resolvedDesign.app.header === 'minimal' ? 'text-xs' : 'text-sm'
              )}
              style={{ backgroundColor: palette.surface, borderColor: palette.border }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: palette.accentSoft, color: palette.accent }}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="font-semibold">LookEscolar Studio</div>
              </div>
              <div
                className={cn(
                  'flex items-center gap-4',
                  resolvedDesign.grid.nav === 'icons' ? 'text-xs' : 'text-xs'
                )}
                style={{ color: palette.muted }}
              >
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  {resolvedDesign.grid.nav === 'icons_text' && <span>Favoritos</span>}
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  {resolvedDesign.grid.nav === 'icons_text' && <span>Carrito</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  {resolvedDesign.grid.nav === 'icons_text' && <span>Compartir</span>}
                </div>
              </div>
            </div>

            <div
              className={cn(
                'grid gap-5 rounded-3xl border',
                heroLayout
              )}
              style={{ borderColor: palette.border, backgroundColor: palette.surface }}
            >
              <div className={cn('space-y-3 p-6', heroTextAlign)}>
                <div className={cn('text-xs uppercase tracking-[0.3em] text-muted-foreground', typography.headingClass)}>
                  Colección escolar
                </div>
                <h4 className={cn('text-2xl font-semibold', typography.headingClass)}>
                  Gala Primavera
                </h4>
                <p className="text-sm" style={{ color: palette.muted }}>
                  Ordena tus recuerdos en una experiencia premium.
                </p>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
                  style={{
                    backgroundColor: palette.accent,
                    color: palette.text,
                  }}
                >
                  Ver galería
                </button>
              </div>

              {showCoverImage && (
                <div
                  className={cn('p-6', resolvedDesign.cover.style === 'center' ? '' : 'md:col-span-2')}
                >
                  <div
                    className={coverFrameClass}
                    style={{ borderColor: palette.border }}
                  >
                    {showCoverLabel && (
                      <div
                        className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em]"
                        style={{ backgroundColor: palette.surface, color: palette.text }}
                      >
                        Especial
                      </div>
                    )}
                    {resolvedDesign.cover.variant === 'split' && (
                      <div
                        className="absolute inset-y-0 left-1/2 w-px"
                        style={{ backgroundColor: palette.border }}
                      />
                    )}
                    {bannerUrl ? (
                      <img
                        src={bannerUrl}
                        alt="Portada"
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div
                        className="h-48 w-full"
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${palette.accentSoft} 0%, ${palette.accent} 60%, ${palette.text} 100%)`,
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em]" style={{ color: palette.muted }}>
                <span>Galería</span>
                <span>36 fotos</span>
              </div>
              <div className={cn('grid', grid.colsClass, grid.gapClass)}>
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className={cn('rounded-xl border', grid.aspectClass)}
                    style={{
                      backgroundColor: palette.accentSoft,
                      borderColor: palette.border,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
      )}
    </div>
  );
}

export default StoreDesignPanel;

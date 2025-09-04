'use client';

import { useEffect, useState, useTransition } from 'react';
import { ThemedGalleryWrapper } from '@/components/gallery/ThemedGalleryWrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { updateEventSettings } from '@/app/admin/events/[id]/actions';
import {
  ImageIcon,
  Type,
  Palette,
  Grid3X3,
  Save,
} from 'lucide-react';

type CoverStyle = 'novel' | 'vintage' | 'frame' | 'stripe' | 'divider' | 'journal' | 'classic' | 'none';
type Typography = 'sans' | 'serif' | 'modern' | 'timeless' | 'bold' | 'subtle';
type ColorScheme = 'light' | 'gold' | 'rose' | 'terracotta' | 'sand' | 'olive' | 'agave' | 'sea' | 'dark';
type GridStyle = 'vertical' | 'horizontal';
type GridThumb = 'regular' | 'large';
type GridSpacing = 'regular' | 'large';
type NavStyle = 'icons' | 'icons_text';

export interface DesignSettings {
  cover: { style: CoverStyle };
  typography: { preset: Typography };
  color: { scheme: ColorScheme };
  grid: { style: GridStyle; thumb: GridThumb; spacing: GridSpacing; nav: NavStyle };
  theme?: 'default' | 'jardin' | 'secundaria' | 'bautismo';
}

const defaultDesign: DesignSettings = {
  cover: { style: 'novel' },
  typography: { preset: 'bold' },
  color: { scheme: 'terracotta' },
  grid: { style: 'vertical', thumb: 'regular', spacing: 'regular', nav: 'icons_text' },
  theme: 'default',
};

interface DesignPanelProps {
  eventId: string;
  initialDesign?: Partial<DesignSettings> | null;
  currentTheme?: 'default' | 'jardin' | 'secundaria' | 'bautismo';
}

// Pixieset-like design panel used inside Event Settings → Design tab
export default function DesignPanel({ eventId, initialDesign, currentTheme }: DesignPanelProps) {
  const [active, setActive] = useState<'cover' | 'typography' | 'color' | 'grid'>('cover');
  const [saving, startSaving] = useTransition();
  const [design, setDesign] = useState<DesignSettings>({
    ...defaultDesign,
    ...(initialDesign || {}),
    theme: (initialDesign?.theme as any) || currentTheme || 'default',
  } as DesignSettings);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    setPreviewKey((k) => k + 1); // refresh preview to reflect changes
  }, [design]);

  const saveDesign = () =>
    startSaving(async () => {
      // 1) Persist JSON settings into event.settings.design
      await updateEventSettings(eventId, { design } as any);

      // 2) Also update the event.theme column to sync color/typography presets to our gallery themes
      try {
        await fetch(`/api/admin/events/${eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: design.theme || 'default' }),
        });
      } catch {
        // ignore; not critical for UI
      }
    });

  const OptionCard = ({
    selected,
    onClick,
    title,
    subtitle,
  }: {
    selected: boolean;
    onClick: () => void;
    title: string;
    subtitle?: string;
  }) => (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-4 text-left transition ${
        selected ? 'border-emerald-500 ring-2 ring-emerald-500' : 'hover:border-emerald-300'
      }`}
    >
      <div className="text-sm font-semibold">{title}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </button>
  );

  const PreviewGrid = () => {
    const thumbs = Array.from({ length: 9 }).map((_, i) => `https://picsum.photos/seed/design-${i}/600/600`);
    const sizeClass = design.grid.thumb === 'large' ? 'h-40' : 'h-28';
    const gapClass = design.grid.spacing === 'large' ? 'gap-6' : 'gap-3';

    return (
      <div className={`photo-grid ${gapClass}`}>
        <div className="grid grid-cols-3">
          {thumbs.map((src, i) => (
            <div key={`${i}-${previewKey}`} className={`photo-card overflow-hidden rounded-lg border bg-white ${sizeClass}`}>
              <img src={src} alt={`preview-${i}`} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-6">
      {/* Left navigation */}
      <div className="w-64 space-y-1">
        <button
          onClick={() => setActive('cover')}
          className={`flex w-full items-center gap-2 rounded-md p-3 text-left transition ${
            active === 'cover' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50'
          }`}
        >
          <ImageIcon className="h-4 w-4" /> Cover
        </button>
        <button
          onClick={() => setActive('typography')}
          className={`flex w-full items-center gap-2 rounded-md p-3 text-left transition ${
            active === 'typography' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50'
          }`}
        >
          <Type className="h-4 w-4" /> Typography
        </button>
        <button
          onClick={() => setActive('color')}
          className={`flex w-full items-center gap-2 rounded-md p-3 text-left transition ${
            active === 'color' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50'
          }`}
        >
          <Palette className="h-4 w-4" /> Color
        </button>
        <button
          onClick={() => setActive('grid')}
          className={`flex w-full items-center gap-2 rounded-md p-3 text-left transition ${
            active === 'grid' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50'
          }`}
        >
          <Grid3X3 className="h-4 w-4" /> Grid
        </button>

        <Separator className="my-2" />
        <Button onClick={saveDesign} disabled={saving} className="w-full">
          <Save className="mr-2 h-4 w-4" /> {saving ? 'Guardando…' : 'Guardar diseño'}
        </Button>
      </div>

      {/* Options + Preview */}
      <div className="flex-1 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Options */}
        <Card className="p-4">
          {active === 'cover' && (
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { k: 'novel', t: 'Novel' },
                  { k: 'vintage', t: 'Vintage' },
                  { k: 'frame', t: 'Frame' },
                  { k: 'stripe', t: 'Stripe' },
                  { k: 'divider', t: 'Divider' },
                  { k: 'journal', t: 'Journal' },
                  { k: 'classic', t: 'Classic' },
                  { k: 'none', t: 'None' },
                ] as const
              ).map(({ k, t }) => (
                <OptionCard
                  key={k}
                  selected={design.cover.style === k}
                  onClick={() => setDesign((d) => ({ ...d, cover: { style: k } }))}
                  title={t}
                />
              ))}
            </div>
          )}

          {active === 'typography' && (
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['sans', 'SANS', 'A neutral font'],
                  ['serif', 'Serif', 'A classic font'],
                  ['modern', 'Modern', 'A sophisticated font'],
                  ['timeless', 'Timeless', 'A light and airy font'],
                  ['bold', 'BOLD', 'A punchy font'],
                  ['subtle', 'SUBTLE', 'A minimal font'],
                ] as const
              ).map(([value, title, subtitle]) => (
                <OptionCard
                  key={value}
                  selected={design.typography.preset === value}
                  onClick={() => setDesign((d) => ({ ...d, typography: { preset: value } }))}
                  title={title}
                  subtitle={subtitle}
                />
              ))}
            </div>
          )}

          {active === 'color' && (
            <div className="grid grid-cols-3 gap-3">
              {(
                ['light', 'gold', 'rose', 'terracotta', 'sand', 'olive', 'agave', 'sea', 'dark'] as const
              ).map((scheme) => (
                <button
                  key={scheme}
                  onClick={() => setDesign((d) => ({ ...d, color: { scheme } }))}
                  className={`rounded-lg border p-3 transition ${
                    design.color.scheme === scheme ? 'border-emerald-500 ring-2 ring-emerald-500' : 'hover:border-emerald-300'
                  }`}
                >
                  <div className="mb-2 grid grid-cols-4 gap-1">
                    <div className="h-6 w-full rounded" style={{ background: '#f8f8f8' }} />
                    <div className="h-6 w-full rounded" style={{ background: '#222' }} />
                    <div className="h-6 w-full rounded" style={{ background: '#ddd' }} />
                    <div className="h-6 w-full rounded" style={{ background: '#b88971' }} />
                  </div>
                  <div className="text-sm font-semibold capitalize">{scheme}</div>
                </button>
              ))}
            </div>
          )}

          {active === 'grid' && (
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-gray-500">Grid Style</div>
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard
                    selected={design.grid.style === 'vertical'}
                    onClick={() => setDesign((d) => ({ ...d, grid: { ...d.grid, style: 'vertical' } }))}
                    title="Vertical"
                  />
                  <OptionCard
                    selected={design.grid.style === 'horizontal'}
                    onClick={() => setDesign((d) => ({ ...d, grid: { ...d.grid, style: 'horizontal' } }))}
                    title="Horizontal"
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-gray-500">Thumbnail Size</div>
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard
                    selected={design.grid.thumb === 'regular'}
                    onClick={() => setDesign((d) => ({ ...d, grid: { ...d.grid, thumb: 'regular' } }))}
                    title="Regular"
                  />
                  <OptionCard
                    selected={design.grid.thumb === 'large'}
                    onClick={() => setDesign((d) => ({ ...d, grid: { ...d.grid, thumb: 'large' } }))}
                    title="Large"
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-gray-500">Grid Spacing</div>
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard
                    selected={design.grid.spacing === 'regular'}
                    onClick={() => setDesign((d) => ({ ...d, grid: { ...d.grid, spacing: 'regular' } }))}
                    title="Regular"
                  />
                  <OptionCard
                    selected={design.grid.spacing === 'large'}
                    onClick={() => setDesign((d) => ({ ...d, grid: { ...d.grid, spacing: 'large' } }))}
                    title="Large"
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-gray-500">Navigation Style</div>
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard
                    selected={design.grid.nav === 'icons'}
                    onClick={() => setDesign((d) => ({ ...d, grid: { ...d.grid, nav: 'icons' } }))}
                    title="Icon Only"
                  />
                  <OptionCard
                    selected={design.grid.nav === 'icons_text'}
                    onClick={() => setDesign((d) => ({ ...d, grid: { ...d.grid, nav: 'icons_text' } }))}
                    title="Icon & Text"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Preview */}
        <Card className="p-4">
          <ThemedGalleryWrapper eventTheme={(design.theme || 'default') as any}>
            <div className="rounded-lg border bg-white p-6">
              {/* Simulated cover */}
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="col-span-1 rounded-lg border p-6">
                  <div className="text-sm text-gray-500">{design.cover.style.toUpperCase()}</div>
                  <div className="mt-2 text-xl font-bold">Escuela Maristas</div>
                  <div className="text-gray-500">September 1st, 2025</div>
                  <Button className="mt-4 theme-button">View Gallery</Button>
                </div>
                <div className="col-span-2 rounded-lg border">
                  <img src={`https://picsum.photos/seed/cover-${previewKey}/1200/700`} alt="cover" className="h-full w-full rounded-lg object-cover" />
                </div>
              </div>

              {/* Simulated nav */}
              <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">ESCUELA MARISTAS</span>
                  <span>Primaria</span>
                  <span>Secundaria</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Print Store</span>
                  <span>Cart</span>
                  <span>Favorites</span>
                  <span>Share</span>
                </div>
              </div>

              {/* Grid preview */}
              <PreviewGrid />
            </div>
          </ThemedGalleryWrapper>
        </Card>
      </div>
    </div>
  );
}

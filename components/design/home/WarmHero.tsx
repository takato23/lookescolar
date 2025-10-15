'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { CalendarClock, Camera, HeartHandshake, Moon, Palette, Sparkles, Sun, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GlassPanel } from '@/components/design/GlassPanel';
import { GlassButton } from '@/components/design/GlassButton';
import { GlassAccent, ThemeMode, THEME_TOKENS } from '@/lib/theme/lookescolar-tokens';

export type WarmHeroFilter = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

export type WarmHeroHighlight = {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone?: GlassAccent;
};

export type WarmHeroMeta = {
  label: string;
  value: string;
  icon: LucideIcon;
};

export type HeroAction = {
  label: string;
  onClick?: () => void;
};

export interface WarmHeroProps {
  eyebrow?: string;
  title: string;
  description: string;
  mode: ThemeMode;
  onModeToggle: () => void;
  filters?: WarmHeroFilter[];
  highlights?: WarmHeroHighlight[];
  meta?: WarmHeroMeta[];
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
}

const DEFAULT_FILTERS: WarmHeroFilter[] = [
  { label: 'Modo galería', icon: Camera, active: true },
  { label: 'Familias', icon: HeartHandshake },
  { label: 'Docentes', icon: Users },
];

const DEFAULT_HIGHLIGHTS: WarmHeroHighlight[] = [
  { label: 'Salas en vivo', value: '12', helper: 'Monitor real-time', icon: Camera, tone: 'warm' },
  { label: 'Familias conectadas', value: '268', helper: 'Participación diaria', icon: Users, tone: 'neutral' },
  { label: 'Nivel de alegría', value: '96%', helper: 'Encuestas positivas', icon: Sparkles, tone: 'cool' },
];

const DEFAULT_META: WarmHeroMeta[] = [
  { label: 'Próxima transmisión', value: '10:30 · Aula 3°B', icon: Camera },
  { label: 'Entrega destacada', value: '16:00 · Álbum Primavera', icon: CalendarClock },
];

export function WarmHero({
  eyebrow = 'LookEscolar · Identidad cálida',
  title,
  description,
  mode,
  onModeToggle,
  filters = DEFAULT_FILTERS,
  highlights = DEFAULT_HIGHLIGHTS,
  meta = DEFAULT_META,
  primaryAction,
  secondaryAction,
}: WarmHeroProps) {
  const theme = THEME_TOKENS[mode];
  const typography = theme.typography;

  const textPrimary = typography.primaryClass;
  const textMuted = typography.mutedClass;
  const textMutedSoft = typography.mutedSoftClass;
  const textMutedUpper = typography.mutedUpperClass;
  const accentText = typography.accentClass;

  const activeFilters = useMemo(() => filters.filter((filter) => filter.active), [filters]);

  return (
    <section
      className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24 lg:pt-32"
      style={{ background: theme.background }}
      aria-labelledby="warm-hero-title"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_5%_10%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_80%)] opacity-80" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8">
        <header className={clsx('flex flex-col gap-4', textPrimary)}>
          <div className={clsx('flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.34em]', textMutedUpper)}>
            <Palette className="h-4 w-4" />
            <span>{eyebrow}</span>
            {activeFilters.length > 0 ? (
              <span className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px]', textMutedSoft)}>
                {activeFilters.map((filter) => filter.label).join(' · ')}
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:max-w-2xl">
            <h1 id="warm-hero-title" className="text-3xl font-semibold sm:text-4xl lg:text-[52px]">
              {title}
            </h1>
            <p className={clsx('text-sm sm:text-base leading-relaxed', textMuted)}>
              {description}
            </p>
          </div>
        </header>

        <GlassPanel className="flex flex-col gap-8 p-6 sm:p-8 lg:p-10" accent="warm" radius={56} mode={mode}>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-3">
                {filters.map((filter) => (
                  <FilterChip key={filter.label} filter={filter} mode={mode} />
                ))}
                <ThemeToggle mode={mode} onToggle={onModeToggle} />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {primaryAction ? (
                  <GlassButton variant="primary" mode={mode} onClick={primaryAction.onClick} className="px-7 py-3 text-[12px] tracking-[0.24em]">
                    {primaryAction.label}
                  </GlassButton>
                ) : null}
                {secondaryAction ? (
                  <GlassButton variant="ghost" mode={mode} onClick={secondaryAction.onClick} className="px-6 py-3 text-[12px] tracking-[0.24em]">
                    {secondaryAction.label}
                  </GlassButton>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {highlights.map((highlight) => (
                  <HighlightCard
                    key={highlight.label}
                    highlight={highlight}
                    mode={mode}
                    textMuted={textMuted}
                    textMutedUpper={textMutedUpper}
                    textPrimary={textPrimary}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-3 rounded-[28px] border border-white/32 bg-white/18 p-5 backdrop-blur-xl dark:border-white/18 dark:bg-white/10">
                {meta.map((item) => (
                  <MetaRow key={item.label} meta={item} textMuted={textMuted} textMutedUpper={textMutedUpper} textPrimary={textPrimary} />
                ))}
              </div>
            </div>
          </div>
        </GlassPanel>

        <footer className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.32em]">
          <span className={clsx('inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/30 px-4 py-2 backdrop-blur-md dark:border-white/15 dark:bg-white/10', textMutedSoft)}>
            Ecosistema cálido · Adaptable a luz de día y noche
          </span>
          <span className={clsx('flex items-center gap-2', accentText)}>
            <Sparkles className="h-4 w-4" />
            Experiencia inmersiva para familias
          </span>
        </footer>
      </div>
    </section>
  );
}

function FilterChip({ filter, mode }: { filter: WarmHeroFilter; mode: ThemeMode }) {
  const Icon = filter.icon;
  const isActive = Boolean(filter.active);
  const chipTokens = THEME_TOKENS[mode].typography;
  const baseStyles =
    'inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[10px] uppercase tracking-[0.26em] backdrop-blur-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent';
  const activeStyles = isActive
    ? `${chipTokens.chipActiveBorderClass} ${chipTokens.chipActiveBgClass} ${chipTokens.chipActiveTextClass} ${
        mode === 'dark'
          ? 'shadow-[0_16px_30px_-20px_rgba(0,0,0,0.55)]'
          : 'shadow-[0_16px_30px_-20px_rgba(167,86,43,0.6)]'
      }`
    : `${chipTokens.chipInactiveBorderClass} ${chipTokens.chipInactiveBgClass} ${chipTokens.chipInactiveTextClass} ${
        mode === 'dark'
          ? 'hover:border-white/25 hover:bg-white/18 hover:text-[rgba(254,244,233,0.92)] shadow-[0_12px_26px_-22px_rgba(0,0,0,0.5)]'
          : 'hover:border-white/55 hover:bg-white/36 hover:text-[rgba(47,33,22,0.82)] shadow-[0_12px_26px_-22px_rgba(67,34,15,0.4)]'
      }`;

  return (
    <button type="button" aria-pressed={isActive} className={clsx(baseStyles, activeStyles)}>
      <Icon className="h-4 w-4" />
      <span>{filter.label}</span>
    </button>
  );
}

function ThemeToggle({ mode, onToggle }: { mode: ThemeMode; onToggle: () => void }) {
  const isDark = mode === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[10px] uppercase tracking-[0.26em] backdrop-blur-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent',
        isDark
          ? 'border-white/20 bg-white/12 text-[rgba(244,228,214,0.78)] hover:bg-white/18 hover:text-[rgba(254,244,233,0.92)]'
          : 'border-white/45 bg-white/30 text-[rgba(47,33,22,0.7)] hover:border-white/55 hover:bg-white/40 hover:text-[rgba(47,33,22,0.88)]'
      )}
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span>{isDark ? 'Modo oscuro' : 'Modo claro'}</span>
    </button>
  );
}

function HighlightCard({
  highlight,
  mode,
  textMuted,
  textMutedUpper,
  textPrimary,
}: {
  highlight: WarmHeroHighlight;
  mode: ThemeMode;
  textMuted: string;
  textMutedUpper: string;
  textPrimary: string;
}) {
  const Icon = highlight.icon;
  const accent: GlassAccent = highlight.tone ?? 'warm';
  return (
    <GlassPanel className="flex flex-col gap-2 p-4 sm:p-5" accent={accent} radius={36} mode={mode}>
      <div className={clsx('flex items-center gap-2 text-[10px] uppercase tracking-[0.28em]', textMutedUpper)}>
        <Icon className="h-4 w-4" />
        <span>{highlight.label}</span>
      </div>
      <p className={clsx('text-2xl font-semibold sm:text-3xl', textPrimary)}>{highlight.value}</p>
      {highlight.helper ? <p className={clsx('text-xs sm:text-sm', textMuted)}>{highlight.helper}</p> : null}
    </GlassPanel>
  );
}

function MetaRow({
  meta,
  textMuted,
  textMutedUpper,
  textPrimary,
}: {
  meta: WarmHeroMeta;
  textMuted: string;
  textMutedUpper: string;
  textPrimary: string;
}) {
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/35 bg-white/25 text-white/90 backdrop-blur-md dark:border-white/15 dark:bg-white/10">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex flex-col gap-1">
        <span className={clsx('text-[10px] uppercase tracking-[0.26em]', textMutedUpper)}>{meta.label}</span>
        <span className={clsx('text-sm sm:text-base font-semibold', textPrimary)}>{meta.value}</span>
      </div>
    </div>
  );
}

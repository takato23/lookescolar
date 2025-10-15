'use client';

import clsx from 'clsx';
import { NotebookPen, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GlassPanel } from '@/components/design/GlassPanel';
import { GlassButton } from '@/components/design/GlassButton';
import { ThemeMode, THEME_TOKENS } from '@/lib/theme/lookescolar-tokens';

type CommunityUpdate = { title: string; value: string; helper: string; icon: LucideIcon };

const UPDATES: CommunityUpdate[] = [
  { title: 'Guiones narrados', value: '4 / 5', helper: 'Listos para revisión', icon: NotebookPen },
  { title: 'Satisfacción diaria', value: '4.8 ★', helper: '62 respuestas en 24 h', icon: Sparkles },
];

export function WarmCommunity({ mode }: { mode: ThemeMode }) {
  const theme = THEME_TOKENS[mode];
  const typography = theme.typography;

  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <GlassPanel
        wrapperClassName="lg:grid lg:grid-cols-12"
        className="flex h-full flex-col justify-between gap-6 p-6 sm:p-8 lg:col-span-12 lg:flex-row lg:items-start lg:gap-10"
        accent="warm"
        radius={52}
        mode={mode}
      >
        <div className="max-w-xl space-y-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.36em] text-[rgba(47,33,22,0.55)] dark:text-[rgba(242,225,208,0.72)]">
            <Sparkles className={clsx('h-4 w-4', mode === 'dark' ? 'text-[rgba(252,232,214,0.75)]' : 'text-[rgba(47,33,22,0.5)]')} />
            <span>Comunidad LookEscolar</span>
          </div>
          <h2 className={clsx('text-2xl font-semibold sm:text-3xl lg:text-[34px]', typography.primaryClass)}>
            Celebrá a tu equipo y mantené el ritmo cálido
          </h2>
          <p className={clsx('text-sm sm:text-base leading-relaxed', typography.mutedClass)}>
            Mantén la experiencia suave con recordatorios claros y celebraciones de los mejores momentos. Todo se coordina desde este panel cálido.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.32em]">
            <span className={clsx('inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/35 px-4 py-2 backdrop-blur-lg dark:border-white/18 dark:bg-white/10', typography.mutedSoftClass)}>
              Línea editorial · Octubre 2025
            </span>
            <GlassButton variant="ghost" mode={mode} className="px-5 py-2 text-[11px] tracking-[0.3em]">
              Descargar guía
            </GlassButton>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {UPDATES.map((item) => (
            <CommunityUpdateCard key={item.title} item={item} mode={mode} />
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[32px] border border-white/40 bg-white/30 px-5 py-4 text-xs uppercase tracking-[0.3em] backdrop-blur-lg dark:border-white/18 dark:bg-white/10">
            <span className={typography.mutedSoftClass}>Sesión de feedback · hoy 17:30</span>
            <GlassButton variant="primary" mode={mode} className="px-5 py-2 text-[11px] tracking-[0.28em]">
              Confirmar asistencia
            </GlassButton>
          </div>
        </div>
      </GlassPanel>
    </section>
  );
}

function CommunityUpdateCard({ item, mode }: { item: CommunityUpdate; mode: ThemeMode }) {
  const theme = THEME_TOKENS[mode];
  const typography = theme.typography;
  const Icon = item.icon;

  return (
    <article className="flex items-center gap-4 rounded-[32px] border border-[rgba(255,255,255,0.55)] bg-white/40 px-5 py-4 backdrop-blur-xl shadow-[0_30px_66px_-48px_rgba(67,34,15,0.5)] dark:border-white/20 dark:bg-white/10 dark:shadow-[0_30px_66px_-48px_rgba(0,0,0,0.45)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/55 text-[rgba(47,33,22,0.65)] shadow-[0_18px_48px_-40px_rgba(67,34,15,0.5)] dark:bg-white/15 dark:text-[rgba(244,228,214,0.85)] dark:shadow-[0_18px_48px_-40px_rgba(0,0,0,0.45)]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className={clsx('text-sm font-semibold', typography.primaryClass)}>{item.title}</p>
        <p className={clsx('text-xs', typography.mutedClass)}>{item.helper}</p>
      </div>
      <span className={clsx('text-sm font-semibold', typography.accentClass)}>{item.value}</span>
    </article>
  );
}

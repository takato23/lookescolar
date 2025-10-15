'use client';

import clsx from 'clsx';
import { useMemo } from 'react';
import { CalendarClock, GraduationCap, HeartHandshake } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GlassPanel } from '@/components/design/GlassPanel';
import { GlassButton } from '@/components/design/GlassButton';
import { ThemeMode, THEME_TOKENS } from '@/lib/theme/lookescolar-tokens';

type SummaryStat = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
};

type AgendaItem = {
  time: string;
  title: string;
  location: string;
  tag: string;
  duration?: string;
  status?: 'on-track' | 'attention';
};

const SUMMARY_STATS: SummaryStat[] = [
  { label: 'Aulas activas', value: '18', helper: '+3 esta semana', icon: GraduationCap },
  { label: 'Participación familiar', value: '92%', helper: 'Promedio últimos 7 días', icon: HeartHandshake },
  { label: 'Eventos agendados', value: '14', helper: 'Octubre 2025', icon: CalendarClock },
];

const AGENDA_ITEMS: AgendaItem[] = [
  {
    time: '08:00',
    title: 'Ensayo acto primavera',
    location: 'Salón multipropósito',
    tag: 'Comunidad',
    duration: '45 min',
    status: 'on-track',
  },
  {
    time: '10:30',
    title: 'Grabación aula 3°B',
    location: 'Estudio móvil',
    tag: 'Galería',
    duration: '60 min',
    status: 'attention',
  },
  {
    time: '14:00',
    title: 'Revisión de entregables',
    location: 'Laboratorio multimedia',
    tag: 'Equipo',
    duration: '30 min',
    status: 'on-track',
  },
];

const STATUS_STYLES: Record<
  NonNullable<AgendaItem['status']>,
  { light: string; dark: string; label: string }
> = {
  'on-track': {
    label: 'a tiempo',
    light:
      'border border-[rgba(72,132,98,0.3)] bg-[rgba(72,132,98,0.16)] text-[rgba(45,92,69,0.9)]',
    dark:
      'border border-[rgba(101,168,132,0.45)] bg-[rgba(64,124,94,0.32)] text-[rgba(203,243,218,0.92)]',
  },
  attention: {
    label: 'revisar',
    light:
      'border border-[rgba(242,143,93,0.45)] bg-[rgba(242,143,93,0.18)] text-[rgba(179,72,34,0.95)]',
    dark:
      'border border-[rgba(217,126,80,0.6)] bg-[rgba(181,78,43,0.38)] text-[rgba(255,210,185,0.95)]',
  },
};

export function WarmAgenda({ mode }: { mode: ThemeMode }) {
  const theme = THEME_TOKENS[mode];
  const typography = theme.typography;

  const agendaDateLabel = useMemo(() => formatAgendaDate(), []);

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-12">
        <GlassPanel className="flex flex-col gap-6 p-6 sm:p-7" accent="warm" radius={52} mode={mode}>
          <div className={clsx('flex items-center justify-between text-[11px] uppercase tracking-[0.36em]', typography.mutedUpperClass)}>
            <span>Estado general</span>
            <span>Actualizado hace 2 min</span>
          </div>
          <div className="grid gap-4 sm:auto-rows-[1fr] sm:grid-cols-3">
            {SUMMARY_STATS.map((stat) => (
              <SummaryStatCard key={stat.label} stat={stat} mode={mode} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="flex flex-col gap-6 p-6 sm:p-7" accent="warm" radius={48} mode={mode}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className={clsx('flex items-center gap-2 text-[11px] uppercase tracking-[0.32em]', typography.mutedUpperClass)}>
                <CalendarClock className={clsx('h-4 w-4', mode === 'dark' ? 'text-[rgba(252,232,214,0.75)]' : 'text-[rgba(47,33,22,0.5)]')} />
                <span>Agenda de hoy</span>
              </div>
              <div className={clsx('flex flex-wrap items-center gap-2 text-xs', typography.mutedClass)}>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/40 px-4 py-1.5 uppercase tracking-[0.28em] dark:border-white/20 dark:bg-white/10">
                  {agendaDateLabel}
                </span>
                <span className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.26em]', typography.badgeBorderClass, typography.badgeBgClass, typography.accentClass)}>
                  Tiempo real
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GlassButton variant="ghost" mode={mode} className="px-5 py-2 text-[11px] tracking-[0.28em]">
                Ver semana
              </GlassButton>
              <GlassButton variant="primary" mode={mode} className="px-6 py-2 text-[11px] tracking-[0.28em]">
                + Nuevo evento
              </GlassButton>
            </div>
          </div>
          <div className="space-y-4">
            {AGENDA_ITEMS.map((item) => (
              <AgendaRow key={`${item.time}-${item.title}`} item={item} mode={mode} />
            ))}
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}

function SummaryStatCard({ stat, mode }: { stat: SummaryStat; mode: ThemeMode }) {
  const Icon = stat.icon;
  const theme = THEME_TOKENS[mode];
  const typography = theme.typography;
  return (
    <article className="flex flex-col gap-3 rounded-[32px] border border-white/45 bg-white/35 p-4 backdrop-blur-xl shadow-[0_24px_60px_-48px_rgba(67,34,15,0.45)] dark:border-white/18 dark:bg-white/10 dark:shadow-[0_24px_60px_-48px_rgba(0,0,0,0.45)]">
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/55 bg-white/45 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[rgba(47,33,22,0.62)] dark:border-white/20 dark:bg-white/10 dark:text-[rgba(244,228,214,0.78)]">
        <Icon className="h-4 w-4" />
        {stat.label}
      </span>
      <p className={clsx('text-2xl font-semibold', typography.primaryClass)}>{stat.value}</p>
      <p className={clsx('text-xs', typography.mutedClass)}>{stat.helper}</p>
    </article>
  );
}

function AgendaRow({ item, mode }: { item: AgendaItem; mode: ThemeMode }) {
  const theme = THEME_TOKENS[mode];
  const typography = theme.typography;
  const statusToken = item.status ? STATUS_STYLES[item.status] : null;
  const statusClass = statusToken ? statusToken[mode] : '';

  return (
    <article className="flex flex-col gap-3 rounded-[32px] border border-white/45 bg-white/35 px-4 py-3 backdrop-blur-xl shadow-[0_24px_60px_-48px_rgba(67,34,15,0.45)] dark:border-white/18 dark:bg-white/10 dark:shadow-[0_24px_60px_-48px_rgba(0,0,0,0.45)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex flex-col text-sm font-semibold uppercase tracking-[0.26em] text-[rgba(47,33,22,0.62)] dark:text-[rgba(244,228,214,0.78)]">
          <span>{item.time}</span>
          {item.duration ? (
            <span className="text-[10px] font-normal tracking-[0.3em] text-[rgba(47,33,22,0.45)] dark:text-[rgba(244,228,214,0.6)]">
              {item.duration}
            </span>
          ) : null}
        </div>
        <span className="h-8 w-px rounded-full bg-gradient-to-b from-[rgba(47,33,22,0.12)] via-[rgba(47,33,22,0.05)] to-transparent dark:from-[rgba(244,228,214,0.35)] dark:via-[rgba(244,228,214,0.12)]" aria-hidden />
        <div className="space-y-1">
          <p className={clsx('text-sm font-semibold', typography.primaryClass)}>{item.title}</p>
          <p className={clsx('text-xs', typography.mutedClass)}>{item.location}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={clsx('rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]', typography.badgeBorderClass, typography.badgeBgClass, typography.accentClass)}>
          {item.tag}
        </span>
        {statusToken ? (
          <span className={clsx('rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.26em]', statusClass)}>
            {statusToken.label}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function formatAgendaDate() {
  const locale: Intl.LocalesArgument = 'es-AR';
  const now = new Date();
  const weekday = capitalize(now.toLocaleDateString(locale, { weekday: 'long' }));
  const day = now.toLocaleDateString(locale, { day: '2-digit' });
  const month = capitalize(
    now
      .toLocaleDateString(locale, { month: 'short' })
      .replace('.', '')
  );
  const year = now.getFullYear();
  return `${weekday} · ${day} ${month} ${year}`;
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

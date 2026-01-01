'use client';

import clsx from 'clsx';
import { CloudSun, Camera, HeartHandshake, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GlassPanel } from '@/components/design/GlassPanel';
import { GlassAccent, ThemeMode, THEME_TOKENS } from '@/lib/theme/lookescolar-tokens';

type QuickMetric = {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: GlassAccent;
  status?: {
    label: string;
    tone: 'positive' | 'neutral' | 'alert';
  };
};

const METRICS: QuickMetric[] = [
  {
    title: 'Clima Aula',
    value: '23 °C',
    helper: 'Humedad 56%',
    icon: CloudSun,
    tone: 'warm',
    status: { label: 'Estable', tone: 'neutral' },
  },
  {
    title: 'Clientes en vivo',
    value: '42',
    helper: '8 en espera',
    icon: HeartHandshake,
    tone: 'neutral',
    status: { label: '+6 vs ayer', tone: 'positive' },
  },
  {
    title: 'Galería hoy',
    value: '128 momentos',
    helper: '+24 nuevas capturas',
    icon: Camera,
    tone: 'warm',
    status: { label: 'Curando', tone: 'neutral' },
  },
  {
    title: 'Mensajes felices',
    value: '6 pendientes',
    helper: 'Responde antes de las 18:00',
    icon: MessageSquare,
    tone: 'cool',
    status: { label: 'Prioridad media', tone: 'alert' },
  },
];

const STATUS_STYLES: Record<
  NonNullable<QuickMetric['status']>['tone'],
  { light: string; dark: string }
> = {
  positive: {
    light:
      'border border-[rgba(65,126,92,0.35)] bg-[rgba(65,126,92,0.12)] text-[rgba(43,94,71,0.88)] shadow-[0_12px_26px_-18px_rgba(43,94,71,0.45)]',
    dark:
      'border border-[rgba(101,168,132,0.45)] bg-[rgba(64,124,94,0.35)] text-[rgba(203,243,218,0.92)] shadow-[0_12px_26px_-18px_rgba(0,0,0,0.45)]',
  },
  neutral: {
    light:
      'border border-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.32)] text-[rgba(47,36,27,0.68)] shadow-[0_12px_26px_-18px_rgba(67,34,15,0.35)]',
    dark:
      'border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.12)] text-[rgba(242,225,208,0.78)] shadow-[0_12px_26px_-18px_rgba(0,0,0,0.45)]',
  },
  alert: {
    light:
      'border border-[rgba(242,143,93,0.48)] bg-[rgba(242,143,93,0.16)] text-[rgba(179,72,34,0.92)] shadow-[0_12px_26px_-18px_rgba(179,72,34,0.4)]',
    dark:
      'border border-[rgba(217,126,80,0.6)] bg-[rgba(181,78,43,0.38)] text-[rgba(255,210,185,0.95)] shadow-[0_12px_26px_-18px_rgba(0,0,0,0.45)]',
  },
};

export function WarmMetrics({ mode }: { mode: ThemeMode }) {
  const theme = THEME_TOKENS[mode];
  const typography = theme.typography;

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className={clsx('text-xl font-semibold sm:text-2xl lg:text-[28px]', typography.primaryClass)}>
          Pulso en tiempo real
        </h2>
        <span className={clsx('text-xs uppercase tracking-[0.3em]', typography.mutedUpperClass)}>
          Se actualiza cada 45 s
        </span>
      </div>
      <div className="grid gap-4 sm:auto-rows-[1fr] sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => (
          <GlassPanel
            key={metric.title}
            className="flex h-full min-h-[190px] flex-col justify-between gap-4 p-5 sm:p-6"
            accent={metric.tone}
            radius={36}
            mode={mode}
          >
            <WarmMetricCard metric={metric} mode={mode} />
          </GlassPanel>
        ))}
      </div>
    </section>
  );
}

function WarmMetricCard({ metric, mode }: { metric: QuickMetric; mode: ThemeMode }) {
  const Icon = metric.icon;
  const theme = THEME_TOKENS[mode];
  const typography = theme.typography;
  const status = metric.status
    ? STATUS_STYLES[metric.status.tone][mode]
    : '';

  return (
    <article className="relative flex h-full flex-col justify-between gap-3">
      <div className="pointer-events-none absolute inset-x-[12%] top-2 h-[50%] rounded-full bg-white/45 blur-[42px] dark:bg-white/18" />
      <div className="relative flex items-center justify-between text-xs uppercase tracking-[0.3em]">
        <span className={typography.mutedUpperClass}>{metric.title}</span>
        <Icon className={clsx('h-4 w-4', mode === 'dark' ? 'text-[rgba(250,230,214,0.75)]' : 'text-[rgba(47,33,22,0.5)]')} />
      </div>
      <p className={clsx('relative text-2xl font-semibold sm:text-3xl', typography.primaryClass)}>{metric.value}</p>
      <p className={clsx('relative text-xs sm:text-sm', typography.mutedClass)}>{metric.helper}</p>
      {metric.status ? (
        <span
          className={clsx(
            'relative inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.24em]',
            status
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {metric.status.label}
        </span>
      ) : null}
    </article>
  );
}

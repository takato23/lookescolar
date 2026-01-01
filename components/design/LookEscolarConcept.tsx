'use client';

import { useEffect, useState } from 'react';
import {
  CalendarClock,
  Camera,
  CloudSun,
  GraduationCap,
  HeartHandshake,
  MessageSquare,
  Moon,
  NotebookPen,
  Palette,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GlassPanel } from '@/components/design/GlassPanel';
import { GlassButton } from '@/components/design/GlassButton';
import { THEME_TOKENS, ThemeMode, getSwatchTextClasses } from '@/lib/theme/lookescolar-tokens';

const TYPOGRAPHY = {
  fontFamily: '"Cormorant Garamond", "DM Sans", "Helvetica Neue", Arial, sans-serif',
} as const;

const ANIMATIONS = {
  fadeIn: 'animate-in fade-in-0 duration-1000',
  slideInTop: 'animate-in slide-in-from-top-4 duration-700',
  slideInBottom: 'animate-in slide-in-from-bottom-6 duration-900 delay-300',
  slideInBottomDelayed: 'animate-in slide-in-from-bottom-4 duration-900 delay-600',
} as const;

const STATUS_STYLES: Record<'positive' | 'neutral' | 'alert', string> = {
  positive:
    'border border-[rgba(65,126,92,0.35)] bg-[rgba(65,126,92,0.12)] text-[rgba(43,94,71,0.88)] shadow-[0_12px_26px_-18px_rgba(43,94,71,0.45)] dark:border-[rgba(101,168,132,0.45)] dark:bg-[rgba(64,124,94,0.35)] dark:text-[rgba(203,243,218,0.92)] dark:shadow-[0_12px_26px_-18px_rgba(0,0,0,0.45)]',
  neutral:
    'border border-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.32)] text-[rgba(47,36,27,0.68)] shadow-[0_12px_26px_-18px_rgba(67,34,15,0.35)] dark:border-[rgba(255,255,255,0.18)] dark:bg-[rgba(255,255,255,0.12)] dark:text-[rgba(242,225,208,0.78)] dark:shadow-[0_12px_26px_-18px_rgba(0,0,0,0.45)]',
  alert:
    'border border-[rgba(242,143,93,0.48)] bg-[rgba(242,143,93,0.16)] text-[rgba(179,72,34,0.92)] shadow-[0_12px_26px_-18px_rgba(179,72,34,0.4)] dark:border-[rgba(217,126,80,0.6)] dark:bg-[rgba(181,78,43,0.38)] dark:text-[rgba(255,210,185,0.95)] dark:shadow-[0_12px_26px_-18px_rgba(0,0,0,0.45)]',
};

type FilterChipToken = { label: string; icon: LucideIcon; active?: boolean };
type HeroHighlight = { label: string; value: string; icon: LucideIcon };
type HeroMeta = { label: string; value: string; icon: LucideIcon };
type SummaryStat = { label: string; value: string; helper: string; icon: LucideIcon };
type AgendaItem = {
  time: string;
  title: string;
  location: string;
  tag: string;
  duration?: string;
  status?: 'on-track' | 'attention';
};
type QuickMetric = {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: 'warm' | 'neutral' | 'cool';
  status?: {
    label: string;
    tone: 'positive' | 'neutral' | 'alert';
  };
};
type CommunityUpdate = { title: string; value: string; helper: string; icon: LucideIcon };
type TeamMember = { name: string; image: string };

const AGENDA_STATUS_TOKENS: Record<NonNullable<AgendaItem['status']>, { label: string; className: string }> = {
  'on-track': {
    label: 'a tiempo',
    className:
      'border border-[rgba(72,132,98,0.3)] bg-[rgba(72,132,98,0.16)] text-[rgba(45,92,69,0.9)] dark:border-[rgba(101,168,132,0.45)] dark:bg-[rgba(64,124,94,0.32)] dark:text-[rgba(203,243,218,0.92)]',
  },
  attention: {
    label: 'revisar',
    className:
      'border border-[rgba(242,143,93,0.45)] bg-[rgba(242,143,93,0.18)] text-[rgba(179,72,34,0.95)] dark:border-[rgba(217,126,80,0.6)] dark:bg-[rgba(181,78,43,0.38)] dark:text-[rgba(255,210,185,0.95)]',
  },
};

const filters: FilterChipToken[] = [
  { label: 'Modo galería', icon: Camera, active: true },
  { label: 'Clientes', icon: HeartHandshake },
  { label: 'Docentes', icon: GraduationCap },
];

const heroHighlights: HeroHighlight[] = [
  { label: 'Salas en vivo', value: '12', icon: Camera },
  { label: 'Clientes conectados', value: '268', icon: Users },
  { label: 'Nivel de alegría', value: '96%', icon: Sparkles },
];

const heroMeta: HeroMeta[] = [
  { label: 'Próxima transmisión', value: '10:30 · Aula 3°B', icon: Camera },
  { label: 'Entrega destacada', value: '16:00 · Álbum Primavera', icon: NotebookPen },
];

const summaryStats: SummaryStat[] = [
  { label: 'Aulas activas', value: '18', helper: '+3 esta semana', icon: GraduationCap },
  { label: 'Participación de clientes', value: '92%', helper: 'Promedio últimos 7 días', icon: HeartHandshake },
  { label: 'Eventos agendados', value: '14', helper: 'Octubre 2025', icon: CalendarClock },
];

const agendaItems: AgendaItem[] = [
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

const quickMetrics: QuickMetric[] = [
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

const communityUpdates: CommunityUpdate[] = [
  { title: 'Guiones narrados', value: '4 / 5', helper: 'Listos para revisión', icon: NotebookPen },
  { title: 'Satisfacción diaria', value: '4.8 ★', helper: '62 respuestas en 24 h', icon: Sparkles },
];

const teamMembers: TeamMember[] = [
  { name: 'Laura', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80&fm=webp' },
  { name: 'Mateo', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=200&q=80&fm=webp' },
  { name: 'Ana', image: 'https://images.unsplash.com/photo-1521572267360-99cf1df050b1?auto=format&fit=crop&w=200&q=80&fm=webp' },
  { name: 'Julián', image: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=200&q=80&fm=webp' },
  { name: 'Noelia', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80&fm=webp' },
];

const palette = [
  { name: 'Luz de alba', value: '#F4E6D8' },
  { name: 'Arcilla suave', value: '#E7CBB0' },
  { name: 'Cobre escolar', value: '#C48C65' },
  { name: 'Tinta cálida', value: '#2F241B' },
  { name: 'Destello dorado', value: '#F28F5D' },
];

export function LookEscolarConcept() {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyPreference = () => setMode(media.matches ? 'dark' : 'light');
    applyPreference();
    media.addEventListener('change', applyPreference);
    return () => media.removeEventListener('change', applyPreference);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('color-scheme', mode);
  }, [mode]);

  const theme = THEME_TOKENS[mode];
  const typography = theme.typography;
  const textPrimaryClass = typography.primaryClass;
  const textMutedClass = typography.mutedClass;
  const textMutedSoftClass = typography.mutedSoftClass;
  const textMutedUpperClass = typography.mutedUpperClass;
  const accentTextClass = typography.accentClass;
  const badgeBgClass = typography.badgeBgClass;
  const badgeBorderClass = typography.badgeBorderClass;
  const toggleMode = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-orange-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg transition-all duration-200"
      >
        Saltar al contenido principal
      </a>
      <div
        className={`min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12 ${textPrimaryClass} ${mode === 'dark' ? 'dark' : ''}`}
        style={{
          background: theme.background,
          fontFamily: TYPOGRAPHY.fontFamily,
        }}
      >
        <main
          id="main-content"
          className={`mx-auto flex max-w-6xl flex-col gap-10 sm:gap-14 ${ANIMATIONS.fadeIn}`}
          role="main"
        >
          <header className={`flex flex-col gap-4 ${ANIMATIONS.slideInTop}`} role="banner">
            <div
              className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.34em] ${textMutedUpperClass}`}
            >
              <Palette className="h-4 w-4" />
              <span>LookEscolar · Identidad cálida</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[52px] font-semibold leading-tight">
              Un tablero dorado para la comunidad escolar
            </h1>
            <p className={`max-w-2xl text-sm sm:text-base leading-relaxed ${textMutedClass}`}>
              Diseñamos una atmósfera relajada y sofisticada para seguir el pulso de cada aula:
              vidrio esmerilado, luz filtrada y detalles cobre que hacen sentir acogida a cada cliente.
            </p>
            <nav aria-label="Filtros de visualización" className="mt-6 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {filters.map((filter) => (
                  <FilterChip key={filter.label} filter={filter} mode={mode} />
                ))}
              </div>
              <ThemeToggle mode={mode} onToggle={toggleMode} />
            </nav>
          </header>

          <section className={`grid gap-6 sm:gap-8 lg:grid-cols-12 ${ANIMATIONS.slideInBottom}`}>
            <GlassPanel
              wrapperClassName="lg:col-span-7 lg:self-stretch"
              className="relative min-h-[560px] overflow-hidden p-7 sm:p-10 lg:p-12"
              accent="warm"
              radius={68}
              mode={mode}
            >
              <div className="absolute inset-0 overflow-hidden rounded-[68px]">
                <img
                  src="https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?auto=format&fit=crop&w=1600&q=85&fm=webp"
                  alt="Aula cálida iluminada por la mañana"
                  className="h-full w-full object-cover"
                  style={{ filter: 'saturate(0.9) contrast(1.05)' }}
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 rounded-[68px] bg-gradient-to-br from-[rgba(44,26,12,0.72)] via-[rgba(74,46,24,0.52)] to-[rgba(110,70,38,0.68)]" />
              </div>
              <div className="relative flex h-full flex-col justify-between gap-10 px-3 pb-8 text-white sm:px-6">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.44em] text-white/75">
                  <span>Buenos días, equipo</span>
                  <span>Jueves · 09 Oct 2025</span>
                </div>
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.4em]">
                    Colección dorada 2025
                  </div>
                  <h2 className="text-3xl sm:text-5xl lg:text-[58px] font-semibold leading-tight tracking-[-0.02em] drop-shadow-2xl">
                    Mirada LookEscolar en vivo
                  </h2>
                  <p className="max-w-xl text-sm sm:text-base text-white/80">
                    Sigue las aulas, calidez de las galerías y la emoción de los clientes desde un único tablero.
                    Todo se actualiza cada minuto para que la magia suceda sin fricción.
                  </p>
                </div>
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-5">
                    <span className="text-[11px] uppercase tracking-[0.32em] text-white/75">Curaduría</span>
                    <div className="flex -space-x-3">
                      {teamMembers.map((member) => (
                        <span
                          key={member.name}
                          className="h-11 w-11 overflow-hidden rounded-full border border-white/70 shadow-lg"
                        >
                          <img
                            src={member.image}
                            alt={`Retrato de ${member.name}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                      ))}
                      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/20 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 backdrop-blur-lg">
                        +
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {heroHighlights.map((highlight) => (
                      <HeroHighlightCard key={highlight.label} highlight={highlight} mode={mode} />
                    ))}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {heroMeta.map((meta) => (
                      <HeroMetaRow key={meta.label} meta={meta} mode={mode} />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <GlassButton variant="primary" mode={mode} className="px-7 py-3 text-[13px] tracking-[0.26em]">
                      Abrir tablero unificado
                    </GlassButton>
                    <GlassButton
                      variant="ghost"
                      mode={mode}
                      className="px-6 py-3 text-[12px] tracking-[0.24em] text-white/80 hover:text-white"
                    >
                      Compartir preview
                    </GlassButton>
                  </div>
                </div>
              </div>
            </GlassPanel>

            <div className="flex flex-col gap-6 lg:col-span-5 lg:self-stretch">
              <GlassPanel className="flex flex-col gap-6 p-6 sm:p-7" accent="warm" radius={52} mode={mode}>
                <div className={`flex items-center justify-between text-[11px] uppercase tracking-[0.36em] ${textMutedUpperClass}`}>
                  <span>Estado general</span>
                  <span>Actualizado hace 2 min</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:auto-rows-[1fr] sm:grid-cols-3">
                  {summaryStats.map((stat) => (
                    <SummaryStatCard key={stat.label} stat={stat} mode={mode} />
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel className="flex flex-col gap-6 p-6 sm:p-7" accent="warm" radius={48} mode={mode}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] ${textMutedUpperClass}`}>
                      <CalendarClock className={`h-4 w-4 ${mode === 'dark' ? 'text-[rgba(252,232,214,0.75)]' : 'text-[rgba(47,33,22,0.5)]'}`} />
                      <span>Agenda de hoy</span>
                    </div>
                    <div className={`flex flex-wrap items-center gap-2 text-xs ${textMutedClass}`}>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/40 px-4 py-1.5 uppercase tracking-[0.28em] dark:border-white/20 dark:bg-white/10">
                        Jueves · 09 Oct 2025
                      </span>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.26em] ${badgeBorderClass} ${badgeBgClass} ${accentTextClass}`}>
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
                  {agendaItems.map((item) => (
                    <AgendaItemRow
                      key={`${item.time}-${item.title}`}
                      item={item}
                      badgeBorderClass={badgeBorderClass}
                      badgeBgClass={badgeBgClass}
                      accentTextClass={accentTextClass}
                    />
                  ))}
                </div>
              </GlassPanel>
            </div>
          </section>

          <section
            aria-labelledby="metrics-heading"
            className={`space-y-6 ${ANIMATIONS.slideInBottomDelayed}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="metrics-heading" className="text-xl sm:text-2xl lg:text-[28px] font-semibold">
                Pulso en tiempo real
              </h2>
              <span className={`text-xs uppercase tracking-[0.3em] ${textMutedUpperClass}`}>
                Se actualiza cada 45 s
              </span>
            </div>
            <div className="grid gap-4 sm:auto-rows-[1fr] sm:grid-cols-2 xl:grid-cols-4">
              {quickMetrics.map((metric) => (
                <GlassPanel
                  key={metric.title}
                  className="flex h-full min-h-[180px] flex-col justify-between gap-3 p-5 sm:p-6"
                  accent={metric.tone}
                  radius={36}
                  mode={mode}
                >
                  <QuickMetricCard metric={metric} mode={mode} textMutedClass={textMutedClass} />
                </GlassPanel>
              ))}
            </div>
          </section>

          <section className={`grid gap-6 sm:gap-8 lg:grid-cols-12 ${ANIMATIONS.slideInBottom}`}>
            <GlassPanel
              wrapperClassName="lg:col-span-7 lg:self-stretch"
              className="relative overflow-hidden p-0"
              accent="warm"
              radius={60}
              mode={mode}
            >
              <div className="absolute inset-0 overflow-hidden rounded-[60px]">
                <img
                  src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85&fm=webp"
                  alt="Clientes compartiendo recuerdos escolares"
                  className="h-full w-full object-cover"
                  style={{ filter: 'saturate(0.95)' }}
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 rounded-[60px] bg-gradient-to-b from-[rgba(37,22,11,0.66)] via-[rgba(59,36,20,0.45)] to-[rgba(67,36,15,0.75)]" />
              </div>
              <div className="relative flex h-full flex-col justify-between gap-5 p-7 sm:p-10 text-white">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.36em] text-white/75">
                  <Camera className="h-4 w-4" />
                  <span>Galería destacada</span>
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl sm:text-3xl lg:text-[34px] font-semibold tracking-[-0.015em] drop-shadow-xl">
                    Recuerdos dorados de otoño
                  </h3>
                  <p className="max-w-md text-sm sm:text-base text-white/82">
                    Historias audiovisuales listas para enviar a los clientes, con música y texto sincronizado.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <p className="text-sm uppercase tracking-[0.32em] text-white/75">Momentos hoy</p>
                    <p className="text-3xl font-semibold">128</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.32em] text-white/75">Colaboradores</p>
                    <p className="text-3xl font-semibold">24</p>
                  </div>
                  <GlassButton variant="primary" mode={mode} className="mt-4 px-6 py-3">
                    Ver colección
                  </GlassButton>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel
              wrapperClassName="lg:col-span-5 lg:self-stretch"
              className="flex h-full flex-col justify-between gap-6 p-6 sm:p-8"
              accent="warm"
              radius={52}
              mode={mode}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.36em] text-[rgba(47,33,22,0.55)] dark:text-[rgba(242,225,208,0.72)]">
                  <Sparkles className="h-4 w-4 text-[rgba(47,33,22,0.5)] dark:text-[rgba(252,232,214,0.75)]" />
                  <span>Comunidad LookEscolar</span>
                </div>
                <p className={`text-sm ${textMutedClass}`}>
                  Mantén la experiencia suave con recordatorios claros y celebración de los mejores momentos.
                  Todo se coordina desde este panel cálido.
                </p>
              </div>
                <div className="space-y-4">
                  {communityUpdates.map((item) => (
                    <CommunityUpdateCard
                      key={item.title}
                      item={item}
                      mode={mode}
                      accentTextClass={accentTextClass}
                    />
                  ))}
                </div>
              <div className={`flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-white/45 bg-white/35 px-5 py-4 text-xs uppercase tracking-[0.32em] ${textMutedSoftClass} backdrop-blur-lg dark:border-white/20 dark:bg-white/10`}>
                <span>Guía cromática · Tonalidad 2025</span>
                <GlassButton variant="ghost" mode={mode} className="px-5 py-2 text-[11px] tracking-[0.3em]">
                  Descargar guía
                </GlassButton>
              </div>
            </GlassPanel>
          </section>

          <section aria-labelledby="palette-heading" className={`space-y-6 ${ANIMATIONS.slideInBottomDelayed}`}>
            <header>
              <h2 id="palette-heading" className="text-xl sm:text-2xl lg:text-[28px] font-semibold">
                Tokens cromáticos
              </h2>
              <p className={`text-sm ${textMutedClass}`}>
                Gradientes tierra, reflejos suaves y sombras largas para un look sofisticado y amigable.
              </p>
            </header>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {palette.map((tone) => (
                <ColorSwatch key={tone.name} tone={tone} mode={mode} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

function HeroHighlightCard({ highlight, mode }: { highlight: HeroHighlight; mode: ThemeMode }) {
  const Icon = highlight.icon;
  const valueClass = mode === 'dark' ? 'text-[rgba(254,244,233,0.92)]' : 'text-[rgba(47,33,22,0.85)]';
  const labelClass = mode === 'dark' ? 'text-white/70' : 'text-[rgba(47,33,22,0.6)]';
  const iconClass = mode === 'dark' ? 'text-white/85' : 'text-[rgba(47,33,22,0.7)]';
  return (
    <article className="flex min-h-[112px] w-full items-center gap-3 rounded-3xl border border-white/35 bg-white/25 px-4 py-5 text-sm backdrop-blur-xl shadow-[0_30px_70px_-50px_rgba(0,0,0,0.7)] dark:bg-white/15">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/25 dark:bg-white/10">
        <Icon className={`h-4 w-4 ${iconClass}`} />
      </span>
      <div>
        <p className={`text-[10px] uppercase tracking-[0.36em] ${labelClass}`}>{highlight.label}</p>
        <p className={`text-xl font-semibold tracking-tight ${valueClass}`}>{highlight.value}</p>
      </div>
    </article>
  );
}

function HeroMetaRow({ meta, mode }: { meta: HeroMeta; mode: ThemeMode }) {
  const Icon = meta.icon;
  const valueClass = mode === 'dark' ? 'text-[rgba(254,244,233,0.92)]' : 'text-[rgba(47,33,22,0.82)]';
  const labelClass = mode === 'dark' ? 'text-white/70' : 'text-[rgba(47,33,22,0.58)]';
  const statusClass = mode === 'dark' ? 'text-white/80' : 'text-[rgba(47,33,22,0.55)]';
  return (
    <article className="flex min-h-[116px] w-full items-center justify-between gap-3 rounded-[28px] border border-white/35 bg-white/18 px-5 py-5 text-sm backdrop-blur-2xl shadow-[0_30px_72px_-56px_rgba(0,0,0,0.65)] dark:bg-white/12">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/30 bg-white/15 dark:border-white/20 dark:bg-white/10">
          <Icon className={`h-4 w-4 ${mode === 'dark' ? 'text-white/85' : 'text-[rgba(47,33,22,0.7)]'}`} />
        </span>
        <div>
          <p className={`text-[10px] uppercase tracking-[0.32em] ${labelClass}`}>{meta.label}</p>
          <p className={`text-base font-semibold tracking-[-0.01em] ${valueClass}`}>{meta.value}</p>
        </div>
      </div>
      <span className={`text-[11px] uppercase tracking-[0.26em] ${statusClass}`}>En curso</span>
    </article>
  );
}

function SummaryStatCard({ stat, mode }: { stat: SummaryStat; mode: ThemeMode }) {
  const Icon = stat.icon;
  return (
    <article
      className="flex h-full flex-col justify-between gap-3 rounded-[28px] border border-[rgba(255,255,255,0.55)] bg-white/45 p-5 shadow-[0_32px_62px_-48px_rgba(67,34,15,0.48)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.32em] text-[rgba(47,33,22,0.52)] dark:text-[rgba(242,225,208,0.65)]">
        <span>{stat.label}</span>
        <Icon
          className={`h-4 w-4 ${mode === 'dark' ? 'text-[rgba(250,230,214,0.65)]' : 'text-[rgba(47,33,22,0.4)]'}`}
        />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[30px] font-semibold tracking-[-0.01em] text-[rgba(47,33,22,0.85)] dark:text-[rgba(254,244,233,0.92)]">
          {stat.value}
        </span>
        <span className="text-xs text-[rgba(47,33,22,0.55)] dark:text-[rgba(242,225,208,0.7)]">{stat.helper}</span>
      </div>
    </article>
  );
}

function AgendaItemRow({
  item,
  badgeBorderClass,
  badgeBgClass,
  accentTextClass,
}: {
  item: AgendaItem;
  badgeBorderClass: string;
  badgeBgClass: string;
  accentTextClass: string;
}) {
  const statusToken = item.status ? AGENDA_STATUS_TOKENS[item.status] : null;
  return (
    <article className="relative flex items-start gap-5 rounded-[26px] border border-[rgba(255,255,255,0.55)] bg-white/42 px-5 py-4 sm:px-6 backdrop-blur-xl shadow-[0_30px_64px_-46px_rgba(67,34,15,0.48)]">
      <div className="relative flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/55 bg-white/60 text-xs font-semibold uppercase tracking-[0.32em] text-[rgba(47,33,22,0.68)] dark:border-white/25 dark:bg-white/15 dark:text-[rgba(244,228,214,0.85)]">
          {item.time}
        </div>
        <span className="h-8 w-px rounded-full bg-gradient-to-b from-[rgba(47,33,22,0.12)] via-[rgba(47,33,22,0.05)] to-transparent dark:from-[rgba(244,228,214,0.35)] dark:via-[rgba(244,228,214,0.12)]" aria-hidden />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-[rgba(47,33,22,0.88)] dark:text-[rgba(254,244,233,0.92)]">{item.title}</p>
          {item.duration && (
            <span className="text-[11px] uppercase tracking-[0.28em] text-[rgba(47,33,22,0.55)] dark:text-[rgba(242,225,208,0.7)]">
              {item.duration}
            </span>
          )}
        </div>
        <p className="text-xs text-[rgba(47,33,22,0.62)] dark:text-[rgba(244,228,214,0.78)]">{item.location}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] ${badgeBorderClass} ${badgeBgClass} ${accentTextClass}`}>
          {item.tag}
        </span>
        {statusToken && (
          <span
            className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.28em] ${statusToken.className}`}
          >
            {statusToken.label}
          </span>
        )}
      </div>
    </article>
  );
}

function QuickMetricCard({
  metric,
  mode,
  textMutedClass,
}: {
  metric: QuickMetric;
  mode: ThemeMode;
  textMutedClass: string;
}) {
  const Icon = metric.icon;
  const statusClass = metric.status ? STATUS_STYLES[metric.status.tone] : '';
  return (
    <article className="relative flex h-full flex-col justify-between gap-3">
      <div className="pointer-events-none absolute inset-x-[12%] top-0 h-[52%] rounded-full bg-white/40 blur-[42px] dark:bg-white/12" />
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[rgba(47,33,22,0.55)] dark:text-[rgba(242,225,208,0.72)]">
        <span>{metric.title}</span>
        <Icon className="h-4 w-4 text-[rgba(47,33,22,0.4)] dark:text-[rgba(250,230,214,0.65)]" />
      </div>
      <p className={`text-2xl font-semibold ${mode === 'dark' ? 'text-[rgba(254,244,233,0.92)]' : 'text-[rgba(47,33,22,0.85)]'}`}>{metric.value}</p>
      <p className={`text-xs ${textMutedClass}`}>{metric.helper}</p>
      {metric.status && (
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.24em] ${statusClass}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {metric.status.label}
        </span>
      )}
    </article>
  );
}

function CommunityUpdateCard({
  item,
  mode,
  accentTextClass,
}: {
  item: CommunityUpdate;
  mode: ThemeMode;
  accentTextClass: string;
}) {
  const Icon = item.icon;
  return (
    <article className="flex items-center gap-4 rounded-[28px] border border-[rgba(255,255,255,0.55)] bg-white/40 px-5 py-4 backdrop-blur-xl shadow-[0_30px_66px_-48px_rgba(67,34,15,0.5)] dark:border-white/20 dark:bg-white/10 dark:shadow-[0_30px_66px_-48px_rgba(0,0,0,0.45)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/55 text-[rgba(47,33,22,0.65)] shadow-[0_18px_48px_-40px_rgba(67,34,15,0.5)] dark:bg-white/15 dark:text-[rgba(244,228,214,0.85)] dark:shadow-[0_18px_48px_-40px_rgba(0,0,0,0.45)]">
        <Icon className={`h-5 w-5 ${mode === 'dark' ? 'text-[rgba(244,228,214,0.85)]' : 'text-[rgba(47,33,22,0.65)]'}`} />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[rgba(47,33,22,0.85)] dark:text-[rgba(254,244,233,0.92)]">{item.title}</p>
        <p className="text-xs text-[rgba(47,33,22,0.62)] dark:text-[rgba(244,228,214,0.78)]">{item.helper}</p>
      </div>
      <span className={`text-sm font-semibold ${accentTextClass}`}>{item.value}</span>
    </article>
  );
}

function ColorSwatch({ tone, mode }: { tone: { name: string; value: string }; mode: ThemeMode }) {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(tone.value);
    } catch (error) {
      console.error('Failed to copy color:', error);
    }
  };

  const { titleClass, tokenClass, ringClass } = getSwatchTextClasses(tone.value, mode);

  return (
    <button
      type="button"
      className="group relative flex items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.5)] bg-white/45 px-4 py-3 text-sm shadow-[0_22px_62px_-44px_rgba(67,34,15,0.5)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-transparent dark:border-white/20 dark:bg-white/10 dark:shadow-[0_22px_62px_-44px_rgba(0,0,0,0.45)]"
      onClick={copyToClipboard}
      aria-label={`Copiar tono ${tone.name}: ${tone.value}`}
    >
      <span
        className={`h-12 w-12 rounded-xl border ${ringClass}`}
        style={{ background: tone.value }}
      />
      <div>
        <p className={`font-semibold ${titleClass}`}>{tone.name}</p>
        <p className={`text-xs uppercase tracking-[0.28em] ${tokenClass}`}>
          {tone.value}
        </p>
      </div>
      <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-black/80 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-focus:opacity-100 group-hover:opacity-100">
        Click para copiar
      </span>
    </button>
  );
}

function FilterChip({ filter, mode }: { filter: FilterChipToken; mode: ThemeMode }) {
  const Icon = filter.icon;
  const isActive = Boolean(filter.active);
  const chipTokens = THEME_TOKENS[mode].typography;
  const baseStyles = 'inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-xs uppercase tracking-[0.26em] backdrop-blur-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent';
  const activeStyles = isActive
    ? `${chipTokens.chipActiveBorderClass} ${chipTokens.chipActiveBgClass} ${chipTokens.chipActiveTextClass} ${
        mode === 'dark'
          ? 'shadow-[0_16px_30px_-20px_rgba(0,0,0,0.55)]'
          : 'shadow-[0_16px_30px_-20px_rgba(167,86,43,0.6)]'
      }`
    : '';
  const inactiveStyles = !isActive
    ? `${chipTokens.chipInactiveBorderClass} ${chipTokens.chipInactiveBgClass} ${chipTokens.chipInactiveTextClass} ${
        mode === 'dark'
          ? 'hover:border-white/25 hover:bg-white/18 hover:text-[rgba(254,244,233,0.92)] shadow-[0_12px_26px_-22px_rgba(0,0,0,0.5)]'
          : 'hover:border-white/55 hover:bg-white/36 hover:text-[rgba(47,33,22,0.82)] shadow-[0_12px_26px_-22px_rgba(67,34,15,0.4)]'
      }`
    : '';

  const iconClass = isActive
    ? chipTokens.chipActiveTextClass
    : chipTokens.chipInactiveTextClass;

  return (
    <button
      type="button"
      aria-pressed={isActive}
      className={`${baseStyles} ${isActive ? activeStyles : inactiveStyles}`}
    >
      <Icon className={`h-4 w-4 ${iconClass}`} />
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
      className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/30 px-4 py-2.5 text-xs uppercase tracking-[0.26em] text-[rgba(47,33,22,0.7)] shadow-[0_12px_26px_-22px_rgba(67,34,15,0.4)] backdrop-blur-xl transition-all duration-300 hover:border-white/55 hover:bg-white/40 hover:text-[rgba(47,33,22,0.88)] focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent dark:border-white/20 dark:bg-white/12 dark:text-[rgba(244,228,214,0.78)] dark:shadow-[0_12px_26px_-22px_rgba(0,0,0,0.5)] dark:hover:bg-white/18 dark:hover:text-[rgba(254,244,233,0.92)]"
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span>{isDark ? 'Modo oscuro' : 'Modo claro'}</span>
    </button>
  );
}

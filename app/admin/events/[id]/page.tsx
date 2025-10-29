import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { absoluteUrl } from '@/lib/absoluteUrl';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

type SearchParams = Record<string, string | string[] | undefined>;

type EventRow = Database['public']['Tables']['events']['Row'];

type EventStats = {
  photos: number;
  subjects: number;
  orders: number;
  revenue: number;
};

type PricingTier = {
  name: string;
  price: number;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function alignParam(
  params: URLSearchParams,
  canonical: string,
  legacy: string
) {
  const value = params.get(canonical) ?? params.get(legacy);
  if (!value) return;
  params.set(canonical, value);
  params.set(legacy, value);
}

function setIfPresent(
  params: URLSearchParams,
  target: string,
  value: string | undefined
) {
  if (!value) return;
  params.set(target, value);
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function formatDateRange(event: EventRow): string {
  const start = event.start_date ?? event.date;
  const end = event.end_date ?? event.date;
  const formattedStart = formatDate(start);
  const formattedEnd = formatDate(end);

  if (formattedStart && formattedEnd && formattedStart !== formattedEnd) {
    return `${formattedStart} – ${formattedEnd}`;
  }

  return formattedStart ?? formattedEnd ?? 'Sin fecha asignada';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractCurrency(settings: EventRow['settings']): string | null {
  if (!settings || typeof settings !== 'object') {
    return null;
  }

  const value = settings as Record<string, unknown>;

  if (typeof value.currency === 'string') {
    return value.currency;
  }

  if (
    value.pricing &&
    typeof value.pricing === 'object' &&
    value.pricing !== null &&
    typeof (value.pricing as Record<string, unknown>).currency === 'string'
  ) {
    return (value.pricing as Record<string, unknown>).currency as string;
  }

  return null;
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-ES').format(value);
}

function parsePricingTiers(raw: EventRow['photo_prices']): PricingTier[] {
  if (!raw) return [];

  const tiers: PricingTier[] = [];

  const pushTier = (entry: Record<string, unknown>) => {
    const name = typeof entry.name === 'string' ? entry.name.trim() : undefined;
    if (!name) return;

    const rawPrice = toNumber(entry.price) ?? toNumber(entry.amount);
    const rawPriceCents = toNumber(entry.price_cents);
    const normalizedPrice =
      rawPrice !== null
        ? rawPrice
        : rawPriceCents !== null
          ? rawPriceCents / 100
          : null;

    if (normalizedPrice === null) return;

    tiers.push({ name, price: normalizedPrice });
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object') {
        pushTier(item as Record<string, unknown>);
      }
    }
    return tiers;
  }

  if (typeof raw === 'object') {
    for (const value of Object.values(raw)) {
      if (value && typeof value === 'object') {
        pushTier(value as Record<string, unknown>);
      }
    }
  }

  return tiers;
}

function resolveStatusBadge(event: EventRow): { label: string; className: string } {
  const rawStatus = (event.status ?? '').toString().toLowerCase();
  const isLive =
    rawStatus === 'active' ||
    rawStatus === 'published' ||
    rawStatus === 'en vivo' ||
    rawStatus === 'live' ||
    Boolean(event.active);

  if (isLive) {
    return {
      label: 'Evento en vivo',
      className: 'bg-[#62e2a2]/25 text-[#dff8ec]',
    };
  }

  if (rawStatus === 'archived' || rawStatus === 'archivado') {
    return {
      label: 'Archivado',
      className: 'bg-white/10 text-white/70',
    };
  }

  return {
    label: 'En preparación',
    className: 'bg-white/10 text-white/80',
  };
}

async function fetchEventContext(eventId: string): Promise<{
  event: EventRow | null;
  stats: EventStats;
  pricing: PricingTier[];
  currency: string;
}> {
  const supabase = await createServerSupabaseClient();

  const { data: event, error } = await supabase
    .from('events')
    .select(
      'id, name, school_name, location, date, start_date, end_date, status, price_per_photo, published, active, settings, photo_prices, photographer_name, photographer_email, photographer_phone'
    )
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    console.error('Error al cargar el evento', error);
  }

  if (!event) {
    return {
      event: null,
      stats: { photos: 0, subjects: 0, orders: 0, revenue: 0 },
      pricing: [],
      currency: 'USD',
    };
  }

  const [subjectsRes, photosRes, ordersRes] = await Promise.all([
    supabase
      .from('subjects')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId),
    supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId),
    supabase
      .from('orders')
      .select('total_amount,total_cents', { count: 'exact' })
      .eq('event_id', eventId),
  ]);

  const subjects = subjectsRes?.count ?? 0;
  const photos = photosRes?.count ?? 0;
  const orders = ordersRes?.count ?? (ordersRes?.data?.length ?? 0);
  const ordersData = ordersRes?.data ?? [];

  const revenue = ordersData.reduce((acc, order) => {
    if (typeof order.total_amount === 'number') {
      return acc + order.total_amount;
    }
    if (typeof order.total_cents === 'number') {
      return acc + order.total_cents / 100;
    }
    return acc;
  }, 0);

  const pricing = parsePricingTiers(event.photo_prices);
  const currency = extractCurrency(event.settings) ?? 'USD';

  return {
    event,
    stats: { photos, subjects, orders, revenue },
    pricing,
    currency,
  };
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const merged = new URLSearchParams();
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (resolvedSearchParams) {
    for (const [key, rawValue] of Object.entries(resolvedSearchParams)) {
      const value = firstValue(rawValue);
      if (value) {
        merged.set(key, value);
      }
    }
  }

  const eventId = resolvedParams.id;

  if (!eventId) {
    notFound();
  }

  merged.set('eventId', eventId);
  merged.set('event_id', eventId);

  const levelId = merged.get('levelId') ?? merged.get('level_id');
  const courseId = merged.get('courseId') ?? merged.get('course_id');
  const folderCandidate = levelId || courseId;
  if (folderCandidate) {
    merged.set('folderId', folderCandidate);
    merged.set('folder_id', folderCandidate);
  }

  alignParam(merged, 'folderId', 'folder_id');
  alignParam(merged, 'studentId', 'student_id');
  alignParam(merged, 'codeId', 'code_id');
  alignParam(merged, 'subjectId', 'subject_id');
  alignParam(merged, 'view', 'view');

  const includeChildren =
    merged.get('includeChildren') ?? merged.get('include_children');
  if (includeChildren) {
    setIfPresent(merged, 'includeChildren', includeChildren);
    setIfPresent(merged, 'include_children', includeChildren);
  }

  const shouldAutoRedirect =
    merged.get('redirect') === '1' ||
    merged.get('auto') === 'view' ||
    merged.get('view') === 'gallery';

  const qs = merged.toString();
  const galleryHref = `/admin/photos${qs ? `?${qs}` : ''}`;

  if (shouldAutoRedirect) {
    redirect(galleryHref);
  }

  const [{ event, stats, pricing, currency }, shareUrl] = await Promise.all([
    fetchEventContext(eventId),
    absoluteUrl(galleryHref),
  ]);

  if (!event) {
    notFound();
  }

  const statusBadge = resolveStatusBadge(event);
  const basePrice = toNumber(event.price_per_photo);

  const details = [
    { label: 'Fecha', value: formatDateRange(event) },
    {
      label: 'Ubicación',
      value: event.location ?? event.school_name ?? 'Sin ubicación definida',
    },
    {
      label: 'Tarifa base',
      value:
        basePrice !== null
          ? formatCurrency(basePrice, currency)
          : 'Define la tarifa por foto',
    },
  ];

  const heroMetrics = [
    { label: 'Fotos subidas', value: formatNumber(stats.photos) },
    { label: 'Sujetos etiquetados', value: formatNumber(stats.subjects) },
    { label: 'Pedidos confirmados', value: formatNumber(stats.orders) },
    {
      label: 'Ingresos generados',
      value:
        stats.revenue > 0
          ? formatCurrency(stats.revenue, currency)
          : 'Sin ventas aún',
    },
  ];

  const valueProps = [
    {
      title: 'Entrega premium',
      detail: `${formatNumber(stats.photos)} fotos listas`,
      description:
        'Hero minimalista, formatos optimizados y branding por cliente para impresionar desde el primer scroll.',
    },
    {
      title: 'Experiencia guiada',
      detail: `${formatNumber(stats.subjects)} familias conectadas`,
      description:
        'Filtrado por carpetas y códigos QR listos para compartir en cualquier tipo de evento.',
    },
    {
      title: 'Negocio claro',
      detail:
        stats.revenue > 0
          ? formatCurrency(stats.revenue, currency)
          : `${formatNumber(stats.orders)} pedidos preparados`,
      description:
        'Controla precios, seguimiento y métricas sin salir de la misma vista.',
    },
  ];

  const mockups = [
    {
      title: 'Landing responsive',
      caption:
        'Hero limpio con CTA directo y copy breve. Ideal para bodas, corporativos o graduaciones.',
      gradient: 'from-[#1f2a44] via-[#334772] to-[#62e2a2]',
    },
    {
      title: 'Selector inteligente',
      caption:
        'Carpetas por público con fotografías destacadas y chips filtrables.',
      gradient: 'from-[#62e2a2] via-[#85e9bb] to-[#f5f7fa]',
    },
    {
      title: 'Checkout sin fricción',
      caption:
        'Resumen claro de paquetes y upsells listo para convertir en segundos.',
      gradient: 'from-[#f5f7fa] via-[#d0d5dd] to-[#1f2a44]',
    },
  ];

  const pricingBadges = pricing.slice(0, 3);

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-[#101828]">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6 py-12 lg:px-8">
        <section className="overflow-hidden rounded-[32px] bg-[#1f2a44] px-8 py-12 text-white shadow-[0_40px_90px_-40px_rgba(16,24,40,0.72)] sm:px-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-6">
              <span
                className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
              <h1 className="text-4xl font-semibold leading-[1.08] md:text-5xl">
                {event.name ?? 'Evento sin título'}
              </h1>
              <p className="max-w-xl text-lg text-white/75">
                Prepara la experiencia white label con una presentación limpia que
                puedes reutilizar en cada nuevo cliente tipo Pixieset.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row lg:items-center">
              <Button asChild variant="modern" modernTone="primary" size="lg">
                <Link href={galleryHref} prefetch={false}>
                  Ver galería en vivo
                </Link>
              </Button>
              <Button asChild variant="modern" modernTone="ghost" size="lg">
                <Link href="/admin/events" prefetch={false}>
                  Volver al panel
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="rounded-2xl bg-white/18 px-6 py-5 text-white/90 backdrop-blur-sm"
              >
                <p className="text-sm text-white/80">{detail.label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{detail.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {heroMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-white/18 bg-white/10 px-5 py-4 backdrop-blur"
              >
                <p className="text-xs uppercase tracking-wide text-white/70">
                  {metric.label}
                </p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeader
            eyebrow="Qué obtienen"
            title="Entrega premium en cada paso"
            description="El nuevo layout replica el estilo Pixieset: hero minimalista, valores claros y una galería inspiradora para convencer a cada cliente que invite a la plataforma."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {valueProps.map((item) => (
              <Card
                key={item.title}
                variant="modern"
                className="h-full border-[#ebeef2] bg-white/95"
              >
                <CardContent className="flex h-full flex-col gap-6 p-8">
                  <span className="text-sm font-medium uppercase tracking-wide text-[#62e2a2]">
                    {item.detail}
                  </span>
                  <div className="space-y-3">
                    <CardTitle className="text-xl font-semibold">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-[#475467]">
                      {item.description}
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_1.1fr]">
          <div className="space-y-6">
            <SectionHeader
              title="Galería de ejemplos"
              description="Integra mockups listos para mostrar la experiencia final. Usa gradientes suaves, sombras controladas y titulares cortos para simular la versión final que verá el cliente."
            />
            <div className="flex flex-wrap gap-3">
              {pricingBadges.length > 0 ? (
                pricingBadges.map((tier) => (
                  <span
                    key={tier.name}
                    className="inline-flex items-center rounded-full bg-[#e6f9ef] px-4 py-2 text-sm font-medium text-[#0b3d2a]"
                  >
                    {tier.name} · {formatCurrency(tier.price, currency)}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[#475467]">
                  Define tus paquetes para mostrarlos aquí.
                </span>
              )}
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mockups.map((mockup) => (
              <div
                key={mockup.title}
                className={`relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-3xl bg-gradient-to-br ${mockup.gradient} p-6 text-white shadow-[0_28px_56px_-30px_rgba(16,24,40,0.45)]`}
              >
                <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Mockup
                </span>
                <h3 className="mt-2 text-xl font-semibold leading-tight">
                  {mockup.title}
                </h3>
                <p className="mt-3 text-sm text-white/80">{mockup.caption}</p>
              </div>
            ))}
          </div>
        </section>

        <Card variant="modern" modernTone="tinted" className="border-[#ebeef2]">
          <CardHeader className="flex flex-col gap-2 px-8 pt-8 pb-4">
            <CardTitle className="text-2xl font-semibold">
              Equipo y contacto
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm text-[#475467]">
              Mantén visible quién lidera el evento para acelerar cualquier
              ajuste de branding o comunicación con el cliente final.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6 px-8 pb-8">
            <div className="min-w-[220px] rounded-2xl bg-[#f8fafc] px-5 py-4">
              <p className="text-xs uppercase tracking-wide text-[#475467]">
                Fotógrafo
              </p>
              <p className="mt-2 text-base font-semibold text-[#101828]">
                {event.photographer_name ?? 'Asignar responsable'}
              </p>
              <p className="text-sm text-[#475467]">
                {event.photographer_email ?? 'email@tucliente.com'}
              </p>
              <p className="text-sm text-[#475467]">
                {event.photographer_phone ?? 'Teléfono pendiente'}
              </p>
            </div>
            <div className="flex min-w-[220px] flex-1 flex-col justify-center gap-2 rounded-2xl border border-[#d0d5dd] bg-white px-5 py-4">
              <p className="text-xs uppercase tracking-wide text-[#475467]">
                Branding sugerido
              </p>
              <p className="text-sm text-[#475467]">
                Usa el logo del cliente sobre fondo marfil (`#f5f7fa`) y CTA
                menta para mantener coherencia con la guía visual.
              </p>
            </div>
          </CardContent>
        </Card>

        <section className="rounded-[28px] bg-white px-8 py-10 shadow-[0_32px_64px_-32px_rgba(16,24,40,0.18)]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <SectionHeader
              title="CTA final · comparte el preview"
              description="Envía a tu cliente un link listo para revisar la galería o duplicar este layout para su propio subdominio."
            />
            <div className="w-full max-w-lg space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1f2a44]">
                  Link público del evento
                </label>
                <Input
                  appearance="modern"
                  readOnly
                  value={shareUrl}
                  className="font-mono text-sm bg-white/95"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  variant="modern"
                  modernTone="primary"
                  size="lg"
                  className="w-full sm:flex-1"
                >
                  <Link href={galleryHref} prefetch={false}>
                    Abrir galería
                  </Link>
                </Button>
                <Button
                  variant="modern"
                  modernTone="secondary"
                  size="lg"
                  className="w-full sm:flex-1"
                  disabled
                >
                  Compartir vía WhatsApp (pronto)
                </Button>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-[#d0d5dd] pt-6 text-sm text-[#475467] md:flex-row md:items-center md:justify-between">
          <span>LookEscolar · Modernización white label 2025</span>
          <div className="flex gap-6">
            <Link href="/docs" className="hover:text-[#1f2a44]">
              Documentación del nuevo estilo
            </Link>
            <a
              href="mailto:equipo@lookescolar.com"
              className="hover:text-[#1f2a44]"
            >
              Feedback de clientes
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

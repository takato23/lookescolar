import { AdminEvent } from './types';

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const currencyCache = new Map<string, Intl.NumberFormat>();

export const formatEventDate = (
  dateString?: string | null,
  locale = 'es-AR'
): string => {
  if (!dateString) return 'Sin fecha';
  try {
    const key = `${locale}:full`;
    if (!formatterCache.has(key)) {
      formatterCache.set(
        key,
        new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    }
    return formatterCache.get(key)!.format(new Date(dateString));
  } catch (error) {
    console.error('Failed to format event date', error);
    return 'Fecha inválida';
  }
};

export const formatEventCurrency = (
  value?: number | null,
  { locale = 'es-AR', currency = 'ARS' } = {}
): string => {
  const amount = Number.isFinite(value ?? NaN) ? Number(value) : 0;
  const cacheKey = `${locale}:${currency}`;

  if (!currencyCache.has(cacheKey)) {
    currencyCache.set(
      cacheKey,
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    );
  }

  return currencyCache.get(cacheKey)!.format(amount);
};

export const getEventDisplayName = (event: AdminEvent): string => {
  return (
    event.school?.trim() ||
    event.name?.trim() ||
    event.location?.trim() ||
    'Evento sin nombre'
  );
};

export const getEventInitials = (event: AdminEvent): string => {
  const displayName = getEventDisplayName(event);
  const words = displayName.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'EV';
  const initials = words.slice(0, 2).map((word) => word[0]!.toUpperCase());
  return initials.join('');
};

export const resolveEventThumbnail = (event: AdminEvent): string | null => {
  const candidates = [
    event.thumbnailUrl,
    event.thumbnail_url,
    event.coverUrl,
    event.cover_url,
    event.coverPhotoUrl,
    event.cover_photo_url,
    event.previewUrl,
    event.preview_url,
    event.featuredPhotoUrl,
    event.featured_photo_url,
    event.heroImageUrl,
    event.hero_image_url,
    event.primary_photo_url,
    event.posterUrl,
    event.poster_url,
  ];

  return candidates.find((candidate) => !!candidate && typeof candidate === 'string') ?? null;
};

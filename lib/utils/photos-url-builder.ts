/**
 * Helper to build photos API URL with required event_id
 * This ensures we never call /api/admin/photos without event_id
 */
export function buildPhotosUrl({
  eventId,
  codeId,
  limit = 100,
  offset = 0,
  approved,
  tagged,
  search,
}: {
  eventId: string;
  codeId?: string | 'null' | null;
  limit?: number;
  offset?: number;
  approved?: boolean;
  tagged?: boolean;
  search?: string;
}): string {
  // Always require eventId
  if (!eventId) {
    throw new Error('buildPhotosUrl requires eventId');
  }

  const params = new URLSearchParams();

  // Always add event_id
  params.append('event_id', eventId);

  // Add code_id if provided
  // 'null' string means "Sin carpeta" (unassigned photos)
  if (codeId === 'null' || codeId === null) {
    params.append('code_id', 'null');
  } else if (codeId) {
    params.append('code_id', codeId);
  }

  // Add pagination
  params.append('limit', limit.toString());
  if (offset > 0) {
    params.append('offset', offset.toString());
  }

  // Add optional filters
  if (approved !== undefined) {
    params.append('approved', approved.toString());
  }
  if (tagged !== undefined) {
    params.append('tagged', tagged.toString());
  }
  if (search) {
    params.append('search', search);
  }

  const url = `/api/admin/photos?${params.toString()}`;

  // Debug in development
  if (process.env.NODE_ENV === 'development') {
    console.debug('[photos] URL built:', url);
  }

  return url;
}

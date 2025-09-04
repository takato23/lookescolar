export function computePhotoAdminUrl(
  eventId: string,
  folderId?: string,
  includeChildren = true
) {
  // Route to the event-centric library with optional folder context
  const params = new URLSearchParams();
  if (folderId) params.set('folderId', folderId);
  if (includeChildren) params.set('include_children', 'true');
  const qs = params.toString();
  return `/admin/events/${eventId}/library${qs ? `?${qs}` : ''}`;
}

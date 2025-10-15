export function computePhotoAdminUrl(
  eventId: string,
  folderId?: string,
  includeChildren = true
) {
  // Route callers to the unified PhotoAdmin experience with backwards compatible filters
  const params = new URLSearchParams();

  if (eventId) {
    params.set('eventId', eventId);
    params.set('event_id', eventId);
  }

  if (folderId) {
    params.set('folderId', folderId);
    params.set('folder_id', folderId);
  }

  // Preserve legacy include_children filter but also expose camelCase variant
  if (includeChildren) {
    params.set('include_children', 'true');
    params.set('includeChildren', 'true');
  }

  const qs = params.toString();
  return `/admin/photos${qs ? `?${qs}` : ''}`;
}

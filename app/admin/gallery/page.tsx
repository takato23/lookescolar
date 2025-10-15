import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function alignParam(params: URLSearchParams, canonical: string, legacy: string) {
  const value = params.get(canonical) ?? params.get(legacy);
  if (!value) return;
  params.set(canonical, value);
  params.set(legacy, value);
}

export default function UnifiedGalleryRedirect({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const merged = new URLSearchParams();

  if (searchParams) {
    for (const [key, rawValue] of Object.entries(searchParams)) {
      const value = firstValue(rawValue);
      if (value) {
        merged.set(key, value);
      }
    }
  }

  // Map existing filters to the unified PhotoAdmin casing
  const eventId = merged.get('eventId') ?? merged.get('event_id');
  if (eventId) {
    merged.set('eventId', eventId);
    merged.set('event_id', eventId);
  }

  const folderFallback =
    merged.get('folderId') ??
    merged.get('folder_id') ??
    merged.get('levelId') ??
    merged.get('level_id') ??
    merged.get('courseId') ??
    merged.get('course_id');

  if (folderFallback) {
    merged.set('folderId', folderFallback);
    merged.set('folder_id', folderFallback);
  }

  alignParam(merged, 'studentId', 'student_id');
  alignParam(merged, 'codeId', 'code_id');
  alignParam(merged, 'subjectId', 'subject_id');

  const qs = merged.toString();
  redirect(`/admin/photos${qs ? `?${qs}` : ''}`);
}

import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

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

export default function EventDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: SearchParams;
}) {
  const merged = new URLSearchParams();

  // Preserve any incoming filters to avoid breaking deep links
  if (searchParams) {
    for (const [key, rawValue] of Object.entries(searchParams)) {
      const value = firstValue(rawValue);
      if (value) {
        merged.set(key, value);
      }
    }
  }

  const eventId = params.id;
  if (eventId) {
    merged.set('eventId', eventId);
    merged.set('event_id', eventId);
  }

  // Normalize legacy course/level parameters into folder filters
  const levelId = merged.get('levelId') ?? merged.get('level_id');
  const courseId = merged.get('courseId') ?? merged.get('course_id');
  const folderCandidate = levelId || courseId;
  if (folderCandidate) {
    merged.set('folderId', folderCandidate);
    merged.set('folder_id', folderCandidate);
  }

  // Ensure we expose both camelCase and snake_case keys for known filters
  alignParam(merged, 'folderId', 'folder_id');
  alignParam(merged, 'studentId', 'student_id');
  alignParam(merged, 'codeId', 'code_id');
  alignParam(merged, 'subjectId', 'subject_id');
  alignParam(merged, 'view', 'view');

  // Preserve includeChildren flag using both naming conventions
  const includeChildren = merged.get('includeChildren') ?? merged.get('include_children');
  if (includeChildren) {
    setIfPresent(merged, 'includeChildren', includeChildren);
    setIfPresent(merged, 'include_children', includeChildren);
  }

  const qs = merged.toString();
  redirect(`/admin/photos${qs ? `?${qs}` : ''}`);
}

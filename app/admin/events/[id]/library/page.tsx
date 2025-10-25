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

export default async function EventLibraryPage({
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
  if (eventId) {
    merged.set('eventId', eventId);
    merged.set('event_id', eventId);
  }

  // Normalize folder filters coming from legacy level/course parameters
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

  const qs = merged.toString();
  redirect(`/admin/photos${qs ? `?${qs}` : ''}`);
}

export const metadata = {
  title: 'Gestión de Fotos del Evento',
  description: 'Gestionar fotos, carpetas y organización del evento',
};

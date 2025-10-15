import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export default function PhotosOptimizedRedirect({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const merged = new URLSearchParams();

  if (searchParams) {
    for (const [key, rawValue] of Object.entries(searchParams)) {
      const value = firstValue(rawValue);
      if (value) merged.set(key, value);
    }
  }

  // Help debugging legacy bookmarks from optimized view
  if (!merged.has('legacyView')) {
    merged.set('legacyView', 'photos-optimized');
  }

  const qs = merged.toString();
  redirect(`/admin/photos${qs ? `?${qs}` : ''}`);
}

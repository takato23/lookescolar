import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export const dynamic = 'force-dynamic';

export default async function PhotosSimpleRedirect({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const merged = new URLSearchParams();

  if (resolvedSearchParams) {
    for (const [key, rawValue] of Object.entries(resolvedSearchParams)) {
      const value = firstValue(rawValue);
      if (value) merged.set(key, value);
    }
  }

  if (!merged.has('legacyView')) {
    merged.set('legacyView', 'photos-simple');
  }

  const qs = merged.toString();
  redirect(`/admin/photos${qs ? `?${qs}` : ''}`);
}

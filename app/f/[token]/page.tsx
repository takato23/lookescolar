import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams?: Promise<SearchParams> | SearchParams;
}

function buildRedirectUrl(token: string, searchParams: SearchParams) {
  const queryString = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((v) => queryString.append(key, v));
    } else {
      queryString.append(key, value);
    }
  });

  const qs = queryString.toString();
  return qs ? `/store-unified/${token}?${qs}` : `/store-unified/${token}`;
}

export default async function FamilyPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const resolvedSearchParams =
    searchParams && typeof (searchParams as any).then === 'function'
      ? await (searchParams as Promise<SearchParams>)
      : (searchParams ?? {});

  redirect(buildRedirectUrl(token, resolvedSearchParams));
}

import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

interface ShareGalleryResponse {
  success: boolean;
  gallery?: {
    token: { shareType: string; allowDownload: boolean; allowComments: boolean; expiresAt: string | null };
    eventId: string;
    items: Array<{
      id: string;
      filename: string;
      preview_url: string;
      created_at: string;
      size: number | null;
      mime: string | null;
      folder_id: string;
    }>;
    pagination?: { page: number; limit: number; total: number; total_pages: number; has_more: boolean };
    eventName?: string | null;
  };
  error?: string;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export default async function ShareStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const { token } = await params;
  const resolvedSearchParams =
    searchParams && typeof (searchParams as any).then === 'function'
      ? await (searchParams as Promise<SearchParams>)
      : (searchParams ?? {});

  redirect(buildRedirectUrl(token, resolvedSearchParams));
}

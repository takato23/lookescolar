import { absoluteUrl } from '@/lib/absoluteUrl';
import ShareGalleryClient from '@/components/public/ShareGalleryPageClient';

interface GalleryAssetPayload {
  id: string;
  filename: string;
  previewUrl: string | null;
  signedUrl: string | null;
  downloadUrl: string | null;
  createdAt: string | null;
  size: number | null;
  mimeType: string | null;
  folderId: string | null;
  type: string | null;
}

interface GalleryPaginationPayload {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface GalleryApiPayload {
  token: {
    token: string;
    accessType: string;
    isLegacy: boolean;
    isActive: boolean;
    expiresAt: string | null;
    maxViews: number | null;
    viewCount: number;
  };
  event: { id: string; name: string } | null;
  share?: {
    shareType: string;
    allowDownload: boolean;
    allowComments: boolean;
    metadata: Record<string, any>;
  };
  items: GalleryAssetPayload[];
  pagination: GalleryPaginationPayload;
  rateLimit: {
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter: number;
  };
}

interface LegacyGalleryPayload {
  eventName?: string | null;
  items?: Array<{
    id: string;
    preview_url?: string | null;
  }>;
}

interface ShareGalleryResponse {
  success: boolean;
  gallery?: GalleryApiPayload;
  legacy?: LegacyGalleryPayload;
  error?: string;
}

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;
  try {
    const { absoluteUrl } = await import('@/lib/absoluteUrl');
    const apiUrl = absoluteUrl(`/api/public/share/${token}/gallery?page=1&limit=1`);
    const res = await fetch(apiUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('fetch failed');
    const data = (await res.json()) as ShareGalleryResponse;
    if (!data?.success) return {};

    const gallery = data.gallery;
    const legacy = data.legacy;

    const titleSource = gallery?.event?.name || legacy?.eventName;
    const firstPreview =
      gallery?.items?.[0]?.previewUrl || legacy?.items?.[0]?.preview_url;

    const title = titleSource
      ? `${titleSource} · Galería`
      : 'Galería de fotos';
    const description = 'Fotos compartidas con LookEscolar';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: firstPreview ? [{ url: firstPreview }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: firstPreview ? [firstPreview] : undefined,
      },
      robots: {
        index: false,
        follow: false,
        nocache: true,
        noarchive: true,
        nosnippet: true,
      },
    } as any;
  } catch {
    return {
      robots: {
        index: false,
        follow: false,
      },
    } as any;
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SharePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { page?: string; limit?: string };
}) {
  const { token } = params;
  const sp = searchParams;
  const page = Math.max(1, parseInt(sp?.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(sp?.limit || '60', 10)));

  const apiUrl = absoluteUrl(
    `/api/public/share/${token}/gallery?page=${page}&limit=${limit}`
  );
  const res = await fetch(apiUrl, { cache: 'no-store' });
  const data = (await res.json()) as ShareGalleryResponse;

  if (!res.ok || !data.success || !data.gallery) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-red-800">
            Enlace inválido o expirado
          </h1>
          <p className="mt-2 text-sm text-red-700">
            No se pudo acceder a la galería compartida.
          </p>
        </div>
      </div>
    );
  }

  return <ShareGalleryClient token={token} initial={data.gallery} />;
}

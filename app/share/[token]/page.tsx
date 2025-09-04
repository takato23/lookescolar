import { absoluteUrl } from '@/lib/absoluteUrl';
import ShareGalleryClient from '@/components/public/ShareGalleryPageClient';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const apiUrl = await (await import('@/lib/absoluteUrl')).absoluteUrl(
      `/api/public/share/${token}/gallery?page=1&limit=1`
    );
    const res = await fetch(apiUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    if (!data?.success || !data.gallery) return {};
    const title = data.gallery.eventName
      ? `${data.gallery.eventName} · Galería`
      : 'Galería de fotos';
    const description = 'Fotos compartidas con LookEscolar';
    const img = data.gallery.items?.[0]?.preview_url;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: img ? [{ url: img }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: img ? [img] : undefined,
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
  };
  error?: string;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SharePage({ params, searchParams }: { params: Promise<{ token: string }>, searchParams: Promise<{ page?: string, limit?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(sp?.limit || '60')));

  // Fetch initial gallery page from public API
  const apiUrl = await absoluteUrl(`/api/public/share/${token}/gallery?page=${page}&limit=${limit}`);
  const res = await fetch(apiUrl, { cache: 'no-store' });
  const data = (await res.json()) as ShareGalleryResponse;

  if (!res.ok || !data.success || !data.gallery) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-red-800">Enlace inválido o expirado</h1>
          <p className="mt-2 text-sm text-red-700">No se pudo acceder a la galería compartida.</p>
        </div>
      </div>
    );
  }

  return (
    <ShareGalleryClient token={token} initial={data.gallery} />
  );
}

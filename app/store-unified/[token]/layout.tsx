import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/absoluteUrl';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  try {
    const url = await absoluteUrl(`/api/store/${token}?include_assets=true&limit=1`);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return {};
    const data = await res.json();
    const title = data?.event?.name ? `${data.event.name} · Tienda` : 'Tienda de fotos';
    const description = 'Elegí tu álbum, seleccioná tus fotos y pagá de forma segura.';
    const img = data?.assets?.[0]?.preview_url || data?.assets?.[0]?.watermark_url;
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
    };
  } catch {
    return {};
  }
}

export default function StoreUnifiedLayout({ children }: { children: React.ReactNode }) {
  // Minimal wrapper (page is client)
  return <>{children}</>;
}


import { redirect } from 'next/navigation';

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

export default async function ShareStorePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/store-unified/${token}`);
}

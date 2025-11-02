import { redirect } from 'next/navigation';

interface SharedGalleryPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function SharedGalleryPage({ params }: SharedGalleryPageProps) {
  const { token } = await params;
  // Canonical public gallery route
  redirect(`/share/${token}`);
}

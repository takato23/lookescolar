import SharedGallery from '@/components/public/shared-gallery';
import { notFound } from 'next/navigation';

interface SharedGalleryPageProps {
  params: {
    token: string;
  };
}

export default async function SharedGalleryPage({ params }: SharedGalleryPageProps) {
  const { token } = await params;
  
  // Validate token format
  if (!token || token.length !== 32) {
    notFound();
  }
  
  return (
    <div className="min-h-screen bg-background">
      <SharedGallery token={token} />
    </div>
  );
}
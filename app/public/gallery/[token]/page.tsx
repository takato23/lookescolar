'use client';

import SharedGallery from '@/components/public/shared-gallery';
import { notFound } from 'next/navigation';

interface SharedGalleryPageProps {
  params: {
    token: string;
  };
}

export default function SharedGalleryPage({ params }: SharedGalleryPageProps) {
  const { token } = params;
  
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
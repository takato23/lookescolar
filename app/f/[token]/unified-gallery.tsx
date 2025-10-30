'use client';

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues
const UnifiedGalleryPage = dynamic(
  () => import('@/components/gallery/UnifiedGalleryPage'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    ),
  }
);

export default function UnifiedGallery() {
  const params = useParams();
  const token = params?.token as string;

  return <UnifiedGalleryPage token={token} />;
}

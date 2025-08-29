'use client';

import { useParams } from 'next/navigation';
import UnifiedGalleryPage from '@/components/gallery/UnifiedGalleryPage';

export default function UnifiedGallery() {
  const params = useParams();
  const token = params?.token as string;

  return <UnifiedGalleryPage token={token} />;
}

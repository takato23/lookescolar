'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params['id'] as string;

  useEffect(() => {
    // Redirect to the 3-column file browser view
    if (id) {
      router.replace(`/admin/events/${id}/library`);
    }
  }, [id, router]);

  // Show loading while redirecting
  return (
    <div className="gradient-mesh min-h-screen">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <span className="ml-2 text-lg">Cargando gestión de fotos...</span>
        </div>
      </div>
    </div>
  );
}

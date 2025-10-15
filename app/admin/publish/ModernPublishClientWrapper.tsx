'use client';

import dynamic from 'next/dynamic';

const ModernPublishClient = dynamic(() => import('./ModernPublishClient'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-screen">Cargando...</div>
});

interface ModernPublishClientWrapperProps {
  initialSelectedEventId?: string;
  initialData?: {
    folders: any[];
    event: { id: string; name: string; date?: string } | null;
  };
}

export default function ModernPublishClientWrapper(props: ModernPublishClientWrapperProps) {
  return <ModernPublishClient {...props} />;
}
'use client';

import { useStoreSettings } from '@/lib/hooks/useStoreSettings';
import PixiesetTemplate from './templates/PixiesetTemplate';
import EditorialTemplate from './templates/EditorialTemplate';

interface StoreRendererProps {
  eventId?: string;
  token?: string;
  photos?: Array<{ id: string; filename: string; preview_url: string }>;
}

export default function StoreRenderer({ eventId, token, photos = [] }: StoreRendererProps) {
  const { settings, loading } = useStoreSettings();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tienda...</p>
        </div>
      </div>
    );
  }

  if (!settings.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tienda no disponible</h1>
          <p className="text-gray-600">La tienda está temporalmente deshabilitada.</p>
        </div>
      </div>
    );
  }

  const renderTemplate = () => {
    switch (settings.template) {
      case 'editorial':
        return <EditorialTemplate settings={settings} photos={photos} />;
      case 'minimal':
        return <PixiesetTemplate settings={settings} photos={photos} />;
      case 'pixieset':
      default:
        return <PixiesetTemplate settings={settings} photos={photos} />;
    }
  };

  return renderTemplate();
}
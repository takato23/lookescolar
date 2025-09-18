'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PixiesetFlowTemplate } from '@/components/store/templates/PixiesetFlowTemplate';
import { GUARANTEED_SETTINGS } from '@/lib/services/store-initialization.service';
import { ThemeToggleSimple } from '@/components/ui/theme-toggle-enhanced';
import { useTheme } from '@/components/providers/theme-provider';

interface Photo {
  id: string;
  url: string;
  preview_url?: string;
  alt: string;
  student?: string;
  subject?: string;
}

interface StoreData {
  store?: {
    name: string;
  };
  event?: {
    name: string;
  };
  assets?: any[];
  subject?: {
    name: string;
    course?: string;
  };
}

export default function UnifiedStorePage() {
  const params = useParams();
  const token = params.token as string;
  const { resolvedTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchStoreData();
  }, [token]);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      
      // Cargar configuración pública de la tienda (con precios reales)
      const configResponse = await fetch('/api/public/store/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      let realSettings: any = null;
      if (configResponse.ok) {
        const configData = await configResponse.json();
        if (configData.success && configData.settings) {
          realSettings = configData.settings;
        }
      }
      
      // Cargar datos de la tienda y assets
      const storeResponse = await fetch(`/api/store/${token}?include_assets=true&limit=100`);
      if (!storeResponse.ok) {
        throw new Error('Error al cargar la tienda');
      }
      
      const data = await storeResponse.json();
      setStoreData(data);

      // Convertir assets a photos para el componente
      const convertedPhotos: Photo[] = (data.assets || []).map((asset: any) => ({
        id: asset.id,
        url: asset.url,
        preview_url: asset.preview_url || asset.watermark_url,
        alt: `Foto ${asset.filename || asset.id}`,
        student: asset.tagged_students?.[0] || '',
        subject: data.subject?.name || ''
      }));
      setPhotos(convertedPhotos);

      // 🔧 USAR CONFIGURACIÓN SIMPLE Y SEGURA (sin async en client)
      console.log('🔍 Configuración recibida de API:', realSettings);
      
      // Merge simple sin dependencias externas
      const finalSettings = {
        ...GUARANTEED_SETTINGS,
        ...realSettings,
        template: 'pixieset' as const,
        texts: {
          ...GUARANTEED_SETTINGS.texts,
          ...(realSettings?.texts || {}),
          hero_title: data.store?.name || data.event?.name || GUARANTEED_SETTINGS.texts.hero_title,
          hero_subtitle: 'Galería Fotográfica Escolar'
        },
        // Asegurar productos - merge manteniendo ambos sistemas de nombres
        products: {
          ...GUARANTEED_SETTINGS.products,
          ...(realSettings?.products || {})
        }
      };
      
      console.log('✅ Configuración final segura:', {
        enabled: finalSettings.enabled,
        template: finalSettings.template,
        productCount: Object.keys(finalSettings.products).length,
        hasOpcionA: !!finalSettings.products.opcionA,
        hasOpcionB: !!finalSettings.products.opcionB,
        hasCarpetaA: !!finalSettings.products.carpetaA,
        hasCarpetaB: !!finalSettings.products.carpetaB
      });

      setSettings(finalSettings);

    } catch (error) {
      console.error('Error loading store:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando galería...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center transition-colors duration-300">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="absolute top-4 right-4">
            <ThemeToggleSimple />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
          <p className="text-destructive mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg transition-colors duration-200 font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!settings || photos.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center transition-colors duration-300">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="absolute top-4 right-4">
            <ThemeToggleSimple />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Galería no disponible</h1>
          <p className="text-muted-foreground">No se encontraron fotos en esta galería.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Theme Toggle - Fixed position for all states */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggleSimple />
      </div>

      <PixiesetFlowTemplate
        settings={settings}
        photos={photos}
        token={token}
        subject={storeData?.subject}
        totalPhotos={photos.length}
        isPreselected={false}
      />
    </div>
  );
}

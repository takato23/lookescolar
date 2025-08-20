'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { fetchPhotosSimple } from '@/lib/utils/photos-url-builder-simple';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCwIcon, CheckCircleIcon, ImageIcon } from 'lucide-react';
import Link from 'next/link';

interface SimplePhoto {
  id: string;
  filename: string;
  created_at: string;
}

export default function PhotosSimplePage() {
  const [photos, setPhotos] = useState<SimplePhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔧 Loading photos with simple endpoint...');
      const result = await fetchPhotosSimple(10);
      
      if (result.success) {
        setPhotos(result.photos);
        toast.success(`✅ Cargadas ${result.photos.length} fotos exitosamente!`);
        console.log('🔧 SUCCESS:', result.photos);
      } else {
        throw new Error('Failed to fetch photos');
      }
    } catch (error: any) {
      console.error('🔧 ERROR:', error);
      setError(error.message);
      toast.error('❌ Error al cargar fotos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Volver al Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={loadPhotos}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          🔧 Fotos (Modo Simple)
        </h1>
        <p className="text-muted-foreground">
          Endpoint ultra-simple para evitar errores de memoria. Máximo 10 fotos.
        </p>
      </div>

      {/* Status */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <div className="text-red-800">
            ❌ <strong>Error:</strong> {error}
          </div>
        </Card>
      )}

      {!error && photos.length > 0 && (
        <Card className="p-4 mb-6 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircleIcon className="h-5 w-5" />
            <strong>¡Éxito!</strong> Se cargaron {photos.length} fotos correctamente.
          </div>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCwIcon className="h-8 w-8 animate-spin text-muted-foreground mr-3" />
          <span className="text-muted-foreground">Cargando fotos...</span>
        </div>
      )}

      {/* Photos List */}
      {!loading && photos.length > 0 && (
        <div className="space-y-3">
          {photos.map((photo) => (
            <Card key={photo.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {photo.filename}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ID: {photo.id}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Fecha: {new Date(photo.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && photos.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No hay fotos disponibles
          </h3>
          <p className="text-muted-foreground mb-4">
            No se encontraron fotos en la base de datos.
          </p>
          <Button onClick={loadPhotos} variant="outline">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Intentar de nuevo
          </Button>
        </div>
      )}

      {/* Debug info */}
      <Card className="mt-8 p-4 bg-gray-50">
        <div className="text-sm text-muted-foreground">
          <div><strong>Endpoint:</strong> /api/admin/photos-simple</div>
          <div><strong>Estado:</strong> {loading ? 'Cargando...' : error ? '❌ Error' : '✅ OK'}</div>
          <div><strong>Fotos cargadas:</strong> {photos.length}</div>
          <div><strong>Última actualización:</strong> {new Date().toLocaleString()}</div>
        </div>
      </Card>
    </div>
  );
}
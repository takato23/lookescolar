'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCwIcon, CheckCircleIcon, ImageIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';

interface OptimizedPhoto {
  id: string;
  event_id: string;
  original_filename: string;
  preview_url?: string | null;
  approved: boolean;
  created_at: string;
  file_size?: number | null;
  width?: number | null;
  height?: number | null;
}

interface PhotosResponse {
  success: boolean;
  photos: OptimizedPhoto[];
  counts: { total: number };
  _performance?: {
    query_duration_ms: number;
    total_duration_ms: number;
  };
}

export default function PhotosOptimizedPage() {
  const [photos, setPhotos] = useState<OptimizedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [performance, setPerformance] = useState<{ query_ms: number; total_ms: number } | null>(null);
  
  const photosPerPage = 24; // Reasonable batch size to avoid OOM

  const loadPhotos = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔧 Loading photos page ${page} (optimized endpoint)...`);
      
      // Use main photos endpoint with pagination
      const url = `/api/admin/photos?page=${page}&limit=${photosPerPage}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data: PhotosResponse = await response.json();
      
      if (data.success) {
        setPhotos(data.photos);
        setTotalPhotos(data.counts.total);
        setCurrentPage(page);
        
        if (data._performance) {
          setPerformance({
            query_ms: data._performance.query_duration_ms,
            total_ms: data._performance.total_duration_ms
          });
        }
        
        toast.success(`✅ Página ${page} cargada: ${data.photos.length} de ${data.counts.total} fotos totales!`);
        console.log('🔧 SUCCESS:', { 
          page, 
          loaded: data.photos.length, 
          total: data.counts.total,
          performance: data._performance 
        });
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

  const nextPage = () => {
    const maxPage = Math.ceil(totalPhotos / photosPerPage);
    if (currentPage < maxPage) {
      loadPhotos(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      loadPhotos(currentPage - 1);
    }
  };

  useEffect(() => {
    loadPhotos(1);
  }, []);

  const totalPages = Math.ceil(totalPhotos / photosPerPage);
  const startPhoto = (currentPage - 1) * photosPerPage + 1;
  const endPhoto = Math.min(currentPage * photosPerPage, totalPhotos);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-foreground"
          >
            ← Volver al Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => loadPhotos(currentPage)}
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
          📸 Fotos (Optimizado)
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Sistema optimizado con paginación para evitar errores de memoria. Carga {photosPerPage} fotos por página.
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
            <strong>¡Éxito!</strong> Página {currentPage} de {totalPages} cargada.
            {performance && (
              <span className="text-xs ml-2">
                (Query: {performance.query_ms}ms, Total: {performance.total_ms}ms)
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Pagination Info */}
      {totalPhotos > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {startPhoto}-{endPhoto} de {totalPhotos} fotos
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={prevPage}
              disabled={loading || currentPage <= 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm px-3">
              {currentPage} de {totalPages}
            </span>
            <Button
              onClick={nextPage}
              disabled={loading || currentPage >= totalPages}
              variant="outline"
              size="sm"
            >
              Siguiente
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCwIcon className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400 mr-3" />
          <span className="text-gray-500 dark:text-gray-400">Cargando página {currentPage}...</span>
        </div>
      )}

      {/* Photos Grid */}
      {!loading && photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {photos.map((photo) => (
            <Card key={photo.id} className="p-3">
              <div className="aspect-square bg-muted rounded-md mb-3 flex items-center justify-center overflow-hidden">
                {photo.preview_url ? (
                  <img 
                    src={photo.preview_url} 
                    alt={photo.original_filename}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : (
                  <ImageIcon className="h-12 w-12 text-gray-500 dark:text-gray-400" />
                )}
                <ImageIcon className="h-12 w-12 text-gray-500 dark:text-gray-400 hidden" />
              </div>
              <div className="space-y-1">
                <div className="font-medium text-sm truncate" title={photo.original_filename}>
                  {photo.original_filename}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className={`px-2 py-1 rounded ${photo.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {photo.approved ? 'Aprobada' : 'Pendiente'}
                  </span>
                  {photo.file_size && (
                    <span>{Math.round(photo.file_size / 1024)}KB</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(photo.created_at).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && photos.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="h-16 w-16 text-gray-500 dark:text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No hay fotos disponibles
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No se encontraron fotos en la base de datos.
          </p>
          <Button onClick={() => loadPhotos(1)} variant="outline">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Intentar de nuevo
          </Button>
        </div>
      )}

      {/* Bottom Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            onClick={prevPage}
            disabled={currentPage <= 1}
            variant="outline"
            size="sm"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <span className="text-sm px-4">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            onClick={nextPage}
            disabled={currentPage >= totalPages}
            variant="outline"
            size="sm"
          >
            Siguiente
            <ChevronRightIcon className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Debug info */}
      <Card className="mt-8 p-4 bg-muted">
        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <div><strong>Endpoint:</strong> /api/admin/photos (optimizado)</div>
          <div><strong>Estado:</strong> {loading ? 'Cargando...' : error ? '❌ Error' : '✅ OK'}</div>
          <div><strong>Página actual:</strong> {currentPage} de {totalPages}</div>
          <div><strong>Fotos en esta página:</strong> {photos.length}</div>
          <div><strong>Total de fotos:</strong> {totalPhotos}</div>
          {performance && (
            <>
              <div><strong>Rendimiento query:</strong> {performance.query_ms}ms</div>
              <div><strong>Rendimiento total:</strong> {performance.total_ms}ms</div>
            </>
          )}
          <div><strong>Última actualización:</strong> {new Date().toLocaleString()}</div>
        </div>
      </Card>
    </div>
  );
}
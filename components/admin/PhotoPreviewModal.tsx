'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  AlertTriangle,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type Folder = {
  id: string;
  name: string;
  parent_id: string | null;
  depth: number;
  photo_count: number;
  is_published: boolean;
  share_token: string | null;
  published_at: string | null;
  family_url: string | null;
  qr_url: string | null;
  settings: any;
};

type Photo = {
  id: string;
  original_path: string;
  preview_path?: string;
  watermark_path?: string;
  file_name: string;
  uploaded_at: string;
};

interface PhotoPreviewModalProps {
  folder: Folder;
  onClose: () => void;
}

export function PhotoPreviewModal({ folder, onClose }: PhotoPreviewModalProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<number>(0);
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});

  // Load photos for the folder
  useEffect(() => {
    const loadPhotos = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try event-scoped folder photos endpoint (may not exist in all setups)
        const response = await fetch(
          `/api/admin/events/${folder.parent_id}/folders/${folder.id}/photos`
        );

        if (response.ok) {
          const data = await response.json();
          setPhotos(data.photos || []);
        } else {
          // Fallback to unified assets endpoint
          const assetsResp = await fetch(
            `/api/admin/assets?folder_id=${folder.id}&limit=100`
          );
          if (!assetsResp.ok) {
            throw new Error('Error cargando fotos de la carpeta');
          }
          const assetsJson = await assetsResp.json();
          const mapped = (assetsJson.assets || []).map((a: any) => ({
            id: a.id,
            original_path: a.preview_path || '',
            preview_path: a.preview_path || undefined,
            watermark_path: undefined,
            file_name: a.filename || 'foto',
            uploaded_at: a.created_at,
          }));
          setPhotos(mapped);
        }
      } catch (err) {
        console.error('Error loading folder photos:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    if (folder.id) {
      loadPhotos();
    }
  }, [folder.id, folder.parent_id]);

  // Get photo URL with fallback strategy
  const getPhotoUrl = (photo: Photo) => {
    // Priority: watermark_path > preview_path > placeholder
    if (photo.watermark_path) {
      return `/api/admin/storage/signed-url?path=${encodeURIComponent(photo.watermark_path)}`;
    }
    if (photo.preview_path) {
      return `/api/admin/storage/signed-url?path=${encodeURIComponent(photo.preview_path)}`;
    }
    // Fallback to placeholder
    return '/placeholder-image.jpg';
  };

  const handleImageLoad = (photoId: string) => {
    setImageLoading((prev) => ({ ...prev, [photoId]: false }));
  };

  const handleImageError = (photoId: string) => {
    setImageLoading((prev) => ({ ...prev, [photoId]: false }));
  };

  const nextPhoto = () => {
    if (photos.length > 0) {
      setSelectedPhoto((prev) => (prev + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (photos.length > 0) {
      setSelectedPhoto((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden bg-white p-0">
        {/* Header */}
        <DialogHeader className="border-b border-slate-200 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-xl font-bold text-slate-900">
                {folder.name}
              </DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <span>{folder.photo_count} fotos en esta carpeta</span>
                {folder.is_published && (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800"
                  >
                    Publicada
                  </Badge>
                )}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="shrink-0 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-96 items-center justify-center">
              <div className="space-y-3 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
                <p className="text-slate-600">Cargando fotos...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-96 items-center justify-center">
              <div className="space-y-3 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
                <p className="font-medium text-red-600">
                  Error al cargar fotos
                </p>
                <p className="text-sm text-slate-600">{error}</p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Reintentar
                </Button>
              </div>
            </div>
          ) : photos.length === 0 ? (
            <div className="flex h-96 items-center justify-center">
              <div className="space-y-3 text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                <p className="font-medium text-slate-600">Carpeta vacía</p>
                <p className="text-sm text-slate-500">
                  Esta carpeta no contiene fotos
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col lg:flex-row">
              {/* Main Photo Display */}
              <div className="relative flex min-h-[300px] flex-1 items-center justify-center bg-slate-50 lg:min-h-0">
                {photos[selectedPhoto] && (
                  <>
                    {/* Loading state */}
                    {imageLoading[photos[selectedPhoto].id] !== false && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      </div>
                    )}

                    {/* Main image */}
                    <div className="relative max-h-full max-w-full">
                      <Image
                        src={getPhotoUrl(photos[selectedPhoto])}
                        alt={photos[selectedPhoto].file_name}
                        width={800}
                        height={600}
                        className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
                        onLoad={() => handleImageLoad(photos[selectedPhoto].id)}
                        onError={() =>
                          handleImageError(photos[selectedPhoto].id)
                        }
                        priority={selectedPhoto < 3} // Priority for first 3 images
                      />
                    </div>

                    {/* Navigation Arrows - Mobile-friendly */}
                    {photos.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute left-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-white/90 shadow-lg hover:bg-white"
                          onClick={prevPhoto}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-white/90 shadow-lg hover:bg-white"
                          onClick={nextPhoto}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </>
                    )}

                    {/* Photo counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-sm text-white">
                      {selectedPhoto + 1} / {photos.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail Strip - Mobile-first responsive */}
              <div className="border-t border-slate-200 bg-white lg:w-72 lg:border-l lg:border-t-0">
                <div className="p-4">
                  <h3 className="mb-3 font-semibold text-slate-900">
                    Fotos en la carpeta
                  </h3>
                  <div className="grid max-h-96 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6 lg:max-h-[500px] lg:grid-cols-3">
                    {photos.map((photo, index) => (
                      <button
                        key={photo.id}
                        onClick={() => setSelectedPhoto(index)}
                        className={cn(
                          'relative aspect-square overflow-hidden rounded-lg border-2 transition-all hover:scale-105',
                          selectedPhoto === index
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        {/* Thumbnail loading state */}
                        {imageLoading[photo.id] !== false && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          </div>
                        )}

                        <Image
                          src={getPhotoUrl(photo)}
                          alt={photo.file_name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 80px, 100px"
                          onLoad={() => handleImageLoad(photo.id)}
                          onError={() => handleImageError(photo.id)}
                          loading={index < 12 ? 'eager' : 'lazy'} // Eager load first 12 thumbnails
                        />

                        {/* Selection overlay */}
                        {selectedPhoto === index && (
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-600/20">
                            <Eye className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-2 border-t border-slate-200 p-4">
                  <Button
                    variant="outline"
                    className="min-h-[44px] w-full justify-start"
                    onClick={() => {
                      // TODO: Implement bulk download
                      console.log('Download folder photos');
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar todas ({photos.length})
                  </Button>

                  {folder.is_published && folder.family_url && (
                    <Button
                      variant="outline"
                      className="min-h-[44px] w-full justify-start"
                      onClick={() => window.open(folder.family_url!, '_blank')}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver galería pública
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

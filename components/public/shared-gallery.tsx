'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download,
  Grid3X3,
  List,
  Eye,
  Calendar,
  Users,
  BookOpen,
  Image as ImageIcon,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { CheckoutModal } from '@/components/family/CheckoutModal';
import { useFamilyCartStore } from '@/lib/stores/unified-cart-store';

interface SharedGalleryProps {
  token: string;
}

interface GalleryData {
  share: {
    id: string;
    allow_download?: boolean;
    allow_share?: boolean;
    custom_message?: string;
    expires_at?: string;
    view_count?: number;
    max_views?: number;
    views_remaining?: number;
  };
  event: {
    id: string;
    name: string;
    school?: string;
    date?: string;
  };
  level?: {
    id: string;
    name: string;
  };
  course?: {
    id: string;
    name: string;
    grade?: string;
    section?: string;
    event_levels?: {
      id: string;
      name: string;
    };
  };
  student?: {
    id: string;
    name: string;
    grade?: string;
    section?: string;
    courses?: {
      id: string;
      name: string;
      grade?: string;
      section?: string;
    };
  };
  photos: Array<{
    id: string;
    filename: string;
    preview_url: string;
    file_size: number;
    width: number;
    height: number;
    taken_at: string;
    created_at: string;
    approved: boolean;
    photo_type: string;
    tagged_students?: Array<{
      id: string;
      name: string;
      grade?: string;
      section?: string;
    }>;
    tagged_courses?: Array<{
      id: string;
      name: string;
      grade?: string;
      section?: string;
    }>;
  }>;
}

export default function SharedGallery({ token }: SharedGalleryProps) {
  const [galleryData, setGalleryData] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const addItem = useFamilyCartStore((state) => state.addItem);
  const clearCart = useFamilyCartStore((state) => state.clearCart);
  const setContext = useFamilyCartStore((state) => state.setContext);
  const setEventId = useFamilyCartStore((state) => state.setEventId);

  useEffect(() => {
    loadGallery();
  }, [token, loadGallery]);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/public/share/${token}/gallery`);

      if (!response.ok) {
        throw new Error('Failed to load shared gallery');
      }

      const payload = await response.json();

      if (!payload?.success || !payload.gallery) {
        throw new Error(payload?.error || 'Failed to load shared gallery');
      }

      const gallery = payload.gallery;
      const legacy = payload.legacy;

      setGalleryData({
        share: {
          id: gallery.token?.token || 'share',
          allow_download: gallery.share?.allowDownload ?? false,
          allow_share: gallery.share?.allowComments ?? true,
          custom_message: gallery.share?.metadata?.message,
          expires_at: gallery.token?.expiresAt ?? new Date().toISOString(),
          view_count: gallery.token?.viewCount ?? 0,
          max_views: gallery.token?.maxViews ?? undefined,
          views_remaining: undefined,
        },
        event: {
          id: gallery.event?.id || 'event',
          name: gallery.event?.name || legacy?.eventName || 'Evento',
          school: gallery.event?.school_name || 'Escuela',
          date: new Date().toISOString(),
        },
        photos: (gallery.items || []).map((item: any) => ({
          id: item.id,
          filename: item.filename || 'foto',
          preview_url:
            item.previewUrl || item.signedUrl || item.downloadUrl || '/placeholder-image.svg',
          file_size: item.size || 0,
          width: item.metadata?.width || 0,
          height: item.metadata?.height || 0,
          taken_at: item.createdAt,
          created_at: item.createdAt,
          approved: true,
          photo_type: item.type || 'event',
        })),
      } as any);
    } catch (err) {
      console.error('Error loading shared gallery:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shared gallery');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const eventId = galleryData?.event?.id ?? null;

    if (eventId) {
      setContext({ context: 'family', eventId, token });
      setEventId(eventId);
    } else if (token) {
      setContext({ context: 'family', eventId: token, token });
    }
  }, [galleryData?.event?.id, setContext, setEventId, token]);

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/public/gallery/${token}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photo_ids: selectedPhotos.length > 0 ? selectedPhotos : undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate download URLs');
      }
      
      const data = await response.json();
      
      if (data.success && data.download_urls) {
        // Open download URLs in new tabs
        data.download_urls.forEach((urlObj: { download_url: string }) => {
          window.open(urlObj.download_url, '_blank');
        });
        
        toast.success(`Descargando ${data.download_urls.length} foto(s)`);
      } else {
        throw new Error(data.error || 'Failed to generate download URLs');
      }
    } catch (err) {
      console.error('Error downloading photos:', err);
      toast.error('Error al descargar fotos');
    }
  };

  const handleBuy = () => {
    if (selectedPhotos.length === 0) {
      toast.error('Selecciona al menos una foto');
      return;
    }
    // Cargar selección al carrito con precio base
    try {
      clearCart();
      const price = 1500; // Precio base por foto (ARS). Ajustar según estrategia.
      selectedPhotos.forEach((id) => {
        const photo = galleryData?.photos.find((p) => p.id === id);
        if (photo) {
          addItem({ photoId: id, filename: photo.filename, price });
        }
      });
    } catch (e) {
      console.error('Error preparando carrito:', e);
    }
    setIsCheckoutOpen(true);
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId) 
        : [...prev, photoId]
    );
  };

  const selectAllPhotos = () => {
    if (galleryData?.photos) {
      setSelectedPhotos(galleryData.photos.map(photo => photo.id));
    }
  };

  const clearSelection = () => {
    setSelectedPhotos([]);
  };

  const copyShareLink = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Enlace copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-3 text-lg">Cargando galería compartida...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md text-center">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <ImageIcon className="h-8 w-8 text-destructive" />
              <h3 className="text-xl font-medium text-destructive">Error</h3>
            </div>
            <p className="text-destructive mb-4">{error}</p>
            <Button 
              variant="outline" 
              className="text-destructive border-destructive hover:bg-destructive/10"
              onClick={loadGallery}
            >
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!galleryData) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md text-center">
          <div className="bg-muted rounded-lg p-6">
            <ImageIcon className="h-12 w-12 text-gray-500 dark:text-gray-400 mx-auto mb-3" />
            <h3 className="text-xl font-medium mb-2">Galería no encontrada</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Es posible que el enlace haya expirado o sea inválido.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { share, event, level, course, student, photos } = galleryData;

  // Photo grid item
  const PhotoGridItem = ({ photo }: { photo: GalleryData['photos'][0] }) => (
    <div 
      className={`relative group border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
        selectedPhotos.includes(photo.id) ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => togglePhotoSelection(photo.id)}
    >
      {/* Selection indicator */}
      <div className="absolute top-2 left-2 z-10">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          selectedPhotos.includes(photo.id) 
            ? 'bg-primary border-primary' 
            : 'bg-white border-gray-300'
        }`}>
          {selectedPhotos.includes(photo.id) && <Check className="w-3 h-3 text-white" />}
        </div>
      </div>
      
      {/* Photo preview */}
      <div className="aspect-square bg-gray-100 relative">
        {photo.preview_url ? (
          <img 
            src={photo.preview_url} 
            alt={photo.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}
        
        {/* Photo type badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs">
            {photo.photo_type === 'individual' ? 'Individual' : 
             photo.photo_type === 'group' ? 'Grupo' : 
             photo.photo_type === 'activity' ? 'Actividad' : 'Evento'}
          </Badge>
        </div>
        
        {/* Approval status */}
        {photo.approved && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="default" className="bg-green-500">
              Aprobada
            </Badge>
          </div>
        )}
      </div>
      
      {/* Photo info */}
      <div className="p-2">
        <p className="text-xs font-medium truncate">{photo.filename}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(photo.created_at).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-1">
            {photo.tagged_students && photo.tagged_students.length > 0 && (
              <Users className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            )}
            {photo.tagged_courses && photo.tagged_courses.length > 0 && (
              <BookOpen className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Photo list item
  const PhotoListItem = ({ photo }: { photo: GalleryData['photos'][0] }) => (
    <div 
      className={`flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
        selectedPhotos.includes(photo.id) ? 'bg-muted/50 ring-1 ring-primary' : ''
      }`}
      onClick={() => togglePhotoSelection(photo.id)}
    >
      {/* Selection checkbox */}
      <div className={`w-5 h-5 rounded border flex items-center justify-center ${
        selectedPhotos.includes(photo.id) 
          ? 'bg-primary border-primary' 
          : 'border-gray-300'
      }`}>
        {selectedPhotos.includes(photo.id) && <Check className="w-3 h-3 text-white" />}
      </div>
      
      {/* Photo preview */}
      <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
        {photo.preview_url ? (
          <img 
            src={photo.preview_url} 
            alt={photo.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Photo details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{photo.filename}</h4>
          <Badge variant="secondary" className="text-xs">
            {photo.photo_type === 'individual' ? 'Individual' : 
             photo.photo_type === 'group' ? 'Grupo' : 
             photo.photo_type === 'activity' ? 'Actividad' : 'Evento'}
          </Badge>
          {photo.approved && (
            <Badge variant="default" className="bg-green-500 text-xs">
              Aprobada
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
          <span>{new Date(photo.created_at).toLocaleDateString()}</span>
          <span>{Math.round(photo.file_size / 1024)} KB</span>
          <div className="flex items-center gap-1">
            {photo.tagged_students && photo.tagged_students.length > 0 && (
              <span>{photo.tagged_students.length} estudiantes</span>
            )}
            {photo.tagged_courses && photo.tagged_courses.length > 0 && (
              <span>{photo.tagged_courses.length} cursos</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                {student ? `Galería de ${student.name}` : 
                 course ? `Galería de ${course.name}` : 
                 level ? `Galería de ${level.name}` : 
                 `Galería de ${event.name}`}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {event.school} - {new Date(event.date).toLocaleDateString()}
              </p>
              {share.custom_message && (
                <p className="mt-2 text-sm italic">{share.custom_message}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {share.allow_share && (
                <Button 
                  variant="outline" 
                  onClick={copyShareLink}
                  className="flex items-center gap-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {copied ? 'Copiado' : 'Compartir'}
                  </span>
                </Button>
              )}
              
              {share.allow_download && selectedPhotos.length > 0 && (
                <Button 
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    Descargar ({selectedPhotos.length})
                  </span>
                  <span className="sm:hidden">
                    {selectedPhotos.length}
                  </span>
                </Button>
              )}

              {selectedPhotos.length > 0 && (
                <Button 
                  onClick={handleBuy}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  Comprar ({selectedPhotos.length})
                </Button>
              )}
              
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-1"
              >
                <Grid3X3 className="h-4 w-4" />
                <span className="hidden sm:inline">Cuadrícula</span>
              </Button>
              
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="flex items-center gap-1"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Lista</span>
              </Button>
            </div>
          </div>
          
          {/* Share info */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>Vistas: {share.view_count}</span>
              {share.max_views && (
                <span> / {share.max_views}</span>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                Expira: {new Date(share.expires_at).toLocaleDateString()}
              </span>
            </div>
            
            {selectedPhotos.length > 0 && (
              <div className="flex items-center gap-2">
                <span>{selectedPhotos.length} seleccionadas</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearSelection}
                  className="h-6 px-2 text-xs"
                >
                  Limpiar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAllPhotos}
                  className="h-6 px-2 text-xs"
                >
                  Seleccionar todas
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {photos.length > 0 ? (
          <div className="space-y-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {photos.map(photo => (
                  <PhotoGridItem key={photo.id} photo={photo} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {photos.map(photo => (
                  <PhotoListItem key={photo.id} photo={photo} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <ImageIcon className="h-16 w-16 text-gray-500 dark:text-gray-400 mb-4" />
            <h3 className="text-xl font-medium mb-2">No hay fotos en esta galería</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Aún no se han subido fotos para esta galería.
            </p>
          </div>
        )}
      </main>
      {/* Checkout */}
      {galleryData && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          subjectId={galleryData.student?.id || galleryData.course?.id || galleryData.level?.id || galleryData.event.id}
          token={token}
        />
      )}
      
      {/* Footer */}
      <footer className="border-t mt-8">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Galería compartida de {event.school} - {new Date(event.date).toLocaleDateString()}
          </p>
          <p className="mt-1">
            Este enlace es privado y solo puede ser accedido por personas con el enlace.
          </p>
        </div>
      </footer>
    </div>
  );
}

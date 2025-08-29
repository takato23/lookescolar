'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Grid3X3,
  List,
  Search,
  Filter,
  Download,
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Users,
  Camera,
  BookOpen,
  Settings,
  Loader2,
  SlidersHorizontal,
  Heart,
  Star,
  Tag,
  Hash,
} from 'lucide-react';
import { PhotoGalleryItem } from '@/types/admin-api';
import GalleryMetadata from './gallery-metadata';
import BulkDownload from './bulk-download';
import GalleryShare from './gallery-share';

interface StudentGalleryProps {
  eventId: string;
  studentId: string;
  studentName: string;
  onBack: () => void;
}

interface GalleryStats {
  total_photos: number;
  approved_photos: number;
  individual_photos: number;
  group_photos: number;
}

interface GalleryPhoto extends PhotoGalleryItem {
  tagged_students: Array<{
    id: string;
    name: string;
    grade?: string;
    section?: string;
  }>;
  tagged_courses: Array<{
    id: string;
    name: string;
    grade?: string;
    section?: string;
  }>;
}

export default function StudentGallery({
  eventId,
  studentId,
  studentName,
  onBack,
}: StudentGalleryProps) {
  // State
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'taken_at' | 'filename'>(
    'created_at'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [photoType, setPhotoType] = useState<string>('');
  const [approvedFilter, setApprovedFilter] = useState<boolean | 'all'>('all');

  // UI State
  const [showFilters, setShowFilters] = useState(false);

  // Load gallery data
  const loadGallery = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        sort_by: sortBy,
        sort_order: sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(photoType && { photo_type: photoType }),
        ...(approvedFilter !== 'all' && {
          approved: approvedFilter.toString(),
        }),
      });

      const response = await fetch(
        `/api/admin/events/${eventId}/students/${studentId}/gallery?${params}`
      );

      if (!response.ok) {
        throw new Error('Failed to load gallery');
      }

      const data = await response.json();

      if (data.success) {
        setPhotos(data.photos);
        setStats(data.stats);
        setHasMore(data.pagination.has_more);
      } else {
        throw new Error(data.error || 'Failed to load gallery');
      }
    } catch (err) {
      console.error('Error loading student gallery:', err);
      setError(err instanceof Error ? err.message : 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [
    eventId,
    studentId,
    page,
    sortBy,
    sortOrder,
    searchTerm,
    photoType,
    approvedFilter,
  ]);

  // Load gallery on mount and when filters change
  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  // Handle photo selection
  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  const selectAllPhotos = () => {
    setSelectedPhotos(photos.map((photo) => photo.id));
  };

  const clearSelection = () => {
    setSelectedPhotos([]);
  };

  // Handle download
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/students/${studentId}/gallery/download?action=download`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photo_ids: selectedPhotos.length > 0 ? selectedPhotos : undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate download URLs');
      }

      const data = await response.json();

      if (data.success && data.download_urls) {
        // Open download URLs in new tabs
        data.download_urls.forEach((urlObj: { download_url: string }) => {
          window.open(urlObj.download_url, '_blank');
        });
      } else {
        throw new Error(data.error || 'Failed to generate download URLs');
      }
    } catch (err) {
      console.error('Error downloading photos:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to download photos'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle pagination
  const goToPreviousPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const goToNextPage = () => {
    if (hasMore) {
      setPage(page + 1);
    }
  };

  // Photo grid item
  const PhotoGridItem = ({ photo }: { photo: GalleryPhoto }) => (
    <div
      className={`glass-card group relative cursor-pointer overflow-hidden rounded-xl border transition-all hover:shadow-lg ${
        selectedPhotos.includes(photo.id)
          ? 'border-orange-500 ring-2 ring-orange-500'
          : 'border-white/20'
      }`}
      onClick={() => togglePhotoSelection(photo.id)}
    >
      {/* Selection indicator */}
      <div className="absolute left-2 top-2 z-10">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
            selectedPhotos.includes(photo.id)
              ? 'border-orange-500 bg-orange-500'
              : 'border-white/50 bg-white/80'
          }`}
        >
          {selectedPhotos.includes(photo.id) && (
            <Check className="h-4 w-4 text-white" />
          )}
        </div>
      </div>

      {/* Photo preview */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
        {photo.preview_url ? (
          <img
            src={photo.preview_url}
            alt={photo.filename}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}

        {/* Photo type badge */}
        <div className="absolute right-2 top-2">
          <Badge
            variant="secondary"
            className="bg-white/30 text-xs backdrop-blur-sm dark:bg-black/30"
          >
            {photo.photo_type === 'individual'
              ? 'Individual'
              : photo.photo_type === 'group'
                ? 'Grupo'
                : photo.photo_type === 'activity'
                  ? 'Actividad'
                  : 'Evento'}
          </Badge>
        </div>

        {/* Approval status */}
        {photo.approved && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="default" className="bg-green-500 backdrop-blur-sm">
              Aprobada
            </Badge>
          </div>
        )}

        {/* Favorite indicator */}
        <div className="absolute bottom-2 left-2">
          <Heart className="h-4 w-4 fill-current text-red-500 opacity-70" />
        </div>
      </div>

      {/* Photo info */}
      <div className="bg-white/5 p-3 dark:bg-black/10">
        <p className="truncate text-xs font-medium">{photo.filename}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            {new Date(photo.created_at).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-1">
            {photo.tagged_students.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Users className="text-muted-foreground h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{photo.tagged_students.length} estudiantes</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {photo.tagged_courses.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <BookOpen className="text-muted-foreground h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{photo.tagged_courses.length} cursos</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Photo list item
  const PhotoListItem = ({ photo }: { photo: GalleryPhoto }) => (
    <div
      className={`glass-card flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-white/10 ${
        selectedPhotos.includes(photo.id)
          ? 'border-orange-500 bg-white/10 ring-1 ring-orange-500'
          : 'border-white/20'
      }`}
      onClick={() => togglePhotoSelection(photo.id)}
    >
      {/* Selection checkbox */}
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
          selectedPhotos.includes(photo.id)
            ? 'border-orange-500 bg-orange-500'
            : 'border-white/50'
        }`}
      >
        {selectedPhotos.includes(photo.id) && (
          <Check className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Photo preview */}
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
        {photo.preview_url ? (
          <img
            src={photo.preview_url}
            alt={photo.filename}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Photo details */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="truncate font-medium">{photo.filename}</h4>
          <Badge variant="secondary" className="text-xs">
            {photo.photo_type === 'individual'
              ? 'Individual'
              : photo.photo_type === 'group'
                ? 'Grupo'
                : photo.photo_type === 'activity'
                  ? 'Actividad'
                  : 'Evento'}
          </Badge>
          {photo.approved && (
            <Badge variant="default" className="bg-green-500 text-xs">
              Aprobada
            </Badge>
          )}
        </div>

        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-4 text-sm">
          <span>{new Date(photo.created_at).toLocaleDateString()}</span>
          <span>{Math.round(photo.file_size / 1024)} KB</span>
          <div className="flex items-center gap-2">
            {photo.tagged_students.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {photo.tagged_students.length}
              </span>
            )}
            {photo.tagged_courses.length > 0 && (
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {photo.tagged_courses.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="glass-button">
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500"></div>
        <span className="ml-2">Cargando galería...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="glass-card rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center gap-2">
            <X className="h-5 w-5 text-red-500" />
            <h3 className="font-medium text-red-500">Error</h3>
          </div>
          <p className="mt-2 text-sm text-red-400">{error}</p>
          <Button
            variant="outline"
            className="glass-button mt-3 border-red-500 text-red-500 hover:bg-red-500/10"
            onClick={loadGallery}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            className="glass-button flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="glass-button flex items-center gap-1"
            >
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">Cuadrícula</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="glass-button flex items-center gap-1"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-2xl font-bold text-transparent">
                {studentName} Gallery
              </h1>
              <GalleryMetadata eventId={eventId} studentId={studentId} />
            </div>
            {stats && (
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span className="glass-badge flex items-center gap-1">
                  <Camera className="h-4 w-4" />
                  {stats.total_photos} fotos
                </span>
                <span className="glass-badge flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  {stats.approved_photos} aprobadas
                </span>
                <span className="glass-badge flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {stats.individual_photos} individuales
                </span>
                <span className="glass-badge flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {stats.group_photos} grupales
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GalleryShare eventId={eventId} studentId={studentId} />
            {selectedPhotos.length > 0 && (
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="glass-button flex items-center gap-2"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  Descargar ({selectedPhotos.length})
                </span>
                <span className="sm:hidden">{selectedPhotos.length}</span>
              </Button>
            )}
            <BulkDownload
              eventId={eventId}
              level="student"
              studentId={studentId}
              photoCount={stats?.total_photos || 0}
              selectedPhotos={selectedPhotos}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Filters - Mobile Optimized */}
      <div className="glass-card rounded-xl border border-white/20 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Buscar fotos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="glass-button flex items-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>

            <Select
              value={sortBy}
              onValueChange={(value: any) => setSortBy(value)}
            >
              <SelectTrigger className="glass-input w-28 sm:w-32">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent className="glass-card border border-white/20">
                <SelectItem value="created_at">Creación</SelectItem>
                <SelectItem value="taken_at">Toma</SelectItem>
                <SelectItem value="filename">Nombre</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortOrder}
              onValueChange={(value: any) => setSortOrder(value)}
            >
              <SelectTrigger className="glass-input w-20 sm:w-24">
                <SelectValue placeholder="Orden" />
              </SelectTrigger>
              <SelectContent className="glass-card border border-white/20">
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-white/20 pt-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Tipo de foto
              </label>
              <Select
                value={photoType}
                onValueChange={(value: any) => setPhotoType(value)}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="glass-card border border-white/20">
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="group">Grupo</SelectItem>
                  <SelectItem value="activity">Actividad</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Aprobación
              </label>
              <Select
                value={approvedFilter.toString()}
                onValueChange={(value: any) =>
                  setApprovedFilter(value === 'all' ? 'all' : value === 'true')
                }
              >
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="glass-card border border-white/20">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Aprobadas</SelectItem>
                  <SelectItem value="false">No aprobadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setPhotoType('');
                  setApprovedFilter('all');
                }}
                className="glass-button"
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Photo gallery - Mobile Optimized */}
      {photos.length > 0 ? (
        <div className="space-y-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {photos.map((photo) => (
                <PhotoGridItem key={photo.id} photo={photo} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {photos.map((photo) => (
                <PhotoListItem key={photo.id} photo={photo} />
              ))}
            </div>
          )}

          {/* Pagination - Mobile Optimized */}
          <div className="glass-card flex flex-col items-center justify-between gap-3 rounded-xl border border-white/20 p-4 sm:flex-row">
            <div className="text-muted-foreground text-center text-sm sm:text-left">
              {Math.min(page * 50 + 1, stats?.total_photos || 0)} -{' '}
              {Math.min((page + 1) * 50, stats?.total_photos || 0)} de{' '}
              {stats?.total_photos || 0}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={page === 0}
                className="glass-button flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>
              <span className="rounded-lg bg-white/10 px-3 py-1 text-sm">
                {page + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={!hasMore}
                className="glass-button flex items-center gap-1"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center rounded-xl border border-white/20 p-12 text-center">
          <ImageIcon className="text-muted-foreground mb-4 h-16 w-16" />
          <h3 className="mb-2 text-xl font-medium">
            No hay fotos para este estudiante
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Aún no se han subido fotos para este estudiante. Sube fotos para
            comenzar a organizarlas.
          </p>
          <Button className="glass-button">
            <Upload className="mr-2 h-4 w-4" />
            Subir fotos
          </Button>
        </div>
      )}
    </div>
  );
}

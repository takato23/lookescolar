'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import {
  Upload,
  Image as ImageIcon,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  Download,
  Filter,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ZoomIn,
  UserPlus,
  QrCode,
  RefreshCw,
  Calendar,
  Search,
  FolderOpen,
  CheckSquare,
  Square,
  Settings,
  MoreHorizontal,
  Tag,
  Clock,
  FileImage,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Types
interface Photo {
  id: string;
  filename: string;
  original_filename: string;
  storage_path: string;
  preview_path: string;
  preview_url?: string;
  approved: boolean;
  tagged: boolean;
  created_at: string;
  width?: number;
  height?: number;
  file_size?: number;
  event_id?: string;
  subject?: {
    id: string;
    name: string;
  };
  event?: {
    id: string;
    name: string;
  };
}

interface Event {
  id: string;
  name: string;
  event_date: string;
  school_name: string;
  photo_count?: number;
}

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
}

interface PhotoFilters {
  status: 'all' | 'approved' | 'pending' | 'tagged' | 'untagged';
  event: string;
  dateRange: { from: Date | null; to: Date | null };
  search: string;
  sortBy: 'created_at' | 'original_filename' | 'file_size';
  sortOrder: 'asc' | 'desc';
}

// Photo thumbnail component with lazy loading
const PhotoThumbnail = ({ 
  photo, 
  isSelected, 
  onToggleSelect,
  onView,
  onAssign,
  onDelete,
}: {
  photo: Photo;
  isSelected: boolean;
  onToggleSelect: () => void;
  onView: () => void;
  onAssign: () => void;
  onDelete: () => void;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
        isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"
      )}
    >
      {/* Selection checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          className="bg-white/90 backdrop-blur"
        />
      </div>

      {/* Status badges */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {photo.approved && (
          <Badge className="bg-green-500/90 backdrop-blur text-white">
            Aprobada
          </Badge>
        )}
        {photo.tagged && (
          <Badge className="bg-blue-500/90 backdrop-blur text-white">
            Etiquetada
          </Badge>
        )}
      </div>

      {/* Image */}
      <div className="aspect-square relative bg-gray-100">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}
        
        {imageError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <ImageIcon className="h-12 w-12 mb-2" />
            <span className="text-xs">Error al cargar</span>
          </div>
        ) : (
          <img
            src={photo.preview_url || ''}
            alt={photo.original_filename}
            className={cn(
              "w-full h-full object-cover transition-opacity",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )}

        {/* Overlay actions on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView();
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver foto</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssign();
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Asignar alumno</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Photo info */}
      <div className="p-2 bg-white">
        <p className="text-xs font-medium truncate" title={photo.original_filename}>
          {photo.original_filename}
        </p>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-500">{formatFileSize(photo.file_size)}</span>
          {photo.event && (
            <Badge variant="outline" className="text-xs">
              {photo.event.name}
            </Badge>
          )}
        </div>
        {photo.subject && (
          <div className="mt-1">
            <Badge variant="secondary" className="text-xs">
              <UserPlus className="h-3 w-3 mr-1" />
              {photo.subject.name}
            </Badge>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Main Enhanced Photos Page Component
export default function EnhancedPhotosPage() {
  // State management
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<PhotoFilters>({
    status: 'all',
    event: 'all',
    dateRange: { from: null, to: null },
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [photosPerPage, setPhotosPerPage] = useState(24);
  const [totalPhotos, setTotalPhotos] = useState(0);
  
  // Upload state
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedEventForUpload, setSelectedEventForUpload] = useState<string>('');
  
  // Dialogs
  const [viewPhoto, setViewPhoto] = useState<Photo | null>(null);
  const [assignPhoto, setAssignPhoto] = useState<Photo | null>(null);
  const [bulkActionDialog, setBulkActionDialog] = useState<string | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load photos with pagination and filters
  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', photosPerPage.toString());
      
      if (filters.event !== 'all') params.append('event_id', filters.event);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      params.append('sort_by', filters.sortBy);
      params.append('sort_order', filters.sortOrder);
      
      if (filters.dateRange.from) {
        params.append('date_from', filters.dateRange.from.toISOString());
      }
      if (filters.dateRange.to) {
        params.append('date_to', filters.dateRange.to.toISOString());
      }

      const response = await fetch(`/api/admin/photos?${params}`);
      const data = await response.json();

      if (data.success) {
        setPhotos(data.photos || []);
        setTotalPhotos(data.total || 0);
        
        // Fetch signed URLs for previews
        if (data.photos?.length > 0) {
          await fetchSignedUrls(data.photos);
        }
      } else {
        throw new Error(data.error || 'Error loading photos');
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.error('Error al cargar las fotos');
    } finally {
      setLoading(false);
    }
  }, [currentPage, photosPerPage, filters]);

  // Fetch signed URLs for photo previews
  const fetchSignedUrls = async (photoList: Photo[]) => {
    try {
      const photoIds = photoList.map(p => p.id);
      
      const response = await fetch('/api/admin/storage/batch-signed-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds }),
      });

      const data = await response.json();

      if (data.signedUrls) {
        setPhotos(prev => prev.map(p => ({
          ...p,
          preview_url: data.signedUrls[p.id] || p.preview_url
        })));
      }
    } catch (error) {
      console.error('Error fetching signed URLs:', error);
    }
  };

  // Load events for filtering
  const loadEvents = async () => {
    try {
      const response = await fetch('/api/admin/events-simple');
      const data = await response.json();
      
      if (data.success && data.events) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  // Initialize data on mount
  useEffect(() => {
    loadEvents();
  }, []);

  // Reload photos when filters or pagination change
  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadQueue(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    multiple: true,
  });

  // Upload photos with progress tracking
  const uploadPhotos = async () => {
    if (uploadQueue.length === 0) {
      toast.error('No hay fotos para subir');
      return;
    }

    if (!selectedEventForUpload) {
      toast.error('Selecciona un evento para las fotos');
      return;
    }

    setIsUploading(true);
    
    // Initialize progress tracking
    const progressItems: UploadProgress[] = uploadQueue.map(file => ({
      filename: file.name,
      progress: 0,
      status: 'pending' as const,
    }));
    setUploadProgress(progressItems);

    // Process uploads in batches of 3 for better performance
    const batchSize = 3;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < uploadQueue.length; i += batchSize) {
      const batch = uploadQueue.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (file, batchIndex) => {
          const index = i + batchIndex;
          
          try {
            // Update status to uploading
            setUploadProgress(prev => prev.map((item, idx) => 
              idx === index ? { ...item, status: 'uploading', progress: 30 } : item
            ));

            const formData = new FormData();
            formData.append('files', file);
            if (selectedEventForUpload) {
            formData.append('event_id', selectedEventForUpload);
          }

            const response = await fetch('/api/admin/photos/upload', {
              method: 'POST',
              body: formData,
            });

            const data = await response.json();

            if (data.success) {
              successCount++;
              setUploadProgress(prev => prev.map((item, idx) => 
                idx === index ? { ...item, status: 'done', progress: 100 } : item
              ));
            } else {
              throw new Error(data.error || 'Upload failed');
            }
          } catch (error) {
            errorCount++;
            setUploadProgress(prev => prev.map((item, idx) => 
              idx === index ? { 
                ...item, 
                status: 'error', 
                progress: 0,
                error: error instanceof Error ? error.message : 'Error desconocido'
              } : item
            ));
          }
        })
      );
    }

    // Show results
    if (successCount > 0) {
      toast.success(`${successCount} foto(s) subida(s) correctamente`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} foto(s) fallaron al subir`);
    }

    // Clean up successful uploads
    setTimeout(() => {
      setUploadQueue([]);
      setUploadProgress([]);
      loadPhotos(); // Reload photos
    }, 2000);

    setIsUploading(false);
  };

  // Bulk operations
  const handleBulkOperation = async (operation: string) => {
    if (selectedPhotos.size === 0) {
      toast.error('No hay fotos seleccionadas');
      return;
    }

    const photoIds = Array.from(selectedPhotos);

    try {
      let endpoint = '';
      let method = 'POST';
      let body: any = { photoIds };

      switch (operation) {
        case 'approve':
          endpoint = '/api/admin/photos/approve';
          body.approved = true;
          break;
        case 'unapprove':
          endpoint = '/api/admin/photos/approve';
          body.approved = false;
          break;
        case 'delete':
          if (!confirm(`¿Eliminar ${photoIds.length} foto(s)?`)) return;
          endpoint = '/api/admin/photos';
          method = 'DELETE';
          break;
        case 'download':
          // Implement batch download
          toast.info('Descarga en lote próximamente');
          return;
        default:
          return;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Operación completada para ${photoIds.length} foto(s)`);
        setSelectedPhotos(new Set());
        loadPhotos();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('Error en la operación');
      console.error(error);
    }

    setBulkActionDialog(null);
  };

  // Selection helpers
  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    const allIds = new Set(photos.map(p => p.id));
    setSelectedPhotos(allIds);
  };

  const clearSelection = () => {
    setSelectedPhotos(new Set());
  };

  // Filtered and sorted photos
  const displayedPhotos = useMemo(() => {
    return photos; // Already filtered and sorted by the API
  }, [photos]);

  const totalPages = Math.ceil(totalPhotos / photosPerPage);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Fotos</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalPhotos} fotos en total • {selectedPhotos.size} seleccionadas
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPhotos()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>

            {/* View mode toggle */}
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Upload button */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir Fotos
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  setUploadQueue(Array.from(e.target.files));
                }
              }}
            />
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar por nombre..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>

          {/* Event filter */}
          <Select
            value={filters.event}
            onValueChange={(value) => setFilters(prev => ({ ...prev, event: value }))}
          >
            <SelectTrigger className="w-[200px]">
              <FolderOpen className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Todos los eventos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los eventos</SelectItem>
              {events.map(event => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                  {event.photo_count && (
                    <Badge variant="outline" className="ml-2">
                      {event.photo_count}
                    </Badge>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select
            value={filters.status}
            onValueChange={(value: any) => setFilters(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="approved">Aprobadas</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="tagged">Etiquetadas</SelectItem>
              <SelectItem value="untagged">Sin etiquetar</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Ordenar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem
                checked={filters.sortBy === 'created_at'}
                onCheckedChange={() => setFilters(prev => ({ ...prev, sortBy: 'created_at' }))}
              >
                Por fecha
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.sortBy === 'original_filename'}
                onCheckedChange={() => setFilters(prev => ({ ...prev, sortBy: 'original_filename' }))}
              >
                Por nombre
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.sortBy === 'file_size'}
                onCheckedChange={() => setFilters(prev => ({ ...prev, sortBy: 'file_size' }))}
              >
                Por tamaño
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filters.sortOrder === 'asc'}
                onCheckedChange={() => setFilters(prev => ({ ...prev, sortOrder: 'asc' }))}
              >
                Ascendente
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.sortOrder === 'desc'}
                onCheckedChange={() => setFilters(prev => ({ ...prev, sortOrder: 'desc' }))}
              >
                Descendente
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Selection toolbar */}
        {selectedPhotos.size > 0 && (
          <div className="flex items-center justify-between mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedPhotos.size} foto{selectedPhotos.size !== 1 ? 's' : ''} seleccionada{selectedPhotos.size !== 1 ? 's' : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllVisible}
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                Seleccionar todas
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkOperation('approve')}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Aprobar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkOperation('download')}
              >
                <Download className="h-4 w-4 mr-1" />
                Descargar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={() => handleBulkOperation('delete')}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-auto p-6">
        {/* Upload drop zone */}
        {uploadQueue.length > 0 && (
          <Card className="mb-6 border-dashed border-2 border-blue-300 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Cola de Subida ({uploadQueue.length} archivos)</span>
                <div className="flex gap-2">
                  <Select
                    value={selectedEventForUpload}
                    onValueChange={setSelectedEventForUpload}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Seleccionar evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map(event => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={uploadPhotos}
                    disabled={isUploading || !selectedEventForUpload}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Subir Todo
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadQueue([]);
                      setUploadProgress([]);
                    }}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-3">
                {uploadQueue.slice(0, 12).map((file, index) => {
                  const progress = uploadProgress[index];
                  return (
                    <div key={index} className="relative">
                      <div className="aspect-square rounded-lg overflow-hidden bg-white">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        {progress && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            {progress.status === 'done' ? (
                              <CheckCircle className="h-8 w-8 text-green-500" />
                            ) : progress.status === 'error' ? (
                              <AlertCircle className="h-8 w-8 text-red-500" />
                            ) : progress.status === 'uploading' ? (
                              <Loader2 className="h-8 w-8 text-white animate-spin" />
                            ) : (
                              <Clock className="h-8 w-8 text-gray-400" />
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs mt-1 truncate">{file.name}</p>
                    </div>
                  );
                })}
                {uploadQueue.length > 12 && (
                  <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-500 font-medium">
                      +{uploadQueue.length - 12} más
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos grid or list */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : displayedPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <ImageIcon className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium">No se encontraron fotos</p>
            <p className="text-sm mt-2">Ajusta los filtros o sube nuevas fotos</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <AnimatePresence>
              {displayedPhotos.map(photo => (
                <PhotoThumbnail
                  key={photo.id}
                  photo={photo}
                  isSelected={selectedPhotos.has(photo.id)}
                  onToggleSelect={() => togglePhotoSelection(photo.id)}
                  onView={() => setViewPhoto(photo)}
                  onAssign={() => setAssignPhoto(photo)}
                  onDelete={() => {
                    if (confirm('¿Eliminar esta foto?')) {
                      handleBulkOperation('delete');
                    }
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          // List view
          <div className="space-y-2">
            {displayedPhotos.map(photo => (
              <Card key={photo.id} className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedPhotos.has(photo.id)}
                    onCheckedChange={() => togglePhotoSelection(photo.id)}
                  />
                  <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={photo.preview_url || ''}
                      alt={photo.original_filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{photo.original_filename}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{format(new Date(photo.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                      <span>{photo.file_size ? `${(photo.file_size / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</span>
                      {photo.event && <Badge variant="outline">{photo.event.name}</Badge>}
                      {photo.subject && <Badge variant="secondary">{photo.subject.name}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {photo.approved && <Badge className="bg-green-500">Aprobada</Badge>}
                    {photo.tagged && <Badge className="bg-blue-500">Etiquetada</Badge>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewPhoto(photo)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setAssignPhoto(photo)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Asignar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          if (confirm('¿Eliminar esta foto?')) {
                            setSelectedPhotos(new Set([photo.id]));
                            handleBulkOperation('delete');
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                Mostrando {((currentPage - 1) * photosPerPage) + 1} - {Math.min(currentPage * photosPerPage, totalPhotos)} de {totalPhotos}
              </span>
              <Select
                value={photosPerPage.toString()}
                onValueChange={(value) => {
                  setPhotosPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                  <SelectItem value="96">96</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View photo dialog */}
      <Dialog open={!!viewPhoto} onOpenChange={() => setViewPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewPhoto?.original_filename}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            {viewPhoto?.preview_url && (
              <img
                src={viewPhoto.preview_url}
                alt={viewPhoto.original_filename}
                className="w-full rounded-lg"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label>Tamaño</Label>
              <p>{viewPhoto?.file_size ? `${(viewPhoto.file_size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}</p>
            </div>
            <div>
              <Label>Dimensiones</Label>
              <p>{viewPhoto?.width && viewPhoto?.height ? `${viewPhoto.width} x ${viewPhoto.height}` : 'N/A'}</p>
            </div>
            <div>
              <Label>Fecha</Label>
              <p>{viewPhoto?.created_at ? format(new Date(viewPhoto.created_at), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A'}</p>
            </div>
            <div>
              <Label>Estado</Label>
              <div className="flex gap-2">
                {viewPhoto?.approved && <Badge className="bg-green-500">Aprobada</Badge>}
                {viewPhoto?.tagged && <Badge className="bg-blue-500">Etiquetada</Badge>}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
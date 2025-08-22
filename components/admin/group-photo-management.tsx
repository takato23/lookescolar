'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Camera,
  Upload,
  Download,
  Edit,
  Trash2,
  Eye,
  Users,
  BookOpen,
  MoreHorizontal,
  Search,
  Filter,
  RefreshCw,
  Plus,
  CheckCircle,
  Circle,
  AlertTriangle,
  ImageIcon,
  Grid3X3,
  List,
  Calendar,
  Tag,
  Share2,
} from 'lucide-react';

interface GroupPhoto {
  id: string;
  filename: string;
  storage_path: string;
  preview_url: string;
  photo_type: 'group' | 'activity' | 'event';
  course_id: string;
  course_name: string;
  level_name?: string;
  event_id: string;
  approved: boolean;
  file_size_bytes: number;
  metadata?: any;
  created_at: string;
  tagged_at: string;
  tagged_by?: string;
}

interface Course {
  id: string;
  name: string;
  grade?: string;
  section?: string;
  level_id?: string;
  level_name?: string;
  student_count?: number;
  group_photo_count?: number;
  active: boolean;
}

interface GroupPhotoManagementProps {
  eventId: string;
  eventName: string;
  courses: Course[];
  selectedCourse?: string;
  onCourseChange?: (courseId: string | null) => void;
}

export default function GroupPhotoManagement({
  eventId,
  eventName,
  courses,
  selectedCourse,
  onCourseChange,
}: GroupPhotoManagementProps) {
  // State
  const [photos, setPhotos] = useState<GroupPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterApproved, setFilterApproved] = useState<boolean | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedPhotoDetails, setSelectedPhotoDetails] = useState<GroupPhoto | null>(null);

  // Upload state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Load group photos
  const loadGroupPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(`/api/admin/events/${eventId}/photos/group`, window.location.origin);
      
      if (selectedCourse) {
        url.searchParams.set('course_id', selectedCourse);
      }
      if (searchTerm) {
        url.searchParams.set('search', searchTerm);
      }
      if (filterType) {
        url.searchParams.set('photo_type', filterType);
      }
      if (filterApproved !== null) {
        url.searchParams.set('approved', filterApproved.toString());
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to load group photos');
      }

      const data = await response.json();
      setPhotos(data.photos || []);
    } catch (err) {
      console.error('Error loading group photos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [eventId, selectedCourse, searchTerm, filterType, filterApproved]);

  // Load photos on mount and when filters change
  useEffect(() => {
    loadGroupPhotos();
  }, [loadGroupPhotos]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    let filtered = [...photos];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(photo =>
        photo.filename.toLowerCase().includes(term) ||
        photo.course_name.toLowerCase().includes(term) ||
        (photo.level_name && photo.level_name.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [photos, searchTerm]);

  // Selection handlers
  const handlePhotoToggle = useCallback((photoId: string, selected: boolean) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(photoId);
      } else {
        newSet.delete(photoId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedPhotos(new Set(filteredPhotos.map(p => p.id)));
    } else {
      setSelectedPhotos(new Set());
    }
  }, [filteredPhotos]);

  // Upload handler
  const handleUpload = async () => {
    if (uploadFiles.length === 0 || !selectedCourse) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      uploadFiles.forEach((file, index) => {
        formData.append(`files`, file);
      });
      formData.append('course_id', selectedCourse);
      formData.append('photo_type', 'group');

      const response = await fetch(`/api/admin/events/${eventId}/photos/group/upload`, {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      if (response.ok) {
        setUploadDialogOpen(false);
        setUploadFiles([]);
        setUploadProgress(0);
        loadGroupPhotos(); // Refresh photos
      } else {
        throw new Error('Failed to upload photos');
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setUploading(false);
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedPhotos.size === 0) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/photos/group/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          photo_ids: Array.from(selectedPhotos),
        }),
      });

      if (response.ok) {
        setSelectedPhotos(new Set());
        loadGroupPhotos();
      } else {
        throw new Error('Failed to perform bulk action');
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
    } finally {
      setLoading(false);
    }
  };

  // Photo Card Component
  const PhotoCard = ({ photo }: { photo: GroupPhoto }) => {
    const selected = selectedPhotos.has(photo.id);
    
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 group">
        <div className="relative">
          {/* Photo Preview */}
          <div className="aspect-[4/3] relative bg-muted">
            <Image
              src={photo.preview_url}
              alt={photo.filename}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            
            {/* Overlay with selection checkbox */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
              <div className="absolute top-2 left-2">
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => handlePhotoToggle(photo.id, !!checked)}
                  className="bg-white border-white"
                  aria-label={`Select photo ${photo.filename}`}
                />
              </div>
              
              <div className="absolute top-2 right-2 flex gap-1">
                <Badge variant={photo.approved ? 'default' : 'secondary'} className="text-xs">
                  {photo.approved ? 'Aprobada' : 'Pendiente'}
                </Badge>
                <Badge variant="outline" className="text-xs bg-white/90">
                  {photo.photo_type === 'group' ? 'Grupal' : 
                   photo.photo_type === 'activity' ? 'Actividad' : 'Evento'}
                </Badge>
              </div>

              {/* Quick actions on hover */}
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => setSelectedPhotoDetails(photo)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="secondary">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedPhotoDetails(photo)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Share2 className="h-4 w-4 mr-2" />
                        Compartir
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="space-y-2">
            {/* File info */}
            <div>
              <h4 className="font-medium text-sm truncate">{photo.filename}</h4>
              <p className="text-xs text-muted-foreground">
                {(photo.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>

            {/* Course info */}
            <div className="flex items-center gap-2 text-xs">
              <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="truncate">{photo.course_name}</span>
              {photo.level_name && (
                <Badge variant="outline" className="text-xs">
                  {photo.level_name}
                </Badge>
              )}
            </div>

            {/* Date */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{new Date(photo.created_at).toLocaleDateString('es-AR')}</span>
            </div>

            {/* Tagged info */}
            {photo.tagged_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Tag className="h-3 w-3 shrink-0" />
                <span>Etiquetada: {new Date(photo.tagged_at).toLocaleDateString('es-AR')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Course stats
  const courseStats = useMemo(() => {
    const activeCourses = courses.filter(c => c.active);
    const totalGroupPhotos = courses.reduce((sum, c) => sum + (c.group_photo_count || 0), 0);
    const coursesWithPhotos = courses.filter(c => (c.group_photo_count || 0) > 0).length;
    
    return {
      total: activeCourses.length,
      withPhotos: coursesWithPhotos,
      totalPhotos: totalGroupPhotos,
      completionRate: activeCourses.length > 0 ? Math.round((coursesWithPhotos / activeCourses.length) * 100) : 0,
    };
  }, [courses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fotos Grupales</h2>
          <p className="text-muted-foreground">
            {eventName} - {filteredPhotos.length} fotos encontradas
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={loadGroupPhotos} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedCourse}>
                <Upload className="h-4 w-4 mr-2" />
                Subir Fotos
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Subir Fotos Grupales</DialogTitle>
                <DialogDescription>
                  Suba fotos grupales para el curso seleccionado.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Archivos</label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                  />
                  {uploadFiles.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {uploadFiles.length} archivo{uploadFiles.length !== 1 ? 's' : ''} seleccionado{uploadFiles.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subiendo...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={uploading || uploadFiles.length === 0 || !selectedCourse}
                >
                  Subir Fotos
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Course Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cursos Totales</p>
                <p className="text-2xl font-bold">{courseStats.total}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Con Fotos</p>
                <p className="text-2xl font-bold">{courseStats.withPhotos}</p>
              </div>
              <Camera className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Fotos</p>
                <p className="text-2xl font-bold">{courseStats.totalPhotos}</p>
              </div>
              <ImageIcon className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completado</p>
                <p className="text-2xl font-bold">{courseStats.completionRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Selection and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1">
          <Select 
            value={selectedCourse || ''} 
            onValueChange={(value) => onCourseChange?.(value || null)}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Seleccionar curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los cursos</SelectItem>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name} {course.level_name && `(${course.level_name})`}
                  {course.group_photo_count !== undefined && ` - ${course.group_photo_count} fotos`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fotos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          
          <Select value={filterType || ''} onValueChange={(value) => setFilterType(value || null)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="group">Grupal</SelectItem>
              <SelectItem value="activity">Actividad</SelectItem>
              <SelectItem value="event">Evento</SelectItem>
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Más Filtros
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterApproved(null)}>
                Todas las fotos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterApproved(true)}>
                Solo aprobadas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterApproved(false)}>
                Solo pendientes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedPhotos.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedPhotos.size} foto{selectedPhotos.size !== 1 ? 's' : ''} seleccionada{selectedPhotos.size !== 1 ? 's' : ''}
            </span>
            <Button size="sm" variant="outline" onClick={() => handleSelectAll(false)}>
              Deseleccionar
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('approve')}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprobar
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('download')}>
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleBulkAction('delete')}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>
      )}

      {/* Photos Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Error al cargar las fotos</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!error && (
        <>
          {filteredPhotos.length > 0 ? (
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                : "space-y-4"
            }>
              {filteredPhotos.map(photo => (
                <PhotoCard key={photo.id} photo={photo} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No hay fotos grupales</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedCourse 
                    ? 'Este curso no tiene fotos grupales aún.' 
                    : searchTerm 
                      ? 'No se encontraron fotos con esos criterios.'
                      : 'Comience subiendo las primeras fotos grupales.'
                  }
                </p>
                {selectedCourse && (
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Fotos
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Photo Details Dialog */}
      <Dialog open={!!selectedPhotoDetails} onOpenChange={(open) => !open && setSelectedPhotoDetails(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalles de la Foto</DialogTitle>
          </DialogHeader>
          {selectedPhotoDetails && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="aspect-[4/3] relative bg-muted rounded-lg overflow-hidden">
                <Image
                  src={selectedPhotoDetails.preview_url}
                  alt={selectedPhotoDetails.filename}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Información del Archivo</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nombre:</span>
                      <span className="font-mono">{selectedPhotoDetails.filename}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tamaño:</span>
                      <span>{(selectedPhotoDetails.file_size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <Badge variant="outline">
                        {selectedPhotoDetails.photo_type === 'group' ? 'Grupal' : 
                         selectedPhotoDetails.photo_type === 'activity' ? 'Actividad' : 'Evento'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado:</span>
                      <Badge variant={selectedPhotoDetails.approved ? 'default' : 'secondary'}>
                        {selectedPhotoDetails.approved ? 'Aprobada' : 'Pendiente'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Información del Curso</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Curso:</span>
                      <span>{selectedPhotoDetails.course_name}</span>
                    </div>
                    {selectedPhotoDetails.level_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nivel:</span>
                        <span>{selectedPhotoDetails.level_name}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Fechas</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subida:</span>
                      <span>{new Date(selectedPhotoDetails.created_at).toLocaleString('es-AR')}</span>
                    </div>
                    {selectedPhotoDetails.tagged_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Etiquetada:</span>
                        <span>{new Date(selectedPhotoDetails.tagged_at).toLocaleString('es-AR')}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
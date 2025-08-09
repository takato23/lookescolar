'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import {
  Upload,
  Image as ImageIcon,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

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
}

  // Componente para cargar imágenes con URL firmada
function PhotoImage({ path, alt }: { path: string; alt: string }) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        // En admin, las URLs firmadas deben llegar desde la API que lista las fotos
        // Este componente recibe `path` de preview; como fallback, intentamos usarlo directamente si viene ya firmada
        if (path.startsWith('http')) {
          setImageUrl(path);
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [path]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <ImageIcon className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className="h-full w-full object-cover"
      loading="lazy"
    />
  );
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<
    'all' | 'approved' | 'pending' | 'tagged' | 'untagged'
  >('all');
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [events, setEvents] = useState<any[]>([]);
  const [viewPhoto, setViewPhoto] = useState<Photo | null>(null);
  const [editPhoto, setEditPhoto] = useState<Photo | null>(null);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [assignPhoto, setAssignPhoto] = useState<Photo | null>(null);
  const [searchStudent, setSearchStudent] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');

  // Cargar fotos
  const loadPhotos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedEvent !== 'all') params.append('event_id', selectedEvent);
      if (filter !== 'all') params.append('status', filter);

      const response = await fetch(`/api/admin/photos?${params}`);
      const data = await response.json();

      if (data.photos) {
        setPhotos(data.photos);
      } else {
      }
    } catch (error) {
      console.error('Error cargando fotos:', error);
      toast.error('Error al cargar las fotos');
    } finally {
      setLoading(false);
    }
  };

  // Cargar eventos
  const loadEvents = async () => {
    try {
      const response = await fetch('/api/admin/events-simple');
      const data = await response.json();
      if (data.success && data.events) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error cargando eventos:', error);
    }
  };

  useEffect(() => {
    loadPhotos();
    loadEvents();
  }, [selectedEvent, filter]);

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadQueue((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    multiple: true,
  });

  // Upload fotos
  const uploadPhotos = async () => {
    if (uploadQueue.length === 0) {
      toast.error('No hay fotos para subir');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    uploadQueue.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/admin/photos/simple-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${data.successful} fotos subidas correctamente`);

        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((err: any) => {
            toast.error(`Error con ${err.filename}: ${err.error}`);
          });
        }

        setUploadQueue([]);
        loadPhotos(); // Recargar fotos
      } else {
        toast.error(data.error || 'Error al subir las fotos');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setUploading(false);
      setUploadProgress(100);
    }
  };

  // Borrar fotos
  const deletePhotos = async () => {
    if (selectedPhotos.length === 0) {
      toast.error('No hay fotos seleccionadas');
      return;
    }

    if (!confirm(`¿Estás seguro de borrar ${selectedPhotos.length} foto(s)?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: selectedPhotos }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${selectedPhotos.length} foto(s) borrada(s)`);
        setSelectedPhotos([]);
        loadPhotos();
      } else {
        toast.error(data.error || 'Error al borrar fotos');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al borrar fotos');
    }
  };

  // Aprobar/Desaprobar fotos
  const toggleApproval = async () => {
    if (selectedPhotos.length === 0) {
      toast.error('No hay fotos seleccionadas');
      return;
    }

    try {
      const response = await fetch('/api/admin/photos/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoIds: selectedPhotos,
          approved: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${selectedPhotos.length} foto(s) aprobada(s)`);
        setSelectedPhotos([]);
        loadPhotos();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al aprobar fotos');
    }
  };

  // Manejar asignación de foto
  const handleAssignPhoto = (photo: Photo) => {
    setAssignPhoto(photo);
    setSearchStudent('');
    setSelectedStudent('');
    loadStudents();
  };

  // Cargar estudiantes
  const loadStudents = async () => {
    try {
      const response = await fetch('/api/admin/subjects');
      const data = await response.json();
      if (data.success && data.subjects) {
        setStudents(data.subjects);
      }
    } catch (error) {
      console.error('Error cargando estudiantes:', error);
    }
  };

  // Asignar foto a estudiante
  const assignPhotoToStudent = async () => {
    if (!assignPhoto || !selectedStudent) {
      toast.error('Selecciona un estudiante');
      return;
    }

    try {
      const response = await fetch('/api/admin/tagging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_id: assignPhoto.id,
          subject_id: selectedStudent,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Foto asignada correctamente');
        setAssignPhoto(null);
        loadPhotos();
      } else {
        toast.error(data.error || 'Error al asignar foto');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al asignar foto');
    }
  };

  // Editar foto
  const savePhotoEdit = async () => {
    if (!editPhoto) return;

    try {
      const response = await fetch(`/api/admin/photos/${editPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_filename: editPhoto.original_filename,
          approved: editPhoto.approved,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Foto actualizada');
        setEditPhoto(null);
        loadPhotos();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar foto');
    }
  };

  // Generar URL firmada para ver foto (ahora se espera que el server la provea en props de cada foto)
  const getSignedUrl = async (path: string): Promise<string> => {
    return path;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Fotos</h1>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Upload Area */}
      <Card className="mb-6 p-6">
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          {isDragActive ? (
            <p className="text-lg">Suelta las fotos aquí...</p>
          ) : (
            <div>
              <p className="mb-2 text-lg">
                Arrastra fotos aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-500">
                JPG, PNG, WebP (máximo 10MB por archivo)
              </p>
            </div>
          )}
        </div>

        {uploadQueue.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                {uploadQueue.length} archivos listos para subir
              </span>
              <Button
                onClick={() => setUploadQueue([])}
                variant="ghost"
                size="sm"
              >
                Limpiar
              </Button>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {uploadQueue.map((file, idx) => (
                <div
                  key={idx}
                  className="rounded bg-gray-100 px-2 py-1 text-xs"
                >
                  {file.name}
                </div>
              ))}
            </div>
            <Button
              onClick={uploadPhotos}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                `Subir ${uploadQueue.length} foto(s)`
              )}
            </Button>
            {uploading && <Progress value={uploadProgress} className="mt-2" />}
          </div>
        )}
      </Card>

      {/* Filtros y Acciones */}
      <Card className="mb-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos los eventos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los eventos</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Todas las fotos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="approved">Aprobadas</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="tagged">Etiquetadas</SelectItem>
                <SelectItem value="untagged">Sin etiquetar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            {selectedPhotos.length > 0 && (
              <>
                <Button onClick={toggleApproval} variant="outline" size="sm">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Aprobar ({selectedPhotos.length})
                </Button>
                <Button onClick={deletePhotos} variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Borrar ({selectedPhotos.length})
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Galería de Fotos */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <Card className="p-12 text-center">
          <ImageIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-lg text-gray-500">No hay fotos</p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {photos.map((photo) => (
            <Card
              key={photo.id}
              className={`group relative cursor-pointer overflow-hidden ${
                selectedPhotos.includes(photo.id) ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => {
                if (selectedPhotos.includes(photo.id)) {
                  setSelectedPhotos((prev) =>
                    prev.filter((id) => id !== photo.id)
                  );
                } else {
                  setSelectedPhotos((prev) => [...prev, photo.id]);
                }
              }}
            >
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                {(photo as any).preview_url ? (
                  <PhotoImage
                    path={(photo as any).preview_url}
                    alt={photo.original_filename}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                )}
              </div>

              <div className="p-2">
                <p className="truncate text-xs">{photo.original_filename}</p>
                <div className="mt-1 flex gap-1">
                  {photo.approved && (
                    <span className="rounded bg-green-100 px-1 text-xs text-green-800">
                      Aprobada
                    </span>
                  )}
                  {photo.tagged && (
                    <span className="rounded bg-blue-100 px-1 text-xs text-blue-800">
                      Etiquetada
                    </span>
                  )}
                </div>
              </div>

              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewPhoto(photo);
                  }}
                  title="Ver foto"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignPhoto(photo);
                  }}
                  title="Asignar a estudiante"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditPhoto(photo);
                  }}
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedPhotos.includes(photo.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPhotos((prev) => [...prev, photo.id]);
                      } else {
                        setSelectedPhotos((prev) =>
                          prev.filter((id) => id !== photo.id)
                        );
                      }
                    }}
                  />
                  <div>
                    <p className="font-medium">{photo.original_filename}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(photo.created_at).toLocaleDateString()}
                      {photo.width &&
                        photo.height &&
                        ` • ${photo.width}x${photo.height}`}
                      {photo.file_size &&
                        ` • ${(photo.file_size / 1024 / 1024).toFixed(2)}MB`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {photo.approved && (
                    <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">
                      Aprobada
                    </span>
                  )}
                  {photo.tagged && (
                    <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                      Etiquetada
                    </span>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setViewPhoto(photo)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditPhoto(photo)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Dialog Ver Foto */}
      <Dialog open={!!viewPhoto} onOpenChange={() => setViewPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewPhoto?.original_filename}</DialogTitle>
          </DialogHeader>
          <div className="relative min-h-[400px] overflow-hidden rounded-lg bg-gray-100">
            {viewPhoto?.preview_path ? (
              <PhotoImage
                path={viewPhoto.preview_path}
                alt={viewPhoto.original_filename}
              />
            ) : (
              <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Foto */}
      <Dialog open={!!editPhoto} onOpenChange={() => setEditPhoto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Foto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="filename">Nombre del archivo</Label>
              <Input
                id="filename"
                value={editPhoto?.original_filename || ''}
                onChange={(e) =>
                  setEditPhoto((prev) =>
                    prev ? { ...prev, original_filename: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="approved"
                checked={editPhoto?.approved || false}
                onCheckedChange={(checked) =>
                  setEditPhoto((prev) =>
                    prev ? { ...prev, approved: !!checked } : null
                  )
                }
              />
              <Label htmlFor="approved">Foto aprobada</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPhoto(null)}>
              Cancelar
            </Button>
            <Button onClick={savePhotoEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Asignar Foto */}
      <Dialog open={!!assignPhoto} onOpenChange={() => setAssignPhoto(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asignar Foto a Estudiante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(assignPhoto as any)?.preview_url && (
              <div className="relative h-48 overflow-hidden rounded-lg bg-gray-100">
                <PhotoImage
                  path={(assignPhoto as any).preview_url}
                  alt={assignPhoto.original_filename}
                />
              </div>
            )}

            <div>
              <Label htmlFor="search">Buscar estudiante</Label>
              <Input
                id="search"
                placeholder="Escribir nombre del estudiante..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>O escanear código QR</Label>
              <Button variant="outline" className="w-full">
                <QrCode className="mr-2 h-4 w-4" />
                Escanear QR del estudiante
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border p-2">
              {students
                .filter(
                  (s) =>
                    !searchStudent ||
                    s.name.toLowerCase().includes(searchStudent.toLowerCase())
                )
                .map((student) => (
                  <div
                    key={student.id}
                    className={`cursor-pointer rounded p-2 hover:bg-gray-100 ${
                      selectedStudent === student.id ? 'bg-blue-100' : ''
                    }`}
                    onClick={() => setSelectedStudent(student.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-500">
                          {student.grade} • {student.school_name}
                        </p>
                      </div>
                      {student.photo_count > 0 && (
                        <span className="rounded bg-gray-200 px-2 py-1 text-xs">
                          {student.photo_count} fotos
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {selectedStudent && (
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  Estudiante seleccionado:{' '}
                  <strong>
                    {students.find((s) => s.id === selectedStudent)?.name}
                  </strong>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignPhoto(null)}>
              Cancelar
            </Button>
            <Button onClick={assignPhotoToStudent} disabled={!selectedStudent}>
              Asignar Foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  User,
  Camera,
  CheckCircle,
  Clock,
  AlertTriangle,
  Grid,
  List,
  Filter,
  Search,
  X,
  Eye,
  Trash2,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QRScanner } from './QRScanner';
import { VirtualPhotoGrid } from '@/components/ui/virtual-photo-grid';
import { useToast } from '@/components/ui/feedback';
import { AccessibleButton, AccessibleField } from '@/components/ui/accessible';
import { cn } from '@/lib/utils/cn';

interface Photo {
  id: string;
  filename: string;
  storage_path: string;
  created_at: string;
  signed_url: string;
  metadata?: {
    width: number;
    height: number;
    size: number;
  };
  assignments: Assignment[];
  status: 'untagged' | 'tagged' | 'review';
}

interface Assignment {
  id: string;
  subject_id: string;
  subject_name: string;
  subject_type: 'student' | 'couple' | 'family';
  created_at: string;
  confidence?: number;
}

interface Subject {
  id: string;
  name: string;
  type: 'student' | 'couple' | 'family';
  token: string;
  event_id: string;
  created_at: string;
}

interface PhotoTaggingInterfaceProps {
  eventId: string;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'untagged' | 'tagged' | 'review';

export function PhotoTaggingInterface({
  eventId,
  className,
}: PhotoTaggingInterfaceProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [tagging, setTagging] = useState(false);
  const [selectedPhotoForPreview, setSelectedPhotoForPreview] =
    useState<Photo | null>(null);

  const { addToast } = useToast();

  // Load photos and subjects
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [photosResponse, subjectsResponse] = await Promise.all([
        fetch(`/api/admin/photos?event_id=${eventId}&include_assignments=true`),
        fetch(`/api/admin/subjects?event_id=${eventId}`),
      ]);

      if (!photosResponse.ok || !subjectsResponse.ok) {
        throw new Error('Error cargando datos');
      }

      const [photosData, subjectsData] = await Promise.all([
        photosResponse.json(),
        subjectsResponse.json(),
      ]);

      setPhotos(photosData.photos || []);
      setSubjects(subjectsData.subjects || []);
    } catch (error) {
      console.error('Error loading data:', error);
      addToast({
        type: 'error',
        title: 'Error cargando datos',
        description: 'No se pudieron cargar las fotos y sujetos',
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle QR scan
  const handleQRScan = useCallback(
    async (token: string) => {
      const subject = subjects.find((s) => s.token === token);

      if (!subject) {
        addToast({
          type: 'error',
          title: 'Token no encontrado',
          description:
            'El token escaneado no pertenece a ningún sujeto de este evento',
        });
        return;
      }

      setSelectedSubject(subject);

      addToast({
        type: 'success',
        title: 'Sujeto seleccionado',
        description: `Ahora puedes asignar fotos a ${subject.name}`,
      });
    },
    [subjects, addToast]
  );

  // Handle photo selection
  const handlePhotoToggle = useCallback((photo: Photo) => {
    setSelectedPhotos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photo.id)) {
        newSet.delete(photo.id);
      } else {
        newSet.add(photo.id);
      }
      return newSet;
    });
  }, []);

  // Tag selected photos
  const tagSelectedPhotos = useCallback(async () => {
    if (!selectedSubject || selectedPhotos.size === 0) return;

    try {
      setTagging(true);

      const response = await fetch('/api/admin/tagging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_ids: Array.from(selectedPhotos),
          subject_id: selectedSubject.id,
          event_id: eventId,
        }),
      });

      if (!response.ok) {
        throw new Error('Error asignando fotos');
      }

      const result = await response.json();

      // Update photos state
      setPhotos((prev) =>
        prev.map((photo) => {
          if (selectedPhotos.has(photo.id)) {
            return {
              ...photo,
              assignments: [
                ...photo.assignments,
                {
                  id: `temp-${Date.now()}`,
                  subject_id: selectedSubject.id,
                  subject_name: selectedSubject.name,
                  subject_type: selectedSubject.type,
                  created_at: new Date().toISOString(),
                },
              ],
              status: 'tagged' as const,
            };
          }
          return photo;
        })
      );

      // Clear selections
      setSelectedPhotos(new Set());

      addToast({
        type: 'success',
        title: 'Fotos asignadas',
        description: `${selectedPhotos.size} fotos asignadas a ${selectedSubject.name}`,
      });
    } catch (error) {
      console.error('Error tagging photos:', error);
      addToast({
        type: 'error',
        title: 'Error asignando fotos',
        description: 'No se pudieron asignar las fotos al sujeto',
      });
    } finally {
      setTagging(false);
    }
  }, [selectedSubject, selectedPhotos, eventId, addToast]);

  // Remove assignment
  const removeAssignment = useCallback(
    async (photoId: string, assignmentId: string) => {
      try {
        const response = await fetch(`/api/admin/tagging/${assignmentId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Error removiendo asignación');
        }

        // Update photos state
        setPhotos((prev) =>
          prev.map((photo) => {
            if (photo.id === photoId) {
              const newAssignments = photo.assignments.filter(
                (a) => a.id !== assignmentId
              );
              return {
                ...photo,
                assignments: newAssignments,
                status:
                  newAssignments.length === 0
                    ? ('untagged' as const)
                    : ('tagged' as const),
              };
            }
            return photo;
          })
        );

        addToast({
          type: 'success',
          title: 'Asignación removida',
          description: 'La asignación se removió correctamente',
        });
      } catch (error) {
        console.error('Error removing assignment:', error);
        addToast({
          type: 'error',
          title: 'Error',
          description: 'No se pudo remover la asignación',
        });
      }
    },
    [addToast]
  );

  // Filter photos
  const filteredPhotos = photos.filter((photo) => {
    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'untagged' && photo.assignments.length > 0)
        return false;
      if (filterStatus === 'tagged' && photo.assignments.length === 0)
        return false;
      if (filterStatus === 'review' && photo.status !== 'review') return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        photo.filename.toLowerCase().includes(query) ||
        photo.assignments.some((a) =>
          a.subject_name.toLowerCase().includes(query)
        )
      );
    }

    return true;
  });

  // Stats
  const stats = {
    total: photos.length,
    untagged: photos.filter((p) => p.assignments.length === 0).length,
    tagged: photos.filter((p) => p.assignments.length > 0).length,
    selected: selectedPhotos.size,
  };

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              <p>Cargando fotos y sujetos...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-purple-600" />
              Etiquetado de Fotos
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-green-600">
                {stats.tagged} etiquetadas
              </span>
              <span className="font-medium text-amber-600">
                {stats.untagged} sin etiquetar
              </span>
              <span className="text-gray-500">de {stats.total} total</span>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* QR Scanner */}
        <div className="lg:col-span-1">
          <QRScanner onScan={handleQRScan} />

          {/* Selected Subject */}
          {selectedSubject && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sujeto Seleccionado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 p-2">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedSubject.name}</p>
                    <p className="text-sm capitalize text-gray-600">
                      {selectedSubject.type}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-2">
                  <AccessibleButton
                    onClick={tagSelectedPhotos}
                    disabled={selectedPhotos.size === 0 || tagging}
                    variant="primary"
                    className="w-full"
                    ariaLabel={`Asignar ${selectedPhotos.size} fotos seleccionadas a ${selectedSubject.name}`}
                  >
                    <Tag className="mr-2 h-4 w-4" />
                    {tagging
                      ? 'Asignando...'
                      : `Asignar ${selectedPhotos.size} fotos`}
                  </AccessibleButton>
                </div>

                <AccessibleButton
                  onClick={() => setSelectedSubject(null)}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  Cambiar sujeto
                </AccessibleButton>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Photos Section */}
        <div className="space-y-4 lg:col-span-2">
          {/* Controls */}
          <Card>
            <CardContent className="space-y-4 p-4">
              {/* Search */}
              <AccessibleField label="Buscar fotos" id="photo-search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="photo-search"
                    type="text"
                    placeholder="Buscar por nombre de archivo o sujeto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-10 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-gray-100"
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </AccessibleField>

              {/* Filters and View Mode */}
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex gap-2">
                  {(
                    ['all', 'untagged', 'tagged', 'review'] as FilterStatus[]
                  ).map((status) => (
                    <AccessibleButton
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      variant={filterStatus === status ? 'primary' : 'ghost'}
                      size="sm"
                      className="text-xs"
                    >
                      {status === 'all' && 'Todas'}
                      {status === 'untagged' && 'Sin etiquetar'}
                      {status === 'tagged' && 'Etiquetadas'}
                      {status === 'review' && 'Revisar'}
                    </AccessibleButton>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <AccessibleButton
                    onClick={() => setViewMode('grid')}
                    variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                    size="sm"
                    ariaLabel="Vista en grilla"
                  >
                    <Grid className="h-4 w-4" />
                  </AccessibleButton>
                  <AccessibleButton
                    onClick={() => setViewMode('list')}
                    variant={viewMode === 'list' ? 'primary' : 'ghost'}
                    size="sm"
                    ariaLabel="Vista en lista"
                  >
                    <List className="h-4 w-4" />
                  </AccessibleButton>
                </div>
              </div>

              {/* Selection actions */}
              {selectedPhotos.size > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-3">
                  <span className="text-sm font-medium text-purple-700">
                    {selectedPhotos.size} fotos seleccionadas
                  </span>
                  <div className="flex gap-2">
                    <AccessibleButton
                      onClick={() => setSelectedPhotos(new Set())}
                      variant="ghost"
                      size="sm"
                      className="text-purple-700"
                    >
                      Limpiar selección
                    </AccessibleButton>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos Grid/List */}
          {viewMode === 'grid' ? (
            <VirtualPhotoGrid
              photos={filteredPhotos}
              selectedPhotos={selectedPhotos}
              onTogglePhoto={handlePhotoToggle}
              onViewPhoto={setSelectedPhotoForPreview}
              className="min-h-96"
            />
          ) : (
            <PhotoList
              photos={filteredPhotos}
              selectedPhotos={selectedPhotos}
              onTogglePhoto={handlePhotoToggle}
              onViewPhoto={setSelectedPhotoForPreview}
              onRemoveAssignment={removeAssignment}
            />
          )}
        </div>
      </div>

      {/* Photo Preview Modal */}
      {selectedPhotoForPreview && (
        <PhotoPreviewModal
          photo={selectedPhotoForPreview}
          onClose={() => setSelectedPhotoForPreview(null)}
          onRemoveAssignment={removeAssignment}
        />
      )}
    </div>
  );
}

// Photo List Component
interface PhotoListProps {
  photos: Photo[];
  selectedPhotos: Set<string>;
  onTogglePhoto: (photo: Photo) => void;
  onViewPhoto: (photo: Photo) => void;
  onRemoveAssignment: (photoId: string, assignmentId: string) => void;
}

function PhotoList({
  photos,
  selectedPhotos,
  onTogglePhoto,
  onViewPhoto,
  onRemoveAssignment,
}: PhotoListProps) {
  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Camera className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-600">
            No hay fotos
          </h3>
          <p className="text-gray-500">
            No se encontraron fotos con los filtros actuales
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {photos.map((photo) => (
        <Card key={photo.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Selection checkbox */}
              <button
                onClick={() => onTogglePhoto(photo)}
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                  selectedPhotos.has(photo.id)
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-gray-300 hover:border-purple-400'
                )}
                aria-label={`${selectedPhotos.has(photo.id) ? 'Deseleccionar' : 'Seleccionar'} foto ${photo.filename}`}
              >
                {selectedPhotos.has(photo.id) && (
                  <CheckCircle className="h-3 w-3" />
                )}
              </button>

              {/* Thumbnail */}
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
                <img
                  src={photo.signed_url}
                  alt={photo.filename}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Photo info */}
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-medium text-gray-900">
                  {photo.filename}
                </h4>
                <p className="text-sm text-gray-600">
                  {new Date(photo.created_at).toLocaleDateString('es-AR')}
                </p>

                {/* Assignments */}
                {photo.assignments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {photo.assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between rounded bg-green-50 px-2 py-1 text-xs text-green-700"
                      >
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {assignment.subject_name}
                        </span>
                        <button
                          onClick={() =>
                            onRemoveAssignment(photo.id, assignment.id)
                          }
                          className="p-1 text-red-600 hover:text-red-700"
                          aria-label={`Remover asignación de ${assignment.subject_name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <AccessibleButton
                  onClick={() => onViewPhoto(photo)}
                  variant="ghost"
                  size="sm"
                  ariaLabel={`Ver foto ${photo.filename} en grande`}
                >
                  <Eye className="h-4 w-4" />
                </AccessibleButton>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Photo Preview Modal
interface PhotoPreviewModalProps {
  photo: Photo;
  onClose: () => void;
  onRemoveAssignment: (photoId: string, assignmentId: string) => void;
}

function PhotoPreviewModal({
  photo,
  onClose,
  onRemoveAssignment,
}: PhotoPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="max-h-[90vh] max-w-4xl overflow-hidden rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h3 className="font-semibold text-gray-900">{photo.filename}</h3>
            <p className="text-sm text-gray-600">
              {new Date(photo.created_at).toLocaleDateString('es-AR')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Cerrar vista previa"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image */}
        <div className="relative max-h-96 overflow-auto">
          <img
            src={photo.signed_url}
            alt={photo.filename}
            className="h-auto w-full"
          />
        </div>

        {/* Assignments */}
        {photo.assignments.length > 0 && (
          <div className="border-t p-4">
            <h4 className="mb-3 font-medium text-gray-900">Asignaciones</h4>
            <div className="space-y-2">
              {photo.assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {assignment.subject_name}
                    </span>
                    <span className="text-sm capitalize text-gray-500">
                      ({assignment.subject_type})
                    </span>
                  </div>
                  <button
                    onClick={() => onRemoveAssignment(photo.id, assignment.id)}
                    className="rounded-md p-1 text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={`Remover asignación de ${assignment.subject_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Users,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  grade_section?: string;
}

interface Folder {
  id: string;
  name: string;
  path: string;
  photo_count: number;
}

interface AssignFolderPhotosProps {
  eventId: string;
  currentFolderId?: string | null;
  currentFolderName?: string;
  onAssignmentComplete?: () => void;
}

export function AssignFolderPhotos({
  eventId,
  currentFolderId,
  currentFolderName,
  onAssignmentComplete,
}: AssignFolderPhotosProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    currentFolderId || null
  );
  const [assignmentMode, setAssignmentMode] = useState<
    'all_to_all' | 'sequential' | 'qr_detection'
  >('all_to_all');
  const [forceReassign, setForceReassign] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Load subjects and folders on mount
  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoadingData(true);

      // Load subjects
      const subjectsResponse = await globalThis.fetch(
        `/api/admin/events/${eventId}/subjects`
      );
      const subjectsData = await subjectsResponse.json();

      if (subjectsData.success) {
        setSubjects(subjectsData.subjects || []);
      }

      // Load folders
      const foldersResponse = await globalThis.fetch(
        `/api/admin/events/${eventId}/folders`
      );
      const foldersData = await foldersResponse.json();

      if (foldersData.success) {
        setFolders(foldersData.folders || []);
      }
    } catch (error) {
      toast.error('Error al cargar los datos');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const selectAllSubjects = () => {
    setSelectedSubjects(subjects.map((s) => s.id));
  };

  const clearAllSubjects = () => {
    setSelectedSubjects([]);
  };

  const handleAssign = async () => {
    if (selectedSubjects.length === 0) {
      toast.error('Selecciona al menos un estudiante');
      return;
    }

    try {
      setLoading(true);

      const response = await globalThis.fetch(
        `/api/admin/events/${eventId}/assign-folder-photos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderId: selectedFolderId,
            subjectIds: selectedSubjects,
            assignmentMode,
            forceReassign,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error en la asignación');
      }

      const { summary } = result;

      toast.success(
        `Asignación completada: ${summary.assignedCount} asignaciones creadas para ${summary.totalPhotos} fotos y ${summary.totalSubjects} estudiantes`,
        { duration: 5000 }
      );

      // Call callback to refresh parent component
      if (onAssignmentComplete) {
        onAssignmentComplete();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al asignar fotos'
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);
  const photoCount = selectedFolder?.photo_count || 0;
  const totalAssignments = selectedSubjects.length * photoCount;

  if (loadingData) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Clock className="h-5 w-5 animate-spin" />
            <span>Cargando datos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Asignar Fotos a Estudiantes</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Folder Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Carpeta de origen</label>
          <Select
            value={selectedFolderId || undefined}
            onValueChange={(value) =>
              setSelectedFolderId(value === 'all' ? null : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar carpeta..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                🌐 Todas las fotos del evento (sin asignar)
              </SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  📁 {folder.path} ({folder.photo_count} fotos)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentFolderName && selectedFolderId === currentFolderId && (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              📍 Carpeta actual: {currentFolderName}
            </p>
          )}
        </div>

        {/* Assignment Mode */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Modo de asignación</label>
          <Select
            value={assignmentMode}
            onValueChange={(value: any) => setAssignmentMode(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_to_all">
                🔄 Todas las fotos a todos los estudiantes (recomendado)
              </SelectItem>
              <SelectItem value="sequential">
                🔢 Distribuir fotos secuencialmente entre estudiantes
              </SelectItem>
              <SelectItem value="qr_detection">
                📱 Detección automática por QR (próximamente)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Subject Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Estudiantes ({selectedSubjects.length} seleccionados)
            </label>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={selectAllSubjects}>
                Todos
              </Button>
              <Button variant="outline" size="sm" onClick={clearAllSubjects}>
                Ninguno
              </Button>
            </div>
          </div>

          <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
            {subjects.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 py-4 text-center text-sm">
                No hay estudiantes en este evento
              </p>
            ) : (
              subjects.map((subject) => (
                <div key={subject.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={subject.id}
                    checked={selectedSubjects.includes(subject.id)}
                    onCheckedChange={() => handleSubjectToggle(subject.id)}
                  />
                  <label
                    htmlFor={subject.id}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {subject.name}
                    {subject.grade_section && (
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        ({subject.grade_section})
                      </span>
                    )}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="force-reassign"
              checked={forceReassign}
              onCheckedChange={(checked) =>
                setForceReassign(checked as boolean)
              }
            />
            <label htmlFor="force-reassign" className="cursor-pointer text-sm">
              Reasignar fotos ya asignadas
            </label>
          </div>
        </div>

        {/* Summary */}
        {selectedSubjects.length > 0 && photoCount > 0 && (
          <div className="bg-muted/50 space-y-2 rounded-lg p-4">
            <h4 className="flex items-center space-x-2 font-medium">
              <ImageIcon className="h-4 w-4" />
              <span>Resumen de asignación</span>
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Fotos:</span>{' '}
                {photoCount.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Estudiantes:</span>{' '}
                {selectedSubjects.length}
              </div>
              <div className="col-span-2">
                <span className="font-medium">Total asignaciones:</span>{' '}
                <Badge variant="secondary">
                  {totalAssignments.toLocaleString()}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleAssign}
          disabled={
            loading || selectedSubjects.length === 0 || photoCount === 0
          }
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Asignando...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Asignar {photoCount} fotos a {selectedSubjects.length} estudiantes
            </>
          )}
        </Button>

        {/* Warning */}
        <div className="text-gray-500 dark:text-gray-400 flex items-start space-x-2 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            Esta acción creará las conexiones necesarias para que las fotos
            aparezcan en las galerías para clientes. Los invitados podrán ver
            estas fotos cuando accedan con su token de cliente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

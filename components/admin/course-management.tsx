'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Camera,
  Settings,
  Archive,
  Eye,
  Copy,
  Download,
  Upload,
  RefreshCw,
  BookOpen,
  GraduationCap,
  MoreVertical,
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  grade?: string;
  section?: string;
  level_id?: string;
  level_name?: string;
  description?: string;
  sort_order: number;
  active: boolean;
  student_count?: number;
  photo_count?: number;
  group_photo_count?: number;
  created_at: string;
  updated_at: string;
}

interface Level {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  active: boolean;
}

interface CourseFormData {
  name: string;
  grade: string;
  section: string;
  level_id?: string;
  description: string;
  active: boolean;
  sort_order: number;
}

interface CourseManagementProps {
  eventId: string;
  initialCourses?: Course[];
  onCourseUpdate?: () => void;
}

export default function CourseManagement({
  eventId,
  initialCourses = [],
  onCourseUpdate,
}: CourseManagementProps) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState<CourseFormData>({
    name: '',
    grade: '',
    section: '',
    level_id: '',
    description: '',
    active: true,
    sort_order: 0,
  });

  // Load initial data
  useEffect(() => {
    loadCourses();
    loadLevels();
  }, [eventId]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/events/${eventId}/courses`);
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
        onCourseUpdate?.();
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Error al cargar cursos');
    } finally {
      setLoading(false);
    }
  };

  const loadLevels = async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/levels`);
      if (response.ok) {
        const data = await response.json();
        setLevels(data.levels || []);
      }
    } catch (error) {
      console.error('Error loading levels:', error);
    }
  };

  const handleCreateCourse = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('El nombre del curso es requerido');
        return;
      }

      setLoading(true);
      const response = await fetch(`/api/admin/events/${eventId}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          event_id: eventId,
          sort_order: formData.sort_order || courses.length,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error creating course');
      }

      const data = await response.json();
      setCourses((prev) => [...prev, data.course]);
      setShowCreateDialog(false);
      resetForm();
      toast.success('Curso creado exitosamente');
      onCourseUpdate?.();
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al crear curso'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;

    try {
      if (!formData.name.trim()) {
        toast.error('El nombre del curso es requerido');
        return;
      }

      setLoading(true);
      const response = await fetch(
        `/api/admin/events/${eventId}/courses/${editingCourse.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error updating course');
      }

      const data = await response.json();
      setCourses((prev) =>
        prev.map((c) => (c.id === editingCourse.id ? data.course : c))
      );
      setEditingCourse(null);
      resetForm();
      toast.success('Curso actualizado exitosamente');
      onCourseUpdate?.();
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al actualizar curso'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (course: Course) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar el curso "${course.name}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/events/${eventId}/courses/${course.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error deleting course');
      }

      setCourses((prev) => prev.filter((c) => c.id !== course.id));
      toast.success('Curso eliminado exitosamente');
      onCourseUpdate?.();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al eliminar curso'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateCourse = async (course: Course) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/events/${eventId}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${course.name} (Copia)`,
          grade: course.grade,
          section: course.section,
          level_id: course.level_id,
          description: course.description,
          active: course.active,
          sort_order: courses.length,
          event_id: eventId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error duplicating course');
      }

      const data = await response.json();
      setCourses((prev) => [...prev, data.course]);
      toast.success('Curso duplicado exitosamente');
      onCourseUpdate?.();
    } catch (error) {
      console.error('Error duplicating course:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al duplicar curso'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: string, courseIds: string[]) => {
    if (courseIds.length === 0) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/events/${eventId}/courses/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            course_ids: courseIds,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Error executing ${action}`);
      }

      await loadCourses();
      toast.success(`Acción "${action}" ejecutada exitosamente`);
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
      toast.error(
        error instanceof Error ? error.message : `Error al ejecutar ${action}`
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      grade: '',
      section: '',
      level_id: '',
      description: '',
      active: true,
      sort_order: 0,
    });
  };

  const openEditDialog = (course: Course) => {
    setFormData({
      name: course.name,
      grade: course.grade || '',
      section: course.section || '',
      level_id: course.level_id || '',
      description: course.description || '',
      active: course.active,
      sort_order: course.sort_order,
    });
    setEditingCourse(course);
  };

  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.grade &&
        course.grade.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (course.section &&
        course.section.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (course.level_name &&
        course.level_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Course Form Component
  const CourseForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-4 py-4">
      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nombre del Curso *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="ej: Matemáticas Avanzadas"
          />
        </div>
        <div>
          <Label htmlFor="level">Nivel Educativo</Label>
          <Select
            value={formData.level_id}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, level_id: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar nivel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin nivel</SelectItem>
              {levels.map((level) => (
                <SelectItem key={level.id} value={level.id}>
                  {level.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="grade">Grado</Label>
          <Input
            id="grade"
            value={formData.grade}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, grade: e.target.value }))
            }
            placeholder="ej: 5º, Preescolar"
          />
        </div>
        <div>
          <Label htmlFor="section">Sección</Label>
          <Input
            id="section"
            value={formData.section}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, section: e.target.value }))
            }
            placeholder="ej: A, Verde, Mañana"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Descripción opcional del curso..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sort_order">Orden de visualización</Label>
          <Input
            id="sort_order"
            type="number"
            value={formData.sort_order}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                sort_order: parseInt(e.target.value) || 0,
              }))
            }
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="active"
            checked={formData.active}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, active: checked }))
            }
          />
          <Label htmlFor="active">Curso activo</Label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Cursos</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Administra los cursos y clases del evento
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadCourses} variant="outline" disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Actualizar
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Curso
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Curso</DialogTitle>
                <DialogDescription>
                  Agrega un nuevo curso o clase al evento
                </DialogDescription>
              </DialogHeader>
              <CourseForm />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateCourse} disabled={loading}>
                  {loading && (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Crear Curso
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <Input
          placeholder="Buscar cursos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Badge variant="secondary">{filteredCourses.length} cursos</Badge>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="group relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-lg">
                      {course.name}
                    </CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      {course.grade && (
                        <Badge variant="outline" className="text-xs">
                          {course.grade}
                        </Badge>
                      )}
                      {course.section && (
                        <Badge variant="outline" className="text-xs">
                          {course.section}
                        </Badge>
                      )}
                      {course.level_name && (
                        <Badge variant="secondary" className="text-xs">
                          {course.level_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={course.active ? 'default' : 'secondary'}>
                      {course.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Description */}
                  {course.description && (
                    <p className="text-gray-500 dark:text-gray-400 line-clamp-2 text-sm">
                      {course.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <Users className="text-gray-500 dark:text-gray-400 mx-auto mb-1 h-4 w-4" />
                      <p className="text-sm font-medium">
                        {course.student_count || 0}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        Estudiantes
                      </p>
                    </div>
                    <div>
                      <Camera className="text-gray-500 dark:text-gray-400 mx-auto mb-1 h-4 w-4" />
                      <p className="text-sm font-medium">
                        {course.photo_count || 0}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Fotos</p>
                    </div>
                    <div>
                      <BookOpen className="text-gray-500 dark:text-gray-400 mx-auto mb-1 h-4 w-4" />
                      <p className="text-sm font-medium">
                        {course.group_photo_count || 0}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Grupales</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        router.push(
                          `/admin/events/${eventId}?view=students&course=${course.id}`
                        )
                      }
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(course)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicateCourse(course)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCourse(course)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Metadata */}
                  <div className="text-gray-500 dark:text-gray-400 border-t pt-2 text-xs">
                    Creado:{' '}
                    {new Date(course.created_at).toLocaleDateString('es-AR')}
                    {course.updated_at !== course.created_at && (
                      <span>
                        {' '}
                        • Modificado:{' '}
                        {new Date(course.updated_at).toLocaleDateString(
                          'es-AR'
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="text-gray-500 dark:text-gray-400 mx-auto mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-medium">No hay cursos</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm
                ? 'No se encontraron cursos con esos criterios'
                : 'Comienza agregando tu primer curso'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primer Curso
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editingCourse}
        onOpenChange={() => setEditingCourse(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Curso</DialogTitle>
            <DialogDescription>
              Modifica la información del curso
            </DialogDescription>
          </DialogHeader>
          <CourseForm isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCourse(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCourse} disabled={loading}>
              {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar Curso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Archive,
  Download,
  Upload,
  Users,
  Camera,
  BookOpen,
  MoreHorizontal,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  CheckCircle,
  Circle,
  AlertTriangle,
  GraduationCap,
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

interface EventLevel {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  active: boolean;
}

interface EnhancedCourseManagementProps {
  eventId: string;
  eventName: string;
  courses: Course[];
  levels: EventLevel[];
  onCourseSelect?: (course: Course) => void;
  onRefresh?: () => void;
  enableBulkOperations?: boolean;
}

export default function EnhancedCourseManagement({
  eventId,
  eventName,
  courses,
  levels,
  onCourseSelect,
  onRefresh,
  enableBulkOperations = true,
}: EnhancedCourseManagementProps) {
  // State
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<
    'name' | 'students' | 'photos' | 'created_at'
  >('sort_order');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [loading, setLoading] = useState(false);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');

  // Form state
  const [courseForm, setCourseForm] = useState({
    name: '',
    grade: '',
    section: '',
    level_id: '',
    description: '',
    active: true,
  });

  // Filtered and sorted courses
  const filteredCourses = useMemo(() => {
    let filtered = [...courses];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (course) =>
          course.name.toLowerCase().includes(term) ||
          (course.grade && course.grade.toLowerCase().includes(term)) ||
          (course.section && course.section.toLowerCase().includes(term)) ||
          (course.level_name && course.level_name.toLowerCase().includes(term))
      );
    }

    // Apply level filter
    if (filterLevel) {
      filtered = filtered.filter((course) => course.level_id === filterLevel);
    }

    // Apply active filter
    if (filterActive !== null) {
      filtered = filtered.filter((course) => course.active === filterActive);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'students':
          aValue = a.student_count || 0;
          bValue = b.student_count || 0;
          break;
        case 'photos':
          aValue = a.photo_count || 0;
          bValue = b.photo_count || 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          aValue = a.sort_order;
          bValue = b.sort_order;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [courses, searchTerm, filterLevel, filterActive, sortBy, sortOrder]);

  // Selection handlers
  const handleCourseToggle = useCallback(
    (courseId: string, selected: boolean) => {
      setSelectedCourses((prev) => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(courseId);
        } else {
          newSet.delete(courseId);
        }
        return newSet;
      });
    },
    []
  );

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedCourses(new Set(filteredCourses.map((c) => c.id)));
      } else {
        setSelectedCourses(new Set());
      }
    },
    [filteredCourses]
  );

  // CRUD operations
  const handleCreateCourse = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseForm),
      });

      if (response.ok) {
        setCreateDialogOpen(false);
        setCourseForm({
          name: '',
          grade: '',
          section: '',
          level_id: '',
          description: '',
          active: true,
        });
        onRefresh?.();
      } else {
        throw new Error('Failed to create course');
      }
    } catch (error) {
      console.error('Error creating course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCourse = async () => {
    if (!editingCourse) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/courses/${editingCourse.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(courseForm),
        }
      );

      if (response.ok) {
        setEditingCourse(null);
        onRefresh?.();
      } else {
        throw new Error('Failed to update course');
      }
    } catch (error) {
      console.error('Error updating course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!selectedBulkAction || selectedCourses.size === 0) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/courses/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: selectedBulkAction,
            course_ids: Array.from(selectedCourses),
          }),
        }
      );

      if (response.ok) {
        setBulkActionDialogOpen(false);
        setSelectedBulkAction('');
        setSelectedCourses(new Set());
        onRefresh?.();
      } else {
        throw new Error('Failed to perform bulk action');
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      name: course.name,
      grade: course.grade || '',
      section: course.section || '',
      level_id: course.level_id || '',
      description: course.description || '',
      active: course.active,
    });
  };

  // Course Card Component
  const CourseCard = ({ course }: { course: Course }) => {
    const selected = selectedCourses.has(course.id);

    return (
      <Card className="group transition-all duration-200 hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {enableBulkOperations && (
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) =>
                    handleCourseToggle(course.id, !!checked)
                  }
                  aria-label={`Select ${course.name}`}
                />
              )}
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-lg">
                  {course.name}
                </CardTitle>
                {(course.grade || course.section) && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {course.grade} {course.section && `- ${course.section}`}
                  </p>
                )}
                {course.level_name && (
                  <Badge variant="outline" className="mt-1">
                    <GraduationCap className="mr-1 h-3 w-3" />
                    {course.level_name}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={course.active ? 'default' : 'secondary'}>
                {course.active ? 'Activo' : 'Inactivo'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onCourseSelect?.(course)}>
                    <Users className="mr-2 h-4 w-4" />
                    Ver Estudiantes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEditDialog(course)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {course.description && (
            <p className="text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 text-sm">
              {course.description}
            </p>
          )}

          {/* Stats */}
          <div className="mb-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="mb-1 flex items-center justify-center gap-1">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {course.student_count || 0}
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Estudiantes</p>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center gap-1">
                <Camera className="h-4 w-4 text-primary-600" />
                <span className="text-lg font-bold text-primary-700">
                  {course.photo_count || 0}
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Fotos</p>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center gap-1">
                <BookOpen className="h-4 w-4 text-green-500" />
                <span className="text-lg font-bold text-green-700">
                  {course.group_photo_count || 0}
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Grupales</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onCourseSelect?.(course)}
            >
              <Users className="mr-1 h-3 w-3" />
              Ver Estudiantes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(course)}
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>

          {/* Footer */}
          <div className="text-gray-500 dark:text-gray-400 mt-3 border-t pt-3 text-xs">
            Creado: {new Date(course.created_at).toLocaleDateString('es-AR')}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Cursos</h2>
          <p className="text-gray-500 dark:text-gray-400">
            {eventName} - {filteredCourses.length} cursos encontrados
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Actualizar
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Curso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Curso</DialogTitle>
                <DialogDescription>
                  Agregue un nuevo curso al evento {eventName}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Nombre del Curso
                  </label>
                  <Input
                    value={courseForm.name}
                    onChange={(e) =>
                      setCourseForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="ej. 1º A, Sala Verde"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Grado</label>
                    <Input
                      value={courseForm.grade}
                      onChange={(e) =>
                        setCourseForm((prev) => ({
                          ...prev,
                          grade: e.target.value,
                        }))
                      }
                      placeholder="ej. 1º, 2º"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Sección</label>
                    <Input
                      value={courseForm.section}
                      onChange={(e) =>
                        setCourseForm((prev) => ({
                          ...prev,
                          section: e.target.value,
                        }))
                      }
                      placeholder="ej. A, B, Verde"
                    />
                  </div>
                </div>

                {levels.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">
                      Nivel Educativo
                    </label>
                    <Select
                      value={courseForm.level_id}
                      onValueChange={(value) =>
                        setCourseForm((prev) => ({ ...prev, level_id: value }))
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
                )}

                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <Textarea
                    value={courseForm.description}
                    onChange={(e) =>
                      setCourseForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Descripción opcional del curso"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="active"
                    checked={courseForm.active}
                    onCheckedChange={(checked) =>
                      setCourseForm((prev) => ({ ...prev, active: !!checked }))
                    }
                  />
                  <label htmlFor="active" className="text-sm font-medium">
                    Curso activo
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateCourse}
                  disabled={loading || !courseForm.name}
                >
                  Crear Curso
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-gray-500 dark:text-gray-400 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            placeholder="Buscar cursos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Select
            value={filterLevel || ''}
            onValueChange={(value) => setFilterLevel(value || null)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos los niveles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los niveles</SelectItem>
              {levels.map((level) => (
                <SelectItem key={level.id} value={level.id}>
                  {level.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterActive(null)}>
                Todos los cursos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterActive(true)}>
                Solo activos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterActive(false)}>
                Solo inactivos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Ordenar
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('name')}>
                Por nombre
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('students')}>
                Por estudiantes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('photos')}>
                Por fotos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('created_at')}>
                Por fecha
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bulk Actions */}
      {enableBulkOperations && selectedCourses.size > 0 && (
        <div className="bg-muted/50 flex items-center justify-between rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedCourses.size} curso
              {selectedCourses.size !== 1 ? 's' : ''} seleccionado
              {selectedCourses.size !== 1 ? 's' : ''}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSelectAll(false)}
            >
              Deseleccionar
            </Button>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button size="sm" variant="outline">
              <Archive className="mr-2 h-4 w-4" />
              Archivar
            </Button>
            <Dialog
              open={bulkActionDialogOpen}
              onOpenChange={setBulkActionDialogOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm">Acciones en Lote</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Acción en Lote</DialogTitle>
                  <DialogDescription>
                    Seleccione la acción a realizar en {selectedCourses.size}{' '}
                    curso{selectedCourses.size !== 1 ? 's' : ''}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select
                    value={selectedBulkAction}
                    onValueChange={setSelectedBulkAction}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar acción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activate">Activar cursos</SelectItem>
                      <SelectItem value="deactivate">
                        Desactivar cursos
                      </SelectItem>
                      <SelectItem value="archive">Archivar cursos</SelectItem>
                      <SelectItem value="export">Exportar datos</SelectItem>
                      <SelectItem value="delete">Eliminar cursos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setBulkActionDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleBulkAction}
                    disabled={loading || !selectedBulkAction}
                    variant={
                      selectedBulkAction === 'delete'
                        ? 'destructive'
                        : 'default'
                    }
                  >
                    Ejecutar Acción
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Course Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="text-gray-500 dark:text-gray-400 mx-auto mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-medium">No hay cursos</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm
                ? 'No se encontraron cursos con esos criterios.'
                : 'Comience agregando su primer curso.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primer Curso
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Course Dialog */}
      <Dialog
        open={!!editingCourse}
        onOpenChange={(open) => !open && setEditingCourse(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Curso</DialogTitle>
            <DialogDescription>
              Modifique la información del curso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre del Curso</label>
              <Input
                value={courseForm.name}
                onChange={(e) =>
                  setCourseForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="ej. 1º A, Sala Verde"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Grado</label>
                <Input
                  value={courseForm.grade}
                  onChange={(e) =>
                    setCourseForm((prev) => ({
                      ...prev,
                      grade: e.target.value,
                    }))
                  }
                  placeholder="ej. 1º, 2º"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sección</label>
                <Input
                  value={courseForm.section}
                  onChange={(e) =>
                    setCourseForm((prev) => ({
                      ...prev,
                      section: e.target.value,
                    }))
                  }
                  placeholder="ej. A, B, Verde"
                />
              </div>
            </div>

            {levels.length > 0 && (
              <div>
                <label className="text-sm font-medium">Nivel Educativo</label>
                <Select
                  value={courseForm.level_id}
                  onValueChange={(value) =>
                    setCourseForm((prev) => ({ ...prev, level_id: value }))
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
            )}

            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={courseForm.description}
                onChange={(e) =>
                  setCourseForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Descripción opcional del curso"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-active"
                checked={courseForm.active}
                onCheckedChange={(checked) =>
                  setCourseForm((prev) => ({ ...prev, active: !!checked }))
                }
              />
              <label htmlFor="edit-active" className="text-sm font-medium">
                Curso activo
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCourse(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEditCourse}
              disabled={loading || !courseForm.name}
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

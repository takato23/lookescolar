/**
 * 👥 StudentManagement - Gestión de estudiantes compartida
 * 
 * Componente reutilizable para gestión de estudiantes
 * Usado en EventPhotoManager y PhotoAdmin con contexto de evento
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Plus,
  Search,
  Edit3,
  Trash2,
  FileUser,
  BookOpen,
  School,
  Hash,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  name: string;
  code?: string;
  folder_id?: string;
  course_id?: string;
  course_name?: string;
  photo_count?: number;
}

interface Course {
  id: string;
  name: string;
  student_count?: number;
}

interface StudentManagementProps {
  eventId: string;
  selectedFolderId?: string | null;
  courses?: Course[];
  className?: string;
  compact?: boolean;
}

export function StudentManagement({
  eventId,
  selectedFolderId,
  courses = [],
  className,
  compact = false
}: StudentManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  
  // Nuevo estudiante
  const [newStudent, setNewStudent] = useState({
    name: '',
    code: '',
    course_id: ''
  });

  useEffect(() => {
    fetchStudents();
  }, [eventId, selectedCourse]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCourse !== 'all') {
        params.set('course_id', selectedCourse);
      }
      
      const response = await fetch(`/api/admin/events/${eventId}/students?${params}`);
      if (!response.ok) {
        throw new Error('Error loading students');
      }
      
      const data = await response.json();
      if (data.success) {
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      try { 
        (await import('sonner')).toast.error('Error cargando estudiantes'); 
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.name.trim()) {
      try { 
        (await import('sonner')).toast.error('El nombre es requerido'); 
      } catch {}
      return;
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudent.name.trim(),
          code: newStudent.code.trim() || null,
          course_id: newStudent.course_id || null,
          folder_id: selectedFolderId
        })
      });

      if (!response.ok) {
        throw new Error('Error creating student');
      }

      const data = await response.json();
      if (data.success) {
        setStudents(prev => [...prev, data.student]);
        setNewStudent({ name: '', code: '', course_id: '' });
        setShowAddModal(false);
        try { 
          (await import('sonner')).toast.success('Estudiante agregado'); 
        } catch {}
      }
    } catch (error) {
      console.error('Error adding student:', error);
      try { 
        (await import('sonner')).toast.error('Error agregando estudiante'); 
      } catch {}
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('¿Eliminar este estudiante?')) return;

    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Error deleting student');
      }

      setStudents(prev => prev.filter(s => s.id !== studentId));
      try { 
        (await import('sonner')).toast.success('Estudiante eliminado'); 
      } catch {}
    } catch (error) {
      console.error('Error deleting student:', error);
      try { 
        (await import('sonner')).toast.error('Error eliminando estudiante'); 
      } catch {}
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.code && student.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (compact) {
    return (
      <Card className={cn("border-green-200 bg-green-50/50", className)}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-green-900 text-sm">
                  {students.length} Estudiantes
                </div>
                <div className="text-xs text-green-600">
                  {selectedCourse !== 'all' ? 'Filtrado por curso' : 'Total del evento'}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white h-7"
            >
              <Plus className="h-3 w-3 mr-1" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header y controles */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestión de Estudiantes
            </CardTitle>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Estudiante
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar estudiante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>
            {courses.length > 0 && (
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Filtrar por curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cursos</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de estudiantes */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
              <span className="ml-2 text-sm text-gray-600">Cargando estudiantes...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <Users className="h-8 w-8 mb-2" />
              <p className="text-sm">
                {searchTerm ? 'No se encontraron estudiantes' : 'No hay estudiantes registrados'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredStudents.map(student => (
                <div key={student.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FileUser className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          {student.code && (
                            <div className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {student.code}
                            </div>
                          )}
                          {student.course_name && (
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {student.course_name}
                            </div>
                          )}
                          {student.photo_count && (
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {student.photo_count} fotos
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteStudent(student.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para agregar estudiante */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Estudiante</DialogTitle>
            <DialogDescription>
              Registrar un nuevo estudiante en el evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="student-name">Nombre completo *</Label>
              <Input
                id="student-name"
                value={newStudent.name}
                onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del estudiante"
              />
            </div>
            <div>
              <Label htmlFor="student-code">Código (opcional)</Label>
              <Input
                id="student-code"
                value={newStudent.code}
                onChange={(e) => setNewStudent(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Código de estudiante"
              />
            </div>
            {courses.length > 0 && (
              <div>
                <Label htmlFor="student-course">Curso</Label>
                <Select
                  value={newStudent.course_id}
                  onValueChange={(value) => setNewStudent(prev => ({ ...prev, course_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddStudent} className="bg-green-600 hover:bg-green-700">
              Agregar Estudiante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StudentManagement;

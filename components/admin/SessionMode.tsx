'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  UserIcon,
  ImageIcon,
  CheckIcon,
  XIcon,
  RotateCcwIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Subject {
  id: string;
  name: string;
  grade_section?: string;
  event_id: string;
}

interface SessionModeProps {
  eventId: string;
  isActive: boolean;
  onToggle: () => void;
  selectedPhotos: string[];
  onPhotoAssign: (photoIds: string[], subjectId: string) => Promise<void>;
  onClearSelection: () => void;
}

export function SessionMode({
  eventId,
  isActive,
  onToggle,
  selectedPhotos,
  onPhotoAssign,
  onClearSelection,
}: SessionModeProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [assignedCount, setAssignedCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Manual student entry state
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Load subjects when session mode is activated
  const loadSubjects = useCallback(async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        event_id: eventId,
        sort: sortBy,
        order: sortOrder,
      });
      const response = await fetch(`/api/admin/subjects?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.subjects) {
        setSubjects(data.subjects);
        setCurrentIndex(0);
      } else {
        throw new Error(data.error || 'Error cargando alumnos');
      }
    } catch (error: any) {
      console.error('Error loading subjects:', error);
      toast.error('Error cargando lista de alumnos');
    } finally {
      setLoading(false);
    }
  }, [eventId, sortBy, sortOrder]);

  useEffect(() => {
    if (isActive) {
      loadSubjects();
    }
  }, [isActive, loadSubjects]);

  // Filter subjects based on search
  const filteredSubjects = subjects.filter(
    (subject) =>
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (subject.grade_section
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ??
        false)
  );

  const currentStudent = filteredSubjects[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) =>
      prev > 0 ? prev - 1 : filteredSubjects.length - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev < filteredSubjects.length - 1 ? prev + 1 : 0
    );
  };

  const handleAssign = async () => {
    if (!currentStudent || selectedPhotos.length === 0) {
      toast.error('Selecciona fotos y asegúrate de tener un alumno activo');
      return;
    }

    try {
      await onPhotoAssign(selectedPhotos, currentStudent.id);
      setAssignedCount((prev) => prev + selectedPhotos.length);
      onClearSelection();
      toast.success(
        `${selectedPhotos.length} fotos asignadas a ${currentStudent.name}`
      );

      // Auto advance to next student
      handleNext();
    } catch (error: any) {
      console.error('Error assigning photos:', error);
      toast.error('Error asignando fotos');
    }
  };

  const handleSkip = () => {
    onClearSelection();
    handleNext();
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setAssignedCount(0);
    onClearSelection();
    toast.info('Sesión reiniciada');
  };

  // Manual student management
  const handleAddStudent = async () => {
    if (!newStudentName.trim()) {
      toast.error('El nombre del alumno es requerido');
      return;
    }

    try {
      setAddingStudent(true);

      const response = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          name: newStudentName.trim(),
          grade_section: newStudentGrade.trim() || null,
          type: 'student',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error creando alumno');
      }

      // Add to local state
      const newSubject: Subject = {
        id: data.subject?.id || crypto.randomUUID(),
        name: newStudentName.trim(),
        grade_section: newStudentGrade.trim() || undefined,
        event_id: eventId,
      };

      setSubjects((prev) => [...prev, newSubject]);

      // Clear form
      setNewStudentName('');
      setNewStudentGrade('');
      setShowAddStudentModal(false);

      toast.success(`Alumno "${newStudentName}" agregado exitosamente`);
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.message || 'Error agregando alumno');
    } finally {
      setAddingStudent(false);
    }
  };

  const handleBulkAddStudents = () => {
    setShowBulkModal(true);
  };

  const parseBulkText = (
    text: string
  ): Array<{ name: string; grade_section?: string | null }> => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Formatos posibles: "Nombre - Grado" o "Nombre, Grado" o solo "Nombre"
        const byDash = line.split(' - ');
        const byComma = line.split(',');
        if (byDash.length >= 2)
          return {
            name: byDash[0].trim(),
            grade_section: byDash.slice(1).join(' - ').trim(),
          };
        if (byComma.length >= 2)
          return {
            name: byComma[0].trim(),
            grade_section: byComma.slice(1).join(',').trim(),
          };
        return { name: line };
      });
  };

  const submitBulk = async () => {
    const rows = parseBulkText(bulkText);
    if (rows.length === 0) {
      toast.error('Pegá una lista con al menos un nombre');
      return;
    }
    try {
      setAddingStudent(true);
      const response = await fetch('/api/admin/subjects/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: rows.map((r) => ({ ...r, event_id: eventId })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en carga masiva');

      const created = (data.created || []).map((c: any) => ({
        id: c.id as string,
        name: c.name as string,
        grade_section:
          rows.find((r) => r.name === c.name)?.grade_section ?? undefined,
        event_id: eventId,
      }));

      setSubjects((prev) => [...prev, ...created]);
      setShowBulkModal(false);
      setBulkText('');
      toast.success(`Se agregaron ${created.length} alumnos`);
    } catch (e: any) {
      console.error('Error bulk adding students:', e);
      toast.error(e?.message || 'Error en carga masiva');
    } finally {
      setAddingStudent(false);
    }
  };

  if (!isActive) {
    return (
      <Card className="border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <PlayIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Modo Sesión</h3>
              <p className="text-sm text-blue-700">
                Asignación secuencial de fotos
              </p>
            </div>
          </div>
          <Button onClick={onToggle} className="bg-blue-600 hover:bg-blue-700">
            Activar Sesión
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50 p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <PauseIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">
                Modo Sesión Activo
              </h3>
              <p className="text-sm text-green-700">
                {assignedCount} fotos asignadas • {filteredSubjects.length}{' '}
                alumnos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600" htmlFor="sort-mode">
              Orden
            </label>
            <select
              id="sort-mode"
              aria-label="Ordenar por"
              className="rounded-md border px-2 py-1 text-sm"
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [s, o] = e.target.value.split(':') as [
                  'name' | 'created_at',
                  'asc' | 'desc',
                ];
                setSortBy(s);
                setSortOrder(o);
                loadSubjects();
              }}
            >
              <option value="name:asc">Nombre (A-Z)</option>
              <option value="name:desc">Nombre (Z-A)</option>
              <option value="created_at:desc">Recientes primero</option>
              <option value="created_at:asc">Antiguos primero</option>
            </select>
            <Button
              variant="outline"
              onClick={() => setShowAddStudentModal(true)}
              size="sm"
            >
              <UserPlusIcon className="mr-1 h-4 w-4" />+ Alumno
            </Button>
            <Button variant="outline" onClick={handleReset} size="sm">
              <RotateCcwIcon className="mr-1 h-4 w-4" />
              Reset
            </Button>
            <Button variant="outline" onClick={onToggle} size="sm">
              Finalizar Sesión
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Buscar alumno..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentIndex(0); // Reset to first result when searching
            }}
            className="pl-3"
          />
        </div>

        {/* Current Student Display */}
        {loading ? (
          <div className="py-8 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Cargando alumnos...</p>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mb-4">
              <UsersIcon className="mx-auto mb-2 h-12 w-12 text-gray-400" />
              <p className="mb-2 text-gray-600">No hay alumnos disponibles</p>
              <p className="mb-4 text-sm text-gray-500">
                {subjects.length === 0
                  ? 'Agrega alumnos para comenzar la sesión'
                  : 'No se encontraron alumnos que coincidan con la búsqueda'}
              </p>
            </div>
            {subjects.length === 0 && (
              <div className="flex justify-center gap-2">
                <Button
                  onClick={() => setShowAddStudentModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlusIcon className="mr-2 h-4 w-4" />
                  Agregar Alumno
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkAddStudents}
                  aria-label="Abrir carga masiva de alumnos"
                >
                  <UsersIcon className="mr-2 h-4 w-4" />
                  Carga Masiva
                </Button>
              </div>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStudent?.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="rounded-lg border-2 border-green-300 bg-white p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <UserIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">
                      {currentStudent?.name}
                    </h4>
                    {currentStudent?.grade_section && (
                      <p className="text-sm text-gray-600">
                        {currentStudent.grade_section}
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-green-300 bg-green-50 text-green-700"
                >
                  {currentIndex + 1} de {filteredSubjects.length}
                </Badge>
              </div>

              {/* Navigation Controls */}
              <div className="mb-4 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={filteredSubjects.length <= 1}
                  className="flex items-center gap-2"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={filteredSubjects.length <= 1}
                  className="flex items-center gap-2"
                >
                  Siguiente
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* Photo Assignment */}
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">
                      {selectedPhotos.length} fotos seleccionadas
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleAssign}
                    disabled={selectedPhotos.length === 0}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckIcon className="mr-2 h-4 w-4" />
                    Asignar y Continuar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="flex items-center gap-2"
                  >
                    <XIcon className="h-4 w-4" />
                    Saltar
                  </Button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Quick keyboard shortcuts info */}
        <div className="rounded bg-gray-50 p-2 text-xs text-gray-500">
          <strong>Atajos:</strong> ← Anterior • → Siguiente • Enter Asignar •
          Espacio Saltar
        </div>
      </div>

      {/* Add Student Modal */}
      <Dialog open={showAddStudentModal} onOpenChange={setShowAddStudentModal}>
        <DialogContent
          className="sm:max-w-md"
          aria-label="Agregar nuevo alumno"
          aria-describedby="add-student-desc"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlusIcon className="h-5 w-5 text-blue-600" />
              Agregar Nuevo Alumno
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4" id="add-student-desc">
            <div className="space-y-2">
              <Label htmlFor="student-name">Nombre del Alumno *</Label>
              <Input
                id="student-name"
                placeholder="Ej: Juan Pérez"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddStudent();
                  }
                }}
                aria-label="Nombre del alumno"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-grade">Grado/Sección (opcional)</Label>
              <Input
                id="student-grade"
                placeholder="Ej: 5°A, Preparatoria"
                value={newStudentGrade}
                onChange={(e) => setNewStudentGrade(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddStudent();
                  }
                }}
                aria-label="Grado o sección del alumno"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddStudentModal(false)}
              aria-label="Cancelar agregado de alumno"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={!newStudentName.trim() || addingStudent}
              className="bg-blue-600 hover:bg-blue-700"
              aria-label="Confirmar agregado de alumno"
            >
              {addingStudent ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Agregando...
                </>
              ) : (
                <>
                  <UserPlusIcon className="mr-2 h-4 w-4" />
                  Agregar Alumno
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Modal */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent
          className="sm:max-w-lg"
          aria-label="Carga masiva de alumnos"
        >
          <DialogHeader>
            <DialogTitle>Cargar lista de alumnos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Pegá una lista. Formatos admitidos por línea: "Nombre", "Nombre -
              Grado", "Nombre, Grado".
            </p>
            <textarea
              aria-label="Lista de alumnos"
              className="min-h-[200px] w-full rounded-md border p-2"
              placeholder={'Juan Pérez - 5A\nMaría García, 5A\nCarlos López'}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkModal(false)}
              aria-label="Cancelar carga masiva"
            >
              Cancelar
            </Button>
            <Button
              onClick={submitBulk}
              disabled={addingStudent}
              aria-label="Confirmar carga masiva"
            >
              {addingStudent ? 'Procesando...' : 'Cargar lista'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

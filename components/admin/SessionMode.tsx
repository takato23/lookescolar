'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  UsersIcon
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
  onClearSelection 
}: SessionModeProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [assignedCount, setAssignedCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Manual student entry state
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);

  // Load subjects when session mode is activated
  const loadSubjects = useCallback(async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/subjects-simple?event_id=${eventId}`);
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
  }, [eventId]);

  useEffect(() => {
    if (isActive) {
      loadSubjects();
    }
  }, [isActive, loadSubjects]);

  // Filter subjects based on search
  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (subject.grade_section?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const currentStudent = filteredSubjects[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : filteredSubjects.length - 1);
  };

  const handleNext = () => {
    setCurrentIndex(prev => prev < filteredSubjects.length - 1 ? prev + 1 : 0);
  };

  const handleAssign = async () => {
    if (!currentStudent || selectedPhotos.length === 0) {
      toast.error('Selecciona fotos y asegúrate de tener un alumno activo');
      return;
    }

    try {
      await onPhotoAssign(selectedPhotos, currentStudent.id);
      setAssignedCount(prev => prev + selectedPhotos.length);
      onClearSelection();
      toast.success(`${selectedPhotos.length} fotos asignadas a ${currentStudent.name}`);
      
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
          type: 'student'
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
        event_id: eventId
      };
      
      setSubjects(prev => [...prev, newSubject]);
      
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
    // For future implementation - CSV upload or bulk text entry
    toast.info('Función de carga masiva próximamente');
  };

  if (!isActive) {
    return (
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <PlayIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Modo Sesión</h3>
              <p className="text-sm text-blue-700">Asignación secuencial de fotos</p>
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
    <Card className="p-4 bg-green-50 border-green-200">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <PauseIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Modo Sesión Activo</h3>
              <p className="text-sm text-green-700">
                {assignedCount} fotos asignadas • {filteredSubjects.length} alumnos
              </p>
            </div>
          </div>
                      <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowAddStudentModal(true)} size="sm">
                <UserPlusIcon className="w-4 h-4 mr-1" />
                + Alumno
              </Button>
              <Button variant="outline" onClick={handleReset} size="sm">
                <RotateCcwIcon className="w-4 h-4 mr-1" />
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
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Cargando alumnos...</p>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-2">No hay alumnos disponibles</p>
              <p className="text-sm text-gray-500 mb-4">
                {subjects.length === 0 ? 'Agrega alumnos para comenzar la sesión' : 'No se encontraron alumnos que coincidan con la búsqueda'}
              </p>
            </div>
            {subjects.length === 0 && (
              <div className="flex justify-center gap-2">
                <Button onClick={() => setShowAddStudentModal(true)} className="bg-blue-600 hover:bg-blue-700">
                  <UserPlusIcon className="w-4 h-4 mr-2" />
                  Agregar Alumno
                </Button>
                <Button variant="outline" onClick={handleBulkAddStudents}>
                  <UsersIcon className="w-4 h-4 mr-2" />
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
              className="bg-white rounded-lg p-4 border-2 border-green-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">{currentStudent?.name}</h4>
                    {currentStudent?.grade_section && (
                      <p className="text-sm text-gray-600">{currentStudent.grade_section}</p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  {currentIndex + 1} de {filteredSubjects.length}
                </Badge>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={filteredSubjects.length <= 1}
                  className="flex items-center gap-2"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={filteredSubjects.length <= 1}
                  className="flex items-center gap-2"
                >
                  Siguiente
                  <ChevronRightIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Photo Assignment */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-gray-600" />
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
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Asignar y Continuar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="flex items-center gap-2"
                  >
                    <XIcon className="w-4 h-4" />
                    Saltar
                  </Button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Quick keyboard shortcuts info */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
          <strong>Atajos:</strong> ← Anterior • → Siguiente • Enter Asignar • Espacio Saltar
        </div>
      </div>

      {/* Add Student Modal */}
      <Dialog open={showAddStudentModal} onOpenChange={setShowAddStudentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlusIcon className="w-5 h-5 text-blue-600" />
              Agregar Nuevo Alumno
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStudentModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddStudent}
              disabled={!newStudentName.trim() || addingStudent}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {addingStudent ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Agregando...
                </>
              ) : (
                <>
                  <UserPlusIcon className="w-4 h-4 mr-2" />
                  Agregar Alumno
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

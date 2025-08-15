'use client';

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserIcon, 
  SearchIcon, 
  TagIcon, 
  XIcon,
  CheckIcon,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface Student {
  id: string;
  name: string;
  token: string;
  event_id?: string;
  event?: {
    id: string;
    name: string;
  };
}

interface TaggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTag: (studentId: string, studentName: string) => Promise<void>;
  photoId?: string;
  photoName?: string;
  selectedEvent?: string | null;
}

const TaggingModal: React.FC<TaggingModalProps> = ({
  isOpen,
  onClose,
  onTag,
  photoId,
  photoName,
  selectedEvent
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTagging, setIsTagging] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Fetch students when modal opens
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedStudent(null);
      return;
    }

    const fetchStudents = async () => {
      setIsLoading(true);
      try {
        const url = selectedEvent 
          ? `/api/admin/students?eventId=${selectedEvent}`
          : '/api/admin/students';
        
        let response = await fetch(url);
        // Fallback legacy eliminado: usar /api/admin/subjects
        if (response.status === 404) {
          const fallbackUrl = selectedEvent
            ? `/api/admin/subjects?event_id=${selectedEvent}`
            : '/api/admin/subjects';
          response = await fetch(fallbackUrl);
        }

        if (!response.ok) {
          throw new Error('Failed to fetch students');
        }

        const data = await response.json();
        const students =
          data.students ||
          (data.subjects
            ? data.subjects.map((s: any) => ({
                id: s.id,
                name:
                  s.name ||
                  [s.first_name, s.last_name].filter(Boolean).join(' ') ||
                  'Sin nombre',
                token: s.token ?? null,
                event_id: s.event_id ?? null,
                event: s.event ? { id: s.event.id, name: s.event.name } : undefined,
              }))
            : []);
        setStudents(students);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error('Error al cargar estudiantes');
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [isOpen, selectedEvent]);

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    
    return students.filter(student =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const handleTag = async (student: Student) => {
    if (!photoId) return;
    
    setIsTagging(true);
    try {
      await onTag(student.id, student.name);
      toast.success(`Foto etiquetada para ${student.name}`);
      onClose();
    } catch (error: any) {
      console.error('Error tagging photo:', error);
      toast.error(error?.message || 'Error al etiquetar la foto');
    } finally {
      setIsTagging(false);
    }
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
  };

  const handleConfirmTag = () => {
    if (selectedStudent) {
      handleTag(selectedStudent);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="w-5 h-5" />
            Etiquetar Foto
          </DialogTitle>
          <DialogDescription>
            {photoName && (
              <span className="font-medium">Foto: {photoName}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Search Input */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar estudiante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Student List */}
          <div className="flex-1 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                <span className="ml-2 text-sm text-gray-500">Cargando estudiantes...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <UserIcon className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">
                  {searchQuery ? 'No se encontraron estudiantes' : 'No hay estudiantes disponibles'}
                </span>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {filteredStudents.map((student) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all duration-200",
                        selectedStudent?.id === student.id
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                      )}
                      onClick={() => handleSelectStudent(student)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-100">
                            <UserIcon className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">{student.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>ID: {student.id}</span>
                              {student.event && (
                                <>
                                  <span>•</span>
                                  <span>{student.event.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {selectedStudent?.id === student.id && (
                          <CheckIcon className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Selected Student Info */}
          <AnimatePresence>
            {selectedStudent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-purple-50 rounded-lg border border-purple-200"
              >
                <div className="flex items-center gap-2 text-sm">
                  <TagIcon className="w-4 h-4 text-purple-600" />
                  <span className="text-purple-800">
                    Etiquetando para: <strong>{selectedStudent.name}</strong>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isTagging}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmTag}
              disabled={!selectedStudent || isTagging}
              className="flex-1"
            >
              {isTagging ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Etiquetando...
                </>
              ) : (
                <>
                  <TagIcon className="w-4 h-4 mr-2" />
                  Etiquetar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaggingModal;
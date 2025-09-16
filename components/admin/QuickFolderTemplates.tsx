'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FolderPlus,
  Sparkles,
  GraduationCap,
  Baby,
  School,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
  Settings,
  ChevronRight,
  BookOpen,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Template definitions
interface FolderTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  levels: {
    name: string;
    courses: {
      name: string;
      grade?: string;
      section?: string;
      capacity?: number;
    }[];
  }[];
  estimatedStudents: number;
  tags: string[];
}

const FOLDER_TEMPLATES: FolderTemplate[] = [
  {
    id: 'jardin',
    name: 'Jardín de Infantes',
    description: 'Estructura típica para nivel inicial con salas por edad',
    icon: Baby,
    color: 'pink',
    levels: [
      {
        name: 'Nivel Inicial',
        courses: [
          {
            name: 'Sala de 3',
            grade: 'Inicial',
            section: '3 años',
            capacity: 15,
          },
          {
            name: 'Sala de 4',
            grade: 'Inicial',
            section: '4 años',
            capacity: 20,
          },
          {
            name: 'Sala de 5',
            grade: 'Inicial',
            section: '5 años',
            capacity: 25,
          },
          {
            name: 'Salita Naranja',
            grade: 'Inicial',
            section: 'Mixta',
            capacity: 18,
          },
          {
            name: 'Salita Verde',
            grade: 'Inicial',
            section: 'Mixta',
            capacity: 18,
          },
          {
            name: 'Salita Azul',
            grade: 'Inicial',
            section: 'Mixta',
            capacity: 18,
          },
        ],
      },
    ],
    estimatedStudents: 114,
    tags: ['Inicial', 'Jardín', 'Salas por edad'],
  },
  {
    id: 'primaria',
    name: 'Escuela Primaria',
    description: 'Estructura estándar de primaria con grados 1° a 6°',
    icon: GraduationCap,
    color: 'blue',
    levels: [
      {
        name: 'Primer Ciclo',
        courses: [
          { name: '1° A', grade: '1°', section: 'A', capacity: 25 },
          { name: '1° B', grade: '1°', section: 'B', capacity: 25 },
          { name: '2° A', grade: '2°', section: 'A', capacity: 25 },
          { name: '2° B', grade: '2°', section: 'B', capacity: 25 },
          { name: '3° A', grade: '3°', section: 'A', capacity: 25 },
          { name: '3° B', grade: '3°', section: 'B', capacity: 25 },
        ],
      },
      {
        name: 'Segundo Ciclo',
        courses: [
          { name: '4° A', grade: '4°', section: 'A', capacity: 28 },
          { name: '4° B', grade: '4°', section: 'B', capacity: 28 },
          { name: '5° A', grade: '5°', section: 'A', capacity: 28 },
          { name: '5° B', grade: '5°', section: 'B', capacity: 28 },
          { name: '6° A', grade: '6°', section: 'A', capacity: 30 },
          { name: '6° B', grade: '6°', section: 'B', capacity: 30 },
        ],
      },
    ],
    estimatedStudents: 322,
    tags: ['Primaria', 'Ciclos', 'Grados A-B'],
  },
  {
    id: 'secundaria',
    name: 'Escuela Secundaria',
    description: 'Estructura de secundaria con años 1° a 6° y orientaciones',
    icon: School,
    color: 'purple',
    levels: [
      {
        name: 'Ciclo Básico',
        courses: [
          { name: '1° 1°', grade: '1°', section: '1°', capacity: 30 },
          { name: '1° 2°', grade: '1°', section: '2°', capacity: 30 },
          { name: '2° 1°', grade: '2°', section: '1°', capacity: 28 },
          { name: '2° 2°', grade: '2°', section: '2°', capacity: 28 },
          { name: '3° 1°', grade: '3°', section: '1°', capacity: 28 },
          { name: '3° 2°', grade: '3°', section: '2°', capacity: 28 },
        ],
      },
      {
        name: 'Ciclo Orientado',
        courses: [
          {
            name: '4° Naturales',
            grade: '4°',
            section: 'Ciencias Naturales',
            capacity: 25,
          },
          {
            name: '4° Sociales',
            grade: '4°',
            section: 'Ciencias Sociales',
            capacity: 25,
          },
          {
            name: '5° Naturales',
            grade: '5°',
            section: 'Ciencias Naturales',
            capacity: 23,
          },
          {
            name: '5° Sociales',
            grade: '5°',
            section: 'Ciencias Sociales',
            capacity: 23,
          },
          {
            name: '6° Naturales',
            grade: '6°',
            section: 'Ciencias Naturales',
            capacity: 20,
          },
          {
            name: '6° Sociales',
            grade: '6°',
            section: 'Ciencias Sociales',
            capacity: 20,
          },
        ],
      },
    ],
    estimatedStudents: 308,
    tags: ['Secundaria', 'Orientaciones', 'Ciclo Básico/Orientado'],
  },
  {
    id: 'integral',
    name: 'Escuela Integral',
    description: 'Estructura completa desde inicial hasta secundaria',
    icon: Users,
    color: 'green',
    levels: [
      {
        name: 'Nivel Inicial',
        courses: [
          {
            name: 'Sala de 4',
            grade: 'Inicial',
            section: '4 años',
            capacity: 20,
          },
          {
            name: 'Sala de 5',
            grade: 'Inicial',
            section: '5 años',
            capacity: 25,
          },
        ],
      },
      {
        name: 'Primaria',
        courses: [
          { name: '1° Grado', grade: '1°', section: 'Único', capacity: 25 },
          { name: '2° Grado', grade: '2°', section: 'Único', capacity: 25 },
          { name: '3° Grado', grade: '3°', section: 'Único', capacity: 28 },
          { name: '4° Grado', grade: '4°', section: 'Único', capacity: 28 },
          { name: '5° Grado', grade: '5°', section: 'Único', capacity: 30 },
          { name: '6° Grado', grade: '6°', section: 'Único', capacity: 30 },
        ],
      },
      {
        name: 'Secundaria',
        courses: [
          { name: '1° Año', grade: '1°', section: 'Único', capacity: 32 },
          { name: '2° Año', grade: '2°', section: 'Único', capacity: 30 },
          { name: '3° Año', grade: '3°', section: 'Único', capacity: 30 },
        ],
      },
    ],
    estimatedStudents: 323,
    tags: ['Integral', 'Todos los niveles', 'Sección única'],
  },
  {
    id: 'custom',
    name: 'Estructura Personalizada',
    description: 'Crea tu propia estructura de carpetas',
    icon: Settings,
    color: 'gray',
    levels: [],
    estimatedStudents: 0,
    tags: ['Personalizado', 'Flexible'],
  },
];

// Creation progress tracking
interface CreationProgress {
  step: string;
  completed: number;
  total: number;
  message: string;
}

interface QuickFolderTemplatesProps {
  eventId: string;
  onTemplateApplied: () => void;
  trigger?: React.ReactNode;
}

export default function QuickFolderTemplates({
  eventId,
  onTemplateApplied,
  trigger,
}: QuickFolderTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<FolderTemplate | null>(null);
  const [customizations, setCustomizations] = useState<Record<string, any>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState<CreationProgress | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Apply template
  const applyTemplate = useCallback(
    async (template: FolderTemplate) => {
      if (template.id === 'custom') {
        // Handle custom template creation
        setShowPreview(true);
        return;
      }

      setIsCreating(true);
      setProgress({
        step: 'Iniciando',
        completed: 0,
        total: 100,
        message: 'Preparando estructura...',
      });

      try {
        // Calculate total operations
        const totalLevels = template.levels.length;
        const totalCourses = template.levels.reduce(
          (sum, level) => sum + level.courses.length,
          0
        );
        const totalOperations = totalLevels + totalCourses;
        let completedOperations = 0;

        // Create levels
        for (const level of template.levels) {
          setProgress({
            step: 'Creando niveles',
            completed: Math.round(
              (completedOperations / totalOperations) * 100
            ),
            total: 100,
            message: `Creando nivel: ${level.name}`,
          });

          const levelResponse = await fetch(
            `/api/admin/events/${eventId}/levels`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: level.name,
                description: `Nivel creado desde plantilla: ${template.name}`,
                active: true,
              }),
            }
          );

          if (!levelResponse.ok)
            throw new Error(`Error creando nivel: ${level.name}`);

          const levelData = await levelResponse.json();
          const levelId = levelData.level?.id;
          completedOperations++;

          // Create courses for this level
          for (const course of level.courses) {
            setProgress({
              step: 'Creando cursos',
              completed: Math.round(
                (completedOperations / totalOperations) * 100
              ),
              total: 100,
              message: `Creando curso: ${course.name}`,
            });

            await fetch(`/api/admin/events/${eventId}/courses`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: course.name,
                grade: course.grade,
                section: course.section,
                level_id: levelId,
                active: true,
                description: `Curso creado desde plantilla: ${template.name}`,
              }),
            });

            completedOperations++;
          }
        }

        setProgress({
          step: 'Completado',
          completed: 100,
          total: 100,
          message: 'Estructura creada exitosamente',
        });

        toast.success(`Estructura "${template.name}" creada exitosamente`);

        setTimeout(() => {
          setIsOpen(false);
          setIsCreating(false);
          setProgress(null);
          onTemplateApplied();
        }, 2000);
      } catch (error) {
        console.error('Error applying template:', error);
        toast.error('Error al crear la estructura');
        setIsCreating(false);
        setProgress(null);
      }
    },
    [eventId, onTemplateApplied]
  );

  // Template card component
  const TemplateCard = ({ template }: { template: FolderTemplate }) => {
    const Icon = template.icon;

    return (
      <Card
        className={cn(
          'cursor-pointer border-2 transition-all hover:shadow-md',
          selectedTemplate?.id === template.id &&
            'border-blue-500 ring-2 ring-blue-200'
        )}
        onClick={() => setSelectedTemplate(template)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'rounded-lg p-2',
                template.color === 'pink' && 'bg-pink-100 text-pink-600',
                template.color === 'blue' && 'bg-blue-100 text-blue-600',
                template.color === 'purple' && 'bg-purple-100 text-purple-600',
                template.color === 'green' && 'bg-green-100 text-green-600',
                template.color === 'gray' && 'bg-muted text-muted-foreground'
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription className="text-sm">
                {template.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Stats */}
          <div className="text-gray-500 dark:text-gray-400 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>{template.levels.length} niveles</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>~{template.estimatedStudents} estudiantes</span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Structure preview */}
          {template.levels.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                Estructura:
              </p>
              {template.levels.slice(0, 2).map((level, levelIndex) => (
                <div key={levelIndex} className="space-y-1">
                  <div className="flex items-center gap-1 text-xs">
                    <ChevronRight className="h-3 w-3" />
                    <span className="font-medium">{level.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {level.courses.length} cursos
                    </Badge>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 ml-4 text-xs">
                    {level.courses
                      .slice(0, 3)
                      .map((course) => course.name)
                      .join(', ')}
                    {level.courses.length > 3 &&
                      ` +${level.courses.length - 3} más...`}
                  </div>
                </div>
              ))}
              {template.levels.length > 2 && (
                <div className="text-gray-500 dark:text-gray-400 ml-4 text-xs">
                  +{template.levels.length - 2} niveles más...
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Plantillas Rápidas
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Plantillas de Estructura de Carpetas
          </DialogTitle>
        </DialogHeader>

        {isCreating && progress ? (
          // Creation progress
          <div className="space-y-6 py-8">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold">Creando estructura...</h3>
              <p className="text-gray-500 dark:text-gray-400">{progress.message}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{progress.step}</span>
                <span>{progress.completed}%</span>
              </div>
              <Progress value={progress.completed} className="h-2" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Template grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {FOLDER_TEMPLATES.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>

            {/* Actions */}
            {selectedTemplate && (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-medium text-blue-900">
                      {selectedTemplate.name} seleccionada
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Esta plantilla creará {selectedTemplate.levels.length}{' '}
                      niveles y aproximadamente{' '}
                      {selectedTemplate.estimatedStudents} estudiantes
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => applyTemplate(selectedTemplate)}
                  className="gap-2"
                  disabled={isCreating}
                >
                  <Play className="h-4 w-4" />
                  Aplicar Plantilla
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

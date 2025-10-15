'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Folder,
  FolderPlus,
  Search,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  School,
  Users,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SchoolFolderStructure {
  id: string;
  name: string;
  description: string;
  template: any[];
  tags: string[];
}

interface FolderPreview {
  name: string;
  path: string;
  depth: number;
}

interface TemplateValidation {
  canApply: boolean;
  conflicts?: string[];
  warnings?: string[];
}

interface SchoolFolderTemplateSelectorProps {
  eventId: string;
  eventName: string;
  onTemplateApplied?: (
    appliedTemplate: SchoolFolderStructure,
    createdFolders: any[]
  ) => void;
  triggerButton?: React.ReactNode;
}

export function SchoolFolderTemplateSelector({
  eventId,
  eventName,
  onTemplateApplied,
  triggerButton,
}: SchoolFolderTemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<SchoolFolderStructure[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<
    SchoolFolderStructure[]
  >([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<SchoolFolderStructure | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [preview, setPreview] = useState<FolderPreview[]>([]);
  const [validation, setValidation] = useState<TemplateValidation | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates on mount
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  // Filter templates based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTemplates(templates);
    } else {
      const filtered = templates.filter(
        (template) =>
          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          template.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
      setFilteredTemplates(filtered);
    }
  }, [templates, searchQuery]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/folder-templates?action=list`
      );
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates);
        setError(null);
      } else {
        setError(data.error || 'Failed to load templates');
      }
    } catch (error) {
      setError('Failed to load templates');
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplatePreview = async (templateId: string) => {
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/folder-templates?action=preview&templateId=${templateId}`
      );
      const data = await response.json();

      if (data.success && data.preview) {
        setPreview(data.preview);
      } else {
        setPreview([]);
        console.error('Failed to load preview:', data.error);
      }
    } catch (error) {
      setPreview([]);
      console.error('Error loading preview:', error);
    }
  };

  const validateTemplate = async (templateId: string) => {
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/folder-templates?action=validate&templateId=${templateId}`
      );
      const data = await response.json();

      if (data.success) {
        setValidation(data.validation);
      } else {
        setValidation(null);
      }
    } catch (error) {
      setValidation(null);
      console.error('Error validating template:', error);
    }
  };

  const handleTemplateSelect = async (template: SchoolFolderStructure) => {
    setSelectedTemplate(template);
    setShowPreview(true);

    // Load preview and validation in parallel
    await Promise.all([
      loadTemplatePreview(template.id),
      validateTemplate(template.id),
    ]);
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplate || !validation?.canApply) return;

    // Show confirmation dialog if there are warnings
    if (validation.warnings && validation.warnings.length > 0) {
      setShowConfirmDialog(true);
    } else {
      applyTemplate();
    }
  };

  const applyTemplate = async () => {
    if (!selectedTemplate) return;

    setIsApplying(true);
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/folder-templates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateId: selectedTemplate.id,
            replaceExisting: false,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Close dialogs
        setShowConfirmDialog(false);
        setShowPreview(false);
        setIsOpen(false);

        // Notify parent component
        onTemplateApplied?.(selectedTemplate, data.createdFolders || []);
      } else {
        setError(data.error || 'Failed to apply template');
      }
    } catch (error) {
      setError('Failed to apply template');
      console.error('Error applying template:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const getTemplateIcon = (templateId: string) => {
    switch (templateId) {
      case 'complete-school':
        return <School className="h-5 w-5" />;
      case 'jardin-only':
        return <Users className="h-5 w-5" />;
      case 'secundaria-bachilleratos':
        return <GraduationCap className="h-5 w-5" />;
      default:
        return <Folder className="h-5 w-5" />;
    }
  };

  const renderFolderPreview = (folders: FolderPreview[]) => {
    return (
      <div className="space-y-1">
        {folders.map((folder, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-2 py-1 text-sm',
              'rounded px-2 hover:bg-muted'
            )}
            style={{ paddingLeft: `${folder.depth * 16 + 8}px` }}
          >
            <Folder className="h-4 w-4 flex-shrink-0 text-blue-500" />
            <span className="font-medium">{folder.name}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {triggerButton || (
            <Button variant="outline" className="gap-2">
              <FolderPlus className="h-4 w-4" />
              Aplicar Estructura Escolar
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Estructuras de Carpetas Escolares
            </DialogTitle>
            <DialogDescription>
              Selecciona una estructura predefinida para organizar las fotos de{' '}
              <strong>{eventName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="Buscar plantillas por nombre o tipo de escuela..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Templates Grid */}
            <ScrollArea className="h-96">
              {isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Cargando plantillas...</span>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  {searchQuery
                    ? 'No se encontraron plantillas que coincidan'
                    : 'No hay plantillas disponibles'}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:shadow-md',
                        selectedTemplate?.id === template.id &&
                          'ring-2 ring-blue-500'
                      )}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getTemplateIcon(template.id)}
                            <CardTitle className="text-lg">
                              {template.name}
                            </CardTitle>
                          </div>
                          {selectedTemplate?.id === template.id && (
                            <CheckCircle2 className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                        <CardDescription>
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Selected Template Actions */}
            {selectedTemplate && (
              <div className="flex gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Ver Estructura
                </Button>

                {validation?.canApply && (
                  <Button
                    onClick={handleApplyTemplate}
                    disabled={isApplying}
                    className="gap-2"
                  >
                    {isApplying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FolderPlus className="h-4 w-4" />
                    )}
                    Aplicar Estructura
                  </Button>
                )}
              </div>
            )}

            {/* Validation Messages */}
            {validation && (
              <div className="space-y-2">
                {validation.conflicts && validation.conflicts.length > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                    <div className="mb-2 flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      No se puede aplicar la plantilla
                    </div>
                    <ul className="list-inside list-disc text-sm">
                      {validation.conflicts.map((conflict, index) => (
                        <li key={index}>{conflict}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.warnings && validation.warnings.length > 0 && (
                  <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800">
                    <div className="mb-2 flex items-center gap-2 font-medium">
                      <Info className="h-4 w-4" />
                      Advertencias
                    </div>
                    <ul className="list-inside list-disc text-sm">
                      {validation.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Vista Previa: {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Estructura de carpetas que se creará en el evento
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-96">
            {preview.length > 0 ? (
              renderFolderPreview(preview)
            ) : (
              <div className="flex h-32 items-center justify-center text-gray-500">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Cargando vista previa...
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cerrar
            </Button>
            {validation?.canApply && (
              <Button onClick={handleApplyTemplate} disabled={isApplying}>
                {isApplying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FolderPlus className="mr-2 h-4 w-4" />
                )}
                Aplicar Estructura
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar Aplicación de Estructura
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                ¿Estás seguro que deseas aplicar la estructura{' '}
                <strong>{selectedTemplate?.name}</strong>?
              </p>

              {validation?.warnings && (
                <div className="rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                  <strong>Advertencias:</strong>
                  <ul className="mt-1 list-inside list-disc">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplying}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={applyTemplate} disabled={isApplying}>
              {isApplying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

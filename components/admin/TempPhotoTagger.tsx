'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Tag,
  Plus,
  X,
  User,
  Mail,
  Clock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface TempTag {
  id: string;
  photo_id: string;
  temp_name: string;
  temp_email?: string;
  created_at: string;
}

interface TempPhotoTaggerProps {
  photoId: string;
  photoName?: string;
  existingTags?: TempTag[];
  onTagsUpdated?: (tags: TempTag[]) => void;
  className?: string;
}

export function TempPhotoTagger({
  photoId,
  photoName,
  existingTags = [],
  onTagsUpdated,
  className = '',
}: TempPhotoTaggerProps) {
  const [tags, setTags] = useState<TempTag[]>(existingTags);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    tempName: '',
    tempEmail: '',
  });

  const handleAddTag = async () => {
    if (!formData.tempName.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/temp-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId,
          tempName: formData.tempName,
          tempEmail: formData.tempEmail || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error adding temporary tag');
      }

      const newTag = data.tempTag;
      const updatedTags = [...tags, newTag];
      setTags(updatedTags);
      onTagsUpdated?.(updatedTags);

      // Reset form
      setFormData({ tempName: '', tempEmail: '' });
      setIsDialogOpen(false);

      toast.success('Etiqueta temporal agregada');
    } catch (error) {
      console.error('Error adding temp tag:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al agregar etiqueta'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const response = await fetch(`/api/admin/temp-tags?id=${tagId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error removing temporary tag');
      }

      const updatedTags = tags.filter((tag) => tag.id !== tagId);
      setTags(updatedTags);
      onTagsUpdated?.(updatedTags);

      toast.success('Etiqueta temporal eliminada');
    } catch (error) {
      console.error('Error removing temp tag:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al eliminar etiqueta'
      );
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-orange-600" />
          <h4 className="text-sm font-semibold">Etiquetas Temporales</h4>
          {tags.length > 0 && (
            <Badge
              variant="outline"
              className="border-orange-200 bg-orange-50 text-orange-700"
            >
              {tags.length}
            </Badge>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <Plus className="mr-1 h-3 w-3" />
              Agregar
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Etiqueta Temporal
              </DialogTitle>
              {photoName && (
                <p className="text-muted-foreground text-sm">
                  Para: {photoName}
                </p>
              )}
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tempName" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Nombre *
                </Label>
                <Input
                  id="tempName"
                  placeholder="Nombre del estudiante o familia"
                  value={formData.tempName}
                  onChange={(e) =>
                    setFormData({ ...formData, tempName: e.target.value })
                  }
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tempEmail" className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email (opcional)
                </Label>
                <Input
                  id="tempEmail"
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={formData.tempEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, tempEmail: e.target.value })
                  }
                  className="w-full"
                />
              </div>

              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-start gap-2 text-xs text-orange-700">
                  <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  <div>
                    <strong>Etiqueta temporal:</strong> Se puede vincular
                    automáticamente con estudiantes oficiales cuando se cargue
                    la lista del colegio.
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddTag}
                  disabled={!formData.tempName.trim() || isLoading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isLoading ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="mr-1 h-3 w-3" />
                  )}
                  Agregar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tags List */}
      {tags.length === 0 ? (
        <div className="text-muted-foreground py-6 text-center">
          <Tag className="mx-auto mb-2 h-6 w-6 opacity-50" />
          <p className="text-xs">Sin etiquetas temporales</p>
          <p className="text-xs">Útil cuando no tienes la lista oficial</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <Card
              key={tag.id}
              className="border-orange-200/50 bg-orange-50/50 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <User className="h-3 w-3 text-orange-600" />
                    <span className="truncate text-sm font-medium">
                      {tag.temp_name}
                    </span>
                  </div>
                  {tag.temp_email && (
                    <div className="mb-1 flex items-center gap-2">
                      <Mail className="h-3 w-3 text-orange-600" />
                      <span className="text-muted-foreground truncate text-xs">
                        {tag.temp_email}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-orange-500" />
                    <span className="text-muted-foreground text-xs">
                      {new Date(tag.created_at).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="text-orange-600 hover:bg-orange-100 hover:text-orange-700"
                  aria-label={`Eliminar etiqueta ${tag.temp_name}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

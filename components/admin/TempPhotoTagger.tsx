'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Tag, 
  Plus, 
  X, 
  User, 
  Mail,
  Clock,
  Loader2,
  AlertTriangle
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
  className = ""
}: TempPhotoTaggerProps) {
  const [tags, setTags] = useState<TempTag[]>(existingTags);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    tempName: '',
    tempEmail: ''
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
      toast.error(error instanceof Error ? error.message : 'Error al agregar etiqueta');
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

      const updatedTags = tags.filter(tag => tag.id !== tagId);
      setTags(updatedTags);
      onTagsUpdated?.(updatedTags);
      
      toast.success('Etiqueta temporal eliminada');
    } catch (error) {
      console.error('Error removing temp tag:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar etiqueta');
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-orange-600" />
          <h4 className="text-sm font-semibold">Etiquetas Temporales</h4>
          {tags.length > 0 && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              {tags.length}
            </Badge>
          )}
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-orange-700 border-orange-200 hover:bg-orange-50"
            >
              <Plus className="w-3 h-3 mr-1" />
              Agregar
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Etiqueta Temporal
              </DialogTitle>
              {photoName && (
                <p className="text-sm text-muted-foreground">
                  Para: {photoName}
                </p>
              )}
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tempName" className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Nombre *
                </Label>
                <Input
                  id="tempName"
                  placeholder="Nombre del estudiante o familia"
                  value={formData.tempName}
                  onChange={(e) => setFormData({ ...formData, tempName: e.target.value })}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tempEmail" className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Email (opcional)
                </Label>
                <Input
                  id="tempEmail"
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={formData.tempEmail}
                  onChange={(e) => setFormData({ ...formData, tempEmail: e.target.value })}
                  className="w-full"
                />
              </div>
              
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <div className="flex items-start gap-2 text-xs text-orange-700">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Etiqueta temporal:</strong> Se puede vincular automáticamente con estudiantes oficiales cuando se cargue la lista del colegio.
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
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3 mr-1" />
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
        <div className="text-center py-6 text-muted-foreground">
          <Tag className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Sin etiquetas temporales</p>
          <p className="text-xs">Útil cuando no tienes la lista oficial</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <Card key={tag.id} className="p-3 bg-orange-50/50 border-orange-200/50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3 h-3 text-orange-600" />
                    <span className="font-medium text-sm truncate">
                      {tag.temp_name}
                    </span>
                  </div>
                  {tag.temp_email && (
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-3 h-3 text-orange-600" />
                      <span className="text-xs text-muted-foreground truncate">
                        {tag.temp_email}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-orange-500" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(tag.created_at).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                  aria-label={`Eliminar etiqueta ${tag.temp_name}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle,
  Tag,
  Image,
} from 'lucide-react';

interface GalleryMetadata {
  id: string;
  event_id: string;
  level_id: string | null;
  course_id: string | null;
  student_id: string | null;
  title: string | null;
  description: string | null;
  cover_photo_id: string | null;
  tags: string[] | null;
  custom_fields: Record<string, any> | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface GalleryMetadataProps {
  eventId: string;
  levelId?: string;
  courseId?: string;
  studentId?: string;
  onMetadataUpdate?: (metadata: GalleryMetadata) => void;
}

export default function GalleryMetadata({
  eventId,
  levelId,
  courseId,
  studentId,
  onMetadataUpdate
}: GalleryMetadataProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [metadata, setMetadata] = useState<GalleryMetadata | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverPhotoId, setCoverPhotoId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(true);

  // Load metadata when dialog opens
  useEffect(() => {
    if (isOpen && !metadata) {
      loadMetadata();
    }
  }, [isOpen, metadata]);

  const loadMetadata = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (levelId) params.set('level_id', levelId);
      if (courseId) params.set('course_id', courseId);
      if (studentId) params.set('student_id', studentId);
      
      const response = await fetch(`/api/admin/events/${eventId}/gallery/metadata?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load metadata');
      }
      
      const data = await response.json();
      
      if (data.success && data.metadata) {
        const metadata = data.metadata;
        setMetadata(metadata);
        setTitle(metadata.title || '');
        setDescription(metadata.description || '');
        setCoverPhotoId(metadata.cover_photo_id || '');
        setTags(metadata.tags || []);
        setCustomFields(metadata.custom_fields || {});
        setSortOrder(metadata.sort_order || 0);
        setActive(metadata.active !== false); // Default to true if null
      }
    } catch (err) {
      console.error('Error loading gallery metadata:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metadata');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      const requestBody: any = {
        level_id: levelId,
        course_id: courseId,
        student_id: studentId,
        title: title || null,
        description: description || null,
        cover_photo_id: coverPhotoId || null,
        tags: tags.length > 0 ? tags : null,
        custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
        sort_order: sortOrder,
        active,
      };

      const response = await fetch(`/api/admin/events/${eventId}/gallery/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save metadata');
      }

      const data = await response.json();
      
      if (data.success && data.metadata) {
        setMetadata(data.metadata);
        setSuccess(true);
        
        // Call update callback if provided
        if (onMetadataUpdate) {
          onMetadataUpdate(data.metadata);
        }
        
        // Close dialog after a short delay
        setTimeout(() => {
          setIsOpen(false);
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to save metadata');
      }
    } catch (err) {
      console.error('Error saving gallery metadata:', err);
      setError(err instanceof Error ? err.message : 'Failed to save metadata');
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state when closing
      setTimeout(() => {
        setIsLoading(false);
        setIsSaving(false);
        setError(null);
        setSuccess(false);
        setMetadata(null);
      }, 300);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Metadata
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Metadata de la Galería</DialogTitle>
          <DialogDescription>
            Configura la metadata para esta galería
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-center">Cargando metadata...</p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">¡Metadata guardada!</h3>
            <p className="text-center text-muted-foreground">
              La metadata de la galería se ha actualizado correctamente.
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Error</h3>
            <p className="text-center text-muted-foreground mb-4">
              {error}
            </p>
            <Button variant="outline" onClick={() => setError(null)}>
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título de la galería"
              />
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción de la galería"
                rows={3}
              />
            </div>
            
            {/* Cover Photo ID */}
            <div className="space-y-2">
              <Label htmlFor="cover-photo">ID de Foto de Portada</Label>
              <div className="flex gap-2">
                <Input
                  id="cover-photo"
                  value={coverPhotoId}
                  onChange={(e) => setCoverPhotoId(e.target.value)}
                  placeholder="ID de la foto de portada"
                />
                <Button variant="outline" size="icon">
                  <Image className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Tags */}
            <div className="space-y-2">
              <Label>Etiquetas</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Nueva etiqueta"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button onClick={addTag} variant="outline">
                  <Tag className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button 
                        onClick={() => removeTag(tag)}
                        className="text-xs hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="sort-order">Orden</Label>
              <Input
                id="sort-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                placeholder="Orden de visualización"
              />
            </div>
            
            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <input
                id="active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label
                htmlFor="active"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Galería activa
              </label>
            </div>
          </div>
        )}
        
        {!isLoading && !success && !error && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        )}
        
        {(success || error) && (
          <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
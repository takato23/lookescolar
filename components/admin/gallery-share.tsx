'use client';

import { useState } from 'react';
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
  Share,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Link,
  Calendar,
  Eye,
  Download,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

interface GalleryShareProps {
  eventId: string;
  levelId?: string;
  courseId?: string;
  studentId?: string;
  onShareCreated?: (share: any) => void;
}

export default function GalleryShare({
  eventId,
  levelId,
  courseId,
  studentId,
  onShareCreated
}: GalleryShareProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  
  // Form state
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxViews, setMaxViews] = useState<number | ''>(100);
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowShare, setAllowShare] = useState(true);
  const [customMessage, setCustomMessage] = useState('');

  // Handle share creation
  const handleCreateShare = async () => {
    setIsCreating(true);
    setError(null);
    setSuccess(false);
    setShareUrl('');
    
    try {
      const requestBody: any = {
        expires_in_days: expiresInDays,
        allow_download: allowDownload,
        allow_share: allowShare,
        custom_message: customMessage,
      };

      // Add specific IDs based on level
      if (levelId) {
        requestBody.level_id = levelId;
      } else if (courseId) {
        requestBody.course_id = courseId;
      } else if (studentId) {
        requestBody.student_id = studentId;
      }

      const response = await fetch(`/api/admin/events/${eventId}/gallery/shares`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create gallery share');
      }

      const data = await response.json();
      
      if (data.success && data.share) {
        setSuccess(true);
        setShareUrl(data.share.share_url);
        
        // Call completion callback if provided
        if (onShareCreated) {
          onShareCreated(data.share);
        }
        
        // Show success toast
        toast.success('¡Enlace de compartir creado exitosamente!');
      } else {
        throw new Error(data.error || 'Failed to create gallery share');
      }
    } catch (err) {
      console.error('Error creating gallery share:', err);
      setError(err instanceof Error ? err.message : 'Failed to create gallery share');
      toast.error('Error al crear el enlace de compartir');
    } finally {
      setIsCreating(false);
    }
  };

  // Copy share URL to clipboard
  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  // Handle dialog open/close
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form when closing
      setTimeout(() => {
        setError(null);
        setSuccess(false);
        setShareUrl('');
        setExpiresInDays(7);
        setMaxViews(100);
        setAllowDownload(true);
        setAllowShare(true);
        setCustomMessage('');
      }, 300);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Share className="h-4 w-4" />
          <span className="hidden sm:inline">Compartir</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="h-5 w-5" />
            Compartir Galería
          </DialogTitle>
          <DialogDescription>
            Crea un enlace para compartir esta galería con familiares y amigos.
          </DialogDescription>
        </DialogHeader>
        
        {success ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-green-800">¡Enlace creado exitosamente!</h3>
              </div>
              <p className="mt-2 text-sm text-green-700">
                Copia el enlace a continuación y compártelo con quien desees.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="share-url">Enlace para compartir</Label>
              <div className="flex gap-2">
                <Input 
                  id="share-url"
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={copyToClipboard}
                  title="Copiar al portapapeles"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este enlace es único y seguro. Solo las personas con el enlace pueden acceder.
              </p>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{error}</span>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expires-in">Expira en</Label>
                  <Select 
                    value={expiresInDays.toString()} 
                    onValueChange={(value) => setExpiresInDays(parseInt(value))}
                  >
                    <SelectTrigger id="expires-in">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 día</SelectItem>
                      <SelectItem value="3">3 días</SelectItem>
                      <SelectItem value="7">7 días</SelectItem>
                      <SelectItem value="14">14 días</SelectItem>
                      <SelectItem value="30">30 días</SelectItem>
                      <SelectItem value="90">90 días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max-views">Vistas máximas</Label>
                  <Input
                    id="max-views"
                    type="number"
                    min="1"
                    max="10000"
                    value={maxViews}
                    onChange={(e) => setMaxViews(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="Sin límite"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-download">Permitir descargas</Label>
                  <Button
                    variant={allowDownload ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAllowDownload(!allowDownload)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {allowDownload ? 'Sí' : 'No'}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-share">Permitir compartir</Label>
                  <Button
                    variant={allowShare ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAllowShare(!allowShare)}
                    className="flex items-center gap-2"
                  >
                    <Share className="h-4 w-4" />
                    {allowShare ? 'Sí' : 'No'}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="custom-message">Mensaje personalizado</Label>
                <Textarea
                  id="custom-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Agrega un mensaje opcional para los destinatarios..."
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateShare} 
                disabled={isCreating}
                className="flex items-center gap-2"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link className="h-4 w-4" />
                )}
                Crear Enlace
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
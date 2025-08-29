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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileArchive,
} from 'lucide-react';

interface BulkDownloadProps {
  eventId: string;
  level?: 'event' | 'level' | 'course' | 'student';
  levelId?: string;
  courseId?: string;
  studentId?: string;
  photoCount?: number;
  selectedPhotos?: string[];
  onDownloadComplete?: () => void;
}

export default function BulkDownload({
  eventId,
  level = 'event',
  levelId,
  courseId,
  studentId,
  photoCount = 0,
  selectedPhotos = [],
  onDownloadComplete,
}: BulkDownloadProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<
    Array<{ filename: string; download_url: string }>
  >([]);
  const [zipJobId, setZipJobId] = useState<string | null>(null);

  // Form state
  const [photoTypes, setPhotoTypes] = useState<string[]>([
    'individual',
    'group',
    'activity',
    'event',
  ]);
  const [approvedOnly, setApprovedOnly] = useState(true);
  const [zipFilename, setZipFilename] = useState(
    `photos-${new Date().toISOString().split('T')[0]}.zip`
  );
  const [downloadType, setDownloadType] = useState<'individual' | 'zip'>(
    'individual'
  );

  // Handle photo type selection
  const togglePhotoType = (type: string) => {
    setPhotoTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Handle download
  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    setDownloadComplete(false);
    setZipJobId(null);

    try {
      if (downloadType === 'zip') {
        // Handle ZIP download
        await handleZipDownload();
      } else {
        // Handle individual downloads
        await handleIndividualDownload();
      }
    } catch (err) {
      console.error('Error during bulk download:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to download photos'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle individual photo downloads
  const handleIndividualDownload = async () => {
    // Prepare request body
    const requestBody: any = {
      level,
      photo_types: photoTypes,
      approved_only: approvedOnly,
      zip_filename: zipFilename,
      action: 'urls',
    };

    // Add specific IDs based on level
    if (level === 'level' && levelId) {
      requestBody.level_id = levelId;
    } else if (level === 'course' && courseId) {
      requestBody.course_id = courseId;
    } else if (level === 'student' && studentId) {
      requestBody.student_id = studentId;
    }

    // If specific photos are selected, use those instead
    if (selectedPhotos.length > 0) {
      requestBody.photo_ids = selectedPhotos;
    }

    // Call the bulk download API
    const response = await fetch(`/api/admin/events/${eventId}/bulk-download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to initiate download');
    }

    const data = await response.json();

    if (data.success && data.download_urls) {
      setDownloadUrls(data.download_urls);
      setDownloadComplete(true);

      // Automatically open download URLs in new tabs
      data.download_urls.forEach((urlObj: { download_url: string }) => {
        window.open(urlObj.download_url, '_blank');
      });

      // Call completion callback if provided
      if (onDownloadComplete) {
        onDownloadComplete();
      }
    } else {
      throw new Error(data.error || 'Failed to generate download URLs');
    }
  };

  // Handle ZIP file generation
  const handleZipDownload = async () => {
    // Prepare request body
    const requestBody: any = {
      level,
      photo_types: photoTypes,
      approved_only: approvedOnly,
      zip_filename: zipFilename,
    };

    // Add specific IDs based on level
    if (level === 'level' && levelId) {
      requestBody.level_id = levelId;
    } else if (level === 'course' && courseId) {
      requestBody.course_id = courseId;
    } else if (level === 'student' && studentId) {
      requestBody.student_id = studentId;
    }

    // If specific photos are selected, use those instead
    if (selectedPhotos.length > 0) {
      requestBody.photo_ids = selectedPhotos;
    }

    // Call the ZIP download API
    const response = await fetch(
      `/api/admin/events/${eventId}/bulk-download/zip`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to initiate ZIP generation');
    }

    const data = await response.json();

    if (data.success && data.job_id) {
      setZipJobId(data.job_id);
      setDownloadComplete(true);

      // In a full implementation, we would poll for job status
      // For now, we'll just show the completion message
    } else {
      throw new Error(data.error || 'Failed to initiate ZIP generation');
    }
  };

  // Reset form when dialog is closed
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state when closing
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadComplete(false);
        setError(null);
        setDownloadUrls([]);
        setZipJobId(null);
      }, 300);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Descarga Masiva
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Descarga Masiva de Fotos</DialogTitle>
          <DialogDescription>
            {selectedPhotos.length > 0
              ? `Descargar ${selectedPhotos.length} fotos seleccionadas`
              : `Descargar fotos del ${level === 'event' ? 'evento' : level === 'level' ? 'nivel' : level === 'course' ? 'curso' : 'estudiante'}`}
          </DialogDescription>
        </DialogHeader>

        {isDownloading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="text-primary mb-4 h-8 w-8 animate-spin" />
            <p className="text-center">
              {downloadType === 'zip'
                ? 'Generando archivo ZIP...'
                : 'Generando enlaces de descarga...'}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Esto puede tardar unos momentos
            </p>
          </div>
        ) : downloadComplete ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="mb-4 h-12 w-12 text-green-500" />
            <h3 className="mb-2 text-lg font-medium">¡Descarga iniciada!</h3>
            {downloadType === 'zip' ? (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  La generación del archivo ZIP ha comenzado.
                </p>
                <p className="text-muted-foreground mb-4 text-sm">
                  En una implementación completa, recibirías un enlace de
                  descarga cuando el archivo esté listo.
                </p>
                {zipJobId && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    ID del trabajo: {zipJobId}
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="text-muted-foreground mb-4 text-center">
                  Se han abierto {downloadUrls.length} pestañas para descargar
                  las fotos.
                </p>
                <p className="text-muted-foreground text-sm">
                  Si las descargas no comienzan automáticamente, haz clic en los
                  enlaces.
                </p>
              </>
            )}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="text-destructive mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-medium">Error en la descarga</h3>
            <p className="text-muted-foreground mb-4 text-center">{error}</p>
            <Button variant="outline" onClick={() => setError(null)}>
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Photo count info */}
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedPhotos.length > 0
                    ? 'Fotos seleccionadas'
                    : `Fotos en ${level === 'event' ? 'este evento' : level === 'level' ? 'este nivel' : level === 'course' ? 'este curso' : 'este estudiante'}`}
                </span>
                <Badge variant="secondary">
                  {selectedPhotos.length > 0
                    ? selectedPhotos.length
                    : photoCount}
                </Badge>
              </div>
            </div>

            {/* Download type */}
            <div className="space-y-2">
              <Label>Tipo de descarga</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={
                    downloadType === 'individual' ? 'default' : 'outline'
                  }
                  onClick={() => setDownloadType('individual')}
                  className="flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Individual
                </Button>
                <Button
                  variant={downloadType === 'zip' ? 'default' : 'outline'}
                  onClick={() => setDownloadType('zip')}
                  className="flex items-center justify-center gap-2"
                >
                  <FileArchive className="h-4 w-4" />
                  ZIP
                </Button>
              </div>
            </div>

            {/* Photo type filters */}
            <div className="space-y-3">
              <Label>Tipo de fotos</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="individual"
                    checked={photoTypes.includes('individual')}
                    onCheckedChange={() => togglePhotoType('individual')}
                  />
                  <label
                    htmlFor="individual"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Individual
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="group"
                    checked={photoTypes.includes('group')}
                    onCheckedChange={() => togglePhotoType('group')}
                  />
                  <label
                    htmlFor="group"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Grupo
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="activity"
                    checked={photoTypes.includes('activity')}
                    onCheckedChange={() => togglePhotoType('activity')}
                  />
                  <label
                    htmlFor="activity"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Actividad
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="event"
                    checked={photoTypes.includes('event')}
                    onCheckedChange={() => togglePhotoType('event')}
                  />
                  <label
                    htmlFor="event"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Evento
                  </label>
                </div>
              </div>
            </div>

            {/* Approval filter */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="approved-only"
                checked={approvedOnly}
                onCheckedChange={(checked) => setApprovedOnly(checked === true)}
              />
              <label
                htmlFor="approved-only"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Solo fotos aprobadas
              </label>
            </div>

            {/* ZIP filename */}
            <div className="space-y-2">
              <Label htmlFor="zip-filename">Nombre del archivo ZIP</Label>
              <Input
                id="zip-filename"
                value={zipFilename}
                onChange={(e) => setZipFilename(e.target.value)}
                placeholder="Nombre del archivo ZIP"
                disabled={downloadType !== 'zip'}
              />
            </div>
          </div>
        )}

        {!isDownloading && !downloadComplete && !error && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDownload} disabled={photoTypes.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
          </DialogFooter>
        )}

        {(downloadComplete || error) && (
          <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

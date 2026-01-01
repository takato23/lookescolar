'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { generateFamilyGalleryLink } from '@/lib/utils/gallery-links';
import {
  Loader2,
  Zap,
  CheckCircle2,
  Copy,
  QrCode,
  ExternalLink,
  Wrench,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface QuickPublishButtonProps {
  eventId: string;
  photoIds?: string[];
  onComplete?: () => void;
}

interface PublishResult {
  token: string;
  link: string;
  codeId: string;
}

export default function QuickPublishButton({
  eventId,
  photoIds,
  onComplete,
}: QuickPublishButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);

  const runQuickPublish = async () => {
    if (!eventId) {
      toast.error('Selecciona un evento primero');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('upload');

    try {
      // Step 0: Reparar previews con watermark fuerte (opcional)
      try {
        const rep = await fetch('/api/admin/photos/repair-previews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId }),
        });
        if (rep.ok) {
          const repJson = await rep.json();
          toast.success(
            `Previews reparadas: ${repJson.results?.filter((r: any) => r.repaired).length ?? 0}`
          );
        }
      } catch {}

      // Step 1: Apply watermark to photos
      setCurrentStep('watermark');
      toast.info('Aplicando watermark a las fotos...');

      const watermarkBody =
        photoIds && photoIds.length > 0 ? { photoIds } : { eventId };

      const watermarkRes = await fetch('/api/admin/photos/watermark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(watermarkBody),
      });

      if (!watermarkRes.ok) {
        const error = await watermarkRes.json();
        throw new Error(error.error || 'Error aplicando watermark');
      }

      const watermarkResult = await watermarkRes.json();
      toast.success(
        `Watermark aplicado a ${watermarkResult.processed || 'las'} fotos`
      );

      // Step 2: Detect QR anchors
      setCurrentStep('detect');
      toast.info('Detectando códigos QR en las fotos...');

      const detectRes = await fetch('/api/admin/anchor-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, onlyMissing: true }),
      });

      if (!detectRes.ok) {
        const error = await detectRes.json();
        throw new Error(error.error || 'Error detectando QR');
      }

      const detectResult = await detectRes.json();
      toast.success(`QR detectados: ${detectResult.detected || 0}`);

      // Step 3: Group photos by QR codes
      setCurrentStep('group');
      toast.info('Agrupando fotos por códigos QR...');

      const groupRes = await fetch('/api/admin/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });

      if (!groupRes.ok) {
        const error = await groupRes.json();
        throw new Error(error.error || 'Error agrupando fotos');
      }

      const groupResult = await groupRes.json();
      toast.success(`Fotos agrupadas: ${groupResult.assigned || 0} asignadas`);

      // Step 4: Publish all codes for the event
      setCurrentStep('publish');
      toast.info('Publicando códigos y generando enlaces...');

      const publishRes = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });

      if (!publishRes.ok) {
        const error = await publishRes.json();
        throw new Error(error.error || 'Error publicando');
      }

      const publishResult = await publishRes.json();

      // Step 5: Get published codes with links
      setCurrentStep('links');
      toast.info('Obteniendo enlaces para compartir...');

      const listRes = await fetch(`/api/admin/publish/list?eventId=${eventId}`);
      if (!listRes.ok) {
        throw new Error('Error obteniendo enlaces');
      }

      const listResult = await listRes.json();
      const codes = Array.isArray(listResult)
        ? listResult
        : listResult.rows || [];

      // Filter published codes with tokens
      const publishedCodes = codes.filter(
        (c: any) => c.is_published && c.token
      );

      // Generate links for each code
      const results: PublishResult[] = publishedCodes.map((code: any) => ({
        token: code.token,
        link: generateFamilyGalleryLink({
          token: code.token,
          eventId: code.event_id || eventId,
          origin: window.location.origin,
        }),
        codeId: code.code_id || code.id,
      }));

      setPublishResults(results);
      setShowResults(true);
      setCurrentStep('');

      toast.success('¡Proceso completado! Enlaces listos para compartir');

      onComplete?.();
    } catch (error) {
      console.error('Quick publish error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error en el proceso de publicación'
      );
    } finally {
      setIsProcessing(false);
      setCurrentStep('');
    }
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const copyAllLinks = async () => {
    const allLinks = publishResults.map((r) => r.link).join('\n');
    try {
      await navigator.clipboard.writeText(allLinks);
      toast.success('Todos los enlaces copiados');
    } catch {
      toast.error('No se pudo copiar los enlaces');
    }
  };

  const getStepMessage = () => {
    switch (currentStep) {
      case 'upload':
        return 'Preparando...';
      case 'watermark':
        return 'Aplicando watermark...';
      case 'detect':
        return 'Detectando códigos QR...';
      case 'group':
        return 'Agrupando fotos...';
      case 'publish':
        return 'Publicando...';
      case 'links':
        return 'Generando enlaces...';
      default:
        return 'Procesando...';
    }
  };

  return (
    <>
      <Button
        onClick={runQuickPublish}
        disabled={isProcessing || !eventId}
        className="gap-2"
        variant="default"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {getStepMessage()}
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Publicar Rápido
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              ¡Listo para compartir!
            </DialogTitle>
            <DialogDescription>
              Se han generado {publishResults.length} enlaces para compartir con
              los clientes
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {publishResults.length > 1 && (
              <Button
                onClick={copyAllLinks}
                variant="outline"
                className="w-full"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar todos los enlaces
              </Button>
            )}

            <div className="space-y-2">
              {publishResults.map((result, index) => (
                <div
                  key={result.codeId}
                  className="space-y-2 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Código #{index + 1}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyLink(result.link)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // TODO: Show QR modal
                          toast.info('QR disponible próximamente');
                        }}
                      >
                        <QrCode className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 break-all text-xs">
                    {result.link}
                  </div>
                </div>
              ))}
            </div>

            {publishResults.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400 py-8 text-center">
                No se encontraron códigos publicados. Verifica que las fotos
                tengan códigos QR asignados.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

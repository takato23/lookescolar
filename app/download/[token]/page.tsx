'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, CheckCircle, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';

interface DownloadInfo {
  valid: boolean;
  photoId?: string;
  remainingDownloads?: number;
  expiresAt?: string;
  downloadCount?: number;
  maxDownloads?: number;
  error?: string;
}

interface DownloadResult {
  success: boolean;
  downloadUrl?: string;
  remainingDownloads?: number;
  filename?: string;
  error?: string;
}

export default function DownloadPage() {
  const params = useParams();
  const token = params.token as string;

  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch download info on mount
  useEffect(() => {
    async function fetchInfo() {
      try {
        const response = await fetch(`/api/downloads/${token}`);
        const data = await response.json();
        setDownloadInfo(data);
      } catch {
        setError('Error al cargar informacion de descarga');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchInfo();
    }
  }, [token]);

  // Handle download
  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/downloads/${token}`, {
        method: 'POST',
      });
      const data: DownloadResult = await response.json();

      if (!data.success || !data.downloadUrl) {
        setError(data.error || 'Error al procesar descarga');
        return;
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename || 'foto.jpg';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Update UI
      setDownloadComplete(true);
      setDownloadInfo((prev) =>
        prev
          ? {
              ...prev,
              remainingDownloads: data.remainingDownloads,
              downloadCount: (prev.downloadCount || 0) + 1,
            }
          : null
      );
    } catch {
      setError('Error al descargar el archivo');
    } finally {
      setDownloading(false);
    }
  }, [token]);

  // Format expiration date
  const formatExpiration = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours < 0) return 'Expirado';
    if (diffHours < 1) return 'Menos de 1 hora';
    if (diffHours < 24) return `${diffHours} horas`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Download className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Descarga de foto</CardTitle>
          <CardDescription>
            {downloadInfo?.valid
              ? 'Tu foto esta lista para descargar'
              : 'Enlace no disponible'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error state */}
          {!downloadInfo?.valid && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {downloadInfo?.error || 'Este enlace de descarga no es valido o ha expirado.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Valid download */}
          {downloadInfo?.valid && (
            <>
              {/* Download stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                    <Download className="h-4 w-4" />
                    <span className="text-sm">Restantes</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {downloadInfo.remainingDownloads ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">
                    de {downloadInfo.maxDownloads} descargas
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Expira en</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {downloadInfo.expiresAt
                      ? formatExpiration(downloadInfo.expiresAt)
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Warning if low downloads */}
              {(downloadInfo.remainingDownloads ?? 0) === 1 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Esta es tu ultima descarga disponible.
                  </AlertDescription>
                </Alert>
              )}

              {/* Download complete message */}
              {downloadComplete && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Descarga iniciada correctamente. Revisa tu carpeta de descargas.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error message */}
              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Download button */}
              <Button
                onClick={handleDownload}
                disabled={downloading || (downloadInfo.remainingDownloads ?? 0) === 0}
                className="w-full h-12 text-lg"
                size="lg"
              >
                {downloading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Descargando...
                  </>
                ) : (downloadInfo.remainingDownloads ?? 0) === 0 ? (
                  'Sin descargas disponibles'
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Descargar foto
                  </>
                )}
              </Button>

              {/* Info text */}
              <p className="text-xs text-gray-500 text-center">
                Este enlace es personal. No lo compartas con terceros.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

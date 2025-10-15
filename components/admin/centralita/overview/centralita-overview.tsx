'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSearchParams, useRouter } from 'next/navigation';
import { Copy, ExternalLink, Zap, BarChart3, Users, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function CentralitaOverview({
  stats,
  getPublicUrl,
  hasEvent,
}: {
  stats: { total: number; published: number; unpublished: number; totalPhotos: number };
  getPublicUrl: () => string;
  hasEvent: boolean;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const eventId = sp.get('event_id') || '';

  return (
    <div className="centralita-overview space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Zap className="h-5 w-5 text-purple-600" />
            Acciones rápidas
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => router.replace(`?tab=folders${eventId ? `&event_id=${eventId}` : ''}`)}>
              <FolderOpen className="mr-2 h-4 w-4" /> Ir a Carpetas
            </Button>
            <Button variant="outline" onClick={() => router.replace(`?tab=public${eventId ? `&event_id=${eventId}` : ''}`)}>
              <Users className="mr-2 h-4 w-4" /> Galería Pública
            </Button>
            <Button variant="outline" onClick={() => router.replace(`?tab=analytics${eventId ? `&event_id=${eventId}` : ''}`)}>
              <BarChart3 className="mr-2 h-4 w-4" /> Analytics
            </Button>
            {hasEvent && (
              <Button asChild>
                <a href={getPublicUrl()} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Vista Familia
                </a>
              </Button>
            )}
          </div>
        </Card>

        {/* KPIs */}
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">KPIs</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total carpetas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.published}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Publicadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.unpublished}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Privadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalPhotos}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Fotos totales</div>
            </div>
          </div>
        </Card>

        {/* Público */}
        <Card className="p-6">
          <h3 className="mb-2 text-lg font-semibold">Enlace público</h3>
          {hasEvent ? (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted p-3 text-xs">
                {getPublicUrl() || 'Habilita la galería pública para obtener un enlace'}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    const url = getPublicUrl();
                    if (!url) {
                      toast.error('Primero habilitá la galería pública');
                      return;
                    }
                    try {
                      await navigator.clipboard.writeText(url);
                      toast.success('Enlace copiado');
                    } catch {
                      toast.error('No se pudo copiar el enlace');
                    }
                  }}
                  disabled={!getPublicUrl()}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copiar
                </Button>
                {getPublicUrl() ? (
                  <Button size="sm" asChild variant="outline">
                    <a href={getPublicUrl()} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" /> Abrir
                    </a>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.error('Habilitá la galería pública para obtener un enlace')}
                    disabled={!getPublicUrl()}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" /> Abrir
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Selecciona un evento para ver su enlace público.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

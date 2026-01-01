'use client';

/**
 * Centralita de Publicación - Overview Dashboard
 * Vista principal de la centralita con estadísticas y quick actions
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Eye,
  EyeOff,
  Link2,
  TrendingUp,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

interface CentralitaOverviewProps {
  eventId?: string | null;
}

export function CentralitaOverview({ eventId }: CentralitaOverviewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // Fetch published folders stats
  const { data: publishedStats, refetch } = useQuery({
    queryKey: ['centralita-stats', eventId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (eventId) params.set('event_id', eventId);
      params.set('include_unpublished', 'true');
      params.set('limit', '100');

      const res = await fetch(`/api/admin/folders/published?${params}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const folders = publishedStats?.folders || [];
  const totalFolders = folders.length;
  const publishedFolders = folders.filter((f: any) => f.is_published).length;
  const unpublishedFolders = totalFolders - publishedFolders;
  const totalPhotos = folders.reduce(
    (sum: number, f: any) => sum + (f.photo_count || 0),
    0
  );

  // Bulk publish mutation
  const bulkPublishMutation = useMutation({
    mutationFn: async (folderIds: string[]) => {
      const res = await fetch('/api/admin/folders/bulk-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder_ids: folderIds,
          action: 'publish',
          batch_size: 5,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to publish folders');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(
        `Publicadas ${data.successful}/${data.total_processed} carpetas`
      );
      queryClient.invalidateQueries({ queryKey: ['centralita-stats'] });
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error al publicar: ${error.message}`);
    },
    onSettled: () => {
      setIsPublishing(false);
    },
  });

  // Bulk unpublish mutation
  const bulkUnpublishMutation = useMutation({
    mutationFn: async (folderIds: string[]) => {
      const res = await fetch('/api/admin/folders/bulk-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder_ids: folderIds,
          action: 'unpublish',
          batch_size: 5,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to unpublish folders');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(
        `Despublicadas ${data.successful}/${data.total_processed} carpetas`
      );
      queryClient.invalidateQueries({ queryKey: ['centralita-stats'] });
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error al despublicar: ${error.message}`);
    },
    onSettled: () => {
      setIsUnpublishing(false);
    },
  });

  // Rotate tokens mutation
  const rotateTokensMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error('Event ID required');
      const res = await fetch(`/api/admin/events/${eventId}/tokens/enhanced`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rotation_reason: 'admin_request',
          notify_families: false,
          force_rotation: false,
          days_before_expiry: 30,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to rotate tokens');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(
        `Rotados ${data.tokens_rotated || 0} enlaces exitosamente`
      );
      queryClient.invalidateQueries({ queryKey: ['centralita-stats'] });
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Error al rotar enlaces: ${error.message}`);
    },
    onSettled: () => {
      setIsRotating(false);
    },
  });

  const handleQuickPublish = async () => {
    if (!folders.length) {
      toast.info('No hay carpetas para publicar');
      return;
    }

    const unpublishedIds = folders
      .filter((f: any) => !f.is_published)
      .map((f: any) => f.id);

    if (unpublishedIds.length === 0) {
      toast.info('Todas las carpetas ya están publicadas');
      return;
    }

    setIsPublishing(true);
    bulkPublishMutation.mutate(unpublishedIds);
  };

  const handleUnpublishAll = async () => {
    if (!folders.length) {
      toast.info('No hay carpetas para despublicar');
      return;
    }

    const publishedIds = folders
      .filter((f: any) => f.is_published)
      .map((f: any) => f.id);

    if (publishedIds.length === 0) {
      toast.info('No hay carpetas publicadas');
      return;
    }

    if (
      !confirm(
        `¿Despublicar ${publishedIds.length} carpeta${publishedIds.length > 1 ? 's' : ''}?`
      )
    ) {
      return;
    }

    setIsUnpublishing(true);
    bulkUnpublishMutation.mutate(publishedIds);
  };

  const handleRotateLinks = async () => {
    if (!eventId) {
      toast.error('Se requiere un evento para rotar enlaces');
      return;
    }

    if (
      !confirm(
        '¿Rotar todos los enlaces de este evento? Los enlaces actuales dejarán de funcionar.'
      )
    ) {
      return;
    }

    setIsRotating(true);
    rotateTokensMutation.mutate();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Button
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={handleQuickPublish}
          disabled={isPublishing || !folders.length}
        >
          {isPublishing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Eye className="h-6 w-6" />
          )}
          <span className="text-sm font-medium">Publicar Todo</span>
        </Button>

        <Button
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={handleUnpublishAll}
          disabled={isUnpublishing || !folders.length}
        >
          {isUnpublishing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <EyeOff className="h-6 w-6" />
          )}
          <span className="text-sm font-medium">Despublicar Todo</span>
        </Button>

        <Button
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={handleRotateLinks}
          disabled={isRotating || !eventId}
        >
          {isRotating ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Link2 className="h-6 w-6" />
          )}
          <span className="text-sm font-medium">Rotar Enlaces</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Carpetas
            </CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFolders}</div>
            <p className="text-xs text-muted-foreground">
              {unpublishedFolders} sin publicar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Publicadas
            </CardTitle>
            <Eye className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {publishedFolders}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalFolders > 0
                ? `${Math.round((publishedFolders / totalFolders) * 100)}% del total`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fotos</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPhotos}</div>
            <p className="text-xs text-muted-foreground">En todas las carpetas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalFolders > 0
                ? Math.round(totalPhotos / totalFolders)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Fotos por carpeta</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity or Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Inicio Rápido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            • <strong>Publicar una carpeta:</strong> Selecciona una carpeta y
            haz clic en "Publicar"
          </p>
          <p>
            • <strong>Ver galería pública:</strong> Cambia a la pestaña "Galería
            Pública"
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import {
  Store,
  Eye,
  Image as ImageIcon,
  Calendar,
  ExternalLink,
  QrCode,
  Settings,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface PublishedStore {
  folder_id: string;
  folder_name: string;
  share_token: string;
  is_published: boolean;
  published_at: string;
  view_count: number;
  store_settings: {
    allow_download?: boolean;
    watermark_enabled?: boolean;
    store_title?: string;
    store_description?: string;
    contact_info?: string;
  };
  store_url: string;
  event_id: string;
  event_name: string;
  event_date?: string;
  asset_count: number;
  qr_code_url: string;
}

interface StoreManagerProps {
  eventId?: string; // Si se especifica, solo muestra tiendas de ese evento
  className?: string;
}

export default function StoreManager({
  eventId,
  className,
}: StoreManagerProps) {
  const [stores, setStores] = useState<PublishedStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<PublishedStore | null>(
    null
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Cargar tiendas
  const loadStores = async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (eventId) params.set('event_id', eventId);

      const response = await fetch(`/api/admin/stores?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStores(data.stores || []);
      } else {
        throw new Error('Failed to load stores');
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      toast.error('Error cargando tiendas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, [eventId]);

  // Despublicar tienda
  const unpublishStore = async (store: PublishedStore) => {
    if (!confirm(`¿Estás seguro de despublicar "${store.folder_name}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/stores?folder_id=${store.folder_id}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        toast.success('Tienda despublicada exitosamente');
        await loadStores();
      } else {
        throw new Error('Failed to unpublish store');
      }
    } catch (error) {
      console.error('Error unpublishing store:', error);
      toast.error('Error despublicando tienda');
    }
  };

  // Copiar enlace
  const copyStoreLink = async (store: PublishedStore) => {
    const fullUrl = `${window.location.origin}/store/${store.share_token}`;
    await navigator.clipboard.writeText(fullUrl);
    toast.success('Enlace copiado al portapapeles');
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Cargando tiendas...
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Gestión de Tiendas
          </h2>
          <p className="mt-1 text-gray-600">
            Administra las tiendas públicas para compartir fotos con familias
          </p>
        </div>

        <CreateStoreDialog
          eventId={eventId}
          onStoreCreated={loadStores}
          trigger={
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nueva Tienda
            </Button>
          }
        />
      </div>

      {/* Stats */}
      {stores.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Store className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Tiendas
                  </p>
                  <p className="text-2xl font-bold">{stores.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Eye className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Vistas
                  </p>
                  <p className="text-2xl font-bold">
                    {stores.reduce((sum, store) => sum + store.view_count, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ImageIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Fotos
                  </p>
                  <p className="text-2xl font-bold">
                    {stores.reduce((sum, store) => sum + store.asset_count, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Eventos</p>
                  <p className="text-2xl font-bold">
                    {new Set(stores.map((store) => store.event_id)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de tiendas */}
      {stores.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Store className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              No hay tiendas publicadas
            </h3>
            <p className="mb-4 text-gray-500">
              Crea tu primera tienda para compartir fotos con las familias
            </p>
            <CreateStoreDialog
              eventId={eventId}
              onStoreCreated={loadStores}
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera Tienda
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {stores.map((store) => (
            <StoreCard
              key={store.folder_id}
              store={store}
              onUnpublish={() => unpublishStore(store)}
              onCopyLink={() => copyStoreLink(store)}
              onSettings={() => {
                setSelectedStore(store);
                setShowSettingsDialog(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Dialog de configuración */}
      {selectedStore && (
        <StoreSettingsDialog
          store={selectedStore}
          isOpen={showSettingsDialog}
          onClose={() => {
            setShowSettingsDialog(false);
            setSelectedStore(null);
          }}
          onUpdated={loadStores}
        />
      )}
    </div>
  );
}

// Componente para cada tienda
interface StoreCardProps {
  store: PublishedStore;
  onUnpublish: () => void;
  onCopyLink: () => void;
  onSettings: () => void;
}

function StoreCard({
  store,
  onUnpublish,
  onCopyLink,
  onSettings,
}: StoreCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">
              {store.store_settings.store_title || store.folder_name}
            </CardTitle>
            <p className="mt-1 text-sm text-gray-600">{store.event_name}</p>
            {store.event_date && (
              <p className="mt-1 text-xs text-gray-500">
                {new Date(store.event_date).toLocaleDateString('es-ES')}
              </p>
            )}
          </div>
          <Badge variant="secondary">Publicada</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {store.view_count}
            </p>
            <p className="text-xs text-gray-500">Vistas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {store.asset_count}
            </p>
            <p className="text-xs text-gray-500">Fotos</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyLink}
            className="w-full"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Copiar Enlace
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettings}
              className="flex-1"
            >
              <Settings className="mr-2 h-4 w-4" />
              Config
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(store.qr_code_url, '_blank')}
              className="flex-1"
            >
              <QrCode className="mr-2 h-4 w-4" />
              QR
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onUnpublish}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Dialog para crear nueva tienda
interface CreateStoreDialogProps {
  eventId?: string;
  onStoreCreated: () => void;
  trigger: React.ReactNode;
}

function CreateStoreDialog({
  eventId,
  onStoreCreated,
  trigger,
}: CreateStoreDialogProps) {
  // TODO: Implementar formulario para crear tienda
  // - Selector de evento (si no se especifica eventId)
  // - Selector de carpeta
  // - Configuración inicial

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Nueva Tienda</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-600">
            Funcionalidad en desarrollo. Por ahora puedes publicar carpetas
            individualmente desde la gestión de eventos.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Dialog de configuración de tienda
interface StoreSettingsDialogProps {
  store: PublishedStore;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

function StoreSettingsDialog({
  store,
  isOpen,
  onClose,
  onUpdated,
}: StoreSettingsDialogProps) {
  // TODO: Implementar formulario de configuración
  // - Título personalizado
  // - Descripción
  // - Configuración de descarga
  // - Información de contacto

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Tienda</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-600">
            Configuración de tienda en desarrollo.
          </p>
          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <h4 className="mb-2 font-medium">Tienda: {store.folder_name}</h4>
            <p className="text-sm text-gray-600">Token: {store.share_token}</p>
            <p className="text-sm text-gray-600">Vistas: {store.view_count}</p>
            <p className="text-sm text-gray-600">Fotos: {store.asset_count}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

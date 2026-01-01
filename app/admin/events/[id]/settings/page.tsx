'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updateEventSettings, type EventSettings } from '../actions';
import DesignPanel from '@/components/admin/DesignPanel';
import GalleryConfigPanel from '@/components/admin/GalleryConfigPanel';
import { StoreConfigPanel } from '@/components/admin/shared/StoreConfigPanel';
import { computePhotoAdminUrl } from '@/lib/routes/admin';
import { Check, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const defaults: EventSettings = {
  general: { showOnHomepage: true, location: '' },
  privacy: { passwordEnabled: false, password: '' },
  download: { enabled: true, sizes: ['web', 'small'], pinEnabled: false },
  store: { enabled: false, priceSheetId: '', showInStore: false },
};

type EventPhoto = {
  id: string;
  storage_path: string | null;
  preview_url?: string;
};

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [settings, setSettings] = useState<EventSettings>(defaults);
  const [saving, startSaving] = useTransition();
  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);
  const [loadingCover, setLoadingCover] = useState(false);

  const general = settings.general ?? { ...defaults.general };
  const privacy = settings.privacy ?? { ...defaults.privacy };
  const download = settings.download ?? { ...defaults.download };
  const store = settings.store ?? { ...defaults.store };

  // Load event data and photos
  useEffect(() => {
    (async () => {
      // Load event
      let res = await fetch(`/api/admin/events/${id}`, { cache: 'no-store' });
      if (!res.ok) {
        res = await fetch(`/api/admin/events?id=${id}`, { cache: 'no-store' });
      }
      const json = await res.json();
      const eventData = json.event || json;
      setEvent(eventData);
      if (json.event?.settings)
        setSettings((s) => ({ ...s, ...json.event.settings }));
      if (json.settings) setSettings((s) => ({ ...s, ...json.settings }));

      // Get cover photo from metadata
      const metadata = eventData?.metadata || {};
      if (metadata.cover_photo_id) {
        setCoverPhotoId(metadata.cover_photo_id);
      }

      // Load photos for cover selection
      try {
        const photosRes = await fetch(`/api/admin/events/${id}/photos?limit=12`, { cache: 'no-store' });
        if (photosRes.ok) {
          const photosJson = await photosRes.json();
          setPhotos(photosJson.photos || photosJson.data || []);
        }
      } catch (e) {
        console.warn('Could not load photos for cover selection');
      }
    })();
  }, [id]);

  // Set cover photo
  const setCoverPhoto = useCallback(async (photoId: string) => {
    setLoadingCover(true);
    try {
      const res = await fetch(`/api/admin/events/${id}/cover`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_id: photoId }),
      });
      if (res.ok) {
        setCoverPhotoId(photoId);
        toast.success('Foto de portada actualizada');
      } else {
        toast.error('Error al establecer foto de portada');
      }
    } catch (e) {
      toast.error('Error al establecer foto de portada');
    } finally {
      setLoadingCover(false);
    }
  }, [id]);

  // Build preview URL from storage_path
  const getPhotoPreviewUrl = (photo: EventPhoto) => {
    if (photo.preview_url) return photo.preview_url;
    if (!photo.storage_path) return null;
    const filename = photo.storage_path.split('/').pop();
    if (!filename) return null;
    const baseName = filename.replace(/\.[^.]+$/, '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return `${supabaseUrl}/storage/v1/object/public/photos/previews/${baseName}_preview.webp`;
  };

  const save = () =>
    startSaving(async () => {
      try {
        await updateEventSettings(id, settings);
        toast.success('Ajustes guardados');
      } catch (e: any) {
        toast.error(e?.message || 'No se pudo guardar ajustes');
      }
    });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{event?.name || 'Evento'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {event?.date ? new Date(event.date).toLocaleDateString() : ''}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const url = computePhotoAdminUrl(id, general.rootFolderId ?? undefined);
            window.location.href = url;
          }}
        >
          Abrir en AdminFotos
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="download">Download</TabsTrigger>
          <TabsTrigger value="store">Tienda</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="space-y-6">
            {/* Cover Photo Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Foto de Portada</CardTitle>
                <CardDescription>
                  Selecciona la foto principal que aparecerá en el listado de eventos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {photos.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {photos.slice(0, 12).map((photo) => {
                      const previewUrl = getPhotoPreviewUrl(photo);
                      const isSelected = coverPhotoId === photo.id;
                      return (
                        <button
                          key={photo.id}
                          type="button"
                          disabled={loadingCover}
                          onClick={() => setCoverPhoto(photo.id)}
                          className={cn(
                            'relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105',
                            isSelected
                              ? 'border-violet-500 ring-2 ring-violet-500/30'
                              : 'border-transparent hover:border-gray-300'
                          )}
                        >
                          {previewUrl ? (
                            <Image
                              src={previewUrl}
                              alt="Foto del evento"
                              fill
                              className="object-cover"
                              sizes="100px"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full bg-gray-100">
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                              <div className="bg-violet-500 rounded-full p-1">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No hay fotos para seleccionar como portada</p>
                    <p className="text-sm">Sube fotos al evento primero</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle>General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Show on Homepage</Label>
                  <Switch
                    checked={Boolean(general.showOnHomepage)}
                    onCheckedChange={(v) =>
                      setSettings((s) => ({
                        ...s,
                        general: { ...(s.general ?? {}), showOnHomepage: v },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={general.location || ''}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        general: {
                          ...(s.general ?? {}),
                          location: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="design">
          <Card>
            <CardHeader>
              <CardTitle>Design</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Panel de diseño estilo Pixieset */}
              <DesignPanel
                eventId={id}
                initialDesign={(event?.settings?.design as any) || null}
                currentTheme={(event?.theme as any) || 'default'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Password Enabled</Label>
                <Switch
                  checked={Boolean(privacy.passwordEnabled)}
                  onCheckedChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      privacy: { ...(s.privacy ?? {}), passwordEnabled: v },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  disabled={!privacy.passwordEnabled}
                  value={privacy.password || ''}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      privacy: {
                        ...(s.privacy ?? {}),
                        password: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="download">
          <Card>
            <CardHeader>
              <CardTitle>Download</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Downloads</Label>
                <Switch
                  checked={Boolean(download.enabled)}
                  onCheckedChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      download: { ...(s.download ?? {}), enabled: v },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Sizes</Label>
                <div className="flex gap-3 text-sm">
                  {(['web', 'small', 'original'] as const).map((sz) => (
                    <label key={sz} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          Array.isArray(download.sizes)
                            ? download.sizes.includes(sz)
                            : false
                        }
                        onChange={(e) => {
                          const set = new Set(download.sizes ?? []);
                          e.target.checked ? set.add(sz) : set.delete(sz);
                          setSettings((s) => ({
                            ...s,
                            download: {
                              ...(s.download ?? {}),
                              sizes: Array.from(set),
                            },
                          }));
                        }}
                      />
                      {sz}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>PIN (4 dígitos)</Label>
                <Switch
                  checked={Boolean(download.pinEnabled)}
                  onCheckedChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      download: { ...(s.download ?? {}), pinEnabled: v },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="store">
          <StoreConfigPanel mode="event" eventId={id} />
        </TabsContent>

        <TabsContent value="gallery">
          <GalleryConfigPanel
            eventId={id}
            eventName={event?.name || ''}
            eventDate={event?.date ? new Date(event.date).toLocaleDateString() : undefined}
            initialMetadata={event?.metadata || null}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}

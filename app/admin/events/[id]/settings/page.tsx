'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updateEventSettings, type EventSettings } from '../actions';
import DesignPanel from '@/components/admin/DesignPanel';
import { computePhotoAdminUrl } from '@/lib/routes/admin';

const defaults: EventSettings = {
  general: { showOnHomepage: true, location: '' },
  privacy: { passwordEnabled: false, password: '' },
  download: { enabled: true, sizes: ['web', 'small'], pinEnabled: false },
  store: { enabled: false, priceSheetId: '', showInStore: false },
};

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [settings, setSettings] = useState<EventSettings>(defaults);
  const [saving, startSaving] = useTransition();
  const [event, setEvent] = useState<any>(null);

  const general = settings.general ?? { ...defaults.general };
  const privacy = settings.privacy ?? { ...defaults.privacy };
  const download = settings.download ?? { ...defaults.download };
  const store = settings.store ?? { ...defaults.store };

  useEffect(() => {
    (async () => {
      let res = await fetch(`/api/admin/events/${id}`, { cache: 'no-store' });
      if (!res.ok) {
        res = await fetch(`/api/admin/events?id=${id}`, { cache: 'no-store' });
      }
      const json = await res.json();
      setEvent(json.event || json);
      if (json.event?.settings)
        setSettings((s) => ({ ...s, ...json.event.settings }));
      if (json.settings) setSettings((s) => ({ ...s, ...json.settings }));
    })();
  }, [id]);

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
            const url = computePhotoAdminUrl(id, general.rootFolderId ?? null);
            window.location.href = url;
          }}
        >
          Abrir en AdminFotos
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="download">Download</TabsTrigger>
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
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
          <Card>
            <CardHeader>
              <CardTitle>Store</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable store</Label>
                <Switch
                  checked={Boolean(store.enabled)}
                  onCheckedChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      store: { ...(s.store ?? {}), enabled: v },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Price Sheet ID</Label>
                <Input
                  value={store.priceSheetId || ''}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      store: {
                        ...(s.store ?? {}),
                        priceSheetId: e.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show in Store</Label>
                <Switch
                  checked={Boolean(store.showInStore)}
                  onCheckedChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      store: { ...(s.store ?? {}), showInStore: v },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
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

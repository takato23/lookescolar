'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function AlbumsPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const e = await fetch(`/api/admin/events/${id}`, { cache: 'no-store' }).then((r) => r.json());
      setEvent(e.event || e);
      const f = await fetch(`/api/admin/folders?event_id=${id}`).then((r) => r.json());
      setFolders(f.folders || []);
    })();
  }, [id]);

  const getParent = (f: any) => f.parent_folder_id ?? f.parent_id ?? null;
  const root = useMemo(() => folders.find((f: any) => getParent(f) === null) || null, [folders]);
  const children = useMemo(
    () => folders.filter((f: any) => getParent(f) === (root?.id ?? null)),
    [folders, root]
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Álbumes — {event?.name || 'Evento'}</h1>
        {root && (
          <Link
            href={`/admin/photos?event_id=${id}&folder_id=${root.id}&include_children=true`}
          >
            <Button variant="outline">Abrir en AdminFotos</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subcarpetas de {root?.name || 'raíz'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((c: any) => (
              <div key={c.id} className="rounded border p-4">
                <div className="mb-2 font-medium">{c.name}</div>
                <Badge variant="secondary">{c.photo_count ?? c.assets_count ?? 0} fotos</Badge>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/photos?event_id=${id}&folder_id=${c.id}&include_children=true`}
                  >
                    <Button size="sm" variant="outline">
                      Abrir
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {children.length === 0 && (
              <div className="text-sm text-gray-500">Sin subcarpetas</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


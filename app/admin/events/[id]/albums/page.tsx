'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AlbumManagerPremium from '@/components/admin/albums/AlbumManagerPremium';

interface Event {
  id: string;
  name: string;
  school?: string;
  location?: string;
  date?: string;
}

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  event_id?: string | null;
  depth: number;
  photo_count: number;
  has_children: boolean;
  child_folder_count?: number;
  scope?: 'event' | 'global' | 'legacy' | 'template';
}

export default function AlbumsPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load event and folders in parallel
        const [eventRes, foldersRes] = await Promise.all([
          fetch(`/api/admin/events/${id}`, { cache: 'no-store' }),
          fetch(`/api/admin/folders?event_id=${id}`),
        ]);

        if (!eventRes.ok) {
          throw new Error('Error al cargar el evento');
        }

        const eventData = await eventRes.json();
        setEvent(eventData.event || eventData);

        if (foldersRes.ok) {
          const foldersData = await foldersRes.json();
          setFolders(foldersData.folders || []);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <Link href="/admin/events">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a eventos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link
          href="/admin/events"
          className="hover:text-violet-600 transition-colors"
        >
          Eventos
        </Link>
        <span>/</span>
        <Link
          href={`/admin/events/${id}`}
          className="hover:text-violet-600 transition-colors"
        >
          {event?.name || 'Evento'}
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-900 dark:text-white">
          Álbumes
        </span>
      </div>

      {/* Album Manager */}
      <AlbumManagerPremium
        eventId={id}
        eventName={event?.name || undefined}
        initialFolders={folders}
      />
    </div>
  );
}

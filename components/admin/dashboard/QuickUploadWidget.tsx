'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { EventSummary } from '@/types/dashboard';
import { toast } from 'sonner';

interface QuickUploadWidgetProps {
  events: EventSummary[];
  onUpload: (payload: { files: File[]; eventId: string }) => void;
}

export function QuickUploadWidget({
  events,
  onUpload,
}: QuickUploadWidgetProps) {
  const [selectedEventId, setSelectedEventId] = useState('');

  useEffect(() => {
    if (!events.length) {
      setSelectedEventId('');
      return;
    }
    const stillExists = events.some((event) => event.id === selectedEventId);
    if (!selectedEventId || !stillExists) {
      setSelectedEventId(events[0]?.id ?? '');
    }
  }, [events, selectedEventId]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId),
    [events, selectedEventId]
  );

  const handleDrop = useCallback(
    (files: File[]) => {
      if (!selectedEventId) {
        toast.error('Selecciona un evento antes de subir carpetas.');
        return;
      }
      if (!files.length) return;
      onUpload({ files, eventId: selectedEventId });
    },
    [onUpload, selectedEventId]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleDrop,
    noClick: true,
    noKeyboard: true,
    accept: { 'image/*': [] },
  });

  const handleSelectClick = useCallback(() => {
    if (!selectedEventId) {
      toast.error('Selecciona un evento antes de subir carpetas.');
      return;
    }
    open();
  }, [open, selectedEventId]);

  if (!events.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200/70 bg-white/60 p-6 text-center dark:border-slate-800/70 dark:bg-slate-950/40">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200/70 bg-slate-100 text-slate-600 dark:border-slate-800/70 dark:bg-slate-900 dark:text-slate-200">
          <FolderPlus className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Crea un evento para habilitar la subida rápida
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Necesitas al menos un evento activo para generar galerías.
        </p>
        <Button size="sm" variant="secondary" className="mt-4" asChild>
          <a href="/admin/events/new">Crear evento</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="h-10 rounded-xl text-sm bg-white/80 dark:bg-slate-950/60">
              <SelectValue placeholder="Selecciona un evento" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEvent?.date && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Último evento: {selectedEvent.date}
            </p>
          )}
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={handleSelectClick}
          className="h-10 px-4"
        >
          Seleccionar carpeta
        </Button>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          'flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200',
          isDragActive
            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40'
            : 'border-slate-200/70 bg-white/70 hover:border-indigo-300 dark:border-slate-800/70 dark:bg-slate-950/60'
        )}
        onClick={handleSelectClick}
      >
        <input
          {...getInputProps({
            multiple: true,
            // @ts-expect-error webkitdirectory is supported in modern browsers
            webkitdirectory: '',
            directory: '',
          })}
        />
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            isDragActive
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-100 text-slate-500'
          )}
        >
          <FolderPlus className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {isDragActive ? 'Suelta para iniciar la carga' : 'Arrastra una carpeta aquí'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Se abrirá la creación masiva con los archivos listos.
          </p>
        </div>
      </div>
    </div>
  );
}

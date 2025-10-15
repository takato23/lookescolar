'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StoreConfigPanel } from '@/components/admin/shared/StoreConfigPanel';
import { StoreOverview } from '@/components/admin/store-settings/StoreOverview';
import { useStoreOverview } from '@/lib/hooks/useStoreOverview';

interface PageProps {
  searchParams: Promise<Record<string, string | string[]>>;
}

export default function StoreSettingsPage({ searchParams }: PageProps) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [isGlobal, setIsGlobal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadParams = async () => {
      try {
        const params = searchParams;
        const eventIdParam = params.eventId || params.event_id;
        const globalParam = params.global;

        const resolvedEventId = typeof eventIdParam === 'string' ? eventIdParam : null;
        const resolvedIsGlobal = globalParam === 'true';

        setEventId(resolvedEventId);
        setIsGlobal(resolvedIsGlobal);
      } catch (error) {
        console.error('Error loading search params:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadParams();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background/50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Configuración de tienda</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {isGlobal
                ? 'Configuración global'
                : eventId
                  ? 'Configuración del evento'
                  : 'Gestión de tiendas'
              }
            </h1>
            <p className="text-sm text-muted-foreground">
              {isGlobal
                ? 'Configuración por defecto para todos los eventos nuevos'
                : eventId
                  ? 'Administra productos, precios y configuración específica del evento'
                  : 'Vista general de todas las tiendas configuradas'
              }
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/events">
              <Button variant="ghost" size="sm">
                Volver a eventos
              </Button>
            </Link>
            {!isGlobal && (
              <Link href="/admin/store-settings?global=true">
                <Button variant="outline" size="sm">
                  Configuración global
                </Button>
              </Link>
            )}
            {eventId && (
              <>
                <Link href={`/admin/events/${eventId}?from=store`}>
                  <Button variant="outline" size="sm">
                    Ver evento
                  </Button>
                </Link>
                <Link href={`/admin/photos?event_id=${eventId}`}>
                  <Button variant="outline" size="sm">
                    Abrir fotos del evento
                  </Button>
                </Link>
              </>
            )}
          </div>
        </header>

        {(eventId || isGlobal) ? (
          <Suspense
            fallback={
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-card/50">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                  <p className="text-sm text-muted-foreground">
                    {isGlobal ? 'Cargando configuración global…' : 'Cargando configuración del evento…'}
                  </p>
                </div>
              </div>
            }
          >
            <StoreConfigPanel
              mode={isGlobal ? 'global' : 'event'}
              eventId={isGlobal ? undefined : eventId ?? undefined}
              className="pb-12"
            />
          </Suspense>
        ) : (
          <Suspense
            fallback={
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-32 bg-muted rounded-lg animate-pulse"></div>
                ))}
              </div>
            }
          >
            <StoreOverviewWrapper />
          </Suspense>
        )}
      </div>
    </div>
  );
}

function StoreOverviewWrapper() {
  const { data: stores, isLoading, error } = useStoreOverview();

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Error cargando tiendas</p>
        <Button onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return <StoreOverview stores={stores || []} isLoading={isLoading} />;
}

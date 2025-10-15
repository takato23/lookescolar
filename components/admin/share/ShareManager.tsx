'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  AlertCircle,
  Copy,
  ExternalLink,
  Link2,
  RefreshCw,
  Shield,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ShareScope = 'event' | 'folder' | 'selection';

interface ShareRecord {
  id: string;
  token?: string;
  title?: string | null;
  type?: string | null;
  shareUrl?: string | null;
  storeUrl?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean | null;
  scopeConfig?: {
    scope?: ShareScope;
    anchorId?: string;
    includeDescendants?: boolean;
    filters?: Record<string, unknown>;
  };
  audiencesCount?: number;
  passwordProtected?: boolean;
}

interface ShareActivityMetrics {
  totalAccesses: number;
  uniqueIPs: number;
  successRate: number;
  recentAccesses?: Array<{
    timestamp: string;
    success: boolean;
    ip_address?: string;
    error_reason?: string | null;
  }>;
}

interface ShareManagerProps {
  eventId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestCreateShare?: () => void | Promise<void>;
  createButtonLabel?: string;
  createButtonDisabled?: boolean;
  createButtonLoading?: boolean;
  emptyStateMessage?: string;
  contextDescription?: string;
  refreshKey?: number | string;
}

const DEFAULT_EMPTY_STATE =
  'Todavía no creaste enlaces para este evento. Generá uno para compartir la galería.';

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return false;
  return expiry <= Date.now();
}

function resolveScopeLabel(record: ShareRecord): string {
  const scope = record.scopeConfig?.scope ?? (record.type as ShareScope) ?? 'event';
  switch (scope) {
    case 'folder':
      return 'Carpeta';
    case 'selection':
      return 'Selección';
    default:
      return 'Evento';
  }
}

function resolveScopeDetail(record: ShareRecord): string | null {
  const scope = record.scopeConfig?.scope ?? (record.type as ShareScope) ?? 'event';
  if (scope === 'folder' && record.scopeConfig?.anchorId) {
    return `ID ${record.scopeConfig.anchorId.slice(0, 8)}…`;
  }
  if (scope === 'selection') {
    const ids = (record.scopeConfig?.filters?.photoIds as string[] | undefined) ?? [];
    return ids.length > 0 ? `${ids.length} fotos` : null;
  }
  return null;
}

function pickShareUrl(record: ShareRecord): string {
  return (
    record.storeUrl ??
    record.shareUrl ??
    ''
  );
}

export function ShareManager({
  eventId,
  open,
  onOpenChange,
  onRequestCreateShare,
  createButtonLabel = 'Crear enlace',
  createButtonDisabled,
  createButtonLoading,
  emptyStateMessage = DEFAULT_EMPTY_STATE,
  contextDescription = 'Gestioná los enlaces públicos y tokens de acceso del evento.',
  refreshKey,
}: ShareManagerProps) {
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareMetrics, setShareMetrics] = useState<Record<string, ShareActivityMetrics>>({});
  const [metricsLoading, setMetricsLoading] = useState(false);

  const eventReady = Boolean(eventId);

  const loadShares = useCallback(
    async (signal?: AbortSignal): Promise<ShareRecord[]> => {
      if (!eventId) return [];
      const res = await fetch(
        `/api/share?eventId=${encodeURIComponent(eventId)}`,
        { signal }
      );
      if (!res.ok) {
        let detail: any = null;
        try {
          detail = await res.json();
        } catch {
          detail = null;
        }
        throw new Error(detail?.error || 'No se pudieron cargar los enlaces');
      }
      const json = await res.json();
      const items: any[] = Array.isArray(json?.shares) ? json.shares : [];
      return items.map((share) => {
        const fallbackId =
          share.id ??
          share.token ??
          (typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `share-${Math.random().toString(36).slice(2)}`);
        return {
          id: fallbackId,
          token: share.token ?? undefined,
          title: share.title ?? share.name ?? null,
          type: share.type ?? share.share_type ?? share.scopeConfig?.scope ?? null,
          shareUrl: share.shareUrl ?? share.links?.gallery ?? null,
          storeUrl: share.storeUrl ?? share.links?.store ?? null,
        createdAt: share.createdAt ?? share.created_at ?? null,
        expiresAt: share.expiresAt ?? share.expires_at ?? null,
        isActive: share.isActive ?? share.is_active ?? null,
        scopeConfig: share.scopeConfig ?? share.scope_config ?? undefined,
        audiencesCount: share.audiencesCount ?? share.audiences_count ?? 0,
        passwordProtected: Boolean(
          share.passwordProtected ??
            share.password_hash ??
            share.has_password
        ),
      };
      });
    },
    [eventId]
  );

  useEffect(() => {
    if (!open) return;
    if (!eventReady) {
      setShares([]);
      setError(null);
      setShareMetrics({});
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    loadShares(controller.signal)
      .then((items) => {
        if (cancelled) return;
        setShares(items);
      })
      .catch((err) => {
        if (cancelled) return;
        if ((err as Error).name === 'AbortError') return;
        setError((err as Error).message || 'Error desconocido al cargar enlaces');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, eventReady, loadShares, refreshKey]);

  useEffect(() => {
    if (!open) {
      setShareMetrics({});
      setMetricsLoading(false);
      return;
    }

    const shareIds = shares
      .map((share) => share.id)
      .filter((id): id is string => Boolean(id));

    if (shareIds.length === 0) {
      setShareMetrics({});
      setMetricsLoading(false);
      return;
    }

    let cancelled = false;
    setMetricsLoading(true);

    (async () => {
      const metricsMap: Record<string, ShareActivityMetrics> = {};
      for (const shareId of shareIds) {
        try {
          const response = await fetch(
            `/api/admin/share-security?action=analytics&tokenId=${encodeURIComponent(
              shareId
            )}`
          );
          const data = await response.json().catch(() => ({}));

          if (cancelled) {
            return;
          }

          if (response.ok && data?.analytics) {
            metricsMap[shareId] = data.analytics as ShareActivityMetrics;
          }
        } catch (err) {
          if (!cancelled) {
            console.warn('Error fetching share analytics', shareId, err);
          }
        }
      }

      if (!cancelled) {
        setShareMetrics(metricsMap);
        setMetricsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, shares, refreshKey]);

  const handleRefresh = useCallback(async () => {
    if (!eventReady) return;
    try {
      setIsRefreshing(true);
      const items = await loadShares();
      setShares(items);
      setError(null);
      toast.success('Enlaces actualizados');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudieron refrescar los enlaces';
      setError(message);
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [eventReady, loadShares]);

  const handleCopy = useCallback(async (url: string) => {
    if (!url) {
      toast.error('No se encontró una URL para copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  }, []);

  const handleDeactivate = useCallback(
    async (shareId: string) => {
      if (!eventReady || !shareId) return;
      const confirmed =
        typeof window === 'undefined' ? true : window.confirm('¿Desactivar este enlace?');
      if (!confirmed) return;
      try {
        setDeactivatingId(shareId);
        const res = await fetch(`/api/share/${encodeURIComponent(shareId)}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          let detail: any = null;
          try {
            detail = await res.json();
          } catch {
            detail = null;
          }
          throw new Error(detail?.error || 'No se pudo desactivar el enlace');
        }
        toast.success('Enlace desactivado');
        const items = await loadShares();
        setShares(items);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo desactivar el enlace';
        toast.error(message);
      } finally {
        setDeactivatingId(null);
      }
    },
    [eventReady, loadShares]
  );

  const activeCount = useMemo(
    () => shares.filter((share) => !isExpired(share.expiresAt) && share.isActive !== false).length,
    [shares]
  );

  const totalCount = shares.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestor de enlaces</DialogTitle>
          <DialogDescription>{contextDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {eventReady ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">
                  {activeCount} activos · {totalCount} totales
                </Badge>
                {metricsLoading && (
                  <span className="flex items-center gap-1 text-muted-foreground/80">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Métricas
                  </span>
                )}
                {createButtonLoading && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Generando…
                  </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      void onRequestCreateShare?.();
                    }}
                    disabled={Boolean(createButtonDisabled) || Boolean(createButtonLoading)}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    {createButtonLabel}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleRefresh()}
                    disabled={isRefreshing || isLoading}
                  >
                    <RefreshCw
                      className={cn(
                        'mr-2 h-4 w-4',
                        (isRefreshing || isLoading) && 'animate-spin'
                      )}
                    />
                    Actualizar
                  </Button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Cargando enlaces…
                </div>
              ) : shares.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  <Link2 className="mb-2 h-8 w-8 text-muted-foreground/70" />
                  <p>{emptyStateMessage}</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[55vh] pr-4">
                  <div className="space-y-3">
                    {shares.map((share) => {
                  const scopeLabel = resolveScopeLabel(share);
                  const scopeDetail = resolveScopeDetail(share);
                  const url = pickShareUrl(share);
                  const expired = isExpired(share.expiresAt) || share.isActive === false;
                  const audiences = share.audiencesCount ?? 0;
                  const analytics = share.id ? shareMetrics[share.id] : undefined;
                  return (
                    <div
                          key={share.id}
                          className="rounded-lg border border-border bg-background p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {share.title || `${scopeLabel} compartido`}
                                </span>
                                <Badge
                                  variant={expired ? 'outline' : 'secondary'}
                                  className={cn(
                                    expired
                                      ? 'border-red-200 text-red-600'
                                      : 'border-emerald-200 text-emerald-700'
                                  )}
                                >
                                  {expired ? 'Inactivo' : 'Activo'}
                                </Badge>
                                <Badge variant="outline">{scopeLabel}</Badge>
                                {share.passwordProtected && (
                                  <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                    <Shield className="mr-1 h-3 w-3" />
                                    Protegido
                                  </Badge>
                                )}
                              </div>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div>
                                  Creado: <span className="font-medium">{formatDateTime(share.createdAt)}</span>
                                </div>
                                <div>
                                  Expira: <span className="font-medium">{share.expiresAt ? formatDateTime(share.expiresAt) : 'Sin expiración'}</span>
                                </div>
                                <div>
                                  Audiencias: <span className="font-medium">{audiences}</span>
                                </div>
                    {scopeDetail && <div>{scopeDetail}</div>}
                  </div>
                  <div className="truncate text-xs font-mono text-muted-foreground/90">
                    {url || '—'}
                  </div>
                  {analytics ? (
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <div>
                        Accesos:{' '}
                        <span className="font-medium text-foreground">
                          {analytics.totalAccesses}
                        </span>
                      </div>
                      <div>
                        Éxito:{' '}
                        <span className="font-medium text-foreground">
                          {Math.round(analytics.successRate)}%
                        </span>
                      </div>
                      <div>
                        IPs únicas:{' '}
                        <span className="font-medium text-foreground">
                          {analytics.uniqueIPs}
                        </span>
                      </div>
                      {analytics.recentAccesses?.[0]?.timestamp && (
                        <div className="col-span-2">
                          Último acceso:{' '}
                          <span className="font-medium text-foreground">
                            {formatDateTime(analytics.recentAccesses[0].timestamp)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : metricsLoading ? (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Cargando métricas…
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopy(url)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (!url) {
                                    toast.error('No hay enlace disponible para abrir.');
                                    return;
                                  }
                                  window.open(url, '_blank', 'noopener');
                                }}
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Abrir
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => void handleDeactivate(share.id)}
                                disabled={deactivatingId === share.id}
                              >
                                {deactivatingId === share.id ? (
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Desactivar
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-10 w-10 text-muted-foreground/70" />
              <p>Elegí un evento para gestionar enlaces.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

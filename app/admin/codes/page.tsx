/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Loader2, Printer, RefreshCcw, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';

interface TokenAlias {
  id: string;
  alias: string;
  short_code: string;
  created_at?: string;
}

interface TokenStats {
  total: number;
  success: number;
  failed: number;
  last_access?: string | null;
}

interface AdminEnhancedToken {
  id: string;
  token: string;
  type: string;
  expires_at: string;
  is_active: boolean;
  event?: {
    id: string;
    name: string;
    school_name?: string | null;
    start_date?: string | null;
  } | null;
  aliases: TokenAlias[];
  stats: TokenStats;
  created_at?: string;
  updated_at?: string;
}

interface TokensResponse {
  tokens: AdminEnhancedToken[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatLastAccess = (value?: string | null) => {
  if (!value) return 'Sin registros';
  try {
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export default function CodesPage() {
  const [tokens, setTokens] = useState<AdminEnhancedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const loadTokens = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/enhanced-tokens', {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('No se pudo cargar la lista de tokens');
      }
      const data = (await response.json()) as TokensResponse;
      setTokens(data.tokens);
    } catch (error: any) {
      console.error('[CodesPage] Failed to load tokens', error);
      toast.error(
        error?.message || 'Error al cargar los tokens de acceso para clientes'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, []);

  const refreshTokens = useCallback(async () => {
    setRefreshing(true);
    await loadTokens();
  }, [loadTokens]);

  const handleGenerateAlias = useCallback(
    async (tokenId: string) => {
      try {
        setGeneratingFor(tokenId);
        const response = await fetch(`/api/admin/tokens/${tokenId}/alias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload?.error || 'No se pudo generar un alias corto'
          );
        }

        const payload = await response.json();
        toast.success(`Alias generado: ${payload.alias.alias}`);
        await loadTokens();
      } catch (error: any) {
        console.error('[CodesPage] Alias generation failed', error);
        toast.error(
          error?.message || 'No se pudo generar el alias. Intenta nuevamente.'
        );
      } finally {
        setGeneratingFor(null);
      }
    },
    [loadTokens]
  );

  const handlePrintFlyer = useCallback(
    async (token: AdminEnhancedToken, alias: TokenAlias) => {
      try {
        const origin =
          typeof window !== 'undefined'
            ? window.location.origin
            : 'https://lookescolar.com';
        const qrUrl = `${origin}/access?token=${encodeURIComponent(
          token.token
        )}`;
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          margin: 2,
          width: 320,
        });

        const win = window.open('', '_blank', 'noopener,noreferrer');
        if (!win) {
          toast.error('Permití ventanas emergentes para imprimir el flyer.');
          return;
        }

        const eventName = token.event?.name ?? 'Galería LookEscolar';
        const eventDate = token.event?.start_date
          ? formatDate(token.event.start_date)
          : 'Próximamente';

        win.document.write(`
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Flyer para clientes - ${alias.alias}</title>
              <style>
                body {
                  font-family: 'Helvetica Neue', Arial, sans-serif;
                  margin: 0;
                  padding: 40px;
                  background: #f5f5f5;
                }
                .flyer {
                  max-width: 620px;
                  margin: 0 auto;
                  background: #ffffff;
                  border: 3px solid #111;
                  border-radius: 18px;
                  padding: 36px;
                  text-align: center;
                }
                h1 {
                  font-size: 28px;
                  letter-spacing: 4px;
                  margin-bottom: 8px;
                }
                .event {
                  margin-bottom: 24px;
                  font-size: 16px;
                }
                .alias-block {
                  display: inline-block;
                  border: 2px dashed #111;
                  padding: 18px 28px;
                  border-radius: 12px;
                  font-size: 22px;
                  font-weight: bold;
                  letter-spacing: 2px;
                  margin-bottom: 24px;
                }
                img {
                  width: 240px;
                  height: 240px;
                  margin: 0 auto 24px;
                }
                .instructions {
                  font-size: 14px;
                  line-height: 1.5;
                  color: #444;
                  margin-top: 24px;
                  text-align: left;
                }
                @media print {
                  body {
                    background: white;
                    padding: 0;
                  }
                  .flyer {
                    border-radius: 0;
                    border-width: 2px;
                  }
                }
              </style>
            </head>
            <body>
              <div class="flyer">
                <h1>LOOKESCOLAR</h1>
                <div class="event">
                  <strong>${eventName}</strong><br />
                  <span>${eventDate}</span>
                </div>
                <div class="alias-block">
                  Alias: ${alias.alias.toUpperCase()}<br />
                  Código corto: ${alias.short_code}
                </div>
                <img src="${qrDataUrl}" alt="QR acceso para clientes" />
                <div class="instructions">
                  <strong>Cómo usar este acceso</strong>
                  <ol>
                    <li>Escaneá el QR o ingresá a <strong>${origin}/access</strong>.</li>
                    <li>Escribí el alias o código corto que figura arriba.</li>
                    <li>Entrá a la galería unificada para ver y comprar las fotos.</li>
                  </ol>
                  <p>Contacto de la fotógrafa: ${token.event?.school_name ?? 'LookEscolar'}</p>
                </div>
              </div>
            </body>
          </html>
        `);
        win.document.close();
      } catch (error) {
        console.error('[CodesPage] Failed to generate flyer', error);
        toast.error('No se pudo generar el flyer. Intenta nuevamente.');
      }
    },
    []
  );

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      );
    }

    if (!tokens.length) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-600">
            Todavía no hay tokens mejorados generados. Creá accesos para clientes
            desde la sección de eventos o estudiantes.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Evento
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Alias disponibles
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Vistas / Intentos
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Expiración
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {tokens.map((token) => {
              const isExpired = new Date(token.expires_at) <= new Date();
              const hasAliases = token.aliases.length > 0;
              return (
                <tr key={token.id} className="bg-white dark:bg-gray-950/50">
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                    <div className="space-y-1">
                      <div className="font-semibold">
                        {token.event?.name ?? 'Evento sin nombre'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Token:&nbsp;
                        <span className="font-mono text-gray-600 dark:text-gray-300">
                          {token.token}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Generado: {formatDate(token.created_at)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {token.aliases.map((alias) => (
                        <div
                          key={alias.id}
                          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm dark:border-gray-800"
                        >
                          <div className="space-y-0.5">
                            <p className="font-semibold uppercase tracking-wider">
                              {alias.alias}
                            </p>
                            <p className="text-xs text-gray-500">
                              Código corto: {alias.short_code}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintFlyer(token, alias)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={generatingFor === token.id}
                        onClick={() => handleGenerateAlias(token.id)}
                        className="flex items-center gap-2"
                      >
                        {generatingFor === token.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {hasAliases ? 'Nuevo alias' : 'Generar alias'}
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {token.stats.success} / {token.stats.total}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Último acceso: {formatLastAccess(token.stats.last_access)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(token.expires_at)}
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      variant={isExpired || !token.is_active ? 'destructive' : 'default'}
                      className={cn(
                        'uppercase tracking-wider',
                        isExpired || !token.is_active
                          ? 'bg-red-600 hover:bg-red-600'
                          : 'bg-emerald-600 hover:bg-emerald-600'
                      )}
                    >
                      {isExpired
                        ? 'Expirado'
                        : token.is_active
                        ? 'Activo'
                        : 'Inactivo'}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }, [tokens, loading, generatingFor, handleGenerateAlias, handlePrintFlyer]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Alias para clientes
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestioná alias cortos, imprime flyers y controla los intentos de
            acceso a las galerías para clientes.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refreshTokens}
          disabled={refreshing || loading}
          className="flex items-center gap-2"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          Actualizar
        </Button>
      </div>

      <Card className="overflow-hidden border border-gray-200 shadow-sm dark:border-gray-800">
        {content}
      </Card>
    </div>
  );
}

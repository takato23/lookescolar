'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ResolveFamilyTokenResult,
  FamilyTokenResolutionError,
} from '@/lib/services/family-token-resolver';
import { useFamilyTokenResolver } from '@/hooks/useFamilyTokenResolver';
import { storeFamilyToken } from '@/lib/utils/family-token-storage';
import type {
  AliasLookupErrorCode,
  EnhancedTokenErrorCode,
} from '@/lib/types/family-access';

type ResolverErrorCode = AliasLookupErrorCode | EnhancedTokenErrorCode | string;

interface ContactInfo {
  email: string;
  phone?: string | null;
  whatsappUrl?: string | null;
}

const DEFAULT_CONTACT: ContactInfo = {
  email: 'hola@lookescolar.com',
  phone: '+54 9 11 2345-6789',
  whatsappUrl:
    'https://wa.me/5491123456789?text=Hola%20LookEscolar%2C%20necesito%20ayuda%20para%20acceder%20a%20mi%20galer%C3%ADa',
};

const ERROR_MESSAGES: Partial<Record<ResolverErrorCode, string>> = {
  INVALID_ALIAS: 'Ese alias no existe. Revisá que esté escrito tal como figura en tu flyer.',
  ALIAS_NOT_FOUND: 'No encontramos ese alias. Confirmá el código corto con la fotógrafa.',
  INACTIVE_TOKEN: 'Este acceso fue deshabilitado. Pedí un nuevo código a la fotógrafa.',
  EXPIRED_TOKEN: 'Tu acceso expiró. Solicitá uno nuevo a la fotógrafa.',
  INVALID_TOKEN:
    'No pudimos validar el código. Revisá que esté completo y vuelve a intentarlo.',
  EVENT_INACTIVE:
    'El evento todavía no está disponible para familias. Por favor contactá a la fotógrafa.',
  RATE_LIMITED:
    'Realizaste demasiados intentos seguidos. Esperá unos minutos e inténtalo nuevamente.',
  NETWORK_ERROR:
    'No pudimos conectar con el servidor. Verificá tu conexión e intenta otra vez.',
};

interface FamilyAccessCardProps {
  className?: string;
  initialCode?: string;
  autoResolve?: boolean;
  prefetchedResult?: ResolveFamilyTokenResult | null;
  onResolved?: (result: ResolveFamilyTokenResult) => void;
}

export function FamilyAccessCard({
  className,
  initialCode,
  autoResolve = false,
  prefetchedResult,
  onResolved,
}: FamilyAccessCardProps) {
  const router = useRouter();
  const { status, data, error, resolve, reset } = useFamilyTokenResolver();
  const [inputValue, setInputValue] = useState(initialCode ?? '');
  const [displayResult, setDisplayResult] = useState<
    ResolveFamilyTokenResult | null
  >(prefetchedResult ?? null);
  const [resolverError, setResolverError] =
    useState<FamilyTokenResolutionError | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo>(DEFAULT_CONTACT);
  const [isFetchingContact, setIsFetchingContact] = useState(false);
  const autoResolvedRef = useRef(false);

  const isLoading =
    status === 'loading' ||
    (autoResolve && !autoResolvedRef.current && !!initialCode);

  // Sync prefetched result coming from SSR
  useEffect(() => {
    if (prefetchedResult) {
      setDisplayResult(prefetchedResult);
      setResolverError(null);
      setInputValue((prev) => prev || prefetchedResult.token);
    }
  }, [prefetchedResult]);

  // Auto resolve when requested (e.g., /access?token=)
  useEffect(() => {
    if (
      autoResolve &&
      !autoResolvedRef.current &&
      initialCode &&
      !prefetchedResult
    ) {
      autoResolvedRef.current = true;
      handleResolve(initialCode);
    }
  }, [autoResolve, initialCode, prefetchedResult]);

  // Load contact info
  useEffect(() => {
    let cancelled = false;
    async function loadContact() {
      try {
        setIsFetchingContact(true);
        const response = await fetch('/api/public/contact', {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const payload = (await response.json()) as ContactInfo;
        if (!cancelled && payload) {
          setContactInfo({
            email: payload.email || DEFAULT_CONTACT.email,
            phone: payload.phone || DEFAULT_CONTACT.phone,
            whatsappUrl:
              payload.whatsappUrl || DEFAULT_CONTACT.whatsappUrl,
          });
        }
      } catch (err) {
        console.warn('[FamilyAccessCard] Failed to fetch contact info', err);
      } finally {
        if (!cancelled) {
          setIsFetchingContact(false);
        }
      }
    }

    loadContact();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status === 'error' && error) {
      setResolverError(error);
    }
  }, [status, error]);

  const handleResolve = useCallback(
    async (value: string) => {
      setResolverError(null);
      const trimmed = value.trim();
      if (!trimmed) {
        setResolverError(
          new FamilyTokenResolutionError('Ingresa un código o alias', {
            status: 400,
            code: 'EMPTY_CODE',
          })
        );
        setDisplayResult(null);
        return null;
      }

      const result = await resolve(trimmed);
      if (result) {
        setDisplayResult(result);
        setResolverError(null);
        onResolved?.(result);
      } else if (error) {
        setDisplayResult(null);
        setResolverError(error);
      }
      return result;
    },
    [resolve, onResolved, error]
  );

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event
  ) => {
    event.preventDefault();
    const result = await handleResolve(inputValue);
    if (!result && error) {
      setResolverError(error);
    }
  };

  const handleEnterGallery = useCallback(async () => {
    if (!displayResult) return;
    try {
      await storeFamilyToken(displayResult.token);
    } catch (err) {
      console.warn('[FamilyAccessCard] Failed to store token securely', err);
    } finally {
      router.push(`/store-unified/${encodeURIComponent(displayResult.token)}`);
    }
  }, [displayResult, router]);

  const handleContact = useCallback(() => {
    if (contactInfo.whatsappUrl) {
      window.open(contactInfo.whatsappUrl, '_blank', 'noopener');
      return;
    }
    if (contactInfo.email) {
      const subject = encodeURIComponent('Necesito ayuda con mi galería');
      const body = encodeURIComponent(
        'Hola LookEscolar,\n\nNecesito ayuda para acceder a mi galería familiar.\n\n¡Gracias!'
      );
      window.location.href = `mailto:${contactInfo.email}?subject=${subject}&body=${body}`;
    }
  }, [contactInfo]);

  const errorMessage = useMemo(() => {
    if (!resolverError) return null;
    return (
      ERROR_MESSAGES[resolverError.code as ResolverErrorCode] ||
      resolverError.message ||
      'Ocurrió un error al validar el acceso.'
    );
  }, [resolverError]);

  const eventName = useMemo(() => {
    if (displayResult?.validation.event?.name) {
      return displayResult.validation.event.name;
    }
    if (displayResult?.validation.family?.event?.name) {
      return displayResult.validation.family.event.name;
    }
    if (displayResult?.validation.student?.event?.name) {
      return displayResult.validation.student.event.name;
    }
    return null;
  }, [displayResult]);

  const eventDate = useMemo(() => {
    const candidate =
      displayResult?.validation.event?.start_date ??
      displayResult?.validation.family?.event?.start_date ??
      displayResult?.validation.student?.event?.start_date;
    if (!candidate) return null;
    try {
      return new Intl.DateTimeFormat('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(candidate));
    } catch {
      return null;
    }
  }, [displayResult]);

  const subjectName = useMemo(() => {
    if (displayResult?.validation.student?.name) {
      return displayResult.validation.student.name;
    }
    if (displayResult?.validation.family?.students?.length) {
      return displayResult.validation.family.students
        .map((s) => s.name)
        .join(', ');
    }
    return null;
  }, [displayResult]);

  const warnings = displayResult?.validation.warnings ?? [];

  const handleReset = useCallback(() => {
    setDisplayResult(null);
    setResolverError(null);
    reset();
  }, [reset]);

  return (
    <Card
      className={cn(
        'relative mx-auto w-full max-w-xl overflow-hidden border border-black/5 bg-white p-8 shadow-xl transition-all hover:shadow-2xl dark:border-white/10 dark:bg-gray-950 dark:text-gray-100',
        className
      )}
    >
      <div className="space-y-6">
        <header className="space-y-2 text-center">
          <h3 className="text-2xl font-bold tracking-tight">
            Acceso familiar a tu galería
          </h3>
          <p className="text-sm text-muted-foreground">
            Ingresá el alias corto o el código que recibiste. Validamos el
            acceso y te mostramos un resumen antes de entrar.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <Input
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ej: luna1234 o LES-2024-ABC123XYZ"
              aria-label="Alias o código de acceso familiar"
              disabled={isLoading}
              className="h-12 flex-1 text-base"
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                'Validar acceso'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Aceptamos alias cortos y códigos largos. Ignoramos mayúsculas,
            espacios y guiones automáticamente.
          </p>
        </form>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/40 dark:text-red-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">No pudimos validar tu acceso</p>
              <p className="mt-1 text-xs leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {displayResult && (
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 text-emerald-900 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-6 w-6 flex-shrink-0 text-emerald-600 dark:text-emerald-300" />
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-200">
                  Acceso validado
                </p>
                {displayResult.source === 'alias' && (
                  <Badge variant="outline" className="border-emerald-400/70">
                    Alias detectado: {displayResult.alias?.alias}
                  </Badge>
                )}
                <h4 className="text-lg font-semibold">
                  {eventName || 'Galería lista'}
                </h4>
                {subjectName && (
                  <p className="text-sm text-emerald-800/80 dark:text-emerald-100/80">
                    {subjectName}
                  </p>
                )}
                {eventDate && (
                  <p className="text-xs text-emerald-800/70 dark:text-emerald-100/70">
                    Evento: {eventDate}
                  </p>
                )}
              </div>
            </div>

            {warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                <div className="flex items-start gap-2 text-xs">
                  <Shield className="mt-0.5 h-4 w-4 text-amber-500" />
                  <div>
                    <p className="font-medium uppercase tracking-tight text-amber-600 dark:text-amber-200">
                      Advertencias
                    </p>
                    <ul className="mt-1 space-y-1">
                      {warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={handleEnterGallery}
                className="flex-1"
              >
                Entrar a mi galería
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                Validar otro código
              </Button>
            </div>
          </div>
        )}

        <footer className="rounded-lg border border-dashed border-gray-200 p-4 text-sm dark:border-gray-800">
          <p className="font-medium">¿Necesitás ayuda?</p>
          <p className="mt-1 text-muted-foreground">
            Contactá directamente a la fotógrafa para recuperar tu código o
            generar uno nuevo.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleContact}
              disabled={isFetchingContact}
            >
              {isFetchingContact ? 'Cargando contacto...' : 'Contactar fotógrafa'}
            </Button>
            {contactInfo.email && (
              <span className="text-xs text-muted-foreground">
                {contactInfo.email}
              </span>
            )}
            {contactInfo.phone && (
              <span className="text-xs text-muted-foreground">
                {contactInfo.phone}
              </span>
            )}
          </div>
        </footer>
      </div>
    </Card>
  );
}

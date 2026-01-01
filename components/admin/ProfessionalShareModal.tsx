'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetFooter,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { ShareScopeConfig } from '@/lib/services/share.service';
import {
  Copy,
  CheckCircle2,
  Share2,
  QrCode,
  MessageCircle,
  Mail,
  ExternalLink,
  Users,
  Clock,
  ShieldCheck,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  STORE_THEME_PRESETS,
  STORE_THEME_PRESET_LIST,
} from '@/lib/config/store-theme-presets';

interface ProfessionalShareModalProps {
  id: string;
  url: string;
  galleryUrl?: string;
  title?: string;
  description?: string;
  type?: 'event' | 'folder';
  onClose: () => void;
  isOpen: boolean;
  scopeConfig?: ShareScopeConfig;
  expiresAt?: string | null;
  isActive?: boolean;
  allowDownload?: boolean;
  allowComments?: boolean;
  audiencesCount?: number;
  onLaunchWizard?: () => void;
  onShareWithStaff?: () => void;
  staffContactsCount?: number;
}

type PermissionField = 'download' | 'comments';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatRelative(date: Date | null): string {
  if (!date) {
    return 'Disponible hasta que lo desactives';
  }

  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;
  const formatter = 'Intl' in globalThis && 'RelativeTimeFormat' in Intl
    ? new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
    : null;

  if (!formatter) {
    return DATE_FORMATTER.format(date);
  }

  if (absMs >= day) {
    return formatter.format(Math.round(diffMs / day), 'day');
  }
  if (absMs >= hour) {
    return formatter.format(Math.round(diffMs / hour), 'hour');
  }
  return formatter.format(Math.round(diffMs / minute), 'minute');
}

export function ProfessionalShareModal({
  id,
  url,
  galleryUrl,
  title = 'Galería',
  description = 'Compartir galería de fotos',
  type = 'event',
  onClose,
  isOpen,
  scopeConfig,
  expiresAt,
  isActive = true,
  allowDownload,
  allowComments,
  audiencesCount,
  onLaunchWizard,
  onShareWithStaff,
  staffContactsCount,
}: ProfessionalShareModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const [allowDownloadState, setAllowDownloadState] = useState(Boolean(allowDownload));
  const [allowCommentsState, setAllowCommentsState] = useState(Boolean(allowComments));
  const [updatingField, setUpdatingField] = useState<PermissionField | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [recentlyUpdated, setRecentlyUpdated] = useState<{ download: boolean; comments: boolean }>({
    download: false,
    comments: false,
  });
  const permissionTimeouts = useRef<Record<PermissionField, number | null>>({
    download: null,
    comments: null,
  });

  const scopeValue: ShareScopeConfig['scope'] = scopeConfig?.scope ?? type ?? 'event';
  const expiresDate = expiresAt ? new Date(expiresAt) : null;
  const isExpired = expiresDate ? expiresDate.getTime() <= Date.now() : false;
  const staffCount = typeof staffContactsCount === 'number' ? staffContactsCount : 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    try {
      const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
      const themeFromUrl = parsed.searchParams.get('theme');
      if (themeFromUrl && STORE_THEME_PRESETS[themeFromUrl]) {
        setSelectedTheme(themeFromUrl);
      } else {
        setSelectedTheme('default');
      }
    } catch {
      setSelectedTheme('default');
    }
  }, [isOpen, url]);

  const selectedThemeMeta = STORE_THEME_PRESETS[selectedTheme]?.meta || STORE_THEME_PRESETS.default.meta;
  const themeActivated = selectedTheme !== 'default';

  const themedUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return url;
    }
    try {
      const parsed = new URL(url, window.location.origin);
      if (themeActivated) {
        parsed.searchParams.set('theme', selectedTheme);
      } else {
        parsed.searchParams.delete('theme');
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }, [url, selectedTheme, themeActivated]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setCopied(false);
    setShowQR(false);
    setThemeOpen(false);
    setRecentlyUpdated({ download: false, comments: false });
  }, [isOpen]);

  useEffect(() => {
    const currentTimeouts = permissionTimeouts.current;
    return () => {
      (['download', 'comments'] as PermissionField[]).forEach((key) => {
        const timeoutId = currentTimeouts[key];
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setAllowDownloadState(Boolean(allowDownload));
    setAllowCommentsState(Boolean(allowComments));
  }, [allowDownload, allowComments, isOpen]);

  const shareText = useMemo(() => {
    const baseLabel = scopeValue === 'folder' ? 'álbum' : scopeValue === 'selection' ? 'selección' : 'evento';
    const themeLabel = themeActivated ? ` (${selectedThemeMeta.name})` : '';
    return `Mira las fotos de este ${baseLabel}${themeLabel}: ${title}`;
  }, [scopeValue, themeActivated, selectedThemeMeta.name, title]);

  const statusLabel = isExpired ? 'Expirado' : isActive ? 'Activo' : 'Pausado';
  const statusVariant: 'default' | 'secondary' | 'destructive' = isExpired ? 'destructive' : isActive ? 'default' : 'secondary';
  const expirationLabel = expiresDate ? DATE_FORMATTER.format(expiresDate) : 'Sin expiración';
  const expirationHint = formatRelative(expiresDate);

  const scopeSummary = useMemo(() => {
    if (!scopeConfig) {
      return type === 'folder' ? 'Carpeta seleccionada' : 'Todo el evento';
    }
    if (scopeConfig.scope === 'event') {
      return 'Todo el evento';
    }
    if (scopeConfig.scope === 'folder') {
      return scopeConfig.anchorId ? `Carpeta ${scopeConfig.anchorId.slice(0, 8)}…` : 'Carpeta seleccionada';
    }
    const ids = (scopeConfig.filters?.photoIds || []) as string[];
    return `${ids.length} fotos seleccionadas`;
  }, [scopeConfig, type]);

  const scopeBadgeLabel = useMemo(() => {
    if (scopeValue === 'folder') {
      return 'Carpeta compartida';
    }
    if (scopeValue === 'selection') {
      return 'Selección activa';
    }
    return 'Evento compartido';
  }, [scopeValue]);

  const selectionCount = useMemo(() => {
    if (scopeConfig?.scope !== 'selection') {
      return 0;
    }
    const ids = (scopeConfig.filters?.photoIds || []) as string[];
    return ids.length;
  }, [scopeConfig]);

  const audiencesLabel = audiencesCount === undefined
    ? 'Sin audiencias registradas'
    : audiencesCount === 0
      ? 'Aún no hay audiencias seleccionadas'
      : `${audiencesCount} ${audiencesCount === 1 ? 'audiencia' : 'audiencias'} configuradas`;

  const copyToClipboard = useCallback(async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(themedUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = themedUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      try {
        const { toast } = await import('sonner');
        toast.success('Enlace copiado al portapapeles');
      } catch {}
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      try {
        const { toast } = await import('sonner');
        toast.error('No se pudo copiar el enlace');
      } catch {}
    }
  }, [themedUrl]);

  const openGallery = useCallback(() => {
    const target = galleryUrl || themedUrl;
    if (typeof window !== 'undefined') {
      window.open(target, '_blank', 'noopener');
    }
  }, [galleryUrl, themedUrl]);

  const shareWhatsApp = useCallback(() => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} Ver aquí: ${themedUrl}`)}`;
    if (typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank', 'noopener');
    }
  }, [shareText, themedUrl]);

  const shareEmail = useCallback(() => {
    const themeSuffix = themeActivated ? ` · ${selectedThemeMeta.name}` : '';
    const subject = encodeURIComponent(`${title}${themeSuffix} - ${description}`);
    const body = encodeURIComponent(
      `${shareText}\n\nPuedes ver las fotos aquí: ${themedUrl}\n\n---\nCompartido desde LookEscolar`
    );
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    if (typeof window !== 'undefined') {
      window.location.href = mailtoUrl;
    }
  }, [description, shareText, themeActivated, themedUrl, title, selectedThemeMeta.name]);

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const shareNative = useCallback(async () => {
    if (!canNativeShare) {
      copyToClipboard();
      return;
    }
    try {
      await navigator.share({
        title,
        text: shareText,
        url: themedUrl,
      });
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Error sharing nativamente:', error);
        copyToClipboard();
      }
    }
  }, [canNativeShare, copyToClipboard, shareText, themedUrl, title]);

  const generateQRUrl = useCallback(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(themedUrl)}`;
  }, [themedUrl]);

  const notifyInfo = useCallback(async (message: string) => {
    try {
      const { toast } = await import('sonner');
      toast.info(message);
    } catch {}
  }, []);

  const patchShare = useCallback(
    async (payload: Partial<{ allowDownload: boolean; allowComments: boolean }>) => {
      if (!id) {
        throw new Error('No se encontró el identificador del enlace');
      }
      const res = await fetch(`/api/share/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'No se pudo actualizar el enlace');
      }
      const share = json?.share ?? {};
      return {
        allowDownload:
          typeof share.allow_download === 'boolean'
            ? share.allow_download
            : typeof share.allowDownload === 'boolean'
              ? share.allowDownload
              : payload.allowDownload,
        allowComments:
          typeof share.allow_comments === 'boolean'
            ? share.allow_comments
            : typeof share.allowComments === 'boolean'
              ? share.allowComments
              : payload.allowComments,
      };
    },
    [id]
  );

  const handlePermissionToggle = useCallback(
    async (field: PermissionField, nextValue: boolean) => {
      const previous = field === 'download' ? allowDownloadState : allowCommentsState;
      const setter = field === 'download' ? setAllowDownloadState : setAllowCommentsState;
      setter(nextValue);
      setUpdatingField(field);
      try {
        const payload = field === 'download' ? { allowDownload: nextValue } : { allowComments: nextValue };
        const updated = await patchShare(payload);
        if (field === 'download') {
          setAllowDownloadState(Boolean(updated.allowDownload));
        } else {
          setAllowCommentsState(Boolean(updated.allowComments));
        }
        setRecentlyUpdated((prev) => ({ ...prev, [field]: true }));
        if (permissionTimeouts.current[field]) {
          window.clearTimeout(permissionTimeouts.current[field]!);
        }
        permissionTimeouts.current[field] = window.setTimeout(() => {
          setRecentlyUpdated((prev) => ({ ...prev, [field]: false }));
          permissionTimeouts.current[field] = null;
        }, 2200);
        try {
          const { toast } = await import('sonner');
          toast.success('Permisos actualizados');
        } catch {}
      } catch (error) {
        console.error('Error updating permissions:', error);
        setter(previous);
        setRecentlyUpdated((prev) => ({ ...prev, [field]: false }));
        try {
          const { toast } = await import('sonner');
          toast.error('No se pudieron guardar los permisos');
        } catch {}
      } finally {
        setUpdatingField(null);
      }
    },
    [allowCommentsState, allowDownloadState, patchShare]
  );

  const handleScopeTabChange = useCallback(
    (next: string) => {
      if (next === scopeValue) {
        return;
      }
      if (onLaunchWizard) {
        onLaunchWizard();
        return;
      }
      notifyInfo('Usá el wizard para cambiar el alcance del enlace');
    },
    [notifyInfo, onLaunchWizard, scopeValue]
  );

  const summarySection = (
    <Card variant="surface" className="border-border shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {scopeBadgeLabel}
          </span>
        </div>
        <CardTitle className="text-xl text-foreground">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase text-muted-foreground">
            Enlace público
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              readOnly
              value={themedUrl}
              className="font-mono text-xs"
            />
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                onClick={copyToClipboard}
                className="w-full sm:w-auto"
              >
                {copied ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar enlace'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={openGallery}
                className="w-full sm:w-auto"
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir galería
              </Button>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-md border border-border/70 bg-muted/40 p-3">
            <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{expirationLabel}</p>
              <p className="text-xs text-muted-foreground">{expirationHint}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border/70 bg-muted/40 p-3">
            <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{audiencesCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Audiencias seleccionadas</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const scopeSection = (
    <Card variant="surface" className="border-border shadow-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Alcance del enlace</CardTitle>
          <CardDescription>Definí qué contenido incluye este enlace.</CardDescription>
        </div>
        {onLaunchWizard && (
          <Button size="sm" variant="outline" onClick={onLaunchWizard} className="self-start">
            <Sparkles className="mr-2 h-4 w-4" /> Ajustar en wizard
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={scopeValue} onValueChange={handleScopeTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="event">Evento</TabsTrigger>
            <TabsTrigger value="folder">Carpeta</TabsTrigger>
            <TabsTrigger value="selection">Selección</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="rounded-md border border-dashed border-border/70 bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground">{scopeSummary}</p>
          <p className="text-xs text-muted-foreground">
            Incluye subcarpetas: {scopeConfig?.includeDescendants ? 'sí' : 'no'}
          </p>
          {scopeConfig?.scope === 'selection' && (
            <p className="text-xs text-muted-foreground">
              {selectionCount} {selectionCount === 1 ? 'foto seleccionada' : 'fotos seleccionadas'}
            </p>
          )}
        </div>
        <div className="flex items-start justify-between gap-3 rounded-md border border-border/70 px-3 py-2 text-sm">
          <div>
            <p className="font-medium text-foreground">Audiencias vinculadas</p>
            <p className="text-xs text-muted-foreground">{audiencesLabel}</p>
          </div>
          <ShieldCheck className="mt-1 h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  const permissionsSection = (
    <Card variant="surface" className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Permisos</CardTitle>
        <CardDescription>Controlá las acciones disponibles en la galería.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-4 rounded-md border border-border/60 bg-muted/20 p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Descargar fotos</p>
            <p className="text-xs text-muted-foreground">Permite a los clientes bajar las fotos originales.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={allowDownloadState}
                onCheckedChange={(checked) => handlePermissionToggle('download', checked)}
                disabled={!id || updatingField === 'download'}
                aria-label="Permitir descargas"
              />
              <Badge
                variant="outline"
                className={cn(
                  'border-transparent bg-emerald-100 text-emerald-700 transition-all duration-200 dark:bg-emerald-500/20 dark:text-emerald-200',
                  !allowDownloadState && 'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200',
                  recentlyUpdated.download ? 'shadow-[0_0_0_1px_rgba(16,185,129,0.35)] dark:shadow-[0_0_0_1px_rgba(110,231,183,0.4)]' : 'shadow-none'
                )}
              >
                {allowDownloadState ? 'Habilitado' : 'Deshabilitado'}
              </Badge>
            </div>
            {recentlyUpdated.download && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                Cambios guardados
              </span>
            )}
          </div>
        </div>
        <div className="flex items-start justify-between gap-4 rounded-md border border-border/60 bg-muted/20 p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Comentarios</p>
            <p className="text-xs text-muted-foreground">Habilita que los clientes dejen comentarios privados.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={allowCommentsState}
                onCheckedChange={(checked) => handlePermissionToggle('comments', checked)}
                disabled={!id || updatingField === 'comments'}
                aria-label="Permitir comentarios"
              />
              <Badge
                variant="outline"
                className={cn(
                  'border-transparent bg-indigo-100 text-indigo-700 transition-all duration-200 dark:bg-indigo-500/20 dark:text-indigo-200',
                  !allowCommentsState && 'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200',
                  recentlyUpdated.comments ? 'shadow-[0_0_0_1px_rgba(99,102,241,0.35)] dark:shadow-[0_0_0_1px_rgba(129,140,248,0.4)]' : 'shadow-none'
                )}
              >
                {allowCommentsState ? 'Habilitado' : 'Deshabilitado'}
              </Badge>
            </div>
            {recentlyUpdated.comments && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                Cambios guardados
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const actionsSection = (
    <Card variant="surface" className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Compartir rápidamente</CardTitle>
        <CardDescription>Elegí el canal y enviá el enlace en segundos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            onClick={shareWhatsApp}
            className="justify-start border-border text-foreground hover:bg-muted/80 dark:hover:bg-slate-800"
          >
            <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
          </Button>
          <Button
            variant="outline"
            onClick={shareEmail}
            className="justify-start border-border text-foreground hover:bg-muted/80 dark:hover:bg-slate-800"
          >
            <Mail className="mr-2 h-4 w-4" /> Email
          </Button>
          {canNativeShare && (
            <Button
              variant="outline"
              onClick={shareNative}
              className="justify-start border-border text-foreground hover:bg-muted/80 dark:hover:bg-slate-800"
            >
              <Share2 className="mr-2 h-4 w-4" /> Compartir (sistema)
            </Button>
          )}
          <Button
            variant="outline"
            onClick={openGallery}
            className="justify-start border-border text-foreground hover:bg-muted/80 dark:hover:bg-slate-800"
          >
            <ExternalLink className="mr-2 h-4 w-4" /> Ver galería
          </Button>
        </div>
        <Separator />
        <div>
          <Button
            variant="ghost"
            className="flex w-full items-center justify-between"
            onClick={() => setShowQR((prev) => !prev)}
          >
            <span className="flex items-center gap-2">
              <QrCode className="h-4 w-4" /> {showQR ? 'Ocultar' : 'Mostrar'} código QR
            </span>
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', showQR ? 'rotate-180' : 'rotate-0')}
            />
          </Button>
          {showQR && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <img
                src={generateQRUrl()}
                alt="Código QR para compartir"
                className="h-40 w-40 rounded-md border border-border bg-background p-2 shadow-sm"
              />
              <p className="text-xs text-muted-foreground text-center">
                Escaneá el código para abrir la galería en cualquier dispositivo.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const handleShareWithStaff = useCallback(() => {
    if (onShareWithStaff) {
      onShareWithStaff();
      return;
    }
    if (onLaunchWizard) {
      onLaunchWizard();
      return;
    }
    notifyInfo('Configura equipos internos desde el wizard de compartición.');
  }, [onLaunchWizard, onShareWithStaff, notifyInfo]);

  const internalShareSection = (
    <Card variant="surface" className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Compartir con equipos internos</CardTitle>
          <Badge
            variant="outline"
            className="border-transparent bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"
          >
            {staffCount > 0 ? `${staffCount} contactos` : 'Sin contactos'}
          </Badge>
        </div>
        <CardDescription>
          Envía este enlace a coordinadores o staff sin mezclarlo con audiencias de clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Mantené a tu equipo informado con accesos rápidos a la galería.
        </div>
        <Button
          variant="outline"
          onClick={handleShareWithStaff}
          className="border-border text-foreground hover:bg-muted/80 dark:hover:bg-slate-800"
        >
          <Users className="mr-2 h-4 w-4" /> Gestionar equipos internos
        </Button>
      </CardContent>
    </Card>
  );

  const themeSection = (
    <Card variant="surface" className="border-dashed border-border/70 bg-background shadow-none">
      <Collapsible open={themeOpen} onOpenChange={setThemeOpen}>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Personalizar estilo</CardTitle>
            <CardDescription>Opcional: aplicá un preset visual al enlace.</CardDescription>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              <Sparkles className="h-4 w-4 text-primary" />
              {themeOpen ? 'Ocultar' : 'Ver estilos'}
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform', themeOpen ? 'rotate-180' : 'rotate-0')}
              />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0 pb-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Estilo de la tienda
              </Label>
              <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí el estilo para este enlace" />
                </SelectTrigger>
                <SelectContent>
                  {STORE_THEME_PRESET_LIST.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full bg-gradient-to-br', preset.previewGradient)} />
                        <span>{preset.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{selectedThemeMeta.description}</p>
              {themeActivated && (
                <p className="text-xs font-medium text-primary">
                  El enlace se actualiza automáticamente con este estilo.
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );

  const bodyPadding = isDesktop ? 'px-6' : 'px-5';

  const bodyContent = (
    <ScrollArea className="flex-1">
      <div className={cn('space-y-5 py-4', bodyPadding)}>
        {summarySection}
        {scopeSection}
        {permissionsSection}
        {actionsSection}
        {internalShareSection}
        {themeSection}
      </div>
    </ScrollArea>
  );

  const footerActions = (
    <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
      Listo
    </Button>
  );

  if (!isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
        <SheetContent side="bottom" className="h-[92vh] max-h-[92vh] overflow-hidden rounded-t-3xl p-0">
          <div className="flex h-full flex-col">
            <SheetHeader className={cn(bodyPadding, 'pt-6 pb-2 text-left')}>
              <SheetTitle className="flex items-center gap-2 text-xl font-semibold">
                <Share2 className="h-5 w-5 text-primary" /> Compartir {type === 'folder' ? 'carpeta' : 'evento'}
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                Copiá el enlace, ajustá permisos y compartilo con tu comunidad.
              </SheetDescription>
            </SheetHeader>
            {bodyContent}
            <SheetFooter className={cn(bodyPadding, 'pb-6')}>
              {footerActions}
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-xl overflow-hidden p-0">
        <div className="flex h-full flex-col">
          <DialogHeader className={cn(bodyPadding, 'border-b border-border py-4 text-left')}>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <Share2 className="h-5 w-5 text-primary" /> Compartir {type === 'folder' ? 'carpeta' : 'evento'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Gestioná el enlace antes de compartirlo con clientes y equipos.
            </DialogDescription>
          </DialogHeader>
          {bodyContent}
          <DialogFooter className={cn(bodyPadding, 'border-t border-border py-4')}>
            {footerActions}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

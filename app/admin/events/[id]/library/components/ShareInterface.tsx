'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Share2,
  X,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Calendar,
  Eye,
  Download,
  MessageSquare,
  Globe,
  Folder,
  Image as ImageIcon,
  Users,
  Sparkles,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ShareItem {
  id: string;
  type: 'folder' | 'photo';
  name: string;
}

interface ShareInterfaceProps {
  eventId: string;
  eventName: string;
  currentFolderId: string | null;
  currentFolderName?: string;
  selectedItems: ShareItem[];
  onClose: () => void;
  className?: string;
}

interface ShareToken {
  id: string;
  token: string;
  shareUrl: string;
  shareType: string;
  title?: string;
  description?: string;
  expiresAt?: string;
  maxViews?: number;
  allowDownload: boolean;
  allowComments: boolean;
  hasPassword: boolean;
  createdAt: string;
}

const EXPIRY_OPTIONS = [
  { value: '', label: 'Sin expiración' },
  { value: '1h', label: '1 hora' },
  { value: '1d', label: '1 día' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
];

const VIEW_LIMIT_OPTIONS = [
  { value: '', label: 'Sin límite' },
  { value: '10', label: '10 vistas' },
  { value: '50', label: '50 vistas' },
  { value: '100', label: '100 vistas' },
  { value: '500', label: '500 vistas' },
  { value: '1000', label: '1000 vistas' },
];

export function ShareInterface({
  eventId,
  eventName,
  currentFolderId,
  currentFolderName,
  selectedItems,
  onClose,
  className,
}: ShareInterfaceProps) {
  const [shareData, setShareData] = useState({
    title: '',
    description: '',
    password: '',
    expiry: '',
    maxViews: '',
    allowDownload: false,
    allowComments: false,
  });

  const [generatedShare, setGeneratedShare] = useState<ShareToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Determine share type and default title
  const shareType = selectedItems.length > 0 ? 'photos' : 'folder';
  const defaultTitle =
    shareType === 'folder'
      ? `${currentFolderName || 'Fotos'} - ${eventName}`
      : `${selectedItems.length} foto${selectedItems.length !== 1 ? 's' : ''} - ${eventName}`;

  useEffect(() => {
    setShareData((prev) => ({
      ...prev,
      title: prev.title || defaultTitle,
    }));
  }, [defaultTitle]);

  // Calculate expiration date
  const calculateExpirationDate = (expiry: string): Date | undefined => {
    if (!expiry) return undefined;

    const now = new Date();
    const [amount, unit] = [parseInt(expiry.slice(0, -1)), expiry.slice(-1)];

    switch (unit) {
      case 'h':
        return new Date(now.getTime() + amount * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + amount * 24 * 60 * 60 * 1000);
      default:
        return undefined;
    }
  };

  // Handle share generation
  const handleGenerateShare = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsAnimating(true);

      const expiresAt = calculateExpirationDate(shareData.expiry);
      const maxViews = shareData.maxViews
        ? parseInt(shareData.maxViews)
        : undefined;

      const payload = {
        eventId,
        shareType,
        title: shareData.title.trim() || defaultTitle,
        description: shareData.description.trim() || undefined,
        password: shareData.password.trim() || undefined,
        expiresAt: expiresAt?.toISOString(),
        maxViews,
        allowDownload: shareData.allowDownload,
        allowComments: shareData.allowComments,
      };

      // Add type-specific data
      if (shareType === 'folder') {
        payload.folderId = currentFolderId;
      } else {
        payload.photoIds = selectedItems.map((item) => item.id);
      }

      // Show progress toast
      const toastId = toast.loading('Generando enlace de compartición...');

      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create share');
      }

      const result = await response.json();
      setGeneratedShare(result.share);

      // Success feedback
      toast.success('¡Enlace creado exitosamente!', {
        id: toastId,
        description: 'El enlace está listo para compartir',
      });

      // Animate the success state
      setTimeout(() => setIsAnimating(false), 1000);
    } catch (error) {
      console.error('Error generating share:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create share';
      setError(errorMessage);

      // Error feedback
      toast.error('Error al crear el enlace', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [
    shareData,
    eventId,
    shareType,
    currentFolderId,
    selectedItems,
    defaultTitle,
  ]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('¡Enlace copiado!', {
        description: 'El enlace se copió al portapapeles',
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Error al copiar', {
        description: 'No se pudo copiar el enlace',
      });
    }
  }, []);

  // Handle form field changes
  const handleFieldChange = useCallback((field: string, value: any) => {
    setShareData((prev) => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-white shadow-lg',
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <Share2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                Compartir
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {shareType === 'folder' ? (
                  <>
                    <Folder className="mr-1 inline h-4 w-4" />
                    {currentFolderName || 'Carpeta raíz'}
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-1 inline h-4 w-4" />
                    {selectedItems.length} foto
                    {selectedItems.length !== 1 ? 's' : ''} seleccionada
                    {selectedItems.length !== 1 ? 's' : ''}
                  </>
                )}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {!generatedShare ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={shareData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="Título del enlace compartido"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  value={shareData.description}
                  onChange={(e) =>
                    handleFieldChange('description', e.target.value)
                  }
                  placeholder="Descripción del contenido compartido"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            {/* Security Settings */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Lock className="h-4 w-4" />
                Configuración de Seguridad
              </h4>

              <div>
                <Label htmlFor="password">Contraseña (opcional)</Label>
                <Input
                  id="password"
                  type="password"
                  value={shareData.password}
                  onChange={(e) =>
                    handleFieldChange('password', e.target.value)
                  }
                  placeholder="Proteger con contraseña"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Deja vacío para compartir sin contraseña
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiry">Expiración</Label>
                  <Select
                    value={shareData.expiry}
                    onValueChange={(value) =>
                      handleFieldChange('expiry', value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar expiración" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maxViews">Límite de vistas</Label>
                  <Select
                    value={shareData.maxViews}
                    onValueChange={(value) =>
                      handleFieldChange('maxViews', value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sin límite" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIEW_LIMIT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Users className="h-4 w-4" />
                Permisos
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-gray-500" />
                    <Label htmlFor="allowDownload">Permitir descarga</Label>
                  </div>
                  <Switch
                    id="allowDownload"
                    checked={shareData.allowDownload}
                    onCheckedChange={(checked) =>
                      handleFieldChange('allowDownload', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <Label htmlFor="allowComments">Permitir comentarios</Label>
                  </div>
                  <Switch
                    id="allowComments"
                    checked={shareData.allowComments}
                    onCheckedChange={(checked) =>
                      handleFieldChange('allowComments', checked)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleGenerateShare}
                disabled={loading}
                className="relative overflow-hidden transition-all hover:scale-105"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Crear enlace
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Generated Share Display */
          <div className="space-y-6">
            <div className={`text-center transition-all duration-500 ${isAnimating ? 'scale-110' : 'scale-100'}`}>
              <div className="relative inline-block">
                <CheckCircle2 className={`mx-auto mb-3 h-12 w-12 text-green-600 transition-all duration-500 ${isAnimating ? 'scale-125' : ''}`} />
                {isAnimating && (
                  <div className="absolute inset-0 h-12 w-12 bg-green-400 rounded-full animate-ping opacity-30"></div>
                )}
              </div>
              <h4 className="mb-2 text-lg font-medium text-foreground">
                ¡Enlace creado exitosamente!
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                El enlace de compartición está listo para usar
              </p>
            </div>

            {/* Share URL */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Enlace de compartición
              </Label>
              <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg">
                <Input
                  value={generatedShare.shareUrl}
                  readOnly
                  className="flex-1 font-mono text-sm bg-white dark:bg-gray-800 border-0"
                />
                <Button
                  variant={copied ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCopy(generatedShare.shareUrl)}
                  className={`flex-shrink-0 transition-all ${copied ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Share Details */}
            <div className="space-y-3 rounded-md bg-muted p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Tipo:</span>
                <span className="font-medium">
                  {shareType === 'folder' ? 'Carpeta' : 'Fotos seleccionadas'}
                </span>
              </div>

              {generatedShare.hasPassword && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Protección:</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    <Lock className="mr-1 inline h-3 w-3" />
                    Con contraseña
                  </span>
                </div>
              )}

              {generatedShare.expiresAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Expira:</span>
                  <span className="font-medium">
                    <Calendar className="mr-1 inline h-3 w-3" />
                    {new Date(generatedShare.expiresAt).toLocaleDateString(
                      'es-ES',
                      {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </span>
                </div>
              )}

              {generatedShare.maxViews && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Límite de vistas:</span>
                  <span className="font-medium">
                    <Eye className="mr-1 inline h-3 w-3" />
                    {generatedShare.maxViews} vistas
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Permisos:</span>
                <div className="flex items-center gap-2">
                  {generatedShare.allowDownload && (
                    <span className="rounded bg-blue-100 dark:bg-blue-950/30 px-2 py-1 text-xs text-blue-700">
                      <Download className="mr-1 inline h-3 w-3" />
                      Descarga
                    </span>
                  )}
                  {generatedShare.allowComments && (
                    <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                      <MessageSquare className="mr-1 inline h-3 w-3" />
                      Comentarios
                    </span>
                  )}
                  {!generatedShare.allowDownload &&
                    !generatedShare.allowComments && (
                      <span className="text-xs text-gray-500">Solo vista</span>
                    )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button variant="outline" onClick={() => setGeneratedShare(null)}>
                Crear otro enlace
              </Button>
              <Button onClick={onClose}>Cerrar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

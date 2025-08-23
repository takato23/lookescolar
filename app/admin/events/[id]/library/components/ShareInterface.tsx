'use client';

import { useState, useCallback, useEffect } from 'react';
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
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  className
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

  // Determine share type and default title
  const shareType = selectedItems.length > 0 ? 'photos' : 'folder';
  const defaultTitle = shareType === 'folder' 
    ? `${currentFolderName || 'Fotos'} - ${eventName}`
    : `${selectedItems.length} foto${selectedItems.length !== 1 ? 's' : ''} - ${eventName}`;

  useEffect(() => {
    setShareData(prev => ({
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

      const expiresAt = calculateExpirationDate(shareData.expiry);
      const maxViews = shareData.maxViews ? parseInt(shareData.maxViews) : undefined;

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
        payload.photoIds = selectedItems.map(item => item.id);
      }

      const response = await fetch('/api/admin/share', {
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

    } catch (error) {
      console.error('Error generating share:', error);
      setError(error instanceof Error ? error.message : 'Failed to create share');
    } finally {
      setLoading(false);
    }
  }, [shareData, eventId, shareType, currentFolderId, selectedItems, defaultTitle]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

  // Handle form field changes
  const handleFieldChange = useCallback((field: string, value: any) => {
    setShareData(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 shadow-lg", className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Share2 className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Compartir</h3>
              <p className="text-sm text-gray-600">
                {shareType === 'folder' ? (
                  <>
                    <Folder className="h-4 w-4 inline mr-1" />
                    {currentFolderName || 'Carpeta raíz'}
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 inline mr-1" />
                    {selectedItems.length} foto{selectedItems.length !== 1 ? 's' : ''} seleccionada{selectedItems.length !== 1 ? 's' : ''}
                  </>
                )}
              </p>
            </div>
          </div>
          
          <Button variant="ghost" size="sm" onClick={onClose}>
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
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Descripción del contenido compartido"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            {/* Security Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Configuración de Seguridad
              </h4>

              <div>
                <Label htmlFor="password">Contraseña (opcional)</Label>
                <Input
                  id="password"
                  type="password"
                  value={shareData.password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  placeholder="Proteger con contraseña"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deja vacío para compartir sin contraseña
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiry">Expiración</Label>
                  <Select value={shareData.expiry} onValueChange={(value) => handleFieldChange('expiry', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar expiración" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maxViews">Límite de vistas</Label>
                  <Select value={shareData.maxViews} onValueChange={(value) => handleFieldChange('maxViews', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sin límite" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIEW_LIMIT_OPTIONS.map(option => (
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
              <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
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
                    onCheckedChange={(checked) => handleFieldChange('allowDownload', checked)}
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
                    onCheckedChange={(checked) => handleFieldChange('allowComments', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleGenerateShare} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    Crear enlace
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Generated Share Display */
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                ¡Enlace creado exitosamente!
              </h4>
              <p className="text-sm text-gray-600">
                El enlace de compartición está listo para usar
              </p>
            </div>

            {/* Share URL */}
            <div className="space-y-2">
              <Label>Enlace de compartición</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={generatedShare.shareUrl}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(generatedShare.shareUrl)}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Share Details */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tipo:</span>
                <span className="font-medium">
                  {shareType === 'folder' ? 'Carpeta' : 'Fotos seleccionadas'}
                </span>
              </div>

              {generatedShare.hasPassword && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Protección:</span>
                  <span className="font-medium text-amber-600">
                    <Lock className="h-3 w-3 inline mr-1" />
                    Con contraseña
                  </span>
                </div>
              )}

              {generatedShare.expiresAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Expira:</span>
                  <span className="font-medium">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {new Date(generatedShare.expiresAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}

              {generatedShare.maxViews && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Límite de vistas:</span>
                  <span className="font-medium">
                    <Eye className="h-3 w-3 inline mr-1" />
                    {generatedShare.maxViews} vistas
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Permisos:</span>
                <div className="flex items-center gap-2">
                  {generatedShare.allowDownload && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      <Download className="h-3 w-3 inline mr-1" />
                      Descarga
                    </span>
                  )}
                  {generatedShare.allowComments && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      <MessageSquare className="h-3 w-3 inline mr-1" />
                      Comentarios
                    </span>
                  )}
                  {!generatedShare.allowDownload && !generatedShare.allowComments && (
                    <span className="text-xs text-gray-500">Solo vista</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setGeneratedShare(null)}>
                Crear otro enlace
              </Button>
              <Button onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Mail,
  Send,
  Settings2,
  CheckCircle,
  XCircle,
  Loader2,
  Save,
  Eye,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

// =============================================================================
// TYPES
// =============================================================================

interface EmailTemplate {
  enabled: boolean;
  subject_template: string;
}

interface EmailConfig {
  provider: 'resend' | 'smtp';
  api_key: string;
  from_email: string;
  from_name: string;
  reply_to: string;
  templates: {
    order_confirmation: EmailTemplate;
    order_ready: EmailTemplate;
    download_ready: EmailTemplate;
  };
}

interface EmailSettingsProps {
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function EmailSettings({ className }: EmailSettingsProps) {
  const [config, setConfig] = useState<EmailConfig>({
    provider: 'resend',
    api_key: '',
    from_email: '',
    from_name: '',
    reply_to: '',
    templates: {
      order_confirmation: { enabled: true, subject_template: 'Confirmacion de pedido #{{order_number}}' },
      order_ready: { enabled: true, subject_template: 'Tu pedido #{{order_number}} esta listo' },
      download_ready: { enabled: true, subject_template: 'Tus fotos digitales estan listas para descargar' },
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current config
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('/api/admin/settings/email');
        if (response.ok) {
          const data = await response.json();
          if (data.config) {
            setConfig(data.config);
          }
        }
      } catch (error) {
        console.error('Error fetching email config:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  // Update config field
  const updateField = useCallback(<K extends keyof EmailConfig>(
    field: K,
    value: EmailConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setTestResult(null);
  }, []);

  // Update template field
  const updateTemplate = useCallback((
    templateKey: keyof EmailConfig['templates'],
    field: keyof EmailTemplate,
    value: boolean | string
  ) => {
    setConfig((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [templateKey]: {
          ...prev.templates[templateKey],
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
  }, []);

  // Save config
  const saveConfig = useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar');
      }

      toast.success('Configuracion de email guardada');
      setHasChanges(false);
    } catch (error) {
      toast.error('Error al guardar la configuracion');
    } finally {
      setSaving(false);
    }
  }, [config]);

  // Test email connection
  const testConnection = useCallback(async () => {
    if (!config.api_key || !config.from_email) {
      setTestResult({ success: false, message: 'Completa la API Key y el email de origen' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          api_key: config.api_key,
          from_email: config.from_email,
          from_name: config.from_name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({ success: true, message: 'Conexion exitosa! Email de prueba enviado.' });
      } else {
        setTestResult({ success: false, message: data.error || 'Error al enviar email de prueba' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Error al probar la conexion' });
    } finally {
      setTesting(false);
    }
  }, [config]);

  // Check if config is valid
  const isConfigValid = config.api_key && config.from_email && config.from_name;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Provider Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle>Configuracion del Proveedor</CardTitle>
              <CardDescription>
                Configura el servicio de envio de emails transaccionales
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider">Proveedor</Label>
              <Select
                value={config.provider}
                onValueChange={(value) => updateField('provider', value as 'resend' | 'smtp')}
              >
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="smtp" disabled>SMTP (proximamente)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                value={config.api_key}
                onChange={(e) => updateField('api_key', e.target.value)}
                placeholder="re_xxxxxxxx..."
              />
              <p className="text-xs text-muted-foreground">
                Obtene tu API Key en{' '}
                <a
                  href="https://resend.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  resend.com
                </a>
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from_email">Email de origen</Label>
              <Input
                id="from_email"
                type="email"
                value={config.from_email}
                onChange={(e) => updateField('from_email', e.target.value)}
                placeholder="noreply@tudominio.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="from_name">Nombre del remitente</Label>
              <Input
                id="from_name"
                value={config.from_name}
                onChange={(e) => updateField('from_name', e.target.value)}
                placeholder="Mi Estudio Fotografico"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reply_to">Responder a (opcional)</Label>
            <Input
              id="reply_to"
              type="email"
              value={config.reply_to}
              onChange={(e) => updateField('reply_to', e.target.value)}
              placeholder="contacto@tudominio.com"
            />
            <p className="text-xs text-muted-foreground">
              Direccion a la que llegaran las respuestas de los clientes
            </p>
          </div>

          {/* Test Connection */}
          <div className="flex items-center gap-4 pt-2">
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing || !isConfigValid}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Probando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Probar conexion
                </>
              )}
            </Button>

            {testResult && (
              <div className={cn(
                'flex items-center gap-2 text-sm',
                testResult.success ? 'text-green-600' : 'text-destructive'
              )}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Settings2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle>Plantillas de Email</CardTitle>
              <CardDescription>
                Configura que emails se envian automaticamente
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Confirmation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Confirmacion de pedido</Label>
                <p className="text-sm text-muted-foreground">
                  Se envia cuando el cliente completa el pago
                </p>
              </div>
              <Switch
                checked={config.templates.order_confirmation.enabled}
                onCheckedChange={(checked) => updateTemplate('order_confirmation', 'enabled', checked)}
              />
            </div>
            {config.templates.order_confirmation.enabled && (
              <div className="space-y-2">
                <Label htmlFor="order_confirmation_subject" className="text-sm">Asunto</Label>
                <Input
                  id="order_confirmation_subject"
                  value={config.templates.order_confirmation.subject_template}
                  onChange={(e) => updateTemplate('order_confirmation', 'subject_template', e.target.value)}
                  placeholder="Confirmacion de pedido #{{order_number}}"
                />
                <p className="text-xs text-muted-foreground">
                  Variables disponibles: {'{{order_number}}'}, {'{{customer_name}}'}, {'{{event_name}}'}
                </p>
              </div>
            )}
          </div>

          {/* Order Ready */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Pedido listo</Label>
                <p className="text-sm text-muted-foreground">
                  Se envia cuando el pedido esta listo para retirar/enviar
                </p>
              </div>
              <Switch
                checked={config.templates.order_ready.enabled}
                onCheckedChange={(checked) => updateTemplate('order_ready', 'enabled', checked)}
              />
            </div>
            {config.templates.order_ready.enabled && (
              <div className="space-y-2">
                <Label htmlFor="order_ready_subject" className="text-sm">Asunto</Label>
                <Input
                  id="order_ready_subject"
                  value={config.templates.order_ready.subject_template}
                  onChange={(e) => updateTemplate('order_ready', 'subject_template', e.target.value)}
                  placeholder="Tu pedido #{{order_number}} esta listo"
                />
              </div>
            )}
          </div>

          {/* Download Ready */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Descarga disponible</Label>
                <p className="text-sm text-muted-foreground">
                  Se envia con los enlaces de descarga para productos digitales
                </p>
              </div>
              <Switch
                checked={config.templates.download_ready.enabled}
                onCheckedChange={(checked) => updateTemplate('download_ready', 'enabled', checked)}
              />
            </div>
            {config.templates.download_ready.enabled && (
              <div className="space-y-2">
                <Label htmlFor="download_ready_subject" className="text-sm">Asunto</Label>
                <Input
                  id="download_ready_subject"
                  value={config.templates.download_ready.subject_template}
                  onChange={(e) => updateTemplate('download_ready', 'subject_template', e.target.value)}
                  placeholder="Tus fotos digitales estan listas para descargar"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Warning if not configured */}
      {!isConfigValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Los emails transaccionales no se enviaran hasta que completes la configuracion del proveedor.
          </AlertDescription>
        </Alert>
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

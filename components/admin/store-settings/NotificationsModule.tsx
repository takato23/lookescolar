/**
 * 📧 Módulo de notificaciones y emails
 * Configura emails automáticos y notificaciones del sistema
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Mail, Clock, MessageSquare } from 'lucide-react';
import { StoreConfig } from '@/lib/validations/store-config';

interface NotificationsModuleProps {
  config: StoreConfig;
  onUpdate: (updates: Partial<StoreConfig>) => void;
}

export const NotificationsModule: React.FC<NotificationsModuleProps> = ({
  config,
  onUpdate
}) => {
  const updateNotification = (field: string, value: any) => {
    onUpdate({
      notification_settings: {
        ...config.notification_settings,
        [field]: value
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificaciones y Emails
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Emails automáticos */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <Label className="text-base">Emails automáticos</Label>
          </div>

          <div className="space-y-4 pl-6">
            {/* Email de confirmación de compra */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm">Confirmación de compra</Label>
                <p className="text-xs text-muted-foreground0">
                  Email automático cuando se realiza una compra
                </p>
              </div>
              <Switch
                checked={config.notification_settings?.order_confirmation ?? true}
                onCheckedChange={(checked) => updateNotification('order_confirmation', checked)}
                aria-label="Habilitar email de confirmación de compra"
              />
            </div>

            {/* Recordatorios de descarga */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm">Recordatorios de descarga</Label>
                <p className="text-xs text-muted-foreground0">
                  Emails recordando descargar las fotos compradas
                </p>
              </div>
              <Switch
                checked={config.notification_settings?.download_reminders ?? true}
                onCheckedChange={(checked) => updateNotification('download_reminders', checked)}
                aria-label="Habilitar recordatorios de descarga"
              />
            </div>

            {/* Alertas de expiración */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm">Alertas de expiración</Label>
                <p className="text-xs text-muted-foreground0">
                  Notificar cuando las fotos estén por expirar
                </p>
              </div>
              <Switch
                checked={config.notification_settings?.expiry_warnings ?? true}
                onCheckedChange={(checked) => updateNotification('expiry_warnings', checked)}
                aria-label="Habilitar alertas de expiración"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Configuración de horarios */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <Label className="text-base">Horarios de envío</Label>
          </div>

          <div className="grid grid-cols-2 gap-4 pl-6">
            <div className="space-y-2">
              <Label htmlFor="reminder-delay">Días para recordatorio</Label>
              <Input
                id="reminder-delay"
                type="number"
                min="1"
                max="30"
                value={config.notification_settings?.reminder_delay_days || 7}
                onChange={(e) => updateNotification('reminder_delay_days', parseInt(e.target.value) || 7)}
                aria-label="Días para enviar recordatorio"
              />
              <p className="text-xs text-muted-foreground0">
                Días después de la compra para enviar recordatorio
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry-warning">Días para alerta de expiración</Label>
              <Input
                id="expiry-warning"
                type="number"
                min="1"
                max="60"
                value={config.notification_settings?.expiry_warning_days || 3}
                onChange={(e) => updateNotification('expiry_warning_days', parseInt(e.target.value) || 3)}
                aria-label="Días antes de expiración para alerta"
              />
              <p className="text-xs text-muted-foreground0">
                Días antes de expirar para enviar alerta
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Plantillas de email */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <Label className="text-base">Plantillas de email</Label>
          </div>

          <div className="space-y-4 pl-6">
            {/* Asunto del email de confirmación */}
            <div className="space-y-2">
              <Label htmlFor="confirmation-subject">Asunto - Confirmación de compra</Label>
              <Input
                id="confirmation-subject"
                value={config.notification_settings?.email_templates?.order_confirmation?.subject || 'Confirmación de tu compra - {event_name}'}
                onChange={(e) => updateNotification('email_templates', {
                  ...config.notification_settings?.email_templates,
                  order_confirmation: {
                    ...config.notification_settings?.email_templates?.order_confirmation,
                    subject: e.target.value
                  }
                })}
                placeholder="Confirmación de tu compra - {event_name}"
                aria-label="Asunto del email de confirmación"
              />
            </div>

            {/* Mensaje de confirmación */}
            <div className="space-y-2">
              <Label htmlFor="confirmation-message">Mensaje - Confirmación de compra</Label>
              <Textarea
                id="confirmation-message"
                value={config.notification_settings?.email_templates?.order_confirmation?.message || 'Hola {customer_name},\n\nTu compra ha sido procesada exitosamente.\n\nProductos comprados:\n{products_list}\n\nTotal: {total_amount}\n\n¡Gracias por tu compra!\n\nSaludos,\nEl equipo de {event_name}'}
                onChange={(e) => updateNotification('email_templates', {
                  ...config.notification_settings?.email_templates,
                  order_confirmation: {
                    ...config.notification_settings?.email_templates?.order_confirmation,
                    message: e.target.value
                  }
                })}
                placeholder="Hola {customer_name},..."
                rows={6}
                aria-label="Mensaje del email de confirmación"
              />
              <p className="text-xs text-muted-foreground0">
                Variables disponibles: {`{customer_name}, {event_name}, {products_list}, {total_amount}, {order_id}`}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Configuración SMTP */}
        <div className="space-y-4">
          <Label className="text-base">Configuración de envío de emails</Label>

          <div className="grid grid-cols-2 gap-4 pl-6">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">Servidor SMTP</Label>
              <Input
                id="smtp-host"
                value={config.notification_settings?.smtp?.host || ''}
                onChange={(e) => updateNotification('smtp', {
                  ...config.notification_settings?.smtp,
                  host: e.target.value
                })}
                placeholder="smtp.gmail.com"
                aria-label="Servidor SMTP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">Puerto</Label>
              <Input
                id="smtp-port"
                type="number"
                value={config.notification_settings?.smtp?.port || 587}
                onChange={(e) => updateNotification('smtp', {
                  ...config.notification_settings?.smtp,
                  port: parseInt(e.target.value) || 587
                })}
                placeholder="587"
                aria-label="Puerto SMTP"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pl-6">
            <div className="space-y-2">
              <Label htmlFor="smtp-username">Usuario</Label>
              <Input
                id="smtp-username"
                value={config.notification_settings?.smtp?.username || ''}
                onChange={(e) => updateNotification('smtp', {
                  ...config.notification_settings?.smtp,
                  username: e.target.value
                })}
                placeholder="tu-email@dominio.com"
                aria-label="Usuario SMTP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-password">Contraseña</Label>
              <Input
                id="smtp-password"
                type="password"
                value={config.notification_settings?.smtp?.password || ''}
                onChange={(e) => updateNotification('smtp', {
                  ...config.notification_settings?.smtp,
                  password: e.target.value
                })}
                placeholder="••••••••"
                aria-label="Contraseña SMTP"
              />
            </div>
          </div>

          <div className="space-y-2 pl-6">
            <Label htmlFor="from-email">Email remitente</Label>
            <Input
              id="from-email"
              type="email"
              value={config.notification_settings?.from_email || ''}
              onChange={(e) => updateNotification('from_email', e.target.value)}
              placeholder="ventas@escuela.edu.ar"
              aria-label="Email remitente"
            />
            <p className="text-xs text-muted-foreground0">
              Email que aparecerá como remitente en los emails automáticos
            </p>
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">💡 Funcionalidades de notificaciones</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Emails automáticos de confirmación de compra</li>
            <li>• Recordatorios de descarga después de 7 días</li>
            <li>• Alertas de expiración 3 días antes</li>
            <li>• Plantillas personalizables con variables dinámicas</li>
            <li>• Configuración SMTP para envío de emails</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

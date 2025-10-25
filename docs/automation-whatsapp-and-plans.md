# Automatización de WhatsApp y Sistema de Planes

## 1. Automatización de notificaciones por WhatsApp
- **Trigger**: cuando MercadoPago confirma un pago (estado `approved`) el webhook `/api/webhooks/mercadopago` invoca al servicio `whatsappNotificationService`.
- **Resumen del mensaje**: se envían datos clave del pedido (evento, cliente, total, resumen de ítems) al teléfono del fotógrafo configurado en el evento.
- **Reintentos y auditoría**:
  - Hasta 3 intentos con backoff exponencial (5, 10, 20 minutos) antes de marcar el envío como `failed`.
  - Registros persistidos en `whatsapp_notifications` y `whatsapp_notification_attempts` incluyendo payloads y errores.
- **Configuración**:
  - `WHATSAPP_AUTOMATION_ENABLED` (`true`/`false`).
  - `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION` (default `v20.0`), `WHATSAPP_DEFAULT_COUNTRY_CODE`.
  - Se usa el endpoint oficial `POST /{phone-number-id}/messages` del WhatsApp Cloud API para despachar textos.citeturn7search1
- **Logs**: disponibles en tablas nuevas y en `logs/` (Pino). Las consultas en Supabase están encapsuladas en `lib/services/whatsapp-notification.service.ts`.

## 2. Planes de tenant y límites
- Nuevas tablas: `plans` y `tenant_plan_subscriptions` (relacionadas con `tenants`).
- Planes preconfigurados:
  | Código | Eventos activos | Fotos por evento | Shares por evento |
  | --- | --- | --- | --- |
  | Free | 2 | 200 | 3 |
  | Básico | 8 | 1.000 | 20 |
  | Pro | 25 | 5.000 | 50 |
  | Premium | Ilimitado | 20.000 | 200 |
- El servicio `TenantPlanService` aplica reglas y lanza `PlanLimitError` cuando se excede el cupo. Actualmente se gatea:
  - `POST /api/upload-init`: bloquea lotes de fotos que superen el máximo por evento.
  - `POST /api/share`: evita crear shares cuando se alcanzó el límite por evento.
- API nueva: `GET/PATCH /api/admin/tenant-plan` para leer o cambiar el plan activo del tenant.
- UI: sección “Plan y Límites” en `/admin/settings` muestra uso actual, permite cambiar de plan y expone el evento más demandante (fotos/shares).

## 3. Conectar cobros recurrentes (futuro)
### MercadoPago Suscripciones (Preapproval)
1. Crear credenciales de producción y habilitar webhooks específicos para eventos de `preapproval`.citeturn9search0
2. Generar planes desde `/preapproval_plan` y asociar a cada tenant un `preapproval_plan_id`.citeturn9search0
3. Enviar a los clientes al flujo de aprobación (`init_point`) y recibir notificaciones para activar o cancelar `tenant_plan_subscriptions`.citeturn9search4

### Stripe Billing
1. Definir productos y precios recurrentes en el Dashboard (`Products > + Add product`).citeturn10search1
2. Usar Checkout o Payment Links para suscripciones y escuchar eventos `invoice.paid`, `customer.subscription.updated/canceled` vía webhook.citeturn10search3
3. Almacenar el `stripe_subscription_id` en `tenant_plan_subscriptions` (columna `billing_external_id`) y sincronizar el estado del plan.

## 4. Pasos operativos después de actualizar
1. Ejecutar las migraciones nuevas:
   ```bash
   supabase db push # o comando equivalente del proyecto
   ```
2. Configurar las variables de entorno mencionadas para WhatsApp (guardar el token en un secret manager).
3. Verificar que los eventos tengan `photographer_phone` cargado para recibir alertas.
4. Validar que `/admin/settings` cargue la sección “Plan y Límites” y que los límites se apliquen intentando subir fotos y crear shares por encima del cupo.

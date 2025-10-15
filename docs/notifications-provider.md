# Notificaciones MCP – Selección de proveedores

Fecha: 2025-10-08
Status: ✅ Aprobado
Owner: plataforma@lookescolar.com

## Necesidades

- Alertas operativas en tiempo real (pedidos overdue, fallas de workflow).
- Mensajes transaccionales a familias (recordatorios, confirmaciones).
- Canal único para seguir conversas desde MCP (bot/chat). 
- APIs simples, soporte para colas y reintentos, credenciales manejables.

## Opciones evaluadas

| Canal | Opción | Pros | Contras |
| ----- | ------ | ---- | ------- |
| Slack | **Slack App + Incoming Webhooks** | Configuración rápida, sin costo, canales existentes, permisos granulares. | Requiere rotar `SLACK_BOT_TOKEN`, límite de mensajes por minuto (~50). |
| Email | **Resend** | SDK simple, sandbox, plantillas dinámicas, precios bajos. | No tiene SMS, requiere verificación de dominios. |
| Email | AWS SES | Escalable, ya usado en otras áreas. | Onboarding complejo, requiere IAM adicional. |
| SMS | Twilio | Cobertura global, SDK maduro. | Costos altos para AR, requiere verificación de remitentes. |

## Decisión

1. **Slack (App Bot + Webhook)** para alertas internas (`notifications.dispatch` → destinos `slack:#channel`).
2. **Resend** para correos transaccionales y recordatorios (`notifications.dispatch` → destinos `email:user@domain`).
3. SMS queda en backlog; se evaluará Twilio cuando tengamos casos reales.

## Próximos pasos técnicos

1. Crear proyecto Slack App `lookescolar-mcp` y generar tokens bot + webhook.
2. Provisionar dominio en Resend y crear API Key restringida.
3. Guardar credenciales en `Supabase secrets` (`SLACK_BOT_TOKEN`, `SLACK_WEBHOOK_URL`, `RESEND_API_KEY`).
4. Implementar adaptador `lib/notifications/dispatcher.ts` con:
   - `sendSlackMessage({ channel, text, blocks? })`
   - `sendEmail({ to, subject, template, data })` (Resend).
   - Fallback/logging vía `NotificationHub`.
5. Añadir tablas `notification_destinations` y `notification_templates` para `notifications.subscribe`.
6. Escribir pruebas unitarias simulando respuestas HTTP (Slack 200, Resend 202, errores).

## Riesgos

- **Rate limits Slack**: mitigar con colas en Upstash Redis + retry 429.
- **Email entregabilidad**: necesita registros DKIM/SPF/DMARC; coordinar con infra.
- **Costo Resend**: monitorear volumen mensual, activar alertas de billing.

## Indicadores de éxito

- Tiempos de entrega < 10s para alertas Slack.
- Bounce < 1% en correos.
- Trazabilidad completa en `notification_logs` (a implementar).


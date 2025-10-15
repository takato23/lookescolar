# LookEscolar MCP Server

Guía para exponer las APIs internas de LookEscolar al nuevo Apps SDK de OpenAI mediante un servidor MCP (Model Context Protocol).

## Requisitos

- Node.js 18 o superior.
- Variables de entorno válidas para el backend (pueden cargarse desde `.env.local`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Opcional:
  - `MCP_SERVER_PORT` (puerto HTTP, por defecto `3030`).
  - `MCP_SERVER_HOST` (por defecto `0.0.0.0`).
  - `MCP_SERVER_NAME` / `MCP_SERVER_VERSION` para personalizar el handshake MCP.

## Instalación

```bash
npm install
# Si todavía no existe, copiar y completar variables:
cp .env.mcp.example .env.mcp
```

## Ejecución local

```bash
# Lanza el servidor MCP con soporte para condiciones react-server
npm run dev:mcp
```

El endpoint SSE del protocolo queda expuesto en `GET /mcp`; los mensajes MCP se publican en `POST /mcp/messages?sessionId=...`. Existe además `GET /healthz` para chequeos básicos.

Para build estático (opcional):

```bash
npm run build:mcp
```

## Herramientas registradas

| Tool | Descripción | Entrada esperada |
| ---- | ----------- | ---------------- |
| `buscar_fotos` | Lista fotos de un evento con filtros de carpeta, estado, búsqueda y paginación. | `eventId` obligatorio, opcionales `folderId`, `approved`, `processingStatus`, `searchTerm`, `sortBy`, `sortOrder`, `page`, `limit`. |
| `aprobar_fotos` | Aprueba o rechaza lotes de fotos y devuelve el detalle de errores. | `photoIds[]` obligatorio, `approved` (bool) y configuración de notificación opcional. |
| `mover_fotos` | Reubica fotos dentro del árbol de carpetas de un evento. | `eventId`, `photoIds[]`, opcional `targetFolderId` (null para raíz). |
| `generar_urls_fotos` | Obtiene URLs firmadas temporales para compartir fotos. | `photoIds[]`, `expiryMinutes` (1-1440), `usePreview` (bool). |
| `crear_carpeta_evento` | Crea una carpeta y valida duplicados/profundidad. | `eventId`, `name`, y opcional `parentId`, `description`, `sortOrder`. |
| `listar_carpetas_evento` | Devuelve la estructura de carpetas de un evento. | `eventId`, opcional `parentId` para filtrar niveles. |
| `clasificar_fotos` | Estima si cada foto es grupal o individual con confianza y razones. | `photoIds[]`. |
| `auto_clasificar_evento` | Clasifica fotos aprobadas sin etiqueta en un evento. | `eventId`. |
| `crear_paquete` | Crea un combo en `combo_packages` con sus ítems (`combo_package_items`). | `name`, `pricingType`, `basePrice` obligatorios. Opcionales `description`, `minPhotos`, `maxPhotos`, `allowsDuplicates`, `pricePerPhoto`, `imageUrl`, `badgeText`, `badgeColor`, `isFeatured`, `items[]`. |
| `consultar_pedidos` | Consulta la vista unificada de pedidos con métricas agregadas. | Filtros opcionales: `status`, `eventId`, `priorityLevel`, `deliveryMethod`, `createdAfter`, `createdBefore`, `overdueOnly`, `searchQuery`, `page`, `limit`. |
| `listar_pedidos_recientes` | Devuelve pedidos recientes con ID y datos clave para futuras acciones. | Opcionales `eventId`, `status`, `limit`. |
| `actualizar_pedido` | Cambia estado, prioridad o datos logísticos de un pedido. | `orderId` obligatorio; opcionales `status`, `notes`, `priorityLevel`, `estimatedDeliveryDate`, `deliveryMethod`, `trackingNumber`, `adminId`. |
| `resumen_pedidos` | Sintetiza pendientes/overdue para priorizar acciones. | Opcionales `eventId`, `overdueOnly` (default true), `limit`. |
| `orders_follow_up` | Lista pedidos críticos con acciones sugeridas y datos de contacto. | Opcionales `eventId`, `status`, `overdueOnly`, `limit`, `includeContacts`. |
| `estadisticas_ventas` | Calcula métricas y predicciones de ventas (`OrderAnalyticsService`). | Opcionales: `startDate`, `endDate`, `eventId`, `status[]`, `includeForecasting` (por defecto `true`). |
| `analytics_event_insights` | Resumen ejecutivo (ventas, picos, alertas) de un evento concreto. | `eventId` obligatorio; opcionales `startDate`, `endDate`, `includeForecasting`, `includeAlerts`. |
| `qr_batch_status` | Engagement y errores de códigos QR por evento. | `eventId` obligatorio; opcionales `startDate`, `endDate`. |
| `listar_workflows` | Lista workflows activos por tipo de disparador. | Opcional `eventType`. |
| `agenda_workflow` | Agenda diaria basada en workflows y pedidos críticos. | Opcionales `eventId`, `limit`. |
| `disparar_workflow_pedido` | Ejecuta manualmente un workflow (creación, cambio de estado, barrido). | `eventType`, y `orderId`/`newStatus` según corresponda. |
| `simular_workflow_pedido` | Simula acciones que se ejecutarían sin dispararlas. | `orderId`, opcional `eventType`, `newStatus`, `previousStatus`. |
| `store_theme_preview` | Devuelve la guía visual del tema público seleccionado. | `themeId`, opcionales `includeCssVars`, `includeComponents`. |
| `analytics_event_insights` | Resume desempeño de un evento con métricas, alertas y forecast opcional. | `eventId` obligatorio; opcionales `startDate`, `endDate`, `includeForecasting`, `includeAlerts`. |
| `qr_batch_status` | Consolida actividad de códigos QR por evento (escaneos, éxito, errores). | `eventId` obligatorio; opcionales `startDate`, `endDate`. |
| `orders_follow_up` | Lista pedidos que requieren seguimiento con acciones sugeridas. | Opcionales `eventId`, `status`, `overdueOnly`, `limit`, `includeContacts`. |
| `store_theme_preview` | Devuelve paleta y estilos del tema público seleccionado. | Opcionales `themeId`, `includeCssVars`, `includeComponents`. |

Cada handler devuelve contenido legible para el modelo y metadata (`_meta`) con la respuesta estructurada para interfaces personalizadas.

## Ejemplos rápidos

### Buscar fotos

```json
{
  "name": "buscar_fotos",
  "arguments": {
    "eventId": "uuid-del-evento",
    "page": 1,
    "limit": 20,
    "searchTerm": "apellido"
  }
}
```

### Crear paquete combo

```json
{
  "name": "crear_paquete",
  "arguments": {
    "name": "Combo Premium",
    "pricingType": "fixed",
    "basePrice": 850000,
    "minPhotos": 5,
    "allowsDuplicates": true,
    "items": [
      { "productId": "producto-10x15", "quantity": 4 },
      { "productId": "producto-imantado", "quantity": 2, "additionalPrice": 50000 }
    ]
  }
}
```

### Aprobar lote de fotos

```json
{
  "name": "aprobar_fotos",
  "arguments": {
    "photoIds": ["foto-1", "foto-2"],
    "approved": true,
    "notify": { "enabled": true, "message": "Nuevo lote aprobado" }
  }
}
```

### Clasificar fotos por heurística

```json
{
  "name": "clasificar_fotos",
  "arguments": {
    "photoIds": ["foto-1", "foto-2", "foto-3"]
  }
}
```

### Disparar workflow de cambio de estado

```json
{
  "name": "disparar_workflow_pedido",
  "arguments": {
    "eventType": "status_changed",
    "orderId": "pedido-123",
    "newStatus": "approved",
    "previousStatus": "pending"
  }
}
```

## Integración con OpenAI Apps SDK

1. **Publicar el servidor**: desplegar el endpoint (por ejemplo en Railway, Render o Cloud Run) asegurando HTTPS y tiempos de respuesta estables. Exponer `/mcp` y `/mcp/messages`.
2. **Registrar como conector en ChatGPT**:
   - Activar _Developer Mode_ en ChatGPT.
   - Crear un nuevo conector/Server MCP y apuntar la URL pública del endpoint SSE (`GET /mcp`).
3. **Declarar herramientas**: el servidor responde automáticamente a `tools/list` y `tools/call`, de modo que ChatGPT descubre todas las operaciones (búsqueda, aprobación y movimiento de fotos, gestión de carpetas, paquetes, pedidos y analytics) sin configuración adicional.
4. **Probar con MCP Inspector**:
   ```bash
   npx @modelcontextprotocol/inspector http://localhost:3030/mcp
   ```
   Permite verificar handshake, herramientas y respuestas antes de conectar con ChatGPT.

Consulta la documentación oficial para detalles de despliegue y capacidades del protocolo MCP:

- [OpenAI Apps SDK – Build an MCP server](https://platform.openai.com/docs/mcp/build)
- [OpenAI Apps SDK – Register tools & UI resources](https://platform.openai.com/docs/mcp/plan/tools)
- [Conectar un MCP server a ChatGPT](https://platform.openai.com/docs/mcp/deploy/connect-chatgpt)

## Notas operativas

- El servidor requiere credenciales Supabase con permisos de lectura y escritura. Usar cuentas de servicio limitadas cuando se despliegue en producción.
- Si se ejecuta fuera de Next.js, configurar `NODE_OPTIONS=--conditions=react-server` (manejado automáticamente en `npm run dev:mcp`) para evitar conflictos con módulos `server-only`.
- Los handlers propagan `AbortSignal` desde MCP, por lo que cancelar operaciones largas desde el cliente es seguro.

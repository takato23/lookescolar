# MCP + OpenAI Integration

Este documento explica cómo integrar las herramientas MCP (Model Context Protocol) de LookEscolar con OpenAI, ya sea usando:

1. **Apps SDK** (para desarrollo en ChatGPT) - Sin API key necesaria
2. **API de OpenAI** (para integraciones programáticas) - Requiere API key

## 🚀 **Opción 1: Apps SDK (Recomendado para desarrollo)**

El Apps SDK permite crear aplicaciones que se integran directamente en ChatGPT para uso personal durante desarrollo.

### Prerrequisitos

- ✅ **Servidor MCP corriendo** (ya está listo)
- ✅ **Cuenta de desarrollador OpenAI** con acceso al Apps SDK (preview limitado)
- ✅ **Túnel local** (si quieres acceso remoto, usa ngrok)

> **Nota**: El Apps SDK está actualmente en preview y requiere aprobación de OpenAI para acceso.

### Configuración del Apps SDK

1. **Ve a [OpenAI Apps SDK](https://developers.openai.com/apps-sdk)**

2. **Crea una nueva app** con tipo "MCP Server"

3. **Configura la conexión**:
   - **Transport Type**: SSE (Server-Sent Events)
   - **Server URL**: `http://localhost:3030/mcp`
   - **Connection Type**: Server

4. **Importante**: Asegúrate de que el servidor MCP esté corriendo antes de conectar

### Prueba en ChatGPT

Una vez configurada la app:
- Ve a ChatGPT
- Selecciona tu app desde el menú
- Las herramientas estarán disponibles automáticamente

### Herramientas disponibles en ChatGPT

- `agenda_workflow` - Revisa pedidos pendientes
- `simular_workflow_pedido` - Simula acciones de workflow
- `disparar_workflow_pedido` - Ejecuta workflows reales
- `consultar_pedidos` - Lista pedidos
- `estadisticas_ventas` - Métricas de ventas
- Y más herramientas del sistema

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  ChatGPT Apps   │────│   Apps SDK      │────│  MCP Server     │
│   (Web/Mobile)  │    │                 │    │  (localhost)    │
│ • ChatGPT UI    │    │ • MCP Protocol  │    │ • agenda_workflow│
│ • Developer Mode│    │ • SSE transport │    │ • simular_workflow │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              └────────────────────────┘
                                       Supabase
```

## 🚀 Inicio Rápido

### 1. Iniciar el servidor MCP

```bash
# Configurar variables de entorno
env $(cat .env.mcp | xargs) npm run dev:mcp
```

### 2. Verificar que funciona

```bash
curl http://localhost:3030/healthz
# Debería retornar: {"status":"ok","tools":21}
```

### 3. Instalar dependencias adicionales

```bash
npm install openai
```

### 4. Configurar OpenAI API Key

```bash
export OPENAI_API_KEY="your-openai-api-key-here"
```

### 5. Ejecutar el ejemplo

```bash
npm run tsx example-openai-mcp.ts
```

### 🔗 Opción: Usar con ngrok (para acceso remoto)

Si necesitas exponer el servidor MCP a internet:

```bash
# Instalar ngrok si no lo tienes
npm install -g ngrok

# Exponer el puerto 3030
npx ngrok http 3030

# Copiar la URL que ngrok te da (ej: https://abcd1234.ngrok.io)
# Luego usar esa URL en lugar de http://localhost:3030

# Para usar con el cliente OpenAI:
export MCP_URL="https://abcd1234.ngrok.io/mcp"
npm run tsx example-openai-mcp.ts
```

## 🛠️ Herramientas Disponibles

### `agenda_workflow`
Genera agenda priorizada de pedidos que requieren acción automática.

**Parámetros:**
- `eventId` (opcional): Filtrar por evento específico
- `limit` (opcional): Máximo de pedidos (default: 20)

### `simular_workflow_pedido`
Simula qué acciones se ejecutarían para un pedido sin dispararlas realmente.

**Parámetros:**
- `orderId`: ID del pedido (requerido)
- `eventType`: `'order_created'` o `'status_changed'`
- `newStatus`: Nuevo estado (requerido si eventType es status_changed)

### `disparar_workflow_pedido`
Ejecuta workflows reales para pedidos.

**Parámetros:**
- `orderId`: ID del pedido
- `eventType`: `'order_created'`, `'status_changed'`, `'overdue_sweep'`
- `newStatus`: Nuevo estado (para status_changed)
- `previousStatus`: Estado anterior (opcional)

## 💻 Uso Programático

```typescript
import { MCPClient } from './mcp-client-openai';

const client = new MCPClient(process.env.OPENAI_API_KEY!);

// Conectar
await client.connect();

// Conversación con herramientas
const response = await client.chatWithTools([
  {
    role: 'user',
    content: '¿Qué pedidos necesitan atención hoy?'
  }
]);

console.log(response);

// Llamado directo a herramienta
const agenda = await client.callTool('agenda_workflow', {});
console.log(agenda);

// Desconectar
await client.disconnect();
```

## 🔧 Configuración Avanzada

### Variables de Entorno

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# MCP Server (desde .env.mcp)
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
MCP_SERVER_PORT=3030

# Opcional: URL del servidor MCP (para ngrok u otras configuraciones)
MCP_URL=http://localhost:3030/mcp  # o https://tu-ngrok-url.ngrok.io/mcp
```

### Personalización del Cliente

```typescript
const client = new MCPClient(openaiApiKey, {
  // Opciones adicionales del cliente MCP
  name: 'mi-cliente-personalizado',
  version: '2.0.0'
});
```

## 📋 Casos de Uso

### 1. Asistente de Pedidos
- "Revisa qué pedidos necesitan atención"
- "Simula qué pasaría si apruebo este pedido"
- "Ejecuta el workflow de entrega para el pedido #123"

### 2. Automatización de Workflows
- Alertas automáticas cuando hay pedidos pendientes
- Recordatorios de seguimiento
- Notificaciones de cambios de estado

### 3. Análisis y Reportes
- Estadísticas de pedidos por estado
- Análisis de tiempos de respuesta
- Métricas de conversión

## 🔍 Troubleshooting

### Error: "Failed to calculate stats"
- **Causa**: Tabla `orders` vacía
- **Solución**: El sistema maneja esto automáticamente, retorna "No hay pedidos pendientes"

### Error: "Connection refused"
- **Causa**: Servidor MCP no está corriendo
- **Solución**: Ejecutar `npm run dev:mcp`

### Error: "OpenAI API Key missing"
- **Causa**: Variable de entorno no configurada
- **Solución**: `export OPENAI_API_KEY="sk-..."`

## 🚀 Próximos Pasos

1. **Agregar más herramientas**: Implementar herramientas para gestión de fotos, eventos, etc.
2. **Mejorar el cliente**: Soporte para streaming, mejor manejo de errores
3. **Integración completa**: Conectar con interfaces de usuario existentes
4. **Testing**: Agregar tests automatizados para las integraciones

## 🧪 Verificación

Antes de configurar el Apps SDK, verifica que todo esté funcionando:

```bash
# Verificar servidor MCP
curl http://localhost:3030/healthz

# Ejecutar test de compatibilidad
node test-apps-sdk.js
```

Si ambos pasan, tu servidor MCP está listo para el Apps SDK.

## 📚 Recursos

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenAI Apps SDK](https://developers.openai.com/apps-sdk)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Supabase Docs](https://supabase.com/docs)

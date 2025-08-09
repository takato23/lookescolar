# CLAUDE.md - Sistema de Fotografía Escolar

## ⚡ CONFIGURACIÓN IMPORTANTE
- **BASE DE DATOS**: Supabase Cloud (NO local, NO Docker necesario)
- **STORAGE**: Supabase Storage (bucket privado)
- **AUTENTICACIÓN**: Supabase Auth
- **Las credenciales están en .env.local apuntando a Supabase Cloud**
- **NO se necesita Docker ni base de datos local**

### 🔧 MODO DESARROLLO
- **APIs funcionan sin autenticación**: En desarrollo las APIs devuelven datos mock
- **Datos de ejemplo**: Eventos, fotos, órdenes, estadísticas mock
- **Una vez implementes autenticación, todo funcionará con datos reales**

## 🎯 Objetivo del Proyecto

Sistema web para gestión de fotografía escolar que permite a la fotógrafa (Melisa) subir fotos con watermark, organizarlas por alumno mediante QRs, y que las familias puedan ver y comprar solo sus fotos accediendo con un token único.

## 🔄 Flujo Principal con QR

1. **Evento**: Melisa crea sesión fotográfica (colegio + fecha)
2. **Sujetos**: Genera lista de alumnos/familias con tokens únicos
3. **QR PDF**: Descarga PDF con QRs para imprimir y entregar
4. **Fotos**: Sube fotos que se procesan con watermark automático
5. **Tagging**: Escanea QR del alumno → asigna fotos correspondientes
6. **Acceso Familia**: Familia ingresa a `/f/[token]` con su QR/token
7. **Compra**: Selecciona fotos → checkout → pago Mercado Pago
8. **Entrega**: Melisa ve pedidos aprobados → entrega fotos originales (offline)

## 👥 Roles del Sistema

### Admin (Melisa)
- Crear y gestionar eventos/sesiones
- Generar sujetos con tokens/QRs
- Subir y procesar fotos con watermark
- Asignar fotos a sujetos (tagging)
- Configurar precios por evento
- Ver y exportar pedidos
- Marcar pedidos como entregados

### Familia
- Acceder con token único (sin registro)
- Ver solo sus fotos asignadas
- Agregar fotos al carrito
- Completar datos de contacto
- Pagar con Mercado Pago
- Ver estado del pedido

## ⚠️ MUST - Requisitos Críticos

### Seguridad y Storage
- ✅ **Bucket PRIVADO**: Todas las fotos en bucket privado de Supabase
- ✅ **URLs Firmadas**: Generar URLs temporales (1h) para previews
- ✅ **Sin Originales**: NUNCA subir fotos originales al sistema
- ✅ **RLS Obligatorio**: Row Level Security ON en TODAS las tablas
- ✅ **Acceso vía API**: Cliente NUNCA consulta tablas directamente, solo vía API con service role

### Política de Tokens
- ✅ **Longitud Mínima**: ≥20 caracteres
- ✅ **Generación Segura**: crypto.randomBytes() o nanoid con alfabeto seguro
- ✅ **No Loggear**: NUNCA loggear tokens ni URLs firmadas (enmascarar: `tok_***`)
- ✅ **Expiración**: Configurable, 30 días por defecto
- ✅ **Rotación Manual**: Endpoint para rotar tokens comprometidos

### Rate Limiting
- ✅ **Por IP**: Límites en endpoints públicos
- ✅ **Por Token**: Límites adicionales por token
- ✅ **Endpoints Críticos**:
  - `/api/admin/photos/upload`: 10 req/min por IP
  - `/api/storage/signed-url`: 60 req/min por token
  - `/api/family/gallery/[token]`: 30 req/min por token
  - `/api/payments/webhook`: 100 req/min total

### Procesamiento de Fotos
- ✅ **Watermark Server-Side**: Procesar con sharp en el servidor
- ✅ **Dimensiones**: Max 1600px en lado largo
- ✅ **Formato**: WebP con calidad 72
- ✅ **Concurrencia**: Limitar a 3-5 procesados simultáneos
- ✅ **Storage Path**: Guardar solo path, no URL completa

### Testing
- ✅ **TDD Endpoints Críticos**:
  - `/api/admin/photos/upload` - Upload y procesamiento
  - `/api/family/gallery/[token]` - Acceso por token
  - `/api/payments/webhook` - Webhook MP idempotente
  - `/api/admin/tagging` - Asignación foto-sujeto
  - `/api/storage/signed-url` - Generación URLs firmadas

### Mercado Pago
- ✅ **Webhook Idempotente**: Verificar por mp_payment_id único
- ✅ **Verificación de Firma**: HMAC-SHA256 con MP_WEBHOOK_SECRET
- ✅ **Timeout Response**: <3s para evitar retry de MP
- ✅ **Estado Mapping**: Mapear estados MP a estados internos

## 🔒 Seguridad Adicional

### Content Security Policy (CSP)
```javascript
// middleware.ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.mercadopago.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.supabase.co;
  font-src 'self';
  connect-src 'self' https://*.supabase.co https://api.mercadopago.com;
`
```

### Anti-Hotlinking
- ✅ **Verificar Referer**: Solo permitir requests desde dominio propio
- ✅ **CORS Restrictivo**: Solo origins autorizados
- ✅ **Signed URLs**: Incluir timestamp y verificar expiración

## 📊 Observabilidad

### Logging Estructurado
```javascript
// Formato de log
{
  requestId: "req_abc123",  // UUID por request
  timestamp: "2024-01-15T10:30:00Z",
  level: "info",
  event: "photo_upload",
  eventId: "evt_123",
  userId: "usr_456",
  duration: 1234,  // ms
  // NUNCA loggear: tokens, passwords, URLs firmadas completas
  token: "tok_***",  // Enmascarado
  signedUrl: "https://.../*masked*"  // Enmascarado
}
```

### Métricas de Egress
- ✅ **Por Evento**: Calcular MB servidos por evento
- ✅ **Por Día**: Total diario de transferencia
- ✅ **Alertas**: Si egress >80% del límite mensual
```sql
-- Tabla para tracking
CREATE TABLE egress_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  date DATE NOT NULL,
  bytes_served BIGINT DEFAULT 0,
  requests_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 💡 SHOULD - Mejores Prácticas

### Código
- 📝 **Funciones Pequeñas**: Max 20-30 líneas, single responsibility
- 🧪 **Tests de Integración > Mocks**: Preferir tests reales con DB de test
- 🔍 **Validación Temprana**: Fail fast en todas las rutas
- 📦 **Tipos Estrictos**: TypeScript sin `any`, tipos generados de DB
- 🎯 **Composición**: Preferir composición sobre herencia

### Base de Datos
- 🔐 **RLS Policies**: Activar Row Level Security en TODAS las tablas
- 📊 **Índices**: Crear índices para queries frecuentes
- ✅ **Constraints**: CHECK constraints para validación de datos
- 🔄 **Transacciones**: Usar transacciones para operaciones múltiples
- 🚫 **No Direct Access**: Cliente nunca usa supabase.from(), solo APIs

### Performance
- ⚡ **Lazy Loading**: Cargar fotos on-demand en galería
- 🎨 **Virtual Scroll**: Para galerías con >50 fotos
- 💾 **Cache**: URLs firmadas en sessionStorage (1h)
- 📦 **Batch Operations**: Procesar uploads en lotes

## 📦 Comandos NPM

```bash
# Desarrollo
npm run dev              # Next.js en modo desarrollo
npm run dev:db          # Supabase local (Docker requerido)

# Calidad de Código  
npm run lint            # ESLint
npm run typecheck       # TypeScript compiler check
npm run test            # Vitest tests
npm run test:watch      # Tests en modo watch

# Base de Datos
npm run db:migrate      # Aplicar migraciones pendientes
npm run db:reset        # Reset DB local (peligroso!)
npm run db:seed         # Cargar datos de prueba
npm run db:types        # Generar tipos TypeScript de DB

# Utilidades
npm run qr:class        # Generar PDF QRs para una clase
npm run storage:cleanup # Limpiar previews >90 días
npm run export:orders   # Exportar pedidos a CSV
npm run rotate:tokens   # Rotar tokens próximos a expirar

# Build & Deploy
npm run build          # Build producción
npm run start          # Servidor producción

# Monitoring
npm run metrics:egress  # Reporte de transferencia por evento
npm run logs:tail      # Ver logs en tiempo real
```

## ✅ Checklist Antes de Merge

### Seguridad Crítica
- [ ] ¿RLS está ON en todas las tablas nuevas?
- [ ] ¿Los tokens tienen ≥20 caracteres con crypto seguro?
- [ ] ¿Se enmascaran tokens y URLs en logs?
- [ ] ¿Rate limiting configurado en endpoints críticos?
- [ ] ¿CSP headers configurados en middleware?
- [ ] ¿Anti-hotlinking verificando referer?
- [ ] ¿Cliente usa solo APIs, nunca acceso directo a DB?

### Seguridad General
- [ ] ¿Las fotos están en bucket privado?
- [ ] ¿Se generan URLs firmadas con expiración?
- [ ] ¿Se valida el acceso por token antes de mostrar fotos?
- [ ] ¿El webhook de MP verifica la firma HMAC?
- [ ] ¿El webhook es idempotente por mp_payment_id?

### Calidad
- [ ] ¿Los tests pasan? (`npm run test`)
- [ ] ¿No hay errores de TypeScript? (`npm run typecheck`)
- [ ] ¿El linter está limpio? (`npm run lint`)
- [ ] ¿Las funciones tienen <30 líneas?
- [ ] ¿Hay tests para los endpoints nuevos?

### Performance
- [ ] ¿El watermark limita concurrencia a 3-5?
- [ ] ¿Las fotos se procesan a 1600px max?
- [ ] ¿Se usa WebP con calidad 72?
- [ ] ¿Las queries tienen índices apropiados?
- [ ] ¿Se implementó paginación/virtual scroll donde corresponde?

### Base de Datos
- [ ] ¿Las migraciones están versionadas?
- [ ] ¿Se agregaron constraints CHECK donde corresponde?
- [ ] ¿Los índices están creados para queries frecuentes?
- [ ] ¿RLS policies definidas y testeadas?

### Observabilidad
- [ ] ¿Logs incluyen requestId único?
- [ ] ¿Se trackea egress por evento?
- [ ] ¿Métricas de rate limit visibles?
- [ ] ¿No se loggean datos sensibles?

### Documentación
- [ ] ¿El código tiene comentarios en partes complejas?
- [ ] ¿Los tipos TypeScript están documentados?
- [ ] ¿Las variables de entorno están en .env.example?
- [ ] ¿El README está actualizado?

## 🚀 Flujos de Desarrollo

### Para agregar nueva funcionalidad:
1. Crear branch desde `main`
2. Escribir tests primero (TDD)
3. Implementar funcionalidad
4. Verificar checklist
5. PR con descripción clara
6. Code review
7. Merge a `main`

### Para hotfix en producción:
1. Branch desde `main` con prefijo `hotfix/`
2. Fix mínimo necesario
3. Tests del fix
4. Deploy directo tras aprobación

## 📊 Métricas de Calidad

- Coverage mínimo: 70% en endpoints críticos
- Tiempo de respuesta: <200ms para APIs
- Procesamiento foto: <3s por imagen
- Build time: <2 minutos
- Bundle size: <500KB inicial
- Rate limit violations: <1% requests
- Egress mensual: <100GB (monitorear)

## 🔍 Debugging Tips

```bash
# Ver logs de Supabase local
npm run dev:db:logs

# Inspeccionar bucket storage
npm run storage:inspect

# Ver estado de queue de procesamiento
npm run queue:status

# Generar reporte de performance
npm run perf:report

# Ver métricas de rate limiting
npm run metrics:ratelimit

# Analizar egress por evento
npm run metrics:egress --event-id=xxx
```

## 🚨 Puntos Críticos a Monitorear

1. **Límite Storage**: 5GB por evento (soft limit)
2. **Retención**: Previews se borran a los 90 días
3. **Concurrencia Upload**: Max 5 simultáneos
4. **Pedidos Pendientes**: Solo 1 por sujeto activo
5. **Timeout Webhook**: Responder <3s a Mercado Pago
6. **Rate Limits**: Monitorear 429s por endpoint
7. **Egress Mensual**: Alertar si >80% del límite
8. **Token Expiración**: Alertar tokens próximos a expirar

## 📚 Stack Técnico

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL (con RLS)
- **Storage**: Supabase Storage (bucket privado)
- **Auth**: Supabase Auth (admin) + Token-based (familias)
- **Pagos**: Mercado Pago SDK (sandbox en desarrollo)
- **Testing**: Vitest + Testing Library
- **Procesamiento**: Sharp (watermarks) + p-limit (queue)
- **Rate Limiting**: express-rate-limit o upstash
- **Logging**: Pino o Winston con requestId

## 🗂️ Estructura de Carpetas

```
/app                    # Next.js 14 app directory
  /(admin)             # Rutas protegidas para admin
  /f/[token]           # Portal familia con token
  /api                 # API routes
    /admin             # Endpoints protegidos
    /family            # Endpoints públicos con token
    /payments          # Webhooks y preferencias MP
    /storage           # URLs firmadas

/components            # Componentes React
  /admin              # Componentes del panel admin
  /family             # Componentes portal familia

/lib                  # Lógica de negocio
  /supabase           # Cliente y migraciones
  /services           # Watermark, QR, PDF, Storage
  /mercadopago        # Integración MP
  /utils              # Helpers y utilidades
  /security           # Rate limit, CSP, validación

/types                # TypeScript types
/__tests__           # Tests
```

## 🔐 Variables de Entorno Requeridas

Ver `.env.example` para la lista completa. Las críticas son:
- `SUPABASE_SERVICE_ROLE_KEY` - Para operaciones admin
- `MP_WEBHOOK_SECRET` - Para validar webhooks
- `SESSION_SECRET` - Para sesiones seguras
- `STORAGE_BUCKET` - Nombre del bucket privado
- `TOKEN_EXPIRY_DAYS` - Expiración de tokens (default: 30)
- `RATE_LIMIT_WINDOW_MS` - Ventana de rate limit
- `RATE_LIMIT_MAX_REQUESTS` - Máximo de requests

--------------------



  When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
  context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

  ## File and Directory Inclusion Syntax

  Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
   gemini command:

  ### Examples:

  **Single file analysis:**
  ```bash
  gemini -p "@src/main.py Explain this file's purpose and structure"

  Multiple files:
  gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"

  Entire directory:
  gemini -p "@src/ Summarize the architecture of this codebase"

  Multiple directories:
  gemini -p "@src/ @tests/ Analyze test coverage for the source code"

  Current directory and subdirectories:
  gemini -p "@./ Give me an overview of this entire project"
  
#
 Or use --all_files flag:
  gemini --all_files -p "Analyze the project structure and dependencies"

  Implementation Verification Examples

  Check if a feature is implemented:
  gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"

  Verify authentication implementation:
  gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"

  Check for specific patterns:
  gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"

  Verify error handling:
  gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"

  Check for rate limiting:
  gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"

  Verify caching strategy:
  gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"

  Check for specific security measures:
  gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"

  Verify test coverage for features:
  gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"

  When to Use Gemini CLI

  Use gemini -p when:
  - Analyzing entire codebases or large directories
  - Comparing multiple large files
  - Need to understand project-wide patterns or architecture
  - Current context window is insufficient for the task
  - Working with files totaling more than 100KB
  - Verifying if specific features, patterns, or security measures are implemented
  - Checking for the presence of certain coding patterns across the entire codebase

  Important Notes

  - Paths in @ syntax are relative to your current working directory when invoking gemini
  - The CLI will include file contents directly in the context
  - No need for --yolo flag for read-only analysis
  - Gemini's context window can handle entire codebases that would overflow Claude's context
  - When checking implementations, be specific about what you're looking for to get accurate results # Using Gemini CLI for Large Codebase Analysis


  When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
  context window. Use `gemini -p` to leverage Google Gemini's large context capacity.


  ## File and Directory Inclusion Syntax


  Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
   gemini command:


  ### Examples:


  **Single file analysis:**
  ```bash
  gemini -p "@src/main.py Explain this file's purpose and structure"


  Multiple files:
  gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"


  Entire directory:
  gemini -p "@src/ Summarize the architecture of this codebase"


  Multiple directories:
  gemini -p "@src/ @tests/ Analyze test coverage for the source code"


  Current directory and subdirectories:
  gemini -p "@./ Give me an overview of this entire project"
  # Or use --all_files flag:
  gemini --all_files -p "Analyze the project structure and dependencies"


  Implementation Verification Examples


  Check if a feature is implemented:
  gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"


  Verify authentication implementation:
  gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"


  Check for specific patterns:
  gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"


  Verify error handling:
  gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"


  Check for rate limiting:
  gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"


  Verify caching strategy:
  gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"


  Check for specific security measures:
  gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"


  Verify test coverage for features:
  gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"


  When to Use Gemini CLI


  Use gemini -p when:
  - Analyzing entire codebases or large directories
  - Comparing multiple large files
  - Need to understand project-wide patterns or architecture
  - Current context window is insufficient for the task
  - Working with files totaling more than 100KB
  - Verifying if specific features, patterns, or security measures are implemented
  - Checking for the presence of certain coding patterns across the entire codebase


  Important Notes


  - Paths in @ syntax are relative to your current working directory when invoking gemini
  - The CLI will include file contents directly in the context
  - No need for --yolo flag for read-only analysis
  - Gemini's context window can handle entire codebases that would overflow Claude's context
  - When checking implementations, be specific about what you're looking for to get accurate results
# Base de Datos - Sistema de Fotografía Escolar

## 📊 Esquema de Base de Datos

### Arquitectura de Seguridad

- **RLS (Row Level Security)**: Habilitado en TODAS las tablas
- **Acceso**: Solo través de service role desde API routes
- **Tokens**: Mínimo 20 caracteres, generación criptográficamente segura
- **Expiración**: 30 días por defecto, configurable

### Tablas Principales

#### `events` - Eventos/Sesiones Fotográficas
```sql
- id: UUID (PK)
- name: TEXT (nombre del evento)
- school: TEXT (nombre del colegio)
- date: DATE (fecha del evento)
- active: BOOLEAN (evento activo)
- created_at, updated_at: TIMESTAMPTZ
```

#### `subjects` - Alumnos/Familias
```sql
- id: UUID (PK)
- event_id: UUID (FK -> events)
- type: subject_type ENUM (student/couple/family)
- first_name: TEXT
- last_name: TEXT (nullable)
- couple_first_name: TEXT (nullable)
- couple_last_name: TEXT (nullable) 
- family_name: TEXT (nullable)
```

#### `subject_tokens` - Tokens de Acceso
```sql
- id: UUID (PK)
- subject_id: UUID (FK -> subjects)
- token: TEXT UNIQUE (min 20 chars)
- expires_at: TIMESTAMPTZ (30 días por defecto)
```

#### `photos` - Fotos con Watermark
```sql
- id: UUID (PK)
- event_id: UUID (FK -> events)
- storage_path: TEXT (path en bucket privado)
- width, height: INTEGER (dimensiones)
- approved: BOOLEAN (visible para familias)
```

#### `photo_subjects` - Relación Foto-Alumno
```sql
- id: UUID (PK)
- photo_id: UUID (FK -> photos)
- subject_id: UUID (FK -> subjects)
- UNIQUE(photo_id, subject_id)
```

#### `orders` - Pedidos
```sql
- id: UUID (PK)
- subject_id: UUID (FK -> subjects)
- contact_name, contact_email, contact_phone: TEXT
- status: order_status ENUM (pending/approved/delivered/failed)
- mp_preference_id, mp_payment_id, mp_status: TEXT (Mercado Pago)
- delivered_at: TIMESTAMPTZ (nullable)
```

#### `payments` - Pagos de Mercado Pago
```sql
- id: UUID (PK)
- order_id: UUID (FK -> orders)
- mp_payment_id: TEXT UNIQUE (para idempotencia de webhook)
- mp_status: TEXT (estado de MP)
- amount_cents: INTEGER
- webhook_data: JSONB (datos completos del webhook)
```

#### `price_lists` & `price_list_items` - Precios por Evento
```sql
price_lists:
- id: UUID (PK)
- event_id: UUID UNIQUE (FK -> events)

price_list_items:
- id: UUID (PK) 
- price_list_id: UUID (FK -> price_lists)
- label: TEXT (ej: "Foto digital")
- price_cents: INTEGER
- sort_order: INTEGER
```

### Tablas de Soporte

#### `egress_metrics` - Control de Transferencia
```sql
- event_id: UUID (FK -> events)
- date: DATE
- bytes_served: BIGINT
- requests_count: INTEGER
- UNIQUE(event_id, date)
```

#### `audit_logs` - Auditoría (Opcional)
```sql
- table_name, operation: TEXT
- record_id: UUID
- old_values, new_values: JSONB
- user_id, ip_address: TEXT
```

## 🔐 Políticas de Seguridad (RLS)

### Estándar de Seguridad
- **Única política por tabla**: Service role access only
- **Sin acceso directo**: Cliente nunca consulta tablas directamente
- **Validación en API**: Toda lógica de negocio en API routes

### Ejemplo de Política
```sql
CREATE POLICY "Service role only access events"
  ON events
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

## ⚡ Funciones de Base de Datos

### Funciones de Seguridad

#### `validate_token_access(token TEXT) → UUID`
- Valida token y devuelve subject_id
- Verifica expiración y evento activo
- Usado por APIs de familia

#### `get_subject_by_token(token TEXT) → TABLE`
- Valida token y devuelve info completa del sujeto
- Incluye datos de evento y tipo de sujeto

#### `get_photos_by_token(token TEXT) → TABLE`
- Devuelve fotos aprobadas para un token válido
- Join con photo_subjects para fotos asignadas

### Funciones de Utilidad

#### `generate_secure_token(length INT) → TEXT`
- Genera tokens criptográficamente seguros
- Alfabeto sin caracteres ambiguos
- Mínimo 20 caracteres

#### `create_order_with_validation(...) → UUID`
- Crea pedido con validación completa
- Verifica que no haya pedidos pendientes duplicados
- Crea order_items en una transacción

#### `update_order_payment(...) → VOID`
- Actualiza estado de pedido desde webhook MP
- Crea/actualiza registro de pago
- Manejo idempotente por mp_payment_id

### Funciones de Dashboard

#### `get_event_dashboard(event_id UUID) → TABLE`
- Estadísticas completas de un evento
- Fotos, pedidos, ingresos, métricas de conversión

#### `get_storage_stats() → TABLE`
- Estadísticas de almacenamiento por evento
- Egress, requests, actividad reciente

## 📈 Optimizaciones de Performance

### Índices Principales
```sql
-- Acceso por token (crítico)
idx_subject_tokens_token_expires ON subject_tokens(token, expires_at)

-- Consultas de fotos por evento/sujeto
idx_photos_event_subject ON photos(event_id, subject_id) WHERE approved = true

-- Dashboard queries
idx_orders_subject_status_created ON orders(subject_id, status, created_at)

-- Búsqueda de pagos por MP ID
idx_payments_mp_payment_id ON payments(mp_payment_id)
```

### Vista Materializada
```sql
-- Dashboard stats pre-computados
dashboard_stats
- Estadísticas por evento
- Refresh manual con refresh_dashboard_stats()
```

### Notificaciones en Tiempo Real
```sql
-- Triggers para notificaciones
notify_photo_upload() → pg_notify('photo_uploaded', ...)
notify_order_status_change() → pg_notify('order_status_changed', ...)
```

## 🛠️ Constraints y Validaciones

### Constraints de Negocio
```sql
-- Solo un pedido pendiente por sujeto
unique_pending_order_per_subject EXCLUDE (subject_id WITH =) WHERE (status = 'pending')

-- Token mínimo 20 caracteres
CHECK (length(token) >= 20)

-- Precios positivos
CHECK (price_cents > 0)
CHECK (amount_cents > 0)
```

### Triggers de Validación
```sql
-- Validar pedidos duplicados
check_single_pending_order() → enforce_single_pending_order TRIGGER

-- Actualizar timestamps
update_updated_at() → events_updated_at TRIGGER
```

## 📋 Comandos de Base de Datos

### Desarrollo
```bash
npm run db:migrate     # Aplicar migraciones
npm run db:reset       # Reset completo (¡PELIGROSO!)
npm run db:types:update # Actualizar tipos TS
npm run db:status      # Estado de Supabase
```

### Mantenimiento
```bash
# Limpiar tokens expirados
SELECT cleanup_expired_tokens();

# Verificar salud del sistema  
SELECT * FROM system_health_check();

# Refrescar estadísticas
SELECT refresh_dashboard_stats();
```

## 🚨 Monitoreo y Alertas

### Métricas Críticas
- **Tokens expirados**: Alertar >10% próximos a expirar
- **Egress mensual**: Alertar >80% del límite
- **Pedidos pendientes**: Alertar >24h sin procesar
- **RLS violations**: Alertar cualquier acceso directo

### Health Checks
```sql
-- Verificar integridad
SELECT * FROM system_health_check();

-- Auditar políticas RLS
SELECT * FROM audit_rls_policies();

-- Stats de storage
SELECT * FROM get_storage_stats();
```

## 🔄 Proceso de Migración

### Orden de Migraciones
1. `000_cleanup_database.sql` - Limpieza inicial
2. `001_initial_schema.sql` - Esquema base 
3. `002_indexes.sql` - Índices de performance
4. `003_rls_policies.sql` - Políticas RLS (obsoleta)
5. `004_missing_tables_and_fixes.sql` - Tablas faltantes
6. `005_unified_rls_security.sql` - RLS unificado
7. `006_additional_functions.sql` - Funciones de utilidad
8. `007_final_cleanup_and_optimization.sql` - Optimizaciones finales

### Rollback Strategy
- Cada migración es reversible
- Backup antes de cambios críticos
- Test en ambiente local primero

## 🎯 Mejores Prácticas

### Seguridad
✅ RLS habilitado en todas las tablas
✅ Solo service role access
✅ Tokens seguros ≥20 caracteres  
✅ Validación en funciones SECURITY DEFINER
✅ No logging de tokens/URLs firmadas

### Performance  
✅ Índices en queries frecuentes
✅ Vista materializada para dashboard
✅ Constraints CHECK para validación temprana
✅ Cleanup automático de datos antiguos

### Mantenibilidad
✅ Funciones bien documentadas
✅ Tipos TypeScript auto-generados
✅ Audit trail opcional
✅ Health checks automáticos
✅ Migraciones versionadas
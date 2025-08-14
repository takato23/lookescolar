# 🔧 Solución de Errores de Base de Datos - LookEscolar

## 🚨 Errores Reportados

1. ❌ **ERROR: column "tagged_at" does not exist**
2. ❌ **ERROR: column "active" does not exist**

## ✅ SOLUCIÓN COMPLETA

### Ejecutar UNA SOLA Migración

```sql
-- COPIAR Y PEGAR EN SUPABASE DASHBOARD SQL EDITOR
-- Archivo: supabase/migrations/015_fix_missing_columns_before_indexes.sql
```

### ¿Qué hace esta migración?

1. **Agrega columnas faltantes a `events`:**
   - `active` (BOOLEAN DEFAULT true)
   - `created_by` (UUID)
   - `updated_at` (TIMESTAMPTZ)

2. **Agrega columnas faltantes a `photos`:**
   - `approved` (BOOLEAN DEFAULT false)
   - `preview_path` (TEXT)
   - `metadata` (JSONB)
   - `uploaded_by` (UUID)
   - `updated_at` (TIMESTAMPTZ)

3. **Agrega columnas faltantes a `photo_subjects`:**
   - `tagged_at` (TIMESTAMPTZ DEFAULT NOW())
   - `tagged_by` (UUID)
   - `created_at` (TIMESTAMPTZ)

4. **Agrega columnas faltantes a `subjects`:**
   - `email` (TEXT)
   - `phone` (TEXT)
   - `grade` (TEXT)
   - `section` (TEXT)
   - `updated_at` (TIMESTAMPTZ)

5. **Crea índices de forma segura:**
   - Verifica que las columnas existen antes de crear índices
   - Crea `idx_events_active_date` solo si `active` existe
   - Crea `idx_photos_event_approved` solo si `approved` existe
   - Crea `idx_photo_subjects_tagged_at` solo si `tagged_at` existe

## 📋 Pasos de Implementación

### 1. Abrir Supabase Dashboard
- Ir a [dashboard.supabase.com](https://dashboard.supabase.com)
- Seleccionar tu proyecto
- Click en "SQL Editor"

### 2. Ejecutar la Migración
- Click en "New Query"
- Copiar TODO el contenido del archivo `015_fix_missing_columns_before_indexes.sql`
- Pegar en el editor
- Click en "Run" (o Cmd/Ctrl + Enter)

### 3. Verificar Resultado
Deberías ver mensajes como:
```
NOTICE: Added active column to events table
NOTICE: Added tagged_at column to photo_subjects table
NOTICE: Created index idx_events_active_date
```

### 4. Verificar Columnas
Ejecutar esta query para confirmar:
```sql
-- Verificar columna 'active' en events
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name = 'active';

-- Verificar columna 'tagged_at' en photo_subjects
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'photo_subjects' 
AND column_name = 'tagged_at';
```

## ✅ Características de la Solución

- **Segura**: Usa `IF NOT EXISTS` para evitar errores
- **Idempotente**: Se puede ejecutar múltiples veces sin problemas
- **Completa**: Agrega TODAS las columnas faltantes
- **Verificada**: Incluye verificación antes de crear índices
- **Informativa**: Muestra mensajes de lo que se va agregando

## 🚀 Después de la Migración

1. **Limpiar cache de Next.js:**
   ```bash
   rm -rf .next
   ```

2. **Reiniciar la aplicación:**
   ```bash
   npm run dev
   ```

3. **Verificar en http://localhost:3000**

## 🎯 Resultado Esperado

Después de ejecutar la migración:
- ✅ No más error "column 'tagged_at' does not exist"
- ✅ No más error "column 'active' does not exist"
- ✅ Todos los índices creados correctamente
- ✅ Aplicación funcionando sin errores de base de datos

## 🆘 Si Aún Hay Problemas

1. **Verificar qué tablas existen:**
   ```sql
   SELECT tablename 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

2. **Ver estructura de una tabla específica:**
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'events'
   ORDER BY ordinal_position;
   ```

3. **Si las tablas no existen**, ejecutar primero:
   ```sql
   -- Archivo: supabase/migrations/014_create_missing_tables.sql
   ```

---

**Última actualización**: ${new Date().toISOString()}
**Estado**: ✅ Solución completa y probada
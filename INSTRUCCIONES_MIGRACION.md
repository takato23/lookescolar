# 📋 Instrucciones de Migración - LookEscolar

## 🚨 IMPORTANTE: Ejecutar Migraciones en Orden

Debido a los errores de columnas faltantes (`tagged_at`, `active`, etc.), necesitas ejecutar las migraciones en el siguiente orden:

## 📝 Pasos de Migración

### 🎯 SOLUCIÓN RÁPIDA (Recomendada)

Si tienes errores de columnas faltantes, ejecuta SOLO este archivo:

```sql
-- EJECUTAR ESTE ARCHIVO PRIMERO
-- Archivo: supabase/migrations/015_fix_missing_columns_before_indexes.sql
```

Este archivo:
- ✅ Agrega TODAS las columnas faltantes a las tablas existentes
- ✅ Agrega `active` a `events`
- ✅ Agrega `tagged_at`, `tagged_by`, `created_at` a `photo_subjects`
- ✅ Agrega `approved`, `preview_path`, `metadata` a `photos`
- ✅ Crea índices DESPUÉS de verificar que las columnas existen
- ✅ Es seguro ejecutar múltiples veces

### Paso Alternativo 1: Crear Tablas Base (Si NO tienes ninguna tabla)
```sql
-- Ejecutar SOLO si no tienes ninguna tabla creada
-- Archivo: supabase/migrations/014_create_missing_tables.sql
```

Este archivo:
- ✅ Crea TODAS las tablas necesarias si no existen
- ✅ Agrega todas las columnas requeridas
- ✅ Crea índices para optimización
- ✅ Habilita RLS en todas las tablas
- ✅ Crea políticas de seguridad

### Paso Alternativo 2: Agregar Columnas Específicas
```sql
-- Ejecutar si necesitas agregar columnas específicas
-- Archivo: supabase/migrations/013_add_missing_columns.sql
```

Este archivo:
- ✅ Agrega columna `tagged_at` a `photo_subjects`
- ✅ Agrega columna `tagged_by` a `photo_subjects`
- ✅ Agrega columna `created_at` a `photo_subjects`
- ✅ Verifica y agrega otras columnas faltantes

## 🔧 Cómo Ejecutar las Migraciones

### Opción A: Desde Supabase Dashboard (Recomendado)

1. **Acceder al Dashboard**:
   - Ir a [dashboard.supabase.com](https://dashboard.supabase.com)
   - Seleccionar tu proyecto

2. **Ir al SQL Editor**:
   - Click en "SQL Editor" en el menú lateral
   - Click en "New Query"

3. **Ejecutar Migraciones**:
   - Copiar el contenido del archivo `014_create_missing_tables.sql`
   - Pegar en el editor
   - Click en "Run" o presionar `Cmd/Ctrl + Enter`
   - Verificar que aparezca "Success" sin errores

4. **Verificar Estructura**:
   ```sql
   -- Ejecutar esta query para verificar
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'photo_subjects'
   ORDER BY ordinal_position;
   ```

   Deberías ver:
   - id
   - photo_id
   - subject_id
   - tagged_at ✅
   - tagged_by
   - created_at

### Opción B: Usando Supabase CLI

```bash
# Si tienes Supabase CLI configurado
supabase db push --db-url "postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
```

## ✅ Verificación Post-Migración

Ejecuta estas queries para verificar que todo esté correcto:

### 1. Verificar Tablas
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### 2. Verificar Columna tagged_at
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'photo_subjects' 
AND column_name = 'tagged_at';
```

### 3. Verificar RLS
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'photo_subjects';
```

## 🐛 Solución de Problemas

### Error: "relation already exists"
- **Causa**: La tabla ya existe
- **Solución**: Usar migración `013_add_missing_columns.sql` en lugar de `014_create_missing_tables.sql`

### Error: "column already exists"
- **Causa**: La columna ya fue agregada
- **Solución**: Ignorar el error, continuar con siguiente migración

### Error: "permission denied"
- **Causa**: No tienes permisos suficientes
- **Solución**: Usar el rol `postgres` o contactar al administrador

## 🚀 Después de las Migraciones

1. **Limpiar cache de Next.js**:
   ```bash
   rm -rf .next
   ```

2. **Iniciar aplicación en desarrollo**:
   ```bash
   npm run dev
   ```

3. **Verificar funcionamiento**:
   - Abrir http://localhost:3000
   - Verificar que no hay errores en consola
   - Probar funcionalidad de tagging de fotos

## 📊 Estado Esperado

Después de ejecutar todas las migraciones, deberías tener:

- ✅ 11 tablas creadas
- ✅ Columna `tagged_at` en `photo_subjects`
- ✅ RLS habilitado en todas las tablas
- ✅ Políticas de seguridad configuradas
- ✅ Índices optimizados
- ✅ Funciones helper creadas

## 🆘 Ayuda

Si encuentras problemas:

1. Revisa los logs en Supabase Dashboard → Logs → Database
2. Verifica que estás usando las credenciales correctas
3. Asegúrate de ejecutar las migraciones en orden
4. Si persiste el error, ejecuta:
   ```sql
   -- Debug: Ver estructura actual
   \d photo_subjects
   ```

---

**Última actualización**: ${new Date().toISOString()}
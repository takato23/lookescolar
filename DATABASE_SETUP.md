# 🗄️ Configuración de Base de Datos - LookEscolar

## 📋 Requisitos Previos

1. **Cuenta en Supabase**: https://supabase.com
2. **Proyecto creado** en Supabase
3. **Credenciales configuradas** en `.env.local`

## 🚀 Configuración Rápida

### Opción 1: SQL Editor en Supabase Dashboard (RECOMENDADO)

1. **Accede a tu proyecto** en [Supabase Dashboard](https://supabase.com/dashboard)

2. **Ve al SQL Editor** (ícono de SQL en el menú lateral)

3. **Copia todo el contenido** del archivo:
   ```
   supabase/migrations/001_create_all_tables.sql
   ```

4. **Pega el SQL** en el editor

5. **Ejecuta** haciendo clic en "RUN" o presionando Cmd+Enter (Mac) / Ctrl+Enter (Windows)

6. **Verifica** que aparezca el mensaje de éxito

### Opción 2: Usando psql (Terminal)

Si prefieres usar la terminal:

```bash
# Necesitas la contraseña del proyecto (en Dashboard -> Settings -> Database)
psql "postgresql://postgres.[PROJECT_ID]@db.[PROJECT_ID].supabase.co:5432/postgres" \
  -f supabase/migrations/001_create_all_tables.sql
```

### Opción 3: Script Automatizado

```bash
# Instalar dependencias si no lo has hecho
npm install

# Ejecutar el script de setup
npm run db:setup
```

## 📊 Tablas Creadas

El script crea las siguientes tablas:

| Tabla | Descripción | Columnas Principales |
|-------|-------------|---------------------|
| `admin_users` | Usuarios administradores | email, name, role |
| `events` | Sesiones fotográficas | name, location, date, status, price_per_photo |
| `subjects` | Alumnos/familias | name, email, access_token (≥20 chars), token_expires_at |
| `photos` | Fotos con watermark | storage_path, watermark_path, processing_status |
| `orders` | Pedidos de compra | order_number, status, total_amount, mp_payment_id |
| `order_items` | Items del pedido | order_id, photo_id, quantity, unit_price |
| `egress_metrics` | Métricas de transferencia | bytes_served, requests_count |

## 🔒 Seguridad Configurada

✅ **RLS (Row Level Security)** habilitado en todas las tablas
✅ **Service Role** tiene acceso completo vía API
✅ **Constraints** de validación en todos los campos críticos
✅ **Índices** para optimizar queries frecuentes
✅ **Triggers** para actualizar `updated_at` automáticamente

## 🧪 Verificación

### 1. Verificar Tablas en Dashboard

Ve a **Table Editor** en Supabase Dashboard y verifica que aparezcan todas las tablas.

### 2. Test de Conexión

```bash
# Verificar que la API puede conectarse
curl -X GET \
  'https://[PROJECT_ID].supabase.co/rest/v1/events' \
  -H 'apikey: [YOUR_SERVICE_ROLE_KEY]' \
  -H 'Authorization: Bearer [YOUR_SERVICE_ROLE_KEY]'
```

### 3. Crear Storage Bucket

1. Ve a **Storage** en Supabase Dashboard
2. Crea un nuevo bucket llamado `photos-bucket`
3. Configúralo como **PRIVADO**
4. Configura las políticas RLS:

```sql
-- Política para service role
CREATE POLICY "Service role full access" ON storage.objects
FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Política para archivos públicos de preview (opcional)
CREATE POLICY "Public previews" ON storage.objects
FOR SELECT USING (bucket_id = 'photos-bucket' AND name LIKE '%watermark%');
```

## 📝 Datos de Prueba

El script incluye un usuario admin de prueba:
- Email: `admin@lookescolar.com`
- Nombre: `Admin`
- Role: `super_admin`

**⚠️ IMPORTANTE**: Cambia estas credenciales en producción.

## 🔄 Re-ejecutar Migración

Si necesitas volver a ejecutar la migración:

```sql
-- ⚠️ CUIDADO: Esto ELIMINARÁ todos los datos
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS egress_metrics CASCADE;

-- Luego ejecuta el archivo 001_create_all_tables.sql nuevamente
```

## 🐛 Solución de Problemas

### Error: "relation already exists"
Las tablas ya existen. Puedes ignorar este error o eliminar las tablas primero.

### Error: "permission denied"
Asegúrate de usar el `SERVICE_ROLE_KEY` y no el `ANON_KEY`.

### Error: "connection refused"
Verifica que tu IP esté permitida en las configuraciones de red del proyecto.

### Error: "password authentication failed"
La contraseña del usuario postgres está en Dashboard -> Settings -> Database.

## 📚 Próximos Pasos

1. ✅ Base de datos configurada
2. 🔲 Configurar Storage bucket
3. 🔲 Configurar autenticación admin
4. 🔲 Probar endpoints con `npm run dev`
5. 🔲 Configurar Mercado Pago
6. 🔲 Deploy a producción

## 🆘 Ayuda

Si tienes problemas:
1. Revisa los logs en Dashboard -> Logs -> Database
2. Verifica las credenciales en `.env.local`
3. Asegúrate de que RLS esté habilitado
4. Contacta soporte de Supabase si persisten los problemas
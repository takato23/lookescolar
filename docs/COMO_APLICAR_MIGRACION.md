# 📋 Cómo Aplicar la Migración de Payment Settings

Dado que no podemos ejecutar `supabase db push` directamente, aquí están las opciones para aplicar la migración:

## Opción 1: Usando el SQL Editor de Supabase (Recomendado)

1. **Abre el Dashboard de Supabase**:
   - Ve a: [https://supabase.com/dashboard/project/exaighpowgvbdappydyx](https://supabase.com/dashboard/project/exaighpowgvbdappydyx)
   - Inicia sesión si es necesario

2. **Ve al SQL Editor**:
   - En el menú lateral, click en **"SQL Editor"**
   - O directamente: [https://supabase.com/dashboard/project/exaighpowgvbdappydyx/sql/new](https://supabase.com/dashboard/project/exaighpowgvbdappydyx/sql/new)

3. **Ejecuta el Script**:
   - Abre el archivo: `scripts/apply-payment-settings-migration.sql`
   - Copia TODO el contenido
   - Pégalo en el SQL Editor
   - Click en **"Run"** (botón verde)

4. **Verifica**:
   - Deberías ver el mensaje: "Tabla payment_settings creada exitosamente"
   - Ve a **"Table Editor"** en el menú
   - Busca la tabla `payment_settings` - debería estar ahí

## Opción 2: Configurar Supabase CLI (Para futuras migraciones)

### Instalar Supabase CLI globalmente:
```bash
npm install -g supabase
```

### Login con tu Access Token:
1. Ve a: [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Genera un nuevo Access Token
3. Ejecuta:
```bash
supabase login --token YOUR_ACCESS_TOKEN
```

### Vincular el proyecto:
```bash
supabase link --project-ref exaighpowgvbdappydyx
```

### Aplicar migraciones:
```bash
npm run db:migrate
```

## Opción 3: Usar psql directamente

Si tienes `psql` instalado:

```bash
# Usando las credenciales de tu .env.local
psql "postgresql://postgres.exaighpowgvbdappydyx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f scripts/apply-payment-settings-migration.sql
```

Reemplaza `[YOUR-PASSWORD]` con tu contraseña de Supabase.

## ✅ Verificación

Después de aplicar la migración, verifica que funcione:

1. Ve a `/admin/settings/mercadopago` en tu aplicación
2. Deberías poder ver el formulario de configuración
3. Intenta guardar una configuración de prueba

## 🔧 Troubleshooting

### Error: "relation admin_users does not exist"
- Asegúrate de que las migraciones anteriores se hayan ejecutado
- La tabla `admin_users` debe existir primero

### Error: "permission denied"
- Verifica que estés usando el service_role_key correcto
- El usuario debe tener permisos de CREATE TABLE

### La página no carga
- Verifica que la migración se haya ejecutado exitosamente
- Revisa la consola del navegador para errores
- Verifica los logs del servidor: `npm run dev`

## 📝 Notas

- La tabla `payment_settings` almacena las credenciales de Mercado Pago
- Por seguridad, en producción deberías encriptar los tokens antes de guardarlos
- La configuración se puede cambiar desde `/admin/settings/mercadopago`
- Si no hay configuración en DB, la app usa las variables de entorno como fallback
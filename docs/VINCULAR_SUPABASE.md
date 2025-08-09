# 🔗 Cómo Vincular tu Proyecto con Supabase CLI

## Paso 1: Obtener tu Access Token

1. **Ve a tu cuenta de Supabase**:
   - [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)

2. **Crea un nuevo Access Token**:
   - Click en "Generate New Token"
   - Dale un nombre como "LookEscolar CLI"
   - Copia el token (solo se muestra una vez)

## Paso 2: Login con el Token

Ejecuta en tu terminal:

```bash
supabase login
```

Cuando te pida, pega tu Access Token.

**Alternativa** si no funciona el prompt interactivo:

```bash
export SUPABASE_ACCESS_TOKEN="tu-token-aqui"
```

## Paso 3: Vincular el Proyecto

```bash
supabase link --project-ref exaighpowgvbdappydyx
```

Si te pide contraseña de la base de datos, usa la que está en tu dashboard de Supabase.

## Paso 4: Aplicar Migraciones

Una vez vinculado, puedes ejecutar:

```bash
npm run db:migrate
```

O individualmente:

```bash
supabase db push
```

## 🔧 Comandos Útiles

```bash
# Ver estado del proyecto
supabase status

# Ver migraciones pendientes
supabase db diff

# Resetear la base de datos local (cuidado!)
supabase db reset

# Generar tipos TypeScript
npm run db:types
```

## ⚠️ Si No Puedes Obtener el Token

Si no tienes acceso al dashboard para crear un token, puedes aplicar las migraciones manualmente:

### Opción Manual - SQL Editor

1. Ve a: [https://supabase.com/dashboard/project/exaighpowgvbdappydyx/sql](https://supabase.com/dashboard/project/exaighpowgvbdappydyx/sql)

2. Ejecuta el contenido de:
   - `scripts/apply-payment-settings-migration.sql`

### Opción Manual - psql

Si tienes la contraseña de Postgres:

```bash
psql "postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f scripts/apply-payment-settings-migration.sql
```

## 📝 Notas

- El Access Token es personal, no lo compartas
- El token da acceso a todos tus proyectos de Supabase
- Puedes revocar tokens desde el dashboard
- Si trabajas en equipo, cada desarrollador necesita su propio token
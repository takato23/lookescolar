# Limpieza de Sistemas de Tokens Obsoletos

Este documento describe cómo limpiar los sistemas de tokens antiguos una vez que el nuevo sistema esté funcionando correctamente.

## ⚠️ IMPORTANTE - BACKUP PRIMERO

Antes de ejecutar cualquier operación de limpieza:

```sql
-- Crear backup de todas las tablas relacionadas con tokens
CREATE TABLE backup_gallery_shares AS SELECT * FROM gallery_shares;
CREATE TABLE backup_share_tokens AS SELECT * FROM share_tokens;
CREATE TABLE backup_access_tokens AS SELECT * FROM access_tokens;
CREATE TABLE backup_enhanced_tokens AS SELECT * FROM enhanced_tokens;
```

## Sistemas a Limpiar (una vez validado el nuevo sistema)

### 1. gallery_shares (Sistema de jerarquía compleja)
```sql
-- SOLO EJECUTAR CUANDO EL NUEVO SISTEMA ESTÉ VALIDADO
-- DROP TABLE gallery_shares CASCADE;
```

### 2. share_tokens (Sistema de biblioteca de eventos)
```sql
-- SOLO EJECUTAR CUANDO EL NUEVO SISTEMA ESTÉ VALIDADO
-- DROP TABLE share_tokens CASCADE;
```

### 3. access_tokens (Sistema unificado anterior)
```sql
-- SOLO EJECUTAR CUANDO EL NUEVO SISTEMA ESTÉ VALIDADO
-- DROP TABLE access_tokens CASCADE;
-- DROP TABLE token_access_logs CASCADE;
```

### 4. enhanced_tokens (Sistema avanzado anterior)
```sql
-- SOLO EJECUTAR CUANDO EL NUEVO SISTEMA ESTÉ VALIDADO
-- DROP TABLE enhanced_tokens CASCADE;
```

### 5. codes (Sistema legacy)
```sql
-- VERIFICAR que no se use en ningún lugar antes de eliminar
-- SELECT * FROM codes LIMIT 5;
-- DROP TABLE codes CASCADE;
```

## Funciones a Limpiar

```sql
-- Listar todas las funciones relacionadas con tokens
SELECT proname FROM pg_proc WHERE proname LIKE '%token%' OR proname LIKE '%share%';

-- Eliminar funciones específicas (ejemplos)
-- DROP FUNCTION IF EXISTS create_gallery_share CASCADE;
-- DROP FUNCTION IF EXISTS validate_gallery_share_token CASCADE;
-- DROP FUNCTION IF EXISTS create_enhanced_token CASCADE;
```

## APIs y Rutas a Limpiar

Una vez que todo funcione con el nuevo sistema, eliminar:

- `/app/api/public/gallery/[token]/route.ts` (reemplazado por `/app/api/store/[token]/route.ts`)
- `/app/api/family/gallery-simple/[token]/route.ts` (reemplazado por sistema unificado)
- `/app/api/family/gallery-enhanced/[token]/route.ts` (reemplazado por sistema unificado)
- Rutas en `/app/s/[token]/page.tsx` (si no se usa)
- Rutas en `/app/f/[token]/page.tsx` (migrar a `/app/store/[token]/page.tsx`)

## Validación Antes de Limpiar

1. **Verificar que el nuevo sistema funciona:**
   ```bash
   # Probar crear tienda
   curl -X POST http://localhost:3000/api/admin/stores \
     -H "Content-Type: application/json" \
     -d '{"folder_id": "uuid-here"}'

   # Probar acceso público
   curl http://localhost:3000/api/store/token-here
   ```

2. **Verificar que no hay referencias en el código:**
   ```bash
   grep -r "gallery_shares" app/ components/ lib/
   grep -r "share_tokens" app/ components/ lib/
   grep -r "access_tokens" app/ components/ lib/
   grep -r "enhanced_tokens" app/ components/ lib/
   ```

3. **Verificar migración de datos existentes:**
   ```sql
   -- Contar tokens activos en sistemas antiguos
   SELECT 
     'gallery_shares' as system, COUNT(*) as active_tokens
   FROM gallery_shares 
   WHERE expires_at > NOW()
   
   UNION ALL
   
   SELECT 
     'share_tokens' as system, COUNT(*) as active_tokens
   FROM share_tokens 
   WHERE expires_at > NOW()
   
   UNION ALL
   
   SELECT 
     'folders' as system, COUNT(*) as active_tokens
   FROM folders 
   WHERE share_token IS NOT NULL AND is_published = true;
   ```

## Plan de Migración Gradual

1. **Fase 1:** Implementar nuevo sistema (✅ COMPLETADO)
2. **Fase 2:** Migrar tokens existentes al nuevo sistema
3. **Fase 3:** Redirects de URLs antiguas a nuevas
4. **Fase 4:** Deprecar APIs antiguas (retornar 410 Gone)
5. **Fase 5:** Limpiar base de datos y código

## Script de Migración de Datos (Opcional)

```sql
-- Migrar gallery_shares activos a folders.share_token
INSERT INTO folders (
  id, name, event_id, share_token, is_published, published_at, store_settings
)
SELECT 
  gs.level_id as id,
  'Migrated from gallery_shares' as name,
  gs.event_id,
  gs.token as share_token,
  true as is_published,
  gs.created_at as published_at,
  json_build_object(
    'allow_download', gs.allow_download,
    'migrated_from', 'gallery_shares'
  ) as store_settings
FROM gallery_shares gs
WHERE gs.expires_at > NOW()
  AND gs.level_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM folders f WHERE f.id = gs.level_id
  );
```

## Notas Importantes

- **NO EJECUTAR** estas operaciones hasta que el nuevo sistema esté 100% validado
- **SIEMPRE** hacer backup antes de cualquier operación destructiva
- **PROBAR** en ambiente de desarrollo primero
- **COORDINAR** con el equipo antes de limpiar APIs públicas
- **DOCUMENTAR** cualquier migración de datos especial que sea necesaria


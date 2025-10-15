# Public Access Tokens Unification

> Estado: **Activo** · Última actualización: 2025-10-07

Este documento describe la nueva capa de acceso público (`public_access_tokens`) que
unifica los distintos sistemas de tokens (share_tokens, subject/student_tokens y
folders.share_token) para galerías públicas, flujos familiares y tienda unificada.

## 1. Objetivos
- **Fuente única de verdad** para tokens de acceso público.
- Compatibilidad temporal con sistemas legacy (bandera `is_legacy`).
- Exponer servicios consistentes para API pública, tienda y portal familiar.
- Simplificar auditoría, métricas y limpieza futura de tokens.

## 2. Esquema de Base de Datos
Tabla: `public_access_tokens`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador interno del token unificado |
| `token` | TEXT (único) | Token público |
| `access_type` | TEXT | `share_event`, `share_folder`, `share_photos`, `folder_share`, `family_subject`, `family_student` |
| `event_id` | UUID | Evento asociado (puede derivarse de folder/student) |
| `share_token_id` | UUID | FK a `share_tokens` (si aplica) |
| `subject_token_id` / `student_token_id` | UUID | Tokens familiares legacy |
| `folder_id` | UUID | Carpeta publicada asociada |
| `subject_id` / `student_id` | UUID | Sujeto/estudiante asociado |
| `share_type` | TEXT | Tipo original (event/folder/photos) |
| `photo_ids` | UUID[] | Fotos asociadas (compartidos específicos) |
| `metadata` | JSONB | Metadatos operativos |
| `allow_download` / `allow_comments` | BOOLEAN | Flags heredados |
| `expires_at`, `max_views`, `view_count` | Control de expiración |
| `is_active` | BOOLEAN | Activado/desactivado |
| `is_legacy`, `legacy_source`, `legacy_reference`, `legacy_payload` | Seguimiento de origen legacy |
| `created_at`, `updated_at`, `legacy_migrated_at` | Trazabilidad |

> 📌 Migración: `202510070001_public_access_tokens.sql` crea la tabla, migra
> datos existentes y enlaza tablas legacy mediante `public_access_token_id`.

## 3. Servicio `lib/services/public-access.service.ts`
Responsabilidades principales:

- `upsertShareTokenFromLegacy` / `upsertSubjectTokenFromLegacy` /
  `upsertStudentTokenFromLegacy` / `upsertFolderTokenFromLegacy`: sincronizan
  tablas legacy con el registro unificado y establecen enlaces reversos.
- `getShareTokenByToken`, `listEventShareTokens`, `setShareActiveState`,
  `recordShareView`: API consolidada para flows de compartir.
- `resolveAccessToken`: devuelve contexto extendido (evento, folder, student).
- `resolveFamilyAccess`: adapta la respuesta para `FamilyService`.

## 4. Endpoints
| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/public/access/[token]` | GET | Resuelve token unificado. Devuelve metadatos, contexto de evento/folder y redirección sugerida (`/store-unified/[token]`). |

Respuesta ejemplo:
```json
{
  "token": {
    "publicAccessId": "pat-123",
    "shareTokenId": "share-123",
    "token": "abcd...",
    "accessType": "share_event",
    "isLegacy": false,
    "isActive": true,
    "expiresAt": null,
    "viewCount": 5,
    "legacySource": "share_tokens"
  },
  "event": { "id": "event-1", "name": "Acto escolar" },
  "share": { "shareType": "event", "allowDownload": true },
  "defaultRedirect": "/store-unified/abcd..."
}
```

## 5. Integraciones Ajustadas
- `lib/services/share.service.ts`: consume el servicio unificado para creación,
  validación, métricas y listado por evento.
- `lib/services/family.service.ts`: valida tokens familiares a través de
  `resolveFamilyAccess`, generando objetos `Student` o carpetas sintéticas.
- Wrappers `/f/[token]` y `/s/[token]`: verifican el nuevo endpoint antes de
  redirigir a `/store-unified/[token]`.

## 6. Scripts
- `scripts/seed-store-config.ts`: CLI para sembrar `store_settings` con una
  configuración inicial usando Supabase service role.

```
npx tsx scripts/seed-store-config.ts \
  --event 00000000-0000-0000-0000-000000000000 \
  --template pixieset \
  --currency ARS
```

## 7. Compatibilidad y Limpieza
- Los registros migrados llevan `is_legacy = true` y guardan referencia al
  origen. Nuevos tokens creados via servicio registran `is_legacy = false`.
- Tablas legacy (`share_tokens`, `subject_tokens`, `student_tokens`, `folders`)
  ahora incluyen `public_access_token_id` para trazabilidad.
- El endpoint permite monitoreo y auditoría centralizada antes de desactivar
  definitivamente tablas antiguas.

## 8. Pendientes
- Implementar métricas agregadas en dashboards Admin usando
  `public_access_tokens`.
- Planificar limpieza final de tokens legacy cuando todos los consumidores se
  migren al nuevo servicio.

# Family Access Flow (October 2025)

## Resumen

Esta iteración reemplaza el formulario clásico de códigos familiares por un flujo con alias cortos, validación robusta y un paso de confirmación antes de ingresar a la tienda unificada. El objetivo principal es simplificar el acceso para familias, reducir errores de tipeo y dar a la fotógrafa herramientas para generar y reimprimir flyers con alias legibles.

---

## Base de datos

- **Tabla nueva:** `token_aliases`
  - `alias` (≤ 12 chars, alfanumérico, siempre en minúsculas)
  - `short_code` (string corto en mayúsculas)
  - `token_id` (`enhanced_tokens.id`)
  - `generated_by`, `metadata`, `created_at`, `updated_at`
  - RLS: acceso total para admin/service role.
- Migración: `20251008_token_aliases.sql`.

---

## API Pública

| Endpoint | Método | Descripción |
| --- | --- | --- |
| `/api/family/alias/[alias]` | `GET` | Normaliza el alias (trim, lowercase, sin espacios/guiones) y devuelve el token largo. Responde `404` si no existe y `410` si está vencido/inactivo. |
| `/api/family/validate-token/enhanced/[token]` | `GET` | Respuesta enriquecida con nivel de acceso, evento, estudiante/familia, permisos y advertencias. Ahora incluye `event.start_date` / `event.end_date`. |

---

## Resolver unificado

- Archivo: `lib/services/family-token-resolver.ts`
- Función principal: `resolveFamilyToken(code: string)`
  - Detecta alias (≤ 16 chars o formato corto) → consulta `/api/family/alias/{alias}`.
  - Siempre finaliza llamando a `/api/family/validate-token/enhanced/{token}`.
  - Devuelve `{ token, source: 'alias' | 'token', validation, alias? }`.
- Hook React: `hooks/useFamilyTokenResolver.ts` con estados `idle/loading/success/error`.

---

## UI habilitada

- `components/ui/family-access-card.tsx`
  - Input tolerante (may/min, espacios, guiones).
  - Spinner durante la validación.
  - Tarjeta de confirmación con alias detectado, evento/estudiante y warnings.
  - CTA principal: `Entrar a mi galería` → `router.push('/store-unified/{token}')`.
  - Guarda token en `localStorage` con cifrado AES-GCM (`lib/utils/family-token-storage.ts`) y fallback Base64.
  - CTA secundario `Contactar fotógrafa` (mail/WhatsApp a partir de `/api/public/contact`).

- Landing (`app/landing/page.tsx`): reemplaza `FamilyAccessSection` por `FamilyAccessCard`.
- Nueva ruta `/access/page.tsx`: usa el mismo componente, resuelve automáticamente `?token=` o `?alias=`.
- Legacy `/f/[token]`: ahora renderiza confirmación SSR usando el resolver, mostrando los mismos estados y flyer en caso de error.

---

## Panel para fotógrafas

- Página admin `app/admin/codes/page.tsx`
  - Lista tokens de `enhanced_tokens` con columnas: evento, alias, métricas `vistas/ intentos`, expiración y estado.
  - Botón `Generar alias corto` → POST `/api/admin/tokens/[id]/alias`.
  - Botón por alias `Reimprimir flyer` → abre ventana con HTML listo para impresión (alias + QR + instrucciones).
- Endpoints de soporte:
  - `GET /api/admin/enhanced-tokens` (lista tokens + alias + stats desde `token_access_log`).
  - `POST /api/admin/tokens/[id]/alias` (utiliza `TokenAliasService`).

---

## Ruta de QR

- Todos los QR nuevos ahora apuntan a **`/access?token={token}`**.
- `generateQRLink` se actualizó y los publishers (`folders`, `quick-flow`, `centralita`, etc.) generan URLs con `encodeURIComponent`.
- Los tests (`__tests__/utils/gallery-links.test.ts`) reflejan la nueva ruta.

---

## Contacto y soporte

- Nueva API `GET /api/public/contact`: usa `getAppSettings()` y ofrece email/whatsapp de la fotógrafa con fallback `hola@lookescolar.com`.
- `FamilyAccessCard` consume este endpoint para poblar el CTA.

---

## Testing

- Pruebas unitarias:
  - `__tests__/landing-page.test.tsx`: cubre el componente `FamilyAccessCard` (alias, token directo y CTA).
  - `__tests__/services/family-token-resolver.test.ts`: validate resolución de alias y tokens, manejo de errores.
- Ajustes en utilidades (`generateQRLink`) y coverage existente.

---

## Consideraciones futuras

- Añadir filtros y búsqueda en `app/admin/codes/page.tsx` (por evento, estado).
- Integrar métricas de `token_access_log` con agregaciones más eficientes (SQL view).
- Extender `/api/public/contact` para incluir redes sociales y configuración per-evento.

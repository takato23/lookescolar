# Manual Admin – Acceso Público Unificado

## 1. Objetivo
Guía operativa para el equipo admin/fotografía sobre cómo gestionar los
nuevos tokens públicos, tienda unificada y compatibilidad con sistemas legacy.

## 2. Tokens públicos
1. **Crear** tokens desde el panel (se mantiene flujo existente). Los registros
   se sincronizan automáticamente con `public_access_tokens`.
2. **Verificar** un token manualmente:
   ```bash
   curl https://<dominio>/api/public/access/<TOKEN>
   ```
   Devuelve información del evento, flags y sugerencia de redirección.
3. **Desactivar** un token (`shareService.deactivateShare`) actualiza también
   el registro unificado (`is_active = false`).

## 3. Portal familia / enlaces cortos
- Los shortlinks `/f/[token]` y `/s/[token]` ahora validan contra el endpoint
  anterior. Si reciben 404 se muestra pantalla 404 estándar.
- Para pruebas manuales usar tokens >= 20 caracteres (validación mínima).

## 4. Tienda unificada
- `store_settings` dispone de script de seeding:
  ```bash
  npx tsx scripts/seed-store-config.ts --event <event-id>
  ```
  Opciones: `--folder`, `--template`, `--currency`.
- El endpoint `/api/public/store/config` usa como fallback la fila más reciente
  de `store_settings` (global/evento/carpeta).

## 5. Migraciones y compatibilidad
- La migración `202510070001_public_access_tokens.sql` marcó los tokens
  anteriores con `is_legacy = true`. Todos los flujos nuevos generan registros
  con `is_legacy = false`.
- Para auditoría: consultar vista consolidada:
  ```sql
  select token, access_type, is_active, is_legacy, event_id
  from public_access_tokens
  order by updated_at desc;
  ```

## 6. Galería unificada (fase 3)
- **Servicio**: `lib/services/gallery.service.ts` resuelve accesos de familia/share/store. Todos los endpoints deben consumirlo.
- **Endpoints actualizados**:
  - `/api/family/gallery/[token]`: devuelve `{ data: { gallery, legacy } }` con paginación unificada.
  - `/api/public/share/[token]/gallery`: expone `gallery` (nuevo) + `legacy` para clientes antiguos.
  - `/api/store/[token]`: incluye `gallery`, `gallery_catalog` y mantiene `assets/pagination` legacy.
- **Rate limiting**: límites por token/IP configurados en el servicio (familias 30 req/min, share 120 req/min). Para resets manuales reiniciar el proceso o limpiar Redis cuando se active backend remoto.
- **Fallback**: Si el servicio detecta tokens legacy sin assets, cae al flujo antiguo (`photos` table) y marca `legacyFallbackUsed = true`.
- **QA**: validar tokens reales en staging ejecutando
  ```bash
  curl -s https://staging/api/public/share/<TOKEN>/gallery | jq '.data.gallery.rateLimit'
  ```
  Registrar incidentes en la bitácora (`docs/ARCHITECTURE_REWRITE_LOG.md`).

## 6. Troubleshooting rápido
| Síntoma | Diagnóstico | Acción |
|---------|------------|--------|
| `/store-unified/[token]` devuelve 404 | Endpoint `/api/public/access/[token]` retorna 404 | Verificar que token exista (tal vez expirado) y que `public_access_token_id` esté enlazado. |
| Familias reciben “token inválido” | `FamilyService.validateToken` no encuentra resolución | Revisar `public_access_tokens` y que `resolveFamilyAccess` retorne event/subject/student. |
| Token legacy sin sincronizar | Campo `public_access_token_id` nulo en `share_tokens` | Ejecutar script manual o recrear token para forzar sincronización. |

## 7. Catálogo y pipeline unificados
- `lib/services/catalog.service.ts` entrega la lista de precios oficiales por evento/token (incluye overrides activos).
- `lib/orders/order-pipeline.ts` reemplaza lógica ad-hoc: valida precios, crea órdenes y orquesta MercadoPago.
- `lib/payments/mercadopago.ts` centraliza la creación de preferencias (logs útiles si faltan credenciales).
- Catalogo disponible vía `/api/public/store/config` → la respuesta incluye `catalog.items` y overrides para front.
- Ante error de MP se devuelve fallback sandbox `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=dev_<orden>`.

## 8. Próximos pasos (Phases 2-3)
- Catalogo y checkout comunes -> coordinar con equipo de pricing.
- Galería unificada -> definir límites de descarga y signed URLs en conjunto con
  soporte.

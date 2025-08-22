# CLAUDE\_CONTEXT.md

Guía mínima, clara y accionable para que un asistente de coding (Claude Code) pueda trabajar **de a poco** en la plataforma de fotos escolares.

---

## 0) Cómo usar este archivo

* **Pégalo como contexto** en la primera interacción con el asistente y **manténlo fijado** durante la sesión.
* Trabajaremos por **micro‑tareas**. Para cada una, crearás un `.md` corto con la especificación (ver §8) y se lo pasarás en el prompt.
* El asistente debe responder siempre con: plan breve → diff/archivos → pruebas/manual QA → pasos de verificación.

---

## 1) Snapshot del producto

* **Problema**: Venta y entrega de fotos escolares a familias, reduciendo la carga manual (clasificación/armado) y el tiempo desde toma → entrega.
* **Usuarios**:

  * **Admin (fotógrafa/equipo)**: carga de fotos, organización por evento→curso→alumno, publicación/links.
  * **Familias**: acceden a una galería privada por link/token/QR, eligen opciones y pagan online.
* **Estado**: listo para demo end‑to‑end (admin → galería → checkout) con base sólida de auth, storage, pagos y hosting. Detalles finos de UX/compras a completar (wizard/mocks de producto).
* **Diferenciadores**: acceso tokenizado por alumno/curso, flujos alternativos (QR único o foto‑cartel con nombre), upsells simples, rapidez de publicación.

---

## 2) Alcance actual (must‑have)

1. **Modelo evento→curso/sala→alumno** (carpetas) para organizar y compartir.
2. **Dos estrategias de identificación**:

   * **Maternal/primaria**: clasificación por curso/sala; apoyo con **foto-carte**l (alumno + nombre) para arrastre a carpeta.
   * **Secundaria**: **A/B** entre **token/QR único** por estudiante **vs** foto‑cartel con nombre.
3. **Acceso de familias**: preferencia por **link directo tokenizado** enviado por el colegio; sin login global.
4. **Compra**:

   * **Opción 1** (1 foto base) y **Opción 2** (2 fotos base, pueden ser repetidas).
   * Tras elegir opción, se habilita la selección de 1/2 fotos; bloquear “Siguiente” hasta completar el cupo.
   * **Upsell** de copias/tamaños con precios visibles **antes** del carrito.
   * Mostrar **mockups del producto** (carpeta física) al elegir la opción.
5. **Pagos**: integración con Mercado Pago + webhook de confirmación.
6. **Seguridad & privacidad**: links tokenizados, no indexables; URLs firmadas para media; watermark; rate‑limit; CSP a endurecer.
7. **Rendimiento objetivo**: admin <1.6s TTI; galerías <2s; filtros <300ms; scroll fluido en sets grandes.

---

## 3) Stack (actual/esperado)

* **Frontend**: Admin + Galerías públicas/privadas (React/Next.js o equivalente). Estilos visuales coherentes (tema “liquid‑glass”).
* **Auth**: Supabase (admins). Familias sin login; acceso por token/QR/link.
* **Storage**: buckets público/privado con URLs firmadas; watermarking en upload.
* **Pagos**: Mercado Pago (credenciales de desarrollador, modo test/prod) + webhook verificado.
* **Infra**: hosting estandar (frontend + funciones); logging con masking; rate‑limit y anti‑hotlink.

> Si el repositorio ya fija otras tecnologías, Claude debe **respetar** lo existente.

---

## 4) Modelo de dominio (resumen)

* **Evento**: “Escuela X — 2025”. Atributos: id, nombre, fecha, estado.
* **Curso/Sala** (Carpeta/Sujeto): p.ej. “1ºA”, “Sala Verde”. Atributos: id, eventoId, nombre.
* **Alumno**: id, cursoId, nombre, token (opcional si usa token único), qr (opcional), emails padres (para distribución), flags.
* **Galería**: privada por alumno/curso; URL pública con **token** (no indexable).
* **Foto**: id, alumnoId (o cursoId), rutaStorage, createdAt, flags (publicada/oculta), hash.
* **Producto/Opción**: Opción 1 u Opción 2; variantes (copias/tamaños) con precio.
* **Pedido**: id, alumnoId, items, totales, estado, mp\_preference\_id.
* **Pago**: id, pedidoId, mp\_payment\_id, estado (aprobado/pending/fail), timestamps.

---

## 5) Flujos clave

### 5.1 Admin

1. Cargar fotos masivamente por **evento**.
2. Clasificar a **curso/sala** y luego a **alumno** (usando foto‑cartel si aplica).
3. Generar **links tokenizados** por alumno/curso; copiar/compartir.
4. Publicar/ocultar fotos; mover entre carpetas; acciones por lote.

### 5.2 Familias

1. Abrir **link tokenizado/QR** → ver galería privada.
2. Elegir **Opción 1/2** → seleccionar 1 o 2 fotos (repetición permitida en Opción 2).
3. Añadir **copias/tamaños** (upsell con precios visibles) → Carrito → **Mercado Pago**.
4. Confirmación/recibo; (descarga/envío según política definida).

---

## 6) Criterios de aceptación (ejemplos)

* **Selección bloqueada**: en Opción 2 no se puede continuar hasta seleccionar 2 unidades (misma o distinta foto).
* **Repetición válida**: el usuario puede seleccionar dos veces la misma foto en Opción 2.
* **Upsell visible** antes del carrito con subtotales en vivo.
* **Links**: `/f/{token}` inaccesible sin token válido; no existen listados navegables.
* **Webhook**: cambio de estado de Pedido → Pagado cuando Mercado Pago confirma.
* **Accesibilidad mínima**: foco visible, etiquetas, contraste aceptable.

---

## 7) Seguridad y cumplimiento

* **CSP**: política estricta; sin `unsafe-inline`; permitir dominios necesarios (MP, CDN, storage).
* **Media**: URLs firmadas temporales; watermark en previews.
* **Datos personales**: tokens sin datos sensibles; e‑mails con consentimiento del colegio.
* **Rate‑limit** en endpoints de galería; **anti‑hotlink** de imágenes.

---

## 8) Trabajo “de a poco”: estructura de specs

Crea archivos cortos en `/docs/specs/*` y pásalos a Claude para cada micro‑tarea.

**Plantilla sugerida** `docs/specs/XYZ.md`:

```md
# XYZ — Especificación breve
## Objetivo
## Alcance (incluye/no incluye)
## Requisitos funcionales (bullets precisos)
## Criterios de aceptación (Given/When/Then)
## Notas de UX/copy (microcopys, estados vacíos/errores)
## Riesgos y trade‑offs
## Validación (QA manual + casos edge)
```

---

## 9) Backlog inicial (priorizado)

1. **Wizard de compra**: Opción 1/2 → selección forzada 1/2 → upsell de copias/tamaños **antes** del carrito.
2. **Mockups de producto**: soporte para subir imágenes de “carpeta física” y mostrarlas al elegir opción.
3. **CSP**: endurecer política y documentar dominios requeridos (incl. Mercado Pago/SDKs/CDN).
4. **Errores de galería**: estados claros para token inválido/expirado y para “sin fotos”.
5. **CSV alumnos**: importación/edición en Admin con validación.
6. **Copiar link** masivo por curso/sala; exportación de links para correo del colegio.
7. **Webhook Mercado Pago**: idempotencia + logs auditables.
8. **Tests**: unit/integration smoke de flujos principales.

---

## 10) Estándares de entrega para el asistente

* **No over‑engineering**; seguir stack y patrones existentes.
* Entregar **diffs/archivos** concretos + **migraciones** (si aplica) + instrucciones de `env`.
* **Convenciones**: TypeScript si el proyecto lo usa; commits `feat|fix|chore: …`.
* **Pruebas**: incluir al menos casos felices y 2 edge‑cases.
* **Feature flag**: si afecta compra, proteger bajo `feature.wizard`.

---

## 11) Prompt de arranque (copiar/pegar)

```
Contexto: (adjunto este CLAUDE_CONTEXT.md)
Rol: Actúa como dev senior del proyecto. Respeta stack/patrones existentes.
Tarea 1: Implementar el wizard de compra (Opción 1/2) con selección forzada, repetición permitida en Opción 2, y paso de upsell previo al carrito.
Entrega: plan breve, cambios de archivos, código, pruebas manuales y unitarias, y pasos para verificar.
Criterios de aceptación: ver §6.
Restricciones: sin romper rutas públicas existentes; reusa componentes; agrega mock de datos si falta API.
```

---

## 12) Appendix — estructuras útiles

**Rutas ejemplo**

* Admin: `/admin/events`, `/admin/photos`, `/admin/courses/[id]`, `/admin/students/[id]`
* Público: `/g/[eventId]`, `/c/[courseId]`, `/f/[token]`

**Entidades (TS) — orientativo**

```ts
type Event = { id: string; name: string; date?: string; status: 'draft'|'published' };
type Course = { id: string; eventId: string; name: string };
type Student = { id: string; courseId: string; name: string; token?: string; qr?: string; emails?: string[] };
type Photo = { id: string; studentId?: string; courseId?: string; url: string; published: boolean; createdAt: string };
```

**Estados de pedido/pago**

* Pedido: `draft → awaiting_payment → paid → fulfilled`
* Pago (MP): `pending|approved|rejected|refunded`

---

## 13) Mantenimiento vivo

* Mantén este archivo y las specs en `/docs/` como **fuente única de verdad**.
* Abre cada PR referenciando el spec (`Resolves: docs/specs/XYZ.md`).
* Anota cambios en `CHANGELOG.md`.

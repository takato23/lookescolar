# LookEscolar · Guía Paso a Paso

> Usa esta lista como menú. Cuando quieras avanzar, avisá "vamos al punto X" y seguimos con ese bloque.

## Punto 0 · Preparación rápida (1 hora)
- Verificar que el repositorio esté actualizado y que existen credenciales locales necesarias (Supabase CLI, Mercado Pago sandbox, Redis si aplica).
- Confirmar acceso al panel de logs actual (Vercel/Supabase) para poder monitorear cambios.
- Anotar fecha y hora del último backup disponible.

✔️ **Listo cuando:** sabemos dónde están las credenciales, podemos ver logs en producción y tenemos un backup identificado.

---

## Punto 1 · Red de seguridad básica (1-2 días)
**Objetivo:** que cualquier cambio tenga respaldo y alerta mínima.

Tareas:
- Escribir un script simple (`scripts/manual-backup.sh`) que exporte la base (`supabase db dump`) y comprima `.env.local` + metadata mínima.
- Correrlo una vez y guardar el archivo resultante fuera del repo (drive/pendrive).
- Agregar instrucciones cortas en `docs/backup.md` explicando cómo ejecutar y restaurar.
- Activar logs de errores críticos existentes (ej. Webhooks) hacia una consola central o canal de Slack/email, aunque sea manualmente.

✔️ **Listo cuando:** el script corre sin errores, existe un backup externo fechado y sabemos dónde ver un log si algo se rompe.

---

## Punto 2 · Pagos confiables (3-4 días)
**Objetivo:** evitar perder transacciones de Mercado Pago.

Tareas:
- Revisar el endpoint actual del webhook (código, logs) y documentar flujo real.
- Crear prueba manual con el sandbox de MP: enviar 2 pagos (uno aprobado, uno rechazado) y verificar estado en la base.
- Agregar reintentos simples (try/catch con un par de `setTimeout`) y registro del ID del webhook procesado para evitar duplicados usando almacenamiento existente (DB o memoria temporal).
- Configurar un alertita: si falla un webhook, notificar (log + email o Slack).
- Escribir checklist corto en `docs/payments.md` con "cómo probar después de tocar esto".

✔️ **Listo cuando:** podemos repetir la prueba sandbox y ver en logs cada webhook aceptado/reintentado, sin duplicados.

---

## Punto 3 · Acceso familiar sin sorpresas (2-3 días)
**Objetivo:** avisar antes de que caduque un token y permitir renovarlo sin romper la seguridad actual.

Tareas:
- Auditar cómo se crea/valida hoy el token (`family_tokens`).
- En el frontend, mostrar un aviso cuando faltan ≤7 días para expirar (usar datos existentes, sin nuevas migraciones).
- Endpoint pequeño que permita emitir un nuevo token ligado al anterior, respetando las reglas actuales.
- Mandar email o mensaje manual a familias piloto para validar el flujo.
- Actualizar `docs/access.md` con pasos para generar y renovar tokens.

✔️ **Listo cuando:** una familia de prueba ve el aviso, puede renovar y el acceso anterior deja de fallar de golpe.

---

## Punto 4 · Iteraciones de performance y UX (ciclos de 1 semana)
**Objetivo:** mejorar velocidad de subida y experiencia de galería sin tocar todo a la vez.

Ciclo sugerido:
1. Medir (ej. Lighthouse, tiempos de carga reales, qué ruta API es más lenta).
2. Elegir un cuello de botella y resolverlo (ej. comprimir previews, lazy load, paginación).
3. Validar con métricas y 1-2 usuarios pilotos.
4. Documentar cambio breve en `docs/performance.md` o `docs/ux.md`.

✔️ **Listo cuando:** cada iteración muestra una mejora medible y se comunica qué cambió.

---

## Punto 5 · Seguridad y pruebas automatizadas (ciclo continuo)
**Objetivo:** ir endureciendo la app sin frenar al equipo.

Pasos iniciales:
- Añadir pruebas unitarias para los puntos críticos anteriores (webhooks, tokens).
- Configurar un `npm run test:smoke` que corra en CI antes del deploy.
- Revisar políticas de acceso (RLS) con Supabase sin migraciones disruptivas: empezar por endpoints públicos vs privados.
- Gradualmente sumar rate limiting y monitoreo centralizado cuando haya base estable.

✔️ **Listo cuando:** los cambios críticos tienen tests automáticos y existe un checklist de seguridad básico previo al deploy.

---

### Notas generales
- Registrar todo en `docs/` conforme se implementa (qué script correr, qué esperar, cómo revertir).
- Cada punto depende del anterior: no avanzar si el anterior no está validado.
- Si aparece una urgencia, pausamos el plan y documentamos qué se interrumpió.

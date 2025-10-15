# Notas de trabajo

## Errores corregidos
- ✅ La pantalla de `Configuración de Tienda` ya guarda sin el error 500. Se agregó un fallback para que la API use la sesión del administrador cuando falta `SUPABASE_SERVICE_ROLE_KEY`, así que no hace falta tocar variables locales para seguir editando.

## Novedades relevantes
- 🎨 Se sumaron estilos prearmados para la tienda pública. Podés sumarlos al link compartido con `?theme=` (`default`, `kids`, `teen`, `elegant`).
- 🪄 Desde el modal de compartir ahora se elige el estilo antes de copiar el link. El enlace y el QR se actualizan automáticamente con el estilo seleccionado.
- En la vista pública (`/store-unified/[token]`) la tienda aplica automáticamente el estilo según el parámetro del link.

## Cómo usar
1. Generá o abrí el modal de compartir en `Fotos > Compartir`.
2. Elegí "Infantil", "Joven" o "Elegante" según el público. Copiá o compartí el enlace actualizado.
3. El link queda, por ejemplo: `https://…/store-unified/<token>?theme=kids`.

---
Pendiente: validar con datos reales que cada preset tenga los colores finales deseados.

---

• Step2 – Arquitectura objetivo MCP: listo el plan para documentar el catálogo de tools, flujos de intents y almacenamiento contextual.
  □ Inventario de tools MCP agrupadas por dominio (tienda, órdenes, notificaciones, analítica) y definir nuevas herramientas necesarias (p.ej., `orders.followUp`, `notifications.dispatch`).
  □ Diagrama de flujo para intents principales: recepción en dispatcher, clasificación, enrutamiento y consolidación de response builders.
  □ Modelo de almacenamiento contextual: capas de sesión (memoria corta), historial persistente (Supabase) y snapshots de conversación para hand‑off multicanal.
  □ Entregables: documento de arquitectura, backlog de tools, esquema de contexto, checklist de dependencias técnicas.

• Supuestos clave
  └ El dispatcher MCP puede extenderse sin romper contratos actuales; usaremos el SDK oficial y wrappers existentes.
  └ Contamos con Supabase como datastore principal y Redis opcional para cola/eventos en tiempo real.
  └ La clasificación de intents se basará en embeddings + reglas, con fallback manual mientras afinamos modelos.

• Riesgos
  └ Latencia por clasificación/embeddings; mitigación: cache de intents frecuentes y limitación de profundidad en context fetch.
  └ Falta de sessionId en CallToolRequest; necesitamos convención (header/meta) antes de implementar memoria persistente.
  └ Debt en notificaciones externas (Slack/Email) podría demorar entregables si descubrimos ausencia de conectores reutilizables.

• Decisiones pendientes
  └ Elegir estrategia de intent classification (serve embeddings in‑house vs. provider externo).
  └ Definir formato estándar para contexto compartido entre tools (`contextBlob` JSON vs. registros normalizados).
  └ Confirmar ownership de orquestación de notificaciones (¿dispatcher o servicio dedicado?).

• Próximos pasos inmediatos
  └ Redactar documento de arquitectura con esquema de tools/intents/contexto.
  └ Validar dependencias técnicas (SDK MCP, conectores notificaciones, storage) y abrir tickets.
  └ Preparar backlog priorizado para Step3 (implementación + pruebas) antes de modificar el dispatcher.

# Notas de trabajo

## Errores corregidos
- ✅ La pantalla de `Configuración de Tienda` ya guarda sin el error 500. Se agregó un fallback para que la API use la sesión del administrador cuando falta `SUPABASE_SERVICE_ROLE_KEY`, así que no hace falta tocar variables locales para seguir editando.

## Novedades relevantes
- ✨ Se agregó la nueva sección de **Configuración de Tienda** en `/admin/store-settings`, con interfaz para administrar la experiencia de compra, productos y pagos.
- 🎨 Se sumaron estilos prearmados para la tienda pública. Podés sumarlos al link compartido con `?theme=` (`default`, `kids`, `teen`, `elegant`).
- 🪄 Desde el modal de compartir ahora se elige el estilo antes de copiar el link. El enlace y el QR se actualizan automáticamente con el estilo seleccionado.
- En la vista pública (`/store-unified/[token]`) la tienda aplica automáticamente el estilo según el parámetro del link.

## Cómo usar
1. Generá o abrí el modal de compartir en `Fotos > Compartir`.
2. Elegí "Infantil", "Joven" o "Elegante" según el público. Copiá o compartí el enlace actualizado.
3. El link queda, por ejemplo: `https://…/store-unified/<token>?theme=kids`.

---
Pendiente: validar con datos reales que cada preset tenga los colores finales deseados.
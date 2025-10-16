# Prompt para implementar mejoras UX/UI en `/admin/fotos`

Quiero que actúes como diseñador(a) de producto y front-end senior especializado(a) en modernizar aplicaciones tipo gestor de archivos para equipos de fotografía escolar. Tendrás acceso a un repositorio Next.js/React con Tailwind CSS y componentes ya creados. Tu objetivo es rediseñar la experiencia de `/admin/fotos` manteniendo el paradigma de exploración de carpetas tipo explorador, pero haciéndolo mucho más moderno, claro y potente.

## Alcance
- Trabaja únicamente en la ruta `/admin/fotos` y sus componentes asociados.
- Mantén la arquitectura actual (árbol de carpetas a la izquierda, contenido en el centro, inspector a la derecha, barra superior con acciones globales y panel flotante de cargas).
- Respeta la lógica existente de selección múltiple, estados de carga y búsqueda; puedes mejorar la UI pero no romper los flujos funcionales.

## Objetivos clave
1. **Jerarquía y descubrimiento de carpetas.**
   - Implementa un árbol de carpetas en dos niveles: vista primaria (favoritos/niveles superiores) y panel expandible bajo demanda.
   - Añade chips de estado y resaltado de coincidencias en la búsqueda.
   - Moderniza el breadcrumb para fijar nodos, alternar subcarpetas y mostrar iconografía clara.
   - Valida que todo siga funcionando como navegador de archivos con jerarquía expandible y breadcrumb funcional.

2. **Presentación del panel central.**
   - Conserva las vistas grid/list pero agrega selector de densidad y overlays en hover con metadatos esenciales.
   - Incluye badges de estado, botones fantasma para acciones rápidas y estados vacíos con instrucciones útiles.
   - Comprueba que la selección múltiple, la virtualización y los atajos existentes sigan operando.

3. **Inspector lateral y acciones masivas.**
   - Reorganiza el inspector en tabs (Resumen, Metadatos, Automatizaciones) con chips estadísticos y botones prominentes.
   - Permite edición inline de campos clave y resalta atajos de teclado relevantes.
   - Asegura que mover/compartir/descargar sigan iniciándose desde el inspector sin romper el flujo.

4. **Barra superior y herramientas globales.**
   - Divide la cabecera en tres bloques: navegación (volver, selector de evento, breadcrumb condensado), búsqueda/filtros (input persistente con chips y toggles) y acciones (subir, asignar, enlaces, ajustes) dentro de un menú "Acciones rápidas".
   - Expone un campo de búsqueda global con autosugerencias y atajo `Cmd/Ctrl + K` reutilizando `searchTerm`.
   - Verifica que los filtros existentes, cargas y asignaciones sigan accesibles y funcionales.

5. **Feedback de carga y estado del sistema.**
   - Convierte el panel de subidas en un timeline compacto con tarjetas por lote, iconografía suave y resumen persistente en la parte inferior.
   - Añade un panel plegable de estado del sistema que muestre egress, subidas en curso y alertas recientes.
   - Garantiza que los flujos de carga y descarga actuales continúan disponibles y que los nuevos componentes no bloquean la navegación.

## Entregables
- Componentes React y estilos actualizados siguiendo los lineamientos de Tailwind del proyecto.
- Cualquier utilitario o hook adicional necesario documentado y tipado.
- Estados responsivos (desktop primero, pero optimiza para pantallas medianas).
- Documentación breve en `docs/` explicando el nuevo flujo si es necesario.
- Pruebas relevantes (unitarias o e2e) para cubrir la nueva interacción crítica.

## Validación
- Ejecuta `npm run lint`, `npm run typecheck` y las pruebas relevantes.
- Adjunta capturas o gifs del nuevo diseño en el PR.
- En la descripción del PR, explica cómo cada mejora mantiene el flujo de navegador de archivos y aumenta modernidad + funcionalidad.

Responde confirmando que entiendes la tarea, detalla tu plan de implementación paso a paso y solicita cualquier información adicional que necesites antes de comenzar.

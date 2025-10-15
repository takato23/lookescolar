1) Quick wins (mejoras directas)

Barra superior “sticky” con: migas (Eventos / Escuela…), estado del evento, botón primario Subir fotos, botón secundario Compartir y Vista cliente.

Métricas compactas (4 chips) con icono + número + etiqueta corta: Fotos, Estudiantes, Pedidos, Ingresos. Reducí altura y usá mismos paddings.

Tres paneles bien definidos (resizable): Estructura (izq.) • Contenido (centro) • Inspector (der.). El inspector aparece solo cuando hay selección.

Acciones contextuales: al seleccionar fotos, aparece una action bar flotante (Arriba del grid): Asignar, Mover, Descargar, Eliminar, Publicar.

Botones de crear + importar al tope del panel Estructura (no mezclados entre niveles).

Busqueda + filtros permanentes arriba del grid (con contadores de filtros activos).

Modo Navegar / Modo Selección (toggle). En Navegar hay previsualizaciones y atajos; en Selección, checkboxes visibles, contador y teclas rápidas.

Estados vacíos claros (cuando no hay subcarpetas/fotos): CTA grande “Subí tus primeras fotos” o “Creá el primer nivel”.

Consistencia tipográfica y espaciado: misma escala de tamaños (12/14/16), 8px grid para padding/márgenes, sombras muy sutiles (o ninguna).

Accesibilidad: contraste AA, foco visible en tarjetas/botones, tooltips para iconos sueltos, títulos de sección con <h2> reales.

2) Mockup A — Layout de trabajo 3‑columnas (gestión)

Pensado para ordenar niveles/cursos y trabajar con álbumes; inspector a la derecha.

┌───────────────────────────────────────────────────────────────────────────────┐
│  ◀ Eventos / Escuela Margarita Negra                   Estado: Activo   [⋯]  │
│  11 dic 2025                                               [Vista Cliente]    │
│  [Subir fotos]   [Compartir evento]                                             │
├───────────────────────────────────────────────────────────────────────────────┤
│  Fotos: 847      Estudiantes: 312      Pedidos: 17      Ingresos: $15         │
├───────────────────────────────────────────────────────────────────────────────┤
│  ESTRUCTURA                         │   CONTENIDO                              │  INSPECTOR
│  ─────────                          │   ─────────                               │  ─────────
│  [ + Nivel ]  [ + Carpeta ]         │   [Buscar…]  [Filtros ▾] [Vista ☐▥▤]      │  Seleccioná una foto
│  [ Cargar alumnos CSV ]             │   ┌───────────────────────────────────┐   │  para ver detalles y
│                                     │   │ ☐ IMG_1092   ☐ IMG_1089  ☐ …     │   │  acciones rápidas.
│  ▸ Secundario (12)                  │   │                                   │   │
│    ▸ 5º A (280)                     │   │  ☐ IMG_1077  ☐ IMG_1075  ☐ …     │   │  ────────────────
│    ▸ 5º B (250)                     │   └───────────────────────────────────┘   │  Ficha de foto
│  ▾ Primario (6)                     │   0 seleccionadas                        │  ────────────────
│    ▸ 6º A (320)                     │   [Asignar] [Mover] [Descargar] [⋯]      │  Alumno: — 
│    ▸ 6º B (298)                     │                                           │  Carpeta: Primario/6A
│  ▾ Niveles personalizados           │                                           │  Etiquetas: —
│    • Ninet (5)                       │                                           │  Fecha: 01/09/2025
│                                     │                                           │
│  ACCIONES RÁPIDAS                   │                                           │  [Abrir en AdminFotos]
│  • Ver galería cliente              │                                           │
│  • Compartir álbum                  │                                           │
│  • Configuración del evento         │                                           │
└───────────────────────────────────────────────────────────────────────────────┘


Notas clave

El árbol es claro y con contadores; los CTAs de crear/importar están arriba.

El Inspector sólo aparece cuando hay selección (limpia el layout cuando no).

La action bar aparece cuando n>0 items seleccionados.

“Abrir en AdminFotos” mantiene el deep‑link con event_id y folder_id actual.

3) Mockup B — Focus mode (selección/producción)

Pensado para etiquetar, asignar, publicar. Más área para el grid y filmstrip inferior.

┌───────────────────────────────────────────────────────────────────────────────┐
│  ◀ Escuela Margarita Negra — Focus Mode     [Volver a Gestión]   [Publicar]  │
├───────────────────────────────────────────────────────────────────────────────┤
│ [Buscar…]  [Filtros ▾]                     12 seleccionadas                   │
│ [Asignar a alumno] [Mover] [Descargar] [Eliminar] [Marcar publicadas] [⋯]    │
├───────────────────────────────────────────────────────────────────────────────┤
│  GRID (máximo ancho)                                                            │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  ☐   ☐   ☐   ☐   ☐   ☐   ☐   ☐   ☐   ☐   ☐   ☐                           │ │
│  │                                                                           │ │
│  │  ☐   ☐   ☐   ☐   ☐   ☐   ☐   ☐   ☐   ☐   ☐   ☐                           │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│  FILMSTRIP (timeline de subidas)                                               │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ ▮ ▮ ▮ ▮ ▮ ▮ ▮ ▮ ▮ ▮ ▮ ▮ ▮ ▮ ▮ ▮ …                                        │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────┘


Notas clave

Top bar con contador de selección y acciones de lote.

Filmstrip para revisar el lote rápido sin perder el foco.

Botón directo Publicar cuando estás en modo producción.

4) Micro‑cambios de contenido (copys y jerarquía)

“Estructura del evento” → “Estructura” (más corto; el contexto ya lo da el encabezado).

“Agregar nivel / carpeta / alumnos” → “Nuevo nivel / Nueva carpeta / Importar alumnos (CSV)”.

Tooltips:

Compartir carpeta → “Crea un enlace para familias (solo lectura)”.

Inspector de fotos → “Datos y acciones de las fotos seleccionadas”.

Métricas: en minúscula y sin verbos: “Fotos 847 · Estudiantes 312 · Pedidos 17 · Ingresos $15”.

5) Interacciones recomendadas

Drag & drop: mover fotos entre carpetas del árbol (con confirmación si hay políticas activas).

Teclado: A asignar, M mover, Del eliminar, P publicar, Esc limpiar selección.

Resizer entre columnas (12/60/28% por defecto; recuerda el estado por evento).

Persistencia de filtros por evento (querystring + localStorage).

Empty states con CTA claro y mini‑tutorial de 3 pasos.

6) Prompt listo (para que Claude Code te lo lleve a la práctica)

Copiá/Pegá tal cual. No pide código específico; describe resultados y cómo entregarlos.

“Quiero mejorar /admin/events/[id] siguiendo estos mockups (A 3‑columnas, B Focus Mode).
Alcance: solo esta vista (no toques el dashboard).
Entregables por iteración: Plan breve → DIFFs atómicos (máx. 5 archivos) → Pasos de prueba → GIF/screenshot.

Requisitos de UI/UX

Top bar sticky con: migas, estado, ‘Subir fotos’ (primario), ‘Compartir’ y ‘Vista cliente’.

KPIs compactos (4 chips): Fotos, Estudiantes, Pedidos, Ingresos. Misma altura, mismo padding.

Layout 3‑columnas resizable: Estructura (árbol con contadores) · Contenido (grid con búsqueda y filtros) · Inspector (solo con selección).

Action bar contextual cuando hay selección: Asignar, Mover, Descargar, Eliminar, Publicar.

Botones de “Nuevo nivel / Nueva carpeta / Importar alumnos (CSV)” solo arriba del panel Estructura.

Deep‑link sólido con PhotoAdmin: al abrir carpeta actual, usar event_id y folder_id; en PhotoAdmin mostrar ‘Volver al evento’.

Empty states claros y accesibilidad AA.

No hagas reescrituras masivas. Si falta algo, mostrá ripgrep de dónde lo sacaste y proponé el diff mínimo.

Checklist de entrega

Barra superior y KPIs compactos operativos.

Tres paneles con resizer y estados (sin/ con selección).

Action bar aparece y funciona con 1+ elementos seleccionados.

Deep‑link ida/vuelta con PhotoAdmin verificado.

Empty states y tooltips agregados.

Empezá por: estructura de layout + KPIs; luego árbol + grid + inspector, y por último action bar de selección.”
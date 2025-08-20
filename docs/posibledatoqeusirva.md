Diagnóstico rápido (lo que hoy confunde)
	•	Contexto difuso: no queda explícito en qué evento/carpeta estás trabajando.
	•	Controles incompletos: no hay filtros, orden ni cambio de vista.
	•	Sidebar ambigua: mezcla “Carpetas por evento” con “Sin carpeta” sin dejar claro el ámbito actual.
	•	Selección masiva tímida: seleccionar varias fotos no habilita una barra de acciones clara.
	•	Tarjetas repetitivas: la info útil (estado, carpeta, fecha) está pero sin patrón visual consistente.

⸻

Qué agregar (mínimo viable para demo)

1) Barra superior de Contexto + Controles
	•	Breadcrumb: Fotos / Evento: Colegio Normal / Carpeta: General
	•	Píldora de contexto (sticky, esquina superior derecha del grid):
	•	“Subiendo a: Colegio Normal › General”
	•	Controles alineados a la derecha:
	•	Buscar (placeholder: “Buscar por nombre, etiqueta o carpeta…”)
	•	Vista: Grid ｜ Lista
	•	Ordenar: Recientes, Más antiguas, A–Z, Tamaño
	•	Filtros (chips): Aprobada, Pendiente, Rechazada, Sin carpeta, Con etiqueta, Sin etiqueta
	•	Mostrar chips activos bajo la barra (y un botón “Limpiar filtros”)

2) Sidebar (jerarquía clara)
	•	Título: Navegación de Biblioteca
	•	Secciones colapsables:
	•	Evento actual (resaltado): nombre, fecha, cantidad de fotos
	•	Carpetas (con contador)
	•	Sin carpeta (badge naranja “Por organizar”)
	•	Otros eventos (lista colapsada con contador)
	•	Botón principal arriba: Cambiar evento (abre selector modal simple)

3) Grid/List toggle
	•	Grid (por defecto):
	•	Tarjeta consistente: miniatura; badge de estado (Aprobada/Pendiente); checkbox arriba-izquierda; abajo nombre, peso, fecha; menú … al hover (Ver, Mover, Aprobar/Desaprobar, Asignar a sujeto, Eliminar).
	•	Lista:
	•	Columnas: Miniatura | Nombre | Estado | Carpeta | Evento | Peso | Fecha | Acciones
	•	Ordenable por columnas.

4) Selección masiva (barra flotante al pie)

Cuando hay ≥1 seleccionada, aparece una barra con:
	•	Mover a carpeta ｜ Aprobar ｜ Rechazar ｜ Asignar sujeto ｜ Eliminar
	•	a la izquierda: “3 seleccionadas” + Seleccionar todas (página)

5) Cajas de resumen

Bajo el título “Gestión de Fotos”, mostrar 3 contadores rápidos del contexto actual:
	•	Total (aplica filtros y ámbito actual)
	•	Aprobadas
	•	Pendientes
(Chiquitos, estilo “stat cards”, ayudan a saber si los filtros surten efecto.)

6) Estados vacíos útiles
	•	Sin eventId: “Elegí un evento para ver sus carpetas y fotos.”
	•	Filtros sin resultados: “No hay fotos que coincidan con los filtros. [Limpiar filtros]”
	•	“Sin carpeta”: “Arrastrá fotos aquí o usá Mover a carpeta.”

⸻

Microcopys (claros y en español)
	•	Badge estado: “Aprobada / Pendiente / Rechazada”
	•	Filtro chips: “Con etiqueta / Sin etiqueta”
	•	Vacío de evento: “No hay evento seleccionado”
	•	Toast post-subida: “Se subieron 8 fotos a Colegio Normal › General”

⸻

Iteración 1 (lo más rápido que impacta)
	1.	Breadcrumb + píldora de contexto con evento/carpeta actuales.
	2.	Toggle Grid/Lista + dropdown de Ordenar.
	3.	Fila de filtros con chips (Aprobada/Pendiente/Rechazada/Con etiqueta/Sin etiqueta/Sin carpeta).
	4.	Barra de selección masiva con acciones principales.
	5.	Sidebar reagrupada: Evento actual (resaltado) → Carpetas; Otros eventos colapsados.
	6.	Stat cards (Total, Aprobadas, Pendientes) del ámbito actual.

⸻

Criterios de aceptación (para revisar rápido)
	•	Puedo cambiar de Grid a Lista y ordenar por fecha/nombre/peso.
	•	Con ?eventId=… veo evento y carpeta en breadcrumb + píldora “Subiendo a…”.
	•	Sidebar muestra Evento actual y sus carpetas primero; “Sin carpeta” se entiende.
	•	Al seleccionar varias fotos aparece barra de acciones clara.
	•	Chips de filtros visibles y removibles, con contadores que cambian al aplicarlos.
	•	Estados vacíos hablan claro y ofrecen acción (“Limpiar filtros”, “Elegí evento”).
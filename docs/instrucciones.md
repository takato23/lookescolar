Necesito que me expliques el diseño en detalle y que me digas exactamente qué archivos y componentes intervienen, así te doy feedback y podemos implementarlo sin trabas.

1) Objetivo (en tus palabras)
	•	Qué tiene que lograr la galería (familias y pública) en una frase cada una.
	•	Qué cambia respecto a lo actual (2–4 bullets).

2) Wireframe simple (mobile primero + desktop)
	•	Un diagrama sencillo (ASCII o imagen) con:
	•	Header (título, breadcrumbs si corresponde).
	•	Grid/listado (cómo se ve cada card).
	•	CTA flotante del carrito.
	•	Modal de imagen (acciones dentro).
	•	Estados vacíos/errores y “cargando”.
	•	Aclarar espaciados, tamaños de fuente y jerarquía visual.

3) Piezas de UI y archivos (lista exacta)

Especificá rutas y archivos (existentes o nuevos) y su rol:
	•	Página pública /gallery/[eventId]
	•	app/gallery/[eventId]/page.tsx (container y data fetching)
	•	components/public/PublicGallery.tsx (layout)
	•	components/public/PhotoCard.tsx (card con watermark + srcset/blur)
	•	components/public/PhotoModal.tsx (zoom + “Agregar al carrito”)
	•	components/cart/CartDrawer.tsx (carrito)
	•	components/common/SkeletonGrid.tsx (loading)
	•	components/common/EmptyState.tsx (vacío/error)
	•	Página por token /f/[token]
	•	app/f/[token]/simple-page.tsx (container)
	•	Reutiliza los mismos componentes que la pública cuando aplique.
	•	Store/estado
	•	stores/cart.store.ts (qué keys/acciones expone)

Indicá si alguno de estos ya existe con otro nombre y cuál reemplaza a cuál.

4) Props/contratos de cada componente (breve)

Para cada componente, listá props clave y eventos. Ejemplo:
	•	PhotoCard
	•	photo: { id, previewUrl, watermarkUrl, width, height, approved }
	•	onSelect(photoId) / onOpen(photoId)
	•	CartDrawer
	•	items: Array<{ photoId, qty, unitPrice }>
	•	onCheckout() → redirige a MP

5) Comportamiento y flujo
	•	Añadir al carrito: desde card y desde modal (qué feedback se muestra).
	•	Carrito: ver, cambiar cantidades, subtotal/total, moneda.
	•	Checkout MP: qué endpoint llama y qué hace la UI mientras redirige.
	•	Post-pago: a qué páginas llega (success/pending/failure) y qué mensaje exacto ve el usuario.

6) Imágenes (lo más importante)
	•	Siempre previews con watermark fuerte diagonal y repetido (“LOOK ESCOLAR – VISTA PREVIA”).
	•	Nunca originales.
	•	srcset/sizes para móvil, decoding="async", blur placeholder.
	•	Tamaño objetivo y peso aproximado (p. ej. 1600px máx; 120–250 KB; WebP).
	•	Política de expiración de URLs firmadas (p. ej. ≤ 15 min).

7) Accesibilidad y rendimiento (específico)
	•	Roles ARIA en grid, modal, drawer; foco accesible.
	•	Skeletons/empty states, manejo de errores (texto exacto en español).
	•	Scroll/restauración de posición al volver del modal.

8) Endpoints exactos que usa cada pantalla

Para cada vista, listá las llamadas con ejemplo:
	•	GET /api/gallery/{eventId}?page=&limit= → shape esperado de respuesta.
	•	GET /api/family/gallery-simple/{token} → shape.
	•	POST /api/family/cart?action=calculate|validate → body y respuesta.
	•	POST /api/family/checkout → body y respuesta (con redirectUrl).
	•	Cualquier otro (price-list, etc.).

9) Textos finales (copys)
	•	Títulos, botones, vacíos (“Aún no hay fotos disponibles”), errores y toasts.
	•	Texto del watermark (confirmar exactamente: “LOOK ESCOLAR – VISTA PREVIA”).

10) Aceptación (checklist corto)
	•	Solo previews con watermark; no originales.
	•	Móvil fluido: carga con blur + tamaños responsivos.
	•	Agregar varias fotos al carrito y total correcto.
	•	Redirección a MP y retorno con orden actualizada por webhook.
	•	Estados vacíos/errores visibles y en español.
	•	Accesible: modal/drawer con foco y Escape funcionando.

Extra: Si podés, adjuntá un árbol de archivos final (file tree) y marcá qué es nuevo y qué se borra. Con eso te doy OK y lo implementamos directo.

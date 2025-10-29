🎯 Tu Visión: De App Escolar → Plataforma Fotográfica Universal
## Modernización estilo Pixieset — Guía rápida
- **Paleta primaria**
  - Azul profundo `#1f2a44` (brand base, headers, CTA principal)
  - Menta suave `#62e2a2` (acento principal para botones secundarios, badges)
  - Marfil frío `#f5f7fa` (fondos neutros, secciones claras)
  - Gris humo `#d0d5dd` (borders, dividers, inputs)
  - Grafito `#101828` (texto principal, iconografía oscura)
- **Tipografía**
  - Titulares: `'Outfit', 'Inter', 'system-ui', sans-serif` (peso 500-600)
  - Cuerpo y UI: `'Inter', 'system-ui', sans-serif` (peso 400-500)
  - Jerarquía: h1 48/56, h2 36/44, h3 24/32, párrafo 16/24, microcopy 14/20.
- **Espaciado base**
  - Escala 4px: 4 (xs), 8 (sm), 12 (md), 16 (lg), 24 (xl), 32 (2xl), 48 (3xl), 64 (4xl).
  - Layout desktop: contenedor máx. 1200px, gutters laterales 32px.
  - Layout mobile: paddings horizontales de 16px, secciones apiladas con 32px entre bloques.
- **Componentes clave**
  - Botón primario: fondo `#1f2a44`, texto claro, bordes 9999px, sombra `0 10px 30px rgba(31,42,68,0.2)`.
  - Botón secundario: fondo `#62e2a2`, texto `#101828`, hover a `#4ed495`.
  - Cards: fondo blanco, borde `1px solid #d0d5dd`, radio 16px, padding 24-32px, titular + copy + CTA.
- Inputs: borde 1px `#d0d5dd`, foco con halo menta `0 0 0 4px rgba(98,226,162,0.25)`.

## 2025-10-28 — /admin/photos como hub protagonista
- Eliminamos la hero “Nuevo panel unificado” y ahora la vista carga directo la cuadrícula, con el layout extendiéndose en un contenedor limpio sin gradientes superpuestos.
- Sidebar comprimido a ~220 px con tarjetas livianas, tipografía más sutil y acciones en formato chip/icono para reducir ruido.
- El inspector pasó a ser un panel flotante plegable: solo aparece al seleccionar fotos, dejando 70‑80 % del viewport para la grilla por omisión.
- Cabecera en dos niveles estilo Pixieset, con filtros compactos, CTA de subida redondeada y métricas de egress/selección alineadas a la derecha.
- Ajustes de clases Tailwind revisados en modo oscuro para mantener contraste (bordes, badges y overlays) y asegurar comportamiento estable en ≥1280 px.

### 2025-10-28 — Layout inmersivo activado
- `AdminLayout` ahora expone `AdminLayoutProvider` y el hook `useAdminLayout` para habilitar/deshabilitar header, sidebar y nav móvil por ruta (fotos se renderiza sin chrome legacy).
- `/admin/photos/layout.tsx` fuerza el modo `immersive`, aplica gradientes oscuros estilo Pixieset y asegura `main` a pantalla completa con overflow controlado.
- `app/admin/photos/page.tsx` adopta el shell vitrificado (blurs + bordes suaves), mantiene el CTA de regreso con botón modernizado y extiende la grilla a `flex-1` para ocupar el viewport completo.
- `components/admin/AdminFloatingNav.tsx` suma una barra “liquid glass” persistente con navegación principal (Dashboard, Eventos, Fotos, etc.) animada con `framer-motion`.

### 2025-10-28 — /admin/events Pixieset refresh
- Sustituimos `EventsPageClean` por un grid panorámico “liquid glass” con tarjetas métricas, barras de progreso (finalización/conversión) y acciones directas (`Abrir`, `Biblioteca`, `Tienda Pixieset`, `Vista rápida`).
- La cabecera adopta hero translúcido + CTA dual (“Crear evento” y “Activar tienda Pixieset”), sincronizada con los filtros compactos (estado, rango de fechas, búsqueda y toggle de vista).
- Se unifica la paginación infinita con carga en lotes, sentinel observable y botón “Actualizar”; la lista deja de depender de virtualización legacy y ahora muestra métricas reales del API.
- Quick actions reutilizan `EventQuickActionsDialog` y el botón de eliminación con feedback `toast`; ante fallbacks del servicio se muestran banners contextuales en el hero.
- El hero ahora responde al contexto: destaca la búsqueda activa, filtros de estado/fecha y muestra el ratio visible/total con chips dinámicos, alternando el CTA “Limpiar filtros” cuando corresponde.
- El layout ocupa el ancho completo (`max-w-screen-2xl`) y el grid usa `auto-fit` para aprovechar pantallas ≥1440 px sin columnas vacías; los filtros se fijan (sticky) bajo el hero para mantenerlos siempre accesibles.

## Layout propuesto — Landing estilo Pixieset
- **Hero minimalista**
  - Desktop: hero full-width con foto difuminada (blur + overlay `rgba(16,24,40,0.65)`), headline centrado 48/56, subtítulo 18/28, CTA principal y secundario alineados.
  - Mobile: apila headline y CTA, altura mínima 60vh, evita imagen pesada (usa gradiente `#1f2a44 → #101828`).
- **Sección “Qué obtienen”**
  - Tres cards en grid 3 columnas (desktop) con icono circular menta, título 20/28, bullet breve.
  - Mobile: carrusel horizontal o stack vertical con spacing 24px.
- **Galería de ejemplos con mockups**
  - Desktop: carrusel 3-up con mockups enmarcados y overlay suave; caption inferior.
  - Mobile: carrusel swipeable 1-up, altura controlada 320px, indicadores puntuales.
- **CTA final**
  - Background marfil `#f5f7fa`, titular 32/40, texto corto y formulario de captura email + botón.
- **Footer compacto**
  - Dos columnas desktop (branding + links rápidos), una columna mobile, usar texto 14/20, bordes sutiles.

## Flujos legacy verificados (octubre 2025)
- `/admin/events/[id]?folder_id=...&student_id=...` conserva filtros al llevar al CTA "Ver galería en vivo" gracias a la normalización camelCase/snake_case.
- Al ingresar desde `/admin/store-settings` o `/admin/publish`, se mantiene el `event_id` y los filtros; comunicar que ahora hay un paso visual intermedio en lugar de redirect automático.
- `includeChildren`/`include_children`, `code_id`, `subject_id` continúan sincronizados mediante `alignParam` y `setIfPresent`.
- Gap resuelto: si el query incluye `redirect=1`, `auto=view` o `view=gallery`, la vista hace redirect inmediato a `/admin/photos`; documentar esta convención para integraciones.

## Componentes modernos reutilizables
- **Button**: `variant="modern"` + `modernTone="primary|secondary|ghost"` comparte tokens. Los alias `modern-primary`, etc. funcionan como fallback. Ahora acepta `asChild` (usa `Slot`) para envolver directamente un `<Link>` y evitar botones anidados.
- **Card**: `variant="modern"` admite `modernTone="neutral|tinted|brand"` y respeta `interactive`/`glow`.
- **Input**: `appearance="modern"` ahora soporta `size="sm|md|lg"`. Fallback `legacy` mantiene look previo.
- Los tipos `ModernTone`, `ModernCardTone`, `InputSize` están exportados para factories y theming.
- **SectionHeader** (`components/layout/SectionHeader.tsx`): helper para eyebrow, título y descripción consistente; acepta `align="center" | "left"` y reduce repetición en landing y futuras vistas.
- **PhotoAdmin Pixieset layout**: el sidebar usa `FolderTreePanel` con nuevo skin (colecciones, resaltados, botones chips); recuerda pasar `selectedEventName` para mostrar el contexto.

## Microinteracciones suaves (200 ms)
- **Elevaciones discretas**: `hover:-translate-y-0.5 transition-transform duration-200 ease-out`; opcional `whileHover={{ scale: 1.02 }}` con Framer Motion.
- **Fades en overlays**: `transition-opacity duration-200`, `group-hover:opacity-100`, respetar `prefers-reduced-motion`.
- **Focus accesible**: `focus-visible:ring-2 focus-visible:ring-[#62e2a2]/50` + `focus-visible:ring-offset-2 ring-offset-[#f5f7fa]`.
- **Carruseles suaves**: `transition={{ duration: 0.2, ease: 'easeOut' }}`, `layout` para crossfade.
- **Inputs reactivos**: `hover:shadow-[0_18px_36px_-24px_rgba(16,24,40,0.2)]` + `focus-visible:border-[#62e2a2]`; animar iconos auxiliares en 160 ms.
- **Contraste modo claro**: usar al menos `bg-white/18` sobre fondos hero oscuros, texto principal en `#fff` o `text-white/90`, y badges con `border-white/18` para cumplir AA.
- **Sidebar admin**: iconos y labels deben usar `text-[#1f2a44]` en modo claro y `dark:text-gray-200` para mantener legibilidad sobre superficies vítreas.

## Plan de pruebas recomendado
- **Automatizadas**: `npm run lint`, `npm run typecheck`, `npm run test:components`; añadir smoke Playwright para `/admin/events/:id` que valide CTA y link público.
- **Manuales**: deep-links con `folder_id`/`student_id`, flujo desde store/publish, contraste en modo oscuro, navegación por teclado, performance con eventos de alto volumen.
- **Seguimiento**: monitorear click-through admin → galería; si cae >5 %, activar fallback de redirect automático.

¿Qué es White Label?
White Label = Marca Blanca = "Tu Propia App"
Significa que cualquier fotógrafo puede usar tu plataforma como si fuera su propia aplicación, completamente personalizada con:
Su logo y branding
Sus colores y diseño
Sus precios y paquetes
Sus tipos de eventos
Su nombre de dominio
Sus métodos de pago
Tu Situación Actual
Tienes: Una app especializada en fotografía escolar
✅ Gestión de eventos escolares
✅ Galerías con filtros por grado
✅ Paquetes para fotos escolares
✅ Integración con Mercado Pago
El Problema: Solo sirve para fotografía escolar. Si un fotógrafo de bodas quiere usarla, tiene que adaptar todo manualmente.
Tu Meta: Plataforma White Label
Quieres que tu app se convierta en: La base tecnológica que cualquier fotógrafo puede usar como punto de partida, pero que se ve y funciona como si ellos mismos la hubieran creado.
🚀 Cómo se Transforma tu App
Antes (Especializada)
Después (White Label)
💡 Qué Necesitas Implementar
1. Sistema de Branding Completo
Logo, colores, fuentes personalizables
Nombre de la empresa en toda la interfaz
Dominio personalizado (subdominio o dominio propio)
2. Tipos de Evento Dinámicos
No hardcodeados (como ahora con "jardín", "secundaria")
Configurables por cliente: Bodas, Bautismos, Cumpleaños, Corporativos, etc.
3. Paquetes y Precios Dinámicos
Cada cliente define sus propios paquetes
Sus propios precios
Sus propias descripciones
4. Multi-tenancy
Cada cliente tiene su propia "instancia" de la app
Datos completamente separados
Configuración independiente
📈 Tu Modelo de Negocio
B2B SaaS (Business to Business Software as a Service)
Clientes: Fotógrafos profesionales
Producto: Plataforma white label de gestión fotográfica
Precio: Suscripción mensual/anual por fotógrafo
Beneficios para Ti
Recurrente: Ingresos mensuales predecibles
Escalable: Una base de código sirve para todos
Bajo mantenimiento: Los clientes personalizan, no modificas código
Expansible: Agregas features que benefician a todos
Beneficios para Tus Clientes (Fotógrafos)
No desarrollan: Usan tu tecnología probada
Más baratos: Que contratar desarrollo custom
Más rápidos: Listos para usar en días, no meses
Actualizaciones: Reciben mejoras automáticamente
🎯 Cómo Contarlo
Tu Pitch Simplificado
"Tengo una plataforma completa de gestión fotográfica que empecé para eventos escolares, pero ahora la estoy convirtiendo en white label para que cualquier fotógrafo pueda usarla como su propia app.
En lugar de que cada fotógrafo gaste $10,000-50,000 en desarrollo custom, pueden suscribirse a mi plataforma por $50-200/mes y personalizarla completamente con su branding, precios y tipos de eventos."*
Ejemplos de Casos de Uso
Fotógrafo de Bodas:
Configura paquetes: "Sesión previa", "Día de la boda", "Álbum digital"
Personaliza colores: Blanco, dorado, rosa
Branding: "Ana & Pablo Photography"
Fotógrafo Corporativo:
Configura paquetes: "Team Building", "Eventos corporativos", "Headshots"
Personaliza colores: Azul corporativo, gris
Branding: "EmpresaCorp Photography"

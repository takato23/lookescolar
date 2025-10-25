# Admin Events Dashboard Refresh

## Component Architecture
- `EventsPageClean` orquesta la lógica existente y monta los nuevos subcomponentes.
- `components/admin/events/EventCard.tsx` renderiza el grid avanzado con miniatura, métricas y acciones contextuales.
- `components/admin/events/EventListRow.tsx` ofrece la vista lista densa conectada al virtual list.
- `components/admin/events/EventStatsSummary.tsx` concentra los KPIs globales con tooltips e iconografía coherente.
- `components/admin/events/EventQuickActionsDialog.tsx` implementa la side sheet de “vista rápida” con acciones clave.
- `components/admin/events/EventThumbnail.tsx` resuelve thumbnails, skeletons e iniciales de fallback.
- `components/admin/events/EventSkeleton.tsx` provee placeholders accesibles durante cargas y filtros.

## Visual Tokens
### Espaciado
| Token | Tailwind | Uso |
| --- | --- | --- |
| `spacing-12` | `gap-3`, `px-3` | Separación en métricas y celdas.
| `spacing-16` | `p-4`, `gap-4` | Padding principal en tarjetas y filtros.
| `spacing-24` | `p-6` | Contenedores mayores, header y sheet.
| `spacing-32` | `py-8` | Ritmo vertical entre secciones.
| `spacing-40` | `px-10` | Reservado para pantallas XL en contenedores maestros.

### Colores
| Token | Tailwind | Aplicación |
| --- | --- | --- |
| `--card-bg` | `bg-card/70`, `bg-background/80` | Fondos translúcidos consistentes con el dashboard.
| `--border-muted` | `border-border/60` | Bordes suaves en tarjetas, filtros y diálogos.
| `--accent-primary` | `text-primary-600`, `bg-primary/10` | Acciones activas, iconografía principal.
| `--accent-success` | `bg-emerald-50`, `text-emerald-700` | Badge de eventos activos.
| `--accent-warning` | `bg-amber-50/70`, `text-amber-700` | Advertencias de eliminación.
| `--accent-info` | `bg-sky-50`, `text-sky-700` | Estado completado.

### Tipografía
| Token | Tailwind | Uso |
| --- | --- | --- |
| `heading-lg` | `text-3xl font-semibold tracking-tight` | Título "Eventos escolares".
| `heading-md` | `text-xl font-semibold` | Encabezados en la sheet lateral.
| `label-xs` | `text-xs uppercase tracking-[0.2em] font-medium` | Etiquetas de secciones y métricas.
| `body-sm` | `text-sm text-muted-foreground` | Textos secundarios.
| `metric-value` | `text-base md:text-2xl font-semibold` | Valores numéricos en estadísticas.
| `metric-label` | `text-[0.65rem] uppercase tracking-[0.16em] font-medium` | Etiquetas de métricas en grid/lista.
| `metric-value-compact` | `text-sm font-semibold group-data-[density=compact]:text-[0.95rem] group-data-[density=dense]:text-xs` | Variante adaptable para densidades menores.

### Densidad de filas
| Variante | Tailwind base | Notas |
| --- | --- | --- |
| `comfortable` | `px-4 py-3 md:px-5 xl:px-6 gap-4` | Uso por defecto; respeta tokens `spacing-16` y `spacing-24`.
| `compact` | `px-3 py-2 md:px-4 gap-3` | Pensada para tablas en viewports ≥1024 o listas largas.
| `dense` | `px-2 py-2 md:px-3 gap-2` | Preparada para modo resúmenes o embed futuros; mantener accesibilidad.

### Breakpoints clave
- `<768px`: métricas se apilan en 2 columnas para reducir scrolling vertical; botones secundarios permanecen colapsados.
- `≥1440px (xl)`: paddings se amplían (`xl:px-6`, `2xl:p-8`) y la grilla de métricas habilita hasta 5 columnas cuando hay espacio disponible.

## Interacciones y Accesibilidad
- Clases `motion-safe:*` limitan animaciones en usuarios con reducción de movimiento.
- Las tarjetas y filas aplican transiciones de elevación suaves (`hover:-translate-y` + sombra) sin afectar rendimiento gracias a `transform`.
- Los elementos de métrica reciben `tabIndex` y `focus-visible:ring` para navegación por teclado.
- `AlertDialog` reemplaza confirmaciones bloqueantes y soporta teclado (`Enter`, `Esc`).
- `Sheet` lateral habilita vista rápida con cierre por `Esc`, botón dedicado y `aria` descriptiva.
- Tooltips Radix envuelven iconos métricos para clarificar significado.
- Estados `focus-visible` añadidos a filas, botones y tarjetas para WCAG 2.1 AA.
- Skeletons específicos (`EventGridSkeleton`, `EventListSkeleton`) preservan layout durante cargas.
- Las variantes `data-density` permiten modos compacto/denso sin duplicar componentes; futuras preferencias solo deben ajustar el atributo.
- El `SheetContent` usa `animate-in`/`slide-in-from-right` y respeta `motion-safe`.

## Lógica Conservada
- Se mantienen debounce, filtros y paginación original; el refactor es puramente visual/UX.
- Eliminación optimista refresca router y sincroniza lista local.
- Detección de inventario (`photos`/`subjects`) controla advertencias tanto en quick view como en confirmación.
- `EventThumbnail` busca secuencialmente `thumbnail`, `cover`, `preview` antes de usar iniciales.

## QA Manual Recomendado
1. ✅ Cambio de filtros y vista (grid/lista): transiciones mantienen focus-ring, skeletons siguen visibles.
2. ✅ Vista rápida: apertura/cierre con `Esc`, hover en botones secundarios desliza 2px sin jitter.
3. ⚠️ Eliminación con inventario: advertencia se mantiene; revisar copy final cuando se habilite conversión.
4. ✅ Navegación por teclado: métricas en tarjetas/filas son focusables; densidad compacta conserva orden lógico.
5. ✅ Viewport <768px: grillas de métricas en 2 columnas, quick actions ocupan 100% ancho.
6. ✅ Viewport ≥1440px: paddings ampliados y fila lista admite hasta 5 métricas sin recorte.

## Storybook (propuesta mínima)
- `EventCard`
  1. Estado por defecto (evento activo con stats completas).
  2. Evento en modo borrador (sin métricas, placeholder thumbnails).
  3. Hover + focus-visible combinado para QA de microinteracciones.
- `EventListRow`
  1. Variante `comfortable` vs `compact` (knob de densidad).
  2. Evento sin status (badge oculto) para validar layout.
  3. Estado loading reemplazado por `EventListSkeleton`.
- `EventQuickActionsDialog`
  1. Inventario presente con advertencia.
  2. Métricas secundarias completas (conversión >0).
  3. Placeholder sin datos (todos los valores en “Próximamente”).
- `EventStatsSummary`
  1. Datos reales.
  2. `isLoading` true (Skeleton grid).

## Métricas Secundarias
- La sheet lateral resume `tasa de finalización`, `conversión a compra` y `pedidos totales`.
- Placeholders: mostrar “Sin datos” cuando es 0 o null, “Próximamente” cuando analítica aún no sincroniza.
- Ajustar backend para enviar `conversion_rate_percent` antes de activar historias objetivo.

## Próximos Pasos Sugeridos
1. Publicar historias Storybook para los nuevos componentes.
2. Añadir métricas de conversión o links a analytics dentro de la quick view.
3. Instrumentar telemetría (aperturas, borrados, uso de quick actions) para validar adopción.

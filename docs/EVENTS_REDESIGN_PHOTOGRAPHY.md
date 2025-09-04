# Rediseño de Eventos (Fotografía) — inspirado en Pixieset, integrado con AdminFotos

Objetivo: unificar “Eventos” con gestión de fotos y tienda en una interfaz clara, moderna y estable. Se replica la idea de `Carpeta > Colección > (sub)Carpeta/Álbum` con controles simples de privacidad, descargas y venta.

---

## 1) Arquitectura de Información

- Nivel 0: `Eventos` (lista)
- Nivel 1: `Evento` (detalle) — pestañas: Resumen • Colecciones • Alumnos • Pedidos • Ajustes
- Nivel 2: `Colecciones` dentro del evento (p. ej., Primaria, Secundaria, Jardín)
- Nivel 3: `Álbum/Carpeta` dentro de cada colección (p. ej., Sala Roja, 5to A, Curso/División)

Estados: Borrador → En subida → Publicada → Cerrada → Archivada

Accesos rápidos: “Abrir en AdminFotos” (gestor 3 columnas) en Resumen y Colecciones.

---

## 2) Mapeo con FileSystem (AdminFotos)

Estructura recomendada:

```
/Eventos/
  /2025_Escuela_Normal/           ← Evento (carpeta raíz vinculada)
    /Primaria/                    ← Colección
      /Sala_Roja/                 ← Álbum/Carpeta
    /Secundaria/                  ← Colección
      /5to_A/                     ← Álbum/Carpeta
```

- El índice existente de AdminFotos agrega `evento_id` y `alumno_id?` a nivel de archivo/carpeta. 
- “Recontar” sincroniza totales (fotos, huérfanas, por alumno) leyendo el índice, no el FS crudo.
- Desde el evento se puede “Abrir en AdminFotos” con deep‑link a la ruta raíz o a una colección específica.

---

## 3) Modelo de datos mínimo (Supabase)

Tablas sugeridas (claves abreviadas):

- `events` (id, nombre, fecha, estado, carpeta_raiz, url_galeria)
- `event_collections` (id, event_id, nombre, slug, ruta_relativa, orden)
- `event_albums` (id, collection_id, nombre, slug, ruta_relativa, orden)
- `event_gallery_settings` (scope: `event|collection|album`, scope_id, visibility, password_hash?, show_on_homepage, watermark_id?, auto_expiry_at, email_registration boolean)
- `event_download_settings` (scope, scope_id, enabled, sizes jsonb, pin_hash?)
- `event_store_settings` (scope, scope_id, enabled, price_sheet_id?, store_status, require_payment_method boolean)
- `students` (id, event_id, nombre, curso_division, codigo, email?)
- `orders` / `order_items` (ya presentes; agregar `event_id`, `student_id?` si faltan)

Notas:
- `scope` permite heredar/override: si una colección/álbum no define ajustes, hereda del evento.
- Slugs únicos por nivel. `ruta_relativa` mapea 1:1 al FS.
- PIN/Password siempre almacenados hasheados (bcrypt/argon2).

---

## 4) Navegación y rutas (Next.js)

```
app/admin/events/page.tsx                       ← Lista
app/admin/events/[id]/page.tsx                  ← Resumen
app/admin/events/[id]/collections/page.tsx      ← Grid de colecciones
app/admin/events/[id]/collections/[cid]/page.tsx← Vista colección (álbumes)
app/admin/events/[id]/students/page.tsx         ← Alumnos
app/admin/events/[id]/orders/page.tsx           ← Pedidos
app/admin/events/[id]/settings/(tabs)/
  general/page.tsx  privacy/page.tsx  download/page.tsx  store/page.tsx
```

Componentes clave: Header contextual del evento, Cards de métricas, Grid de colecciones/álbumes, Tabla reutilizable, Panel de ajustes con toggles.

---

## 5) Wireframes (ASCII)

### 5.1 Lista de Eventos
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Eventos                                                [Nuevo evento]    │
├──────────────────────────────────────────────────────────────────────────┤
│ Buscar…  [Estado] [Fecha]                                               │
├──────────────────────────────────────────────────────────────────────────┤
│ • Escuela Normal 2025  12 Oct 2025  En subida                           │
│   Pedidos: 24  Alumnos: 312  Sin asignar: 81   [Abrir] [⋯]              │
│ • Fotocomunión Mayo     05 May 2025  Publicada                           │
│   Pedidos: 67  Alumnos: 45   Sin asignar: 0    [Abrir] [⋯]              │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Resumen de Evento
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Eventos / Escuela Normal 2025         Estado: En subida   [⋯]         │
│ 12 Oct 2025 · Sede: Escuela Normal                                     │
│ [Abrir en AdminFotos] Carpeta: /Eventos/2025_Escuela_Normal             │
├──────────────────────────────────────────────────────────────────────────┤
│ Pedidos: 24   Alumnos: 312   Fotos: 2.480   Sin asignar: 81             │
│ Galería: En preparación  URL: https://…  [Copiar] [Publicar galería]    │
├──────────────────────────────────────────────────────────────────────────┤
│ Atajos                                                                  │
│ • Importar alumnos (CSV)  • Crear subcarpetas por nivel  • Recontar     │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Colecciones (Grid tipo Pixieset)
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Colecciones  [Nueva colección]                                           │
├──────────────────────────────────────────────────────────────────────────┤
│ [Thumb 2x2]  Primaria       15 álbumes  • 1 Sep 2025  [Abrir]            │
│ [Thumb 2x2]  Secundaria     28 álbumes  • 1 Sep 2025  [Abrir]            │
│ [Thumb 2x2]  Jardín         12 álbumes  • 1 Sep 2025  [Abrir]            │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Colección → Álbumes (lista)
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Colecciones / Primaria         [Abrir en AdminFotos]  [Recontar]       │
├──────────────────────────────────────────────────────────────────────────┤
│ Álbum             Fotos   Alumnos  Estado   Privado  Descarga  Tienda    │
│ Sala Roja         320     26       Borrador  🔒       ON        ON        │
│ 6to A             540     28       Pública   —        OFF       ON        │
│ 6to B             498     30       Pública   —        ON        OFF       │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Ajustes tipo Pixieset (panel lateral + contenido)
Layout: barra lateral a la izquierda (iconos + etiquetas), contenido a la derecha.

#### General
```
URL de colección  [ secundaria ]
Tags de categoría [ escuela, otoño ]
Marca de agua (por defecto)  [Sin watermark ▾]
Auto-ocultar (expiry) [fecha opcional]
Email registration [On/Off]
```

#### Privacy
```
Collection Password  [ ****** ] [Generar]
Show on Homepage     [On/Off]
Nota: si pertenece a una carpeta, hereda visibilidad a menos que se fuerce.
```

#### Download
```
Photo Download       [On/Off]
Sizes permitidos     [3600px] [2048px] [1024px] [640px]
Download PIN (4 dígitos) [ **** ] [Reset]
```

#### Store
```
Store Status         [On/Off]
Price Sheet          [ My Price Sheet ▾ ]
Checkout             [Conectar método de pago]  (si falta)
```

---

## 6) Flujo “Wizard” de Tienda (mínimo viable)

Paso 1 — Revisar productos: seleccionar listas de precios existentes (documento `UNIFIED_STORE_SYSTEM.md`).

Paso 2 — Configurar checkout: conectar método de pago (Stripe/MercadoPago) y moneda/impuestos. Hasta que esté conectado, mostrar alerta “checkout no disponible”.

Cada colección/álbum puede habilitar o no la venta y asociar una `price_sheet_id`.

---

## 7) Controles de privacidad y descargas (herencia)

- Ajustes a nivel `evento` → heredan `colecciones` → heredan `álbumes`.
- Cualquier nivel puede hacer override explícito.
- Password y PIN se almacenan hasheados. Botón “Generar” produce valores seguros (server action).

---

## 8) Integración con Alumnos y Pedidos

- Vista de Álbum muestra alumnos asignados y pedidos relacionados.
- Importar alumnos por CSV (validación con zod): nombre, curso/división, código, email.
- Asignación automática: sugerencias por nombre de carpeta/archivo (normalización).

---

## 9) Diseño visual y usabilidad

- Estética limpia, con “1 cm” más de aire: paddings de 24–32px en paneles; cards con 12–16px internos.
- Tipografía: títulos `font-semibold`, tamaño 18–20px; cuerpo 14–16px.
- Accesibilidad: foco visible, atajos teclado en grids/tablas, contraste AA.
- Rendimiento: listas virtualizadas, filtros server‑side, UI optimista con rollback.

---

## 10) Validación y criterios de avance

Tareas (3 fotógrafas):
- Crear evento y vincular carpeta < 2 min
- Crear colección y álbum vinculado < 60 s
- Importar alumnos (CSV) sin errores < 3 min
- Ajustar privacidad/descarga/tienda en una colección < 60 s
- Publicar y copiar URL < 30 s

Éxito: ≥ 90% sin ayuda; fotos sin asignar < 5% tras primera pasada; exportes de pedidos sin correcciones manuales.

---

## 11) Checklist previa (6 puntos)

1) Definir estados y herencia de ajustes (evento→colección→álbum)
2) Acordar estructura de carpetas y slugs
3) Campos CSV y reglas de validación de alumnos
4) Lista de tamaños de descarga permitidos y política de PIN
5) Price Sheet por defecto y métodos de pago disponibles
6) Deep‑link AdminFotos + botón “Volver al evento”

---

## 12) Roadmap de implementación (fases)

Fase 1: Resumen + Colecciones + Deep‑link a AdminFotos + Recontar.

Fase 2: Ajustes (General/Privacy/Download) con herencia, PIN/Password.

Fase 3: Alumnos (CSV, asignación rápida, sugerencias).

Fase 4: Store (wizard mínimo, price sheet, estado de checkout).

Fase 5: Pedidos (tabla con filtros, exportes para laboratorio).

---

## 13) Server actions (borrador)

- `linkEventFolder(eventId, path)`
- `createCollection(eventId, data)` / `createAlbum(collectionId, data)`
- `recountEventStats(eventId)`
- `updateSettings(scope, scopeId, payload)`
- `generatePassword(scope, scopeId)` / `resetDownloadPin(scope, scopeId)`
- `toggleStore(scope, scopeId, enabled)` / `setPriceSheet(scope, scopeId, id)`

Todas con validación `zod` y auditoría básica.

---

## 14) Notas y dependencias

- Reutilizar componentes de tabla y grid existentes.
- Sincronizar con `UNIFIED_STORE_SYSTEM.md` para no duplicar lógica de tienda.
- Mantener la navegación rápida a AdminFotos (3 columnas) como “fuente de verdad” del FS.


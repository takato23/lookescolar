# 🎨 Mockups Sandbox

Este directorio contiene componentes y páginas de demostración diseñados como un **sandbox seguro** para probar interfaces de usuario sin afectar el código de producción.

## 📋 Propósito

- **Desarrollo seguro**: Permite experimentar con nuevos diseños sin riesgo
- **Prototipado rápido**: Crear interfaces para validación antes de implementar
- **Testing de UI**: Probar componentes aislados con datos mock
- **Documentación visual**: Demostrar patrones de diseño y componentes

## 🏗️ Estructura

```
app/admin/_mockups/
├── README-mockups.md          # Este archivo
├── icons.tsx                  # Íconos SVG inline reutilizables
├── MobileNav.tsx             # Barra de navegación móvil
├── PhotoCard.tsx             # Tarjeta de foto individual
├── PhotosFilters.tsx         # Filtros, búsqueda y controles
├── Fab.tsx                   # Botón flotante de acción
└── [otros componentes...]

app/admin/mockups/
├── photos-mobile/
│   └── page.tsx              # Demo de gestión de fotos móvil
└── [otras demos...]

public/mockups/
└── photos/                   # Imágenes placeholder para demos
```

## 🔒 Reglas de Seguridad

**IMPORTANTE**: Este es un entorno aislado que NO debe:

1. ❌ Importar componentes de producción (`/components/` reales)
2. ❌ Conectar a APIs reales o base de datos
3. ❌ Modificar rutas de producción existentes
4. ❌ Usar stores/contextos globales de la aplicación

**SÍ debe**:

1. ✅ Usar solo componentes locales del directorio `_mockups/`
2. ✅ Trabajar con datos mock estáticos
3. ✅ Usar rutas bajo `/admin/mockups/`
4. ✅ Mantener dependencias mínimas (solo Tailwind)

## 🎯 Demos Disponibles

### 📱 Mobile Photos Demo
**Ruta**: `/admin/mockups/photos-mobile`

**Descripción**: Recreación de la pantalla de gestión de fotos móvil con:
- Navegación móvil con hamburger menu
- Barra de búsqueda con debounce
- Chips de filtrado por estado
- Toggle de selección múltiple
- Grilla responsiva de fotos
- FAB con contador de selección

**Características**:
- Marco móvil simulado (430px)
- Filtros funcionales en memoria
- Selección múltiple con estado
- Interfaz completamente accesible
- Datos mock con 10 fotos de ejemplo

## 🎨 Tokens de Diseño

Los mockups siguen las convenciones del sistema:

- **Colores**: Sistema de colores Tailwind
- **Tipografía**: Clases de texto estándar
- **Spacing**: Grid 4px (Tailwind)
- **Radios**: `rounded-2xl` para cards, `rounded-full` para chips
- **Sombras**: `shadow-sm` para elevación sutil

### Estados de Color:
- 🟢 **Aprobada**: `bg-emerald-500 text-white`
- 🟡 **Pendiente**: `bg-amber-500 text-white`  
- 🔵 **Etiquetada**: `bg-blue-500 text-white`

## 🧪 Testing

Para probar las demos:

1. Ejecuta el servidor de desarrollo
2. Navega a la ruta correspondiente (ej: `/admin/mockups/photos-mobile`)
3. Interactúa con los controles para validar funcionalidad
4. Verifica responsividad en diferentes tamaños

## 🚀 Agregando Nuevas Demos

1. **Crea la página**: `app/admin/mockups/nueva-demo/page.tsx`
2. **Componentes necesarios**: Agrégalos a `app/admin/_mockups/`
3. **Datos mock**: Define arrays/objetos locales con tipos TypeScript
4. **Documenta**: Actualiza este README con la nueva demo

## 📝 Convenciones

- **Nombres**: PascalCase para componentes, kebab-case para rutas
- **TypeScript**: Tipos estrictos, interfaces explícitas
- **Accesibilidad**: `aria-*` labels, focus management
- **Responsive**: Mobile-first, breakpoints estándar
- **Estado**: `useState` local, no stores globales

---

**⚠️ Recordatorio**: Este sandbox está diseñado para desarrollo seguro. Mantén la separación entre mockups y código de producción.
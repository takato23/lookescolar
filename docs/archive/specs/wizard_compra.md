# Wizard de Compra — Especificación

## Objetivo

Implementar el flujo completo de compra para familias con selección de Opción 1/2, validación de cupo de fotos, y upsell de copias/tamaños antes del carrito final.

## Alcance (incluye/no incluye)

### Incluye
- Paso 1: Selección entre Opción 1 (1 foto) y Opción 2 (2 fotos)
- Paso 2: Selección de fotos con validación de cupo según opción elegida
- Paso 3: Upsell de copias adicionales y tamaños con precios visibles
- Paso 4: Resumen antes del carrito con subtotales en vivo
- Validación: bloqueo de "Siguiente" hasta completar cupo requerido
- Repetición permitida: misma foto 2 veces en Opción 2
- Mockups de producto: mostrar imágenes de carpeta física al elegir opción
- Estado persistente durante la sesión del wizard

### No incluye
- Integración completa con Mercado Pago (usar mocks)
- Descarga/envío de fotos físicas
- Administración de productos desde admin
- Modificación del modelo de datos existente

## Requisitos funcionales

- **RF1**: Mostrar dos opciones claras: "Opción 1 (1 foto)" y "Opción 2 (2 fotos)" con precios base
- **RF2**: Mostrar mockup de carpeta física correspondiente a cada opción
- **RF3**: En selección de fotos, validar que se complete el cupo (1 o 2) antes de continuar
- **RF4**: Permitir seleccionar la misma foto múltiples veces en Opción 2
- **RF5**: Mostrar grid de fotos con indicador visual de selección y contador
- **RF6**: En paso de upsell, mostrar copias adicionales y tamaños con precios incrementales
- **RF7**: Calcular y mostrar subtotales en tiempo real durante upsell
- **RF8**: Resumen final con breakdown de precios antes del checkout
- **RF9**: Preservar estado del wizard durante la sesión (no perder selección)
- **RF10**: Responsive design optimizado para móvil (familias usan teléfonos)

## Criterios de aceptación

**Dado** que una familia accede a la galería tokenizada  
**Cuando** ve las opciones de compra  
**Entonces** debe ver claramente "Opción 1" y "Opción 2" con precios y mockups

**Dado** que selecciona "Opción 2"  
**Cuando** está en el paso de selección de fotos  
**Entonces** el botón "Siguiente" debe estar deshabilitado hasta seleccionar exactamente 2 fotos

**Dado** que está en Opción 2  
**Cuando** selecciona la misma foto dos veces  
**Entonces** debe permitirlo y contar como 2 unidades válidas

**Dado** que completó la selección de fotos  
**Cuando** llega al paso de upsell  
**Entonces** debe ver opciones de copias adicionales con precios claros y subtotal actualizado

**Dado** que está en cualquier paso del wizard  
**Cuando** recarga la página  
**Entonces** debe mantener su progreso y selecciones (sessionStorage)

**Dado** que completa el wizard  
**Cuando** llega al resumen  
**Entonces** debe ver breakdown completo: opción base + upsells + total

## Notas de UX/copy

### Microcopys
- Opción 1: "1 Foto Base - Perfecta para recordar este momento especial"
- Opción 2: "2 Fotos Base - Captura más momentos de tu hijo/a"
- Selección: "Selecciona {cupo} foto(s) - {seleccionadas}/{cupo}"
- Upsell: "¿Querés más copias o tamaños especiales?"
- Botón bloqueado: "Selecciona {faltantes} foto(s) más"

### Estados vacíos/errores
- Sin fotos disponibles: "No hay fotos disponibles para este alumno"
- Token expirado: "El link ha expirado. Contacta al colegio para obtener uno nuevo"
- Error de carga: "Error al cargar las fotos. Refresca la página"
- Selección incompleta: mensaje claro de cuántas fotos faltan

### Navegación
- Breadcrumb: "Opción → Selección → Extras → Resumen"
- Botones: "Anterior" / "Siguiente" / "Finalizar Compra"
- Indicador de progreso visual

## Riesgos y trade-offs

### Riesgos
- **Performance**: Galerías grandes (>100 fotos) pueden impactar carga inicial
- **UX móvil**: Selección múltiple en pantallas pequeñas puede ser confusa
- **Estado**: Pérdida de selección si no se persiste correctamente
- **Precios**: Hardcodear precios vs API dinámica

### Trade-offs
- **Simplicidad vs Flexibilidad**: Comenzar con 2 opciones fijas, expandir después
- **Persistencia**: sessionStorage vs localStorage vs backend
- **Mockups**: Imágenes estáticas vs componente dinámico
- **Validación**: Cliente vs servidor (comenzar cliente, agregar servidor)

## Validación (QA manual + casos edge)

### Casos felices
1. Seleccionar Opción 1 → elegir 1 foto → agregar extras → finalizar
2. Seleccionar Opción 2 → elegir 2 fotos diferentes → sin extras → finalizar  
3. Seleccionar Opción 2 → elegir misma foto 2 veces → con extras → finalizar

### Casos edge
1. **Refresh en medio del wizard**: debe mantener progreso
2. **Navegación atrás/adelante**: debe funcionar correctamente
3. **Galería vacía**: mostrar mensaje apropiado
4. **Token inválido**: redirigir con error claro
5. **Conexión lenta**: loading states apropiados
6. **Móvil horizontal/vertical**: responsive correcto

### Checklist QA
- [ ] Precios calculan correctamente en cada paso
- [ ] Botones se habilitan/deshabilitan según validación
- [ ] Imágenes cargan con lazy loading
- [ ] Selección visual clara (checkmarks, bordes)
- [ ] Textos responsive no se cortan
- [ ] Performance aceptable con 50+ fotos
- [ ] Funciona en Chrome/Safari/Firefox móvil
- [ ] Accesibilidad básica (contraste, foco)

### Métricas objetivo
- **Carga inicial**: <2s (incluye fotos)
- **Interacción**: <300ms entre pasos
- **Selección**: feedback visual <100ms
- **Cálculo precios**: <50ms
- **Tamaño bundle**: +50KB máximo para wizard

## Estructura de archivos sugerida

```
app/f/[token]/
├── page.tsx (entrada con wizard)
├── wizard/
│   ├── step-options.tsx
│   ├── step-selection.tsx  
│   ├── step-upsell.tsx
│   └── step-summary.tsx
components/gallery/
├── photo-grid.tsx
├── photo-selector.tsx
└── price-calculator.tsx
lib/
├── wizard-store.ts (zustand/context)
└── pricing.ts (lógica de precios)
```

## Datos mock requeridos

```typescript
// Opciones base
const BASE_OPTIONS = [
  { id: 1, name: "Opción 1", photos: 1, price: 2500, mockupUrl: "/mockups/option1.jpg" },
  { id: 2, name: "Opción 2", photos: 2, price: 3800, mockupUrl: "/mockups/option2.jpg" }
];

// Upsells
const UPSELLS = [
  { id: "extra-copy", name: "Copia adicional", price: 800 },
  { id: "size-large", name: "Tamaño grande (15x20cm)", price: 1200 },
  { id: "size-poster", name: "Poster (30x40cm)", price: 2000 }
];
```
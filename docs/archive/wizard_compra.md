# Wizard de compra — Opción 1/2 + Upsell

## 1) Objetivo
Que las familias puedan elegir un **pack** (Opción 1 u Opción 2), seleccionar la(s) foto(s) requeridas (permitir repetir en Opción 2) y, antes del carrito, **agregar copias/tamaños** con precios visibles.

## 2) Alcance
**In**
- Paso 1: selector de Opción (1/2) con resumen de lo que incluye.
- Paso 2: picker de fotos; en Opción 2 exigir 2 selecciones (pueden ser la misma).
- Paso 3: upsell de copias/tamaños con subtotales en vivo.
- Paso 4: pasar al carrito/checkout (Mercado Pago) con payload consistente.

**Out**
- Entrega física/digital (se resuelve fuera del wizard).
- Precios por colegio/evento (quedan con defaults globales).

## 3) Requisitos funcionales
- Bloquear “Siguiente” hasta cumplir el cupo (1 u 2 fotos).
- Permitir **dos veces la misma foto** en Opción 2.
- Mostrar **mockup**/imagen de producto al cambiar de Opción (si hay).
- Subtotales actualizados al marcar copias/tamaños; total se envía al carrito.

## 4) Criterios de aceptación (G/W/T)
- **Dado** que elijo **Opción 2**, **cuando** selecciono la misma foto dos veces, **entonces** puedo continuar al paso de upsell.
- **Dado** que no completé el cupo requerido, **cuando** intento continuar, **entonces** el botón sigue deshabilitado y veo un mensaje claro.
- **Dado** que marco 2 copias 10×15, **cuando** paso al carrito, **entonces** el detalle refleja las copias y el subtotal correcto.

## 5) Entregables técnicos
- Componentes UI (sugerencia):
  - `components/gallery/WizardOptionPicker.tsx`
  - `components/gallery/PhotoSelector.tsx`
  - `components/gallery/UpsellCopies.tsx`
- Estado del wizard con guardado temporal (URL state o store local).
- Payload listo para checkout:
  ```ts
  type CheckoutPayload = {
    token: string; // galería
    option: 1 | 2;
    selectedPhotos: string[]; // 1 o 2 ids
    extras: { size: '10x15' | '13x18' | 'A4'; qty: number }[];
  };
  Tests:
	•	Unit: validación de cupo, repetición en Opción 2, subtotales.
	•	Integration: flujo happy-path hasta generar payload de MP.

6) Riesgos / dependencias
	•	Precios: usar defaults si no hay por evento.
	•	Fotos <2 en galería: fallback para Opción 2 (deshabilitar o copy claro).
	•	Accesibilidad: foco/teclado en seleccionador de fotos.

7) QA manual
	•	Opción 1: elegir 1 foto → upsell → carrito con total correcto.
	•	Opción 2: elegir 2 iguales → upsell → carrito.
	•	Opción 2: elegir 2 distintas → upsell → carrito.
	•	Intentar continuar sin cupo completo (botón deshabilitado + mensaje).
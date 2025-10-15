# Checkout Unified Store – Refresh Plan

Fecha: 8 de octubre de 2025

## Objetivo

- Reemplazar el checkout actual del flujo Pixieset (`components/store/templates/PixiesetFlowTemplate.tsx`, paso `checkout`) por una experiencia clara, cálida y alineada a la identidad LookEscolar.
- Reducir fricción en mobile, mejorar jerarquía visual y reforzar la percepción de seguridad/confianza.
- Preparar el terreno para iteraciones futuras (métricas, pruebas A/B, internacionalización) manteniendo componentes reutilizables.

## Principios de UX

- **Familias primero**: lenguaje coloquial, instrucciones breves, claridad sobre qué incluye el pedido.
- **Mobile antes que desktop**: estructura columnar con resumen plegable/bottom sheet en ≤640px; sticky sidebar en ≥768px.
- **Accesibilidad AA**: contraste mínimo 4.5:1, focus visible, inputs ≥44px de alto, navegación con teclado.
- **Feedback inmediato**: validaciones en blur, mensajes inline; confirmaciones micro-interactivas (iconos, transiciones suaves).

## Tokens de Color (HSL)

| Token               | Valor HSL              | Uso principal                                    |
| ------------------- | ---------------------- | ------------------------------------------------ |
| `--looke-primary`   | `219.8 84.1% 55.7%`    | CTA, highlights, badges principales              |
| `--looke-accent`    | `40.6 92.5% 58%`       | Badges de ahorro, estados informativos cálidos   |
| `--looke-surface`   | `220 42.9% 97.3%`      | Fondos de secciones, layout base                 |
| `--looke-muted`     | `225.7 67.7% 87.8%`    | Bordes, etiquetas, fondos secundarios            |
| `--looke-success`   | `145.4 63.2% 49%`      | Estados de confirmación                          |
| `--looke-error`     | `5.6 78.1% 57.1%`      | Mensajes de error/validación                     |

Se aplicarán mediante una clase envolvente (`.looke-store`) que redefine variables Tailwind (`--primary`, `--accent`, etc.) dentro del checkout, evitando impactos colaterales en otras vistas.

## Arquitectura de Componentes

```
components/
└─ store/
   └─ checkout/
      ├─ CheckoutLayout.tsx        # Layout responsivo, shells mobile/desktop
      ├─ CheckoutOrderSummary.tsx  # Items + totales, badges de ahorro
      ├─ CheckoutPaymentMethods.tsx# Cards clicables con CTA dinámico
      ├─ CheckoutCustomerForm.tsx  # Datos responsable, alumno/a, entrega
      ├─ CheckoutValidation.ts     # Schemas zod + helpers de etiquetas
      └─ index.ts                  # Barrel exports
```

`PixiesetFlowTemplate` consumirá estos componentes y gestionará el estado global (`cart`, `selectedPaymentMethod`, `customerData`).

## Microcopy y Mensajes

- Encabezado principal: “Revisá tu pedido antes de confirmar”.
- Subtítulo contextual: “Completá los datos del responsable y alumno/a para coordinar la entrega educativa”.
- CTA primario: “Confirmar pedido”.
- CTA secundario (volver): “Volver al carrito”.
- Estados:
  - Éxito: “¡Listo! Tu pedido está en marcha. En breve recibirás la guía educativa por correo.”
  - Error validación: “Revisá este campo: necesitás completar al menos 10 caracteres.”
  - Alertas métodos de pago no disponibles: “Por ahora solo aceptamos transferencia bancaria. ¿Necesitás ayuda? Escribinos.”

## Flujo de Interacción

1. **Ingreso**: se fija paso `checkout` mediante query param (`step=checkout`). Layout recalcula según viewport.
2. **Formulario**: validaciones en blur; se habilita CTA solo si `zod` schema válido y hay items en carrito.
3. **Selección método**: botones tipo “segmented cards” con icono + microcopy; WhatsApp/Transferencia priorizados según configuración `settings.payment_methods`.
4. **Confirmar**: dispara `handleCheckoutSubmit` (por ahora placeholder con toast + TODO integrar API `POST /api/family/checkout`).
5. **Fallback**: si no hay métodos habilitados, se muestra banner con link a soporte.

## Requerimientos Técnicos

- Añadir clase `.looke-store` y tokens asociados en `app/globals.css`.
- Mantener compatibilidad con modo oscuro (variables específicas `.looke-store.dark`).
- Incluir test unitario mínimo (`CheckoutValidation.test.ts`) para esquema de validación.
- Actualizar documentación en este archivo y enlazar desde `docs/VISUAL_REFRESH_ORDERS_GALLERY_SPEC.md`.
- Considerar feature flag para revertir (prop `useLegacyCheckout` en `PixiesetFlowTemplate` si se requiere rollback rápido).

## Métricas y QA

- QA manual en iPhone 13, iPad, desktop 1440px.
- Ejecutar `npm run lint`, `npm run typecheck`, `npm test` (una vez se habiliten suites reales).
- Métricas post-lanzamiento: abandono checkout, tiempo medio de completitud, ratio error por campo, CES.

---

Responsable: Equipo LookEscolar – Frontend


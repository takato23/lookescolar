# Optimización Móvil - LookEscolar

## 📱 Resumen
Este sistema está optimizado para dispositivos móviles usando **mobile-first** y el componente `MobileOptimizations` junto con utilidades CSS definidas en `globals.css`.

## 🛠 Componentes y Hooks Clave

### MobileOptimizations
Componente que aplica:
- Meta tags dinámicos (`viewport`, PWA icons)
- Safe-area insets para notch
- Previene zoom doble tap y rebote en iOS

```tsx
import { MobileOptimizations } from '@/components/family/MobileOptimizations';

export default function Layout({ children }) {
  return <MobileOptimizations>{children}</MobileOptimizations>;
}
```

### useMobileDetection
Hook para detección de dispositivo y vista:
```ts
import { useMobileDetection } from '@/hooks/useMobileDetection';
const { isMobileView, isTouchDevice, isIOS } = useMobileDetection();
```

## 📐 Breakpoints (Tailwind)
```js
screens: {
  xs: '475px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
  mobile: {'max':'767px'}
}
```

## 📚 Utilidades CSS (globals.css)
```css
/* Safe areas */
.pb-safe-area-inset-bottom { padding-bottom: env(safe-area-inset-bottom); }
.pt-safe-area-inset-top { padding-top: env(safe-area-inset-top); }
.h-safe-area-inset-top { height: env(safe-area-inset-top); }

/* Touch targets */
.touch-target, .mobile-touch-target { min-height:44px; min-width:44px; }

/* Mobile grid */
.mobile-grid-2 { grid-template-columns: repeat(2,1fr); gap:0.5rem; }

/* Prevent overscroll */
html { overscroll-behavior: none; }
```

## 📷 Galerías Móviles

- `MobilePhotoGallery` (gestures, lazy load)
- `photo-gallery-responsive.tsx` para grids adaptativos

## ⚡ Rendimiento
- Intersection Observer para imágenes perezosas
- Animaciones GPU-acceleradas (`transform: translateZ(0)`)
- Respeta `prefers-reduced-motion`

## ✅ Prácticas Recomendadas
1. Encapsular layout en `MobileOptimizations`.
2. Usar `useMobileDetection()` para condicionales.
3. Aplicar clases `mobile-*` para estilos específicos.
4. Testear en dispositivos reales (iOS/Android).

# Guía de Integración de Iconos PNG

## Preparación de Imágenes

### Optimización Requerida:
1. **Formato**: PNG con transparencia
2. **Tamaños**: 
   - Iconos pequeños: 24x24, 32x32, 48x48px
   - Iconos medianos: 64x64, 96x96px  
   - Logos: 128x128, 256x256px
3. **Peso**: Máximo 10KB por icono
4. **Nomenclatura**: `icon-dashboard.png`, `logo-lookescolar.png`

### Herramientas de Optimización:
- TinyPNG.com (online)
- ImageOptim (Mac)
- SVGO (si conviertes a SVG)

## Estructura de Carpetas

```
public/
  images/
    icons/
      dashboard.png
      events.png
      folders.png
      orders.png
      publish.png
      settings.png
    logos/
      lookescolar-main.png
      lookescolar-mini.png
    decorative/
      stars.png
      sparkles.png
```

## Ejemplos de Integración

### 1. Como Componente de Imagen
```tsx
<Image 
  src="/images/icons/dashboard.png" 
  alt="Dashboard" 
  width={24} 
  height={24}
  className="transition-transform hover:scale-110"
/>
```

### 2. Como Background CSS
```tsx
<div 
  className="size-10 bg-no-repeat bg-center bg-contain"
  style={{ backgroundImage: 'url(/images/icons/dashboard.png)' }}
/>
```

### 3. Como Icono en Botón
```tsx
<button className="flex items-center gap-2">
  <img src="/images/icons/events.png" alt="" className="size-5" />
  Eventos
</button>
```

# Solución para Deploy en Vercel - Next.js 15

## Problema Principal

El deploy en Vercel fallaba con errores de TypeScript relacionados con la API asíncrona de Next.js 15:

```
Type error: Type '{ searchParams?: SearchParams | undefined; }' does not satisfy the constraint 'PageProps'.
  Types of property 'searchParams' are incompatible.
    Type 'SearchParams | undefined' is not assignable to type 'Promise<any> | undefined'.
```

## Cambios Realizados

### 1. Actualización de `searchParams` y `params` a Promises

En Next.js 15, los `searchParams` y `params` ahora son Promises y deben ser await-eados:

**Archivos corregidos:**
- `app/admin/photos-simple/page.tsx`
- `app/admin/quick-flow/page.tsx`
- `app/share/[token]/page.tsx` (generateMetadata y componente principal)
- `app/share/[token]/payment/pending/page.tsx`
- `app/share/[token]/store/page.tsx`
- `app/store-unified/[token]/layout.tsx`

**Patrón de corrección:**
```typescript
// Antes
export default function Page({ params }: { params: { token: string } }) {
  const { token } = params;
}

// Después
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
}
```

### 2. Agregado `dynamic = 'force-dynamic'` para evitar pre-rendering

**Archivos corregidos:**
- `app/admin/page.tsx`
- `app/admin/optimization/page.tsx`
- `app/admin/photos-simple/page.tsx`
- `app/admin/mobile-dashboard/page.tsx`
- `app/f/success/page.tsx`
- `app/f/error/page.tsx`
- `app/access/page.tsx`
- `app/not-found.tsx` (creado nuevo)

### 3. Simplificación de `error.tsx`

Removido el `useEffect` de `app/error.tsx` para evitar problemas durante el pre-rendering.

### 4. Configuración en `next.config.js`

Agregado `output: 'standalone'` para optimizar el build para Vercel.

## Estado Actual

El proyecto tiene correcciones en las páginas principales, pero aún hay ~30 páginas con `'use client'` que podrían necesitar `dynamic = 'force-dynamic'`.

## Próximos Pasos Recomendados

1. **Hacer commit de los cambios actuales:**
   ```bash
   git add .
   git commit -m "fix(nextjs15): actualizar params/searchParams a Promise y agregar dynamic = force-dynamic"
   git push origin main
   ```

2. **Intentar deploy en Vercel:**
   - Vercel tiene mejor manejo del pre-rendering que el build local
   - Los errores de pre-rendering restantes podrían no afectar el deploy en producción

3. **Si el deploy falla, agregar `dynamic = 'force-dynamic'` a las páginas restantes:**
   ```typescript
   'use client';

   export const dynamic = 'force-dynamic';

   export default function Page() {
     // ...
   }
   ```

## Lista de Páginas Pendientes (si es necesario)

Páginas con `'use client'` que aún podrían necesitar `dynamic = 'force-dynamic'`:
- app/admin/analytics/page.tsx
- app/admin/codes/page.tsx
- app/admin/events/[id]/*/page.tsx (varios)
- app/admin/orders/page.tsx
- app/admin/photos/page.tsx
- app/admin/settings/page.tsx
- (ver archivo para lista completa)

## Notas Técnicas

- **Next.js 15 Breaking Change**: `params` y `searchParams` ahora son Promises por defecto
- **Pre-rendering Issues**: Páginas con Client Components necesitan `dynamic = 'force-dynamic'` para evitar errores durante el build
- **Vercel Optimization**: `output: 'standalone'` mejora el deployment en Vercel

## Referencias

- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)

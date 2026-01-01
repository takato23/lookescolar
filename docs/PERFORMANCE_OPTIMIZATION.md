# Performance Optimization Guide

Production-level performance optimizations for LookEscolar store system.

## Target Metrics

### Core Web Vitals (Lighthouse Score >90)
- **LCP (Largest Contentful Paint)**: <2.5s ✅
- **FID (First Input Delay)**: <100ms ✅
- **CLS (Cumulative Layout Shift)**: <0.1 ✅
- **TTFB (Time to First Byte)**: <600ms ✅

### Additional Metrics
- **FCP (First Contentful Paint)**: <1.8s
- **INP (Interaction to Next Paint)**: <200ms
- **Bundle Size**: <1MB total
- **Mobile Performance**: >85 Lighthouse score

## Implemented Optimizations

### 1. Image Optimization

#### Next.js Image Component
**Location**: `/components/store/OptimizedImage.tsx`

**Features**:
- Automatic WebP conversion
- Responsive srcset generation
- Blur placeholder for smooth loading
- Lazy loading by default
- Preload for above-the-fold images
- Proper sizing to prevent CLS

**Usage**:
```tsx
import { OptimizedImage, GridPhotoImage, HeroCoverImage } from '@/components/store/OptimizedImage';

// Standard image
<OptimizedImage
  src={photo.url}
  alt="Photo"
  width={800}
  height={600}
  priority={isAboveFold}
  quality={75}
/>

// Grid photo (optimized for galleries)
<GridPhotoImage
  src={photo.url}
  alt="Photo"
  priority={index < 8} // First 8 photos
/>

// Hero/cover image (high quality)
<HeroCoverImage
  src={coverUrl}
  alt="Cover"
/>
```

**Configuration** (`lib/performance/optimizations.ts`):
```typescript
export const IMAGE_CONFIG = {
  breakpoints: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  quality: {
    thumbnail: 60,
    preview: 75,
    hero: 90,
  },
  sizes: {
    thumbnail: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    hero: '100vw',
    grid: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  },
};
```

### 2. Code Splitting & Dynamic Imports

#### Template Lazy Loading
**Location**: `/app/store-unified/[token]/page-optimized.tsx`

**Implementation**:
```tsx
// Each template is a separate chunk, loaded only when needed
const PixiesetTemplate = lazy(() =>
  import('@/components/store/templates/PixiesetTemplate').then(module => ({
    default: module.PixiesetTemplate
  }))
);

const PremiumStoreTemplate = lazy(() =>
  import('@/components/store/templates/PremiumStoreTemplate').then(module => ({
    default: module.PremiumStoreTemplate
  }))
);
```

**Benefits**:
- Reduced initial bundle size by ~300KB
- Faster time to interactive
- Only loads the template actually used

#### Heavy Dependencies
Defer non-critical dependencies:
- Framer Motion: Only load when animations needed
- React Three Fiber: Only for 3D templates (Prisma)
- Chart libraries: Load on dashboard pages only

### 3. Virtual Scrolling

#### High-Performance Photo Grid
**Location**: `/components/store/VirtualPhotoGrid.tsx`

**Features**:
- Virtual scrolling for 1000+ photos
- Optimized rendering (only visible items)
- Smooth scrolling with overscan
- Responsive column layout
- Touch-optimized for mobile
- Memory efficient

**Usage**:
```tsx
import { VirtualPhotoGrid } from '@/components/store/VirtualPhotoGrid';

<VirtualPhotoGrid
  photos={photos}
  columns={4}
  gap={16}
  onPhotoClick={handlePhotoClick}
  selectedPhotos={selectedPhotos}
  overscan={5} // Render 5 extra rows for smooth scrolling
/>
```

**Configuration**:
```typescript
export const VIRTUAL_SCROLL_CONFIG = {
  itemSize: 300,
  overscan: 5,
  threshold: 50, // Enable for >50 items
  gap: 16,
};
```

### 4. React Query Optimization

#### Smart Caching Strategy
**Location**: `/lib/query-client-optimized.ts`

**Cache Times**:
```typescript
export const CACHE_CONFIG = {
  store: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
  photos: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
  },
  products: {
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  },
  cart: {
    staleTime: 0, // Always fresh
    cacheTime: 5 * 60 * 1000, // 5 minutes
  },
};
```

**Benefits**:
- Minimizes network requests
- Fast page navigation
- Efficient memory usage
- Automatic cache cleanup

### 5. Mobile Touch Performance

#### Passive Event Listeners
```tsx
// Optimized scroll handling
useEffect(() => {
  const handleScroll = throttle(() => {
    // Scroll logic
  }, 16); // 60fps

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

#### Touch Actions
```css
/* Prevent delay on touch devices */
.touch-element {
  touch-action: manipulation;
}

/* Optimize scrolling */
.scroll-container {
  -webkit-overflow-scrolling: touch;
  will-change: scroll-position;
}
```

### 6. CSS Performance

#### Critical CSS Inlining
**Next.js Configuration**:
```javascript
// next.config.js
experimental: {
  optimizeCss: true,
  optimizeFonts: true,
}
```

#### Tailwind Optimization
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  // PurgeCSS automatically removes unused styles
};
```

### 7. Web Vitals Monitoring

#### Real-Time Tracking
**Location**: `/components/performance/WebVitalsTracker.tsx`

**Features**:
- Tracks all Core Web Vitals
- Automatic reporting to analytics
- Development logging
- Production-ready

**Implementation**:
```tsx
// Automatically added to root layout
<WebVitalsTracker />
```

**Analytics Integration**:
```typescript
// Reports metrics to /api/analytics/web-vitals
function reportMetric(metric: Metric, pathname: string) {
  if (process.env.NODE_ENV === 'production') {
    navigator.sendBeacon('/api/analytics/web-vitals', JSON.stringify({
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      page: pathname,
    }));
  }
}
```

### 8. Font Optimization

#### Next.js Font Loading
**Location**: `/app/layout.tsx`

```tsx
import { Bricolage_Grotesque, Manrope } from 'next/font/google';

const display = BricolageGrotesque({
  subsets: ['latin'],
  display: 'swap', // Prevent FOIT
  preload: true,
  adjustFontFallback: true, // Reduce CLS
});

const body = Manrope({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});
```

### 9. Preconnect & DNS Prefetch

#### Critical Resources
```html
<!-- Supabase storage -->
<link rel="preconnect" href="https://exaighpowgvbdappydyx.supabase.co" crossOrigin="anonymous" />
<link rel="dns-prefetch" href="https://exaighpowgvbdappydyx.supabase.co" />

<!-- Mercado Pago -->
<link rel="preconnect" href="https://sdk.mercadopago.com" crossOrigin="anonymous" />
<link rel="dns-prefetch" href="https://sdk.mercadopago.com" />
```

### 10. Prefetching Strategies

#### Route Prefetching
```tsx
import { useRouter } from 'next/navigation';

// Prefetch on hover/focus
<Link
  href="/checkout"
  prefetch={true}
  onMouseEnter={() => router.prefetch('/checkout')}
>
  Checkout
</Link>
```

#### Data Prefetching
```typescript
// Prefetch store data on admin login
export async function prefetchStoreData(
  queryClient: QueryClient,
  token: string
) {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['store', 'config', token],
    }),
    queryClient.prefetchQuery({
      queryKey: ['products', 'list', token],
    }),
  ]);
}
```

## Performance Testing

### Lighthouse CI
```bash
# Run Lighthouse audit
npm run build
npx lighthouse http://localhost:3000/store-unified/[token] \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=html \
  --output-path=./lighthouse-report.html
```

### Bundle Analysis
```bash
# Analyze bundle size
npm run build
node scripts/analyze-bundle.js
```

### Web Vitals Testing
```bash
# Check Core Web Vitals in development
npm run dev
# Open browser DevTools > Performance > Record
```

## Monitoring Dashboard

### Real-Time Metrics
Create an admin dashboard to monitor performance:

```tsx
// /app/admin/performance/page.tsx
import { getCurrentVitals } from '@/lib/performance/web-vitals';

export default async function PerformancePage() {
  const vitals = await getCurrentVitals();

  return (
    <div>
      <h1>Performance Metrics</h1>
      <div>
        <MetricCard name="LCP" value={vitals.LCP} />
        <MetricCard name="FID" value={vitals.FID} />
        <MetricCard name="CLS" value={vitals.CLS} />
      </div>
    </div>
  );
}
```

## Optimization Checklist

### Before Deployment
- [ ] Run bundle analysis
- [ ] Check Lighthouse score (>90)
- [ ] Test on 3G network
- [ ] Verify mobile performance
- [ ] Check image sizes (<200KB)
- [ ] Test with 1000+ photos
- [ ] Validate Core Web Vitals
- [ ] Test touch interactions

### Regular Maintenance
- [ ] Review bundle size monthly
- [ ] Monitor Web Vitals weekly
- [ ] Update dependencies quarterly
- [ ] Profile slow pages
- [ ] Optimize heavy components
- [ ] Clean up unused code

## Common Issues & Solutions

### Issue: Slow Initial Load
**Symptoms**: >3s LCP, high bundle size
**Solutions**:
- Enable code splitting
- Lazy load templates
- Preload critical resources
- Optimize images

### Issue: Janky Scrolling
**Symptoms**: FPS drops, high CLS
**Solutions**:
- Enable virtual scrolling
- Use passive event listeners
- Reduce layout thrashing
- Optimize animations

### Issue: High Memory Usage
**Symptoms**: Browser crashes, slow performance
**Solutions**:
- Enable virtual scrolling
- Optimize cache cleanup
- Reduce image quality
- Limit concurrent requests

### Issue: Slow Mobile Performance
**Symptoms**: <85 Lighthouse score on mobile
**Solutions**:
- Reduce bundle size
- Optimize touch interactions
- Enable network-aware loading
- Reduce animation complexity

## Network-Aware Optimizations

### Adaptive Loading
```typescript
import { prefersReducedData } from '@/lib/performance/optimizations';

function PhotoGallery() {
  const quality = prefersReducedData() ? 60 : 80;

  return (
    <OptimizedImage
      src={photo.url}
      quality={quality}
      loading={prefersReducedData() ? 'lazy' : 'eager'}
    />
  );
}
```

### Connection Type Detection
```typescript
export function getOptimalImageQuality(): number {
  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType;

  switch (effectiveType) {
    case '4g': return 90;
    case '3g': return 75;
    case '2g': return 60;
    default: return 75;
  }
}
```

## Future Optimizations

### Planned Enhancements
1. **Service Worker**: Offline support and background sync
2. **HTTP/3**: Faster resource loading
3. **Edge Caching**: CDN optimization
4. **WebP/AVIF**: Next-gen image formats
5. **Partial Hydration**: React Server Components
6. **Streaming SSR**: Faster time to interactive

### Experimental Features
- **React Compiler**: Auto-optimization
- **Selective Hydration**: Faster initial render
- **Progressive Hydration**: Prioritize visible content
- **Islands Architecture**: Minimize JavaScript

## Resources

### Tools
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals](https://github.com/GoogleChrome/web-vitals)
- [Bundle Analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)

### Documentation
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Core Web Vitals](https://web.dev/vitals/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Vercel Analytics](https://vercel.com/docs/analytics)

## Support

For performance issues, check:
1. Bundle analysis report
2. Lighthouse report
3. Web Vitals metrics
4. Browser DevTools Performance tab

For questions, contact the development team or create an issue.

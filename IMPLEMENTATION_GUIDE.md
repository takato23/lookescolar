# Quick Implementation Guide

Step-by-step guide to integrate performance optimizations into the store system.

## 1. Replace Image Components (5 minutes)

### Find and Replace Standard Images

**Files to Update**:
- `/components/store/templates/ModernMinimalTemplate.tsx`
- `/components/store/templates/PixiesetTemplate.tsx`
- `/components/store/templates/PremiumStoreTemplate.tsx`
- `/components/store/templates/StudioDarkTemplate.tsx`

**Before**:
```tsx
<img
  src={photo.url}
  alt={photo.alt}
  className="w-full h-full object-cover"
  loading="lazy"
/>
```

**After**:
```tsx
import { GridPhotoImage } from '@/components/store/OptimizedImage';

<GridPhotoImage
  src={photo.url}
  alt={photo.alt}
  priority={index < 8} // Preload first 8 photos
  className="w-full h-full"
/>
```

### Hero/Cover Images

**Before**:
```tsx
<img src={coverUrl} alt="Cover" className="h-64 w-full object-cover" />
```

**After**:
```tsx
import { HeroCoverImage } from '@/components/store/OptimizedImage';

<HeroCoverImage
  src={coverUrl}
  alt="Cover"
  className="h-64 w-full"
/>
```

## 2. Enable Virtual Scrolling (10 minutes)

### Update Photo Grid Components

**File**: `/components/store/templates/ModernMinimalTemplate.tsx`

**Before**:
```tsx
<div className="grid grid-cols-4 gap-4">
  {filteredPhotos.map((photo, index) => (
    <div key={photo.id} onClick={() => setSelectedPhoto(photo)}>
      <img src={photo.url} alt={photo.alt} />
    </div>
  ))}
</div>
```

**After**:
```tsx
import { VirtualPhotoGrid } from '@/components/store/VirtualPhotoGrid';

<VirtualPhotoGrid
  photos={filteredPhotos}
  columns={4}
  gap={16}
  onPhotoClick={setSelectedPhoto}
  selectedPhotos={selectedPhotos}
  onPhotoSelect={handleSelectPhoto}
  overscan={5}
  className="h-screen"
/>
```

### Configuration

**Add to component**:
```tsx
import { VIRTUAL_SCROLL_CONFIG } from '@/lib/performance/optimizations';

// Enable virtual scrolling only for large galleries
const useVirtualScroll = photos.length > VIRTUAL_SCROLL_CONFIG.threshold;

return useVirtualScroll ? (
  <VirtualPhotoGrid {...props} />
) : (
  <StandardPhotoGrid {...props} />
);
```

## 3. Update Store Page (15 minutes)

### Option A: Full Migration (Recommended)

Replace `/app/store-unified/[token]/page.tsx` with optimized version:

```bash
cd /Users/santiagobalosky/LookEscolar-2
mv app/store-unified/[token]/page.tsx app/store-unified/[token]/page-old.tsx
mv app/store-unified/[token]/page-optimized.tsx app/store-unified/[token]/page.tsx
```

### Option B: Gradual Migration

Update existing page incrementally:

1. **Add memoization**:
```tsx
import { useMemo, useCallback } from 'react';

// Memoize expensive calculations
const templatePhotos = useMemo(() =>
  photos.map(photo => ({
    id: photo.id,
    url: photo.preview_url ?? photo.url,
    alt: photo.alt,
  })),
  [photos]
);

// Memoize template selection
const SelectedTemplate = useMemo(() => {
  return templateMap[settings.template] || PixiesetTemplate;
}, [settings.template]);
```

2. **Update lazy imports**:
```tsx
const PixiesetTemplate = lazy(() =>
  import('@/components/store/templates/PixiesetTemplate').then(module => ({
    default: module.PixiesetTemplate
  }))
);
```

3. **Add loading fallback**:
```tsx
const StoreLoadingFallback = React.memo(() => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2" />
      <p>Cargando tienda...</p>
    </div>
  </div>
));
```

## 4. Configure React Query (5 minutes)

### Update Query Provider

**File**: `/components/providers/query-provider.tsx`

**Before**:
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      cacheTime: 300000,
    },
  },
});
```

**After**:
```tsx
import { createOptimizedQueryClient } from '@/lib/query-client-optimized';

const queryClient = createOptimizedQueryClient();
```

### Use Optimized Query Keys

**Before**:
```tsx
const { data } = useQuery({
  queryKey: ['store', token],
  queryFn: () => fetchStore(token),
});
```

**After**:
```tsx
import { queryKeys, getCacheConfig } from '@/lib/query-client-optimized';

const { data } = useQuery({
  queryKey: queryKeys.store.config(token),
  queryFn: () => fetchStore(token),
  ...getCacheConfig('store'),
});
```

## 5. Enable Web Vitals Tracking (Already Done!)

Web Vitals tracking is automatically enabled via the updated `/app/layout.tsx`.

**Verify**:
1. Open browser console in development
2. Navigate to a store page
3. Look for `[Web Vitals]` logs showing metrics

## 6. Test Performance (15 minutes)

### Manual Testing

1. **Large Gallery Test**:
```bash
# Create test data with 1000+ photos
npm run dev
# Navigate to store with many photos
# Verify smooth scrolling
```

2. **Mobile Test**:
```bash
# Open Chrome DevTools
# Toggle device toolbar (Cmd/Ctrl + Shift + M)
# Select mobile device
# Test touch interactions and scrolling
```

3. **Network Test**:
```bash
# Open Chrome DevTools
# Network tab > Throttling > Fast 3G
# Test page load performance
```

### Lighthouse Audit

```bash
npm run build
npm start

# Open Chrome DevTools
# Lighthouse tab
# Categories: Performance, Accessibility, Best Practices, SEO
# Device: Mobile & Desktop
# Run audit
```

**Target Scores**:
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >90

### Bundle Analysis

```bash
npm run build
node scripts/analyze-bundle.js

# Review output for:
# - Bundle sizes
# - Code splitting effectiveness
# - Heavy dependencies
# - Optimization opportunities
```

## 7. Deploy to Production (10 minutes)

### Pre-Deployment Checklist

```bash
# 1. Type check
npm run typecheck

# 2. Run tests
npm run test:coverage

# 3. Build production bundle
npm run build

# 4. Bundle analysis
node scripts/analyze-bundle.js

# 5. Start production server (test locally)
npm start

# 6. Lighthouse audit
# Run audit on localhost:3000
```

### Vercel Deployment

```bash
# Ensure environment variables are set in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# etc.

# Deploy
git add .
git commit -m "feat: add production-level performance optimizations"
git push origin main

# Vercel automatically deploys
```

### Post-Deployment Verification

1. **Check Production Metrics**:
   - Visit production URL
   - Open browser console
   - Verify no errors
   - Check Web Vitals metrics

2. **Run Lighthouse on Production**:
   ```bash
   npx lighthouse https://your-domain.com/store-unified/[token] \
     --only-categories=performance,accessibility \
     --output=html \
     --output-path=./lighthouse-production.html
   ```

3. **Monitor Analytics**:
   - Check `/api/analytics/web-vitals` endpoint
   - Verify metrics are being tracked
   - Review performance trends

## 8. Monitor & Maintain

### Weekly Monitoring

```bash
# Check bundle size
npm run build
node scripts/analyze-bundle.js

# Review Web Vitals
# Check production analytics dashboard
```

### Monthly Maintenance

```bash
# Update dependencies
npm outdated
npm update

# Re-run performance audit
npx lighthouse https://your-domain.com \
  --only-categories=performance \
  --output=html
```

### Performance Budget Alerts

Set up alerts for:
- Bundle size >1MB
- LCP >2.5s
- FID >100ms
- CLS >0.1

## Troubleshooting

### Issue: Images Not Optimizing

**Check**:
1. Verify Next.js Image domains in `next.config.js`
2. Check Supabase storage CORS settings
3. Verify image URLs are accessible

**Fix**:
```javascript
// next.config.js
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'your-supabase-project.supabase.co',
      pathname: '/storage/v1/object/**',
    },
  ],
}
```

### Issue: Virtual Scrolling Not Working

**Check**:
1. Verify @tanstack/react-virtual is installed
2. Check parent container has defined height
3. Verify photos array has correct structure

**Fix**:
```tsx
<div className="h-screen"> {/* Parent must have height */}
  <VirtualPhotoGrid photos={photos} />
</div>
```

### Issue: Bundle Size Too Large

**Check**:
1. Run bundle analysis
2. Identify heavy dependencies
3. Check for duplicate packages

**Fix**:
```bash
# Analyze bundle
npm run build
node scripts/analyze-bundle.js

# Check for duplicates
npm dedupe

# Remove unused dependencies
npm prune
```

### Issue: Poor Mobile Performance

**Check**:
1. Test on actual device
2. Check network throttling
3. Verify touch interactions

**Fix**:
```tsx
// Add passive event listeners
useEffect(() => {
  const handleScroll = () => { /* ... */ };
  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

// Optimize touch actions
<div style={{ touchAction: 'manipulation' }}>
  {/* Content */}
</div>
```

## Quick Wins (Fastest Impact)

If you have limited time, prioritize these optimizations:

1. **Replace Hero Images** (5 min) - Use `HeroCoverImage` component
   - Impact: LCP improvement of 1-2 seconds

2. **Add Lazy Loading** (5 min) - Use `OptimizedImage` with lazy loading
   - Impact: Faster initial load

3. **Enable Code Splitting** (10 min) - Use optimized page component
   - Impact: 300KB bundle reduction

4. **Add Virtual Scrolling** (15 min) - For galleries >50 photos
   - Impact: Smooth scrolling for large galleries

## Summary

**Total Implementation Time**: ~1 hour
**Expected Performance Improvement**:
- Lighthouse Score: +15-25 points
- LCP: -2 to -3 seconds
- Bundle Size: -300KB
- Mobile Score: +20 points

**Next Steps**:
1. Implement changes following this guide
2. Test thoroughly (manual + Lighthouse)
3. Monitor performance in production
4. Iterate and optimize based on real data

For detailed documentation, see:
- [Performance Optimization Guide](/docs/PERFORMANCE_OPTIMIZATION.md)
- [Performance Summary](/PERFORMANCE_SUMMARY.md)

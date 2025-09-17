# ⚡ SPRINT 2: PERFORMANCE & OPTIMIZACIÓN (1 SEMANA)

> **Prioridad:** ALTA - Sistema lento afectando UX
> **Tiempo:** 1 semana
> **Branch:** `fix/sprint-2-performance`

## TICKET 2.1: Procesamiento Paralelo de Imágenes

### Problema
Processing secuencial: 8-15s por foto, timeout en uploads múltiples.

### Solución
**Archivo:** `lib/services/image-processor.ts`

```typescript
import Sharp from 'sharp';
import pLimit from 'p-limit';

export class ImageProcessor {
  // Limit concurrent operations to prevent memory overflow
  private static limit = pLimit(5);

  static async processUpload(
    file: File,
    eventId: string
  ): Promise<ProcessedImage> {
    const buffer = await file.arrayBuffer();

    // Process all variants in parallel
    const [original, preview512, preview1024, watermarked] = await Promise.all([
      this.saveOriginal(buffer),
      this.limit(() => this.createPreview(buffer, 512)),
      this.limit(() => this.createPreview(buffer, 1024)),
      this.limit(() => this.createWatermarked(buffer))
    ]);

    return {
      original,
      previews: { small: preview512, large: preview1024 },
      watermarked,
      processingTime: Date.now() - startTime
    };
  }

  static async createPreview(
    buffer: ArrayBuffer,
    size: number
  ): Promise<ProcessedFile> {
    const webp = await Sharp(buffer)
      .resize(size, size, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({
        quality: 85,
        effort: 4 // Balance between speed and compression
      })
      .toBuffer();

    const jpeg = await Sharp(buffer)
      .resize(size, size, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 85,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();

    return { webp, jpeg, size };
  }

  static async createWatermarked(buffer: ArrayBuffer): Promise<Buffer> {
    const watermark = await this.getWatermarkBuffer();

    return Sharp(buffer)
      .resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .composite([
        {
          input: watermark,
          gravity: 'southeast',
          blend: 'over'
        }
      ])
      .jpeg({ quality: 90, progressive: true })
      .toBuffer();
  }

  // Cache watermark in memory
  private static watermarkCache: Buffer | null = null;

  static async getWatermarkBuffer(): Promise<Buffer> {
    if (!this.watermarkCache) {
      this.watermarkCache = await Sharp('public/watermark.png')
        .resize(200, 100)
        .png()
        .toBuffer();
    }
    return this.watermarkCache;
  }
}
```

### API Route Optimizado
**Archivo:** `app/api/admin/photos/upload-v2/route.ts`

```typescript
export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll('files') as File[];

  // Process files in batches
  const BATCH_SIZE = 5;
  const results = [];

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          const processed = await ImageProcessor.processUpload(file, eventId);

          // Upload to storage in parallel
          const [originalUrl, previewUrls, watermarkUrl] = await Promise.all([
            StorageService.upload(processed.original, 'photo-private'),
            StorageService.uploadMultiple(processed.previews, 'photo-previews'),
            StorageService.upload(processed.watermarked, 'photos')
          ]);

          // Save to database
          const photo = await savePhotoMetadata({
            original: originalUrl,
            previews: previewUrls,
            watermark: watermarkUrl,
            processingMs: processed.processingTime
          });

          return { success: true, photo };
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error);
          return { success: false, filename: file.name, error: error.message };
        }
      })
    );

    results.push(...batchResults);

    // Brief pause between batches to prevent overload
    if (i + BATCH_SIZE < files.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  return NextResponse.json({
    total: files.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success),
    results
  });
}
```

---

## TICKET 2.2: CDN Cache Strategy

### Problema
$150/mes en egress costs innecesarios, imágenes servidas directamente desde Supabase.

### Solución
**Archivo:** `lib/services/cdn-service.ts`

```typescript
export class CDNService {
  static readonly CACHE_HEADERS = {
    'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
    'CDN-Cache-Control': 'max-age=31536000'
  };

  static getCDNUrl(path: string, variant: 'small' | 'large' | 'original'): string {
    const baseUrl = process.env.NEXT_PUBLIC_CDN_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Use image optimization API for previews
    if (variant !== 'original') {
      const size = variant === 'small' ? 512 : 1024;
      return `/_next/image?url=${encodeURIComponent(path)}&w=${size}&q=85`;
    }

    // Original should never be served directly
    if (process.env.NODE_ENV === 'production') {
      console.error('WARNING: Attempting to serve original image');
      return '/placeholder.jpg';
    }

    return path;
  }

  static getOptimizedSrcSet(photo: Photo): string {
    const base = photo.preview_path || photo.watermark_path;
    if (!base) return '';

    return `
      ${this.getCDNUrl(base, 'small')} 512w,
      ${this.getCDNUrl(base, 'large')} 1024w
    `;
  }
}
```

### Next.js Image Component Wrapper
**Archivo:** `components/ui/optimized-image.tsx`

```typescript
import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className,
  priority = false,
  onLoad
}: OptimizedImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <ImageIcon className="w-12 h-12 text-gray-400" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      width={1024}
      height={768}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      loading={priority ? 'eager' : 'lazy'}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      onLoad={onLoad}
      onError={() => setError(true)}
    />
  );
}
```

---

## TICKET 2.3: Database Indexes Optimization

### Problema
Queries lentos, falta de índices en columnas críticas.

### Migration
**Archivo:** `supabase/migrations/20250117_performance_indexes.sql`

```sql
-- Performance Critical Indexes
BEGIN;

-- Webhook lookups (CRITICAL)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_mp_payment_status
  ON orders(mp_payment_id, status)
  WHERE mp_payment_id IS NOT NULL;

-- Photo queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_event_subject
  ON photos(event_id, subject_id)
  INCLUDE (storage_path, preview_path, watermark_path);

-- Storage lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_storage_path
  ON photos(storage_path)
  WHERE storage_path IS NOT NULL;

-- Token validation (frequent)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_family_tokens_token_expires
  ON family_tokens(token, expires_at)
  WHERE expires_at > NOW();

-- Gallery filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_visibility_event
  ON photos(visibility, event_id, created_at DESC);

-- Student search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_name_search
  ON students USING gin(
    to_tsvector('spanish', first_name || ' ' || last_name)
  );

-- Analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_egress_event_date
  ON egress_metrics(event_id, date DESC)
  INCLUDE (bytes_used, photo_count);

-- Remove unused indexes
DROP INDEX IF EXISTS idx_photos_created_at; -- Redundant with composite

-- Analyze tables for query planner
ANALYZE photos;
ANALYZE orders;
ANALYZE family_tokens;
ANALYZE students;

COMMIT;
```

### Query Optimization
**Archivo:** `lib/services/database-optimizer.ts`

```typescript
export class DatabaseOptimizer {
  // Use prepared statements for frequent queries
  static readonly QUERIES = {
    GET_GALLERY_PHOTOS: `
      SELECT
        p.id,
        p.storage_path,
        p.preview_path,
        p.watermark_path,
        p.visibility,
        array_agg(
          json_build_object(
            'id', s.id,
            'name', s.first_name || ' ' || s.last_name
          )
        ) FILTER (WHERE s.id IS NOT NULL) as students
      FROM photos p
      LEFT JOIN photo_students ps ON ps.photo_id = p.id
      LEFT JOIN students s ON s.id = ps.student_id
      WHERE p.event_id = $1
        AND p.visibility IN ('public', 'family')
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `,

    CHECK_PAYMENT_EXISTS: `
      SELECT id, status
      FROM orders
      WHERE mp_payment_id = $1
      LIMIT 1
    `
  };

  static async getGalleryPhotos(
    eventId: string,
    limit = 50,
    offset = 0
  ): Promise<Photo[]> {
    const { data, error } = await supabase
      .rpc('get_gallery_photos_optimized', {
        p_event_id: eventId,
        p_limit: limit,
        p_offset: offset
      });

    if (error) throw error;
    return data;
  }

  // Connection pooling configuration
  static getPoolConfig() {
    return {
      max: 20, // Maximum connections
      min: 5,  // Minimum connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 5000, // 5 second query timeout
    };
  }
}
```

---

## TICKET 2.4: Mobile Bundle Optimization

### Problema
Bundle size 2.8MB, mobile performance score 45/100.

### Solution
**Archivo:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC minification
  swcMinify: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
  },

  // Bundle analyzer (only in development)
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Tree shaking improvements
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Split chunks strategically
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([[\\/]|$)/
              )[1];
              return `npm.${packageName.replace('@', '')}`;
            },
            priority: 10,
            minChunks: 2,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },

  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
};

module.exports = nextConfig;
```

### Dynamic Imports
**Archivo:** `app/gallery/[eventId]/page.tsx`

```typescript
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load heavy components
const PhotoGrid = dynamic(
  () => import('@/components/gallery/photo-grid').then(mod => mod.PhotoGrid),
  {
    loading: () => <PhotoGridSkeleton />,
    ssr: false // Don't SSR heavy gallery
  }
);

const FilterPanel = dynamic(
  () => import('@/components/gallery/filter-panel').then(mod => mod.FilterPanel),
  {
    loading: () => <FilterPanelSkeleton />
  }
);

export default async function GalleryPage({ params }: Props) {
  // Critical data only
  const event = await getEvent(params.eventId);

  return (
    <div>
      <h1>{event.name}</h1>

      <Suspense fallback={<FilterPanelSkeleton />}>
        <FilterPanel eventId={params.eventId} />
      </Suspense>

      <Suspense fallback={<PhotoGridSkeleton />}>
        <PhotoGrid eventId={params.eventId} />
      </Suspense>
    </div>
  );
}
```

---

## TICKET 2.5: Virtual Scrolling Implementation

### Problema
Gallery performance degrada con >100 fotos.

### Solution
**Archivo:** `components/gallery/virtual-photo-grid.tsx`

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function VirtualPhotoGrid({ photos }: { photos: Photo[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const COLUMNS = 3;
  const ROW_HEIGHT = 300;

  const rows = Math.ceil(photos.length / COLUMNS);

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 2, // Render 2 rows outside viewport
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
      style={{ contain: 'strict' }} // Performance optimization
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * COLUMNS;
          const endIndex = Math.min(startIndex + COLUMNS, photos.length);
          const rowPhotos = photos.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid grid-cols-3 gap-2"
            >
              {rowPhotos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  loading="lazy"
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## ✅ CHECKLIST SPRINT 2

### Performance Metrics Target
- [ ] Upload time: <3s (from 8-15s)
- [ ] Gallery initial load: <2s (from 4-8s)
- [ ] Bundle size: <1.5MB (from 2.8MB)
- [ ] Lighthouse mobile: >70 (from 45)
- [ ] Database query p95: <200ms

### Tests Específicos
```bash
# Performance testing
npm run lighthouse:mobile
npm run bundle:analyze
npm run test:performance

# Database testing
npx supabase db test --file tests/db-performance.sql

# Load testing
npm run test:load -- --users 100 --duration 60s
```

---

**SIGUIENTE:** Continuar con `SPRINT_2_DATA_INTEGRITY.md`
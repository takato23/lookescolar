# 🔒 SPRINT 3: SECURITY & TESTING (2 SEMANAS)

> **Prioridad:** MODERADA - Fortalecer seguridad y calidad
> **Tiempo:** 2 semanas (paralelo con UX)
> **Branch:** `fix/sprint-3-security`

## TICKET 3.4: Redesign RLS Policies

### Problema
Todo requiere service_role, eliminando seguridad row-level.

### New RLS Strategy
**Archivo:** `supabase/migrations/20250118_granular_rls.sql`

```sql
BEGIN;

-- 1. Create role-based access system
CREATE TYPE user_role AS ENUM ('admin', 'photographer', 'viewer', 'family');

ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'viewer';

-- 2. Helper functions for RLS
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role')::user_role,
    'viewer'
  )
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean AS $$
  SELECT auth.user_role() = 'admin'
$$ LANGUAGE sql STABLE;

-- 3. Events table policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events FOR SELECT
  USING (
    status IN ('active', 'completed') OR  -- Public can see active/completed
    auth.is_admin() OR                    -- Admins see all
    auth.user_role() = 'photographer'     -- Photographers see assigned
  );

DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert" ON events FOR INSERT
  WITH CHECK (auth.is_admin());

DROP POLICY IF EXISTS "events_update" ON events;
CREATE POLICY "events_update" ON events FOR UPDATE
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_delete" ON events FOR DELETE
  USING (auth.is_admin());

-- 4. Photos table policies
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photos_select" ON photos;
CREATE POLICY "photos_select" ON photos FOR SELECT
  USING (
    visibility = 'public' OR
    (visibility = 'family' AND EXISTS (
      SELECT 1 FROM family_tokens ft
      WHERE ft.token = current_setting('app.current_token', true)
        AND ft.expires_at > NOW()
        AND ft.subject_id = photos.subject_id
    )) OR
    auth.is_admin() OR
    auth.user_role() = 'photographer'
  );

DROP POLICY IF EXISTS "photos_insert" ON photos;
CREATE POLICY "photos_insert" ON photos FOR INSERT
  WITH CHECK (
    auth.is_admin() OR
    auth.user_role() = 'photographer'
  );

DROP POLICY IF EXISTS "photos_update" ON photos;
CREATE POLICY "photos_update" ON photos FOR UPDATE
  USING (
    auth.is_admin() OR
    (auth.user_role() = 'photographer' AND created_by = auth.uid())
  )
  WITH CHECK (
    auth.is_admin() OR
    (auth.user_role() = 'photographer' AND created_by = auth.uid())
  );

-- 5. Family tokens policies
ALTER TABLE family_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tokens_validate" ON family_tokens;
CREATE POLICY "tokens_validate" ON family_tokens FOR SELECT
  USING (
    token = current_setting('app.current_token', true) OR
    auth.is_admin()
  );

-- 6. Orders policies - families can only see their own
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select" ON orders;
CREATE POLICY "orders_select" ON orders FOR SELECT
  USING (
    auth.is_admin() OR
    EXISTS (
      SELECT 1 FROM family_tokens ft
      WHERE ft.token = current_setting('app.current_token', true)
        AND ft.subject_id = orders.subject_id
        AND ft.expires_at > NOW()
    )
  );

DROP POLICY IF EXISTS "orders_insert" ON orders;
CREATE POLICY "orders_insert" ON orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_tokens ft
      WHERE ft.token = current_setting('app.current_token', true)
        AND ft.subject_id = subject_id
        AND ft.expires_at > NOW()
    )
  );

-- 7. Create function to set current token for RLS
CREATE OR REPLACE FUNCTION set_current_token(token TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_token', token, false);
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

### API Middleware Update
**Archivo:** `lib/middleware/rls.middleware.ts`

```typescript
export async function withRLS(
  handler: (req: NextRequest, context: RLSContext) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const supabase = createServerSupabaseClient();

    // Extract token from various sources
    const token = extractToken(req);

    if (token) {
      // Set token for RLS policies
      await supabase.rpc('set_current_token', { token });

      // Validate token
      const { data: validToken } = await supabase
        .from('family_tokens')
        .select('*')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!validToken) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }
    }

    // Get user role
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role || 'viewer';

    const context: RLSContext = {
      supabase,
      user,
      role,
      token,
      isAdmin: role === 'admin',
      isPhotographer: role === 'photographer',
      isFamily: !!token
    };

    return handler(req, context);
  };
}

function extractToken(req: NextRequest): string | null {
  // Check multiple sources
  return (
    req.headers.get('x-family-token') ||
    req.cookies.get('family_token')?.value ||
    req.nextUrl.searchParams.get('token') ||
    null
  );
}
```

---

## TICKET 3.5: Implement Rate Limiting

### Problema
Rate limiting parcial, no cubre todos los endpoints críticos.

### Comprehensive Rate Limiting
**Archivo:** `lib/middleware/rate-limit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different limits for different operations
const limiters = {
  // Strict for auth operations
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
    prefix: 'auth',
  }),

  // Moderate for API calls
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
    prefix: 'api',
  }),

  // Lenient for reads
  read: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'read',
  }),

  // Very strict for uploads
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '5 m'),
    analytics: true,
    prefix: 'upload',
  }),

  // Payment operations
  payment: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 m'),
    analytics: true,
    prefix: 'payment',
  }),
};

export async function rateLimit(
  request: NextRequest,
  type: keyof typeof limiters = 'api'
): Promise<{ success: boolean; limit: number; remaining: number; reset: Date }> {
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';
  const identifier = `${ip}:${request.nextUrl.pathname}`;

  const result = await limiters[type].limit(identifier);

  // Add headers to response
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString());

  if (!result.success) {
    // Log rate limit violation
    await redis.lpush('rate_limit_violations', JSON.stringify({
      ip,
      path: request.nextUrl.pathname,
      timestamp: new Date().toISOString(),
      type
    }));
  }

  return result;
}

// Middleware wrapper
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  type: keyof typeof limiters = 'api'
) {
  return async (req: NextRequest) => {
    const { success, limit, remaining, reset } = await rateLimit(req, type);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: Math.ceil((reset.getTime() - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((reset.getTime() - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toISOString(),
          }
        }
      );
    }

    const response = await handler(req);

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toISOString());

    return response;
  };
}
```

### Apply to All Routes
**Archivo:** `middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withRateLimit } from '@/lib/middleware/rate-limit';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Determine rate limit type based on path
  let limitType: 'auth' | 'api' | 'read' | 'upload' | 'payment' = 'api';

  if (path.startsWith('/api/auth')) {
    limitType = 'auth';
  } else if (path.includes('/upload')) {
    limitType = 'upload';
  } else if (path.startsWith('/api/payments')) {
    limitType = 'payment';
  } else if (request.method === 'GET') {
    limitType = 'read';
  }

  // Apply rate limiting
  const rateLimitedHandler = withRateLimit(
    async () => NextResponse.next(),
    limitType
  );

  return rateLimitedHandler(request);
}

export const config = {
  matcher: [
    '/api/:path*',
    '/f/:path*',
    '/gallery/:path*'
  ]
};
```

---

## TICKET 3.6: Comprehensive Testing Coverage

### Problema
Coverage real ~45%, sin tests de integración completos.

### Test Structure
**Archivo:** `__tests__/integration/complete-flow.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../utils/test-client';
import { seedTestData, cleanupTestData } from '../utils/test-data';

describe('Complete User Flow', () => {
  let client: TestClient;
  let testData: TestData;

  beforeAll(async () => {
    client = createTestClient();
    testData = await seedTestData();
  });

  afterAll(async () => {
    await cleanupTestData(testData);
  });

  describe('Admin Flow', () => {
    it('should complete full admin workflow', async () => {
      // 1. Admin login
      const { token } = await client.post('/api/auth/login', {
        email: 'admin@test.com',
        password: 'test123'
      });
      expect(token).toBeDefined();
      client.setAuthToken(token);

      // 2. Create event
      const event = await client.post('/api/admin/events', {
        name: 'Test Event',
        date: '2025-03-01',
        school_name: 'Test School'
      });
      expect(event.id).toBeDefined();

      // 3. Upload photos
      const formData = new FormData();
      formData.append('files', createTestFile('photo1.jpg'));
      formData.append('files', createTestFile('photo2.jpg'));
      formData.append('eventId', event.id);

      const uploadResult = await client.post('/api/admin/photos/upload', formData);
      expect(uploadResult.successful).toBe(2);
      expect(uploadResult.failed).toBe(0);

      // 4. Tag photos
      const photos = await client.get(`/api/admin/photos?eventId=${event.id}`);
      const tagResult = await client.post('/api/admin/photos/bulk-tag', {
        associations: {
          [photos[0].id]: [testData.students[0].id],
          [photos[1].id]: [testData.students[0].id, testData.students[1].id]
        }
      });
      expect(tagResult.associations_created).toBe(3);

      // 5. Generate tokens
      const tokens = await client.post('/api/admin/tokens/generate', {
        subjectId: testData.subjects[0].id
      });
      expect(tokens.length).toBeGreaterThan(0);

      // 6. Verify gallery access
      client.clearAuth();
      const gallery = await client.get(`/api/gallery/${event.id}`);
      expect(gallery.photos).toHaveLength(2);
      expect(gallery.photos[0].visibility).toBe('public');
    });
  });

  describe('Family Flow', () => {
    it('should complete full family purchase flow', async () => {
      // 1. Access with token
      const token = testData.familyTokens[0].token;
      const familyGallery = await client.get(`/api/family/gallery?token=${token}`);
      expect(familyGallery.photos).toBeDefined();
      expect(familyGallery.student).toBeDefined();

      // 2. Select photos
      const cart = await client.post('/api/family/cart', {
        token,
        items: [
          { photoId: familyGallery.photos[0].id, quantity: 2 },
          { photoId: familyGallery.photos[1].id, quantity: 1 }
        ]
      });
      expect(cart.total).toBeGreaterThan(0);

      // 3. Create order
      const order = await client.post('/api/family/orders', {
        token,
        cartId: cart.id
      });
      expect(order.status).toBe('pending');
      expect(order.mp_preference_id).toBeDefined();

      // 4. Simulate payment webhook
      const webhookPayload = createMPWebhookPayload({
        paymentId: 'TEST_PAYMENT_123',
        status: 'approved',
        externalReference: order.id
      });

      const webhookResult = await client.post(
        '/api/payments/webhook',
        webhookPayload,
        {
          headers: {
            'x-signature': generateMPSignature(webhookPayload)
          }
        }
      );
      expect(webhookResult.success).toBe(true);

      // 5. Verify order status
      const updatedOrder = await client.get(`/api/family/orders/${order.id}?token=${token}`);
      expect(updatedOrder.status).toBe('paid');
      expect(updatedOrder.mp_payment_id).toBe('TEST_PAYMENT_123');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle expired tokens gracefully', async () => {
      const expiredToken = 'EXPIRED_TOKEN_12345';
      const response = await client.get(`/api/family/gallery?token=${expiredToken}`);
      expect(response.status).toBe(401);
      expect(response.error).toContain('expired');
    });

    it('should prevent duplicate orders', async () => {
      const token = testData.familyTokens[0].token;

      // Create first order
      const order1 = await client.post('/api/family/orders', {
        token,
        items: [{ photoId: 'photo1', quantity: 1 }]
      });
      expect(order1.id).toBeDefined();

      // Try to create duplicate
      const order2 = await client.post('/api/family/orders', {
        token,
        items: [{ photoId: 'photo2', quantity: 1 }]
      });
      expect(order2.status).toBe(400);
      expect(order2.error).toContain('pending order already exists');
    });

    it('should handle rate limiting', async () => {
      const requests = Array(10).fill(null).map(() =>
        client.get('/api/gallery/test')
      );

      const results = await Promise.allSettled(requests);
      const rateLimited = results.filter(r =>
        r.status === 'fulfilled' && r.value.status === 429
      );

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
```

### Security Tests
**Archivo:** `__tests__/security/vulnerabilities.test.ts`

```typescript
describe('Security Vulnerabilities', () => {
  describe('SQL Injection', () => {
    it('should prevent SQL injection in search', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const response = await client.get(`/api/search?q=${encodeURIComponent(maliciousInput)}`);
      expect(response.status).not.toBe(500);

      // Verify tables still exist
      const tables = await supabase.from('users').select('count');
      expect(tables.error).toBeNull();
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize user input in responses', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      const response = await client.post('/api/comments', {
        text: xssPayload
      });

      expect(response.text).not.toContain('<script>');
      expect(response.text).toContain('&lt;script&gt;');
    });
  });

  describe('Path Traversal', () => {
    it('should prevent path traversal in file access', async () => {
      const maliciousPath = '../../../etc/passwd';
      const response = await client.get(`/api/files/${encodeURIComponent(maliciousPath)}`);
      expect(response.status).toBe(400);
      expect(response.error).toContain('Invalid path');
    });
  });

  describe('CSRF Protection', () => {
    it('should validate CSRF tokens on state-changing operations', async () => {
      const response = await client.post('/api/admin/delete', {
        id: 'test'
      }, {
        headers: {
          'Origin': 'https://evil.com'
        }
      });

      expect(response.status).toBe(403);
      expect(response.error).toContain('CSRF');
    });
  });
});
```

---

## TICKET 3.7: Monitoring & Alerting

### Monitoring Setup
**Archivo:** `lib/monitoring/monitor.ts`

```typescript
export class SystemMonitor {
  private static metrics = {
    requests: new Map<string, number>(),
    errors: new Map<string, number>(),
    latencies: new Map<string, number[]>(),
    webhookFailures: 0,
    tokenExpirations: 0,
  };

  static async recordRequest(
    path: string,
    duration: number,
    status: number
  ) {
    // Record metrics
    this.metrics.requests.set(path, (this.metrics.requests.get(path) || 0) + 1);

    if (status >= 400) {
      this.metrics.errors.set(path, (this.metrics.errors.get(path) || 0) + 1);
    }

    const latencies = this.metrics.latencies.get(path) || [];
    latencies.push(duration);
    this.metrics.latencies.set(path, latencies);

    // Check thresholds
    await this.checkAlerts();
  }

  static async checkAlerts() {
    const alerts = [];

    // High error rate
    for (const [path, errors] of this.metrics.errors) {
      const requests = this.metrics.requests.get(path) || 1;
      const errorRate = errors / requests;

      if (errorRate > 0.05) { // 5% error threshold
        alerts.push({
          type: 'HIGH_ERROR_RATE',
          path,
          rate: errorRate,
          severity: 'high'
        });
      }
    }

    // High latency
    for (const [path, latencies] of this.metrics.latencies) {
      const p95 = this.calculateP95(latencies);
      if (p95 > 1000) { // 1s threshold
        alerts.push({
          type: 'HIGH_LATENCY',
          path,
          p95,
          severity: 'medium'
        });
      }
    }

    // Webhook failures
    if (this.metrics.webhookFailures > 3) {
      alerts.push({
        type: 'WEBHOOK_FAILURES',
        count: this.metrics.webhookFailures,
        severity: 'critical'
      });
    }

    // Send alerts
    if (alerts.length > 0) {
      await this.sendAlerts(alerts);
    }
  }

  static async sendAlerts(alerts: Alert[]) {
    // Send to monitoring service
    if (process.env.SLACK_WEBHOOK) {
      await fetch(process.env.SLACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '🚨 System Alerts',
          attachments: alerts.map(alert => ({
            color: alert.severity === 'critical' ? 'danger' : 'warning',
            title: alert.type,
            fields: Object.entries(alert)
              .filter(([key]) => key !== 'type' && key !== 'severity')
              .map(([key, value]) => ({
                title: key,
                value: String(value),
                short: true
              }))
          }))
        })
      });
    }
  }

  static calculateP95(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] || 0;
  }
}
```

---

## ✅ VALIDATION CHECKLIST

### Security Validation
- [ ] RLS policies tested for all roles
- [ ] Rate limiting active on all endpoints
- [ ] No SQL injection vulnerabilities
- [ ] XSS prevention verified
- [ ] CSRF tokens implemented

### Testing Metrics
- [ ] Unit test coverage >80%
- [ ] Integration tests passing
- [ ] E2E tests covering critical flows
- [ ] Security tests comprehensive
- [ ] Performance tests meeting targets

### Monitoring
- [ ] Alerts configured
- [ ] Metrics dashboard active
- [ ] Error tracking enabled
- [ ] Webhook monitoring live

---

**SIGUIENTE:** Continuar con `VALIDATION_CHECKLIST.md`
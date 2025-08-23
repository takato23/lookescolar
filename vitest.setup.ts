import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { cleanup } from '@testing-library/react';

// Mock global objects for testing environment
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  const { randomUUID } = require('crypto');
  global.crypto = global.crypto || {};
  if (!global.crypto.randomUUID) {
    Object.defineProperty(global.crypto, 'randomUUID', {
      value: randomUUID || (() => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }),
      writable: true,
      configurable: true
    });
  }
}

// Setup para todos los tests
beforeAll(async () => {
  // Cargar .env.test si existe; si no, defaults seguros
  const envTestPath = path.resolve(process.cwd(), '.env.test');
  if (fs.existsSync(envTestPath)) {
    const lines = fs.readFileSync(envTestPath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } else {
    // Fallback: cargar .env.local si no hay .env.test
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const lines = fs.readFileSync(envLocalPath, 'utf-8').split(/\r?\n/);
      for (const line of lines) {
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }

  process.env['NEXT_PUBLIC_SUPABASE_URL'] = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'http://localhost:54321';
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || 'stub';
  process.env['SUPABASE_SERVICE_ROLE_KEY'] = process.env['SUPABASE_SERVICE_ROLE_KEY'] || 'stub';
  process.env['SUPABASE_URL'] = process.env['SUPABASE_URL'] || 'http://localhost:54321';
  process.env['STORAGE_BUCKET'] = process.env['STORAGE_BUCKET'] || 'photos';
  process.env['APPROX_PREVIEW_BYTES'] = process.env['APPROX_PREVIEW_BYTES'] || '200000';
  process.env['UPSTASH_REDIS_REST_URL'] = process.env['UPSTASH_REDIS_REST_URL'] || 'http://localhost:6380';
  process.env['UPSTASH_REDIS_REST_TOKEN'] = process.env['UPSTASH_REDIS_REST_TOKEN'] || 'stub';
  process.env['MERCADOPAGO_ACCESS_TOKEN'] = process.env['MERCADOPAGO_ACCESS_TOKEN'] || 'stub';
  process.env['MP_ACCESS_TOKEN'] = process.env['MP_ACCESS_TOKEN'] || 'stub';
  process.env['MP_WEBHOOK_SECRET'] = process.env['MP_WEBHOOK_SECRET'] || 'stub';
  process.env['NEXT_PUBLIC_APP_URL'] = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
  process.env['BASE_URL'] = process.env['BASE_URL'] || process.env['NEXT_PUBLIC_BASE_URL'] || 'http://localhost:3000';

  process.env['TEST_ADMIN_EMAIL'] = process.env['TEST_ADMIN_EMAIL'] || 'admin@lookescolar.test';
  process.env['TEST_ADMIN_PASSWORD'] = process.env['TEST_ADMIN_PASSWORD'] || 'test-admin-password-123';

  // Wrapper de fetch para normalizar URLs relativas en entorno de test (jsdom)
  try {
    const base = process.env['BASE_URL'] || process.env['NEXT_PUBLIC_BASE_URL'] || 'http://localhost:3000';
    const originalFetch: any = (globalThis as any).fetch;
    if (typeof originalFetch === 'function') {
      (globalThis as any).fetch = ((input: any, init?: any) => {
        const urlStr = typeof input === 'string' ? input : (input?.url ?? input);
        if (typeof urlStr === 'string' && !/^https?:\/\//i.test(urlStr)) {
          // Ensure the path starts with a single slash
          const sanitizedPath = urlStr.startsWith('/') ? urlStr : `/${urlStr}`;
          try {
            const absolute = new URL(sanitizedPath, base).toString();
            return originalFetch(absolute, init);
          } catch (urlError) {
            console.warn(`Failed to construct URL from ${sanitizedPath} and base ${base}:`, urlError);
            return originalFetch(urlStr, init);
          }
        }
        return originalFetch(input, init);
      }) as any;
    }
  } catch (setupError) {
    console.warn('Failed to setup fetch wrapper:', setupError);
  }

  // Mocks adicionales para dependencias pesadas si estamos en modo fake DB
  if (process.env['SEED_FAKE_DB'] === '1') {
    vi.mock('exifr', () => ({ parse: async () => ({}) }));
    vi.mock('zxing-wasm', () => ({
      BrowserMultiFormatReader: class {
        decode() {
          return { getText: () => 'SV-001' } as any;
        }
      },
      RGBLuminanceSource: class {},
      BinaryBitmap: class {},
      HybridBinarizer: class {},
    }));
  }

  // Modo SEED_FAKE_DB: mock de Supabase y Next.js usando fixtures JSON
  if (process.env['SEED_FAKE_DB'] === '1') {
    // Mock Next.js server primitives
    vi.mock('next/server', () => {
      class NextResponse extends Response {
        static json(body: unknown, init?: { status?: number; headers?: HeadersInit }) {
          const headers = new Headers(init?.headers || {});
          headers.set('content-type', 'application/json');
          return new NextResponse(JSON.stringify(body), { status: init?.status ?? 200, headers });
        }
      }
      class NextRequest extends Request {
        nextUrl: URL;
        constructor(input: any, init?: RequestInit) {
          const url = typeof input === 'string' ? input : input?.url || '';
          super(url || input, init);
          this.nextUrl = new URL(url || this.url);
        }
      }
      return { NextResponse, NextRequest } as any;
    });

    // Middlewares (auth y rate limit) en modo passthrough
    vi.mock('@/lib/middleware/auth.middleware', () => ({
      AuthMiddleware: { withAuth: (h: any) => (req: any, ...rest: any[]) => h(req, { isAdmin: true }, ...rest) },
      withAuth: (h: any) => (req: any, ...rest: any[]) => h(req, { isAdmin: true }, ...rest),
      SecurityLogger: { logResourceAccess: vi.fn(), logSecurityEvent: vi.fn() },
    }));
    vi.mock('@/lib/middleware/rate-limit.middleware', () => ({
      RateLimitMiddleware: { withRateLimit: (h: any) => (req: any, ...rest: any[]) => h(req, ...rest) },
    }));

    vi.mock('@supabase/supabase-js', () => {
      // Cargar fixtures y utilidades DENTRO del factory para evitar problemas de scope/hoisting
      const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/seed-v1.json');
      let dataset: any = { events: [], courses: [], codes: [], photos: [], orders: [], order_items: [], tokens: [] };
      if (fs.existsSync(fixturePath)) {
        dataset = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      }
      type Row = Record<string, unknown>;
      function tableData(name: string): Row[] {
        const map: Record<string, Row[]> = {
          events: dataset.events,
          courses: dataset.courses,
          codes: dataset.codes,
          photos: dataset.photos,
          orders: dataset.orders,
          order_items: dataset.order_items,
          tokens: dataset.tokens,
        };
        if (!Object.prototype.hasOwnProperty.call(map, name)) {
          // eslint-disable-next-line no-console
          console.error(`[Service] MockSupabase: tabla desconocida: ${name}`);
          (map as any)[name] = [];
        }
        return map[name] || [];
      }
      return {
        createClient: (_url: string, _key: string) => {
          const from = (table: string) => {
            let rows = JSON.parse(JSON.stringify(tableData(table)));
            const chain: any = {
                select: (_cols?: string) => chain,
                insert: (payload: any) => {
                  const arr = Array.isArray(payload) ? payload : [payload];
                  rows = rows.concat(arr.map((x: any) => JSON.parse(JSON.stringify(x))));
                  dataset[table] = rows;
                  return Promise.resolve({ data: arr, error: null });
                },
                update: (payload: any) => {
                  return {
                    eq: (col: string, val: any) => {
                      rows = rows.map((r: any) => (r[col] === val ? { ...r, ...payload } : r));
                      dataset[table] = rows;
                      return Promise.resolve({ data: rows, error: null });
                    },
                  };
                },
                delete: () => ({ eq: (_c: string, _v: any) => Promise.resolve({ data: null, error: null }) }),
                eq: (col: string, val: any) => {
                  rows = rows.filter((r: any) => r[col] === val);
                  return chain;
                },
                in: (col: string, vals: any[]) => {
                  rows = rows.filter((r: any) => vals.includes(r[col]));
                  return chain;
                },
                not: (col: string, op: string, val: any) => {
                  if (op === 'is' && val === null) {
                    rows = rows.filter((r: any) => r[col] !== null && typeof r[col] !== 'undefined');
                  }
                  return chain;
                },
                order: (col: string, opts?: { ascending?: boolean }) => {
                  const asc = opts?.ascending !== false;
                  rows = rows.sort((a: any, b: any) => (a[col] > b[col] ? 1 : -1) * (asc ? 1 : -1));
                  return chain;
                },
                range: (_from: number, _to: number) => chain,
                limit: (_n: number) => chain,
                single: () => Promise.resolve({ data: rows[0] || null, error: null }),
                maybeSingle: () => Promise.resolve({ data: rows[0] || null, error: null }),
                then: (res: any) => res({ data: rows, error: null }),
            } as any;
            return chain;
          };
          const api = {
            from,
            storage: {
              from: (_bucket: string) => ({
                createSignedUrl: async (key: string, expiresSec: number) => ({
                  data: { signedUrl: `https://signed.local/${encodeURIComponent(key)}?exp=${expiresSec}`, path: key, expiresIn: expiresSec },
                  error: null,
                }),
                download: async (_path: string) => {
                  // Devolver blob vacío con arrayBuffer para compat
                  const blob = new Blob([]);
                  return { data: blob, error: null } as any;
                },
              }),
            },
          };
          return api as any;
        },
      };
    });
  }
});

// Cleanup después de cada test
afterEach(() => {
  cleanup();
});

// Cleanup global
afterAll(() => {
  // Cleanup global si es necesario
});
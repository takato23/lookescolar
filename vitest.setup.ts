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

  process.env['TEST_ADMIN_EMAIL'] = process.env['TEST_ADMIN_EMAIL'] || 'admin@lookescolar.test';
  process.env['TEST_ADMIN_PASSWORD'] = process.env['TEST_ADMIN_PASSWORD'] || 'test-admin-password-123';
});

// Cleanup después de cada test
afterEach(() => {
  cleanup();
});

// Cleanup global
afterAll(() => {
  // Cleanup global si es necesario
});
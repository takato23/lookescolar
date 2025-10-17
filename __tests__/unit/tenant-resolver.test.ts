import { describe, expect, it, beforeEach } from 'vitest';
import {
  resolveTenantId,
  resolveTenantFromHeaders,
  resolveTenantForBrowser,
} from '@/lib/multitenant/tenant-resolver';
import {
  getDefaultTenantId,
  resetTenantDomainCache,
} from '@/lib/multitenant/config';

describe('tenant resolver', () => {
  const defaultTenant = getDefaultTenantId();

  beforeEach(() => {
    resetTenantDomainCache();
    process.env.MULTITENANT_DOMAIN_MAP = JSON.stringify({
      'admin.lookescolar.com': '11111111-1111-1111-1111-111111111111',
      'school.lookescolar.com': '22222222-2222-2222-2222-222222222222',
      '*.tenant.lookescolar.com': '33333333-3333-3333-3333-333333333333',
    });
  });

  it('prefers explicit tenant id when provided', () => {
    const result = resolveTenantId({
      explicitTenantId: '11111111-1111-1111-1111-111111111111',
    });
    expect(result.tenantId).toBe('11111111-1111-1111-1111-111111111111');
    expect(result.source).toBe('explicit');
  });

  it('falls back to header tenant id', () => {
    const result = resolveTenantId({
      headerTenantId: '22222222-2222-2222-2222-222222222222',
    });
    expect(result.tenantId).toBe('22222222-2222-2222-2222-222222222222');
    expect(result.source).toBe('header');
  });

  it('resolves tenant from direct domain match', () => {
    const result = resolveTenantId({ host: 'admin.lookescolar.com' });
    expect(result.tenantId).toBe('11111111-1111-1111-1111-111111111111');
    expect(result.source).toBe('domain');
  });

  it('resolves tenant from wildcard domain match', () => {
    const result = resolveTenantId({ host: 'media.tenant.lookescolar.com' });
    expect(result.tenantId).toBe('33333333-3333-3333-3333-333333333333');
    expect(result.source).toBe('domain');
  });

  it('returns default tenant when no match found', () => {
    const result = resolveTenantId({ host: 'unknown.domain.com' });
    expect(result.tenantId).toBe(defaultTenant);
    expect(result.source).toBe('default');
  });

  it('resolves from headers map', () => {
    const headers = new Headers({
      'x-tenant-id': '22222222-2222-2222-2222-222222222222',
      host: 'other.lookescolar.com',
    });
    const result = resolveTenantFromHeaders(headers);
    expect(result.tenantId).toBe('22222222-2222-2222-2222-222222222222');
    expect(result.source).toBe('header');
  });

  it('supports browser resolution fallback', () => {
    const result = resolveTenantForBrowser(null);
    expect(result.tenantId).toBe(defaultTenant);
  });
});

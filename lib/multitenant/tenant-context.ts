import { AsyncLocalStorage } from 'node:async_hooks';
import { getDefaultTenantId, sanitizeTenantId } from './config';

const tenantStorage = new AsyncLocalStorage<string>();

export function setTenantForRequest(tenantId?: string | null): string {
  const normalized = sanitizeTenantId(tenantId) ?? getDefaultTenantId();
  tenantStorage.enterWith(normalized);
  return normalized;
}

export function runWithTenant<T>(
  tenantId: string | null | undefined,
  callback: () => T
): T {
  const normalized = sanitizeTenantId(tenantId) ?? getDefaultTenantId();
  return tenantStorage.run(normalized, callback);
}

export function getTenantFromContext(): string {
  return tenantStorage.getStore() ?? getDefaultTenantId();
}

import {
  getDefaultTenantId,
  resolveTenantIdFromDomain,
  sanitizeTenantId,
} from './config';

export type TenantResolutionSource =
  | 'explicit'
  | 'header'
  | 'domain'
  | 'default';

export interface TenantResolutionResult {
  tenantId: string;
  source: TenantResolutionSource;
  domain?: string | null;
}

export interface ResolveTenantOptions {
  explicitTenantId?: string | null;
  headerTenantId?: string | null;
  host?: string | null;
}

function normalizeHost(host?: string | null): string | null {
  if (!host) {
    return null;
  }

  return host.split(':')[0]?.toLowerCase() ?? null;
}

export function resolveTenantId(
  options: ResolveTenantOptions = {}
): TenantResolutionResult {
  const explicit = sanitizeTenantId(options.explicitTenantId);
  if (explicit) {
    return { tenantId: explicit, source: 'explicit' };
  }

  const header = sanitizeTenantId(options.headerTenantId);
  if (header) {
    return { tenantId: header, source: 'header' };
  }

  const host = normalizeHost(options.host);
  const domainTenant = resolveTenantIdFromDomain(host ?? undefined);
  if (domainTenant) {
    return { tenantId: domainTenant, source: 'domain', domain: host };
  }

  return { tenantId: getDefaultTenantId(), source: 'default', domain: host };
}

export function resolveTenantFromHeaders(
  headersLike?: Headers | Record<string, string | null | undefined> | null
): TenantResolutionResult {
  if (!headersLike) {
    return resolveTenantId();
  }

  const getHeader = (name: string): string | null => {
    if (headersLike instanceof Headers) {
      return headersLike.get(name);
    }

    const value =
      (headersLike as Record<string, string | null | undefined>)[name] ??
      (headersLike as Record<string, string | null | undefined>)[
        name.toLowerCase()
      ];

    return value ?? null;
  };

  return resolveTenantId({
    headerTenantId: getHeader('x-tenant-id'),
    host: getHeader('x-forwarded-host') ?? getHeader('host'),
  });
}

export function resolveTenantForBrowser(
  explicitTenantId?: string | null
): TenantResolutionResult {
  if (explicitTenantId) {
    return resolveTenantId({ explicitTenantId });
  }

  if (typeof window === 'undefined') {
    return resolveTenantId();
  }

  return resolveTenantId({
    headerTenantId: null,
    host: window.location.hostname,
  });
}

// Allow nil UUIDs (all zeros) in addition to standard UUIDs
const UUID_REGEX =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const DEFAULT_FALLBACK_TENANT = '00000000-0000-0000-0000-000000000000';

type DomainMap = Map<string, string>;

let cachedDomainMap: DomainMap | null = null;

function parseJsonDomainMap(raw: unknown): DomainMap {
  const map: DomainMap = new Map();

  if (!raw || typeof raw !== 'object') {
    return map;
  }

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key !== 'string' || typeof value !== 'string') {
      continue;
    }

    const tenantId = sanitizeTenantId(value);
    if (!tenantId) {
      continue;
    }

    map.set(key.toLowerCase(), tenantId);
  }

  return map;
}

function parseDelimitedDomainMap(raw: string): DomainMap {
  const map: DomainMap = new Map();
  const entries = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const [domain, tenant] = entry.split('=').map((part) => part.trim());
    if (!domain || !tenant) {
      continue;
    }

    const tenantId = sanitizeTenantId(tenant);
    if (!tenantId) {
      continue;
    }

    map.set(domain.toLowerCase(), tenantId);
  }

  return map;
}

export function sanitizeTenantId(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (UUID_REGEX.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

export function getDefaultTenantId(): string {
  return (
    sanitizeTenantId(process.env.NEXT_PUBLIC_MULTITENANT_DEFAULT_TENANT_ID) ||
    sanitizeTenantId(process.env.MULTITENANT_DEFAULT_TENANT_ID) ||
    DEFAULT_FALLBACK_TENANT
  );
}

export function getTenantDomainMap(): DomainMap {
  if (cachedDomainMap) {
    return cachedDomainMap;
  }

  const raw =
    process.env.MULTITENANT_DOMAIN_MAP ||
    process.env.NEXT_PUBLIC_MULTITENANT_DOMAIN_MAP;

  if (!raw) {
    cachedDomainMap = new Map();
    return cachedDomainMap;
  }

  try {
    const parsed = JSON.parse(raw);
    cachedDomainMap = parseJsonDomainMap(parsed);
  } catch {
    cachedDomainMap = parseDelimitedDomainMap(raw);
  }

  return cachedDomainMap;
}

export function resolveTenantIdFromDomain(host?: string | null): string | null {
  if (!host) {
    return null;
  }

  const hostname = host.split(':')[0]?.toLowerCase();
  if (!hostname) {
    return null;
  }

  const domainMap = getTenantDomainMap();
  const directTenant = domainMap.get(hostname);
  if (directTenant) {
    return directTenant;
  }

  for (const [key, tenantId] of domainMap.entries()) {
    if (!key.startsWith('*.')) {
      continue;
    }

    const suffix = key.slice(1);
    if (hostname.endsWith(suffix)) {
      return tenantId;
    }
  }

  return null;
}

export function resetTenantDomainCache() {
  cachedDomainMap = null;
}

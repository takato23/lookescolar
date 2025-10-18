# Multitenancy Guide

This project now supports tenant-aware isolation across the database, API and frontend layers. Use this document to configure domains, environment variables and operational workflows for each tenant.

## Environment variables

| Variable | Scope | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_MULTITENANT_DEFAULT_TENANT_ID` | Web, Edge | Tenant id used when no match is found (should be the fallback tenant inserted in migrations). |
| `MULTITENANT_DEFAULT_TENANT_ID` | Server | Same as above but available for Node-only contexts. |
| `MULTITENANT_DOMAIN_MAP` | Server, Edge | JSON object or comma-separated mapping of domains to tenant ids. Supports wildcards (e.g. `{"admin.lookescolar.com":"<uuid>","*.tenant.lookescolar.com":"<uuid>"}`). |

## Tenant resolution workflow

1. **Middleware:** Resolves tenant from `x-tenant-id` header or request host and injects the result into downstream requests.
2. **Server clients:** `createServerSupabaseClient` automatically reads the injected header, sets the tenant context and scopes Supabase queries.
3. **Browser clients:** `createClient` resolves the tenant from the browser host and scopes Supabase queries on the client.
4. **Database policies:** RLS policies use the `x-tenant-id` header to ensure cross-tenant data cannot be read or mutated.

## Adding new tenant-aware tables

1. Add a `tenant_id uuid references tenants(id)` column with `NOT NULL`.
2. Backfill tenant values joining with related tables.
3. Create an index on `tenant_id`.
4. Add RLS policy mirroring `Tenant scoped access` used in existing tables.
5. Extend `TENANT_SCOPED_TABLES` in `lib/multitenant/supabase-tenant.ts` so client wrappers automatically filter the table.

## Testing

Run `npm run test -- --run __tests__/unit/tenant-resolver.test.ts` to verify tenant resolution logic. Linting and type checks ensure the new wrappers compile across the codebase.

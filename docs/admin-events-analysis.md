# /admin/events Security, Reliability, and Readiness Analysis

Date: 2025-09-09
Reviewer: Codex (security + production readiness)
Scope: Admin Events module (UI, API, middleware, services) powering `/admin/events` and `/api/admin/events*`

## Executive Summary

Overall, the /admin/events module is functionally rich and close to production, but it contains critical security gaps that must be remediated before go‑live. Two unauthenticated admin endpoints allow data exposure and unauthorized event creation. Additionally, CORS is overly permissive for any `*.vercel.app` origin, CSRF protections are not applied to state‑changing admin endpoints, and a dev‑auth bypass can silently apply if `NODE_ENV` is misconfigured.

Top risks (severity · likelihood):
- Critical · High: Unauthenticated admin endpoints
  - Public GET: `/api/admin/events/[id]` returns event details + stats without auth
    - app/api/admin/events/[id]/route.ts:61
  - Public GET/POST: `/api/admin/events-simple` allows listing and creating events without auth
    - app/api/admin/events-simple/route.ts:5 and :81
- Critical · High: CORS allows any `https://*.vercel.app`, enabling cross‑site calls with credentials and CSRF exposure
  - middleware.ts:6–13
- High · Medium: No CSRF validation on state‑changing admin endpoints (POST/PATCH/DELETE)
  - Auth middleware provides `withAuthAndCSRF` but routes use `withAuth` only
  - lib/middleware/auth.middleware.ts exports CSRF helpers; not applied on events routes
- High · Medium: Dev auth bypass if `NODE_ENV` != `production` (misconfig risk)
  - lib/middleware/auth.middleware.ts:90–113
- Medium · Medium: Inefficient slug resolution (O(N) scan) in event GET by [id] can degrade under load
  - app/api/admin/events/[id]/route.ts:11–58
- Medium · Medium: Sorting field not whitelisted; invalid `sort_by` causes errors (reliability/DoS-lite)
  - app/api/admin/events/route.ts:58–61, 87–93
- Medium · Medium: Hard delete with `force=true` may orphan dependent data (e.g., orders)
  - app/api/admin/events/[id]/route.ts:240–367
- Low · Medium: Service-role fallback to anon key may break assumptions and leak behavior differences
  - lib/supabase/server.ts:87–100

Immediate blockers to production are the unauthenticated endpoints and CORS/CSRF posture. All critical issues have straightforward remediations.

---

## Flow Overview

Textual sequence for the main operations.

1) List Events (/admin/events)
- UI SSR page loads: `app/admin/events/page.tsx`
  - Calls primary `GET /api/admin/events` with `include_stats=true` and pagination
    - app/admin/events/page.tsx:27–28, 54–76
  - Fallback to `GET /api/admin/events-robust` on failure
- API: `GET /api/admin/events`
  - Guards: RateLimit + AuthMiddleware
    - app/api/admin/events/route.ts:25–29
  - Reads query params; fetches from Supabase (service client; fallback to SSR anon)
    - app/api/admin/events/route.ts:53–101
  - Optional stats via RPC or batched queries
    - app/api/admin/events/route.ts:140–170, 173–243
  - Returns array or `{ data: { events }, pagination }`
- Dependencies: Supabase DB (events, subjects, orders, assets via service), RPC `get_event_stats` when available

2) Create Event (/admin/events/new)
- UI client: `app/admin/events/new/page.tsx`
  - Submits to `POST /api/admin/events-simple`
    - app/admin/events/new/page.tsx:56–71
- API: `POST /api/admin/events-simple`
  - No auth middleware; uses service role client to insert
    - app/api/admin/events-simple/route.ts:81–104
  - Revalidates `/admin/events`
- Risk: Unauthenticated event creation (critical)

3) Event Details (/admin/events/[id])
- UI client: `app/admin/events/[id]/page.tsx`
  - Fetches `GET /api/admin/events/[id]` with timeout and fallback to `GET /api/admin/events?id=` (likely a bug)
    - app/admin/events/[id]/page.tsx:45–87
- API: `GET /api/admin/events/[id]`
  - RateLimit only; NO auth; resolves slug→UUID by scanning all events
    - app/api/admin/events/[id]/route.ts:61–72
  - Loads event + stats (subjects, orders, assets via UnifiedPhotoService)
    - app/api/admin/events/[id]/route.ts:74–127
- Risk: Unauthenticated details + stats exposure (critical); O(N) slug resolution (perf)

4) Update/Delete Event
- API: `PATCH /api/admin/events/[id]` and `DELETE /api/admin/events/[id]`
  - Both wrapped by `withAuth` + RateLimit (auth required)
    - app/api/admin/events/[id]/route.ts:168–214 (PATCH), 220–367 (DELETE)
  - DELETE supports `force=true`; deletes assets/folders/subjects/codes but not orders

5) Event Stats (/api/admin/events/[id]/stats)
- API: `GET /api/admin/events/[id]/stats`
  - Wrapped by `withAuth` (auth required)
    - app/api/admin/events/[id]/stats/route.ts:1–15
  - Parallel counts via Supabase; returns normalized stats

6) Cross-cutting
- Auth: `AuthMiddleware` with dev bypass; role check via user metadata or `ADMIN_EMAILS`
  - lib/middleware/auth.middleware.ts:90–113, 240–260
- CSRF helpers exist but unused in events routes
  - lib/middleware/auth.middleware.ts:286–340
- Rate limiting: per-route middleware, memory store by default or Upstash Redis
  - lib/middleware/rate-limit.middleware.ts
- CORS/Security headers: global middleware, permissive origins including `*.vercel.app`, anti‑hotlinking for some paths, UA blocking disabled
  - middleware.ts:6–13; 121–148

---

## Detailed Findings

### 1) Public admin endpoints (Critical)

- Unauthenticated Event Details
  - `GET /api/admin/events/[id]` lacks auth; exposes event metadata and derived stats (subjects/orders/revenue)
  - File: app/api/admin/events/[id]/route.ts:61
  - Impact: Any external party can enumerate or fetch sensitive event details and business metrics if they know or guess identifiers or friendly slugs.
  - Repro:
    - curl -i "https://<host>/api/admin/events/<event-uuid-or-slug>"

- Unauthenticated Event List/Create
  - `GET /api/admin/events-simple` and `POST /api/admin/events-simple` have no auth
  - File: app/api/admin/events-simple/route.ts:5 (GET), :81 (POST)
  - Impact:
    - Read: returns recent event list (metadata)
    - Write: allows creating new events using service role privileges, from the public internet
  - Repro:
    - curl -i "https://<host>/api/admin/events-simple"
    - curl -i -X POST -H 'Content-Type: application/json' \
      -d '{"name":"Injected","date":"2025-01-01"}' \
      "https://<host>/api/admin/events-simple"

Recommendation (immediate):
- Remove `events-simple` route from production or wrap both handlers with `withAuthAndCSRF`.
- Add `withAuth` to `GET /api/admin/events/[id]`.
- Consider placing all `/api/admin/*` under a robust auth gate and remove any public fallbacks.

Severity: Critical | Likelihood: High | Affected: Confidentiality + Integrity


### 2) Over-permissive CORS for admin APIs (Critical)

- Allowed origins include any `https://*.vercel.app` and set `Access-Control-Allow-Credentials: true` for allowed origins
  - File: middleware.ts:6–13, 233–262
- Impact: Any site deployed on vercel.app can send credentialed cross-origin requests to your admin APIs. Combined with missing CSRF and unauthenticated routes, this is a severe cross-site exposure.
- Repro: From any `https://<attacker>.vercel.app` front-end, issue a `fetch('https://<your-host>/api/admin/events-simple', { method: 'POST', credentials: 'include', ... })` — the preflight will pass and the request will execute on your origin.

Recommendation (immediate):
- Replace wildcard `https://*.vercel.app` with explicit known project domains only, or remove it for admin APIs.
- Consider separating admin APIs behind an admin subdomain and enforce strict origin checks there.

Severity: Critical | Likelihood: High | Affected: Integrity + Confidentiality


### 3) Missing CSRF protection on state-changing admin routes (High)

- `withAuthAndCSRF` is implemented but not used by event mutations
  - File: lib/middleware/auth.middleware.ts:286–340 (CSRF), events routes use `withAuth` only
- Impact: If an authenticated admin visits a malicious site (or any allowed origin), forged POST/PATCH/DELETE requests can be executed.

Recommendation:
- Switch mutations to `withAuthAndCSRF` and enforce CSRF tokens for POST/PATCH/DELETE.
- Ensure Supabase auth cookies are set with `SameSite=Lax` or `Strict` where possible.

Severity: High | Likelihood: Medium | Affected: Integrity


### 4) Dev auth bypass dependent on NODE_ENV (High, config risk)

- In non-production, `authenticateAdmin` unconditionally authenticates as admin
  - File: lib/middleware/auth.middleware.ts:90–113
- Impact: If `NODE_ENV` is misconfigured in production (or staging accessible to the internet), all admin APIs would be open.

Recommendation:
- Guard by an explicit env flag (e.g., `ALLOW_DEV_AUTH_BYPASS=false` in production) and default to false.
- Add a startup check that logs and refuses to start if bypass would be active in non-local environments.

Severity: High | Likelihood: Medium | Affected: Confidentiality + Integrity


### 5) Inefficient friendly-id resolution (Medium)

- `resolveFriendlyEventIdInline` selects all events then computes a slug in memory to match
  - File: app/api/admin/events/[id]/route.ts:11–58
- Impact: O(N) scan each request; N grows with events; potential performance degradation and cost.

Recommendation:
- Persist a normalized slug column with a unique index; resolve via indexed lookup (`.eq('slug', identifier)`).
- Provide an RPC for resolution if complex logic is needed server-side.

Severity: Medium | Likelihood: Medium | Affected: Performance


### 6) Sorting field not whitelisted (Medium)

- `sort_by` directly used in `.order(sortBy)`
  - File: app/api/admin/events/route.ts:58–61, 87–93
- Impact: Invalid field produces 400/500 errors from Supabase; attacker can trigger noisy errors (low DoS potential).

Recommendation:
- Whitelist allowed fields: `['created_at','date','name','status']`. Reject others with 400.

Severity: Medium | Likelihood: Medium | Affected: Reliability


### 7) Hard delete may orphan data (Medium)

- `DELETE /api/admin/events/[id]` with `force=true` deletes assets/folders/subjects/codes but not orders
  - File: app/api/admin/events/[id]/route.ts:278–355
- Impact: Orphan orders or integrity drift; rollbacks complicated.

Recommendation:
- Enforce referential integrity in DB (FKs with ON DELETE CASCADE) or perform a full cleanup (orders, pricing, tokens, shares, analytics rows) within a transaction.
- Consider soft-deletes with background cleanup jobs.

Severity: Medium | Likelihood: Medium | Affected: Data integrity


### 8) Service role fallback to anon (Low)

- If `SUPABASE_SERVICE_ROLE_KEY` is missing, service client falls back to anon
  - File: lib/supabase/server.ts:87–100
- Impact: Behavior may silently degrade (RLS enforced); code tries to fallback to SSR anon; debugging complexity.

Recommendation:
- Fail-fast if service role is required for an endpoint; log and return 500 with actionable message.

Severity: Low | Likelihood: Medium | Affected: Operability


### 9) UA blocking and anti-hotlinking disabled or relaxed (Low)

- `isBlockedUserAgent` returns false (disabled), anti-hotlinking bypass for admin photos
  - File: middleware.ts:280–318 (disabled), 58–65 (bypass)
- Impact: Increases surface for scraping (minor given auth should protect sensitive endpoints).

Recommendation:
- Re-enable UA blocking and hotlinking checks post-launch, but rely primarily on auth/CSRF rate limits.

Severity: Low | Likelihood: Medium | Affected: Abuse prevention


### 10) Minor UI logic bug on event detail fallback (Low)

- Fallback fetch uses `/api/admin/events?id=...` which returns a list; code then sets `event` from possibly array
  - File: app/admin/events/[id]/page.tsx:69–87
- Impact: Potential null states or console noise; not security related.

Recommendation:
- Remove fallback or point to a protected single-event endpoint.

Severity: Low | Likelihood: Medium | Affected: UX reliability

---

## Recommendations (Prioritized)

1) Lock down admin APIs (Blocker)
- Add `withAuthAndCSRF` to all state‑changing routes: `POST /api/admin/events`, `PATCH/DELETE /api/admin/events/[id]`, and any other admin mutations.
- Add `withAuth` to `GET /api/admin/events/[id]`.
- Remove or protect `events-simple` (wrap in `withAuthAndCSRF` or delete entirely).

2) Fix CORS policy (Blocker)
- Remove `https://*.vercel.app` wildcard for admin; enumerate exact admin origins only.
- Consider separate CORS for public vs admin paths.

3) Eliminate dev bypass risk
- Replace implicit `NODE_ENV !== 'production'` bypass with explicit `ALLOW_DEV_BYPASS=true` for local only; default false. Add boot‑time safety check.

4) Add `slug` column for events and index it
- Migrate: backfill normalized slugs; add unique index; update resolver to single indexed lookup.

5) Harden query params
- Whitelist `sort_by` and `sort_order`; validate `status` strictly; return 400 for invalid params.

6) Safe deletes and data lifecycle
- Prefer soft delete; if hard delete, cover orders and related tables in a transaction or via DB FKs with CASCADE.

7) Testing and monitoring
- Add tests for unauthorized access (expect 401/403) for all `/api/admin/events*` endpoints.
- Add synthetic monitors for auth-required endpoints and 5xx rates.

---

## Risk Assessment for Production

- Current risk level: Unacceptable for production until Critical items fixed
- Critical issues enable:
  - Unauthorized event creation (integrity failure)
  - Sensitive event metrics disclosure (confidentiality failure)
  - Cross‑site request risks amplified by permissive CORS
- After remediations, expected risk: Low–Medium, dominated by operational and performance considerations

---

## Appendices

### A) Key Code References
- Events list API (auth-protected): app/api/admin/events/route.ts:25
- Events robust API (auth-protected): app/api/admin/events-robust/route.ts:1
- Events simple API (unauthenticated): app/api/admin/events-simple/route.ts:5, :81
- Event details API (unauthenticated GET): app/api/admin/events/[id]/route.ts:61
- Event details PATCH/DELETE (authenticated): app/api/admin/events/[id]/route.ts:168, :220
- Event stats API (authenticated): app/api/admin/events/[id]/stats/route.ts:1–15
- Admin page SSR: app/admin/events/page.tsx:27–28, 54–76
- Admin details page: app/admin/events/[id]/page.tsx:45–87
- Auth middleware (dev bypass + CSRF helpers): lib/middleware/auth.middleware.ts:90–113, 286–340
- CORS origins: middleware.ts:6–13

### B) Proposed Patches (high level)
- app/api/admin/events-simple/route.ts
  - Wrap both GET and POST with `withAuthAndCSRF`
- app/api/admin/events/[id]/route.ts
  - Wrap GET with `withAuth`
  - Replace slug scan with `slug` lookup
- middleware.ts
  - Replace `https://*.vercel.app` with explicit origins or remove for admin
- app/api/admin/events/route.ts
  - Whitelist `sort_by` and `sort_order` params

### C) Example Tests (pseudo)
- Unauth access
  - GET `/api/admin/events` → 401
  - GET `/api/admin/events/[id]` → 401
  - POST `/api/admin/events` → 401
- CSRF
  - POST `/api/admin/events` without `x-csrf-token` → 403
  - POST with valid token → 200

### D) Assumptions
- Supabase tables: `events`, `folders`, `assets`, `orders`, `subjects`, `codes`
- Production uses separate admin domain where cookies are first‑party
- `get_event_stats` RPC exists in some environments; fallbacks are acceptable when auth-guarded

---

## Closing

Addressing the highlighted Critical and High issues (auth, CORS, CSRF) will materially reduce risk and align the /admin/events module with production readiness expectations. I can follow up with concrete patches upon approval to enforce auth, tighten CORS, and add CSRF, plus provide a migration for an indexed `slug` column and guardrails for deletes.


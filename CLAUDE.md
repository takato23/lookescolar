# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note for AI assistants:** Reference `docs/CLAUDE_CONTEXT.md` for fixed project context and `docs/specs/*.md` for specifications.

## Project Overview

LookEscolar is a multi-tenant school photography management system built with Next.js 15 (App Router), Supabase, and TypeScript. It provides admin photo management, QR code tagging, family galleries with token-based access, and Mercado Pago payment integration.

**Key Features**:
- Multi-tenant architecture with tenant resolution via headers and domain mapping
- Admin dashboard for event/photo/student management
- QR code generation and scanning for photo-student tagging
- Token-based family access (no passwords) with 30-day expiry
- Hierarchical folder structure for photo organization
- Mercado Pago payment integration with webhook handling
- Multi-resolution WebP image pipeline (300/800/1200px)
- React Query caching with optimized stale/garbage collection times

**Recent Optimizations (2025)**:
- ✅ Multi-resolution WebP pipeline - 60% storage reduction
- ✅ React Query caching (30s stale, 5min gc) - Fast refresh cycles
- ✅ N+1 query elimination - All endpoints use JOINs
- ✅ Storage monitor & auto-cleanup - Supabase free tier compliance
- ✅ Mobile-optimized with virtual scrolling & touch gestures

## Development Commands

### Essential Commands
```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)
npm run build            # Production build
npm start                # Start production server
npm run typecheck        # Run TypeScript type checking
npm run lint             # Run ESLint

# Testing - Unit & Integration
npm test                 # Run all Vitest tests once
npm run test:watch       # Run tests in watch mode
npm run test:ui          # Run tests with Vitest UI
npm run test:coverage    # Run tests with coverage report
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:security    # Run security validation tests

# Testing - E2E & Usability (Playwright)
npm run test:e2e         # Run end-to-end tests
npm run test:usability   # Run accessibility & responsive tests
npm run test:visual      # Run visual regression tests
npm run test:playwright  # Run all Playwright tests
npm run test:comprehensive # Run full test suite (coverage + e2e)

# Database (requires Supabase CLI)
npm run db:migrate       # Push local migrations to database
npm run db:types         # Generate TypeScript types from schema
npm run db:reset         # Reset database (⚠️ destructive!)
npm run db:consolidate   # Run consolidated migration script

# Storage & Monitoring
npm run storage:cleanup  # Clean up old/orphaned storage files
npm run storage:monitor  # Check storage usage via API
npm run metrics:egress   # Monitor Supabase egress bandwidth

# Utilities
npm run qr:generate      # Generate QR codes for testing
npm run security:audit   # Run comprehensive security audit
npm run photos:verify    # Verify photo system integrity
npm run cleanup:watermarks # Clean up orphaned watermark files
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 15.4 (App Router), React 19, TypeScript 5.7, Tailwind CSS
- **Backend**: Next.js API routes, Supabase (PostgreSQL, Auth, Storage, RLS)
- **State Management**: Zustand (lightweight), React Query (@tanstack/react-query)
- **UI Components**: Radix UI primitives, shadcn/ui, Material-UI (legacy components)
- **Testing**: Vitest (unit), Playwright (E2E), Testing Library
- **Payments**: Mercado Pago SDK with webhook handling
- **Image Processing**: Sharp (server-side), multi-resolution WebP generation
- **Performance**: React Query caching, React Window/Virtual (virtualization)
- **Security**: Rate limiting (Upstash Redis), JWT validation, RLS policies
- **Logging**: Pino with structured logging

### Key Directory Structure
```
app/
├── api/                    # API routes (Next.js 15 App Router)
│   ├── admin/              # Admin-only endpoints (auth middleware required)
│   │   ├── photos/         # Photo management APIs
│   │   ├── storage/        # Storage monitoring and signed URLs
│   │   ├── tagging/        # Photo tagging and QR workflows
│   │   ├── publish/        # Token generation and publishing
│   │   └── metrics/        # Performance and storage metrics
│   ├── family/             # Family gallery endpoints (token-based)
│   │   ├── gallery/        # Photo browsing and filtering
│   │   ├── checkout/       # Cart and order creation
│   │   └── validate-token/ # Token validation
│   ├── payments/           # Mercado Pago integration
│   │   ├── webhook/        # Payment notification handling
│   │   └── preference/     # Checkout preference creation
│   └── hierarchical/       # Hierarchical folder access APIs
├── admin/                  # Admin dashboard pages (requires auth)
│   ├── events/             # Event management UI
│   ├── photos/             # Photo upload and tagging
│   ├── publish/            # Token publishing interface
│   └── orders/             # Order management
├── store-unified/[token]/  # Token-based family store (main entry)
├── share/[token]/          # Legacy share pages
└── gallery/                # Public gallery pages

lib/
├── services/               # Core business logic (50+ services)
│   ├── storage.ts          # Supabase storage operations
│   ├── multi-resolution-webp.service.ts # Image optimization
│   ├── token.service.ts    # Token generation and validation
│   ├── family.service.ts   # Family gallery data
│   ├── folder-publish.service.ts # Publishing workflows
│   ├── hierarchical-gallery.service.ts # Folder navigation
│   └── qr*.service.ts      # QR code generation, detection, analytics
├── security/               # Auth and security utilities
├── supabase/               # Supabase client configurations (server/client)
├── middleware/             # Custom middleware (rate limiting, logging)
├── multitenant/            # Tenant resolution and configuration
└── utils/                  # Shared utilities and helpers

components/
├── admin/                  # Admin-specific components
│   ├── photo-admin/        # Photo management interface
│   └── events/             # Event management UI
├── gallery/                # Gallery display components
├── store-unified/          # Unified store interface
└── ui/                     # Reusable UI primitives (shadcn/ui + Radix)

middleware.ts               # Global middleware (security, rate limiting, tenant resolution)
```

### Core Services & Data Flow

#### Multi-Tenant Architecture
- **Tenant Resolution**: `lib/multitenant/tenant-resolver.ts` resolves tenant from `x-tenant-id` header or domain mapping
- **Tenant Context**: Injected via middleware, flows through all API routes and database queries
- **Configuration**: Environment variables define domain-to-tenant mapping

#### Photo Upload & Processing Pipeline
1. **Upload**: Admin uploads via `/api/admin/photos` → Supabase Storage (`photo-private` bucket)
2. **Processing**: `multi-resolution-webp.service.ts` generates 300/800/1200px WebP variants
3. **Watermarking**: `watermark.service.ts` applies configurable watermarks using Sharp
4. **Storage**: Optimized images stored in `photos` bucket with CDN-ready signed URLs
5. **Metadata**: Photo records created in PostgreSQL with storage paths and tenant context

#### Token-Based Family Access
1. **Token Generation**: Admin publishes folders via `/api/admin/publish` → creates family tokens
2. **Token Validation**: `token.service.ts` validates tokens, checks expiry (30 days), enforces tenant isolation
3. **Gallery Access**: Families access `/store-unified/[token]` → filtered photo gallery
4. **Data Loading**: `hierarchical-gallery.service.ts` loads folder structure with RLS enforcement

#### QR Code Tagging Workflow
1. **QR Generation**: `qr.service.ts` generates unique QR codes per student
2. **Detection**: `qr-detection.service.ts` scans photos for QR codes using jsqr/zxing-wasm
3. **Batch Processing**: `qr-batch-processing.service.ts` handles bulk tagging operations
4. **Association**: Creates `photo_students` many-to-many relationships

#### Payment Processing (Mercado Pago)
1. **Preference Creation**: `/api/payments/preference` creates checkout with selected photos
2. **User Checkout**: Redirects to Mercado Pago hosted checkout
3. **Webhook**: `/api/payments/webhook` receives payment notifications, validates HMAC signature
4. **Order Update**: Updates order status, triggers fulfillment (idempotent processing)
5. **Notification**: Optional WhatsApp notifications via `whatsapp-notification.service.ts`

#### Key Services
- **`storage.ts`**: Core storage operations, signed URL generation, bucket management
- **`multi-resolution-webp.service.ts`**: Image optimization pipeline
- **`token.service.ts`**: Token lifecycle management (generation, validation, rotation, expiry)
- **`family.service.ts`**: Family gallery data aggregation and filtering
- **`folder-publish.service.ts`**: Publishing workflows and token generation
- **`hierarchical-gallery.service.ts`**: Folder navigation with breadcrumbs
- **`watermark.service.ts`**: Server-side watermarking with Sharp
- **`order-workflow.service.ts`**: Order lifecycle management
- **`egress.service.ts`**: Storage egress monitoring for Supabase free tier compliance

## Database Schema

**Core Tables**:
- `tenants`: Multi-tenant configuration (id, name, domain, settings)
- `folders`: Hierarchical folder structure (parent_id, tenant_id, path, name)
- `photos`: Photo metadata (folder_id, tenant_id, storage_path, preview_path, watermark_path, metadata JSONB)
- `photo_students`: Many-to-many photo-student associations (photo_id, student_id, detection_metadata)
- `students`: Student records (tenant_id, name, qr_code, class_info)
- `family_tokens`: Token-based access (tenant_id, folder_id, token, expires_at, metadata JSONB)
- `orders`: Purchase orders (tenant_id, token_id, total, mp_preference_id, status, payment_metadata)
- `order_items`: Individual photo selections (order_id, photo_id, quantity, price)

**Legacy Tables** (migration in progress):
- `events`: Legacy event structure (being migrated to folders)
- `subjects`: Legacy class/group structure (being migrated to folders)

**Important Patterns**:
- All tables include `tenant_id` for multi-tenant isolation
- Row Level Security (RLS) policies enforce tenant isolation and access control
- `metadata` JSONB columns store flexible data (QR detection results, payment info, etc.)
- Cascading deletes configured for parent-child relationships (folders → photos)
- Indexes on frequently queried columns (tenant_id, folder_id, token, created_at)

**Database Migrations**:
- Located in `supabase/migrations/`
- Use `npm run db:migrate` to apply migrations
- Use `npm run db:types` to regenerate TypeScript types from schema
- Migration naming: `YYYYMMDDHHMMSS_description.sql`

## Authentication & Security

### Admin Authentication
- Supabase Auth with email/password
- Admin-only middleware checks `user_metadata.role === 'admin'`
- Protected routes under `/admin/*`

### Family Access
- Token-based authentication (no passwords)
- Tokens generated per student with QR codes
- 30-day expiry with rotation warnings
- Rate limiting on all endpoints

### Security Features
- CORS configuration
- Rate limiting (Upstash Redis)
- Input validation with Zod
- SQL injection prevention via parameterized queries
- XSS protection through React
- CSRF protection in API routes

## Payment Integration

Mercado Pago integration with:
- Preference creation for checkout
- Webhook handling for payment notifications
- Idempotency for duplicate webhook prevention
- Test mode support with sandbox credentials

## Performance Optimizations

- React Query for data fetching and caching
- React Window for virtualizing large photo galleries
- Sharp for server-side image optimization
- Lazy loading with Intersection Observer
- CDN-ready watermarked previews
- Database indexes on frequently queried columns

## Testing Strategy

### Test Categories
1. **Unit Tests**: Services, utilities, components
2. **Integration Tests**: API endpoints, database operations
3. **E2E Tests**: Complete user workflows with Playwright
4. **Security Tests**: Auth, rate limiting, input validation
5. **Performance Tests**: Load testing, Web Vitals

### Running Tests
```bash
# Run specific test categories
npm run test:unit        # Unit tests (services, utilities, components)
npm run test:integration # API endpoints, database operations
npm run test:security    # Auth, rate limiting, input validation
npm run test:e2e         # Complete user workflows
npm run test:usability   # Accessibility & responsive design

# Development workflow
npm run test:watch       # Watch mode for TDD
npm run test:ui          # Visual test interface
npm run test:coverage    # Generate coverage reports

# Before deployment
npm run test:comprehensive # Full suite (unit + integration + e2e)
```

### Key Test Files
- `__tests__/e2e/`: End-to-end user workflows with Playwright
- `__tests__/integration/`: API integration and database tests
- `__tests__/security/`: Security validation and auth tests
- `__tests__/unit/`: Service, utility, and component unit tests
- `__tests__/components/`: React component tests with Testing Library

## Environment Configuration

**Critical Environment Variables** (see `.env.local` for local development):

**Supabase Configuration**:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anonymous key (client-side)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server-side only, bypasses RLS)

**Multi-Tenant Configuration**:
- `MULTITENANT_DOMAIN_MAP`: JSON mapping of domains to tenant IDs
- `NEXT_PUBLIC_MULTITENANT_DEFAULT_TENANT_ID`: Default tenant ID fallback

**Storage Configuration**:
- `STORAGE_BUCKET_ORIGINAL`: Bucket for original photos (`photo-private`)
- `STORAGE_BUCKET_PREVIEW`: Bucket for watermarked previews (`photos`)

**Mercado Pago Configuration**:
- `MP_ACCESS_TOKEN`: Mercado Pago access token (server-side)
- `NEXT_PUBLIC_MP_PUBLIC_KEY`: Mercado Pago public key (client-side)
- `MP_WEBHOOK_SECRET`: Webhook HMAC signature validation secret

**Rate Limiting** (Upstash Redis):
- `UPSTASH_REDIS_REST_URL`: Redis REST endpoint
- `UPSTASH_REDIS_REST_TOKEN`: Redis authentication token

**Application Configuration**:
- `NEXT_PUBLIC_SITE_URL`: Base URL for the application
- `NODE_ENV`: Environment (development, production)

**Notes**:
- Never commit `.env.local` or expose service role keys
- Use separate Mercado Pago credentials for test/production
- Rate limiting disabled in development mode (see `middleware.ts`)
- Multi-tenant domain mapping format: `{"domain1.com": "tenant1", "domain2.com": "tenant2"}`

## Common Development Tasks

### Adding a New API Endpoint
1. Create route file in `app/api/`
2. Add input validation with Zod schemas
3. Implement rate limiting middleware
4. Add proper error handling and logging
5. Write integration tests
6. Update API documentation

### Modifying Database Schema
1. Create migration in `supabase/migrations/`
2. Update RLS policies as needed
3. Run `npm run db:migrate` locally
4. Generate new types: `npm run db:types`
5. Update affected services and components
6. Test with `npm run test:integration`

### Implementing New UI Features
1. Create components in `components/` using existing UI primitives
2. Follow the established pattern with shadcn/ui components
3. Ensure mobile responsiveness with Tailwind
4. Add loading and error states
5. Implement accessibility features (ARIA labels, keyboard navigation)
6. Write component tests

### Debugging Photo Upload Issues
1. Check browser console for client-side errors
2. Verify Supabase storage bucket permissions and CORS configuration
3. Check API logs for server-side errors (Pino structured logs)
4. Ensure Sharp dependencies installed correctly (`npm install sharp`)
5. Verify signed URL generation and expiry (default 1 hour)
6. Check tenant context in headers (`x-tenant-id`)
7. Monitor storage usage: `npm run storage:monitor`
8. Run cleanup if needed: `npm run storage:cleanup`
9. Monitor egress limits: `npm run metrics:egress`
10. Verify photo system integrity: `npm run photos:verify`

### Working with Multi-Tenant Context
1. **Local Development**: Set `NEXT_PUBLIC_MULTITENANT_DEFAULT_TENANT_ID` in `.env.local`
2. **API Calls**: Pass `x-tenant-id` header or rely on domain-based resolution
3. **Testing**: Use test utilities in `__tests__/test-utils.ts` for tenant context
4. **Database Queries**: Always filter by `tenant_id` in WHERE clauses
5. **RLS Policies**: Verify policies enforce tenant isolation

### Troubleshooting Next.js 15 Issues
1. **Build Errors**: Run `npm run typecheck` to catch TypeScript errors early
2. **Server Components**: Avoid importing client-only code in server components
3. **"use client"**: Add directive to components using hooks or browser APIs
4. **Middleware**: Check `middleware.ts` for routing issues or rate limit blocks
5. **Cache Issues**: Clear `.next` folder: `rm -rf .next && npm run dev`
6. **Vercel Deployment**: Check build logs for bundling issues with Sharp/Canvas

## Deployment Considerations

**Pre-Deployment Checklist**:
1. Run full test suite: `npm run test:comprehensive`
2. Type check: `npm run typecheck`
3. Build locally: `npm run build` to catch build errors
4. Run security audit: `npm run security:audit`
5. Apply database migrations: `npm run db:migrate` (requires Supabase CLI)
6. Update TypeScript types: `npm run db:types`
7. Verify environment variables in hosting platform (Vercel)

**Vercel-Specific Configuration**:
- Next.js automatically optimizes builds
- Environment variables must be set in Vercel dashboard (never in code)
- Build command: `npm run build` (default)
- Output directory: `.next` (default)
- Node version: 18.x or 20.x (check `package.json` engines)
- Install command includes Sharp: `npm install` automatically handles native deps

**Critical Production Settings**:
- **Rate Limiting**: Requires Upstash Redis (automatically enabled in production)
- **HTTPS**: Enforced via middleware (see `middleware.ts`)
- **CORS**: Configured for allowed origins only (see `middleware.ts` `ALLOWED_ORIGINS`)
- **Storage**: Supabase buckets must have proper CORS and public access policies
- **Mercado Pago**: Webhook URL must be configured to point to production `/api/payments/webhook`
- **Logging**: Pino structured logs sent to stdout (captured by Vercel)

**Post-Deployment Verification**:
1. Test admin login and authentication flows
2. Verify photo upload and processing pipeline
3. Test token-based family access
4. Verify Mercado Pago payment flow (use test mode first)
5. Check webhook handling with test notifications
6. Monitor storage: `curl https://yourdomain.com/api/admin/storage/monitor`
7. Check health endpoint: `curl https://yourdomain.com/api/health`
8. Verify multi-tenant domain resolution
9. Run smoke tests in production environment

**Common Deployment Issues**:
- **Sharp Build Errors**: Ensure Sharp is in `dependencies`, not `devDependencies`
- **Module Not Found**: Check import paths use `@/` alias correctly
- **Runtime Errors**: Check logs in Vercel dashboard for server-side errors
- **401/403 Errors**: Verify Supabase service role key is set correctly
- **Payment Webhook Failures**: Check HMAC signature validation and MP credentials

## Mobile and Performance

The app is mobile-first with:


- Responsive design using Tailwind breakpoints
- Touch-optimized interactions
- Virtual scrolling for large galleries
- Progressive image loading
- Optimized bundle splitting

## Monitoring and Maintenance

**Health & Metrics Endpoints**:
- **Health Check**: `/api/health` - Basic application health status
- **Storage Monitor**: `/api/admin/storage/monitor` - Storage usage and egress tracking
- **Metrics Dashboard**: `/api/admin/metrics` - Comprehensive performance metrics
- **Database Metrics**: `/api/admin/metrics/database` - Connection pool and query stats
- **Cache Metrics**: `/api/admin/metrics/cache` - React Query cache hit rates
- **Web Vitals**: `/api/admin/metrics/web-vitals` - Client-side performance metrics

**Logging Strategy**:
- Structured logging with Pino (JSON format)
- Log levels: `info`, `warn`, `error` (configurable via `LOG_LEVEL`)
- Request tracking with `X-Request-ID` header
- Sensitive data masking (IPs, URLs, User-Agents)
- Performance timing included in all request logs

**Storage Management**:
- **Automatic Cleanup**: `npm run storage:cleanup` removes old/unused files
- **Egress Monitoring**: `npm run metrics:egress` tracks bandwidth usage
- **Free Tier Limits**: 2GB storage, 5GB egress/month (Supabase)
- **Optimization**: Multi-resolution WebP reduces storage by 60%

**Performance Monitoring**:
- React Query DevTools in development mode
- Web Vitals tracking (LCP, FID, CLS, TTFB)
- Bundle analysis available via `webpack-bundle-analyzer`
- Server-side performance metrics via middleware timing

## Important Architectural Patterns

### TypeScript Configuration
- **Strict Mode**: Partially enabled (`strict: false`, `strictNullChecks: true`)
- **Path Aliases**: `@/*` maps to root directory
- **ESNext Modules**: Modern ES modules with Next.js plugin
- **Build Errors**: TypeScript errors do NOT fail builds (see `next.config.js`)
- **Type Generation**: Auto-generated from Supabase schema via `npm run db:types`

### Server vs Client Components (Next.js 15)
- **Default**: All components are Server Components unless marked with `"use client"`
- **Client Components**: Required for hooks, browser APIs, event handlers, Zustand stores
- **Server Actions**: Not heavily used; prefer API routes for mutations
- **Data Fetching**: React Query on client, direct Supabase calls on server

### Error Handling Patterns
```typescript
// API Routes
try {
  // operation
  return NextResponse.json({ data }, { status: 200 });
} catch (error) {
  logger.error('Operation failed', { error, requestId });
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

// React Query
const { data, error, isLoading } = useQuery({
  queryKey: ['photos', folderId],
  queryFn: () => fetchPhotos(folderId),
  staleTime: 30000, // 30 seconds
  gcTime: 300000,   // 5 minutes
});
```

### Security Patterns
- **RLS First**: Rely on Supabase RLS policies for data access control
- **Tenant Isolation**: Always filter queries by `tenant_id`
- **Token Validation**: Validate tokens server-side, never trust client input
- **Rate Limiting**: Applied via middleware to all API routes (production only)
- **Input Validation**: Use Zod schemas for all user input

### Performance Patterns
- **React Query Caching**: 30s stale time, 5min garbage collection
- **Virtual Scrolling**: Use `react-window` for large photo galleries (>100 items)
- **Signed URL Batching**: Batch multiple signed URL requests when possible
- **Image Optimization**: Always serve WebP variants, not originals
- **Code Splitting**: Dynamic imports for heavy components (QR scanner, editors)

## Development Workflow Best Practices

**Code Changes**:
1. Always create a feature branch: `git checkout -b feature/description`
2. Run tests before committing: `npm run test:coverage`
3. Check types: `npm run typecheck`
4. Verify build: `npm run build`
5. Review changes carefully, especially in services and API routes

**Working with Services**:
- Services in `lib/services/` are the core business logic layer
- Always inject tenant context when working with database operations
- Use existing service patterns (error handling, logging, validation)
- Services should be pure TypeScript functions, not classes (functional approach)

**API Route Development**:
- Follow Next.js 15 App Router conventions (`route.ts` files)
- Always validate input with Zod schemas
- Use structured logging with Pino
- Return consistent JSON responses with proper status codes
- Handle errors gracefully and log with context

**Testing Requirements**:
- Write unit tests for new services
- Add integration tests for new API endpoints
- Update E2E tests if user flows change
- Maintain test coverage above 70% for critical paths

**Git Workflow**:
- Commit messages should be descriptive: `feat: add multi-resolution WebP support`
- Use conventional commits format when possible
- Keep commits focused and atomic
- Never commit sensitive data (`.env.local`, API keys, etc.)

## 🚨 DOCUMENTATION ANTI-SPRAWL POLICY

**CRITICAL RULE**: NEVER CREATE NEW DOCUMENTATION FILES WITHOUT EXPLICIT JUSTIFICATION

### File Creation Guardrails
- ❌ **NO** temporary analysis files (UX_ANALYSIS_*.md, *_SUMMARY.md, *_REPORT.md)
- ❌ **NO** archive directories (docs/archive/, etc.)  
- ❌ **NO** duplicate specifications or planning docs
- ❌ **NO** status reports or progress summaries
- ✅ **ALWAYS** prefer editing existing files over creating new ones
- ✅ **ALWAYS** use inline code comments for code-specific documentation
- ✅ **ALWAYS** use git commits for change tracking

### Maximum File Limits
- **Total documentation**: 12 files maximum
- **Root level**: README.md, CLAUDE.md, SECURITY.md, AGENTS.md only
- **docs/ directory**: 8 files maximum (see docs/DOCUMENTATION_INDEX.md)

### Before Creating ANY New File
1. Can this be added to an existing document? 
2. Is this permanent or temporary information?
3. Can this be handled through code comments or git history?

**Violation Response**: Run doc-curator-guardian agent immediately to restore order.

---


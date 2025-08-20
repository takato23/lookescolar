# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LookEscolar is a comprehensive school photography management system built with Next.js 15, Supabase, and TypeScript. It provides photo upload, tagging with QR codes, family galleries, and payment processing through Mercado Pago.

## Development Commands

### Essential Commands
```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)
npm run dev:db          # Start local Supabase instance
npm run build           # Production build
npm run typecheck       # Run TypeScript type checking
npm run lint            # Run ESLint

# Testing - Always run these before marking tasks complete
npm test                # Run Vitest unit tests
npm run test:security   # Security validation tests
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests with Playwright
npm run test:mvp        # Complete MVP workflow tests
npm run test:comprehensive # Full test suite

# QR Code Testing (specialized test suites)
npm run test:qr-complete # Complete QR workflow tests
npm run test:qr:integration # QR integration tests
npm run test:qr:component # QR component tests
npm run test:qr:security # QR security validation
npm run test:qr:e2e     # QR end-to-end tests

# Database
npm run db:migrate      # Apply database migrations
npm run db:types        # Generate TypeScript types from database
npm run db:seed         # Seed database with test data
npm run db:reset        # Reset database (danger!)

# Utilities
npm run storage:cleanup  # Clean up old storage files
npm run metrics:egress   # Monitor Supabase egress usage
npm run qr:class        # Generate QR codes for a class
npm run security:audit  # Run security audit
npm run validate:production # Check production readiness

# Docker & Deployment
npm run docker:build    # Build Docker image
npm run docker:run      # Run with docker-compose
npm run docker:stop     # Stop Docker containers
npm run health:check    # Health check endpoint
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 15.4, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Supabase (PostgreSQL, Auth, Storage, RLS)
- **Testing**: Vitest, Playwright, Testing Library
- **Payments**: Mercado Pago SDK
- **Performance**: React Query, React Window (virtualization), Sharp (image processing)
- **Security**: Jose (JWT), Rate limiting with Upstash Redis

### Key Directory Structure
```
app/
├── api/              # API routes
│   ├── admin/        # Admin-only endpoints
│   ├── family/       # Family gallery endpoints  
│   └── payments/     # Mercado Pago integration
├── admin/            # Admin dashboard pages
├── f/[token]/        # Family access pages
└── gallery/          # Public gallery pages

lib/
├── services/         # Core business logic
│   ├── storage.ts    # Supabase storage operations
│   ├── watermark.ts  # Photo watermarking
│   ├── token.service.ts # Token management
│   └── family.service.ts # Family data operations
├── security/         # Auth and security utilities
├── supabase/         # Supabase client configurations
└── utils/            # Shared utilities

components/
├── admin/            # Admin-specific components
├── gallery/          # Gallery components
└── ui/               # Reusable UI components (shadcn/ui)
```

### Core Services

#### Storage Service (`lib/services/storage.ts`)
Handles photo uploads, preview generation, watermarking, and signed URL generation. Uses dual-bucket approach:
- `photo-private`: Original photos (private)
- `photos`: Watermarked previews (CDN-ready)

#### Token Service (`lib/services/token.service.ts`)
Manages secure family access tokens with rotation, validation, and expiry tracking.

#### Family Service (`lib/services/family.service.ts`)
Orchestrates family gallery access, photo selection, and order management.

#### Watermark Service (`lib/services/watermark.ts`)
Applies watermarks to photos using Sharp with configurable opacity and positioning.

## Database Schema

Key tables:
- `events`: School photography events
- `subjects`: Classes/groups within events
- `photos`: Photo metadata and storage paths
- `photo_students`: Many-to-many photo-student associations
- `students`: Student records with QR codes
- `family_tokens`: Secure access tokens for families
- `orders`: Purchase orders
- `order_items`: Individual photo selections

All tables use Row Level Security (RLS) policies for access control.

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

### Key Test Files
- `__tests__/e2e/complete-mvp-workflow.test.ts`: Full admin workflow
- `__tests__/integration/admin-apis.test.ts`: Admin API integration
- `__tests__/security/security-comprehensive.test.ts`: Security validation
- `__tests__/usability/`: Accessibility and responsive design tests

## Environment Configuration

Required environment variables (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase connection
- `SUPABASE_SERVICE_ROLE_KEY`: Admin operations
- `MP_ACCESS_TOKEN`, `NEXT_PUBLIC_MP_PUBLIC_KEY`: Mercado Pago
- `STORAGE_BUCKET_ORIGINAL`, `STORAGE_BUCKET_PREVIEW`: Storage buckets
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: Rate limiting

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
2. Verify Supabase storage bucket permissions
3. Check API logs for server-side errors
4. Ensure watermark service has proper Sharp dependencies
5. Verify signed URL generation and expiry
6. Monitor egress limits with `npm run metrics:egress`

## Deployment Considerations

- Build optimization: Next.js automatically optimizes
- Database migrations must be run before deployment
- Environment variables must be set in production
- Rate limiting requires Redis (Upstash) in production
- Storage buckets must be configured with proper CORS
- Mercado Pago webhooks need public URL configuration

## Mobile and Performance

The app is mobile-first with:
- Responsive design using Tailwind breakpoints
- Touch-optimized interactions
- Virtual scrolling for large galleries
- Progressive image loading
- Optimized bundle splitting

## Important Development Rules

From Cursor rules (`.cursor/rules.md`):
- **Production Storage**: Never use `fetch` to `/api/storage/signed-url` in production. Always sign URLs server-side with `signedUrlForKey()`
- **Public Pagination**: Use `page`/`limit` parameters in API and `IntersectionObserver` for infinite scroll on client

## Monitoring and Maintenance

- Health check endpoint: `/api/health`
- Metrics endpoint: `/api/admin/metrics`
- Egress monitoring to prevent Supabase overage
- Error logging with structured formats
- Performance monitoring with Web Vitals
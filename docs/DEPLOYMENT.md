# LookEscolar Production Deployment Guide

> **Version**: 1.0.0
> **Last Updated**: 2025-12-26
> **Target Platform**: Vercel + Supabase

Complete guide for deploying LookEscolar to production with Vercel and Supabase.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Vercel Deployment](#vercel-deployment)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Monitoring Setup](#monitoring-setup)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

- **Vercel Account**: [https://vercel.com/signup](https://vercel.com/signup)
- **Supabase Account**: [https://supabase.com/](https://supabase.com/)
- **Upstash Account**: [https://upstash.com/](https://upstash.com/) (for rate limiting)
- **Mercado Pago Account**: [https://www.mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
- **GitHub Account**: For CI/CD integration

### Required Tools

```bash
# Node.js (v20.x recommended)
node --version  # Should be v20.x

# npm (comes with Node.js)
npm --version

# Vercel CLI (optional, for manual deployments)
npm install -g vercel

# Supabase CLI (for migrations)
npm install -g supabase

# Git (for version control)
git --version
```

### Required Permissions

- **Vercel**: Owner or Member with deployment permissions
- **Supabase**: Owner or Admin access to production project
- **GitHub**: Write access to repository
- **Upstash**: Admin access to Redis instance

---

## Environment Setup

### 1. Supabase Project Setup

#### Create Production Project

1. Log in to [Supabase](https://supabase.com)
2. Click "New Project"
3. Configure project:
   - **Name**: `lookescolar-production`
   - **Database Password**: Generate strong password (save securely)
   - **Region**: Choose closest to your users (e.g., South America)
   - **Pricing Plan**: Select appropriate plan

4. Wait for project to be provisioned (2-5 minutes)

#### Configure Storage Buckets

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('photo-private', 'photo-private', false),
  ('photos', 'photos', true);

-- Set CORS policy for photos bucket
UPDATE storage.buckets
SET cors = '[
  {
    "allowed_origins": ["https://your-domain.com"],
    "allowed_headers": ["*"],
    "allowed_methods": ["GET", "POST", "PUT", "DELETE"],
    "max_age": 3600
  }
]'::jsonb
WHERE id = 'photos';
```

#### Configure RLS Policies

All RLS policies are applied automatically via migrations in `supabase/migrations/`.

To apply migrations:

```bash
export SUPABASE_PROJECT_REF=your-project-ref
./scripts/deploy-migrations.sh
```

### 2. Upstash Redis Setup

#### Create Redis Instance

1. Log in to [Upstash](https://upstash.com)
2. Click "Create Database"
3. Configure:
   - **Name**: `lookescolar-rate-limit`
   - **Type**: Global (or Regional for better performance)
   - **Primary Region**: Choose closest to your Vercel deployment

4. Copy credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 3. Mercado Pago Configuration

#### Get Production Credentials

1. Log in to [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
2. Navigate to "Your integrations" → "Credentials"
3. Switch to **PRODUCTION** mode
4. Copy credentials:
   - **Public Key**: `APP_USR-xxxxxx` (client-side)
   - **Access Token**: `APP_USR-xxxxxx` (server-side)

#### Configure Webhook

1. In Mercado Pago Developer panel:
   - Navigate to "Webhooks"
   - Add new webhook URL: `https://your-domain.com/api/payments/webhook`
   - Select events: `payment`, `merchant_order`
   - Generate webhook secret and save it

### 4. Environment Variables

Copy `.env.production.example` to `.env.production` and fill in all values:

```bash
# Copy example file
cp .env.production.example .env.production

# Edit with your values
nano .env.production  # or use your preferred editor
```

**Required variables** (see `.env.production.example` for complete list):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Mercado Pago (PRODUCTION)
MP_ACCESS_TOKEN=APP_USR-your-production-access-token
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-your-production-public-key
MP_WEBHOOK_SECRET=your-webhook-secret

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Application
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NODE_ENV=production
```

---

## Database Configuration

### Apply Migrations

Use the provided migration script to safely apply database changes:

```bash
# Set your Supabase project reference
export SUPABASE_PROJECT_REF=your-project-ref

# Optionally set access token (if not using supabase login)
export SUPABASE_ACCESS_TOKEN=your-access-token

# Preview migrations (dry run)
./scripts/deploy-migrations.sh --dry-run

# Apply migrations (creates automatic backup)
./scripts/deploy-migrations.sh

# Verify migration success
npm run db:types
```

### Manual Migration (if script fails)

```bash
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Generate types
npm run db:types
```

### Database Backup

Automatic backups are created before each migration. To create a manual backup:

```bash
# Create backup
supabase db dump -f backups/manual_backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip backups/manual_backup_*.sql
```

---

## Vercel Deployment

### Method 1: GitHub Integration (Recommended)

#### 1. Connect Repository

1. Log in to [Vercel](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Select the repository

#### 2. Configure Project

**Framework Preset**: Next.js

**Build Settings**:
- Build Command: `npm run build` (or leave default)
- Output Directory: `.next` (default)
- Install Command: `npm install` (default)

**Root Directory**: `.` (project root)

#### 3. Environment Variables

Add all production environment variables from `.env.production`:

1. Click "Environment Variables"
2. Add each variable:
   - Select "Production" environment
   - Paste variable name and value
   - Click "Add"

**Critical variables to add**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MP_ACCESS_TOKEN`
- `NEXT_PUBLIC_MP_PUBLIC_KEY`
- `MP_WEBHOOK_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_SITE_URL`
- `SESSION_SECRET`
- `MULTITENANT_DOMAIN_MAP`
- `NEXT_PUBLIC_MULTITENANT_DEFAULT_TENANT_ID`

#### 4. Deploy

1. Click "Deploy"
2. Wait for build to complete (5-10 minutes)
3. Verify deployment success

### Method 2: Vercel CLI

```bash
# Login to Vercel
vercel login

# Link project (first time only)
vercel link

# Deploy to production
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# ... repeat for each variable
```

### Method 3: GitHub Actions (Automated)

The project includes a GitHub Actions workflow (`.github/workflows/deploy-production.yml`) that automatically deploys on push to `main` branch.

**Setup**:

1. Add GitHub secrets:
   - `VERCEL_TOKEN`: Get from Vercel → Settings → Tokens
   - `VERCEL_ORG_ID`: Get from Vercel project settings
   - `VERCEL_PROJECT_ID`: Get from Vercel project settings
   - `SUPABASE_PROJECT_REF`: Your Supabase project reference
   - `SUPABASE_ACCESS_TOKEN`: Get from Supabase → Settings → Access Tokens
   - `PRODUCTION_URL`: Your production domain (e.g., https://lookescolar.com)

2. Push to main branch:
   ```bash
   git push origin main
   ```

3. Monitor workflow in GitHub Actions tab

---

## Post-Deployment Configuration

### 1. Custom Domain

#### Add Domain to Vercel

1. In Vercel project → Settings → Domains
2. Add your domain (e.g., `lookescolar.com`)
3. Configure DNS:

**For root domain** (lookescolar.com):
```
Type: A
Name: @
Value: 76.76.21.21  # Vercel IP
```

**For www subdomain**:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

4. Wait for SSL certificate to be provisioned (automatic)

#### Update Environment Variables

Update `NEXT_PUBLIC_SITE_URL` in Vercel:

```bash
vercel env rm NEXT_PUBLIC_SITE_URL production
vercel env add NEXT_PUBLIC_SITE_URL production
# Enter: https://your-domain.com
```

### 2. Mercado Pago Webhook

Update webhook URL in Mercado Pago:

1. Go to Mercado Pago → Developers → Webhooks
2. Update URL to: `https://your-domain.com/api/payments/webhook`
3. Test webhook delivery

### 3. Supabase CORS

Update Supabase storage CORS to allow your domain:

```sql
UPDATE storage.buckets
SET cors = jsonb_set(
  cors,
  '{0,allowed_origins}',
  '["https://your-domain.com"]'::jsonb
)
WHERE id = 'photos';
```

---

## Monitoring Setup

### 1. Health Check Monitoring

Use UptimeRobot, Pingdom, or similar:

- **URL**: `https://your-domain.com/api/health`
- **Method**: GET
- **Interval**: 5 minutes
- **Alert on**: Response code != 200 OR response time > 30s

### 2. Error Tracking (Optional)

#### Sentry Integration

1. Create Sentry project
2. Add environment variables:
   ```bash
   SENTRY_DSN=https://...@sentry.io/...
   ```
3. Install Sentry SDK:
   ```bash
   npm install @sentry/nextjs
   ```
4. Configure `sentry.server.config.ts` and `sentry.client.config.ts`

### 3. Performance Monitoring

Vercel Analytics (built-in):
- Enable in Vercel project → Analytics
- Monitor Core Web Vitals
- Track API performance

### 4. Log Monitoring

Access logs via:
- **Vercel Dashboard**: Logs → Functions
- **Vercel CLI**: `vercel logs`

For structured logging, see `/lib/monitoring/production-logger.ts`

---

## Rollback Procedures

### Application Rollback

#### Via Vercel Dashboard

1. Go to Deployments tab
2. Find last stable deployment
3. Click "..." → "Promote to Production"

#### Via Vercel CLI

```bash
# List deployments
vercel deployments

# Rollback to specific deployment
vercel rollback [deployment-url]
```

### Database Rollback

```bash
# List available backups
ls -lh backups/

# Restore from backup
gunzip backups/db_pre_migration_YYYYMMDD_HHMMSS.sql.gz
supabase db remote restore backups/db_pre_migration_YYYYMMDD_HHMMSS.sql
```

### Complete Rollback Procedure

1. **Identify issue** - Determine if rollback is necessary
2. **Notify stakeholders** - Inform team of rollback decision
3. **Rollback application** - Use Vercel dashboard or CLI
4. **Verify application** - Check health endpoint and critical flows
5. **Rollback database** (if needed) - Restore from backup
6. **Verify database** - Test database connectivity and data integrity
7. **Post-mortem** - Document what went wrong and how to prevent it

---

## Troubleshooting

### Build Failures

**Issue**: Build fails with TypeScript errors
```bash
# Solution: Ignore TypeScript errors during build (already configured)
# Verify in vercel.json: typescript.ignoreBuildErrors: true
```

**Issue**: Build fails with Sharp installation errors
```bash
# Solution: Ensure Sharp is in dependencies, not devDependencies
npm install sharp --save
```

### Runtime Errors

**Issue**: 401 errors on API calls
```bash
# Check:
# 1. SUPABASE_SERVICE_ROLE_KEY is set correctly
# 2. Authentication middleware is working
# 3. Headers include Authorization token
```

**Issue**: CORS errors
```bash
# Check:
# 1. ALLOWED_ORIGINS in middleware.ts includes your domain
# 2. Supabase CORS settings allow your domain
# 3. vercel.json has correct CORS headers
```

**Issue**: Payment webhook failures
```bash
# Check:
# 1. MP_WEBHOOK_SECRET matches Mercado Pago configuration
# 2. Webhook URL is correct (https://your-domain.com/api/payments/webhook)
# 3. Check Vercel function logs for webhook requests
```

### Database Issues

**Issue**: Database connection timeouts
```bash
# Check:
# 1. Supabase project is not paused
# 2. Connection pooling settings in Supabase
# 3. Network connectivity from Vercel to Supabase
```

**Issue**: Migration fails
```bash
# Solution:
# 1. Review migration SQL for errors
# 2. Check database logs in Supabase
# 3. Restore from backup if needed
# 4. Fix migration and reapply
```

### Performance Issues

**Issue**: Slow API responses
```bash
# Check:
# 1. Database query performance (use Supabase query analyzer)
# 2. N+1 queries (should use JOINs)
# 3. Missing database indexes
# 4. React Query caching configuration
```

**Issue**: High storage egress
```bash
# Check:
# 1. Storage monitor: curl https://your-domain.com/api/admin/storage/monitor
# 2. Run cleanup: npm run storage:cleanup
# 3. Verify multi-resolution WebP is working
# 4. Check for unnecessary storage reads
```

---

## Maintenance Tasks

### Weekly

- [ ] Review error logs
- [ ] Check storage usage
- [ ] Monitor payment processing
- [ ] Review performance metrics

### Monthly

- [ ] Database backup verification
- [ ] Security audit (`npm run security:audit`)
- [ ] Dependency updates (`npm outdated`)
- [ ] Clean old backups

### Quarterly

- [ ] Full security review
- [ ] Performance optimization review
- [ ] Disaster recovery drill
- [ ] Update documentation

---

## Support & Resources

### Documentation

- **Next.js**: [https://nextjs.org/docs](https://nextjs.org/docs)
- **Vercel**: [https://vercel.com/docs](https://vercel.com/docs)
- **Supabase**: [https://supabase.com/docs](https://supabase.com/docs)
- **Mercado Pago**: [https://www.mercadopago.com.ar/developers/en/docs](https://www.mercadopago.com.ar/developers/en/docs)

### Support Channels

- **Vercel Support**: [https://vercel.com/support](https://vercel.com/support)
- **Supabase Support**: [https://supabase.com/support](https://supabase.com/support)
- **Mercado Pago Support**: [https://www.mercadopago.com.ar/developers/en/support](https://www.mercadopago.com.ar/developers/en/support)

### Internal Resources

- **Deployment Checklist**: `/DEPLOYMENT_CHECKLIST.md`
- **Environment Config**: `/.env.production.example`
- **Migration Script**: `/scripts/deploy-migrations.sh`
- **Health Check**: `/app/api/health/route.ts`
- **Production Logger**: `/lib/monitoring/production-logger.ts`

---

**Last Updated**: 2025-12-26
**Maintainer**: Development Team
**Status**: Production Ready ✅

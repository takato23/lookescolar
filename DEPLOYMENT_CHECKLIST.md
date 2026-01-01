# LookEscolar Production Deployment Checklist

> **Last Updated**: 2025-12-26
> **Version**: 1.0.0

This checklist ensures a safe and successful deployment to production. Follow all steps in order.

---

## Pre-Deployment Checks

### Code Quality & Testing

- [ ] **Run type checking** - `npm run typecheck` passes with no errors
- [ ] **Run linter** - `npm run lint` passes with no critical issues
- [ ] **Run unit tests** - `npm run test:coverage` passes with >70% coverage
- [ ] **Run integration tests** - `npm run test:integration` passes all tests
- [ ] **Run E2E tests** - `npm run test:e2e` passes critical user flows
- [ ] **Run security audit** - `npm run security:audit` shows no critical vulnerabilities
- [ ] **Build succeeds locally** - `npm run build` completes without errors

### Database & Migrations

- [ ] **Backup current production database** - Create backup before any changes
- [ ] **Review pending migrations** - Check `supabase/migrations/` for new files
- [ ] **Test migrations locally** - Apply migrations to local/staging environment first
- [ ] **Verify migration rollback plan** - Document rollback procedure
- [ ] **Generate updated types** - Run `npm run db:types` after migrations
- [ ] **Check RLS policies** - Verify Row Level Security policies are enabled and correct

### Environment Configuration

- [ ] **Review .env.production** - All required variables set correctly
- [ ] **Verify Supabase credentials** - PRODUCTION keys, not development/staging
- [ ] **Verify Mercado Pago credentials** - PRODUCTION tokens (APP_USR-), not TEST-
- [ ] **Check webhook URLs** - Point to production domain
- [ ] **Verify Upstash Redis** - Production Redis instance configured
- [ ] **Check multi-tenant domain mapping** - MULTITENANT_DOMAIN_MAP correct
- [ ] **Disable debug features** - ALLOW_DEV_BYPASS=false, FF_DEBUG_MIGRATION=false
- [ ] **Set LOG_LEVEL** - Set to 'info' or 'warn' for production

### Security

- [ ] **Review security headers** - Check `vercel.json` and `middleware.ts`
- [ ] **Verify CORS settings** - ALLOWED_ORIGINS configured correctly
- [ ] **Check rate limiting** - Upstash Redis configured and tested
- [ ] **Review authentication flows** - Admin and family access working
- [ ] **Verify token expiry** - Family tokens expire after 30 days
- [ ] **Check API authentication** - All admin endpoints require auth
- [ ] **Review sensitive data handling** - No secrets in logs or client-side code

### Infrastructure

- [ ] **Verify Vercel project settings** - Correct project, environment variables set
- [ ] **Check Supabase project** - Production project, not staging
- [ ] **Verify storage buckets** - `photo-private` and `photos` exist with correct policies
- [ ] **Check CDN configuration** - Supabase CDN enabled for storage
- [ ] **Verify DNS settings** - Domain points to Vercel deployment
- [ ] **SSL certificate** - HTTPS working correctly

---

## Deployment Steps

### 1. Database Migration

```bash
# Set project reference
export SUPABASE_PROJECT_REF=your-production-project-ref

# Review migrations (dry run)
./scripts/deploy-migrations.sh --dry-run

# Apply migrations (creates automatic backup)
./scripts/deploy-migrations.sh

# Verify migration success
npm run db:types
```

- [ ] **Migrations applied successfully**
- [ ] **Database backup created**
- [ ] **TypeScript types regenerated**
- [ ] **Database responsive after migration**

### 2. Code Deployment

#### Option A: Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### Option B: Git Push (Recommended)

```bash
# Merge to main branch
git checkout main
git merge develop
git push origin main
```

- [ ] **Deployment triggered successfully**
- [ ] **Build completed without errors**
- [ ] **Deployment URL received**

### 3. Post-Deployment Verification

#### Immediate Checks (0-5 minutes)

```bash
# Check health endpoint
curl https://your-domain.com/api/health

# Verify response: {"ok": true, "status": "healthy"}
```

- [ ] **Health endpoint returns 200 OK**
- [ ] **Database service: up**
- [ ] **Storage service: up**
- [ ] **Auth service: up**

#### Critical User Flows (5-15 minutes)

**Admin Portal**:
- [ ] **Admin login works** - `/admin` login with credentials
- [ ] **Dashboard loads** - No errors in console
- [ ] **Event creation works** - Can create new event
- [ ] **Photo upload works** - Can upload photos successfully
- [ ] **Photo processing works** - Multi-resolution WebP generation
- [ ] **Token publishing works** - Can publish folders to families
- [ ] **Store configuration works** - Store design panel functional

**Family Portal**:
- [ ] **Token access works** - `/store-unified/[token]` loads correctly
- [ ] **Gallery displays photos** - Photos load with watermarks
- [ ] **Photo selection works** - Can add photos to cart
- [ ] **Checkout works** - Can create Mercado Pago preference
- [ ] **Payment flow works** - Complete test payment (sandbox if possible)
- [ ] **Webhook processing works** - Payment status updates correctly

#### Multi-Tenant Validation (15-30 minutes)

- [ ] **Tenant isolation verified** - Different tenants see different data
- [ ] **Domain mapping works** - Domains resolve to correct tenants
- [ ] **Cross-tenant access prevented** - Cannot access other tenant data

#### Performance Metrics (30-60 minutes)

- [ ] **Page load times** - <3s on 3G, <1s on WiFi
- [ ] **API response times** - <200ms for most endpoints
- [ ] **Image loading** - Progressive loading works
- [ ] **Virtual scrolling** - Large galleries perform well
- [ ] **Mobile responsive** - Works on mobile devices

---

## Monitoring & Alerts

### Setup Monitoring (First Hour)

- [ ] **Configure uptime monitoring** - UptimeRobot, Pingdom, or similar
  - Monitor: `/api/health`
  - Alert on: 5xx errors, >30s response time
  - Check interval: 5 minutes

- [ ] **Setup error tracking** (optional) - Sentry or similar
  - Configure DSN in environment variables
  - Test error reporting

- [ ] **Configure log aggregation** - Vercel logs or external service
  - Access logs via Vercel dashboard
  - Set up log retention policy

- [ ] **Setup performance monitoring** - Vercel Analytics or similar
  - Monitor Core Web Vitals (LCP, FID, CLS)
  - Track API performance

### Alert Configuration

Configure alerts for:
- [ ] **Health endpoint failures** - Alert if down >5 minutes
- [ ] **5xx error rate** - Alert if >1% of requests
- [ ] **Storage egress** - Alert if approaching Supabase limits
- [ ] **Database connection failures** - Alert immediately
- [ ] **Payment webhook failures** - Alert if >5 failures

---

## Rollback Procedure

If critical issues are discovered:

### 1. Application Rollback (Vercel)

```bash
# List recent deployments
vercel deployments

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### 2. Database Rollback (if needed)

```bash
# Restore from backup
cd backups
gunzip db_pre_migration_YYYYMMDD_HHMMSS.sql.gz
supabase db remote restore db_pre_migration_YYYYMMDD_HHMMSS.sql
```

### 3. Notify Stakeholders

- [ ] **Send notification** - Inform team of rollback
- [ ] **Document issue** - Create incident report
- [ ] **Schedule post-mortem** - Analyze what went wrong

---

## Post-Deployment Tasks (24 Hours)

### Day 1 Monitoring

- [ ] **Monitor error logs** - Check for recurring errors
- [ ] **Review performance metrics** - Ensure acceptable performance
- [ ] **Check storage usage** - Monitor Supabase storage egress
- [ ] **Verify payment processing** - Check Mercado Pago transactions
- [ ] **Review user feedback** - Monitor support channels

### Week 1 Tasks

- [ ] **Analyze performance trends** - Identify optimization opportunities
- [ ] **Review security logs** - Check for suspicious activity
- [ ] **Update documentation** - Document any deployment issues/solutions
- [ ] **Team retrospective** - Discuss deployment process improvements

---

## Emergency Contacts

**Technical Issues**:
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Mercado Pago Support: https://www.mercadopago.com.ar/developers

**Internal Contacts**:
- Technical Lead: [Name/Email]
- DevOps: [Name/Email]
- On-Call Engineer: [Name/Email]

---

## Deployment Sign-Off

**Deployment Date**: _______________
**Deployed By**: _______________
**Approved By**: _______________

**Deployment Status**: ☐ Success ☐ Partial ☐ Rollback Required

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## Additional Resources

- **Deployment Documentation**: `/docs/DEPLOYMENT.md`
- **Environment Configuration**: `/.env.production.example`
- **Migration Script**: `/scripts/deploy-migrations.sh`
- **Health Check**: `/app/api/health/route.ts`
- **Monitoring Setup**: `/lib/monitoring/production-logger.ts`

---

**Remember**: Take your time with each step. It's better to spend an extra hour on thorough verification than to rush and cause downtime. 🚀

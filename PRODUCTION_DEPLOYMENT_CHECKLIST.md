# 🚀 Production Deployment Checklist - LookEscolar

## 🎯 Pre-Deployment Validation

### Database Schema Validation
- [ ] **Run all migrations in order**: 012 → 013 → 014
- [ ] **Run verification script**: `verify_database_schema.sql` shows all ✅
- [ ] **Performance test**: Dashboard loads in <2 seconds
- [ ] **Security test**: Invalid tokens properly rejected
- [ ] **Data integrity**: `SELECT * FROM validate_data_integrity();` shows all PASS

### Environment Configuration
- [ ] **Environment variables set**:
  - `SUPABASE_URL` (production URL)
  - `SUPABASE_ANON_KEY` (production anon key)  
  - `SUPABASE_SERVICE_ROLE_KEY` (production service key)
  - `MP_WEBHOOK_SECRET` (Mercado Pago webhook secret)
  - `SESSION_SECRET` (cryptographically secure 32+ chars)
  - `TOKEN_EXPIRY_DAYS=30`
  - `RATE_LIMIT_WINDOW_MS=60000`
  - `RATE_LIMIT_MAX_REQUESTS=100`

### Security Hardening
- [ ] **CSP headers configured** in `middleware.ts`
- [ ] **Rate limiting enabled** on all public endpoints
- [ ] **Token masking implemented** in all log statements
- [ ] **RLS policies active** on all tables
- [ ] **Service role access only** (no direct client DB access)
- [ ] **HTTPS enforced** (Supabase handles this automatically)

### Storage Configuration
- [ ] **Private bucket created** in Supabase Storage
- [ ] **CORS configured** for your domain only
- [ ] **Signed URL generation** tested and working
- [ ] **Watermark processing** tested with concurrent uploads
- [ ] **File size limits** configured (max 10MB per photo)

### Mercado Pago Integration
- [ ] **Production credentials** configured (not sandbox)
- [ ] **Webhook endpoint** accessible and responding <3s
- [ ] **HMAC signature verification** working
- [ ] **Idempotency handling** tested (same mp_payment_id)
- [ ] **Status mapping** tested (all MP statuses → internal statuses)

## 🔧 Production Optimizations Applied

### Performance Enhancements
- ✅ **Materialized views** for dashboard queries
- ✅ **Covering indexes** to avoid table lookups
- ✅ **Partial indexes** for hot data only
- ✅ **Composite indexes** for multi-column queries
- ✅ **Expression indexes** for computed columns
- ✅ **Connection pooling** (Supabase handles automatically)

### Security Enhancements
- ✅ **Audit logging** for all security events
- ✅ **Token validation** with length enforcement (≥20 chars)
- ✅ **IP tracking** in audit logs
- ✅ **Failed access logging** for security monitoring
- ✅ **Data integrity constraints** prevent invalid data

### Monitoring & Alerting
- ✅ **System health metrics** (`get_system_health()`)
- ✅ **Data integrity validation** (`validate_data_integrity()`)
- ✅ **Performance monitoring** via materialized views
- ✅ **Error tracking** in audit logs

## 📊 Production Monitoring Setup

### Daily Automated Tasks
```sql
-- Run daily maintenance
SELECT * FROM perform_maintenance();

-- Check system health
SELECT * FROM get_system_health();

-- Monitor failed access attempts
SELECT COUNT(*) as failed_attempts 
FROM security_audit_log 
WHERE event_type = 'token_access_failure' 
  AND created_at > NOW() - INTERVAL '24 hours';
```

### Weekly Health Checks
```sql
-- Data integrity validation
SELECT * FROM validate_data_integrity();

-- Database size monitoring
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage analysis
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Monthly Backups
```sql
-- Export event data for backup
SELECT export_event_data('event-uuid-here');

-- Full database metrics
SELECT 
  'Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value;
```

## 🚨 Critical Thresholds & Alerts

### Database Performance
- **Connection count >50**: Warning
- **Connection count >80**: Critical  
- **Database size >5GB**: Warning (check Supabase plan limits)
- **Query time >1s**: Critical (investigate slow queries)

### Security Monitoring
- **Failed token access >10/hour**: Warning
- **Failed token access >50/hour**: Critical
- **Expired tokens >500**: Warning (run cleanup)

### Business Metrics
- **Order processing failures >5%**: Critical
- **Photo upload failures >2%**: Critical
- **Webhook timeout >5%**: Critical

## 🛠️ Troubleshooting Guide

### Common Issues After Deployment

#### "Permission denied" errors
```sql
-- Verify RLS policies
SELECT tablename, policyname, roles 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check service role access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
```

#### Slow dashboard loading
```sql
-- Refresh materialized view
SELECT refresh_event_dashboard();

-- Check if indexes are being used
EXPLAIN ANALYZE SELECT * FROM mv_event_dashboard LIMIT 10;
```

#### Token validation failures
```sql
-- Check token format and length
SELECT token, length(token), expires_at 
FROM subject_tokens 
WHERE expires_at > NOW() 
LIMIT 5;

-- Verify validation function works
SELECT validate_family_token('test_token_12345678901234567890');
```

#### Payment webhook issues
```sql
-- Check recent payment attempts
SELECT * FROM payments 
ORDER BY created_at DESC 
LIMIT 10;

-- Check audit logs for webhook failures
SELECT * FROM security_audit_log 
WHERE event_data->>'reason' LIKE '%webhook%'
ORDER BY created_at DESC;
```

## 📈 Scaling Recommendations

### When to Scale Up (Supabase Plan)
- **Database size >80% of plan limit**
- **Consistent >50 concurrent connections**
- **Average query time >500ms**
- **Storage requests >80% of plan limit**

### Performance Optimization Strategies
1. **Enable read replicas** for dashboard queries
2. **Implement Redis caching** for frequently accessed data
3. **Add CDN** for photo previews (CloudFront/CloudFlare)
4. **Optimize image processing** with background jobs
5. **Implement connection pooling** at application level

## ✅ Go-Live Checklist

### Final Pre-Launch
- [ ] **Load test completed** (simulate 50 concurrent users)
- [ ] **Backup strategy verified** (can restore from export)
- [ ] **Monitoring alerts configured** (email/Slack notifications)
- [ ] **Emergency contacts available** (Supabase support, team leads)
- [ ] **Rollback plan documented** (migration rollback steps)

### Launch Day
- [ ] **Monitor logs actively** for first 2 hours
- [ ] **Test critical user journeys**:
  - [ ] Photo upload and watermark processing
  - [ ] QR code generation and PDF download
  - [ ] Family access via token
  - [ ] Photo selection and cart
  - [ ] Mercado Pago payment flow
  - [ ] Order fulfillment workflow
- [ ] **Check performance metrics** every 15 minutes
- [ ] **Verify webhook handling** with real payments

### Post-Launch (24 hours)
- [ ] **Run daily maintenance**: `SELECT * FROM perform_maintenance()`
- [ ] **Review audit logs** for security issues
- [ ] **Check error rates** in Supabase dashboard
- [ ] **Validate backup integrity** with test restore
- [ ] **Document any issues** and resolutions

## 🎉 Success Metrics

Your production deployment is successful when:
- ✅ **Dashboard loads in <2 seconds**
- ✅ **Photo uploads complete in <10 seconds**
- ✅ **Zero security audit failures**
- ✅ **Payment success rate >98%**
- ✅ **Database performance stable**
- ✅ **All monitoring alerts green**

---

**🚀 Ready for Production! Your LookEscolar system is now enterprise-ready with comprehensive security, performance optimization, and monitoring capabilities.**
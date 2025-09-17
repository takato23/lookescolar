# ✅ VALIDATION CHECKLIST - POST-FIX VERIFICATION

> **Uso:** Ejecutar después de cada sprint para validar fixes
> **Objetivo:** Zero regresiones, 100% funcionalidad verificada

## 🔴 SPRINT 1: CRITICAL FIXES VALIDATION

### Database Migration
```bash
# Verify consolidated migration
npx supabase db diff
npx supabase migration list

# Check for orphans
npx supabase db execute "SELECT COUNT(*) FROM photos WHERE subject_id IS NULL"
npx supabase db execute "SELECT COUNT(*) FROM order_items oi LEFT JOIN photos p ON oi.photo_id = p.id WHERE p.id IS NULL"
```

- [ ] All 78 migrations consolidated into one
- [ ] No migration conflicts on fresh install
- [ ] Rollback script tested and working
- [ ] Zero orphaned records
- [ ] All foreign keys properly cascading

### Webhook Processing
```bash
# Test webhook idempotency
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"data":{"id":"TEST_123"}}'

# Check retry on same webhook (should return duplicate: true)
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"data":{"id":"TEST_123"}}'

# Monitor webhook errors
curl http://localhost:3000/api/admin/webhook-monitor
```

- [ ] Idempotency working (no duplicate processing)
- [ ] Retry mechanism active (3 attempts)
- [ ] Error logging to Redis
- [ ] Monitor endpoint showing metrics
- [ ] No lost payments in last 24h

### Token Management
```bash
# Test token expiry warning
npm run test:token-expiry

# Verify renewal generation
curl http://localhost:3000/api/family/validate?token=EXPIRING_TOKEN
```

- [ ] Warning banner appears 7 days before expiry
- [ ] Renewal token generated correctly
- [ ] Copy functionality working
- [ ] Old token still works during warning period
- [ ] Email notifications sent (if configured)

### Backup System
```bash
# Run manual backup
./scripts/emergency-backup.sh

# Verify backup integrity
tar -tzf backups/backup_*.tar.gz

# Test restore (ON TEST DB ONLY!)
./backups/*/restore.sh
```

- [ ] Backup script executable
- [ ] Backup includes DB + storage metadata
- [ ] Restore script works
- [ ] GitHub Action configured
- [ ] External storage upload working

---

## 🟠 SPRINT 2: PERFORMANCE VALIDATION

### Image Processing
```bash
# Benchmark upload times
npm run benchmark:upload -- --files 10

# Check parallel processing
npm run test:parallel-upload
```

- [ ] Upload time <3s per image (from 8-15s)
- [ ] WebP variants generated
- [ ] Watermark cached in memory
- [ ] Batch processing working
- [ ] No memory leaks on large uploads

### CDN & Caching
```bash
# Check cache headers
curl -I http://localhost:3000/_next/image?url=...

# Monitor egress
npm run metrics:egress
```

- [ ] Cache-Control headers present (1 year)
- [ ] Images served via Next.js Image API
- [ ] Original photos never exposed
- [ ] Egress reduced by >50%
- [ ] CDN hit rate >80%

### Database Performance
```bash
# Check indexes
npx supabase db execute "SELECT * FROM pg_indexes WHERE tablename IN ('photos', 'orders', 'family_tokens')"

# Run query performance tests
npm run test:db-performance
```

- [ ] All critical indexes created
- [ ] Query p95 <200ms
- [ ] No N+1 queries detected
- [ ] Connection pooling active
- [ ] Prepared statements used

### Mobile Performance
```bash
# Run Lighthouse
npm run lighthouse:mobile

# Check bundle size
npm run analyze
```

- [ ] Lighthouse mobile score >70
- [ ] Bundle size <1.5MB
- [ ] Virtual scrolling smooth
- [ ] Touch interactions responsive
- [ ] No jank on scroll

### Data Integrity
```bash
# Check constraints
npm run db:validate-constraints

# Verify audit log
npx supabase db execute "SELECT COUNT(*) FROM audit_log WHERE timestamp > NOW() - INTERVAL '1 day'"

# Storage sync
npm run storage:validate
```

- [ ] All business constraints active
- [ ] Audit log capturing operations
- [ ] Transaction retries working
- [ ] No orphaned storage files
- [ ] Cascading deletes correct

---

## 🟡 SPRINT 3: UX & SECURITY VALIDATION

### Bulk Tagging
```bash
# Test bulk operations
npm run test:bulk-tagging
```

- [ ] Multi-select working (Ctrl/Cmd)
- [ ] Range select working (Shift)
- [ ] Keyboard shortcuts active
- [ ] Duplicate detection functional
- [ ] Performance with 500+ photos

### Mobile UX
```bash
# Test on real devices
npm run test:mobile -- --device "iPhone 12"
npm run test:mobile -- --device "Samsung Galaxy S21"
```

- [ ] All touch targets ≥44px
- [ ] Swipe gestures working
- [ ] Pinch to zoom functional
- [ ] Double tap zoom working
- [ ] No text selection on interactive elements

### Accessibility
```bash
# Run accessibility audit
npm run audit:a11y

# Test with screen reader
npm run test:screen-reader
```

- [ ] Keyboard navigation complete
- [ ] ARIA labels present
- [ ] Color contrast WCAG AA (4.5:1)
- [ ] Focus indicators visible
- [ ] Skip navigation links working

### RLS Policies
```bash
# Test each role
npm run test:rls -- --role admin
npm run test:rls -- --role photographer
npm run test:rls -- --role family
```

- [ ] Admin can access everything
- [ ] Photographers see assigned events only
- [ ] Families see only their photos
- [ ] Public sees only public photos
- [ ] Token-based access working

### Rate Limiting
```bash
# Test rate limits
npm run test:rate-limiting
```

- [ ] Auth endpoints: 5/min
- [ ] API endpoints: 30/min
- [ ] Upload endpoints: 10/5min
- [ ] Payment endpoints: 3/min
- [ ] Headers returned correctly

### Security Tests
```bash
# Run security suite
npm run test:security

# Check for vulnerabilities
npm audit
```

- [ ] No SQL injection vulnerabilities
- [ ] XSS prevention active
- [ ] CSRF tokens validated
- [ ] Path traversal blocked
- [ ] No sensitive data in logs

### Test Coverage
```bash
# Generate coverage report
npm run test:coverage
```

- [ ] Overall coverage >80%
- [ ] Critical paths 100% covered
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Security tests comprehensive

---

## 📊 FINAL METRICS VALIDATION

### Performance Targets
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Upload Time | <3s | ___ | ⏳ |
| Gallery Load | <2s | ___ | ⏳ |
| Bundle Size | <1.5MB | ___ | ⏳ |
| Mobile Score | >70 | ___ | ⏳ |
| Test Coverage | >80% | ___ | ⏳ |
| Egress Cost | <$50/mo | ___ | ⏳ |

### Business Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Payment Success | 99.5% | ___ | ⏳ |
| Token Expiry Handled | 100% | ___ | ⏳ |
| Photo Processing Success | 99% | ___ | ⏳ |
| System Uptime | 99.9% | ___ | ⏳ |

### Security Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Vulnerabilities | 0 | ___ | ⏳ |
| Failed Auth Attempts Blocked | 100% | ___ | ⏳ |
| Rate Limit Violations | <1% | ___ | ⏳ |
| Data Breaches | 0 | ___ | ⏳ |

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deploy
- [ ] All tests passing locally
- [ ] Migrations tested on staging
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Team notified

### Deploy Process
- [ ] Deploy to staging first
- [ ] Run validation checklist on staging
- [ ] Monitor for 30 minutes
- [ ] Deploy to production
- [ ] Run smoke tests

### Post-Deploy
- [ ] Monitor error rates (first hour)
- [ ] Check payment processing
- [ ] Verify token functionality
- [ ] Review performance metrics
- [ ] Document any issues

---

## 📝 SIGN-OFF

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |
| DevOps | | | |

**Notes:**
_Document any deviations, known issues, or follow-up items here_

---

**Status:** ⏳ Pending Validation
**Last Updated:** 2025-01-17
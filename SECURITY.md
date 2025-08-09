# Security Implementation Guide - LookEscolar

## 🚨 CRITICAL SECURITY CHECKLIST

### Pre-Production Security Verification

#### Authentication & Authorization
- [x] **Token Security**: ≥20 character tokens using crypto.randomBytes()
- [x] **Admin Authentication**: Real Supabase Auth (no development bypasses)
- [x] **Family Token Validation**: Server-side validation with expiration check
- [x] **Token Rotation**: Automated rotation capability for compromised tokens
- [x] **Session Management**: Secure cookie handling with httpOnly, secure flags

#### Rate Limiting (Production Ready)
- [x] **Admin Photo Upload**: 10 req/min per IP
- [x] **Storage Signed URLs**: 60 req/min per token
- [x] **Family Gallery**: 30 req/min per token  
- [x] **Payment Webhook**: 100 req/min total
- [x] **Authentication**: 3 attempts/min per IP with 5-minute block
- [x] **General API**: 100 req/min per IP

#### Content Security Policy (CSP)
- [x] **Strict CSP Headers**: No unsafe-eval in production
- [x] **Anti-Hotlinking**: Referer checking for sensitive resources
- [x] **HTTPS Enforcement**: HSTS headers in production
- [x] **Frame Protection**: X-Frame-Options: DENY
- [x] **Content Type**: X-Content-Type-Options: nosniff

#### File Upload Security
- [x] **Type Validation**: Only allow image/* MIME types
- [x] **Size Limits**: Max 10MB per file, 20 files per request
- [x] **Filename Sanitization**: Remove dangerous characters
- [x] **Image Validation**: Server-side image format verification
- [x] **Storage Path Validation**: Prevent path traversal attacks

#### Database Security
- [x] **Row Level Security**: RLS enabled on all tables
- [x] **Service Role Usage**: Client never accesses DB directly
- [x] **Input Sanitization**: All user inputs validated with Zod
- [x] **SQL Injection Prevention**: Parameterized queries only

#### Logging & Monitoring
- [x] **Token Masking**: Never log full tokens (format: tok_***)
- [x] **Sensitive Data**: No passwords, secrets, or URLs in logs
- [x] **Structured Logging**: JSON format with requestId tracking
- [x] **Security Events**: Log all authentication attempts, rate limits

#### Payment Security
- [x] **Webhook Signature**: HMAC-SHA256 verification required
- [x] **Idempotency**: Prevent duplicate payment processing
- [x] **Response Time**: <3s webhook response to prevent MP retries
- [x] **Error Handling**: Secure error responses without internal details

## 🔧 Security Configuration

### Environment Variables (Production)

```bash
# Required Security Variables
NEXT_PUBLIC_APP_URL=https://yourdomain.com
MP_WEBHOOK_SECRET=your_32_char_webhook_secret
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SESSION_SECRET=your_32_char_session_secret

# Rate Limiting
ENABLE_RATE_LIMIT=true
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Security Flags
SKIP_AUTH=false  # NEVER set to true in production
MASK_SENSITIVE_LOGS=true
NODE_ENV=production

# Domain Security
ALLOWED_DOMAINS=yourdomain.com,cdn.yourdomain.com
```

### Security Headers Verification

Check that your production deployment includes these headers:

```bash
# Check security headers
curl -I https://yourdomain.com/admin

# Should include:
Content-Security-Policy: default-src 'self'; script-src 'self'...
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## 🧪 Security Testing

### Authentication Testing

```bash
# Test admin routes without authentication
curl -X GET https://yourdomain.com/admin
# Expected: 302 redirect to /login

# Test family token validation
curl -X GET https://yourdomain.com/api/family/gallery/invalid_short_token
# Expected: 400 Invalid token format

# Test token expiration
curl -X GET https://yourdomain.com/api/family/gallery/expired_token_here
# Expected: 401 Invalid or expired token
```

### Rate Limiting Testing

```bash
# Test upload rate limiting (should block after 10 requests/min)
for i in {1..15}; do
  curl -X POST https://yourdomain.com/api/admin/photos/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "eventId=test" -F "files=@test.jpg"
done
# Expected: 429 Too Many Requests after 10th request

# Test auth rate limiting (should block after 3 attempts/min)
for i in {1..5}; do
  curl -X POST https://yourdomain.com/api/admin/auth \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@email.com","password":"wrong"}'
done
# Expected: 429 Too Many Requests after 3rd attempt
```

### File Upload Security Testing

```bash
# Test malicious file upload
curl -X POST https://yourdomain.com/api/admin/photos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "eventId=$EVENT_ID" \
  -F "files=@malicious.php"
# Expected: 400 File type not allowed

# Test oversized file
curl -X POST https://yourdomain.com/api/admin/photos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "eventId=$EVENT_ID" \
  -F "files=@large_file.jpg"  # >10MB
# Expected: 400 File too large

# Test path traversal in eventId
curl -X POST https://yourdomain.com/api/admin/photos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "eventId=../../../etc/passwd" \
  -F "files=@test.jpg"
# Expected: 400 Invalid event ID format
```

### Anti-Hotlinking Testing

```bash
# Test hotlinking protection
curl -H "Referer: https://malicious-site.com" \
  https://yourdomain.com/api/storage/signed-url
# Expected: 403 Forbidden

# Test bot detection
curl -H "User-Agent: curl/7.68.0" \
  https://yourdomain.com/api/storage/signed-url
# Expected: 403 Forbidden (if no referer)
```

### Payment Webhook Security Testing

```bash
# Test webhook without signature
curl -X POST https://yourdomain.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"id":123,"type":"payment","action":"created","data":{"id":"123"}}'
# Expected: 400 Missing headers

# Test webhook with invalid signature
curl -X POST https://yourdomain.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: invalid" \
  -H "x-request-id: test" \
  -d '{"id":123,"type":"payment","action":"created","data":{"id":"123"}}'
# Expected: 401 Invalid signature
```

## 🚨 Security Monitoring

### Log Analysis

Monitor these security events in production:

```bash
# Authentication failures
grep "auth_failed" /var/log/app.log | tail -20

# Rate limit violations  
grep "rate_limit_exceeded" /var/log/app.log | tail -20

# Suspicious activity
grep -E "(blocked_ip|suspicious_user_agent|hotlinking)" /var/log/app.log | tail -20

# Token security events
grep -E "(token_rotation|token_invalidated|invalid_token)" /var/log/app.log | tail -20
```

### Performance Monitoring

```bash
# Check rate limiting effectiveness
grep "rate_limit" /var/log/app.log | \
  awk '{print $1}' | uniq -c | sort -nr

# Monitor upload security
grep "photo_upload" /var/log/app.log | \
  grep -E "(blocked|rejected|failed)" | wc -l

# Check webhook security
grep "webhook" /var/log/app.log | \
  grep -E "(invalid_signature|missing_headers)" | wc -l
```

## 🛡️ Incident Response

### Security Breach Response

1. **Immediate Actions**:
   ```bash
   # Rotate compromised tokens
   curl -X POST https://yourdomain.com/api/admin/security/tokens/rotate \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"reason":"security_breach"}'

   # Block suspicious IPs at load balancer level
   # Review logs for breach indicators
   grep -A5 -B5 "suspicious_pattern" /var/log/app.log
   ```

2. **Investigation**:
   - Check authentication logs for unauthorized access
   - Review file upload logs for malicious files
   - Verify webhook signature logs for tampering attempts
   - Analyze rate limiting logs for abuse patterns

3. **Recovery**:
   - Invalidate affected tokens
   - Reset user sessions if needed
   - Update security rules if new vectors discovered
   - Communicate with affected users if necessary

### Token Rotation Procedures

```bash
# Emergency token rotation for all users
curl -X POST https://yourdomain.com/api/admin/security/tokens/rotate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days_before_expiry":365,"reason":"emergency_rotation"}'

# Scheduled weekly rotation for expiring tokens
curl -X POST https://yourdomain.com/api/admin/security/tokens/rotate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days_before_expiry":7,"reason":"scheduled_maintenance"}'
```

## 📊 Security Metrics Dashboard

### Key Performance Indicators

1. **Authentication Security**:
   - Failed login attempts per hour
   - Token rotation frequency  
   - Session timeout events

2. **Rate Limiting Effectiveness**:
   - Requests blocked per endpoint
   - Peak request volumes handled
   - Attack pattern detection

3. **File Upload Security**:
   - Malicious files blocked
   - File validation errors
   - Upload size violations

4. **Payment Security**:
   - Webhook signature failures
   - Payment fraud attempts
   - Response time compliance (<3s)

### Automated Alerts

Set up monitoring alerts for:
- Authentication failure rate >10/min
- Rate limit violations >100/min
- File upload rejections >50%
- Webhook signature failures >5%
- Response times >2s for webhooks

## 🔄 Regular Security Maintenance

### Daily Tasks
- [ ] Review security event logs
- [ ] Monitor rate limiting effectiveness
- [ ] Check authentication failure patterns

### Weekly Tasks
- [ ] Rotate expiring tokens (automated)
- [ ] Review file upload security logs
- [ ] Update blocked IP lists if needed

### Monthly Tasks
- [ ] Security dependency audit
- [ ] Performance benchmark security tests
- [ ] Review and update CSP headers
- [ ] Token usage analytics review

### Quarterly Tasks
- [ ] Full security penetration testing
- [ ] Review all security configurations
- [ ] Update security documentation
- [ ] Team security training updates

---

**⚠️ CRITICAL NOTE**: Never disable security features in production. If you need to temporarily adjust limits for legitimate use cases, do so through environment variables and monitor closely.

**🚨 EMERGENCY CONTACT**: In case of security breach, immediately contact the development team and begin incident response procedures.
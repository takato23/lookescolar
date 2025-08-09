# Integration Testing Guide - Payment Flow

## Overview
This guide provides comprehensive testing procedures for the MercadoPago integration in the LookEscolar system.

## Prerequisites
- Environment variables configured:
  - `MP_ACCESS_TOKEN` (sandbox)
  - `NEXT_PUBLIC_MP_PUBLIC_KEY` (sandbox)
  - `MP_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_BASE_URL`
- Upstash Redis configured for rate limiting
- Supabase database with proper RLS policies

## Test Scenarios

### 1. Family Checkout Flow

#### 1.1 Valid Checkout Process
```bash
# Setup test data
npm run db:seed

# Access family gallery (replace with actual token)
curl -X GET http://localhost:3000/f/[valid-token]

# Add photos to cart and proceed to checkout
# Navigate through UI: Photos → Cart → Checkout → Contact Info

# Expected: 
# - Redirects to MercadoPago sandbox
# - Order created with status 'pending'
# - Preference ID stored in order
```

#### 1.2 Invalid Token Handling
```bash
# Test with short token
curl -X POST http://localhost:3000/api/family/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "token": "short",
    "contactInfo": {
      "name": "Test User",
      "email": "test@example.com"
    },
    "items": [{"photoId": "123", "priceType": "base", "quantity": 1}]
  }'

# Expected: 400 Bad Request
```

#### 1.3 Expired Token Handling
```bash
# Test with expired token (set expires_at in past)
UPDATE subject_tokens 
SET expires_at = NOW() - INTERVAL '1 day' 
WHERE token = '[test-token]';

# Expected: 401 Unauthorized
```

#### 1.4 Multiple Pending Orders Prevention
```bash
# Create pending order first
# Attempt second checkout
# Expected: 409 Conflict
```

#### 1.5 Photo Ownership Validation
```bash
# Attempt to checkout photos belonging to different subject
# Expected: 403 Forbidden
```

#### 1.6 Rate Limiting
```bash
# Send >5 requests per minute from same IP
# Expected: 429 Rate Limit Exceeded
```

### 2. Webhook Processing

#### 2.1 Valid Payment Webhook
```bash
# Simulate MercadoPago webhook
MP_PAYMENT_ID="test-payment-123"
ORDER_ID="test-order-456"
SECRET="your-webhook-secret"

# Create valid signature
BODY='{"id":12345,"live_mode":false,"type":"payment","data":{"id":"'$MP_PAYMENT_ID'"}}'
SIGNATURE="v1=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | xxd -p -c 256)"

curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: $SIGNATURE" \
  -H "x-request-id: test-request-123" \
  -d "$BODY"

# Expected: 200 OK, order status updated
```

#### 2.2 Invalid Signature Rejection
```bash
# Same as above but with wrong signature
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: v1=invalid-signature" \
  -H "x-request-id: test-request-123" \
  -d "$BODY"

# Expected: 401 Unauthorized
```

#### 2.3 Non-Payment Webhook Ignore
```bash
BODY='{"id":12345,"type":"merchant_order","data":{"id":"123"}}'
# Create valid signature for this body
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: [valid-signature]" \
  -H "x-request-id: test-request-123" \
  -d "$BODY"

# Expected: 200 OK, but no processing
```

#### 2.4 Idempotency Test
```bash
# Send same webhook twice
# Expected: Second request returns success without changes
```

#### 2.5 Webhook Timeout Test
```bash
# Time webhook response
# Expected: Response within 3 seconds
```

### 3. Order Status Checking

#### 3.1 Valid Order Status
```bash
curl -X GET "http://localhost:3000/api/family/order/status?orderId=[valid-order-id]"

# Expected: Order details with current status
```

#### 3.2 Invalid Order ID
```bash
curl -X GET "http://localhost:3000/api/family/order/status?orderId=invalid-uuid"

# Expected: 400 Bad Request
```

#### 3.3 Non-existent Order
```bash
curl -X GET "http://localhost:3000/api/family/order/status?orderId=12345678-1234-1234-1234-123456789012"

# Expected: 404 Not Found
```

### 4. Success/Error Pages

#### 4.1 Success Page Flow
```bash
# Navigate to success page with query params
http://localhost:3000/f/success?payment_id=123&external_reference=order-456

# Expected:
# - Displays success message
# - Shows order details
# - Links back to gallery
```

#### 4.2 Error Page Flow
```bash
# Navigate to error page
http://localhost:3000/f/error?payment_id=123&external_reference=order-456

# Expected:
# - Displays error message
# - Retry button works
# - Support contact available
```

#### 4.3 Pending Page Flow
```bash
# Navigate to pending page
http://localhost:3000/f/pending?payment_id=123&external_reference=order-456

# Expected:
# - Shows pending status
# - Auto-refreshes every 10 seconds
# - Manual refresh button works
```

## Performance Tests

### 1. Load Testing
```bash
# Install k6 or similar tool
npm install -g k6

# Create load test script
k6 run payment-load-test.js

# Expected:
# - <200ms response times for APIs
# - Rate limiting works correctly
# - No memory leaks
```

### 2. Concurrent Requests
```bash
# Test concurrent checkouts
# Expected: All requests handled correctly, no race conditions
```

## Security Tests

### 1. HMAC Signature Verification
```bash
# Test with various signature formats
# - Missing signature
# - Malformed signature  
# - Correct signature with wrong secret
# - Timing attack resistance
```

### 2. Rate Limiting Validation
```bash
# Test rate limits per endpoint:
# - /api/family/checkout: 5 req/min per IP
# - /api/family/order/status: 30 req/min per IP  
# - /api/payments/webhook: 100 req/min total
```

### 3. Token Security
```bash
# Verify tokens are:
# - At least 20 characters
# - Not logged in plaintext
# - Properly validated
```

## Database Validation

### 1. Order Consistency
```sql
-- Verify order totals match items
SELECT o.id, o.total_amount_cents, 
       SUM(oi.total_price_cents) as calculated_total
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.total_amount_cents
HAVING o.total_amount_cents != SUM(oi.total_price_cents);

-- Should return no rows
```

### 2. RLS Policy Validation
```sql
-- Test as different users
SET ROLE authenticated;
-- Verify only authorized access to orders
```

### 3. Payment Status Consistency
```sql
-- Verify status mappings are consistent
SELECT DISTINCT mp_status, status FROM orders
WHERE mp_status IS NOT NULL;
```

## Monitoring & Observability

### 1. Log Analysis
```bash
# Check logs for:
grep "Payment notification processed" logs/app.log
grep "Rate limit exceeded" logs/app.log
grep "Invalid webhook signature" logs/app.log

# Verify no sensitive data in logs
grep -E "(tok_|pay_)" logs/app.log | grep -v "\*\*\*"
```

### 2. Metrics Collection
- Track payment success rates
- Monitor webhook processing times
- Rate limit violation rates
- Order conversion rates

## Troubleshooting Common Issues

### 1. Webhook Not Received
- Check MP webhook URL configuration
- Verify webhook secret matches
- Check firewall/proxy settings

### 2. Payment Status Not Updating
- Check webhook signature verification
- Verify order exists with correct external_reference
- Check database transaction logs

### 3. Rate Limit Issues
- Check Redis connectivity
- Verify rate limit configuration
- Monitor IP-based limiting

### 4. Token Validation Failures
- Check token length (≥20 chars)
- Verify token expiration dates
- Check subject_token table integrity

## Environment Specific Tests

### Development
- Use MP sandbox environment
- Mock webhook callbacks for testing
- Verify localhost webhook URLs work

### Staging  
- Use MP sandbox with production-like data
- Test with real webhook deliveries
- Performance testing with production data volumes

### Production
- Use MP production environment
- Monitor real payment flows
- Set up alerts for failures

## Success Criteria

✅ All checkout flows work correctly
✅ Webhook processing is robust and fast (<3s)
✅ Security measures prevent unauthorized access
✅ Rate limiting protects against abuse
✅ Error handling is graceful and informative
✅ Payment status updates are reliable
✅ Integration tests pass consistently
✅ Performance metrics meet requirements
✅ No sensitive data in logs
✅ Database consistency maintained

## Rollback Plan

If issues are discovered in production:
1. Revert to previous version
2. Disable new payment flows
3. Investigate and fix issues
4. Test thoroughly before re-deployment
5. Monitor closely after re-deployment
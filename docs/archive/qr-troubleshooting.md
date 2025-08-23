# QR System Troubleshooting Guide

## Quick Diagnostic Checklist

Before diving into specific issues, run this quick diagnostic:

1. **System Health Check**: Visit `/api/qr/health` to check overall system status
2. **Browser Compatibility**: Ensure modern browser with camera API support
3. **Network Connectivity**: Verify stable internet connection
4. **Permissions**: Check camera and location permissions if applicable

## Common Issues and Solutions

### 1. QR Generation Issues

#### Issue: "QR generation timeout"
**Symptoms:**
- QR codes fail to generate after 30+ seconds
- Batch operations partially fail
- Error messages about service timeouts

**Causes:**
- High server load
- Database connection issues
- Image processing bottleneck

**Solutions:**
```bash
# Check system health
curl https://your-app.com/api/qr/health

# Monitor cache performance
# Look for low hit rates indicating cache issues

# Reduce batch size temporarily
POST /api/qr/batch
{
  "subjects": [...], // Reduce to 10-20 items
  "options": { "cacheDuration": 1 } // Shorter cache for testing
}
```

#### Issue: "Invalid QR format generated"
**Symptoms:**
- QR codes appear corrupted
- Scanning fails consistently
- Visual artifacts in QR images

**Solutions:**
1. Verify token format:
```typescript
// Check token format
const token = 'LKSTUDENT_' + secureRandomString;
// Should be: LKSTUDENT_[16+ character secure string]
```

2. Check image generation settings:
```typescript
const options = {
  errorCorrectionLevel: 'M', // Try 'H' for higher correction
  margin: 2, // Increase margin
  size: 200, // Ensure adequate size
  color: {
    dark: '#000000', // Pure black
    light: '#FFFFFF' // Pure white
  }
};
```

### 2. Camera and Scanning Issues

#### Issue: "Camera permission denied"
**Symptoms:**
- Camera access blocked
- Black video feed
- Permission dialog doesn't appear

**Solutions:**

1. **Chrome/Edge:**
   - Navigate to Settings > Privacy and Security > Site Settings > Camera
   - Add your domain to "Allowed" list
   - Clear browser cache and cookies

2. **Firefox:**
   - Click shield icon in address bar
   - Enable camera permissions
   - Reload page

3. **Safari/iOS:**
   - Settings > Safari > Camera
   - Check domain permissions
   - Ensure iOS 11+ for getUserMedia support

4. **Programmatic check:**
```typescript
// Check permissions
const checkCameraPermission = async () => {
  try {
    const permission = await navigator.permissions.query({ name: 'camera' });
    console.log('Camera permission:', permission.state);
    
    if (permission.state === 'denied') {
      // Guide user to enable permissions
      showPermissionGuide();
    }
  } catch (error) {
    console.error('Permission check failed:', error);
  }
};
```

#### Issue: "QR detection not working"
**Symptoms:**
- Camera shows video but doesn't detect QR
- Poor scanning performance
- Inconsistent detection

**Solutions:**

1. **Improve lighting conditions:**
   - Ensure adequate lighting
   - Avoid reflective surfaces
   - Position QR code perpendicular to camera

2. **Adjust detection settings:**
```typescript
const detectionOptions = {
  enhanceContrast: true,
  confidenceThreshold: 0.7, // Lower for more sensitive detection
  scanInterval: 300, // Increase frequency
  multipleFormats: true
};
```

3. **Manual QR input fallback:**
```typescript
const handleManualInput = () => {
  const qrValue = prompt('Enter QR code manually:');
  if (qrValue) {
    handleQRDetection(qrValue);
  }
};
```

### 3. Validation and Authentication Issues

#### Issue: "QR code not recognized"
**Symptoms:**
- Valid-looking QR scanned but validation fails
- "QR code not found" errors
- Intermittent recognition issues

**Causes:**
- QR code expired
- Wrong event context
- Database sync issues
- Token format mismatch

**Solutions:**

1. **Check QR validity:**
```bash
# API call to validate specific QR
curl -X POST https://your-app.com/api/qr/validate \
  -H "Content-Type: application/json" \
  -d '{
    "qrCode": "LKSTUDENT_abc123",
    "eventId": "event-uuid"
  }'
```

2. **Verify event context:**
```typescript
// Ensure correct event is set
const validateWithEvent = async (qrCode, eventId) => {
  try {
    const response = await fetch('/api/qr/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCode, eventId })
    });
    
    const result = await response.json();
    if (!result.valid) {
      console.log('Validation failed:', result.message);
      // Try without event context
      return validateWithoutEvent(qrCode);
    }
    return result;
  } catch (error) {
    console.error('Validation error:', error);
  }
};
```

3. **Check token expiration:**
```sql
-- Query to check token status
SELECT 
  id, 
  token, 
  created_at,
  is_published,
  CASE 
    WHEN created_at < NOW() - INTERVAL '30 days' THEN 'expired'
    WHEN NOT is_published THEN 'unpublished'
    ELSE 'valid'
  END as status
FROM codes 
WHERE token = $1;
```

#### Issue: "Family portal access denied"
**Symptoms:**
- QR scan successful but portal redirect fails
- Authentication errors
- Token validation errors

**Solutions:**

1. **Verify token service:**
```typescript
import { TokenService } from '@/lib/services/token.service';

const validatePortalAccess = async (token) => {
  try {
    const validation = await TokenService.prototype.validateToken(token);
    if (!validation.isValid) {
      console.log('Token invalid:', validation.reason);
      // Regenerate token if needed
      const newToken = await TokenService.prototype.generateTokenForSubject(subjectId);
      return newToken;
    }
    return validation;
  } catch (error) {
    console.error('Token validation failed:', error);
  }
};
```

2. **Check database consistency:**
```sql
-- Verify subject-token relationship
SELECT 
  s.id as subject_id,
  s.name as subject_name,
  c.token,
  c.is_published,
  c.created_at
FROM subjects s
LEFT JOIN codes c ON s.qr_code = c.id
WHERE s.id = $1;
```

### 4. Performance Issues

#### Issue: "Slow QR generation"
**Symptoms:**
- Generation takes >5 seconds
- Batch operations timeout
- High server load

**Solutions:**

1. **Check cache performance:**
```typescript
import { qrEnhancedService } from '@/lib/services/qr-enhanced.service';

const cacheStats = qrEnhancedService.getCacheStats();
console.log('Cache hit rate:', cacheStats.hitRate);
console.log('Total entries:', cacheStats.totalEntries);

// Clean cache if needed
qrEnhancedService.cleanCache();
```

2. **Optimize batch size:**
```typescript
// Process in smaller batches
const processBatch = async (subjects, batchSize = 10) => {
  const results = [];
  for (let i = 0; i < subjects.length; i += batchSize) {
    const batch = subjects.slice(i, i + batchSize);
    const batchResults = await generateQRBatch(batch);
    results.push(...batchResults);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return results;
};
```

3. **Database optimization:**
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_codes_token ON codes(token);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_codes_event_published ON codes(event_id, is_published);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subjects_qr_code ON subjects(qr_code);
```

#### Issue: "Scanner performance poor"
**Symptoms:**
- Slow QR detection
- High CPU usage
- Browser freezing during scan

**Solutions:**

1. **Optimize detection frequency:**
```typescript
const scannerConfig = {
  scanInterval: 500, // Increase interval to reduce CPU load
  imageWidth: 640, // Reduce processing size
  imageHeight: 480,
  enableWorker: true // Use Web Worker if available
};
```

2. **Implement Web Worker:**
```javascript
// qr-detection-worker.js
self.importScripts('/path/to/jsqr.js');

self.onmessage = function(e) {
  const { imageData, width, height } = e.data;
  
  try {
    const code = jsQR(imageData, width, height);
    self.postMessage({
      success: true,
      data: code ? code.data : null
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message
    });
  }
};
```

### 5. Security and Audit Issues

#### Issue: "Suspicious activity detected"
**Symptoms:**
- Security alerts in logs
- Unusual scan patterns
- High failure rates from specific IPs

**Solutions:**

1. **Review security insights:**
```typescript
import { qrSecurityService } from '@/lib/security/qr-security.service';

const analysis = await qrSecurityService.detectSuspiciousActivity('event-id');
console.log('Suspicious IPs:', analysis.suspiciousIPs);
console.log('Recommendations:', analysis.recommendations);
```

2. **Implement additional rate limiting:**
```typescript
// Enhanced rate limiting for suspicious IPs
const suspiciousIPs = ['192.168.1.100', '10.0.0.50'];

const checkRateLimit = (ip) => {
  if (suspiciousIPs.includes(ip)) {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Much stricter limit
      message: 'Too many requests from this IP'
    });
  }
  return normalRateLimit;
};
```

3. **Review audit logs:**
```sql
-- Check recent security events
SELECT 
  event_type,
  qr_code_id,
  ip_address,
  security_level,
  error_details,
  timestamp
FROM qr_audit_log 
WHERE security_level IN ('high', 'critical')
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

## Diagnostic Tools

### 1. System Health Dashboard

Create a simple health check page:

```typescript
// pages/admin/qr-health.tsx
export default function QRHealthDashboard() {
  const [health, setHealth] = useState(null);
  
  useEffect(() => {
    fetch('/api/qr/health')
      .then(res => res.json())
      .then(setHealth);
  }, []);
  
  if (!health) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>QR System Status: {health.status}</h1>
      <div>
        <h2>Checks:</h2>
        {Object.entries(health.checks).map(([check, status]) => (
          <div key={check}>
            {check}: {status ? '✅' : '❌'}
          </div>
        ))}
      </div>
      <div>
        <h2>Performance:</h2>
        <p>Response Time: {health.performance.responseTime}ms</p>
        <p>Cache Hit Rate: {(health.performance.cacheHitRate * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
}
```

### 2. QR Testing Tool

```typescript
// components/admin/QRTester.tsx
export function QRTester() {
  const [qrCode, setQrCode] = useState('');
  const [result, setResult] = useState(null);
  
  const testQR = async () => {
    try {
      const response = await fetch('/api/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    }
  };
  
  return (
    <div>
      <h3>QR Code Tester</h3>
      <input 
        value={qrCode}
        onChange={(e) => setQrCode(e.target.value)}
        placeholder="Enter QR code value"
      />
      <button onClick={testQR}>Test QR</button>
      
      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
```

### 3. Debug Mode

Enable detailed logging:

```typescript
// lib/utils/qr-debug.ts
export const QRDebug = {
  enabled: process.env.QR_DEBUG === 'true',
  
  log: (message: string, data?: any) => {
    if (QRDebug.enabled) {
      console.log(`[QR Debug] ${message}`, data);
    }
  },
  
  error: (message: string, error: any) => {
    if (QRDebug.enabled) {
      console.error(`[QR Debug] ${message}`, error);
    }
  },
  
  performance: (operation: string, duration: number) => {
    if (QRDebug.enabled) {
      console.log(`[QR Performance] ${operation}: ${duration}ms`);
    }
  }
};
```

## Performance Monitoring

### Key Metrics to Monitor

1. **QR Generation Metrics:**
   - Average generation time
   - Success rate
   - Cache hit rate
   - Batch processing efficiency

2. **Scanning Performance:**
   - Detection success rate
   - Average scan time
   - Camera initialization time
   - Error frequency

3. **System Health:**
   - API response times
   - Database query performance
   - Memory usage
   - Error rates

### Monitoring Setup

```typescript
// lib/monitoring/qr-metrics.ts
export class QRMetrics {
  static track(metric: string, value: number, tags: Record<string, string> = {}) {
    // Send to your monitoring service (DataDog, New Relic, etc.)
    console.log(`Metric: ${metric} = ${value}`, tags);
  }
  
  static trackQRGeneration(duration: number, success: boolean, format: string) {
    this.track('qr.generation.duration', duration, { success: success.toString(), format });
  }
  
  static trackQRScan(duration: number, success: boolean, deviceType: string) {
    this.track('qr.scan.duration', duration, { success: success.toString(), deviceType });
  }
}
```

## Getting Help

### 1. Self-Service Options
- Review this troubleshooting guide
- Check system health endpoint
- Run diagnostic tools
- Review audit logs

### 2. Documentation References
- [QR Integration Guide](./qr-integration-guide.md)
- [API Reference](./api-reference.md)
- [Security Guidelines](./security-guidelines.md)

### 3. Support Escalation
When reporting issues, include:
- Browser and device information
- Error messages and stack traces
- System health check results
- Steps to reproduce the issue
- Screenshots if applicable

### 4. Emergency Procedures
For critical QR system failures:
1. Check system health immediately
2. Review recent audit logs for security events
3. Implement manual fallbacks if needed
4. Contact technical support with diagnostic information

## Preventive Maintenance

### Regular Checks
- Weekly system health review
- Monthly cache performance analysis
- Quarterly security audit review
- Semi-annual database optimization

### Automated Monitoring
Set up alerts for:
- QR generation failure rate > 5%
- Scan success rate < 90%
- Response time > 2 seconds
- Critical security events
- Cache hit rate < 70%
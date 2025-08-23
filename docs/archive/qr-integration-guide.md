# QR Integration System - Complete Documentation

## Overview

The QR Integration System in LookEscolar provides comprehensive QR code generation, validation, analytics, and security features for student identification and family portal access. This system has been enhanced with advanced capabilities including caching, digital signatures, audit logging, and comprehensive analytics.

## Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Enhanced QR Scanner] --> B[QR Scanner Modal]
        B --> C[Admin QR Interface]
        C --> D[Gallery QR Scanner]
    end
    
    subgraph "API Layer"
        E[/api/qr] --> F[Basic QR Generation]
        G[/api/qr/batch] --> H[Batch Operations]
        I[/api/qr/analytics] --> J[Usage Metrics]
        K[/api/qr/health] --> L[System Monitoring]
        M[/api/qr/validate] --> N[QR Validation]
    end
    
    subgraph "Service Layer"
        O[QR Enhanced Service] --> P[Analytics Service]
        P --> Q[Security Service]
        Q --> R[Detection Service]
        R --> S[Core QR Service]
    end
    
    subgraph "Data Layer"
        T[QR Codes Table] --> U[Analytics Events]
        U --> V[Audit Log]
        V --> W[Cache Storage]
    end
    
    A --> E
    C --> G
    D --> I
    E --> O
    G --> O
    I --> P
    K --> Q
    M --> S
    O --> T
```

## Core Features

### 1. Enhanced QR Generation
- **Multiple formats**: PNG, SVG, PDF support
- **Batch processing**: Generate up to 100 QR codes simultaneously
- **Caching**: Intelligent caching with configurable expiration
- **Digital signatures**: Cryptographic signatures for tamper detection
- **Custom options**: Size, error correction, colors, margins

### 2. Advanced Analytics
- **Usage tracking**: Scan counts, success rates, device types
- **Performance metrics**: Scan duration, confidence scores
- **Geographic data**: IP-based location tracking
- **Time-based analysis**: Hourly and daily usage patterns
- **Error analysis**: Failed scan categorization

### 3. Security Features
- **Digital signatures**: SHA-256 HMAC signatures
- **Audit logging**: Comprehensive event tracking
- **Anomaly detection**: Suspicious activity identification
- **Rate limiting**: Per-endpoint and per-IP protection
- **Device fingerprinting**: Enhanced security validation

### 4. Performance Optimization
- **Intelligent caching**: Multi-level caching strategy
- **Web Workers**: Background QR processing
- **Image optimization**: Enhanced detection algorithms
- **Batch processing**: Efficient bulk operations

## API Reference

### Base Endpoints

#### GET /api/qr
Generate a basic QR code image.

**Parameters:**
- `token` (required): Family portal access token
- `size` (optional): QR code size in pixels (default: 512)

**Response:**
```http
Content-Type: image/png
Cache-Control: public, max-age=3600
```

#### POST /api/qr/validate
Validate a QR code and return student data.

**Request Body:**
```json
{
  "qrCode": "LKSTUDENT_abc123def456",
  "eventId": "uuid-event-id"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "data": {
    "id": "qr-code-id",
    "eventId": "event-id",
    "studentId": "student-id",
    "studentName": "John Doe",
    "type": "student_identification"
  }
}
```

### Enhanced Endpoints

#### POST /api/qr/batch
Generate multiple QR codes with enhanced features.

**Request Body:**
```json
{
  "subjects": [
    {
      "id": "student-uuid-1",
      "name": "John Doe",
      "eventId": "event-uuid"
    }
  ],
  "options": {
    "format": "png",
    "size": 200,
    "enableAnalytics": true,
    "cacheDuration": 24,
    "signature": true,
    "errorCorrectionLevel": "M"
  }
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "batch-uuid",
  "results": {
    "successful": [
      {
        "subjectId": "student-uuid-1",
        "dataUrl": "data:image/png;base64,...",
        "format": "png",
        "analytics": { "qrCodeId": "...", "totalScans": 0 },
        "cacheKey": "cache-key"
      }
    ],
    "failed": []
  },
  "metadata": {
    "totalRequested": 1,
    "totalSuccessful": 1,
    "totalFailed": 0,
    "processingTime": 250
  }
}
```

#### GET /api/qr/analytics
Retrieve QR code usage analytics.

**Query Parameters:**
- `qrCodeId` (optional): Specific QR code metrics
- `eventId` (optional): Event-wide metrics
- `start` (optional): Start date (ISO string)
- `end` (optional): End date (ISO string)
- `includeDetails` (optional): Include detailed metrics
- `limit` (optional): Number of results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "eventId": "event-uuid",
    "summary": {
      "totalQRCodes": 50,
      "totalScans": 1250,
      "avgSuccessRate": 0.92
    },
    "topPerformers": [
      {
        "qrCodeId": "qr-1",
        "totalScans": 45,
        "uniqueScans": 38,
        "successRate": 0.95
      }
    ],
    "securityInsights": {
      "suspiciousIPs": [],
      "possibleBruteForce": false,
      "recommendations": []
    }
  }
}
```

#### POST /api/qr/analytics
Record a QR scan event.

**Request Body:**
```json
{
  "qrCodeId": "qr-code-id",
  "eventId": "event-uuid",
  "deviceType": "mobile",
  "scanDuration": 150,
  "success": true,
  "location": "optional-location"
}
```

#### GET /api/qr/health
System health check and configuration.

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0",
  "checks": {
    "qrGeneration": true,
    "qrValidation": true,
    "analytics": true,
    "security": true,
    "cache": true
  },
  "performance": {
    "responseTime": 45,
    "cacheHitRate": 0.85,
    "avgQRGenerationTime": 120
  }
}
```

## Service Integration

### QR Enhanced Service

```typescript
import { qrEnhancedService } from '@/lib/services/qr-enhanced.service';

// Generate enhanced QR with caching and analytics
const result = await qrEnhancedService.generateEnhancedQR(
  'student-id',
  'Student Name',
  {
    format: 'png',
    size: 300,
    enableAnalytics: true,
    cacheDuration: 48, // hours
    signature: true,
  }
);

// Get analytics for QR code
const analytics = qrEnhancedService.getAnalytics('student-id');

// Track scan event
qrEnhancedService.trackScan('qr-id', {
  type: 'mobile',
  ip: '192.168.1.1',
  location: 'School Event'
});
```

### QR Analytics Service

```typescript
import { qrAnalyticsService } from '@/lib/services/qr-analytics.service';

// Record scan event
await qrAnalyticsService.recordScan({
  qrCodeId: 'qr-id',
  eventId: 'event-id',
  scannedAt: new Date(),
  deviceType: 'mobile',
  ipAddress: '192.168.1.1',
  success: true,
});

// Get metrics
const metrics = await qrAnalyticsService.getQRMetrics('qr-id');

// Get top performing QR codes
const topQRs = await qrAnalyticsService.getTopQRCodes('event-id', 10);
```

### QR Security Service

```typescript
import { qrSecurityService } from '@/lib/security/qr-security.service';

// Generate signature
const signature = qrSecurityService.generateSignature('qr-data');

// Verify signature
const verification = qrSecurityService.verifySignature('qr-data', signature);

// Record audit event
await qrSecurityService.recordAuditEvent({
  eventType: 'generate',
  qrCodeId: 'qr-id',
  ipAddress: '192.168.1.1',
  timestamp: new Date(),
  securityLevel: 'medium',
  success: true,
});

// Detect suspicious activity
const analysis = await qrSecurityService.detectSuspiciousActivity('event-id');
```

## Frontend Components

### Enhanced QR Scanner

```tsx
import { EnhancedQRScanner } from '@/components/qr/EnhancedQRScanner';

function PhotoTagger() {
  const handleQRScan = (result: QRScanResult) => {
    console.log('QR scanned:', result.studentData);
  };

  return (
    <EnhancedQRScanner
      onScan={handleQRScan}
      scanMode="continuous"
      enableAnalytics={true}
      showAdvancedControls={true}
      eventId="current-event-id"
    />
  );
}
```

### Usage Examples

```tsx
// Basic QR scanning
<EnhancedQRScanner
  onScan={(result) => console.log(result)}
  scanMode="single"
/>

// Batch scanning mode
<EnhancedQRScanner
  onScan={(result) => console.log(result)}
  scanMode="batch"
  enableAnalytics={true}
/>

// Advanced features enabled
<EnhancedQRScanner
  onScan={(result) => console.log(result)}
  scanMode="continuous"
  enableSound={true}
  enableAnalytics={true}
  showAdvancedControls={true}
/>
```

## Database Schema

### QR Codes Table
```sql
CREATE TABLE codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  course_id UUID REFERENCES courses(id),
  code_value TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,
  title TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### QR Scan Events Table
```sql
CREATE TABLE qr_scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id TEXT NOT NULL,
  event_id UUID REFERENCES events(id),
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL,
  device_type TEXT NOT NULL,
  user_agent TEXT,
  ip_address INET NOT NULL,
  location TEXT,
  scan_duration INTEGER, -- milliseconds
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### QR Audit Log Table
```sql
CREATE TABLE qr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'generate', 'validate', 'scan', 'tamper_detected', 'expired'
  qr_code_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET NOT NULL,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB,
  security_level TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  success BOOLEAN NOT NULL,
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security Considerations

### Digital Signatures
- QR codes include cryptographic signatures for tamper detection
- HMAC-SHA256 algorithm with key rotation
- Signatures expire after 24 hours by default

### Rate Limiting
- API endpoints protected with intelligent rate limiting
- Per-IP and per-endpoint limits
- Suspicious activity detection and blocking

### Audit Logging
- All QR operations logged with security context
- Critical events trigger immediate alerts
- Comprehensive audit trail for compliance

### Data Protection
- QR tokens are cryptographically secure
- Personal data minimization in logs
- IP addresses anonymized after 30 days

## Performance Optimization

### Caching Strategy
- Multi-level caching (memory, Redis, CDN)
- Intelligent cache invalidation
- Cache hit rate monitoring

### Database Optimization
- Proper indexing on frequently queried columns
- Query optimization for analytics endpoints
- Connection pooling and prepared statements

### Frontend Optimization
- Web Workers for QR processing
- Image optimization and compression
- Progressive loading for large datasets

## Monitoring and Alerting

### Health Checks
- Comprehensive system health monitoring
- Automated endpoint testing
- Performance metrics collection

### Metrics
- QR generation success rates
- Scan performance metrics
- Cache hit rates and response times
- Error rates and patterns

### Alerts
- Critical security events
- System performance degradation
- High error rates or anomalies

## Troubleshooting

### Common Issues

#### QR Generation Failures
```
Error: QR generation timeout
Solution: Check service worker availability and network connection
```

#### Camera Access Denied
```
Error: Camera permission denied
Solution: Guide users to enable camera permissions in browser settings
```

#### Validation Failures
```
Error: QR code not recognized
Solution: Verify QR code format and event association
```

### Debug Mode
Enable debug logging by setting environment variable:
```bash
QR_DEBUG=true
```

### Performance Issues
- Check cache hit rates
- Monitor database query performance
- Verify network latency to external services

## Migration Guide

### From Basic QR System
1. Install new dependencies
2. Run database migrations
3. Update component imports
4. Configure new environment variables
5. Test enhanced features

### Environment Variables
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional - Enhanced Features
QR_SIGNING_KEY=your-signing-key
QR_CACHE_DURATION=24
QR_ANALYTICS_ENABLED=true
QR_DEBUG=false
```

## Testing

### Unit Tests
```bash
npm run test:unit -- __tests__/unit/qr-services.test.ts
```

### Integration Tests
```bash
npm run test:integration -- __tests__/integration/qr-workflow.test.ts
```

### End-to-End Tests
```bash
npm run test:e2e -- --grep "QR"
```

## Support

For technical support or questions about the QR Integration System:

1. Check the troubleshooting section
2. Review system health at `/api/qr/health`
3. Check audit logs for security events
4. Monitor analytics for usage patterns

## Changelog

### Version 2.0 (Current)
- Enhanced QR generation with multiple formats
- Comprehensive analytics and monitoring
- Digital signatures and security hardening
- Batch operations support
- Intelligent caching system

### Version 1.0 (Legacy)
- Basic QR generation and validation
- Simple camera scanning
- Token-based family access
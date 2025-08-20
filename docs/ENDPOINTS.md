# LookEscolar API Endpoints Documentation

## Overview
This document outlines the critical API endpoints for the LookEscolar school photography management system.

## 🔐 Authentication
All admin endpoints require authentication via Supabase JWT tokens.

## 📊 Admin Endpoints

### POST /api/admin/quick-setup
**Purpose:** Initialize system with sample data for testing
**Auth:** Required
**Body:**
```json
{}
```
**Response:**
```json
{
  "success": true,
  "event": {
    "id": "uuid",
    "name": "Graduación 2024",
    "date": "2024-12-01",
    "location": null
  },
  "subjects": [
    {
      "name": "Juan Pérez",
      "subject_id": "uuid",
      "token": "tk_abc123..."
    }
  ]
}
```

### GET /api/admin/dashboard/stats
**Purpose:** Get dashboard statistics
**Auth:** Required
**Response:**
```json
{
  "totalEvents": 12,
  "totalPhotos": 847,
  "totalOrders": 25,
  "totalRevenue": 12500,
  "recentActivity": [...]
}
```

### POST /api/admin/photos/upload
**Purpose:** Upload photos for an event
**Auth:** Required
**Body:** FormData with files
**Response:**
```json
{
  "success": true,
  "uploaded": [
    {
      "filename": "photo1.jpg",
      "storage_path": "photos/uuid/photo1.jpg",
      "id": "uuid"
    }
  ]
}
```

### POST /api/admin/events
**Purpose:** Create new photography event
**Auth:** Required
**Body:**
```json
{
  "name": "Graduación 2024",
  "description": "Evento de graduación",
  "date": "2024-12-01",
  "location": "Colegio San Juan",
  "price_per_photo": 1000
}
```

## 👨‍👩‍👧‍👦 Family/Guest Endpoints

### GET /api/family/gallery/[token]
**Purpose:** Access family photo gallery
**Auth:** Token-based
**Response:**
```json
{
  "event": {
    "name": "Graduación 2024",
    "date": "2024-12-01"
  },
  "photos": [
    {
      "id": "uuid",
      "filename": "photo1.jpg",
      "approved": true,
      "watermark_path": "photos/uuid/watermarked/photo1.jpg"
    }
  ],
  "family": {
    "name": "Juan Pérez",
    "grade_section": "5A"
  }
}
```

### POST /api/family/checkout
**Purpose:** Process photo purchases
**Auth:** None (public endpoint)
**Body:**
```json
{
  "eventId": "uuid",
  "photoIds": ["uuid1", "uuid2"],
  "contactInfo": {
    "name": "María García",
    "email": "maria@email.com",
    "phone": "123456789"
  },
  "package": "Selección personalizada"
}
```
**Response:**
```json
{
  "orderId": "uuid",
  "preferenceId": "mp_preference_id",
  "redirectUrl": "https://mercadopago.com/checkout...",
  "totalAmount": 20.00,
  "photoCount": 2
}
```

### GET /api/family/order/status
**Purpose:** Check order/payment status
**Query:** ?orderId=uuid
**Response:**
```json
{
  "success": true,
  "order": {
    "id": "uuid",
    "status": "approved",
    "total_amount_cents": 2000,
    "mp_payment_id": "123456789",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

## 💳 Payment Integration

### POST /api/payments/webhook
**Purpose:** MercadoPago payment webhook
**Auth:** Webhook secret validation
**Body:** MercadoPago webhook payload
**Response:** HTTP 200 (acknowledgment)

### GET /api/payments/create-preference
**Purpose:** Create MercadoPago payment preference
**Body:**
```json
{
  "orderId": "uuid",
  "amount": 2000,
  "description": "2 fotos - Graduación 2024"
}
```

## 🔍 Search & Filtering

### GET /api/admin/photos?event_id=uuid&search=term&approved=true
**Purpose:** Search and filter photos
**Query Parameters:**
- `event_id`: Filter by event
- `search`: Search in filenames
- `approved`: Filter by approval status
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset

## 📈 Analytics & Monitoring

### GET /api/admin/metrics/dashboard
**Purpose:** Get system metrics
**Auth:** Required
**Response:**
```json
{
  "uptime": "99.9%",
  "responseTime": 145,
  "errorRate": "0.1%",
  "activeUsers": 25,
  "storageUsed": "45.2GB"
}
```

### GET /api/admin/metrics/database
**Purpose:** Database performance metrics
**Auth:** Required
**Response:**
```json
{
  "queryTime": 12,
  "connectionCount": 15,
  "cacheHitRatio": 0.89,
  "slowQueries": 2
}
```

## 🔒 Security Endpoints

### POST /api/admin/security/tokens/rotate
**Purpose:** Rotate family access tokens
**Auth:** Required
**Body:**
```json
{
  "eventId": "uuid",
  "reason": "Security update"
}
```

### GET /api/admin/security/tokens/validate
**Purpose:** Validate token status
**Query:** ?token=tk_abc123
**Response:**
```json
{
  "valid": true,
  "subject": {
    "id": "uuid",
    "name": "Juan Pérez",
    "event": "Graduación 2024"
  },
  "expires_at": "2024-04-01T00:00:00Z"
}
```

## 📋 Data Export

### GET /api/admin/orders/export
**Purpose:** Export orders data
**Auth:** Required
**Query:** ?format=csv&start_date=2024-01-01&end_date=2024-12-31
**Response:** CSV file download

### GET /api/admin/photos/download
**Purpose:** Download original photos
**Auth:** Required
**Query:** ?event_id=uuid&quality=original
**Response:** ZIP file download

---

## Error Responses

All endpoints follow this error format:
```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": "Additional error information"
}
```

## Rate Limiting

- Admin endpoints: 100 requests/minute per IP
- Family endpoints: 30 requests/minute per IP
- Payment endpoints: 10 requests/minute per IP

## Webhook Security

Payment webhooks are secured with:
- IP whitelist validation
- Signature verification
- Request deduplication
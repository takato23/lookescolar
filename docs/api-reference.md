# API Reference

This document provides a reference for the LookEscolar API endpoints.

## Authentication

### Admin Authentication
All admin endpoints require authentication with a valid Supabase session.

```bash
# Example admin request
curl -X GET https://yourdomain.com/api/admin/events \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

### Family Token Authentication
Family endpoints use token-based authentication.

```bash
# Example family request
curl -X GET https://yourdomain.com/api/family/gallery/TOKEN_HERE \
  -H "x-lookescolar-token: TOKEN_HERE"
```

## Admin API Endpoints

### Events Management

#### List Events
```http
GET /api/admin/events
```

Response:
```json
{
  "events": [
    {
      "id": "uuid",
      "name": "string",
      "school": "string",
      "date": "YYYY-MM-DD",
      "active": "boolean",
      "created_at": "ISO8601 datetime",
      "updated_at": "ISO8601 datetime"
    }
  ]
}
```

#### Create Event
```http
POST /api/admin/events
```

Request Body:
```json
{
  "name": "string",
  "school": "string",
  "date": "YYYY-MM-DD"
}
```

#### Update Event
```http
PUT /api/admin/events/{event_id}
```

Request Body:
```json
{
  "name": "string",
  "school": "string",
  "date": "YYYY-MM-DD",
  "active": "boolean"
}
```

#### Delete Event
```http
DELETE /api/admin/events/{event_id}
```

### Photos Management

#### Upload Photos
```http
POST /api/admin/photos/upload
```

Form Data:
- `eventId`: UUID of the event
- `photos`: Array of image files (max 10MB each)

#### List Photos
```http
GET /api/admin/photos?event_id=UUID&subject_id=UUID
```

#### Approve Photo
```http
PUT /api/admin/photos/{photo_id}/approve
```

#### Delete Photo
```http
DELETE /api/admin/photos/{photo_id}
```

### Subjects Management

#### List Subjects
```http
GET /api/admin/subjects?event_id=UUID
```

#### Create Subject
```http
POST /api/admin/subjects
```

Request Body:
```json
{
  "event_id": "uuid",
  "type": "student|couple|family",
  "first_name": "string",
  "last_name": "string (optional)",
  "couple_first_name": "string (optional)",
  "couple_last_name": "string (optional)",
  "family_name": "string (optional)"
}
```

#### Update Subject
```http
PUT /api/admin/subjects/{subject_id}
```

#### Delete Subject
```http
DELETE /api/admin/subjects/{subject_id}
```

#### Generate Subject Token
```http
POST /api/admin/subjects/{subject_id}/token
```

### Orders Management

#### List Orders
```http
GET /api/admin/orders?status=pending|approved|delivered|failed
```

#### Get Order Details
```http
GET /api/admin/orders/{order_id}
```

#### Update Order Status
```http
PUT /api/admin/orders/{order_id}/status
```

Request Body:
```json
{
  "status": "pending|approved|delivered|failed"
}
```

## Family API Endpoints

### Gallery Access

#### Validate Token
```http
GET /api/family/gallery/{token}
```

#### Get Photos by Token
```http
GET /api/family/gallery/{token}/photos
```

### Shopping Cart

#### Add to Cart
```http
POST /api/family/gallery/{token}/cart
```

Request Body:
```json
{
  "photo_id": "uuid",
  "price_list_item_id": "uuid"
}
```

#### View Cart
```http
GET /api/family/gallery/{token}/cart
```

#### Remove from Cart
```http
DELETE /api/family/gallery/{token}/cart/{cart_item_id}
```

### Checkout

#### Create Order
```http
POST /api/family/gallery/{token}/checkout
```

Request Body:
```json
{
  "contact_name": "string",
  "contact_email": "string",
  "contact_phone": "string"
}
```

Response:
```json
{
  "order_id": "uuid",
  "preference_id": "string"
}
```

## Payment API Endpoints

### Payment Processing

#### Webhook
```http
POST /api/payments/webhook
```

Headers:
- `x-signature`: HMAC-SHA256 signature
- `x-request-id`: Request identifier

Body:
```json
{
  "id": "string",
  "type": "string",
  "action": "string",
  "data": {}
}
```

#### Get Payment Status
```http
GET /api/payments/status/{mp_payment_id}
```

## Public API Endpoints

### Health Check
```http
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "ISO8601 datetime"
}
```

### QR Code Validation
```http
POST /api/qr/validate
```

Request Body:
```json
{
  "qr_data": "string"
}
```

## Rate Limiting

All endpoints have rate limiting applied:

- Admin Photo Upload: 10 req/min per IP
- Storage Signed URLs: 60 req/min per token
- Family Gallery: 30 req/min per token  
- Payment Webhook: 100 req/min total
- Authentication: 3 attempts/min per IP with 5-minute block
- General API: 100 req/min per IP

## Error Responses

### Common HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

### Error Response Format
```json
{
  "error": "Descriptive error message",
  "code": "ERROR_CODE"
}
```

## Security Considerations

### Input Validation
All endpoints validate input using Zod schemas.

### Authentication
- Admin endpoints require valid Supabase authentication
- Family endpoints require valid tokens
- All requests over HTTPS

### Data Protection
- Sensitive data masked in logs
- SQL injection prevention through parameterized queries
- Cross-site scripting prevention through React

### Rate Limiting
Rate limiting applied to prevent abuse and ensure fair usage.

## Versioning

The API is currently at version 1. Breaking changes will result in new endpoint paths or major version updates.
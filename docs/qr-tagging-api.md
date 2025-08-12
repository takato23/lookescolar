# QR Tagging Workflow API Endpoints

This document describes the backend API endpoints implemented to support the QR tagging workflow for photo assignment to students.

## Overview

The QR tagging workflow allows admins to scan QR codes and efficiently assign batches of photos to students. The implementation includes three main endpoints:

1. **QR Decode** - Parse and validate QR codes to extract student information
2. **Student Lookup** - Retrieve detailed student information by ID
3. **Enhanced Batch Tagging** - Assign photos to students with support for both QR workflow and standard batch operations

## Endpoints

### 1. QR Lookup Endpoint

**Endpoint**: `POST /api/admin/qr/decode`

**Purpose**: Decodes and validates QR codes, returning student information if valid.

**Expected QR Format**: `STUDENT:ID:NAME:EVENT_ID`

**Request Body**:
```json
{
  "qrCode": "STUDENT:a1b2c3d4-e5f6-7890-abcd-ef1234567890:John Doe:event123-4567-8901-2345-678901234567"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "student": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "John Doe",
    "grade": "5th Grade",
    "token": "tok_abc***",
    "event_id": "event123-4567-8901-2345-678901234567",
    "photo_count": 15,
    "token_expires_at": "2024-12-31T23:59:59Z",
    "event": {
      "id": "event123-4567-8901-2345-678901234567",
      "name": "School Photos 2024",
      "school_name": "Elementary School",
      "event_date": "2024-03-15",
      "active": true
    }
  },
  "metadata": {
    "qr_format": "valid",
    "lookup_time_ms": 125,
    "token_status": "valid"
  }
}
```

**Error Responses**:
- **400**: Invalid QR format, invalid UUIDs, name mismatch, token expired, event not active
- **404**: Student not found
- **500**: Internal server error

**Features**:
- Validates QR code format using regex pattern
- Checks UUID validity for student and event IDs
- Fuzzy name matching with 20% tolerance for typos
- Token expiration validation
- Event active status verification
- Comprehensive logging with masked sensitive data

### 2. Student Lookup Endpoint

**Endpoint**: `GET /api/admin/students/[id]`

**Purpose**: Retrieves detailed student information with event details, photo statistics, and recent activity.

**Success Response** (200):
```json
{
  "success": true,
  "student": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "John Doe",
    "grade": "5th Grade",
    "token": "tok_abc***",
    "event_id": "event123-4567-8901-2345-678901234567",
    "token_expires_at": "2024-12-31T23:59:59Z",
    "created_at": "2024-01-15T10:30:00Z",
    "event": {
      "id": "event123-4567-8901-2345-678901234567",
      "name": "School Photos 2024",
      "school_name": "Elementary School",
      "event_date": "2024-03-15",
      "active": true,
      "base_price": 25.00
    },
    "photo_stats": {
      "total_assigned": 15,
      "approved": 12,
      "pending_approval": 3,
      "last_tagged_at": "2024-03-20T14:30:00Z"
    },
    "order_stats": {
      "total_orders": 2
    },
    "token_info": {
      "status": "valid",
      "expires_at": "2024-12-31T23:59:59Z",
      "days_until_expiry": 285
    },
    "recent_photos": [
      {
        "id": "photo123-4567-8901-2345-678901234567",
        "filename": "IMG_001.jpg",
        "approved": true,
        "created_at": "2024-03-20T10:00:00Z",
        "tagged_at": "2024-03-20T14:30:00Z",
        "tagged_by": "admin"
      }
    ]
  },
  "metadata": {
    "lookup_time_ms": 95,
    "request_id": "req_abc123",
    "data_freshness": "2024-03-20T15:00:00Z"
  }
}
```

**Error Responses**:
- **400**: Invalid UUID format
- **404**: Student not found
- **500**: Internal server error

**Features**:
- Comprehensive student profile with event relationships
- Photo statistics breakdown by approval status
- Token status validation with expiry calculations
- Recent activity tracking (last 5 photos)
- Order history statistics
- Performance optimized with targeted queries

### 3. Enhanced Batch Tagging Endpoint

**Endpoint**: `POST /api/admin/tagging/batch`

**Purpose**: Assigns photos to students in batch operations with support for both QR workflow and standard batch operations.

#### QR Tagging Workflow Format

**Request Body**:
```json
{
  "eventId": "event123-4567-8901-2345-678901234567",
  "photoIds": [
    "photo123-4567-8901-2345-678901234567",
    "photo456-7890-1234-5678-901234567890"
  ],
  "studentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

#### Standard Batch Format

**Request Body**:
```json
{
  "eventId": "event123-4567-8901-2345-678901234567",
  "assignments": [
    {
      "photoId": "photo123-4567-8901-2345-678901234567",
      "subjectId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    },
    {
      "photoId": "photo456-7890-1234-5678-901234567890",
      "subjectId": "b2c3d4e5-f6g7-8901-bcde-f12345678901"
    }
  ]
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Successfully assigned 2 photos to student",
  "data": {
    "assignedCount": 2,
    "duplicateCount": 0,
    "skippedCount": 0,
    "workflowType": "qr_tagging",
    "stats": {
      "totalPhotos": 45,
      "taggedPhotos": 32,
      "untaggedPhotos": 13,
      "progressPercentage": 71
    },
    "metadata": {
      "processingTimeMs": 234,
      "requestId": "req_def456"
    }
  }
}
```

**Features**:
- **Dual Schema Support**: Automatically detects QR workflow vs. standard batch format
- **Photo Validation**: Verifies photos exist, belong to event, and are approved
- **Duplicate Detection**: Identifies and skips existing assignments
- **Atomic Operations**: Uses stored procedures for data consistency
- **Comprehensive Logging**: Tracks all operations with performance metrics
- **Progress Statistics**: Returns updated tagging progress for the event

**Limits**:
- QR Tagging: Max 50 photos per request
- Standard Batch: Max 100 assignments per request

## Security Features

### Authentication
- All endpoints protected with `withAuth` middleware
- Bypasses authentication in development mode
- Validates admin user sessions in production

### Rate Limiting
- **QR Decode**: 30 requests/minute per IP
- **Student Lookup**: 60 requests/minute per IP
- **Batch Tagging**: 20 requests/minute per IP (inherited)

### Data Protection
- Sensitive data masking in logs (tokens as `tok_***`, URLs as `*masked*`)
- UUID validation for all ID parameters
- Input sanitization and validation using Zod schemas

### Logging
- Structured logging with request IDs for tracing
- Performance metrics tracking
- Security event logging for audit trails
- Error context preservation for debugging

## Error Handling

### Standard Error Format
```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": "Additional error details or validation errors",
  "request_id": "req_abc123"
}
```

### HTTP Status Codes
- **200**: Success
- **400**: Bad Request (validation errors, invalid format)
- **401**: Unauthorized (in production)
- **404**: Not Found (student/resource not found)
- **429**: Too Many Requests (rate limit exceeded)
- **500**: Internal Server Error

## Usage Examples

### Complete QR Tagging Workflow

```javascript
// Step 1: Decode QR code
const qrResponse = await fetch('/api/admin/qr/decode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    qrCode: 'STUDENT:a1b2c3d4-e5f6-7890-abcd-ef1234567890:John Doe:event123-4567-8901-2345-678901234567'
  })
});
const qrData = await qrResponse.json();

// Step 2: Assign photos to the student
if (qrData.success) {
  const tagResponse = await fetch('/api/admin/tagging/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId: qrData.student.event_id,
      photoIds: selectedPhotoIds,
      studentId: qrData.student.id
    })
  });
  const tagData = await tagResponse.json();
  
  // Step 3: Get updated student info
  if (tagData.success) {
    const studentResponse = await fetch(`/api/admin/students/${qrData.student.id}`);
    const studentData = await studentResponse.json();
    console.log(`Student now has ${studentData.student.photo_stats.total_assigned} photos`);
  }
}
```

## Database Operations

### Stored Procedures Used
- `batch_assign_photos`: Atomic photo assignment operation

### Tables Involved
- `subjects`: Student information and tokens
- `events`: Event details and status
- `photos`: Photo metadata and approval status
- `photo_subjects`: Many-to-many relationship for assignments
- `orders`: Order history for statistics

### RLS Policies
All operations respect Row Level Security policies and use service role for admin operations.

## Performance Considerations

- **Database Queries**: Optimized with appropriate indexes and limits
- **Batch Operations**: Limited to prevent timeouts and resource exhaustion
- **Response Times**: Target <200ms for most operations
- **Memory Usage**: Efficient handling of photo arrays and large datasets
- **Concurrent Processing**: Thread-safe operations with proper locking

## Testing

Integration tests are provided in `__tests__/api/admin/qr-tagging.test.ts` covering:
- QR code validation and parsing
- Student lookup with various scenarios
- Both batch tagging workflows
- Error handling and edge cases
- Complete workflow integration
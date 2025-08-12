# APIs de Tokens - Documentación

## Resumen
Sistema completo de gestión de tokens automáticos para el portal familia. Implementa el flujo: Upload con QR → Token automático → Export para escuela → Portal familia.

## 📋 Endpoints Implementados

### 1. `/api/admin/events/[id]/tokens`

#### GET - Lista tokens del evento
```bash
GET /api/admin/events/123e4567-e89b-12d3-a456-426614174000/tokens
```

**Response:**
```json
{
  "success": true,
  "event": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Sesión Primaria 2024",
    "school_name": "Escuela San José",
    "date": "2024-01-15",
    "active": true
  },
  "tokens": [
    {
      "subject_id": "456...",
      "subject_name": "Juan Pérez",
      "token_masked": "ABCDEFGh***xyz9",
      "expires_at": "2024-02-15T12:00:00Z",
      "is_expired": false,
      "has_photos": true,
      "portal_url": "https://app.com/f/ABCDEFGhJKLMNPQRSTUVWXYZabcdefg"
    }
  ],
  "stats": {
    "total": 25,
    "active": 23,
    "expired": 2,
    "with_photos": 18,
    "without_photos": 7
  },
  "generated_at": "2024-01-11T15:30:00Z"
}
```

#### POST - Genera tokens para todos los estudiantes
```bash
POST /api/admin/events/123e4567-e89b-12d3-a456-426614174000/tokens
Content-Type: application/json

{
  "regenerate_existing": false,
  "expiry_days": 30
}
```

#### DELETE - Invalida todos los tokens del evento
```bash
DELETE /api/admin/events/123e4567-e89b-12d3-a456-426614174000/tokens
Content-Type: application/json

{
  "reason": "security_breach"
}
```

---

### 2. `/api/admin/events/[id]/tokens/export`

#### GET - Exporta tokens para entregar a escuela
```bash
# CSV export (para entregar a escuela)
GET /api/admin/events/123e4567-e89b-12d3-a456-426614174000/tokens/export?format=csv

# JSON export (para sistemas)
GET /api/admin/events/123e4567-e89b-12d3-a456-426614174000/tokens/export?format=json&include_expired=false
```

**CSV Output:**
```csv
Estudiante,Token de Acceso,URL del Portal,Fecha Expiración,Estado,Tiene Fotos,Fecha Generación
"Juan Pérez","ABCDEFGhJKLMNPQRSTUVWXYZabcdefg","https://app.com/f/ABCD...","2024-02-15","ACTIVO","SÍ","2024-01-11"
"María García","XYZ123...","https://app.com/f/XYZ1...","2024-02-15","ACTIVO","NO","2024-01-11"
```

**JSON Output:**
```json
{
  "export_info": {
    "event": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Sesión Primaria 2024",
      "school_name": "Escuela San José",
      "date": "2024-01-15"
    },
    "export_date": "2024-01-11T15:30:00Z",
    "total_tokens": 25,
    "active_tokens": 23,
    "tokens_with_photos": 18
  },
  "instructions": {
    "distribution": "Entregar a cada estudiante su token único",
    "access": "Los estudiantes pueden acceder usando la URL del portal o escaneando QR",
    "expiry": "Los tokens expiran en 30 días aproximadamente",
    "support": "Para soporte técnico, contactar al fotógrafo"
  },
  "tokens": [
    {
      "student_name": "Juan Pérez",
      "token": "ABCDEFGhJKLMNPQRSTUVWXYZabcdefg",
      "portal_url": "https://app.com/f/ABCDEFGhJKLMNPQRSTUVWXYZabcdefg",
      "qr_url": "https://app.com/f/ABCDEFGhJKLMNPQRSTUVWXYZabcdefg",
      "expires_at": "2024-02-15T12:00:00Z",
      "is_expired": false,
      "has_photos": true,
      "photo_count": 0,
      "created_date": "2024-01-11"
    }
  ]
}
```

---

### 3. `/api/admin/events/[id]/generate-tokens`

#### GET - Resumen del estado de tokens
```bash
GET /api/admin/events/123e4567-e89b-12d3-a456-426614174000/generate-tokens
```

**Response:**
```json
{
  "success": true,
  "event": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Sesión Primaria 2024",
    "school_name": "Escuela San José",
    "date": "2024-01-15",
    "active": true
  },
  "summary": {
    "total_subjects": 30,
    "subjects_with_photos": 18,
    "subjects_without_photos": 12,
    "total_tokens": 25,
    "active_tokens": 23,
    "expired_tokens": 2,
    "subjects_need_tokens": 5
  },
  "recommendations": {
    "should_generate_tokens": true,
    "ready_for_distribution": true,
    "has_photos_assigned": true
  },
  "actions": {
    "generate_missing_tokens": "/api/admin/events/123e4567.../generate-tokens",
    "export_existing_tokens": "/api/admin/events/123e4567.../tokens/export?format=csv",
    "view_all_tokens": "/api/admin/events/123e4567.../tokens"
  }
}
```

#### POST - Generación masiva inteligente
```bash
POST /api/admin/events/123e4567-e89b-12d3-a456-426614174000/generate-tokens
Content-Type: application/json

{
  "force_regenerate": false,
  "expiry_days": 30,
  "only_students_with_photos": true
}
```

**Response:**
```json
{
  "success": true,
  "event": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Sesión Primaria 2024",
    "school_name": "Escuela San José",
    "date": "2024-01-15"
  },
  "results": {
    "total_subjects": 30,
    "processed_subjects": 5,
    "tokens_generated": 5,
    "tokens_failed": 0,
    "students_with_photos": 18,
    "force_regenerate": false,
    "only_students_with_photos": true
  },
  "token_settings": {
    "expiry_days": 30,
    "expires_at": "2024-02-11T15:30:00Z"
  },
  "next_steps": {
    "export_url": "/api/admin/events/123e4567.../tokens/export?format=csv",
    "view_tokens_url": "/api/admin/events/123e4567.../tokens"
  },
  "generated_at": "2024-01-11T15:30:00Z"
}
```

---

### 4. Upload Modificado - `/api/admin/photos/simple-upload`

**Funcionalidad Agregada:**
- ✅ Generación automática de tokens cuando se detecta QR y se asigna foto
- ✅ Response incluye información del token generado

**Response Modificado:**
```json
{
  "success": true,
  "uploaded": [
    {
      "id": "photo-uuid",
      "filename": "IMG_001.jpg",
      "preview_path": "preview_123.webp",
      "storage_path": "original_123.jpg",
      "success": true,
      "qr_detected": {
        "student_name": "Juan Pérez",
        "student_id": "12345678***",
        "event_id": "87654321***",
        "assignment_success": true,
        "assignment_error": null,
        "token_generated": {
          "is_new": true,
          "expires_at": "2024-02-11T15:30:00Z",
          "portal_ready": true
        }
      }
    }
  ],
  "errors": [],
  "total": 1,
  "successful": 1,
  "failed": 0,
  "qr_detection": {
    "detected": 1,
    "auto_assigned": 1,
    "unassigned": 0
  }
}
```

---

## 🔧 Parámetros Comunes

### Query Parameters

- **format**: `csv`, `json` - Formato de exportación
- **include_expired**: `true`, `false` - Incluir tokens expirados
- **page**: Número de página (paginación)
- **limit**: Límite de resultados por página

### Body Parameters

- **regenerate_existing**: `boolean` - Forzar regeneración de tokens existentes
- **expiry_days**: `number` - Días hasta expiración (default: 30)
- **only_students_with_photos**: `boolean` - Solo generar para estudiantes con fotos
- **reason**: `string` - Razón para invalidación (security_breach, etc.)

---

## 🔒 Seguridad

### Rate Limiting
- **Token Operations**: 30 req/min por IP
- **Export Operations**: 10 req/min por IP  
- **Generation Operations**: 5 req/min por IP

### Token Security
- ✅ Tokens ≥20 caracteres (nanoid/crypto.randomBytes)
- ✅ Expiración automática configurable
- ✅ Tokens enmascarados en logs (`tok_***`)
- ✅ Validación UUID estricta
- ✅ No exposición de tokens completos en responses públicos

### Access Control
- ✅ Solo admins pueden gestionar tokens
- ✅ Rate limiting por IP y operación
- ✅ Logging estructurado de operaciones sensibles
- ✅ Validación estricta de parámetros

---

## 📊 Headers de Response

```
X-Request-Id: req_12345678901234567890
Cache-Control: no-cache, no-store, must-revalidate
Content-Type: application/json | text/csv
Content-Disposition: attachment; filename="tokens_evento.csv" (para CSV)
```

---

## 🚀 Testing

```bash
# Probar flujo completo
npm run test:token-flow

# Endpoints individuales
curl http://localhost:3000/api/admin/events/EVENT-ID/generate-tokens
curl http://localhost:3000/api/admin/events/EVENT-ID/tokens
curl "http://localhost:3000/api/admin/events/EVENT-ID/tokens/export?format=csv" -o tokens.csv
```

---

## 🎯 Casos de Uso

1. **Flujo Normal**: Upload fotos → tokens automáticos → export CSV → entregar a escuela
2. **Generación Masiva**: Generar tokens para todos los estudiantes de una vez
3. **Solo con Fotos**: Generar tokens solo para estudiantes que tienen fotos asignadas
4. **Export Escuela**: CSV listo para entregar con nombres + códigos + URLs
5. **Monitoreo**: Ver estado de tokens, expiración, uso

---

## 📋 Errores Comunes

- **400**: ID de evento inválido, parámetros incorrectos
- **404**: Evento no encontrado, no hay estudiantes
- **429**: Rate limit excedido
- **500**: Error interno del servidor

---

## ✅ RESULTADO

**APIs completas y funcionales** para el flujo automático de tokens:
- ✅ Generación automática en upload
- ✅ Gestión masiva por evento  
- ✅ Export para escuela (CSV/JSON)
- ✅ Integración con portal familia
- ✅ Seguridad y rate limiting
- ✅ Logging y monitoreo

**El flujo del punto 6 está completamente implementado y operativo.**
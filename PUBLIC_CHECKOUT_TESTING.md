# 🛒 Public Checkout Service - Testing Guide

## 🚀 Implementación Completada

### Servicios Creados
- ✅ **PublicCheckoutService** (`lib/services/publicCheckout.service.ts`)
- ✅ **API Endpoint** (`app/api/gallery/checkout/route.ts`)
- ✅ **Tests E2E** (`__tests__/e2e/public-checkout.test.ts`)

### Funcionalidades
- ✅ Validación de evento activo y fotos aprobadas
- ✅ Creación/resolución de subjects públicos por email
- ✅ Cálculo de precios con fallback a `events.price_per_photo`
- ✅ Creación atómica de orden + order_items
- ✅ Integración completa con MercadoPago (preferencia + back_urls)
- ✅ Webhook mantiene idempotencia existente

---

## 🧪 Comandos curl de Prueba

### 1. Checkout Exitoso
```bash
# Crear checkout público con 2 fotos
curl -X POST http://localhost:3000/api/gallery/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_UUID_AQUI",
    "photoIds": ["PHOTO_UUID_1", "PHOTO_UUID_2"],
    "contactInfo": {
      "name": "Juan Pérez",
      "email": "juan.perez@example.com",
      "phone": "+5491123456789"
    },
    "package": "Paquete Familiar"
  }'

# Respuesta esperada (200):
{
  "data": {
    "orderId": "uuid-de-orden",
    "preferenceId": "mp-preference-id",
    "redirectUrl": "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=...",
    "totalAmount": 20.00,
    "photoCount": 2,
    "package": "Paquete Familiar"
  },
  "requestId": "req_abc123"
}
```

### 2. Error - Evento No Encontrado
```bash
curl -X POST http://localhost:3000/api/gallery/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "00000000-0000-0000-0000-000000000000",
    "photoIds": ["00000000-0000-0000-0000-000000000001"],
    "contactInfo": {
      "name": "Juan Pérez",
      "email": "juan.perez@example.com"
    }
  }'

# Respuesta esperada (404):
{
  "error": "Evento no encontrado o inactivo",
  "details": "El evento especificado no existe o no está disponible",
  "requestId": "req_def456"
}
```

### 3. Error - Validación de Datos
```bash
curl -X POST http://localhost:3000/api/gallery/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "invalid-uuid",
    "photoIds": [],
    "contactInfo": {
      "name": "A",
      "email": "invalid-email"
    }
  }'

# Respuesta esperada (400):
{
  "error": "Datos de entrada inválidos",
  "details": "eventId: Invalid uuid, photoIds: Array must contain at least 1 element(s), contactInfo.name: String must contain at least 2 character(s), contactInfo.email: Invalid email",
  "requestId": "req_ghi789"
}
```

### 4. Error - Fotos No Aprobadas
```bash
curl -X POST http://localhost:3000/api/gallery/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_UUID_VALIDO",
    "photoIds": ["PHOTO_UUID_NO_APROBADA"],
    "contactInfo": {
      "name": "Juan Pérez",
      "email": "juan.perez@example.com"
    }
  }'

# Respuesta esperada (400):
{
  "error": "Fotos no válidas",
  "details": "Algunas fotos no están disponibles o no están aprobadas",
  "requestId": "req_jkl012"
}
```

---

## 🔍 Verificación en Base de Datos

### Después de un checkout exitoso, verificar:

```sql
-- 1. Orden creada
SELECT 
  id, order_number, status, total_amount, 
  contact_name, contact_email, mp_preference_id,
  metadata
FROM orders 
WHERE id = 'ORDER_ID_DEL_RESPONSE';

-- 2. Subject público creado
SELECT 
  id, name, email, access_token, metadata
FROM subjects 
WHERE event_id = 'EVENT_ID' 
  AND email = 'juan.perez@example.com';

-- 3. Items de la orden
SELECT 
  photo_id, quantity, unit_price, subtotal
FROM order_items 
WHERE order_id = 'ORDER_ID_DEL_RESPONSE';
```

---

## 🎯 Tests E2E

### Ejecutar tests
```bash
# Test completo E2E
npm run test __tests__/e2e/public-checkout.test.ts

# Test específico
npx playwright test __tests__/e2e/public-checkout.test.ts --grep "should complete public checkout flow"
```

### Casos cubiertos
- ✅ Flujo completo: checkout → orden → webhook → approved
- ✅ Validación de datos de entrada
- ✅ Evento no existente
- ✅ Fotos no aprobadas
- ✅ Creación de subject público
- ✅ Cálculo correcto de precios

---

## 🔗 Integración con Frontend

### Ejemplo de uso desde el frontend:
```typescript
// Función para procesar checkout público
async function processPublicCheckout(
  eventId: string,
  selectedPhotoIds: string[],
  contactInfo: {
    name: string;
    email: string;
    phone?: string;
  }
) {
  try {
    const response = await fetch('/api/gallery/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        photoIds: selectedPhotoIds,
        contactInfo,
        package: 'Selección personalizada',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error en el checkout');
    }

    // Redirigir a MercadoPago
    window.location.href = result.data.redirectUrl;
    
    return result.data;
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
}
```

---

## 🔄 Flujo Completo

### 1. Usuario selecciona fotos en galería pública
- Navega a `/gallery/[eventId]`
- Selecciona fotos aprobadas
- Completa formulario de contacto

### 2. Frontend llama a `/api/gallery/checkout`
- Valida evento activo
- Valida fotos aprobadas y consistencia con evento
- Crea/resuelve subject público por email
- Calcula precios usando `events.price_per_photo`
- Crea orden + order_items atómicamente
- Genera preferencia MercadoPago

### 3. Redirección a MercadoPago
- Usuario completa pago en sandbox/producción
- MercadoPago envía webhook a `/api/payments/webhook`

### 4. Webhook procesa pago
- Verifica firma e idempotencia (ya implementado)
- Actualiza `orders.status` de pending → approved/rejected
- Proceso atómico con `process_payment_webhook` RPC

### 5. URLs de retorno
- **Éxito:** `/public/payment-success?order=ORDER_ID`
- **Error:** `/public/payment-failure?order=ORDER_ID`
- **Pendiente:** `/public/payment-pending?order=ORDER_ID`

---

## ⚠️ Consideraciones Importantes

### Seguridad
- ✅ Validación estricta de UUIDs
- ✅ Verificación de fotos aprobadas
- ✅ Límite máximo de 50 fotos por orden
- ✅ Subjects públicos con tokens únicos
- ✅ Webhook con verificación de firma

### Performance
- ✅ Operaciones atómicas en BD
- ✅ Rollback automático en caso de error
- ✅ Logs de desarrollo para debugging
- ✅ Request ID único para tracking

### Compatibilidad
- ✅ Mantiene idempotencia del webhook existente
- ✅ No modifica endpoints críticos de pagos
- ✅ Compatible con esquema actual de BD
- ✅ Usa utilidades de respuesta consistentes

---

## 🚀 Próximos Pasos

1. **Integrar en UI pública** - Agregar botón "Comprar selección" en galería
2. **Páginas de resultado** - Crear `/public/payment-success`, etc.
3. **Emails transaccionales** - Confirmación de compra
4. **Analytics** - Tracking de conversiones públicas
5. **Optimizaciones** - Cache de precios, batch operations

---

## 🐛 Troubleshooting

### Si el checkout falla:
1. Verificar que el evento esté activo (`status = 'active'`)
2. Verificar que las fotos estén aprobadas (`approved = true`)
3. Verificar configuración de MercadoPago (MP_ACCESS_TOKEN, etc.)
4. Revisar logs de desarrollo en consola

### Si el webhook no funciona:
1. Verificar MP_WEBHOOK_SECRET configurado
2. Verificar que la función `process_payment_webhook` existe en Supabase
3. Revisar logs del webhook en `/api/payments/webhook`

### Si los tests fallan:
1. Verificar que Supabase esté corriendo localmente
2. Verificar permisos de service_role
3. Revisar esquema de BD vs. tipos TypeScript

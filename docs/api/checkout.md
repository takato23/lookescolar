# Checkout APIs - Sistema de Fotografía Escolar

Documentación de las APIs de checkout implementadas para completar el flujo de compras del MVP.

## Endpoints Implementados

### 1. Family Checkout (Con Tokens)
**POST `/api/family/checkout`**

Procesa checkout para familias que acceden con tokens únicos.

#### Request Body
```typescript
{
  token: string;           // Token de 20+ caracteres
  contactInfo: {
    name: string;          // Mín. 2 caracteres
    email: string;         // Email válido
    phone?: string;        // Opcional
  };
  items: Array<{
    photoId: string;       // UUID de la foto
    quantity: number;      // 1-10
    priceType: string;     // 'base', 'premium', etc.
  }>;                      // Mín. 1, máx. 50 items
}
```

#### Response (200)
```typescript
{
  success: true;
  orderId: string;
  preferenceId: string;
  redirectUrl: string;     // URL de MP para pago
  total: number;           // Total en pesos
  currency: "ARS";
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    unit_price_formatted: string;
  }>;
  event: {
    name: string;
    school: string;
  };
}
```

#### Validaciones
- ✅ Token válido y no expirado
- ✅ Fotos pertenecen al sujeto del token
- ✅ Solo un pedido pendiente por sujeto
- ✅ Evento activo
- ✅ Precios válidos del evento
- ✅ Rate limiting: 5 req/min por IP

#### Errores Comunes
- `400` - Datos inválidos (validación Zod)
- `401` - Token inválido o expirado
- `403` - Fotos no pertenecen al sujeto
- `409` - Ya tiene pedido pendiente
- `429` - Rate limit excedido

---

### 2. Public Checkout (Sin Tokens)
**POST `/api/gallery/checkout`**

Procesa checkout para galería pública sin autenticación.

#### Request Body
```typescript
{
  eventId: string;         // UUID del evento
  contactInfo: {
    name: string;          // Mín. 2 caracteres
    email: string;         // Email válido
    phone?: string;        // Opcional
  };
  items: Array<{
    photoId: string;       // UUID de la foto
    quantity: number;      // 1-10
    priceType: string;     // 'base', 'premium', etc.
  }>;                      // Mín. 1, máx. 50 items
}
```

#### Response (200)
```typescript
{
  success: true;
  orderId: string;
  preferenceId: string;
  redirectUrl: string;     // URL de MP para pago
  total: number;           // Total en pesos
  currency: "ARS";
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    unit_price_formatted: string;
  }>;
  event: {
    id: string;
    name: string;
    school: string;
  };
}
```

#### Validaciones
- ✅ Evento existe y está activo
- ✅ Galería pública habilitada
- ✅ Fotos son públicamente visibles
- ✅ Solo un pedido pendiente por email+evento
- ✅ Precios válidos del evento
- ✅ Rate limiting: 5 req/min por IP

#### Errores Comunes
- `400` - Datos inválidos
- `403` - Fotos no públicas o evento inactivo
- `404` - Evento no encontrado
- `409` - Ya tiene pedido pendiente con ese email
- `429` - Rate limit excedido

---

## Integración con Sistema Existente

### Webhook de Mercado Pago
**Ambas APIs son compatible con el webhook existente:**
- `/api/payments/webhook` - Procesa notificaciones idempotentes
- Verifica firma HMAC-SHA256
- Actualiza órdenes automáticamente
- Maneja reintentos con backoff exponencial

### Base de Datos
**Nuevas columnas en tabla `orders`:**
```sql
event_id UUID              -- Para órdenes públicas
is_public_order BOOLEAN    -- Distingue origen
created_by TEXT            -- 'family_checkout', 'public_checkout'
total_amount_cents INTEGER -- Total cacheado
```

**Nuevas columnas en tabla `subjects`:**
```sql
public_visible BOOLEAN     -- Fotos visibles públicamente
```

**Nuevas columnas en tabla `events`:**
```sql
public_gallery_enabled BOOLEAN  -- Permite checkout público
school_name TEXT                 -- Nombre para mostrar
```

### Constraints de Negocio
1. **Órdenes Privadas**: `subject_id NOT NULL, event_id NULL, is_public_order = false`
2. **Órdenes Públicas**: `subject_id NULL, event_id NOT NULL, is_public_order = true`
3. **Un pedido pendiente por sujeto** (órdenes privadas)
4. **Un pedido pendiente por email+evento** (órdenes públicas)

---

## Flujo de Desarrollo

### Frontend Integration
```typescript
// Family Checkout
const familyCheckout = async (token: string, items: CartItem[]) => {
  const response = await fetch('/api/family/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      contactInfo: { name, email, phone },
      items
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    window.location.href = data.redirectUrl;
  } else {
    showError(data.error);
  }
};

// Public Checkout
const publicCheckout = async (eventId: string, items: CartItem[]) => {
  const response = await fetch('/api/gallery/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId,
      contactInfo: { name, email, phone },
      items
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    window.location.href = data.redirectUrl;
  } else {
    showError(data.error);
  }
};
```

### Error Handling
```typescript
const handleCheckoutError = (error: any) => {
  switch (error.status) {
    case 400:
      showValidationErrors(error.details);
      break;
    case 401:
      showError('Token inválido o expirado');
      break;
    case 403:
      showError('Algunas fotos no están disponibles');
      break;
    case 409:
      showError('Ya tienes un pedido pendiente');
      break;
    case 429:
      showError('Demasiados intentos, espera un momento');
      break;
    default:
      showError('Error interno del servidor');
  }
};
```

---

## Testing

### Test Coverage
- ✅ **Unit Tests**: Validaciones, rate limiting, errores
- ✅ **Integration Tests**: Checkout → Webhook flow completo
- ✅ **Security Tests**: Firma webhook, tokens inválidos
- ✅ **Performance Tests**: Rate limiting, timeouts

### Test Commands
```bash
# Tests específicos de checkout
npm test family-checkout.test.ts
npm test public-checkout.test.ts

# Test de integración completa
npm test checkout-webhook.test.ts

# Todos los tests
npm test
```

---

## Security Checklist

### Implementado ✅
- [x] Rate limiting por IP (5 req/min)
- [x] Validación de tokens (≥20 chars)
- [x] Verificación firma webhook HMAC
- [x] Sanitización de inputs con Zod
- [x] Logs enmascarados (tokens → `tok_***`)
- [x] RLS policies en Supabase
- [x] Idempotencia por payment_id
- [x] Timeouts de respuesta <3s

### Próximos pasos 🔄
- [ ] Honeypot fields para spam
- [ ] CAPTCHA para alta frecuencia
- [ ] IP whitelisting para webhook
- [ ] Monitoring de patrones sospechosos

---

## Monitoring y Observabilidad

### Logs Estructurados
```json
{
  "requestId": "req_abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "event": "family_checkout_success",
  "orderId": "order_xyz789",
  "token": "tok_***",
  "itemsCount": 3,
  "totalCents": 4500,
  "duration": 1234
}
```

### Métricas Clave
- Conversión: checkout iniciados → pagos aprobados
- Tiempo promedio de checkout
- Rate de abandono en MP
- Errores por tipo y frecuencia
- Performance: p95 < 2s

---

## Migration Guide

### Para aplicar cambios:
```bash
# 1. Aplicar migración DB
npx supabase migration up

# 2. Verificar schema
npx supabase db diff

# 3. Regenerar tipos
npm run db:types

# 4. Ejecutar tests
npm test

# 5. Deploy
npm run build && npm start
```

### Rollback Plan
```sql
-- Revertir órdenes públicas
UPDATE orders SET is_public_order = false WHERE is_public_order IS NULL;
ALTER TABLE orders DROP COLUMN IF EXISTS event_id;
ALTER TABLE orders DROP COLUMN IF EXISTS is_public_order;
ALTER TABLE orders DROP COLUMN IF EXISTS created_by;
```

---

## Conclusión

✅ **MVP Completado**: Ambos flujos de checkout funcionales
✅ **Seguridad**: Rate limiting, validaciones, webhook seguro
✅ **Escalabilidad**: Soporta tanto tokens como acceso público
✅ **Testing**: Cobertura completa con tests de integración
✅ **Observabilidad**: Logs estructurados y métricas

El sistema ahora permite compras tanto para familias autenticadas como para visitantes de galería pública, completando el flujo crítico para que el negocio pueda operar.
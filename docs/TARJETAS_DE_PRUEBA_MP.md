# 💳 Tarjetas de Prueba - Mercado Pago Sandbox

## ✅ Para APROBAR Pagos

### Mastercard
- **Número**: `5031 7557 3453 0604`
- **Código de seguridad**: `123`
- **Fecha de vencimiento**: `11/25`
- **Nombre del titular**: `APRO`
- **DNI**: `12345678`

### Visa
- **Número**: `4509 9535 6623 3704`
- **Código de seguridad**: `123`
- **Fecha de vencimiento**: `11/25`
- **Nombre del titular**: `APRO`
- **DNI**: `12345678`

### American Express
- **Número**: `3711 803032 57522`
- **Código de seguridad**: `1234`
- **Fecha de vencimiento**: `11/25`
- **Nombre del titular**: `APRO`
- **DNI**: `12345678`

## ❌ Para RECHAZAR Pagos (Testing)

Usa cualquiera de las tarjetas anteriores pero con:
- **Nombre del titular**: `OTHE` → Rechazo genérico
- **Nombre del titular**: `CONT` → Rechaza y pide otro medio de pago
- **Nombre del titular**: `CALL` → Rechaza y pide llamar a autorizar
- **Nombre del titular**: `FUND` → Rechaza por fondos insuficientes
- **Nombre del titular**: `SECU` → Rechaza por código de seguridad incorrecto
- **Nombre del titular**: `EXPI` → Rechaza por fecha de expiración

## 📱 Otros Medios de Pago (Argentina)

### Pago Fácil / Rapipago
- Al seleccionar estos medios, MP genera un código de pago
- El pago queda en estado "pending" hasta confirmación
- En sandbox se aprueba automáticamente después de unos minutos

### Mercado Pago (Dinero en cuenta)
- Si el usuario tiene saldo en MP
- Se aprueba instantáneamente en sandbox

## 🧪 Proceso de Prueba

1. **Ve a la galería de fotos**: `/f/[token]`
2. **Agrega fotos al carrito**
3. **Procede al checkout**
4. **Completa los datos**:
   - Nombre: Tu nombre (de prueba)
   - Email: Tu email (de prueba)
   - Teléfono: Opcional
5. **En Mercado Pago**:
   - Selecciona "Tarjeta de crédito/débito"
   - Ingresa una de las tarjetas de arriba
   - Usa `APRO` como nombre para aprobar
6. **Verifica**:
   - Deberías ser redirigido a `/f/[token]/payment-success`
   - El pedido aparece en `/admin/orders` como "approved"

## ⚠️ Notas Importantes

- **Sandbox = No se cobra dinero real**
- Los pagos son simulados
- Las tarjetas solo funcionan en modo sandbox
- En producción, los usuarios usan sus tarjetas reales
- El webhook puede tardar 1-2 minutos en procesar

## 🔍 Debug

Si algo no funciona:
1. Verifica las credenciales en `.env.local`
2. Revisa la consola del navegador (F12)
3. Mira los logs del servidor (`npm run dev`)
4. Verifica en MP Dashboard: [Tu actividad](https://www.mercadopago.com.ar/developers/panel/app)

## 📞 Usuarios de Prueba

Para una experiencia más realista, puedes crear usuarios de prueba:

1. Ve a [Usuarios de prueba](https://www.mercadopago.com.ar/developers/panel/test-users)
2. Crea un usuario "Comprador"
3. Usa ese usuario para hacer las compras de prueba

Esto simula mejor el flujo real donde cada comprador tiene su cuenta MP.
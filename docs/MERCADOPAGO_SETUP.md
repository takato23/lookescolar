# 📘 Guía de Configuración de Mercado Pago

Esta guía te ayudará a configurar Mercado Pago para procesar pagos en LookEscolar.

## 🎯 Resumen Rápido

1. Crear cuenta en Mercado Pago Developers
2. Crear una aplicación
3. Obtener credenciales (sandbox primero, producción después)
4. Configurar webhooks
5. Ingresar credenciales en el panel admin

## 📝 Paso a Paso Detallado

### 1. Crear Cuenta de Desarrollador

1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
2. Inicia sesión con tu cuenta de Mercado Pago (o crea una nueva)
3. Completa tu perfil de desarrollador si es necesario

### 2. Crear una Aplicación

1. En el panel de desarrolladores, ve a **"Tus aplicaciones"**
2. Click en **"Crear aplicación"**
3. Completa los datos:
   - **Nombre**: LookEscolar (o el nombre que prefieras)
   - **Descripción**: Sistema de venta de fotografías escolares
   - **Solución de integración**: Checkout Pro
   - **Plataforma**: Web
4. Acepta los términos y crea la aplicación

### 3. Obtener Credenciales

#### Credenciales de Prueba (Sandbox)
1. En tu aplicación, ve a **"Credenciales de prueba"**
2. Encontrarás:
   - **Public Key**: `TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - **Access Token**: `TEST-xxxxxxxxxx...` (muy largo)
3. Guarda estas credenciales para configuración inicial

#### Credenciales de Producción
1. Ve a **"Credenciales de producción"**
2. Completa el formulario de activación si es necesario:
   - Información del negocio
   - Datos de contacto
   - Descripción del uso
3. Una vez aprobado, obtendrás:
   - **Public Key**: `APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - **Access Token**: `APP_USR-xxxxxxxxxx...`

### 4. Configurar Webhooks

1. En tu aplicación, ve a **"Webhooks"**
2. Click en **"Configurar notificaciones"**
3. Configura:
   - **URL de notificación**: `https://tu-dominio.com/api/payments/webhook`
   - **Eventos**: Selecciona "Payment" → "payment.created" y "payment.updated"
4. Guarda y copia el **Webhook Secret** que te proporciona

### 5. Configurar en LookEscolar

1. Ingresa al panel admin: `/admin`
2. Ve a **"Configuración"** → **"Mercado Pago"**
3. Ingresa las credenciales:
   - **Entorno**: Selecciona "Sandbox" para pruebas
   - **Public Key**: La que copiaste de MP
   - **Access Token**: El token de acceso
   - **Webhook Secret**: El secret del webhook (opcional pero recomendado)
4. Click en **"Probar Conexión"** para verificar
5. Si todo está bien, click en **"Guardar Configuración"**

## 🧪 Realizar Pruebas

### Usuarios de Prueba

Para probar pagos en sandbox necesitas usuarios de prueba:

1. Ve a [Usuarios de prueba](https://www.mercadopago.com.ar/developers/panel/test-users)
2. Crea dos usuarios:
   - **Vendedor**: Para recibir pagos (usa sus credenciales en la app)
   - **Comprador**: Para hacer pagos de prueba

### Tarjetas de Prueba

Usa estas tarjetas para simular diferentes escenarios:

| Tarjeta | Número | CVV | Vencimiento | Resultado |
|---------|--------|-----|-------------|-----------|
| Mastercard | 5031 7557 3453 0604 | 123 | 11/25 | Aprobado |
| Visa | 4509 9535 6623 3704 | 123 | 11/25 | Aprobado |
| Amex | 3711 803032 57522 | 1234 | 11/25 | Aprobado |

Para simular rechazos, usa el nombre `APRO` para aprobar o `OTHE` para rechazar.

## 🚀 Pasar a Producción

Cuando estés listo para cobrar pagos reales:

1. Obtén las credenciales de producción (ver paso 3)
2. En el panel admin de LookEscolar:
   - Cambia el **Entorno** a "Producción"
   - Actualiza las credenciales con las de producción
   - Guarda y prueba la conexión
3. Actualiza el webhook en MP con tu URL de producción

## ⚠️ Consideraciones Importantes

### Seguridad
- **NUNCA** compartas tu Access Token
- **NUNCA** hardcodees credenciales en el código
- Usa siempre HTTPS en producción
- Verifica el webhook secret para evitar requests falsos

### Límites y Comisiones
- Sandbox: Sin límites, pagos no reales
- Producción: 
  - Comisión: ~5.99% + IVA por transacción
  - Acreditación: Inmediata o según medio de pago
  - Retiros: A cuenta bancaria sin costo

### Monitoreo
- Panel de MP: Ve todas las transacciones
- LookEscolar: Panel de órdenes en `/admin/orders`
- Webhooks: Logs en la consola del servidor

## 🆘 Solución de Problemas

### Error "Invalid credentials"
- Verifica que las credenciales correspondan al entorno seleccionado
- Sandbox usa credenciales TEST-xxx
- Producción usa credenciales APP_USR-xxx

### No llegan webhooks
- Verifica que la URL sea accesible públicamente
- Revisa los logs del servidor
- En MP, ve a Webhooks → Histórico de notificaciones

### Pagos rechazados en producción
- Verifica límites de la tarjeta
- Confirma datos del comprador
- Revisa el detalle en el panel de MP

## 📚 Enlaces Útiles

- [Documentación oficial](https://www.mercadopago.com.ar/developers/es/docs)
- [API Reference](https://www.mercadopago.com.ar/developers/es/reference)
- [SDKs](https://www.mercadopago.com.ar/developers/es/docs/sdks-library/landing)
- [Estado del servicio](https://status.mercadopago.com/)
- [Soporte](https://www.mercadopago.com.ar/developers/es/support)

## 💬 Contacto de Soporte

Si tienes problemas con la integración:

1. **Mercado Pago**: 
   - Chat en el panel de developers
   - Email: developers@mercadopago.com
   
2. **LookEscolar**:
   - Revisa los logs en `/admin/logs`
   - Contacta al desarrollador del sistema
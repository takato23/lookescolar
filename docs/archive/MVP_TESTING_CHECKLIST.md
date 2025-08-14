# 🧪 MVP Testing Checklist - Look Escolar

## Objetivo
Validar que el MVP funcione completamente para que **Melisa pueda usar el sistema HOY** para su negocio de fotografía escolar.

## ✅ Checklist de Validación Manual

### 🔐 1. Autenticación Admin
- [ ] **Login exitoso**: Email y contraseña correctos funcionan
- [ ] **Login fallido**: Credenciales incorrectas son rechazadas
- [ ] **Rate limiting**: Múltiples intentos fallos bloquean temporalmente
- [ ] **Sesión persistente**: Mantenerse logueado entre recargas
- [ ] **Logout**: Cerrar sesión funciona correctamente

**✅ Validación**: Admin puede acceder al dashboard sin problemas

---

### 📅 2. Gestión de Eventos
- [ ] **Crear evento**: Formulario crea evento con todos los campos
- [ ] **Validación campos**: Campos requeridos son validados
- [ ] **Listar eventos**: Se muestran todos los eventos creados
- [ ] **Editar evento**: Modificar evento existente (si disponible)
- [ ] **Navegación**: Enlaces entre páginas funcionan

**URL de prueba**: `/admin/events`

**✅ Validación**: Melisa puede crear eventos para sus sesiones fotográficas

---

### 👥 3. Gestión de Sujetos (Alumnos)
- [ ] **Crear sujeto individual**: Agregar alumno con nombre, email, grado
- [ ] **Token generado**: Se crea token de ≥20 caracteres automáticamente
- [ ] **Token único**: Cada sujeto tiene token diferente
- [ ] **Buscar sujetos**: Filtro de búsqueda por nombre funciona
- [ ] **Filtrar por evento**: Solo muestra sujetos del evento seleccionado
- [ ] **Validación datos**: Email válido y campos requeridos

**URL de prueba**: `/admin/subjects`

**✅ Validación**: Melisa puede gestionar lista de alumnos por evento

---

### 📷 4. Subida de Fotos
- [ ] **Seleccionar archivos**: Interfaz permite seleccionar múltiples fotos
- [ ] **Drag & drop**: Arrastrar archivos al área de subida
- [ ] **Validar formato**: Solo acepta JPG, PNG, WebP
- [ ] **Validar tamaño**: Rechaza archivos >10MB
- [ ] **Progreso upload**: Muestra barra de progreso por foto
- [ ] **Watermark aplicado**: Foto procesada tiene marca de agua
- [ ] **Almacenamiento**: Foto guardada en bucket privado
- [ ] **Error handling**: Maneja errores de subida graciosamente

**URL de prueba**: `/admin/photos`

**✅ Validación**: Melisa puede subir fotos y se procesan correctamente

---

### 🏷️ 5. Tagging de Fotos
- [ ] **Interfaz tagging**: Muestra fotos y lista de sujetos
- [ ] **Asignar foto**: Click en sujeto asigna foto seleccionada
- [ ] **Feedback visual**: Indica cuando foto fue asignada
- [ ] **Prevenir duplicados**: No permite doble asignación misma foto-sujeto
- [ ] **Vista previa**: Fotos se muestran con thumbnails
- [ ] **Navegación rápida**: Shortcut de teclado o flujo ágil
- [ ] **Progreso visible**: Muestra cuántas fotos faltan por asignar

**URL de prueba**: `/admin/tagging`

**✅ Validación**: Melisa puede asignar fotos a alumnos eficientemente

---

### 🌐 6. Galería Pública
- [ ] **Acceso por URL**: `/gallery/[eventId]` muestra evento
- [ ] **Mostrar fotos**: Todas las fotos del evento son visibles
- [ ] **Watermark visible**: Fotos muestran marca de agua
- [ ] **Selección múltiple**: Checkboxes para seleccionar fotos
- [ ] **Responsive design**: Se ve bien en móvil y desktop
- [ ] **Loading estados**: Indicadores mientras carga fotos
- [ ] **Botón compra**: Proceder a checkout con fotos seleccionadas

**URL de prueba**: `/gallery/[eventId]` (reemplazar con ID real)

**✅ Validación**: Familias pueden ver fotos públicas del evento

---

### 👨‍👩‍👧‍👦 7. Portal Familia (Token Access)
- [ ] **Acceso con token**: URL `/f/[token]` funciona
- [ ] **Token válido**: Muestra galería del alumno específico
- [ ] **Token inválido**: Rechaza tokens incorrectos
- [ ] **Token expirado**: Rechaza tokens vencidos
- [ ] **Solo sus fotos**: Muestra únicamente fotos asignadas al alumno
- [ ] **Información alumno**: Muestra nombre, evento, escuela
- [ ] **URLs firmadas**: Fotos cargan con URLs temporales
- [ ] **Carrito funcional**: Agregar fotos al carrito

**URL de prueba**: `/f/[token]` (usar token real de sujeto)

**✅ Validación**: Familias acceden solo a fotos de su hijo/a

---

### 🛒 8. Proceso de Compra
- [ ] **Seleccionar fotos**: Checkboxes funcionan en galería
- [ ] **Ver carrito**: Resumen de fotos seleccionadas
- [ ] **Formulario datos**: Campos nombre, email, teléfono
- [ ] **Validar datos**: Campos requeridos y formato email
- [ ] **Precios correctos**: Muestra precio por foto y total
- [ ] **Generar preferencia**: Crea preferencia de Mercado Pago
- [ ] **Botón pagar**: Redirige a Mercado Pago correctamente

**✅ Validación**: Proceso de compra completo hasta MP

---

### 💳 9. Integración Mercado Pago
- [ ] **Sandbox funciona**: Usar credenciales de test
- [ ] **Preferencia válida**: MP acepta la preferencia creada
- [ ] **Datos correctos**: Descripción, monto, email
- [ ] **Pago exitoso**: Completar pago en MP sandbox
- [ ] **Webhook recibido**: Sistema recibe notificación de pago
- [ ] **Orden actualizada**: Estado cambia a 'approved'
- [ ] **Idempotencia**: Webhook duplicado no causa problemas

**Tarjetas de prueba MP**:
- Visa: `4509 9535 6623 3704`
- Mastercard: `5031 7557 3453 0604`

**✅ Validación**: Pagos se procesan correctamente

---

### 📋 10. Dashboard Admin - Órdenes
- [ ] **Lista órdenes**: Muestra todas las órdenes por evento
- [ ] **Estado visible**: pending, approved, delivered
- [ ] **Detalles orden**: Cliente, fotos, monto total
- [ ] **Cambiar estado**: Marcar como entregado
- [ ] **Filtrar órdenes**: Por evento o estado
- [ ] **Exportar CSV**: Descargar reporte de órdenes
- [ ] **Información completa**: Todos los datos necesarios

**URL de prueba**: `/admin/orders`

**✅ Validación**: Melisa puede gestionar pedidos eficientemente

---

## 🚀 Flujo Completo E2E
**Ejecutar esta secuencia completa para validar MVP**:

### Paso 1: Admin Setup (Melisa)
1. Login admin → `/admin`
2. Crear evento → `/admin/events/new`
3. Crear sujetos → `/admin/subjects` 
4. Subir fotos → `/admin/photos`
5. Asignar fotos → `/admin/tagging`

### Paso 2: Cliente Público
1. Acceder galería pública → `/gallery/[eventId]`
2. Seleccionar fotos
3. Completar checkout
4. Pagar en MP (sandbox)

### Paso 3: Cliente Familia  
1. Acceder con token → `/f/[token]`
2. Ver solo fotos del alumno
3. Seleccionar fotos
4. Completar checkout
5. Pagar en MP (sandbox)

### Paso 4: Admin Seguimiento
1. Ver órdenes → `/admin/orders`
2. Marcar como entregado
3. Exportar reporte

**✅ Validación**: Todo el flujo funciona sin errores

---

## ⚡ Performance Benchmarks

### Tiempos Críticos
- [ ] **API responses**: <200ms para endpoints principales
- [ ] **Gallery load**: <2s para cargar galería
- [ ] **Photo upload**: <5s por foto incluido watermark
- [ ] **Signed URLs**: <100ms para generar
- [ ] **Webhook MP**: <3s para procesar

### Métricas de Usuario
- [ ] **Mobile responsive**: Se ve bien en teléfonos
- [ ] **Desktop optimized**: Funciona bien en laptop/PC
- [ ] **Loading indicators**: Usuario ve feedback visual
- [ ] **Error messages**: Mensajes claros y útiles

**✅ Validación**: Performance aceptable para uso real

---

## 🔒 Security Checklist

### Autenticación & Autorización
- [ ] **Admin protected**: Solo admin accede a rutas admin
- [ ] **Token required**: Galería familia requiere token válido
- [ ] **Token expiration**: Tokens expirados son rechazados
- [ ] **No token leak**: Tokens no aparecen en logs

### Rate Limiting
- [ ] **Login attempts**: Máximo 5 intentos/minuto
- [ ] **Photo uploads**: Máximo 10/minuto
- [ ] **Signed URLs**: Máximo 60/minuto por token
- [ ] **Gallery access**: Máximo 30/minuto por token

### File Security  
- [ ] **Private bucket**: Fotos no son públicas
- [ ] **Signed URLs**: Acceso temporal con expiración
- [ ] **File validation**: Solo imágenes aceptadas
- [ ] **Size limits**: Máximo 10MB por archivo

**✅ Validación**: Sistema seguro para uso producción

---

## 🧪 Test Scripts

### Ejecutar Tests Automatizados
```bash
# Tests completos
npm run test

# Tests específicos
npm run test:e2e           # E2E workflows  
npm run test:integration   # API integration
npm run test:security      # Security validation

# Performance test
npm run performance:test
```

### Validar Base de Datos
```bash
# Verificar RLS activo
npm run db:status

# Verificar migraciones
npm run db:diff

# Limpiar datos de test
npm run db:reset  # ⚠️ Solo en desarrollo
```

---

## 🎯 Criterios de Éxito MVP

### ✅ MVP Listo cuando:
1. **Admin funcional**: Melisa puede crear eventos y subir fotos
2. **Tagging ágil**: Asignar fotos a alumnos eficientemente  
3. **Galería pública**: Familias ven fotos con watermark
4. **Portal familia**: Acceso seguro con tokens
5. **Compras funcionales**: Checkout + MP sandbox funciona
6. **Gestión órdenes**: Admin ve pedidos y puede entregarlos
7. **Performance aceptable**: Tiempos <2s para operaciones críticas
8. **Seguridad básica**: Rate limiting + tokens seguros

### ❌ Blockers Críticos
- Login admin no funciona
- Fotos no se suben o procesan
- Watermark no se aplica
- Tokens no funcionan 
- MP integration falla
- Órdenes no se crean
- Performance inaceptable (>10s)
- Vulnerabilidades graves

---

## 📝 Reporte Final

### Template de Validación
```
# MVP VALIDATION REPORT
Date: [FECHA]
Tester: [NOMBRE]

## Status Overview
- [ ] ✅ READY FOR PRODUCTION
- [ ] ⚠️  READY WITH MINOR ISSUES  
- [ ] ❌ NOT READY - CRITICAL ISSUES

## Test Results
- Admin Flow: [PASS/FAIL]
- Photo Upload: [PASS/FAIL]  
- Public Gallery: [PASS/FAIL]
- Family Portal: [PASS/FAIL]
- Checkout: [PASS/FAIL]
- MP Integration: [PASS/FAIL]
- Order Management: [PASS/FAIL]

## Critical Issues Found
[Lista de problemas que bloquean uso]

## Minor Issues Found  
[Lista de problemas menores]

## Performance Metrics
- Gallery Load: [X]ms
- Photo Upload: [X]ms
- API Response: [X]ms

## Recommendation
[READY/NOT READY] for Melisa to use with her clients.

## Next Steps
[Acciones requeridas antes de producción]
```

---

## 🚨 Emergency Contacts

Si encuentras problemas críticos:
1. Verificar logs: `npm run logs:tail`
2. Reset database: `npm run db:reset` (dev only)
3. Verificar servicios: `npm run db:status`
4. Performance check: `npm run perf:report`

**MVP Success = Melisa can use it TODAY for her photography business** 📸✨
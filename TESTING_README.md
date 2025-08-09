# 🧪 Testing Guide - Look Escolar MVP

## 📋 Suite de Testing Completa

Este proyecto incluye una suite completa de testing para validar que el MVP esté listo para producción:

### 🗂️ Estructura de Tests

```
__tests__/
├── e2e/
│   ├── complete-mvp-workflow.test.ts    # Flujo completo E2E
│   ├── admin-workflow.test.ts           # Workflow admin
│   └── family-workflow.test.ts          # Workflow familia
├── components/
│   └── ui-components.test.tsx           # Tests UI components
├── security/
│   └── security-comprehensive.test.ts   # Tests seguridad
├── performance/
│   └── performance-critical.test.ts     # Tests performance
├── integration/                         # Tests integración APIs
├── api-critical-endpoints.test.ts       # Tests APIs críticas
└── [otros tests específicos]
```

## 🚀 Ejecutar Tests

### Prerequisitos

1. **Base de datos local corriendo**:
   ```bash
   npm run dev:db
   ```

2. **Servidor de desarrollo** (para tests E2E):
   ```bash
   npm run dev
   ```

### Comandos de Testing

```bash
# 🎯 Tests MVP completos (recomendado)
npm run test:mvp

# ⚡ Tests MVP rápidos (críticos únicamente)
npm run test:mvp:quick

# 📊 Tests con coverage
npm run test:coverage

# 👀 Tests en modo watch
npm run test:watch

# 🔒 Solo tests de seguridad
npm run test:security

# 🎨 Solo tests de componentes UI
npm run test:components

# 🔗 Solo tests de integración
npm run test:integration

# 🏃‍♂️ Solo tests E2E
npm run test:e2e

# ⚡ Solo tests de performance
npm run performance:test
```

### Tests Específicos

```bash
# Test completo del flujo MVP
npm run test __tests__/e2e/complete-mvp-workflow.test.ts

# APIs críticas
npm run test __tests__/api-critical-endpoints.test.ts

# Seguridad completa
npm run test __tests__/security/security-comprehensive.test.ts

# Performance crítica
npm run test __tests__/performance/performance-critical.test.ts
```

## 🎯 Interpretando Resultados

### ✅ MVP Ready
```
📊 MVP Test Summary
================================
✅ MVP VALIDATION: PASSED
📈 Results:
   ✅ Passed: 12/12
   ❌ Failed: 0/12
   ⏭️  Skipped: 0/12

🚀 MVP IS READY FOR PRODUCTION USE
```

### ⚠️ MVP Con Issues Menores
```
⚠️  MVP VALIDATION: PASSED WITH ISSUES
📈 Results:
   ✅ Passed: 10/12
   ❌ Failed: 2/12
   
🔧 Melisa puede usar con precaución
```

### ❌ MVP Needs Work
```
❌ MVP VALIDATION: FAILED
📈 Results:
   ✅ Passed: 6/12
   ❌ Failed: 6/12
   
🚨 CRITICAL FAILURES:
   • E2E Complete Workflow
   • Critical API Endpoints
```

## 🔧 Troubleshooting Tests

### Tests Fallan por Conexión

```bash
# Verificar que DB esté corriendo
npm run db:status

# Verificar servidor dev
curl http://localhost:3000/api/admin/events
```

### Tests E2E Timeout

```bash
# Asegurar que el servidor esté respondiendo
npm run dev &  # En background
sleep 10       # Esperar que inicie
npm run test:e2e
```

### Limpiar Estado entre Tests

```bash
# Reset completo de DB (⚠️ Solo desarrollo)
npm run db:reset

# Limpiar storage
npm run storage:cleanup
```

### Variables de Entorno para Tests

Crear `.env.test.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
MP_WEBHOOK_SECRET=test-webhook-secret
SESSION_SECRET=test-session-secret-32-chars-min
```

## 📊 Coverage Reports

```bash
# Generar reporte de coverage
npm run test:coverage

# Ver reporte HTML
open coverage/index.html
```

**Coverage Targets**:
- APIs críticas: >80%
- UI Components: >70%
- Security: >90%
- E2E Workflows: >95%

## 🎯 Tests Críticos para MVP

### 1. E2E Complete Workflow
**Archivo**: `__tests__/e2e/complete-mvp-workflow.test.ts`

**Valida**: Flujo completo desde admin hasta pago
- Admin login → Evento → Sujetos → Fotos → Tagging
- Galería pública y familia
- Checkout → Pago MP → Orden procesada

### 2. Critical API Endpoints
**Archivo**: `__tests__/api-critical-endpoints.test.ts`

**Valida**: Todas las APIs necesarias funcionan
- Authentication, Events, Subjects, Photos
- Upload, Tagging, Gallery, Checkout
- Mercado Pago webhook, Orders

### 3. Security Comprehensive
**Archivo**: `__tests__/security/security-comprehensive.test.ts`

**Valida**: Seguridad básica está implementada
- Rate limiting, Token validation
- Input sanitization, File validation
- HMAC webhook verification

### 4. Performance Critical
**Archivo**: `__tests__/performance/performance-critical.test.ts`

**Valida**: Performance es aceptable
- API responses <200ms
- Gallery load <2s
- Photo processing <3s

## 📋 Testing Manual

Después de que los tests automáticos pasen, usar:
**`MVP_TESTING_CHECKLIST.md`**

Este checklist valida:
- ✅ Funcionalidad completa paso a paso
- ✅ UI/UX funciona correctamente
- ✅ Performance aceptable
- ✅ Seguridad básica

## 🚨 Antes de Producción

### Checklist Final

- [ ] `npm run test:mvp` → ✅ PASSED
- [ ] Manual testing checklist completo
- [ ] Performance aceptable (<2s galería)
- [ ] Security básica implementada
- [ ] Rate limiting activo
- [ ] MP sandbox funcionando
- [ ] Base de datos con RLS activo
- [ ] Storage bucket privado
- [ ] URLs firmadas con expiración

### Deploy Checklist

- [ ] Variables de entorno configuradas
- [ ] DB migrations aplicadas
- [ ] Storage configurado
- [ ] Rate limiting configurado
- [ ] MP production keys
- [ ] Monitoring activo

## 📞 Soporte

### Comandos de Debug

```bash
# Ver logs en tiempo real
npm run logs:tail

# Verificar performance
npm run perf:report

# Check de seguridad
npm run security:check

# Estado de servicios
npm run db:status
```

### Issues Comunes

1. **Tests timeout**: Servidor no corriendo o muy lento
2. **DB connection fails**: Supabase local no iniciado
3. **Rate limiting**: Mucha concurrencia en tests
4. **MP integration fails**: Credenciales de sandbox incorrectas

### Metricas de Éxito

**MVP está listo cuando**:
- ✅ Tests automáticos: >90% pass rate
- ✅ Tests críticos: 100% pass rate
- ✅ Performance: <2s para operaciones críticas
- ✅ Manual testing: Checklist completo
- ✅ Melisa puede usar el sistema sin ayuda

**🎉 ¡MVP validado y listo para producción!**
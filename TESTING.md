# 🧪 Testing & Security - LookEscolar

Guía completa de testing y validación de seguridad para el sistema de fotografía escolar.

## 📋 Estructura de Tests

```
__tests__/
├── e2e/                    # Tests end-to-end (flujos completos)
│   ├── admin-workflow.test.ts    # Login → Eventos → Fotos → Tagging
│   └── family-workflow.test.ts   # Token → Galería → Carrito → Pago
├── integration/            # Tests de integración (APIs reales)
│   ├── admin-apis.test.ts        # Tests APIs admin con DB real
│   └── family-apis.test.ts       # Tests APIs family con DB real
├── security/              # Tests de seguridad específicos
│   └── security-validation.test.ts  # RLS, tokens, constraints
└── [existing unit tests]   # Tests unitarios existentes
```

## 🚀 Comandos de Testing

### Tests por Categoría
```bash
# Tests unitarios básicos
npm run test

# Tests de seguridad
npm run test:security

# Tests de integración con DB
npm run test:integration

# Tests end-to-end completos (cuando estén listos)
npm run test:e2e

# Todos los tests con coverage
npm run test:coverage
```

### Auditorías y Validación
```bash
# Auditoría completa de seguridad
npm run security:check

# Test de performance básico
npm run performance:test

# Validación de tipos TypeScript
npm run typecheck

# Linting de código
npm run lint
```

## 🔒 Tests de Seguridad

### 1. Row Level Security (RLS)
```typescript
// Verifica que usuarios anónimos no puedan acceder
it('should block anonymous access to events', async () => {
  const { data } = await anonSupabase.from('events').select().limit(1);
  expect(data).toEqual([]); // RLS debe bloquear
});
```

### 2. Seguridad de Tokens
```typescript
// Valida tokens seguros ≥20 caracteres
it('should enforce minimum token length', async () => {
  const { error } = await supabase.from('subjects').insert({
    token: 'short' // <20 chars
  });
  expect(error).toBeDefined(); // Debe fallar por constraint
});
```

### 3. Rate Limiting
```typescript
// Verifica que se bloqueen requests excesivos
it('should enforce rate limiting', async () => {
  const responses = await Promise.all(Array(50).fill(null)
    .map(() => fetch('/api/family/gallery/token')));
  
  const rateLimited = responses.filter(r => r.status === 429);
  expect(rateLimited.length).toBeGreaterThan(0);
});
```

## 🔧 Setup de Testing

### Variables de Entorno para Tests
```bash
# .env.test o .env.local
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MP_WEBHOOK_SECRET=test-webhook-secret
UPSTASH_REDIS_REST_URL=optional-redis-url
UPSTASH_REDIS_REST_TOKEN=optional-redis-token
```

### Supabase Local para Tests
```bash
# Iniciar Supabase local para testing
npm run dev:db

# En otra terminal, ejecutar tests
npm run test:integration
```

## 📊 Criterios de Calidad

### Cobertura Mínima
- **APIs Críticas**: 70% coverage
- **Servicios Core**: 80% coverage  
- **Funciones Utilidad**: 60% coverage

### Performance Targets
- **APIs**: <200ms tiempo promedio
- **Upload**: <3s procesamiento foto
- **Rate Limiting**: Debe activarse correctamente

### Seguridad Obligatoria
- ✅ RLS habilitado en todas las tablas
- ✅ Tokens ≥20 caracteres criptográficamente seguros
- ✅ Bucket privado con URLs firmadas
- ✅ Rate limiting en endpoints críticos
- ✅ Validación de entrada en todos los endpoints

## 🤖 GitHub Actions

### CI/CD Pipeline
```yaml
# .github/workflows/security-check.yml
name: Security Audit & Tests

on: [push, pull_request]

jobs:
  security-audit:     # Tests seguridad + auditoría
  dependency-check:   # npm audit vulnerabilidades  
  performance-check:  # Bundle size + performance
  code-quality:       # Coverage + lint + typecheck
```

### Checks Automáticos
- ✅ TypeScript compilation
- ✅ ESLint code quality
- ✅ Unit tests execution
- ✅ Security validation tests
- ✅ npm audit vulnerabilities
- ✅ Bundle size limits
- ✅ Coverage thresholds

## 🔍 Debugging Tests

### Tests Fallando
```bash
# Ejecutar test específico en modo watch
npm run test -- --watch auth.test.ts

# Ver output detallado de tests
npm run test -- --reporter=verbose

# Tests de integración con logs
DEBUG=1 npm run test:integration
```

### Problemas Comunes

**1. Supabase Connection Failed**
```bash
# Verificar que Supabase local esté corriendo
npm run db:status

# O usar instancia remota para tests
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

**2. Rate Limiting en Tests**
```bash
# Resetear rate limits si existe endpoint
curl -X POST http://localhost:3000/api/test/reset-rate-limit

# O esperar que expiren (1 minuto típicamente)
```

**3. Tests de RLS Fallan**
```bash
# Verificar que RLS esté habilitado
npm run security:check

# Revisar policies en Supabase dashboard
```

## 📈 Reportes y Métricas

### Security Check Report
```bash
npm run security:check
```
```
🔍 Iniciando auditoría de seguridad...

📊 Resultados de Auditoría de Seguridad

✅ EXITOSOS (8)
  • Variable de entorno: SUPABASE_SERVICE_ROLE_KEY: Variable configurada
  • Conexión Supabase: Conexión exitosa
  • RLS: events: Acceso anónimo bloqueado correctamente
  • Bucket photos-private: Bucket privado configurado correctamente

⚠️ ADVERTENCIAS (2)  
  • Rate Limiting - Redis: Variables Redis no configuradas (usando memoria)

📈 RESUMEN
  Checks totales: 10
  ✅ Exitosos: 8
  ⚠️  Advertencias: 2
  ❌ Fallidos: 0

✅ ESTADO: ACEPTABLE - Monitorear advertencias
```

### Performance Test Report
```bash
npm run performance:test
```
```
⚡ Iniciando tests de performance...

📊 Resultados de Performance

Endpoint                              | Promedio | Máximo  | Éxito | Estado
---------------------------------------------------------------------------
GET /api/family/gallery/fake_token... | 145ms    | 289ms   | 0%    | ✅ PASS
POST /api/storage/signed-url          | 167ms    | 245ms   | 0%    | ✅ PASS
Rate Limiting Test                    | 89ms     | 1234ms  | 100%  | ✅ PASS

🎉 ESTADO: PERFORMANCE ACEPTABLE
```

## ✅ Pre-Deployment Checklist

### Antes de cada Deploy
```bash
# 1. Todos los tests pasan
npm run test && npm run test:security && npm run test:integration

# 2. Auditoría de seguridad limpia
npm run security:check

# 3. Performance aceptable
npm run performance:test

# 4. Sin vulnerabilidades críticas
npm audit --audit-level=high

# 5. Código limpio
npm run lint && npm run typecheck
```

### Verificaciones Manuales
- [ ] Variables de entorno configuradas en producción
- [ ] Bucket Supabase confirmado como privado
- [ ] URLs firmadas funcionando en producción
- [ ] Rate limiting activo con Redis/Upstash
- [ ] Webhook MercadoPago con HMAC válido
- [ ] RLS policies aplicadas y funcionando
- [ ] Logs sin información sensible expuesta

## 🚨 Red Flags - Nunca Deployar Si...

### Críticos (Bloquean Deploy)
- ❌ Tests de seguridad fallan
- ❌ RLS no está funcionando  
- ❌ Bucket público en lugar de privado
- ❌ Tokens <20 caracteres o no seguros
- ❌ Variables críticas sin configurar
- ❌ Vulnerabilidades críticas en dependencias

### Advertencias (Evaluar Riesgo)
- ⚠️ Rate limiting sin Redis (solo memoria)
- ⚠️ Coverage <70% en endpoints críticos
- ⚠️ Performance >200ms promedio
- ⚠️ TODO/FIXME >20 comentarios
- ⚠️ Bundle size >5MB

## 💡 Tips de Testing

### 1. Mock vs Real Data
- **Unit Tests**: Mock servicios externos
- **Integration Tests**: DB real (Supabase local)
- **E2E Tests**: Ambiente completo

### 2. Datos de Test
- Usar prefijos únicos: `test_token_123...`
- Cleanup automático en `beforeAll`/`afterAll`
- IDs predecibles para debugging

### 3. Async Testing
```typescript
// ✅ Correcto
await expect(asyncFunction()).resolves.toBe(expected);

// ❌ Incorrecto  
expect(asyncFunction()).toBe(expected);
```

### 4. Error Testing
```typescript
// Verificar tipos específicos de error
expect(error.code).toBe('23505'); // Unique constraint
expect(response.status).toBe(401); // Unauthorized
```

---

**📚 Para más información**: Ver `security-audit.md` y documentación en `/docs`
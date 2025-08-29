# 🔐 ROTACIÓN DE CREDENCIALES URGENTE

## Contexto
Durante la implementación del sistema de tokens jerárquicos, se expusieron credenciales en los logs del sistema. Es **URGENTE** rotar estas credenciales antes del despliegue.

## Credenciales a Rotar

### 1. Database Password
- **Ubicación**: Dashboard de Supabase > Settings > Database
- **Acción**: Generar nueva contraseña segura
- **Impacto**: Reconectar todas las aplicaciones

### 2. Service Role Key  
- **Ubicación**: Dashboard de Supabase > Settings > API
- **Acción**: Regenerar Service Role Key
- **Impacto**: Actualizar variable `SUPABASE_SERVICE_ROLE_KEY` en toda la infraestructura

### 3. Variables de Entorno Afectadas
```bash
# Actualizar en todos los entornos
SUPABASE_SERVICE_ROLE_KEY=<new_service_role_key>
DATABASE_URL=<new_connection_string_with_new_password>

# Entornos a actualizar:
# - Desarrollo local (.env.local)
# - Staging (Vercel/Netlify/etc)
# - Producción (Vercel/Netlify/etc)
# - CI/CD (GitHub Actions secrets)
```

## Proceso de Rotación

### Paso 1: Generar Nuevas Credenciales
1. Ir a Supabase Dashboard
2. Navegar a Settings > Database
3. Cambiar password de `postgres` user
4. Navegar a Settings > API
5. Regenerar Service Role Key
6. Guardar ambos valores de forma segura

### Paso 2: Actualizar Variables de Entorno
```bash
# Local
cp .env.local .env.local.backup
# Actualizar SUPABASE_SERVICE_ROLE_KEY en .env.local

# Staging/Production
# Actualizar variables en dashboard del hosting provider
```

### Paso 3: Validar Conectividad
```bash
# Test local
npm run db:migrate

# Test APIs
curl -H "Authorization: Bearer <new_service_role_key>" \
     "<supabase_url>/rest/v1/events?select=id&limit=1"
```

### Paso 4: Limpiar Logs
- Revisar logs del sistema para otras exposiciones
- Configurar log scrubbing para prevenir futuras exposiciones
- Implementar secrets detection en CI/CD

## Checklist de Validación

- [ ] Nueva contraseña de DB generada
- [ ] Nuevo Service Role Key generado  
- [ ] Variables actualizadas en desarrollo
- [ ] Variables actualizadas en staging
- [ ] Variables actualizadas en producción
- [ ] CI/CD secrets actualizados
- [ ] Conectividad validada
- [ ] Logs limpiados
- [ ] Secrets detection implementado

## Notas de Seguridad

⚠️ **CRÍTICO**: No commits con credenciales nuevas en texto plano
⚠️ **URGENTE**: Completar rotación antes de cualquier deploy
⚠️ **IMPORTANTE**: Monitorear logs de acceso posterior a rotación

## Scripts de Ayuda

```bash
# Verificar conectividad post-rotación
npx tsx scripts/test-supabase-connection.ts

# Smoke test completo
npx tsx scripts/smoke-test-hierarchical-tokens.ts
```
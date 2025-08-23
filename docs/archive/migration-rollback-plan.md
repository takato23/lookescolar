# 🔄 Plan de Rollback: Migración de Galería Unificada

## 🚨 Situaciones que Requieren Rollback

### **Criterios de Rollback Automático**
- Error rate > 5% en APIs de galería
- Tiempo de carga > 5 segundos promedio
- Pérdida de datos de carrito/favoritos
- Fallos en autenticación familiar
- Errores de JavaScript > 10% de sesiones

### **Criterios de Rollback Manual**
- Reportes de usuarios sobre funcionalidad perdida
- Problemas de performance en dispositivos móviles
- Incompatibilidades con navegadores específicos
- Problemas de SEO o indexación

## 🎯 Niveles de Rollback

### **Nivel 1: Rollback de Feature Flags (Inmediato - 30 segundos)**
```bash
# Desactivar unificación vía environment variables
export FF_UNIFIED_GALLERY_ENABLED=false
export FF_FAMILY_IN_GALLERY_ROUTE=false
export FF_TOKEN_AUTO_DETECTION=false

# O mediante dashboard de administración
curl -X POST /api/admin/feature-flags \
  -H "Content-Type: application/json" \
  -d '{"UNIFIED_GALLERY_ENABLED": false}'
```

**Resultado**: Sistemas vuelven inmediatamente a componentes legacy sin cambios de código.

### **Nivel 2: Rollback de Routing (2-5 minutos)**
```bash
# Cambiar routing en Next.js
git checkout feature/gallery-unification-migration
git revert HEAD~1  # Revertir cambios de routing

# O usar feature flag
export FF_LEGACY_FALLBACK_ENABLED=true

# Restart aplicación
pm2 restart lookescolar
```

**Resultado**: URLs vuelven a comportamiento original, redirecciones automáticas a rutas legacy.

### **Nivel 3: Rollback de Código (10-15 minutos)**
```bash
# Rollback completo de rama
git checkout main
git reset --hard HEAD~10  # O commit específico antes de migración

# Rebuild y deploy
npm run build
npm run deploy:production

# Verificar estado
npm run test:e2e
npm run test:integration
```

**Resultado**: Código completamente revertido a estado anterior a migración.

### **Nivel 4: Rollback de Base de Datos (20-30 minutos)**
```bash
# Solo si se modificaron schemas
npm run db:rollback
supabase db reset --db-url $DATABASE_URL

# Restaurar desde backup
pg_restore --verbose --clean --no-acl --no-owner \
  -h $DB_HOST -U $DB_USER -d $DB_NAME \
  backup_pre_migration.dump
```

**Resultado**: Base de datos restaurada a estado pre-migración.

## 🔧 Scripts de Rollback Automatizados

### **Rollback Rápido (Feature Flags)**
```bash
#!/bin/bash
# scripts/rollback-quick.sh

echo "🔄 Iniciando rollback rápido..."

# Desactivar todas las features de migración
curl -X POST "$ADMIN_API/feature-flags/bulk-update" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "UNIFIED_GALLERY_ENABLED": false,
    "FAMILY_IN_GALLERY_ROUTE": false,
    "TOKEN_AUTO_DETECTION": false,
    "HYBRID_RENDERING": false
  }'

echo "✅ Feature flags desactivadas"

# Verificar que las páginas funcionen
curl -f "$SITE_URL/gallery/test-event-id" || echo "❌ Error en galería pública"
curl -f "$SITE_URL/f/test-token" || echo "❌ Error en galería familiar"

echo "🔄 Rollback rápido completado"
```

### **Rollback Completo**
```bash
#!/bin/bash
# scripts/rollback-complete.sh

echo "🔄 Iniciando rollback completo..."

# 1. Backup de estado actual
git branch "backup-before-rollback-$(date +%Y%m%d-%H%M%S)"
git add . && git commit -m "Backup before rollback"

# 2. Revertir a commit específico
SAFE_COMMIT="commit-hash-before-migration"
git reset --hard $SAFE_COMMIT

# 3. Reconstruir aplicación
npm ci
npm run build

# 4. Ejecutar tests críticos
npm run test:critical
if [ $? -ne 0 ]; then
  echo "❌ Tests fallaron después del rollback"
  exit 1
fi

# 5. Deploy
npm run deploy:production

# 6. Verificación post-rollback
sleep 30
npm run test:e2e:critical
npm run health-check

echo "✅ Rollback completo exitoso"
```

### **Rollback de Base de Datos**
```bash
#!/bin/bash
# scripts/rollback-database.sh

echo "🔄 Iniciando rollback de base de datos..."

# 1. Backup de estado actual
pg_dump "$DATABASE_URL" > "backup_rollback_$(date +%Y%m%d-%H%M%S).sql"

# 2. Restaurar desde backup pre-migración
if [ -f "backup_pre_migration.sql" ]; then
  psql "$DATABASE_URL" < backup_pre_migration.sql
  echo "✅ Base de datos restaurada"
else
  echo "❌ No se encontró backup pre-migración"
  exit 1
fi

# 3. Verificar integridad
npm run db:verify
npm run test:database

echo "✅ Rollback de BD completado"
```

## 📊 Monitoreo Durante Rollback

### **Métricas Críticas a Monitorear**
```bash
# Health checks automatizados
#!/bin/bash
# scripts/monitor-rollback.sh

while true; do
  # API Response times
  PUBLIC_TIME=$(curl -w "%{time_total}" -s -o /dev/null "$SITE_URL/api/gallery/test-event")
  FAMILY_TIME=$(curl -w "%{time_total}" -s -o /dev/null "$SITE_URL/api/family/gallery/test-token")
  
  # Error rates
  ERROR_RATE=$(grep "ERROR" /var/log/app.log | wc -l)
  
  # User sessions
  ACTIVE_SESSIONS=$(redis-cli get "active_sessions" || echo "0")
  
  echo "$(date): Public=${PUBLIC_TIME}s, Family=${FAMILY_TIME}s, Errors=${ERROR_RATE}, Sessions=${ACTIVE_SESSIONS}"
  
  # Alertar si hay problemas
  if (( $(echo "$PUBLIC_TIME > 5.0" | bc -l) )) || (( $(echo "$FAMILY_TIME > 5.0" | bc -l) )); then
    echo "🚨 ALERTA: Tiempos de respuesta elevados"
    # Enviar notificación
    curl -X POST "$SLACK_WEBHOOK" -d '{"text":"🚨 Tiempos de respuesta elevados durante rollback"}'
  fi
  
  sleep 30
done
```

## ✅ Checklist de Validación Post-Rollback

### **Funcionalidad Core**
- [ ] Galería pública `/gallery/[eventId]` funciona
- [ ] Galería familiar `/f/[token]` funciona  
- [ ] Carrito público funciona
- [ ] Selección familiar funciona
- [ ] Proceso de checkout funciona
- [ ] Autenticación admin funciona

### **Performance**
- [ ] Tiempo de carga < 3 segundos
- [ ] No hay memory leaks
- [ ] CPU usage normal
- [ ] No errores JavaScript

### **Data Integrity**
- [ ] Carrito persiste entre sesiones
- [ ] Favoritos se mantienen
- [ ] Tokens familiares válidos
- [ ] URLs firmadas funcionan
- [ ] Órdenes existentes intactas

### **SEO y Accesibilidad**
- [ ] Meta tags correctos
- [ ] OpenGraph funciona
- [ ] Crawlers pueden acceder
- [ ] ARIA labels presentes
- [ ] Contraste adecuado

## 🚨 Procedimiento de Emergencia

### **Si Todo Falla (Último Recurso)**
```bash
#!/bin/bash
# scripts/emergency-rollback.sh

echo "🚨 EMERGENCIA: Rollback total inmediato"

# 1. Activar página de mantenimiento
cp maintenance.html index.html

# 2. Parar servicios
pm2 stop all

# 3. Restaurar desde backup completo del servidor
rsync -av /backups/pre-migration/ /var/www/lookescolar/

# 4. Restaurar base de datos
psql "$DATABASE_URL" < /backups/database_pre_migration.sql

# 5. Reiniciar servicios
pm2 start ecosystem.config.js

# 6. Quitar mantenimiento
rm index.html

echo "🆘 Emergencia resuelta - Sistema restaurado"
```

## 📞 Contactos de Emergencia

- **Desarrollador Principal**: [Tu contacto]
- **DevOps**: [Contacto DevOps]
- **Cliente**: [Contacto cliente]
- **Slack Channel**: #emergencias-lookescolar

## 📈 Lecciones Aprendidas

### **Para Próximas Migraciones**
- Siempre tener feature flags granulares
- Backups automáticos antes de cada fase
- Tests de regresión exhaustivos
- Monitoreo en tiempo real
- Plan de comunicación con usuarios
- Rollback ensayado en staging

### **Mejoras al Proceso**
- Automatizar más pasos del rollback
- Crear dashboard de monitoreo dedicado
- Implementar canary deployments
- Tener entorno de staging idéntico a producción
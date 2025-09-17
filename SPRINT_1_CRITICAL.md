# 🔴 SPRINT 1: FIXES CRÍTICOS (48 HORAS)

> **Prioridad:** CRÍTICA - Sistema en riesgo de falla total
> **Tiempo:** 48 horas máximo
> **Branch:** `fix/sprint-1-critical`

## TICKET 1.1: Consolidación de Migraciones DB

### Problema
78+ archivos de migración conflictivos causando caos en deployments.

### Solución
```bash
# 1. Backup completo ANTES de empezar
npx supabase db dump > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Crear migración consolidada
cat supabase/migrations/*.sql > temp_all_migrations.sql

# 3. Generar nueva migración limpia
```

**Crear archivo:** `supabase/migrations/20250117_consolidated_schema.sql`
```sql
-- CONSOLIDATED SCHEMA V1.0
-- Generated: 2025-01-17
-- Previous migrations: 78 files consolidated

BEGIN;

-- Drop all existing tables safely
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS photo_students CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS family_tokens CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS egress_metrics CASCADE;

-- Create schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  school_name TEXT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Continue with all tables in dependency order...
-- [Incluir schema completo aquí]

-- Insert version record
INSERT INTO schema_version (version, description)
VALUES (1, 'Initial consolidated schema from 78 migrations');

COMMIT;
```

### Validación
```bash
# Test en local
npx supabase db reset
npx supabase migration up
npm run db:types
npm run test:integration
```

---

## TICKET 1.2: Fix Webhooks Mercado Pago

### Problema
Pérdida silenciosa de pagos (5-10% transacciones).

### Solución Inmediata
**Archivo:** `app/api/payments/webhook/route.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Idempotency con Redis
async function handleWebhook(request: Request) {
  const body = await request.json();
  const webhookId = body.data?.id;

  if (!webhookId) {
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
  }

  // Check idempotency
  const processed = await redis.get(`webhook:${webhookId}`);
  if (processed) {
    console.log(`[Webhook] Already processed: ${webhookId}`);
    return NextResponse.json({ success: true, duplicate: true });
  }

  // Lock for 5 minutes to prevent duplicates
  await redis.setex(`webhook:${webhookId}`, 300, 'processing');

  try {
    // Process payment
    await processPayment(body);

    // Mark as completed (keep for 24h)
    await redis.setex(`webhook:${webhookId}`, 86400, 'completed');

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log to monitoring
    await redis.lpush('webhook:errors', JSON.stringify({
      webhookId,
      error: error.message,
      timestamp: new Date().toISOString(),
      body
    }));

    // Remove lock to allow retry
    await redis.del(`webhook:${webhookId}`);

    throw error;
  }
}

// Add retry mechanism
export async function POST(request: Request) {
  let retries = 3;
  let lastError;

  while (retries > 0) {
    try {
      return await handleWebhook(request);
    } catch (error) {
      lastError = error;
      retries--;

      if (retries > 0) {
        // Exponential backoff
        await new Promise(r => setTimeout(r, (4 - retries) * 1000));
      }
    }
  }

  // Final failure - log critically
  console.error('[CRITICAL] Webhook failed after retries:', lastError);

  return NextResponse.json(
    { error: 'Processing failed', retryLater: true },
    { status: 500 }
  );
}
```

### Monitoreo de Emergencia
```typescript
// app/api/admin/webhook-monitor/route.ts
export async function GET() {
  const errors = await redis.lrange('webhook:errors', 0, 100);
  const stats = {
    total_errors: errors.length,
    recent_errors: errors.slice(0, 10).map(e => JSON.parse(e)),
    last_check: new Date().toISOString()
  };

  return NextResponse.json(stats);
}
```

---

## TICKET 1.3: Token Expiration Management

### Problema
Tokens expiran durante compras, familias pierden acceso.

### Solución
**Archivo:** `lib/services/token.service.ts`

```typescript
export class TokenService {
  static readonly WARNING_DAYS = 7;
  static readonly EXPIRY_DAYS = 30;

  static async validateToken(token: string): Promise<{
    valid: boolean;
    expiresIn?: number;
    warning?: boolean;
    renewalToken?: string;
  }> {
    const { data: tokenData } = await supabase
      .from('family_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (!tokenData) {
      return { valid: false };
    }

    const expiryDate = new Date(tokenData.expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 0) {
      return { valid: false };
    }

    // Generate renewal token if expiring soon
    if (daysUntilExpiry <= this.WARNING_DAYS) {
      const renewalToken = await this.generateRenewalToken(tokenData);

      return {
        valid: true,
        expiresIn: daysUntilExpiry,
        warning: true,
        renewalToken
      };
    }

    return {
      valid: true,
      expiresIn: daysUntilExpiry,
      warning: false
    };
  }

  static async generateRenewalToken(oldToken: any): Promise<string> {
    // Create new token with same permissions
    const newToken = crypto.randomBytes(32).toString('hex');

    await supabase.from('family_tokens').insert({
      token: newToken,
      subject_id: oldToken.subject_id,
      student_id: oldToken.student_id,
      expires_at: new Date(Date.now() + this.EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      previous_token: oldToken.token
    });

    return newToken;
  }
}
```

**Component Warning:** `components/ui/token-expiry-banner.tsx`
```tsx
export function TokenExpiryBanner({ expiresIn, renewalToken }: Props) {
  if (!expiresIn || expiresIn > 7) return null;

  return (
    <Alert className="mb-4 border-orange-500 bg-orange-50">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Tu acceso expira en {expiresIn} días</AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          Guarda este nuevo enlace para mantener tu acceso:
        </p>
        <div className="flex gap-2">
          <Input
            value={`${window.location.origin}/f/${renewalToken}`}
            readOnly
          />
          <Button onClick={() => copyToClipboard(renewalToken)}>
            Copiar
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

---

## TICKET 1.4: Backup de Emergencia

### Problema
Sin estrategia de backup, dependencia 100% de Supabase.

### Script Inmediato
**Archivo:** `scripts/emergency-backup.sh`

```bash
#!/bin/bash
# Emergency Backup Script
# Run: ./scripts/emergency-backup.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$TIMESTAMP"

echo "🔴 EMERGENCY BACKUP STARTING..."

# Create backup directory
mkdir -p $BACKUP_DIR

# 1. Database backup
echo "📊 Backing up database..."
npx supabase db dump > "$BACKUP_DIR/database.sql"

# 2. Environment backup
echo "🔐 Backing up environment..."
cp .env.local "$BACKUP_DIR/.env.backup" 2>/dev/null || true

# 3. Storage metadata
echo "📦 Backing up storage metadata..."
npx supabase storage ls -json > "$BACKUP_DIR/storage_list.json"

# 4. Create restore script
cat > "$BACKUP_DIR/restore.sh" << 'EOF'
#!/bin/bash
echo "⚠️  RESTORE PROCESS - ARE YOU SURE? (y/n)"
read confirm
if [ "$confirm" != "y" ]; then exit 1; fi

echo "Restoring database..."
npx supabase db reset --db-url $DATABASE_URL < database.sql

echo "✅ Restore complete"
EOF

chmod +x "$BACKUP_DIR/restore.sh"

# 5. Compress
echo "📦 Compressing backup..."
tar -czf "backups/backup_$TIMESTAMP.tar.gz" -C "backups" "$TIMESTAMP"

# 6. Upload to external storage (optional)
# aws s3 cp "backups/backup_$TIMESTAMP.tar.gz" s3://your-backup-bucket/

echo "✅ BACKUP COMPLETE: backups/backup_$TIMESTAMP.tar.gz"
echo "⚠️  Store this file externally immediately!"
```

### GitHub Action para Backup Automático
**Archivo:** `.github/workflows/backup.yml`

```yaml
name: Daily Backup
on:
  schedule:
    - cron: '0 2 * * *' # 2 AM daily
  workflow_dispatch: # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Supabase CLI
        run: npm install -g supabase

      - name: Run backup
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_URL: ${{ secrets.DATABASE_URL }}
        run: |
          ./scripts/emergency-backup.sh

      - name: Upload to S3
        uses: jakejarvis/s3-sync-action@master
        with:
          args: --acl private
        env:
          AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          SOURCE_DIR: 'backups'
```

---

## ✅ CHECKLIST DE VALIDACIÓN SPRINT 1

- [ ] **Migraciones:**
  - [ ] Backup completo antes de empezar
  - [ ] Migración consolidada creada
  - [ ] Test en ambiente local exitoso
  - [ ] Types regenerados sin errores
  - [ ] Integration tests pasando

- [ ] **Webhooks:**
  - [ ] Redis configurado para idempotency
  - [ ] Retry logic implementado
  - [ ] Error logging activo
  - [ ] Monitor endpoint funcionando
  - [ ] Test con webhook real de MP

- [ ] **Tokens:**
  - [ ] Warning banner visible
  - [ ] Renewal token generation working
  - [ ] Copy functionality tested
  - [ ] Expiry check en cada request

- [ ] **Backup:**
  - [ ] Script ejecutable
  - [ ] Backup manual completado
  - [ ] GitHub Action configurado
  - [ ] Restore script probado

## 🚨 CRITERIOS DE ÉXITO

1. **Zero downtime** durante fixes
2. **100% webhooks procesados** sin pérdida
3. **Tokens con warning** 7 días antes
4. **Backup diario** automático

## ⏰ TIMELINE

| Hora | Tarea | Responsable | Status |
|------|-------|------------|---------|
| 0-4h | Backup inicial + Migraciones | DevOps | ⏳ |
| 4-8h | Fix webhooks MP | Backend | ⏳ |
| 8-12h | Token management | Backend | ⏳ |
| 12-24h | Testing completo | QA | ⏳ |
| 24-48h | Monitoreo + ajustes | Todos | ⏳ |

---

**SIGUIENTE:** Una vez completado Sprint 1, continuar con `SPRINT_2_PERFORMANCE.md`
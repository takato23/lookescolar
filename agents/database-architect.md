# Database Architect Agent

## 🎯 Propósito
Especialista en diseño y optimización de bases de datos PostgreSQL con Supabase, enfocado en seguridad con RLS, performance con índices, e integridad con constraints.

## 💪 Expertise

### Tecnologías Core
- PostgreSQL 15+
- Supabase (RLS, Functions, Triggers)
- SQL y PL/pgSQL
- Migraciones versionadas
- Query optimization
- Database indexing

### Especialidades
- Row Level Security (RLS)
- Database constraints
- Performance tuning
- Transaction management
- Backup strategies
- Data integrity

## 📋 Responsabilidades

### 1. Schema Design y Migraciones

```sql
-- supabase/migrations/001_initial_schema.sql

-- Enums para type safety
CREATE TYPE subject_type AS ENUM ('student', 'couple', 'family');
CREATE TYPE order_status AS ENUM ('pending', 'approved', 'delivered', 'failed');

-- Tabla principal de eventos
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 3),
  school TEXT NOT NULL,
  date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para listados frecuentes
CREATE INDEX idx_events_active ON events(active) WHERE active = true;
CREATE INDEX idx_events_date ON events(date DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### 2. Row Level Security (RLS)

```sql
-- supabase/migrations/003_rls_policies.sql

-- Habilitar RLS en TODAS las tablas
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Admin puede todo
CREATE POLICY "Admin full access on events"
  ON events
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Policy: Familias solo ven sus fotos
CREATE POLICY "Families view own photos"
  ON photos
  FOR SELECT
  TO anon  -- Token-based, no auth
  USING (
    EXISTS (
      SELECT 1 FROM subject_tokens st
      WHERE st.subject_id = photos.subject_id
      AND st.token = current_setting('app.current_token', true)
      AND st.expires_at > NOW()
    )
  );

-- Policy: Prevenir modificación de orders aprobadas
CREATE POLICY "Prevent approved order modification"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (status != 'approved')
  WITH CHECK (status != 'approved' OR OLD.status = NEW.status);
```

### 3. Funciones y Stored Procedures

```sql
-- supabase/migrations/004_functions.sql

-- Función para generar token seguro
CREATE OR REPLACE FUNCTION generate_secure_token(length INT DEFAULT 20)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para validar pedido único pendiente
CREATE OR REPLACE FUNCTION check_single_pending_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    IF EXISTS (
      SELECT 1 FROM orders 
      WHERE subject_id = NEW.subject_id 
      AND status = 'pending'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Ya existe un pedido pendiente para este sujeto';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_pending_order
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_single_pending_order();
```

### 4. Optimización de Queries

```sql
-- Índices para queries frecuentes
CREATE INDEX idx_photos_event_subject 
  ON photos(event_id, subject_id) 
  WHERE approved = true;

CREATE INDEX idx_orders_subject_status 
  ON orders(subject_id, status);

CREATE INDEX idx_subject_tokens_token_expires 
  ON subject_tokens(token, expires_at) 
  WHERE expires_at > NOW();

-- Índice parcial para tokens activos
CREATE INDEX idx_active_tokens 
  ON subject_tokens(token) 
  WHERE expires_at > NOW();

-- Índice para búsqueda de texto
CREATE INDEX idx_subjects_name_search 
  ON subjects USING gin(
    to_tsvector('spanish', first_name || ' ' || COALESCE(last_name, ''))
  );

-- Vista materializada para estadísticas
CREATE MATERIALIZED VIEW event_stats AS
SELECT 
  e.id as event_id,
  e.name as event_name,
  COUNT(DISTINCT s.id) as subject_count,
  COUNT(DISTINCT p.id) as photo_count,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'approved') as approved_orders,
  SUM(oi.quantity * pli.price_cents) / 100.0 as total_revenue
FROM events e
LEFT JOIN subjects s ON s.event_id = e.id
LEFT JOIN photos p ON p.event_id = e.id
LEFT JOIN orders o ON o.subject_id = s.id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN price_list_items pli ON pli.id = oi.price_list_item_id
GROUP BY e.id, e.name;

CREATE UNIQUE INDEX ON event_stats(event_id);
```

### 5. Métricas y Monitoreo

```sql
-- Tabla para tracking de egress
CREATE TABLE egress_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  bytes_served BIGINT DEFAULT 0 CHECK (bytes_served >= 0),
  requests_count INTEGER DEFAULT 0 CHECK (requests_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, date)
);

-- Función para actualizar métricas
CREATE OR REPLACE FUNCTION update_egress_metrics(
  p_event_id UUID,
  p_bytes BIGINT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO egress_metrics (event_id, date, bytes_served, requests_count)
  VALUES (p_event_id, CURRENT_DATE, p_bytes, 1)
  ON CONFLICT (event_id, date)
  DO UPDATE SET
    bytes_served = egress_metrics.bytes_served + p_bytes,
    requests_count = egress_metrics.requests_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Vista para alertas
CREATE VIEW egress_alerts AS
SELECT 
  event_id,
  SUM(bytes_served) as total_bytes,
  CASE 
    WHEN SUM(bytes_served) > 5 * 1024^3 THEN 'EXCEEDED'
    WHEN SUM(bytes_served) > 4 * 1024^3 THEN 'WARNING'
    ELSE 'OK'
  END as status
FROM egress_metrics
WHERE date >= date_trunc('month', CURRENT_DATE)
GROUP BY event_id;
```

### 6. Backup y Recovery

```sql
-- Política de retención
CREATE OR REPLACE FUNCTION cleanup_old_previews()
RETURNS VOID AS $$
BEGIN
  -- Marcar fotos viejas para limpieza
  UPDATE photos
  SET marked_for_deletion = true
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND event_id IN (
    SELECT id FROM events WHERE active = false
  );
  
  -- Log de limpieza
  INSERT INTO cleanup_logs (cleaned_at, photos_count)
  SELECT NOW(), COUNT(*)
  FROM photos
  WHERE marked_for_deletion = true;
END;
$$ LANGUAGE plpgsql;

-- Scheduled con pg_cron
SELECT cron.schedule(
  'cleanup-old-previews',
  '0 2 * * *', -- 2 AM diariamente
  'SELECT cleanup_old_previews();'
);
```

## 🛠️ Herramientas y Scripts

```bash
# Generar tipos TypeScript desde DB
npm run db:types

# Aplicar migraciones
npm run db:migrate

# Reset para desarrollo
npm run db:reset

# Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup.sql
```

## ✅ Checklist de Desarrollo

### Schema Design
- [ ] Constraints CHECK en todos los campos críticos
- [ ] Índices para queries frecuentes
- [ ] Unique constraints donde corresponde
- [ ] Foreign keys con ON DELETE apropiado
- [ ] Defaults sensatos
- [ ] Triggers para updated_at

### Security
- [ ] RLS habilitado en TODAS las tablas
- [ ] Policies testeadas
- [ ] Functions con SECURITY DEFINER donde necesario
- [ ] No exponer datos sensibles
- [ ] Validación en DB nivel

### Performance
- [ ] EXPLAIN ANALYZE en queries críticas
- [ ] Índices parciales donde aplique
- [ ] VACUUM y ANALYZE regular
- [ ] Materialized views para reportes
- [ ] Connection pooling configurado

## 🎯 Mejores Prácticas

1. **RLS siempre activo** - Sin excepciones
2. **Índices selectivos** - No sobre-indexar
3. **Transacciones cortas** - Evitar locks largos
4. **Constraints en DB** - No solo en app
5. **Migraciones reversibles** - Con DOWN scripts
6. **Monitoreo activo** - pg_stat_statements

## 🚫 Antipatrones a Evitar

- ❌ SELECT * sin límite
- ❌ N+1 queries
- ❌ Índices en columnas con baja cardinalidad
- ❌ RLS deshabilitado "temporalmente"
- ❌ Lógica de negocio compleja en triggers
- ❌ UUID como string en vez de tipo UUID
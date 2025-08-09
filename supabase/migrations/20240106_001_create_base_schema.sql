-- Migración inicial para el sistema de fotografía escolar
-- Crear las tablas principales con RLS habilitado

-- Habilitar RLS por defecto
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 1. Tabla de eventos/sesiones fotográficas
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 3),
  description TEXT,
  date DATE NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  price_per_photo INTEGER DEFAULT 0 CHECK (price_per_photo >= 0), -- En centavos
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all events" ON events
  FOR ALL USING (auth.role() = 'authenticated');

-- Índices para events
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date DESC);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- 2. Tabla de sujetos (alumnos/familias)
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 2),
  email TEXT CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone TEXT,
  grade_section TEXT, -- ej: "5to A", "1er B"
  token TEXT UNIQUE NOT NULL CHECK (length(token) >= 20),
  token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint único por evento y nombre
  UNIQUE(event_id, name)
);

-- RLS para subjects
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all subjects" ON subjects
  FOR ALL USING (auth.role() = 'authenticated');

-- Permitir acceso de solo lectura por token
CREATE POLICY "Family access by token" ON subjects
  FOR SELECT USING (
    token = current_setting('request.jwt.claims.token', true) AND
    token_expires_at > NOW()
  );

-- Índices para subjects
CREATE INDEX IF NOT EXISTS idx_subjects_event_id ON subjects(event_id);
CREATE INDEX IF NOT EXISTS idx_subjects_token ON subjects(token);
CREATE INDEX IF NOT EXISTS idx_subjects_token_expires ON subjects(token_expires_at);

-- 3. Tabla de fotos
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL, -- Solo path, no URL completa
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  file_size INTEGER CHECK (file_size > 0),
  approved BOOLEAN DEFAULT false,
  is_original BOOLEAN DEFAULT false, -- false = preview con watermark
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para photos
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all photos" ON photos
  FOR ALL USING (auth.role() = 'authenticated');

-- Las familias pueden ver solo sus fotos asignadas
CREATE POLICY "Family can view assigned photos" ON photos
  FOR SELECT USING (
    subject_id IN (
      SELECT id FROM subjects 
      WHERE token = current_setting('request.jwt.claims.token', true)
        AND token_expires_at > NOW()
    ) AND approved = true
  );

-- Índices para photos
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_subject_id ON photos(subject_id);
CREATE INDEX IF NOT EXISTS idx_photos_approved ON photos(approved);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_storage_path ON photos(storage_path);

-- 4. Tabla de pedidos/órdenes
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL CHECK (length(customer_name) >= 2),
  customer_email TEXT NOT NULL CHECK (customer_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  customer_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'completed', 'cancelled')),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0), -- En centavos
  payment_id TEXT, -- ID de Mercado Pago
  payment_status TEXT,
  notes TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Solo un pedido activo por sujeto
  UNIQUE(subject_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- RLS para orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

-- Las familias pueden ver/crear sus pedidos
CREATE POLICY "Family can manage their orders" ON orders
  FOR ALL USING (
    subject_id IN (
      SELECT id FROM subjects 
      WHERE token = current_setting('request.jwt.claims.token', true)
        AND token_expires_at > NOW()
    )
  );

-- Índices para orders
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_subject_id ON orders(subject_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 5. Tabla de items del pedido
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE RESTRICT,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0), -- En centavos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un item por foto por pedido
  UNIQUE(order_id, photo_id)
);

-- RLS para order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all order items" ON order_items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Family can manage items in their orders" ON order_items
  FOR ALL USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN subjects s ON o.subject_id = s.id
      WHERE s.token = current_setting('request.jwt.claims.token', true)
        AND s.token_expires_at > NOW()
    )
  );

-- Índices para order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_photo_id ON order_items(photo_id);

-- 6. Tabla para métricas de egress (según CLAUDE.md)
CREATE TABLE IF NOT EXISTS egress_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  bytes_served BIGINT DEFAULT 0,
  requests_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Una métrica por evento por día
  UNIQUE(event_id, date)
);

-- RLS para egress_metrics
ALTER TABLE egress_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view egress metrics" ON egress_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

-- Índices para egress_metrics
CREATE INDEX IF NOT EXISTS idx_egress_metrics_event_id ON egress_metrics(event_id);
CREATE INDEX IF NOT EXISTS idx_egress_metrics_date ON egress_metrics(date DESC);

-- Funciones auxiliares
-- 1. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_egress_metrics_updated_at BEFORE UPDATE ON egress_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Función para generar tokens seguros
CREATE OR REPLACE FUNCTION generate_secure_token()
RETURNS TEXT AS $$
BEGIN
  -- Genera un token de 24 caracteres usando caracteres seguros
  RETURN encode(gen_random_bytes(18), 'base64')
    -- Reemplazar caracteres problemáticos
    || substr(md5(random()::text), 1, 6);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Vista para estadísticas de eventos
CREATE OR REPLACE VIEW event_stats AS
SELECT 
  e.id,
  e.name,
  e.date,
  e.status,
  COUNT(DISTINCT s.id) as total_subjects,
  COUNT(DISTINCT p.id) as total_photos,
  COUNT(DISTINCT CASE WHEN p.subject_id IS NOT NULL THEN p.id END) as assigned_photos,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.total_amount) as total_revenue
FROM events e
LEFT JOIN subjects s ON e.id = s.event_id
LEFT JOIN photos p ON e.id = p.event_id
LEFT JOIN orders o ON e.id = o.event_id AND o.status = 'paid'
GROUP BY e.id, e.name, e.date, e.status;

-- RLS para la vista
ALTER VIEW event_stats OWNER TO postgres;
GRANT SELECT ON event_stats TO authenticated;

-- Datos de prueba (opcional - comentar en producción)
-- INSERT INTO auth.users (id, email) VALUES 
--   ('11111111-1111-1111-1111-111111111111', 'admin@lookescolar.com')
-- ON CONFLICT (id) DO NOTHING;
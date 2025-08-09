-- SETUP COMPLETO DE BASE DE DATOS - LOOKESCOLAR
-- Copia y pega TODO este script en el SQL Editor de Supabase

-- 1. TABLA DE EVENTOS
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 3),
  description TEXT,
  date DATE NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  price_per_photo INTEGER DEFAULT 0 CHECK (price_per_photo >= 0),
  created_by UUID, -- Sin referencia FK por ahora
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all events" ON events
  FOR ALL USING (auth.role() = 'authenticated');

-- 2. TABLA DE SUJETOS (ALUMNOS/FAMILIAS)  
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 2),
  email TEXT CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone TEXT,
  grade_section TEXT,
  token TEXT UNIQUE NOT NULL CHECK (length(token) >= 20),
  token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, name)
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all subjects" ON subjects
  FOR ALL USING (auth.role() = 'authenticated');

-- 3. TABLA DE FOTOS
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  file_size INTEGER CHECK (file_size > 0),
  approved BOOLEAN DEFAULT false,
  is_original BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all photos" ON photos
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. TABLA DE PEDIDOS
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL CHECK (length(customer_name) >= 2),
  customer_email TEXT NOT NULL CHECK (customer_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  customer_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'completed', 'cancelled')),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  payment_id TEXT,
  payment_status TEXT,
  notes TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

-- 5. TABLA DE ITEMS DE PEDIDOS
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE RESTRICT,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, photo_id)
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all order items" ON order_items
  FOR ALL USING (auth.role() = 'authenticated');

-- 6. TABLA DE MÉTRICAS DE EGRESS
CREATE TABLE IF NOT EXISTS egress_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  bytes_served BIGINT DEFAULT 0,
  requests_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, date)
);

ALTER TABLE egress_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view egress metrics" ON egress_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date DESC);
CREATE INDEX IF NOT EXISTS idx_subjects_event_id ON subjects(event_id);
CREATE INDEX IF NOT EXISTS idx_subjects_token ON subjects(token);
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_subject_id ON photos(subject_id);
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_subject_id ON orders(subject_id);

-- FUNCIÓN PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- TRIGGERS PARA updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
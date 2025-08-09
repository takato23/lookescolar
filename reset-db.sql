-- RESET COMPLETO DE BASE DE DATOS
-- Ejecuta ESTE script en el SQL Editor de Supabase para empezar desde cero

-- 1. ELIMINAR TABLAS EXISTENTES (en orden correcto por dependencias)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS egress_metrics CASCADE;

-- 2. ELIMINAR FUNCIONES Y TRIGGERS
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 3. CREAR TABLAS DESDE CERO

-- TABLA DE EVENTOS
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  price_per_photo INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA DE SUJETOS (ALUMNOS/FAMILIAS)
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  grade_section TEXT,
  token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA DE FOTOS
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 800,
  height INTEGER NOT NULL DEFAULT 600,
  file_size INTEGER DEFAULT 0,
  approved BOOLEAN DEFAULT false,
  is_original BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA DE PEDIDOS
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'completed', 'cancelled')),
  total_amount INTEGER NOT NULL DEFAULT 0,
  payment_id TEXT,
  payment_status TEXT,
  notes TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA DE ITEMS DE PEDIDOS
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE RESTRICT,
  quantity INTEGER DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES PARA MEJOR PERFORMANCE
CREATE INDEX idx_events_date ON events(date DESC);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_subjects_event_id ON subjects(event_id);
CREATE INDEX idx_subjects_token ON subjects(token);
CREATE UNIQUE INDEX idx_subjects_token_unique ON subjects(token);
CREATE INDEX idx_photos_event_id ON photos(event_id);
CREATE INDEX idx_photos_subject_id ON photos(subject_id);
CREATE INDEX idx_photos_approved ON photos(approved);
CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_subject_id ON orders(subject_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_photo_id ON order_items(photo_id);

-- FUNCIÓN PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- APLICAR TRIGGERS A TODAS LAS TABLAS CON updated_at
CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at 
  BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at 
  BEFORE UPDATE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- INSERTAR DATOS DE PRUEBA
INSERT INTO events (name, description, date, location) VALUES 
  ('Evento de Prueba', 'Primer evento para probar el sistema', CURRENT_DATE, 'Colegio San José');

-- Obtener el ID del evento creado para crear un sujeto de prueba
DO $$
DECLARE
    evento_id UUID;
BEGIN
    SELECT id INTO evento_id FROM events WHERE name = 'Evento de Prueba' LIMIT 1;
    
    IF evento_id IS NOT NULL THEN
        INSERT INTO subjects (event_id, name, email, token) VALUES 
          (evento_id, 'Juan Pérez', 'juan@example.com', 'test_token_123456789012345678901234567890');
    END IF;
END $$;
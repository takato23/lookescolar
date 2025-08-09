-- ============================================
-- SCRIPT COMPLETO DE CONFIGURACIÓN DE BASE DE DATOS
-- Ejecutar TODO en Supabase SQL Editor
-- ============================================

-- Limpiar tablas existentes (si las hay)
DROP TABLE IF EXISTS photo_subjects CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS egress_metrics CASCADE;

-- ============================================
-- 1. TABLA: admin_users
-- ============================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. TABLA: events
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    price_per_photo INTEGER DEFAULT 0,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

-- ============================================
-- 3. TABLA: subjects
-- ============================================
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    grade TEXT,
    section TEXT,
    grade_section TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN grade IS NOT NULL AND section IS NOT NULL THEN grade || '-' || section
            ELSE NULL
        END
    ) STORED,
    access_token TEXT UNIQUE NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    qr_code TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT subjects_token_length CHECK (length(access_token) >= 20),
    CONSTRAINT subjects_name_check CHECK (length(name) >= 2)
);

CREATE INDEX idx_subjects_event_id ON subjects(event_id);
CREATE INDEX idx_subjects_access_token ON subjects(access_token);
CREATE INDEX idx_subjects_token_expires ON subjects(token_expires_at);
CREATE INDEX idx_subjects_grade_section ON subjects(grade_section);

-- ============================================
-- 4. TABLA: photos (con TODOS los campos necesarios)
-- ============================================
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    
    -- Nombres y paths de archivos
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    watermark_path TEXT,
    preview_path TEXT,
    
    -- Metadatos de la imagen
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    mime_type TEXT DEFAULT 'image/jpeg',
    
    -- Estado y procesamiento
    approved BOOLEAN DEFAULT false,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    
    -- Metadatos adicionales
    metadata JSONB DEFAULT '{}',
    hash TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT photos_filesize_check CHECK (file_size > 0 AND file_size < 52428800),
    CONSTRAINT photos_dimensions_check CHECK (width > 0 AND height > 0),
    CONSTRAINT photos_mime_check CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp'))
);

CREATE INDEX idx_photos_event_id ON photos(event_id);
CREATE INDEX idx_photos_subject_id ON photos(subject_id);
CREATE INDEX idx_photos_processing_status ON photos(processing_status);
CREATE INDEX idx_photos_approved ON photos(approved);
CREATE INDEX idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX idx_photos_hash ON photos(hash);

-- ============================================
-- 5. TABLA: photo_subjects (relación many-to-many)
-- ============================================
CREATE TABLE photo_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT photo_subjects_unique UNIQUE(photo_id, subject_id)
);

CREATE INDEX idx_photo_subjects_photo_id ON photo_subjects(photo_id);
CREATE INDEX idx_photo_subjects_subject_id ON photo_subjects(subject_id);

-- ============================================
-- 6. TABLA: orders
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    order_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delivered', 'cancelled')),
    total_amount INTEGER NOT NULL DEFAULT 0,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    payment_method TEXT CHECK (payment_method IN ('mercadopago', 'cash', 'transfer')),
    mp_payment_id TEXT UNIQUE,
    mp_preference_id TEXT,
    mp_status TEXT,
    payment_date TIMESTAMPTZ,
    delivery_date TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT orders_amount_check CHECK (total_amount >= 0)
);

CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_subject_id ON orders(subject_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_mp_payment_id ON orders(mp_payment_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ============================================
-- 7. TABLA: order_items
-- ============================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT order_items_price_check CHECK (unit_price >= 0),
    CONSTRAINT order_items_subtotal_check CHECK (subtotal = quantity * unit_price),
    CONSTRAINT order_items_unique_photo UNIQUE(order_id, photo_id)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_photo_id ON order_items(photo_id);

-- ============================================
-- 8. TABLA: egress_metrics
-- ============================================
CREATE TABLE egress_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    bytes_served BIGINT DEFAULT 0,
    requests_count INTEGER DEFAULT 0,
    unique_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT egress_unique_event_date UNIQUE(event_id, date),
    CONSTRAINT egress_bytes_check CHECK (bytes_served >= 0),
    CONSTRAINT egress_requests_check CHECK (requests_count >= 0)
);

CREATE INDEX idx_egress_event_id ON egress_metrics(event_id);
CREATE INDEX idx_egress_date ON egress_metrics(date DESC);

-- ============================================
-- FUNCIONES HELPER
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar order_number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
           LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE egress_metrics ENABLE ROW LEVEL SECURITY;

-- Policies para service role (acceso completo)
CREATE POLICY "Service role has full access to admin_users" ON admin_users
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to events" ON events
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to subjects" ON subjects
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to photos" ON photos
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to photo_subjects" ON photo_subjects
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to orders" ON orders
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to order_items" ON order_items
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to egress_metrics" ON egress_metrics
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- DATOS INICIALES (opcional)
-- ============================================

-- Insertar un admin de prueba
INSERT INTO admin_users (email, name, role) 
VALUES ('admin@lookescolar.com', 'Admin', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Este query debe retornar 8 tablas
SELECT COUNT(*) as total_tables FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'admin_users', 'events', 'subjects', 'photos', 
    'photo_subjects', 'orders', 'order_items', 'egress_metrics'
);
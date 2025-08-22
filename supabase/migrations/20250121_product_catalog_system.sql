-- ============================================
-- Photo Product Catalog System
-- Enhanced product management for physical photos and combos
-- ============================================

-- 1. Product Categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Lucide icon name
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Photo Products table (individual product definitions)
CREATE TABLE IF NOT EXISTS photo_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('print', 'digital', 'package', 'combo')),
    
    -- Physical specifications
    width_cm DECIMAL(5,2), -- width in centimeters
    height_cm DECIMAL(5,2), -- height in centimeters
    finish TEXT CHECK (finish IN ('matte', 'glossy', 'canvas', 'metallic', 'wood')),
    paper_quality TEXT CHECK (paper_quality IN ('standard', 'premium', 'professional')),
    
    -- Pricing
    base_price INTEGER NOT NULL DEFAULT 0, -- price in cents
    cost_price INTEGER DEFAULT 0, -- cost in cents for margin calculation
    
    -- Display and ordering
    image_url TEXT, -- mockup/preview image
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT photo_products_price_check CHECK (base_price >= 0),
    CONSTRAINT photo_products_size_check CHECK (
        (type = 'digital' AND width_cm IS NULL AND height_cm IS NULL) OR
        (type != 'digital' AND width_cm > 0 AND height_cm > 0)
    )
);

-- 3. Combo Packages table
CREATE TABLE IF NOT EXISTS combo_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Package configuration
    min_photos INTEGER NOT NULL DEFAULT 1, -- minimum photos required
    max_photos INTEGER, -- maximum photos allowed (NULL = unlimited)
    allows_duplicates BOOLEAN DEFAULT true, -- can select same photo multiple times
    
    -- Pricing strategy
    pricing_type TEXT NOT NULL DEFAULT 'fixed' CHECK (pricing_type IN ('fixed', 'per_photo', 'tiered')),
    base_price INTEGER NOT NULL DEFAULT 0, -- base package price in cents
    price_per_photo INTEGER DEFAULT 0, -- additional cost per photo in cents
    
    -- Display
    image_url TEXT,
    badge_text TEXT, -- e.g., "POPULAR", "BEST VALUE"
    badge_color TEXT DEFAULT 'blue',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT combo_packages_photos_check CHECK (
        min_photos > 0 AND (max_photos IS NULL OR max_photos >= min_photos)
    ),
    CONSTRAINT combo_packages_price_check CHECK (base_price >= 0)
);

-- 4. Combo Package Items (products included in combos)
CREATE TABLE IF NOT EXISTS combo_package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    combo_id UUID NOT NULL REFERENCES combo_packages(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES photo_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    is_required BOOLEAN DEFAULT true, -- must be included vs optional add-on
    additional_price INTEGER DEFAULT 0, -- extra cost if different from base product price
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT combo_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT combo_items_unique UNIQUE(combo_id, product_id)
);

-- 5. Event Product Pricing (per-event price overrides)
CREATE TABLE IF NOT EXISTS event_product_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    product_id UUID REFERENCES photo_products(id) ON DELETE CASCADE,
    combo_id UUID REFERENCES combo_packages(id) ON DELETE CASCADE,
    
    -- Override pricing
    override_price INTEGER NOT NULL, -- price in cents
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT event_pricing_product_or_combo CHECK (
        (product_id IS NOT NULL AND combo_id IS NULL) OR
        (product_id IS NULL AND combo_id IS NOT NULL)
    ),
    CONSTRAINT event_pricing_price_check CHECK (override_price >= 0),
    CONSTRAINT event_pricing_unique UNIQUE(event_id, product_id, combo_id)
);

-- 6. Enhanced Order Items table (replace existing with product details)
CREATE TABLE IF NOT EXISTS enhanced_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    
    -- Product specification
    product_id UUID REFERENCES photo_products(id) ON DELETE SET NULL,
    combo_id UUID REFERENCES combo_packages(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL, -- snapshot of product name
    product_specs JSONB DEFAULT '{}', -- snapshot of product specifications
    
    -- Pricing and quantity
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL, -- price in cents at time of order
    subtotal INTEGER NOT NULL, -- quantity * unit_price
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT enhanced_order_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT enhanced_order_items_price_check CHECK (unit_price >= 0),
    CONSTRAINT enhanced_order_items_subtotal_check CHECK (subtotal = quantity * unit_price)
);

-- ============================================
-- INDEXES
-- ============================================

-- Product Categories
CREATE INDEX idx_product_categories_active ON product_categories(is_active);
CREATE INDEX idx_product_categories_sort ON product_categories(sort_order);

-- Photo Products
CREATE INDEX idx_photo_products_category ON photo_products(category_id);
CREATE INDEX idx_photo_products_type ON photo_products(type);
CREATE INDEX idx_photo_products_active ON photo_products(is_active);
CREATE INDEX idx_photo_products_featured ON photo_products(is_featured);
CREATE INDEX idx_photo_products_sort ON photo_products(sort_order);

-- Combo Packages
CREATE INDEX idx_combo_packages_active ON combo_packages(is_active);
CREATE INDEX idx_combo_packages_featured ON combo_packages(is_featured);
CREATE INDEX idx_combo_packages_sort ON combo_packages(sort_order);

-- Event Pricing
CREATE INDEX idx_event_pricing_event ON event_product_pricing(event_id);
CREATE INDEX idx_event_pricing_product ON event_product_pricing(product_id);
CREATE INDEX idx_event_pricing_combo ON event_product_pricing(combo_id);
CREATE INDEX idx_event_pricing_active ON event_product_pricing(is_active);

-- Enhanced Order Items
CREATE INDEX idx_enhanced_order_items_order ON enhanced_order_items(order_id);
CREATE INDEX idx_enhanced_order_items_photo ON enhanced_order_items(photo_id);
CREATE INDEX idx_enhanced_order_items_product ON enhanced_order_items(product_id);
CREATE INDEX idx_enhanced_order_items_combo ON enhanced_order_items(combo_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get product price for an event (with fallback to base price)
CREATE OR REPLACE FUNCTION get_product_price(p_event_id UUID, p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
    override_price INTEGER;
    base_price INTEGER;
BEGIN
    -- Check for event-specific pricing
    SELECT override_price INTO override_price
    FROM event_product_pricing
    WHERE event_id = p_event_id AND product_id = p_product_id AND is_active = true;
    
    IF override_price IS NOT NULL THEN
        RETURN override_price;
    END IF;
    
    -- Fallback to base product price
    SELECT base_price INTO base_price
    FROM photo_products
    WHERE id = p_product_id AND is_active = true;
    
    RETURN COALESCE(base_price, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get combo price for an event
CREATE OR REPLACE FUNCTION get_combo_price(p_event_id UUID, p_combo_id UUID, p_photo_count INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
    override_price INTEGER;
    combo_record RECORD;
    calculated_price INTEGER;
BEGIN
    -- Check for event-specific pricing
    SELECT override_price INTO override_price
    FROM event_product_pricing
    WHERE event_id = p_event_id AND combo_id = p_combo_id AND is_active = true;
    
    IF override_price IS NOT NULL THEN
        RETURN override_price;
    END IF;
    
    -- Get combo pricing configuration
    SELECT pricing_type, base_price, price_per_photo INTO combo_record
    FROM combo_packages
    WHERE id = p_combo_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Calculate price based on pricing type
    CASE combo_record.pricing_type
        WHEN 'fixed' THEN
            calculated_price := combo_record.base_price;
        WHEN 'per_photo' THEN
            calculated_price := combo_record.base_price + (combo_record.price_per_photo * p_photo_count);
        WHEN 'tiered' THEN
            -- For tiered pricing, we'll use base_price as the base tier
            -- Additional tiers can be implemented in metadata
            calculated_price := combo_record.base_price;
        ELSE
            calculated_price := combo_record.base_price;
    END CASE;
    
    RETURN COALESCE(calculated_price, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Add updated_at triggers
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_products_updated_at BEFORE UPDATE ON photo_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_combo_packages_updated_at BEFORE UPDATE ON combo_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_product_pricing_updated_at BEFORE UPDATE ON event_product_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_product_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_order_items ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access)
CREATE POLICY "Service role has full access to product_categories" ON product_categories
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to photo_products" ON photo_products
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to combo_packages" ON combo_packages
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to combo_package_items" ON combo_package_items
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to event_product_pricing" ON event_product_pricing
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to enhanced_order_items" ON enhanced_order_items
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Public read access for active products (for family galleries)
CREATE POLICY "Public read access to active product categories" ON product_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public read access to active photo products" ON photo_products
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public read access to active combo packages" ON combo_packages
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public read access to combo package items" ON combo_package_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM combo_packages 
            WHERE id = combo_package_items.combo_id AND is_active = true
        )
    );

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert default product categories
INSERT INTO product_categories (name, description, icon, sort_order) VALUES
('Impresiones Estándar', 'Fotos impresas en papel fotográfico de calidad', 'Image', 1),
('Impresiones Premium', 'Fotos impresas en papel premium y acabados especiales', 'Crown', 2),
('Productos Digitales', 'Archivos digitales de alta resolución', 'Download', 3),
('Paquetes Combo', 'Combinaciones especiales con descuentos', 'Package', 4);

-- Insert standard photo products
WITH category_ids AS (
    SELECT id, name FROM product_categories
)
INSERT INTO photo_products (category_id, name, description, type, width_cm, height_cm, finish, paper_quality, base_price, image_url, sort_order) 
SELECT 
    c.id,
    products.name,
    products.description,
    products.type,
    products.width_cm,
    products.height_cm,
    products.finish,
    products.paper_quality,
    products.base_price,
    products.image_url,
    products.sort_order
FROM category_ids c
CROSS JOIN (
    VALUES 
    -- Standard Prints
    ('Foto 10x15cm', 'Impresión estándar en papel fotográfico', 'print', 10.0, 15.0, 'glossy', 'standard', 800, '/mockups/print-10x15.jpg', 1),
    ('Foto 13x18cm', 'Impresión estándar tamaño mediano', 'print', 13.0, 18.0, 'glossy', 'standard', 1200, '/mockups/print-13x18.jpg', 2),
    ('Foto 15x20cm', 'Impresión estándar tamaño grande', 'print', 15.0, 20.0, 'glossy', 'standard', 1800, '/mockups/print-15x20.jpg', 3),
    
    -- Premium Prints  
    ('Foto Premium 15x20cm', 'Impresión premium en papel de alta calidad', 'print', 15.0, 20.0, 'matte', 'premium', 2500, '/mockups/print-premium-15x20.jpg', 1),
    ('Foto Canvas 20x30cm', 'Impresión en canvas con marco de madera', 'print', 20.0, 30.0, 'canvas', 'professional', 4500, '/mockups/canvas-20x30.jpg', 2),
    ('Foto Metálica 15x20cm', 'Impresión en aluminio con acabado metálico', 'print', 15.0, 20.0, 'metallic', 'professional', 3500, '/mockups/metallic-15x20.jpg', 3),
    
    -- Digital Products
    ('Archivo Digital HD', 'Archivo digital de alta resolución sin marca de agua', 'digital', NULL, NULL, NULL, NULL, 1500, '/mockups/digital-hd.jpg', 1),
    ('Archivo Digital 4K', 'Archivo digital de máxima calidad 4K', 'digital', NULL, NULL, NULL, NULL, 2500, '/mockups/digital-4k.jpg', 2)
) AS products(name, description, type, width_cm, height_cm, finish, paper_quality, base_price, image_url, sort_order)
WHERE 
    (c.name = 'Impresiones Estándar' AND products.type = 'print' AND products.paper_quality = 'standard') OR
    (c.name = 'Impresiones Premium' AND products.type = 'print' AND products.paper_quality IN ('premium', 'professional')) OR
    (c.name = 'Productos Digitales' AND products.type = 'digital');

-- Insert combo packages
INSERT INTO combo_packages (name, description, min_photos, max_photos, allows_duplicates, pricing_type, base_price, price_per_photo, image_url, badge_text, badge_color, sort_order, is_featured) VALUES
('Combo Básico', 'Perfecto para empezar: 1 foto en tamaño estándar', 1, 1, false, 'fixed', 2500, 0, '/mockups/combo-basic.jpg', 'POPULAR', 'blue', 1, true),
('Combo Familiar', '3 fotos en diferentes tamaños con descuento', 3, 3, true, 'fixed', 6500, 0, '/mockups/combo-family.jpg', 'AHORRO', 'green', 2, true),
('Combo Premium', 'Paquete completo con productos premium', 2, 5, true, 'per_photo', 4000, 1500, '/mockups/combo-premium.jpg', 'MEJOR VALOR', 'purple', 3, true),
('Combo Digital', 'Todos los archivos digitales de tu hijo/a', 1, 10, true, 'fixed', 8000, 0, '/mockups/combo-digital.jpg', 'TODO DIGITAL', 'orange', 4, false);

-- ============================================
-- DOCUMENTATION
-- ============================================

COMMENT ON TABLE product_categories IS 'Categorías de productos fotográficos (impresiones, digital, combos)';
COMMENT ON TABLE photo_products IS 'Productos fotográficos individuales con especificaciones físicas';
COMMENT ON TABLE combo_packages IS 'Paquetes combo con múltiples productos y precios especiales';
COMMENT ON TABLE combo_package_items IS 'Productos incluidos en cada paquete combo';
COMMENT ON TABLE event_product_pricing IS 'Precios específicos por evento que sobrescriben precios base';
COMMENT ON TABLE enhanced_order_items IS 'Items de pedido con detalles completos de producto';

COMMENT ON FUNCTION get_product_price IS 'Obtiene el precio de un producto para un evento específico';
COMMENT ON FUNCTION get_combo_price IS 'Calcula el precio de un combo para un evento y cantidad de fotos';
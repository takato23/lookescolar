-- Crear tabla para órdenes unificadas de la tienda
-- Maneja todos los tipos de pedidos de productos físicos

CREATE TABLE IF NOT EXISTS unified_orders (
  id VARCHAR(255) PRIMARY KEY,
  token VARCHAR(255) NOT NULL,
  
  -- Información del cliente y evento
  client_type VARCHAR(20) DEFAULT 'family',
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  
  -- Producto base seleccionado
  base_package JSONB NOT NULL,
  
  -- Fotos seleccionadas
  selected_photos JSONB NOT NULL DEFAULT '{"individual": [], "group": []}'::jsonb,
  
  -- Copias adicionales
  additional_copies JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Información de contacto y envío
  contact_info JSONB NOT NULL,
  
  -- Precio y pago
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  additions_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'ARS',
  
  -- Estado del pedido
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  
  -- Integración con MercadoPago
  mercadopago_preference_id VARCHAR(255),
  mercadopago_payment_id VARCHAR(255),
  mercadopago_status VARCHAR(50),
  payment_method VARCHAR(100),
  payment_details JSONB,
  
  -- Información de producción y envío
  production_status VARCHAR(50) DEFAULT 'pending',
  production_notes TEXT,
  tracking_number VARCHAR(255),
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadatos
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_unified_orders_token ON unified_orders(token);
CREATE INDEX IF NOT EXISTS idx_unified_orders_status ON unified_orders(status);
CREATE INDEX IF NOT EXISTS idx_unified_orders_mercadopago_preference ON unified_orders(mercadopago_preference_id);
CREATE INDEX IF NOT EXISTS idx_unified_orders_mercadopago_payment ON unified_orders(mercadopago_payment_id);
CREATE INDEX IF NOT EXISTS idx_unified_orders_production_status ON unified_orders(production_status);
CREATE INDEX IF NOT EXISTS idx_unified_orders_created_at ON unified_orders(created_at);

-- Constraint para validar estados
ALTER TABLE unified_orders 
ADD CONSTRAINT chk_unified_orders_status 
CHECK (status IN ('draft', 'pending_payment', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled'));

ALTER TABLE unified_orders 
ADD CONSTRAINT chk_unified_orders_production_status 
CHECK (production_status IN ('pending', 'in_progress', 'printed', 'packaged', 'shipped', 'delivered'));

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_unified_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_unified_orders_updated_at
  BEFORE UPDATE ON unified_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_unified_orders_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE unified_orders IS 'Órdenes unificadas para productos físicos (carpetas y fotos)';
COMMENT ON COLUMN unified_orders.base_package IS 'Información del paquete base (Opción A o B)';
COMMENT ON COLUMN unified_orders.selected_photos IS 'IDs de fotos seleccionadas por tipo';
COMMENT ON COLUMN unified_orders.additional_copies IS 'Copias adicionales solicitadas';
COMMENT ON COLUMN unified_orders.contact_info IS 'Información de contacto y dirección de envío';
COMMENT ON COLUMN unified_orders.status IS 'Estado del pedido: draft, pending_payment, paid, in_production, shipped, delivered, cancelled';
COMMENT ON COLUMN unified_orders.production_status IS 'Estado de producción: pending, in_progress, printed, packaged, shipped, delivered';

-- Producción: no insertamos datos seed para evitar registros mock en el entorno final

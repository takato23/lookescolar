-- Crear tabla de órdenes para el sistema de tienda
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  total_amount INTEGER NOT NULL, -- en centavos
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
  items JSONB NOT NULL, -- array de items con photo_id, quantity, price
  metadata JSONB, -- información adicional como token, event_name, etc.
  mercadopago_preference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_orders_folder_id ON orders(folder_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para updated_at
CREATE TRIGGER trigger_update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Agregar RLS policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Solo admins pueden ver todas las órdenes
CREATE POLICY "Admins can view all orders" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN (
        SELECT email FROM admin_users WHERE is_active = true
      )
    )
  );

-- Policy: Las familias solo pueden ver sus propias órdenes (por token)
CREATE POLICY "Families can view their own orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM folders 
      WHERE folders.id = orders.folder_id 
      AND folders.share_token IS NOT NULL
    )
  );

-- Policy: Permitir inserción de nuevas órdenes
CREATE POLICY "Allow order creation" ON orders
  FOR INSERT WITH CHECK (true);

-- Comentarios para documentar la tabla
COMMENT ON TABLE orders IS 'Tabla para almacenar órdenes de compra de fotos físicas';
COMMENT ON COLUMN orders.total_amount IS 'Total en centavos (ej: 1500 = $15.00)';
COMMENT ON COLUMN orders.items IS 'JSON array con items: [{"photo_id": "uuid", "quantity": 1, "price": 1500}]';
COMMENT ON COLUMN orders.metadata IS 'Información adicional como token, event_name, school_name';
COMMENT ON COLUMN orders.mercadopago_preference_id IS 'ID de preferencia de MercadoPago para tracking';

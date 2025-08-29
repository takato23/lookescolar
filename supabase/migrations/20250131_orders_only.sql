-- Crear solo la tabla orders sin conflictos
DO $$ 
BEGIN
  -- Crear tabla orders si no existe
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
    CREATE TABLE orders (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_address TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
      items JSONB NOT NULL,
      metadata JSONB,
      mercadopago_preference_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Crear índices
    CREATE INDEX idx_orders_folder_id ON orders(folder_id);
    CREATE INDEX idx_orders_status ON orders(status);
    CREATE INDEX idx_orders_customer_email ON orders(customer_email);
    CREATE INDEX idx_orders_created_at ON orders(created_at);
    
    -- Crear función para updated_at
    CREATE OR REPLACE FUNCTION update_orders_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Crear trigger
    CREATE TRIGGER trigger_update_orders_updated_at
      BEFORE UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION update_orders_updated_at();
    
    -- Habilitar RLS
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    
    -- Crear policies básicas
    CREATE POLICY "Allow order creation" ON orders FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow order viewing" ON orders FOR SELECT USING (true);
    
    RAISE NOTICE 'Tabla orders creada exitosamente';
  ELSE
    RAISE NOTICE 'Tabla orders ya existe, saltando creación';
  END IF;
END $$;

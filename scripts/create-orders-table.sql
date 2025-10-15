-- Create orders table if it doesn't exist
-- Based on migration 20250131_orders_only.sql

DO $$
BEGIN
  -- Create orders table if it doesn't exist
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

    -- Create indexes
    CREATE INDEX idx_orders_folder_id ON orders(folder_id);
    CREATE INDEX idx_orders_status ON orders(status);
    CREATE INDEX idx_orders_customer_email ON orders(customer_email);
    CREATE INDEX idx_orders_created_at ON orders(created_at);

    -- Create updated_at trigger function if it doesn't exist
    CREATE OR REPLACE FUNCTION update_orders_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create trigger
    CREATE TRIGGER update_orders_updated_at
      BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();

    RAISE NOTICE 'Orders table created successfully';
  ELSE
    RAISE NOTICE 'Orders table already exists';
  END IF;
END;
$$;

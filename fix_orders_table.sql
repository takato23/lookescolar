-- Script para verificar y corregir tabla orders
-- Ejecutar en Supabase SQL Editor

-- 1. Ver estructura actual
SELECT 'ESTRUCTURA ACTUAL:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- 2. Ver datos existentes
SELECT 'DATOS EXISTENTES:' as info;
SELECT COUNT(*) as total_orders FROM orders;

-- 3. Agregar columna folder_id si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN folder_id TEXT;
    RAISE NOTICE 'Columna folder_id agregada';
  ELSE
    RAISE NOTICE 'Columna folder_id ya existe';
  END IF;
END $$;

-- 4. Verificar estructura final
SELECT 'ESTRUCTURA FINAL:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- 5. Crear índice en folder_id si no existe
CREATE INDEX IF NOT EXISTS idx_orders_folder_id ON orders(folder_id);

-- 6. Verificar que todo esté listo
SELECT 'VERIFICACIÓN FINAL:' as info;
SELECT 
  'orders' as table_name,
  COUNT(*) as column_count,
  (SELECT COUNT(*) FROM orders) as row_count
FROM information_schema.columns 
WHERE table_name = 'orders';

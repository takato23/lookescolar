-- Verificar estructura real de la tabla assets
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'assets' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar estructura de la tabla photos para comparar
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'photos' 
AND table_schema = 'public'
ORDER BY ordinal_position;

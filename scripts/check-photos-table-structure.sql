-- Verificar estructura real de ambas tablas
RAISE NOTICE 'VERIFICANDO ESTRUCTURA DE PHOTOS:';
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'photos' AND table_schema = 'public'
ORDER BY ordinal_position;

RAISE NOTICE 'VERIFICANDO ESTRUCTURA DE ASSETS:';
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'assets' AND table_schema = 'public'
ORDER BY ordinal_position;

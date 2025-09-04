-- Verificar esquema actual de la base de datos
-- Este script ayuda a entender qué tablas existen realmente

-- 1. Verificar tablas principales
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== VERIFICACIÓN DE ESQUEMA ACTUAL ===';
    
    -- Verificar events
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'events'
    ) INTO table_exists;
    RAISE NOTICE 'events: %', CASE WHEN table_exists THEN 'EXISTS' ELSE 'NOT FOUND' END;
    
    -- Verificar subjects
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'subjects'
    ) INTO table_exists;
    RAISE NOTICE 'subjects: %', CASE WHEN table_exists THEN 'EXISTS' ELSE 'NOT FOUND' END;
    
    -- Verificar folders
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'folders'
    ) INTO table_exists;
    RAISE NOTICE 'folders: %', CASE WHEN table_exists THEN 'EXISTS' ELSE 'NOT FOUND' END;
    
    -- Verificar event_folders
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'event_folders'
    ) INTO table_exists;
    RAISE NOTICE 'event_folders: %', CASE WHEN table_exists THEN 'EXISTS' ELSE 'NOT FOUND' END;
    
    -- Verificar assets
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'assets'
    ) INTO table_exists;
    RAISE NOTICE 'assets: %', CASE WHEN table_exists THEN 'EXISTS' ELSE 'NOT FOUND' END;
    
    -- Verificar photos
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'photos'
    ) INTO table_exists;
    RAISE NOTICE 'photos: %', CASE WHEN table_exists THEN 'EXISTS' ELSE 'NOT FOUND' END;
    
    -- Verificar access_tokens
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'access_tokens'
    ) INTO table_exists;
    RAISE NOTICE 'access_tokens: %', CASE WHEN table_exists THEN 'EXISTS' ELSE 'NOT FOUND' END;
    
    -- Verificar subject_tokens
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'subject_tokens'
    ) INTO table_exists;
    RAISE NOTICE 'subject_tokens: %', CASE WHEN table_exists THEN 'EXISTS' ELSE 'NOT FOUND' END;
    
    -- Verificar courses
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'courses'
    ) INTO table_exists;
    RAISE NOTICE 'courses: %', CASE WHEN table_exists THEN 'EXISTS' ELSE 'NOT FOUND' END;
END $$;

-- 2. Mostrar estructura de folders si existe
DO $$
DECLARE
    table_exists BOOLEAN;
    col_record RECORD;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'folders'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '=== ESTRUCTURA DE TABLA folders ===';
        FOR col_record IN
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'folders'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '% | % | % | %', 
                col_record.column_name, 
                col_record.data_type,
                col_record.is_nullable,
                COALESCE(col_record.column_default, 'NULL');
        END LOOP;
    END IF;
END $$;

-- 3. Mostrar estructura de access_tokens si existe
DO $$
DECLARE
    table_exists BOOLEAN;
    col_record RECORD;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'access_tokens'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '=== ESTRUCTURA DE TABLA access_tokens ===';
        FOR col_record IN
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'access_tokens'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '% | % | % | %', 
                col_record.column_name, 
                col_record.data_type,
                col_record.is_nullable,
                COALESCE(col_record.column_default, 'NULL');
        END LOOP;
        
        -- Verificar constraints
        RAISE NOTICE '';
        RAISE NOTICE '=== CONSTRAINTS DE access_tokens ===';
        FOR col_record IN
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_schema = 'public' AND table_name = 'access_tokens'
        LOOP
            RAISE NOTICE '% | %', col_record.constraint_name, col_record.constraint_type;
        END LOOP;
    END IF;
END $$;

-- 4. Listar todas las tablas del esquema public
RAISE NOTICE '';
RAISE NOTICE '=== TODAS LAS TABLAS EN ESQUEMA PUBLIC ===';
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- ⚠️ ADVERTENCIA: Este script ELIMINARÁ TODAS las tablas, funciones, triggers y tipos existentes
-- Solo ejecutar si estás seguro de querer limpiar toda la base de datos

-- Desactivar temporalmente las verificaciones de foreign keys
SET session_replication_role = 'replica';

-- Eliminar todas las políticas RLS primero
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Eliminar todos los triggers
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT trigger_name, event_object_table 
              FROM information_schema.triggers 
              WHERE trigger_schema = 'public') 
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', 
                      r.trigger_name, r.event_object_table);
    END LOOP;
END $$;

-- Eliminar todas las funciones
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as args 
              FROM pg_proc 
              INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid)
              WHERE ns.nspname = 'public' 
              AND proname NOT LIKE 'pg_%'
              AND proname NOT LIKE 'pgp_%') 
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I(%s) CASCADE', r.proname, r.args);
    END LOOP;
END $$;

-- Eliminar todas las vistas
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT viewname 
              FROM pg_views 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', r.viewname);
    END LOOP;
END $$;

-- Eliminar todas las vistas materializadas
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT matviewname 
              FROM pg_matviews 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I CASCADE', r.matviewname);
    END LOOP;
END $$;

-- Eliminar todas las tablas
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename 
              FROM pg_tables 
              WHERE schemaname = 'public'
              AND tablename NOT LIKE 'pg_%'
              AND tablename NOT LIKE '_prisma_%'
              AND tablename NOT LIKE 'schema_migrations') 
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', r.tablename);
    END LOOP;
END $$;

-- Eliminar todos los tipos ENUM personalizados
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT typname 
              FROM pg_type 
              WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
              AND typtype = 'e') 
    LOOP
        EXECUTE format('DROP TYPE IF EXISTS %I CASCADE', r.typname);
    END LOOP;
END $$;

-- Eliminar todas las secuencias huérfanas
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequencename 
              FROM pg_sequences 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP SEQUENCE IF EXISTS %I CASCADE', r.sequencename);
    END LOOP;
END $$;

-- Reactivar las verificaciones de foreign keys
SET session_replication_role = 'origin';

-- Verificar que todo está limpio
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== LIMPIEZA COMPLETADA ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Tablas restantes: %', (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public');
    RAISE NOTICE 'Vistas restantes: %', (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public');
    RAISE NOTICE 'Funciones restantes: %', (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public');
    RAISE NOTICE 'Tipos restantes: %', (SELECT COUNT(*) FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e');
    RAISE NOTICE 'Triggers restantes: %', (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public');
    RAISE NOTICE '';
    RAISE NOTICE 'La base de datos está lista para las nuevas migraciones.';
    RAISE NOTICE '';
END $$;

-- Mensaje final
SELECT 'Base de datos limpiada exitosamente. Ahora puedes ejecutar las migraciones 001, 002 y 003.' as mensaje;
-- ============================================================
-- MIGRACIÓN: Agregar columna folder_id a store_settings
-- Fecha: 2025-10-08
-- Propósito: Agregar soporte para configuración por folder además de por evento
-- ============================================================

BEGIN;

-- ============================================================
-- 1. AGREGAR COLUMNA FOLDER_ID
-- ============================================================

-- Agregar columna folder_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'store_settings'
    AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE public.store_settings
    ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 2. ACTUALIZAR ÍNDICES Y CONSTRAINTS
-- ============================================================

-- Crear índice compuesto para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_store_settings_event_folder
  ON public.store_settings(event_id, folder_id)
  WHERE folder_id IS NOT NULL;

-- Crear índice solo para folder_id
CREATE INDEX IF NOT EXISTS idx_store_settings_folder_id
  ON public.store_settings(folder_id)
  WHERE folder_id IS NOT NULL;

-- Constraint único compuesto (un folder puede tener solo una configuración)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'store_settings' AND constraint_name = 'store_settings_folder_id_unique'
  ) THEN
    ALTER TABLE public.store_settings
    ADD CONSTRAINT store_settings_folder_id_unique UNIQUE (folder_id);
  END IF;
END $$;

-- ============================================================
-- 3. ACTUALIZAR PERMISOS
-- ============================================================

-- Asegurar que service_role tenga permisos completos
GRANT ALL ON public.store_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.store_settings TO authenticated;

-- ============================================================
-- 4. MENSAJES DE CONFIRMACIÓN
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Columna folder_id agregada exitosamente a store_settings';
  RAISE NOTICE 'Índices y constraints actualizados';
  RAISE NOTICE 'Sistema listo para configuraciones por folder y evento';
END $$;

COMMIT;
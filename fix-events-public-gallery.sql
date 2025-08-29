-- ============================================================
-- AGREGAR COLUMNA PUBLIC_GALLERY_ENABLED A EVENTOS
-- Ejecutar en: Dashboard de Supabase > SQL Editor
-- ============================================================

-- Agregar columna para controlar galería pública por evento
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS public_gallery_enabled BOOLEAN DEFAULT false;

-- Crear índice para performance
CREATE INDEX IF NOT EXISTS idx_events_public_gallery_enabled ON events(public_gallery_enabled);

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name = 'public_gallery_enabled';

-- Opcional: Si queremos que todos los eventos existentes sean públicos por defecto
-- UPDATE events SET public_gallery_enabled = true WHERE public_gallery_enabled IS NULL;

COMMENT ON COLUMN events.public_gallery_enabled IS 'Controla si la galería pública del evento está habilitada';




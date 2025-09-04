-- MIGRACIÓN MANUAL PARA ARREGLAR /admin/publish
-- Ejecutá este script en SQL Editor de Supabase Dashboard

BEGIN;

-- 1. Añadir columnas faltantes a la tabla folders (si no existen)
ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS share_token text,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS publish_settings jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS published_at timestamptz NULL;

-- 2. Crear índices (seguros)
CREATE INDEX IF NOT EXISTS idx_folders_share_token ON public.folders(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folders_published ON public.folders(is_published, published_at) WHERE is_published = true;

-- 3. Crear vista para el admin
CREATE OR REPLACE VIEW public.folders_with_sharing AS
SELECT 
    f.id,
    f.name,
    f.parent_id,
    f.event_id,
    COALESCE(f.depth, 0) as depth,
    COALESCE(f.sort_order, 0) as sort_order,
    COALESCE(f.photo_count, 0) as photo_count,
    f.created_at,
    -- Sharing fields
    f.share_token,
    COALESCE(f.is_published, false) as is_published,
    f.published_at,
    COALESCE(f.publish_settings, '{}'::jsonb) as publish_settings,
    -- URLs for easy access
    CASE 
        WHEN f.share_token IS NOT NULL THEN '/f/' || f.share_token
        ELSE NULL 
    END as family_url,
    CASE 
        WHEN f.share_token IS NOT NULL THEN '/api/qr?token=' || f.share_token
        ELSE NULL 
    END as qr_url,
    -- Event info
    COALESCE(e.name, 'Unknown Event') as event_name,
    e.date as event_date
FROM public.folders f
LEFT JOIN public.events e ON f.event_id = e.id;

-- 4. Permisos para la vista
GRANT SELECT ON public.folders_with_sharing TO service_role;
GRANT SELECT ON public.folders_with_sharing TO authenticated;

COMMIT;

-- Verificación (opcional - ejecutá esto después para confirmar)
-- SELECT count(*) as total_folders FROM public.folders;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'folders' AND column_name IN ('share_token', 'is_published');
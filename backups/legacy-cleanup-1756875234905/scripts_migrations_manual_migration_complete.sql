-- MIGRACIÓN MANUAL COMPLETA - CREAR TABLA FOLDERS
-- Ejecutá este script en SQL Editor de Supabase Dashboard

BEGIN;

-- 1. Crear tabla folders si no existe
CREATE TABLE IF NOT EXISTS public.folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(name) >= 1),
    parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    depth integer DEFAULT 0 CHECK (depth >= 0),
    sort_order integer DEFAULT 0,
    photo_count integer DEFAULT 0 CHECK (photo_count >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    -- Sharing columns
    share_token text UNIQUE,
    is_published boolean DEFAULT false,
    publish_settings jsonb DEFAULT '{}',
    published_at timestamptz NULL
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_folders_event_id ON public.folders(event_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_share_token ON public.folders(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folders_published ON public.folders(is_published, published_at) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_folders_depth ON public.folders(depth);

-- 3. Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Trigger para updated_at
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS (Row Level Security)
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS
CREATE POLICY "Admins can manage all folders" ON public.folders
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);

CREATE POLICY "Service role can manage all folders" ON public.folders
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 7. Crear vista para el admin
CREATE OR REPLACE VIEW public.folders_with_sharing AS
SELECT 
    f.id,
    f.name,
    f.parent_id,
    f.event_id,
    f.depth,
    f.sort_order,
    f.photo_count,
    f.created_at,
    f.updated_at,
    -- Sharing fields
    f.share_token,
    f.is_published,
    f.published_at,
    f.publish_settings,
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

-- 8. Permisos
GRANT ALL ON public.folders TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.folders TO authenticated;
GRANT SELECT ON public.folders_with_sharing TO service_role;
GRANT SELECT ON public.folders_with_sharing TO authenticated;

-- 9. Insertar algunas carpetas de prueba (opcional)
INSERT INTO public.folders (name, event_id, depth, sort_order, photo_count) 
SELECT 
    'Carpeta ' || e.name,
    e.id,
    0,
    1,
    0
FROM public.events e 
WHERE NOT EXISTS (SELECT 1 FROM public.folders WHERE event_id = e.id)
LIMIT 5;

COMMIT;

-- Verificación
SELECT 'Tabla folders creada exitosamente' as status;
SELECT count(*) as total_folders FROM public.folders;
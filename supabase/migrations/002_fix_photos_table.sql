-- ============================================
-- Fix para la tabla photos - Agregar campos faltantes
-- ============================================

-- Primero eliminar la tabla existente si tiene estructura incorrecta
DROP TABLE IF EXISTS photos CASCADE;

-- Recrear la tabla photos con TODOS los campos necesarios
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    
    -- Nombres y paths de archivos
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- path en Supabase Storage
    watermark_path TEXT, -- path de la versión con watermark
    preview_path TEXT, -- path de la preview pequeña
    
    -- Metadatos de la imagen
    file_size INTEGER, -- tamaño en bytes
    width INTEGER,
    height INTEGER,
    mime_type TEXT DEFAULT 'image/jpeg',
    
    -- Estado y procesamiento
    approved BOOLEAN DEFAULT false,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    
    -- Metadatos adicionales
    metadata JSONB DEFAULT '{}',
    hash TEXT, -- Para detectar duplicados
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT photos_filesize_check CHECK (file_size > 0 AND file_size < 52428800), -- max 50MB
    CONSTRAINT photos_dimensions_check CHECK (width > 0 AND height > 0),
    CONSTRAINT photos_mime_check CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp'))
);

-- Crear índices necesarios
CREATE INDEX idx_photos_event_id ON photos(event_id);
CREATE INDEX idx_photos_subject_id ON photos(subject_id);
CREATE INDEX idx_photos_processing_status ON photos(processing_status);
CREATE INDEX idx_photos_approved ON photos(approved);
CREATE INDEX idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX idx_photos_hash ON photos(hash); -- Para búsqueda de duplicados

-- Trigger para actualizar updated_at
CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Policy para service role
CREATE POLICY "Service role has full access to photos" ON photos
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- También necesitamos crear la tabla para relación many-to-many si hay múltiples sujetos por foto
-- ============================================
DROP TABLE IF EXISTS photo_subjects CASCADE;

CREATE TABLE photo_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evitar duplicados
    CONSTRAINT photo_subjects_unique UNIQUE(photo_id, subject_id)
);

CREATE INDEX idx_photo_subjects_photo_id ON photo_subjects(photo_id);
CREATE INDEX idx_photo_subjects_subject_id ON photo_subjects(subject_id);

-- Habilitar RLS
ALTER TABLE photo_subjects ENABLE ROW LEVEL SECURITY;

-- Policy para service role
CREATE POLICY "Service role has full access to photo_subjects" ON photo_subjects
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- Actualizar la tabla subjects si le faltan campos
-- ============================================
ALTER TABLE subjects 
    ADD COLUMN IF NOT EXISTS grade TEXT,
    ADD COLUMN IF NOT EXISTS section TEXT,
    ADD COLUMN IF NOT EXISTS grade_section TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN grade IS NOT NULL AND section IS NOT NULL THEN grade || '-' || section
            ELSE NULL
        END
    ) STORED;

-- Índice para búsqueda por grado y sección
CREATE INDEX IF NOT EXISTS idx_subjects_grade_section ON subjects(grade_section);

-- ============================================
-- Documentación
-- ============================================
COMMENT ON TABLE photos IS 'Fotos subidas con watermark y metadata';
COMMENT ON TABLE photo_subjects IS 'Relación many-to-many entre fotos y sujetos';

COMMENT ON COLUMN photos.original_filename IS 'Nombre original del archivo subido';
COMMENT ON COLUMN photos.storage_path IS 'Path relativo en Supabase Storage bucket privado';
COMMENT ON COLUMN photos.watermark_path IS 'Path de la versión con marca de agua';
COMMENT ON COLUMN photos.preview_path IS 'Path de la preview pequeña para galería';
COMMENT ON COLUMN photos.hash IS 'Hash SHA256 del archivo para detectar duplicados';
COMMENT ON COLUMN subjects.grade_section IS 'Campo generado automáticamente: grado-sección';
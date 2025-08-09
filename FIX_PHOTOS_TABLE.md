# 🔧 FIX URGENTE - Tabla Photos

## Problema
La tabla `photos` no tiene todos los campos necesarios para el upload de fotos.

## Solución Rápida

### Opción 1: Copiar y Pegar en SQL Editor (MÁS RÁPIDO)

1. Ve a tu [Supabase Dashboard](https://supabase.com/dashboard)
2. Abre el **SQL Editor**
3. **Copia TODO este SQL y pégalo:**

```sql
-- FIX URGENTE para tabla photos
DROP TABLE IF EXISTS photo_subjects CASCADE;
DROP TABLE IF EXISTS photos CASCADE;

-- Recrear tabla photos con TODOS los campos
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    watermark_path TEXT,
    preview_path TEXT,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    mime_type TEXT DEFAULT 'image/jpeg',
    approved BOOLEAN DEFAULT false,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    metadata JSONB DEFAULT '{}',
    hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT photos_filesize_check CHECK (file_size > 0 AND file_size < 52428800),
    CONSTRAINT photos_dimensions_check CHECK (width > 0 AND height > 0),
    CONSTRAINT photos_mime_check CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp'))
);

-- Índices
CREATE INDEX idx_photos_event_id ON photos(event_id);
CREATE INDEX idx_photos_subject_id ON photos(subject_id);
CREATE INDEX idx_photos_processing_status ON photos(processing_status);
CREATE INDEX idx_photos_approved ON photos(approved);
CREATE INDEX idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX idx_photos_hash ON photos(hash);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to photos" ON photos
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Tabla relación many-to-many
CREATE TABLE photo_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT photo_subjects_unique UNIQUE(photo_id, subject_id)
);

CREATE INDEX idx_photo_subjects_photo_id ON photo_subjects(photo_id);
CREATE INDEX idx_photo_subjects_subject_id ON photo_subjects(subject_id);

ALTER TABLE photo_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to photo_subjects" ON photo_subjects
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Actualizar subjects
ALTER TABLE subjects 
    ADD COLUMN IF NOT EXISTS grade TEXT,
    ADD COLUMN IF NOT EXISTS section TEXT,
    ADD COLUMN IF NOT EXISTS grade_section TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN grade IS NOT NULL AND section IS NOT NULL THEN grade || '-' || section
            ELSE NULL
        END
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_subjects_grade_section ON subjects(grade_section);
```

4. **Ejecuta** haciendo clic en "RUN"

### Opción 2: Usar el archivo de migración

Ejecuta el archivo `supabase/migrations/002_fix_photos_table.sql` en el SQL Editor.

## Verificación

Después de ejecutar, verifica que la tabla `photos` tenga estos campos:
- ✅ original_filename
- ✅ storage_path
- ✅ watermark_path
- ✅ preview_path
- ✅ width
- ✅ height
- ✅ file_size
- ✅ approved
- ✅ processing_status

## Storage Bucket

También necesitas crear el bucket si no existe:

1. Ve a **Storage** en Supabase Dashboard
2. Crea un bucket llamado `photos-bucket`
3. Configúralo como **PRIVADO**

¡Después de esto el upload de fotos debería funcionar!
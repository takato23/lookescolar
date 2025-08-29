-- ============================================================
-- AGREGAR COLUMNAS FALTANTES A TABLA SUBJECTS EN SUPABASE
-- Ejecutar en: Dashboard de Supabase > SQL Editor
-- ============================================================

-- Agregar columnas faltantes que faltan en subjects
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS section TEXT,
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Crear índices útiles si no existen
CREATE INDEX IF NOT EXISTS idx_subjects_event_id ON subjects(event_id);
CREATE INDEX IF NOT EXISTS idx_subjects_access_token ON subjects(access_token);
CREATE INDEX IF NOT EXISTS idx_subjects_token_expires ON subjects(token_expires_at);

-- Verificar estructura final
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'subjects' 
AND table_schema = 'public'
ORDER BY ordinal_position;




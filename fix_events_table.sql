-- FIX: Agregar campos faltantes a la tabla events para que la API funcione

-- Agregar campos que la API necesita pero no existen
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
ADD COLUMN IF NOT EXISTS price_per_photo DECIMAL(10,2) DEFAULT 0.00;

-- Crear trigger para updated_at si no existe
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_events_updated_at_trigger'
    ) THEN
        CREATE TRIGGER update_events_updated_at_trigger 
            BEFORE UPDATE ON events 
            FOR EACH ROW 
            EXECUTE FUNCTION update_events_updated_at();
    END IF;
END $$;

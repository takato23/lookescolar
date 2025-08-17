-- PR A – Default de publicación y robustez del esquema
-- 1) Asegurar default false, no nulo
ALTER TABLE public.photos
  ALTER COLUMN approved SET DEFAULT false;

UPDATE public.photos
SET approved = false
WHERE approved IS NULL;

ALTER TABLE public.photos
  ALTER COLUMN approved SET NOT NULL;

-- PR D – Índices para lecturas públicas rápidas (solo approved=true)
CREATE INDEX IF NOT EXISTS photos_event_approved_created_idx
  ON public.photos(event_id, approved, created_at DESC)
  WHERE approved = true;

CREATE INDEX IF NOT EXISTS photos_code_approved_created_idx
  ON public.photos(code_id, approved, created_at ASC)
  WHERE approved = true;

-- Nota: Mantener aplicada la migración 20250109_qr_anchor_v1_schema.sql para columna code_id


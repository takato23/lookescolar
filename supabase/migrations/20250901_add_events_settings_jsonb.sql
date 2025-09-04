-- Non-destructive: add settings JSONB to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

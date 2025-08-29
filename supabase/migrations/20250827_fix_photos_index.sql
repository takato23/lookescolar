-- Fix wrong photos index referencing non-existent column 'status'
DROP INDEX IF EXISTS photos_event_status_idx;
CREATE INDEX IF NOT EXISTS photos_event_processing_idx ON public.photos(event_id, processing_status);


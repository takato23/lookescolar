-- Performance indexes for common admin queries
-- Photos by event and status
CREATE INDEX IF NOT EXISTS photos_event_id_idx ON public.photos(event_id);
CREATE INDEX IF NOT EXISTS photos_event_status_idx ON public.photos(event_id, status);
-- Subjects by event
CREATE INDEX IF NOT EXISTS subjects_event_id_idx ON public.subjects(event_id);
-- Orders by event and status
CREATE INDEX IF NOT EXISTS orders_event_status_idx ON public.orders(event_id, status);
-- Gallery shares event-level quick lookup
CREATE INDEX IF NOT EXISTS gallery_shares_event_level_idx ON public.gallery_shares(event_id) WHERE level_id IS NULL AND course_id IS NULL AND student_id IS NULL;
-- Assets by folder for unified system
CREATE INDEX IF NOT EXISTS assets_folder_idx ON public.assets(folder_id);


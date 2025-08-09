-- Allow event_id to be NULL in photos table for unassigned photos
ALTER TABLE photos 
  ALTER COLUMN event_id DROP NOT NULL;

-- Update RLS policies to handle photos without events
DROP POLICY IF EXISTS "photos_select" ON photos;
DROP POLICY IF EXISTS "photos_insert" ON photos;
DROP POLICY IF EXISTS "photos_update" ON photos;
DROP POLICY IF EXISTS "photos_delete" ON photos;

-- Create new policies that handle NULL event_id
CREATE POLICY "photos_select" ON photos
  FOR SELECT
  USING (true); -- Allow reading all photos for now

CREATE POLICY "photos_insert" ON photos
  FOR INSERT
  WITH CHECK (true); -- Allow inserting photos

CREATE POLICY "photos_update" ON photos
  FOR UPDATE
  USING (true)
  WITH CHECK (true); -- Allow updating photos

CREATE POLICY "photos_delete" ON photos
  FOR DELETE
  USING (true); -- Allow deleting photos

-- Add index for photos without event
CREATE INDEX IF NOT EXISTS idx_photos_null_event 
  ON photos(created_at DESC) 
  WHERE event_id IS NULL;

-- Add comment
COMMENT ON COLUMN photos.event_id IS 'Reference to event. NULL for unassigned photos that can be assigned later.';
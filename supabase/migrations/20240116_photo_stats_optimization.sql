-- Migration: Photo Stats Optimization
-- Description: Add optimized functions and indexes for photo statistics calculations
-- Date: 2024-01-16

-- Function to get photo stats for a specific event
CREATE OR REPLACE FUNCTION get_photo_stats_by_event(event_id UUID)
RETURNS TABLE(
  total BIGINT,
  approved BIGINT,
  pending BIGINT,
  tagged BIGINT,
  untagged BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE approved = true) as approved,
    COUNT(*) FILTER (WHERE approved = false) as pending,
    COUNT(*) FILTER (WHERE subject_id IS NOT NULL) as tagged,
    COUNT(*) FILTER (WHERE subject_id IS NULL) as untagged
  FROM photos 
  WHERE photos.event_id = get_photo_stats_by_event.event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get photo stats for all photos
CREATE OR REPLACE FUNCTION get_photo_stats_all()
RETURNS TABLE(
  total BIGINT,
  approved BIGINT,
  pending BIGINT,
  tagged BIGINT,
  untagged BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE approved = true) as approved,
    COUNT(*) FILTER (WHERE approved = false) as pending,
    COUNT(*) FILTER (WHERE subject_id IS NOT NULL) as tagged,
    COUNT(*) FILTER (WHERE subject_id IS NULL) as untagged
  FROM photos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance on photo queries
CREATE INDEX IF NOT EXISTS idx_photos_event_approved 
  ON photos(event_id, approved) 
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_photos_event_subject 
  ON photos(event_id, subject_id) 
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_photos_approved 
  ON photos(approved);

CREATE INDEX IF NOT EXISTS idx_photos_subject 
  ON photos(subject_id) 
  WHERE subject_id IS NOT NULL;

-- Index for created_at ordering (commonly used in queries)
CREATE INDEX IF NOT EXISTS idx_photos_created_at 
  ON photos(created_at DESC);

-- Composite index for common filtering combinations
CREATE INDEX IF NOT EXISTS idx_photos_event_approved_created 
  ON photos(event_id, approved, created_at DESC) 
  WHERE event_id IS NOT NULL;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_photo_stats_by_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_photo_stats_all() TO authenticated;

-- Add comment documentation
COMMENT ON FUNCTION get_photo_stats_by_event(UUID) IS 'Get aggregated photo statistics for a specific event';
COMMENT ON FUNCTION get_photo_stats_all() IS 'Get aggregated photo statistics for all photos';
COMMENT ON INDEX idx_photos_event_approved IS 'Optimize filtering by event and approval status';
COMMENT ON INDEX idx_photos_event_subject IS 'Optimize filtering by event and subject assignment';
COMMENT ON INDEX idx_photos_created_at IS 'Optimize ordering by creation date';
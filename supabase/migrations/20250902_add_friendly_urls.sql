-- ============================================================
-- FRIENDLY URLS SYSTEM - Simplification & UX Improvement
-- ============================================================
-- Purpose: Replace long UUIDs with user-friendly slugs
-- Date: 2025-09-02
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ADD SLUG COLUMNS
-- ============================================================

-- Add slug to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add slug to folders table  
ALTER TABLE folders
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add unique constraint for folder slugs within same parent
CREATE UNIQUE INDEX IF NOT EXISTS idx_folder_slug_unique 
ON folders(parent_id, slug, event_id) 
WHERE slug IS NOT NULL;

-- ============================================================
-- 2. SLUG GENERATION FUNCTIONS
-- ============================================================

-- Function to generate URL-friendly slug from text
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            UNACCENT(TRIM(input_text)),
            '[áàäâãåāăąǎǟǡǻȁȃȧạảấầẩẫậắằẳẵặᾱᾳ]', 'a', 'g'
          ),
          '[éèëêēĕėęěȅȇȩẹẻẽếềểễệ]', 'e', 'g'  
        ),
        '[íìïîīĭįǐȉȋịỉĩ]', 'i', 'g'
      ),
      '[óòöôõōŏőǒǫǭȍȏȯọỏốồổỗộớờởỡợơ]', 'o', 'g'
    )
  );
  
  -- Replace special characters and spaces with hyphens
  slug := REGEXP_REPLACE(slug, '[^a-z0-9]+', '-', 'g');
  
  -- Remove leading/trailing hyphens and limit length
  slug := REGEXP_REPLACE(TRIM(BOTH '-' FROM slug), '-+', '-', 'g');
  slug := LEFT(slug, 50);
  slug := TRIM(BOTH '-' FROM slug);
  
  -- Ensure not empty
  IF slug = '' OR slug IS NULL THEN
    slug := 'unnamed';
  END IF;
  
  RETURN slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to ensure unique slug with suffix
CREATE OR REPLACE FUNCTION ensure_unique_slug(
  base_slug TEXT,
  table_name TEXT,
  column_name TEXT DEFAULT 'slug',
  where_clause TEXT DEFAULT ''
)
RETURNS TEXT AS $$
DECLARE
  unique_slug TEXT := base_slug;
  counter INTEGER := 1;
  exists_count INTEGER;
  query_text TEXT;
BEGIN
  LOOP
    -- Build dynamic query to check existence
    query_text := format('SELECT COUNT(*) FROM %I WHERE %I = $1', table_name, column_name);
    
    IF where_clause != '' THEN
      query_text := query_text || ' AND ' || where_clause;
    END IF;
    
    EXECUTE query_text USING unique_slug INTO exists_count;
    
    -- If slug doesn't exist, we can use it
    IF exists_count = 0 THEN
      RETURN unique_slug;
    END IF;
    
    -- Otherwise, try with suffix
    counter := counter + 1;
    unique_slug := base_slug || '-' || counter;
    
    -- Safety valve to prevent infinite loops
    IF counter > 1000 THEN
      unique_slug := base_slug || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
      RETURN unique_slug;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. AUTO-GENERATE SLUGS FOR EXISTING DATA
-- ============================================================

-- Update existing events with slugs
UPDATE events 
SET slug = ensure_unique_slug(
  generate_slug(
    CASE 
      WHEN school_name IS NOT NULL AND name IS NOT NULL 
      THEN school_name || '-' || name || '-' || EXTRACT(YEAR FROM start_date)::TEXT
      WHEN name IS NOT NULL 
      THEN name || '-' || EXTRACT(YEAR FROM start_date)::TEXT
      ELSE 'evento-' || EXTRACT(YEAR FROM start_date)::TEXT
    END
  ),
  'events'
)
WHERE slug IS NULL;

-- Update existing folders with slugs  
UPDATE folders
SET slug = ensure_unique_slug(
  generate_slug(name),
  'folders',
  'slug',
  'parent_id = ' || COALESCE(parent_id::TEXT, 'NULL') || ' AND event_id = ''' || event_id || ''''
)
WHERE slug IS NULL;

-- ============================================================
-- 4. TRIGGERS FOR AUTO-SLUG GENERATION
-- ============================================================

-- Trigger function for events
CREATE OR REPLACE FUNCTION auto_generate_event_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if slug is null or empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := ensure_unique_slug(
      generate_slug(
        CASE 
          WHEN NEW.school_name IS NOT NULL AND NEW.name IS NOT NULL 
          THEN NEW.school_name || '-' || NEW.name || '-' || EXTRACT(YEAR FROM NEW.start_date)::TEXT
          WHEN NEW.name IS NOT NULL 
          THEN NEW.name || '-' || EXTRACT(YEAR FROM NEW.start_date)::TEXT
          ELSE 'evento-' || EXTRACT(YEAR FROM NEW.start_date)::TEXT
        END
      ),
      'events'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for folders
CREATE OR REPLACE FUNCTION auto_generate_folder_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if slug is null or empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := ensure_unique_slug(
      generate_slug(NEW.name),
      'folders',
      'slug',
      'parent_id = ' || COALESCE(NEW.parent_id::TEXT, 'NULL') || ' AND event_id = ''' || NEW.event_id || ''''
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS events_auto_slug ON events;
CREATE TRIGGER events_auto_slug
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_event_slug();

DROP TRIGGER IF EXISTS folders_auto_slug ON folders;  
CREATE TRIGGER folders_auto_slug
  BEFORE INSERT OR UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_folder_slug();

-- ============================================================
-- 5. UTILITY FUNCTIONS FOR SLUG LOOKUP
-- ============================================================

-- Get event by slug
CREATE OR REPLACE FUNCTION get_event_by_slug(event_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  school_name TEXT,
  start_date DATE,
  end_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.slug,
    e.school_name,
    e.start_date,
    e.end_date
  FROM events e
  WHERE e.slug = event_slug
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get folder by slug within event
CREATE OR REPLACE FUNCTION get_folder_by_slug(event_slug TEXT, folder_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  parent_id UUID,
  event_id UUID,
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.name,
    f.slug,
    f.parent_id,
    f.event_id,
    f.depth
  FROM folders f
  JOIN events e ON f.event_id = e.id
  WHERE e.slug = event_slug 
    AND f.slug = folder_slug
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================================

-- Indexes for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folders_slug ON folders(event_id, slug) WHERE slug IS NOT NULL;

-- Composite index for folder hierarchy with slugs
CREATE INDEX IF NOT EXISTS idx_folders_hierarchy_slug 
ON folders(event_id, parent_id, slug, depth) 
WHERE slug IS NOT NULL;

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES (run manually to test)
-- ============================================================

-- Check events with slugs
-- SELECT id, name, school_name, slug FROM events WHERE slug IS NOT NULL LIMIT 5;

-- Check folders with slugs  
-- SELECT f.id, f.name, f.slug, e.name as event_name, e.slug as event_slug
-- FROM folders f 
-- JOIN events e ON f.event_id = e.id 
-- WHERE f.slug IS NOT NULL 
-- LIMIT 10;

-- Test slug lookup
-- SELECT * FROM get_event_by_slug('your-event-slug');
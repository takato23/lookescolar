-- ============================================================
-- Migration: Event Photo Library - Add Folder Support
-- Purpose: Add hierarchical folder structure for photos within events
-- Date: 2025-08-23
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE event_folders TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS event_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES event_folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL, -- computed full path for breadcrumbs
    depth INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT folder_name_length CHECK (length(name) >= 1 AND length(name) <= 255),
    CONSTRAINT folder_unique_name_per_parent UNIQUE(parent_id, name, event_id),
    CONSTRAINT folder_depth_limit CHECK (depth >= 0 AND depth <= 10), -- reasonable depth limit
    CONSTRAINT folder_no_self_parent CHECK (id != parent_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_folders_event_id ON event_folders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_folders_parent_id ON event_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_event_folders_path ON event_folders(path);
CREATE INDEX IF NOT EXISTS idx_event_folders_sort_order ON event_folders(event_id, parent_id, sort_order);

-- ============================================================
-- 2. ADD folder_id TO photos TABLE
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE photos ADD COLUMN folder_id UUID REFERENCES event_folders(id) ON DELETE SET NULL;
    CREATE INDEX idx_photos_folder_id ON photos(folder_id);
    RAISE NOTICE 'Added folder_id column to photos table';
  END IF;
END $$;

-- ============================================================
-- 3. CREATE share_tokens TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS share_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES event_folders(id) ON DELETE CASCADE,
    photo_ids UUID[] DEFAULT '{}', -- specific photos if not folder-based
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    access_count INTEGER DEFAULT 0,
    max_access_count INTEGER, -- optional limit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT share_token_length CHECK (length(token) >= 32),
    CONSTRAINT share_expires_future CHECK (expires_at > created_at),
    CONSTRAINT share_access_positive CHECK (access_count >= 0),
    CONSTRAINT share_folder_or_photos CHECK (
        (folder_id IS NOT NULL AND photo_ids = '{}') OR 
        (folder_id IS NULL AND array_length(photo_ids, 1) > 0)
    )
);

-- Create indexes for share tokens
CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_share_tokens_expires ON share_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_share_tokens_event_id ON share_tokens(event_id);
CREATE INDEX IF NOT EXISTS idx_share_tokens_folder_id ON share_tokens(folder_id);

-- ============================================================
-- 4. CREATE UTILITY FUNCTIONS
-- ============================================================

-- Function to compute folder path recursively
CREATE OR REPLACE FUNCTION compute_folder_path(folder_id UUID)
RETURNS TEXT AS $$
DECLARE
    folder_path TEXT := '';
    current_id UUID := folder_id;
    current_name TEXT;
    current_parent UUID;
    depth_counter INTEGER := 0;
BEGIN
    -- Prevent infinite loops
    WHILE current_id IS NOT NULL AND depth_counter < 20 LOOP
        SELECT name, parent_id INTO current_name, current_parent
        FROM event_folders 
        WHERE id = current_id;
        
        IF current_name IS NULL THEN
            EXIT; -- Folder not found
        END IF;
        
        -- Prepend to path
        IF folder_path = '' THEN
            folder_path := current_name;
        ELSE
            folder_path := current_name || ' / ' || folder_path;
        END IF;
        
        current_id := current_parent;
        depth_counter := depth_counter + 1;
    END LOOP;
    
    RETURN folder_path;
END;
$$ LANGUAGE plpgsql;

-- Function to update folder path after changes
CREATE OR REPLACE FUNCTION update_folder_paths()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the path for the current folder
    NEW.path := compute_folder_path(NEW.id);
    
    -- Update depth
    IF NEW.parent_id IS NULL THEN
        NEW.depth := 0;
    ELSE
        SELECT depth + 1 INTO NEW.depth
        FROM event_folders 
        WHERE id = NEW.parent_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent circular references
CREATE OR REPLACE FUNCTION check_folder_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    current_id UUID := NEW.parent_id;
    depth_counter INTEGER := 0;
BEGIN
    -- If no parent, it's valid
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if we're trying to create a circular reference
    WHILE current_id IS NOT NULL AND depth_counter < 20 LOOP
        IF current_id = NEW.id THEN
            RAISE EXCEPTION 'Circular reference detected: folder cannot be its own ancestor';
        END IF;
        
        SELECT parent_id INTO current_id
        FROM event_folders 
        WHERE id = current_id;
        
        depth_counter := depth_counter + 1;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. CREATE TRIGGERS
-- ============================================================

-- Trigger to auto-update paths and depths
DROP TRIGGER IF EXISTS tr_update_folder_paths ON event_folders;
CREATE TRIGGER tr_update_folder_paths 
    BEFORE INSERT OR UPDATE ON event_folders
    FOR EACH ROW 
    EXECUTE FUNCTION update_folder_paths();

-- Trigger to prevent circular references
DROP TRIGGER IF EXISTS tr_check_folder_hierarchy ON event_folders;
CREATE TRIGGER tr_check_folder_hierarchy 
    BEFORE INSERT OR UPDATE ON event_folders
    FOR EACH ROW 
    EXECUTE FUNCTION check_folder_hierarchy();

-- Trigger for updated_at
DROP TRIGGER IF EXISTS tr_event_folders_updated_at ON event_folders;
CREATE TRIGGER tr_event_folders_updated_at 
    BEFORE UPDATE ON event_folders
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. CREATE ROOT FOLDERS FOR EXISTING EVENTS
-- ============================================================

-- Create root folders for all existing events that don't have one
INSERT INTO event_folders (event_id, name, path, depth, sort_order)
SELECT 
    e.id,
    'Fotos' as name,
    'Fotos' as path,
    0 as depth,
    0 as sort_order
FROM events e
WHERE NOT EXISTS (
    SELECT 1 FROM event_folders ef 
    WHERE ef.event_id = e.id AND ef.parent_id IS NULL
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. ASSIGN EXISTING PHOTOS TO ROOT FOLDERS
-- ============================================================

-- Update photos without folder_id to point to their event's root folder
UPDATE photos 
SET folder_id = (
    SELECT ef.id 
    FROM event_folders ef 
    WHERE ef.event_id = photos.event_id 
    AND ef.parent_id IS NULL
    LIMIT 1
)
WHERE folder_id IS NULL 
AND event_id IS NOT NULL;

-- ============================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE event_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- Policies for event_folders
CREATE POLICY "Service role full access to event_folders" ON event_folders
    FOR ALL TO service_role USING (true);

CREATE POLICY "Admin can manage event_folders" ON event_folders
    FOR ALL TO authenticated USING (true);

-- Policies for share_tokens
CREATE POLICY "Service role full access to share_tokens" ON share_tokens
    FOR ALL TO service_role USING (true);

CREATE POLICY "Admin can manage share_tokens" ON share_tokens
    FOR ALL TO authenticated USING (true);

-- ============================================================
-- 9. CREATE VIEWS FOR EASIER QUERIES
-- ============================================================

-- View to get folders with children count
CREATE OR REPLACE VIEW folders_with_stats AS
SELECT 
    ef.*,
    COALESCE(child_folders.count, 0) as child_folder_count,
    COALESCE(child_photos.count, 0) as photo_count
FROM event_folders ef
LEFT JOIN (
    SELECT parent_id, COUNT(*) as count
    FROM event_folders
    WHERE parent_id IS NOT NULL
    GROUP BY parent_id
) child_folders ON ef.id = child_folders.parent_id
LEFT JOIN (
    SELECT folder_id, COUNT(*) as count
    FROM photos
    WHERE folder_id IS NOT NULL
    GROUP BY folder_id
) child_photos ON ef.id = child_photos.folder_id;

-- ============================================================
-- 10. FINAL VERIFICATION
-- ============================================================

DO $$
DECLARE
    folder_count INTEGER;
    photos_with_folders INTEGER;
    events_with_root_folders INTEGER;
BEGIN
    -- Count folders created
    SELECT COUNT(*) INTO folder_count FROM event_folders;
    
    -- Count photos with folder assignment
    SELECT COUNT(*) INTO photos_with_folders FROM photos WHERE folder_id IS NOT NULL;
    
    -- Count events with root folders
    SELECT COUNT(*) INTO events_with_root_folders 
    FROM events e 
    WHERE EXISTS (
        SELECT 1 FROM event_folders ef 
        WHERE ef.event_id = e.id AND ef.parent_id IS NULL
    );
    
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE '- Created % folders', folder_count;
    RAISE NOTICE '- Assigned % photos to folders', photos_with_folders;
    RAISE NOTICE '- Created root folders for % events', events_with_root_folders;
    RAISE NOTICE 'New tables: event_folders, share_tokens';
    RAISE NOTICE 'New functions: compute_folder_path, update_folder_paths, check_folder_hierarchy';
    RAISE NOTICE 'New view: folders_with_stats';
END $$;

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES (Run manually after migration)
-- ============================================================

/*
-- Check new tables
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('event_folders', 'share_tokens')
ORDER BY table_name, ordinal_position;

-- Check folder hierarchy
SELECT 
    ef.name,
    ef.path,
    ef.depth,
    COUNT(p.id) as photo_count
FROM event_folders ef
LEFT JOIN photos p ON ef.id = p.folder_id
GROUP BY ef.id, ef.name, ef.path, ef.depth
ORDER BY ef.path;

-- Check photos assignment
SELECT 
    e.name as event_name,
    COUNT(p.id) as total_photos,
    COUNT(p.folder_id) as photos_with_folder
FROM events e
LEFT JOIN photos p ON e.id = p.event_id
GROUP BY e.id, e.name;
*/
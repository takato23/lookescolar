-- ============================================================
-- Migration: Photo Gallery System MVP
-- Purpose: Unified photo management with folder-based hierarchy
-- Date: 2024-03-15
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE UNIFIED FOLDERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL, -- Optional event metadata
    path TEXT NOT NULL, -- computed full path for breadcrumbs
    depth INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT folder_name_length CHECK (length(name) >= 1 AND length(name) <= 255),
    CONSTRAINT folder_unique_name_per_parent UNIQUE(parent_id, name),
    CONSTRAINT folder_depth_limit CHECK (depth >= 0 AND depth <= 10),
    CONSTRAINT folder_no_self_parent CHECK (id != parent_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_event_id ON folders(event_id);
CREATE INDEX IF NOT EXISTS idx_folders_path ON folders(path);
CREATE INDEX IF NOT EXISTS idx_folders_sort_order ON folders(parent_id, sort_order);

-- ============================================================
-- 2. CREATE ASSETS TABLE (UNIFIED PHOTOS)
-- ============================================================

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    original_filename TEXT NOT NULL,
    filename TEXT, -- processed filename
    original_path TEXT NOT NULL, -- path in originals bucket
    preview_path TEXT, -- path in previews bucket
    watermark_path TEXT, -- path to watermarked version
    checksum TEXT UNIQUE, -- SHA-256 for deduplication
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
    approved BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT asset_checksum_length CHECK (length(checksum) = 64), -- SHA-256 hex length
    CONSTRAINT asset_file_size_positive CHECK (file_size > 0),
    CONSTRAINT asset_dimensions_positive CHECK (
        (width IS NULL AND height IS NULL) OR 
        (width > 0 AND height > 0)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_folder_id ON assets(folder_id);
CREATE INDEX IF NOT EXISTS idx_assets_checksum ON assets(checksum);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status) WHERE status != 'ready';
CREATE INDEX IF NOT EXISTS idx_assets_approved ON assets(approved);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);

-- ============================================================
-- 3. CREATE ALBUMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    watermark_text TEXT, -- custom watermark for this album
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_albums_folder_id ON albums(folder_id);
CREATE INDEX IF NOT EXISTS idx_albums_public ON albums(is_public) WHERE is_public = true;

-- ============================================================
-- 4. CREATE ALBUM_ASSETS JUNCTION TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS album_assets (
    album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (album_id, asset_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_album_assets_album_id ON album_assets(album_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_album_assets_asset_id ON album_assets(asset_id);

-- ============================================================
-- 5. CREATE ACCESS_TOKENS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    access_count INTEGER DEFAULT 0,
    max_access_count INTEGER, -- optional limit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT token_length CHECK (length(token) >= 32),
    CONSTRAINT token_expires_future CHECK (expires_at > created_at),
    CONSTRAINT access_count_positive CHECK (access_count >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires ON access_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_access_tokens_album_id ON access_tokens(album_id);

-- ============================================================
-- 6. CREATE UTILITY FUNCTIONS
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
        FROM folders 
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
        FROM folders 
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
        FROM folders 
        WHERE id = current_id;
        
        depth_counter := depth_counter + 1;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. CREATE TRIGGERS
-- ============================================================

-- Trigger to auto-update paths and depths
DROP TRIGGER IF EXISTS tr_update_folder_paths ON folders;
CREATE TRIGGER tr_update_folder_paths 
    BEFORE INSERT OR UPDATE ON folders
    FOR EACH ROW 
    EXECUTE FUNCTION update_folder_paths();

-- Trigger to prevent circular references
DROP TRIGGER IF EXISTS tr_check_folder_hierarchy ON folders;
CREATE TRIGGER tr_check_folder_hierarchy 
    BEFORE INSERT OR UPDATE ON folders
    FOR EACH ROW 
    EXECUTE FUNCTION check_folder_hierarchy();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_folders_updated_at ON folders;
CREATE TRIGGER tr_folders_updated_at 
    BEFORE UPDATE ON folders
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_assets_updated_at ON assets;
CREATE TRIGGER tr_assets_updated_at 
    BEFORE UPDATE ON assets
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_albums_updated_at ON albums;
CREATE TRIGGER tr_albums_updated_at 
    BEFORE UPDATE ON albums
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. CREATE VIEWS FOR PERFORMANCE
-- ============================================================

-- View for folders with statistics
CREATE OR REPLACE VIEW folders_with_stats AS
SELECT 
    f.*,
    COALESCE(asset_counts.photo_count, 0) as photo_count,
    COALESCE(subfolder_counts.child_folder_count, 0) as child_folder_count
FROM folders f
LEFT JOIN (
    SELECT folder_id, COUNT(*) as photo_count
    FROM assets
    WHERE status = 'ready'
    GROUP BY folder_id
) asset_counts ON f.id = asset_counts.folder_id
LEFT JOIN (
    SELECT parent_id, COUNT(*) as child_folder_count
    FROM folders
    GROUP BY parent_id
) subfolder_counts ON f.id = subfolder_counts.parent_id;

-- View for albums with asset counts
CREATE OR REPLACE VIEW albums_with_stats AS
SELECT 
    a.*,
    COALESCE(asset_counts.asset_count, 0) as asset_count,
    f.name as folder_name,
    f.path as folder_path
FROM albums a
LEFT JOIN folders f ON a.folder_id = f.id
LEFT JOIN (
    SELECT album_id, COUNT(*) as asset_count
    FROM album_assets aa
    JOIN assets ast ON aa.asset_id = ast.id
    WHERE ast.status = 'ready'
    GROUP BY album_id
) asset_counts ON a.id = asset_counts.album_id;

-- ============================================================
-- 9. MIGRATION FROM EXISTING TABLES (IF THEY EXIST)
-- ============================================================

-- Migrate data from event_folders to folders if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_folders') THEN
        INSERT INTO folders (id, name, parent_id, event_id, path, depth, sort_order, description, metadata, created_at, updated_at)
        SELECT 
            id,
            name,
            parent_id,
            event_id,
            path,
            depth,
            sort_order,
            description,
            COALESCE(metadata, '{}'::jsonb),
            created_at,
            updated_at
        FROM event_folders
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Migrated % folders from event_folders', (SELECT COUNT(*) FROM event_folders);
    END IF;
END $$;

-- Migrate data from photos to assets if photos table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'photos') THEN
        INSERT INTO assets (
            id, folder_id, original_filename, filename, original_path, preview_path, 
            file_size, mime_type, width, height, status, approved, metadata, created_at, updated_at
        )
        SELECT 
            id,
            folder_id,
            original_filename,
            filename,
            storage_path as original_path,
            preview_url as preview_path,
            file_size,
            COALESCE(mime_type, 'image/jpeg'),
            width,
            height,
            CASE 
                WHEN preview_url IS NOT NULL THEN 'ready'
                ELSE 'pending'
            END as status,
            COALESCE(approved, false),
            COALESCE(metadata, '{}'::jsonb),
            created_at,
            updated_at
        FROM photos
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Migrated % assets from photos', (SELECT COUNT(*) FROM photos);
    END IF;
END $$;

COMMIT;

-- ============================================================
-- 10. POST-MIGRATION CLEANUP AND VERIFICATION
-- ============================================================

-- Refresh materialized views if any exist
-- (None in this migration, but good practice)

-- Update statistics
ANALYZE folders;
ANALYZE assets;
ANALYZE albums;
ANALYZE album_assets;
ANALYZE access_tokens;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Photo Gallery MVP migration completed successfully';
    RAISE NOTICE 'Folders: %', (SELECT COUNT(*) FROM folders);
    RAISE NOTICE 'Assets: %', (SELECT COUNT(*) FROM assets);
    RAISE NOTICE 'Albums: %', (SELECT COUNT(*) FROM albums);
END $$;
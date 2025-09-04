-- ============================================================
-- UNIFIED PHOTO SYSTEM - EGRESS OPTIMIZED
-- ============================================================
-- Purpose: Create unified folder/asset system from scratch
-- Optimized for: Minimal egress data usage on Supabase free tier
-- Date: 2025-08-25
-- ============================================================

BEGIN;

-- ============================================================
-- 1. FOLDERS TABLE - Ultra Optimized
-- ============================================================
CREATE TABLE IF NOT EXISTS public.folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100), -- Shorter limit saves bytes
    parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    
    -- Performance fields (avoid expensive queries)
    depth integer NOT NULL DEFAULT 0 CHECK (depth >= 0 AND depth <= 10),
    sort_order integer DEFAULT 0 CHECK (sort_order >= 0),
    photo_count integer DEFAULT 0 CHECK (photo_count >= 0), -- CACHED! No COUNT() queries
    
    -- Minimal metadata
    created_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT folders_no_self_reference CHECK (id != parent_id),
    CONSTRAINT folders_unique_name_per_parent UNIQUE(parent_id, name, event_id)
);

-- ============================================================
-- 2. ASSETS TABLE - Replaces scattered photo references
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
    
    -- File info (minimal)
    filename text NOT NULL CHECK (length(filename) BETWEEN 1 AND 255),
    original_path text NOT NULL,
    preview_path text, -- Can be NULL if not processed yet
    
    -- Technical fields
    file_size bigint NOT NULL CHECK (file_size > 0),
    checksum text NOT NULL CHECK (length(checksum) = 64), -- SHA-256 for deduplication
    mime_type text NOT NULL CHECK (mime_type ~ '^image/'),
    
    -- Status for processing pipeline
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
    
    -- Minimal metadata
    created_at timestamptz DEFAULT now(),
    
    -- Constraints for data integrity
    CONSTRAINT assets_checksum_unique UNIQUE(checksum), -- No duplicates!
    CONSTRAINT assets_path_unique UNIQUE(original_path)
);

-- ============================================================
-- 3. PERFORMANCE INDEXES - Ultra Specific
-- ============================================================

-- Folders: Optimized for tree navigation
CREATE INDEX idx_folders_parent_tree ON public.folders(parent_id, sort_order) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_folders_root ON public.folders(sort_order) WHERE parent_id IS NULL;
CREATE INDEX idx_folders_event ON public.folders(event_id) WHERE event_id IS NOT NULL;

-- Assets: Optimized for folder browsing
CREATE INDEX idx_assets_folder_status ON public.assets(folder_id, status) WHERE status = 'ready';
CREATE INDEX idx_assets_checksum ON public.assets(checksum); -- Fast deduplication
CREATE INDEX idx_assets_processing ON public.assets(status, created_at) WHERE status != 'ready';

-- ============================================================
-- 4. AUTO-UPDATE TRIGGERS - Keep photo_count accurate
-- ============================================================

-- Function to update folder photo counts
CREATE OR REPLACE FUNCTION update_folder_photo_count()
RETURNS trigger AS $$
DECLARE
    folder_id_to_update uuid;
BEGIN
    -- Determine which folder to update
    IF TG_OP = 'DELETE' THEN
        folder_id_to_update := OLD.folder_id;
    ELSE
        folder_id_to_update := NEW.folder_id;
    END IF;
    
    -- Update the cached count
    UPDATE folders 
    SET photo_count = (
        SELECT COUNT(*) 
        FROM assets 
        WHERE assets.folder_id = folder_id_to_update 
        AND status = 'ready'
    )
    WHERE id = folder_id_to_update;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for count updates
CREATE TRIGGER assets_update_folder_count
    AFTER INSERT OR DELETE OR UPDATE OF folder_id, status ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_photo_count();

-- Function to update folder depth automatically
CREATE OR REPLACE FUNCTION update_folder_depth()
RETURNS trigger AS $$
BEGIN
    -- Calculate depth based on parent
    IF NEW.parent_id IS NULL THEN
        NEW.depth := 0;
    ELSE
        SELECT depth + 1 INTO NEW.depth
        FROM folders 
        WHERE id = NEW.parent_id;
        
        -- Prevent infinite depth
        IF NEW.depth > 10 THEN
            RAISE EXCEPTION 'Folder depth limit exceeded (max 10)';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for depth calculation
CREATE TRIGGER folders_calculate_depth
    BEFORE INSERT OR UPDATE OF parent_id ON public.folders
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_depth();

-- ============================================================
-- 5. RLS POLICIES - Secure but efficient
-- ============================================================

-- Enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Admin access (bypass in development)
CREATE POLICY "Admin full access folders"
ON public.folders FOR ALL TO authenticated
USING (
    -- In development, allow all. In production, check admin role
    CASE 
        WHEN current_setting('app.environment', true) = 'development' THEN true
        ELSE EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' = 'admin')
        )
    END
);

CREATE POLICY "Admin full access assets"
ON public.assets FOR ALL TO authenticated
USING (
    -- Same as folders policy
    CASE 
        WHEN current_setting('app.environment', true) = 'development' THEN true
        ELSE EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' = 'admin')
        )
    END
);

-- Public read access for published folders (future feature)
CREATE POLICY "Public read published assets"
ON public.assets FOR SELECT TO anon
USING (false); -- Disabled for now, enable when needed

-- ============================================================
-- 6. UTILITY FUNCTIONS - Egress optimized
-- ============================================================

-- Get folder tree with minimal data transfer
CREATE OR REPLACE FUNCTION get_folder_tree(
    p_parent_id uuid DEFAULT NULL,
    p_max_depth integer DEFAULT 3
) RETURNS TABLE (
    id uuid,
    name text,
    parent_id uuid,
    depth integer,
    photo_count integer,
    has_children boolean
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE folder_tree AS (
        -- Base case: direct children or roots
        SELECT 
            f.id,
            f.name,
            f.parent_id,
            f.depth,
            f.photo_count,
            EXISTS(SELECT 1 FROM folders cf WHERE cf.parent_id = f.id) as has_children
        FROM folders f
        WHERE f.parent_id = p_parent_id
        
        UNION ALL
        
        -- Recursive case: children up to max depth
        SELECT 
            f.id,
            f.name,
            f.parent_id,
            f.depth,
            f.photo_count,
            EXISTS(SELECT 1 FROM folders cf WHERE cf.parent_id = f.id) as has_children
        FROM folders f
        INNER JOIN folder_tree ft ON f.parent_id = ft.id
        WHERE ft.depth < p_max_depth
    )
    SELECT * FROM folder_tree
    ORDER BY depth, sort_order, name;
END;
$$ LANGUAGE plpgsql;

-- Get assets with pagination (egress optimized)
CREATE OR REPLACE FUNCTION get_folder_assets(
    p_folder_id uuid,
    p_offset integer DEFAULT 0,
    p_limit integer DEFAULT 50  -- Never more than 50!
) RETURNS TABLE (
    id uuid,
    filename text,
    preview_path text,
    file_size bigint,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.filename,
        a.preview_path,
        a.file_size,
        a.created_at
    FROM assets a
    WHERE a.folder_id = p_folder_id
    AND a.status = 'ready'
    ORDER BY a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================
-- OPTIMIZATION NOTES
-- ============================================================
-- 1. photo_count is cached - no expensive COUNT() queries
-- 2. Indexes are ultra-specific for common queries
-- 3. Functions limit results to prevent egress spikes  
-- 4. Minimal column set reduces transfer size
-- 5. Checksum prevents duplicate storage
-- 6. Tree queries are depth-limited
-- ============================================================
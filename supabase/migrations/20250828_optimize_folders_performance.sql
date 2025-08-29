-- ============================================================
-- FOLDERS PERFORMANCE OPTIMIZATION
-- ============================================================
-- Purpose: Optimize queries for publish page with dozens of albums and hundreds of people
-- Target: Sub-500ms query times, efficient filtering and pagination
-- Date: 2025-08-28
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CRITICAL INDEXES for folders publish functionality
-- ============================================================

-- Index for event-based folder queries (most common filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_event_published_performance
ON folders (event_id, is_published, published_at DESC NULLS LAST)
WHERE event_id IS NOT NULL;

-- Index for published folders lookup (critical for family access)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_published_lookup
ON folders (is_published, published_at DESC, share_token)
WHERE is_published = true AND share_token IS NOT NULL;

-- Full-text search index for folder names (Spanish optimized)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_search_name
ON folders USING gin(to_tsvector('spanish', name))
WHERE name IS NOT NULL;

-- Composite index for admin dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_admin_dashboard
ON folders (event_id, is_published, photo_count DESC, created_at DESC)
WHERE photo_count > 0;

-- ============================================================
-- 2. OPTIMIZED VIEW for publish page
-- ============================================================

-- Drop and recreate view with better performance
DROP VIEW IF EXISTS public.folders_with_sharing;

CREATE VIEW public.folders_with_sharing AS
SELECT 
    f.id,
    f.name,
    f.parent_id,
    f.event_id,
    f.depth,
    f.sort_order,
    f.photo_count,
    f.created_at,
    -- Sharing fields
    f.share_token,
    f.is_published,
    f.published_at,
    f.publish_settings,
    -- Pre-computed URLs for performance
    CASE 
        WHEN f.share_token IS NOT NULL THEN '/f/' || f.share_token
        ELSE NULL 
    END as family_url,
    CASE 
        WHEN f.share_token IS NOT NULL THEN '/api/qr?token=' || f.share_token
        ELSE NULL 
    END as qr_url,
    -- Event info (minimized to reduce JOIN cost)
    e.name as event_name,
    e.date as event_date,
    -- Performance metrics
    COALESCE(f.photo_count, 0) as photos_count, -- Alias for compatibility
    -- Search ranking for full-text search
    ts_rank(to_tsvector('spanish', f.name), plainto_tsquery('spanish', '')) as search_rank
FROM public.folders f
INNER JOIN public.events e ON f.event_id = e.id -- INNER JOIN for better performance
WHERE f.photo_count > 0 OR f.is_published = true; -- Only meaningful folders

-- ============================================================
-- 3. PERFORMANCE FUNCTIONS
-- ============================================================

-- Optimized function for paginated folder listing
CREATE OR REPLACE FUNCTION get_folders_paginated(
    p_event_id uuid DEFAULT NULL,
    p_include_unpublished boolean DEFAULT true,
    p_search text DEFAULT NULL,
    p_page integer DEFAULT 1,
    p_limit integer DEFAULT 20,
    p_order_by text DEFAULT 'published_at_desc'
) RETURNS TABLE (
    id uuid,
    name text,
    event_id uuid,
    photo_count integer,
    is_published boolean,
    share_token text,
    published_at timestamptz,
    family_url text,
    qr_url text,
    event_name text,
    event_date date,
    total_count bigint
) AS $$
DECLARE
    offset_val integer := (p_page - 1) * p_limit;
    order_clause text;
BEGIN
    -- Validate and set order clause
    order_clause := CASE p_order_by
        WHEN 'name_asc' THEN 'f.name ASC'
        WHEN 'name_desc' THEN 'f.name DESC'
        WHEN 'photos_desc' THEN 'f.photo_count DESC, f.name ASC'
        WHEN 'photos_asc' THEN 'f.photo_count ASC, f.name ASC'
        WHEN 'published_asc' THEN 'f.published_at ASC NULLS LAST, f.name ASC'
        ELSE 'f.published_at DESC NULLS LAST, f.name ASC'
    END;

    -- Build and execute optimized query
    RETURN QUERY EXECUTE format('
        WITH folder_data AS (
            SELECT 
                f.id,
                f.name,
                f.event_id,
                f.photo_count,
                f.is_published,
                f.share_token,
                f.published_at,
                CASE 
                    WHEN f.share_token IS NOT NULL THEN ''/f/'' || f.share_token
                    ELSE NULL 
                END as family_url,
                CASE 
                    WHEN f.share_token IS NOT NULL THEN ''/api/qr?token='' || f.share_token
                    ELSE NULL 
                END as qr_url,
                e.name as event_name,
                e.date as event_date
            FROM folders f
            INNER JOIN events e ON f.event_id = e.id
            WHERE 
                ($1 IS NULL OR f.event_id = $1)
                AND ($2 = true OR f.is_published = true)
                AND ($3 IS NULL OR f.name ILIKE ''%%'' || $3 || ''%%'')
                AND f.photo_count > 0
        ),
        total_data AS (
            SELECT count(*) as total_count FROM folder_data
        )
        SELECT 
            fd.*,
            td.total_count
        FROM folder_data fd
        CROSS JOIN total_data td
        ORDER BY %s
        LIMIT $4 OFFSET $5
    ', order_clause)
    USING p_event_id, p_include_unpublished, p_search, p_limit, offset_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. BULK OPERATIONS OPTIMIZATION
-- ============================================================

-- Function for bulk publish with rate limiting
CREATE OR REPLACE FUNCTION bulk_publish_folders(
    p_folder_ids uuid[],
    p_batch_size integer DEFAULT 5,
    p_settings jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE (
    folder_id uuid,
    success boolean,
    share_token text,
    family_url text,
    qr_url text,
    error_message text
) AS $$
DECLARE
    folder_id uuid;
    new_token text;
    batch_count integer := 0;
    processed_count integer := 0;
BEGIN
    -- Validate batch size
    IF p_batch_size > 10 THEN
        p_batch_size := 10; -- Maximum 10 concurrent operations
    END IF;

    -- Process folders in batches
    FOREACH folder_id IN ARRAY p_folder_ids
    LOOP
        BEGIN
            -- Generate unique token
            LOOP
                new_token := encode(gen_random_bytes(16), 'hex');
                EXIT WHEN NOT EXISTS (
                    SELECT 1 FROM folders WHERE share_token = new_token
                    UNION
                    SELECT 1 FROM subjects WHERE token = new_token
                );
            END LOOP;
            
            -- Update folder
            UPDATE folders 
            SET 
                share_token = new_token,
                is_published = true,
                published_at = now(),
                publish_settings = COALESCE(publish_settings, '{}'::jsonb) || p_settings
            WHERE id = folder_id AND photo_count > 0;
            
            IF FOUND THEN
                folder_id := folder_id;
                success := true;
                share_token := new_token;
                family_url := '/f/' || new_token;
                qr_url := '/api/qr?token=' || new_token;
                error_message := NULL;
            ELSE
                folder_id := folder_id;
                success := false;
                share_token := NULL;
                family_url := NULL;
                qr_url := NULL;
                error_message := 'Folder not found or has no photos';
            END IF;
            
            RETURN NEXT;
            
            -- Batch control for performance
            batch_count := batch_count + 1;
            processed_count := processed_count + 1;
            
            -- Small delay every batch to prevent lock contention
            IF batch_count >= p_batch_size THEN
                PERFORM pg_sleep(0.1); -- 100ms delay
                batch_count := 0;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            folder_id := folder_id;
            success := false;
            share_token := NULL;
            family_url := NULL;
            qr_url := NULL;
            error_message := SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. ANALYTICS AND MONITORING
-- ============================================================

-- Function to get folder statistics for monitoring
CREATE OR REPLACE FUNCTION get_folder_publish_stats(p_event_id uuid DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_folders', count(*),
        'published_folders', count(*) FILTER (WHERE is_published = true),
        'unpublished_folders', count(*) FILTER (WHERE is_published = false OR is_published IS NULL),
        'total_photos', sum(COALESCE(photo_count, 0)),
        'published_photos', sum(COALESCE(photo_count, 0)) FILTER (WHERE is_published = true),
        'avg_photos_per_folder', round(avg(COALESCE(photo_count, 0))::numeric, 1),
        'last_published', max(published_at),
        'folders_by_event', jsonb_object_agg(
            COALESCE(e.name, 'No Event'), 
            count(f.id)
        )
    ) INTO result
    FROM folders f
    LEFT JOIN events e ON f.event_id = e.id
    WHERE 
        (p_event_id IS NULL OR f.event_id = p_event_id)
        AND f.photo_count > 0;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. PERMISSIONS AND POLICIES
-- ============================================================

-- Grant permissions on new functions
GRANT EXECUTE ON FUNCTION get_folders_paginated TO service_role;
GRANT EXECUTE ON FUNCTION bulk_publish_folders TO service_role;
GRANT EXECUTE ON FUNCTION get_folder_publish_stats TO service_role;

-- Update RLS policies for better performance
DROP POLICY IF EXISTS "Admins can manage folder sharing" ON folders;
CREATE POLICY "Admins can manage folder sharing" ON folders
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);

-- ============================================================
-- 7. PERFORMANCE MONITORING VIEWS
-- ============================================================

-- View for monitoring query performance
CREATE OR REPLACE VIEW public.folder_performance_metrics AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats 
WHERE tablename = 'folders' 
AND schemaname = 'public';

COMMIT;

-- ============================================================
-- 8. VERIFICATION QUERIES
-- ============================================================

-- Test: Verify indexes were created
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'folders' AND schemaname = 'public';

-- Test: Check function performance
-- SELECT * FROM get_folders_paginated(NULL, true, NULL, 1, 10, 'published_at_desc');

-- Test: Verify statistics function
-- SELECT get_folder_publish_stats();
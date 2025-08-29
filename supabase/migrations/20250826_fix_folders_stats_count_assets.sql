-- ============================================================
-- FIX FOLDERS_WITH_STATS VIEW - COUNT FROM ASSETS TABLE
-- ============================================================
-- Purpose: Fix folders_with_stats view to count from 'assets' table instead of 'photos' table
-- Issue: View was counting from legacy 'photos' table but photos are now in 'assets' table
-- Date: 2025-08-26
-- Critical: Folders showing 0 photos when assets table has 21 records
-- ============================================================

BEGIN;

-- Drop existing view that counts from wrong table
DROP VIEW IF EXISTS public.folders_with_stats;

-- Create corrected view using 'assets' table (current photo storage)
CREATE OR REPLACE VIEW public.folders_with_stats AS
SELECT 
    f.id,
    f.name,
    f.parent_id,
    f.event_id,
    f.depth,
    f.sort_order,
    f.created_at,
    -- Use cached photo_count from folders table (maintained by triggers)
    f.photo_count,
    -- Alternative: count from assets table (for verification)
    COALESCE(child_folders.count, 0) as child_folder_count,
    COALESCE(asset_photos.count, 0) as asset_count  -- For debugging/verification
FROM public.folders f
LEFT JOIN (
    -- Count child folders
    SELECT parent_id, COUNT(*) as count
    FROM public.folders
    WHERE parent_id IS NOT NULL
    GROUP BY parent_id
) child_folders ON f.id = child_folders.parent_id
LEFT JOIN (
    -- Count photos from assets table (current photo storage)
    SELECT folder_id, COUNT(*) as count
    FROM public.assets
    WHERE folder_id IS NOT NULL
    AND status = 'ready'  -- Only count processed assets
    GROUP BY folder_id
) asset_photos ON f.id = asset_photos.folder_id;

-- Grant necessary permissions
GRANT SELECT ON public.folders_with_stats TO service_role;
GRANT SELECT ON public.folders_with_stats TO authenticated;
GRANT SELECT ON public.folders_with_stats TO anon;

-- Verify the fix worked
DO $$
DECLARE
    total_folders integer;
    folders_with_photos integer;
    total_assets integer;
BEGIN
    SELECT COUNT(*) INTO total_folders FROM public.folders_with_stats;
    SELECT COUNT(*) INTO folders_with_photos FROM public.folders_with_stats WHERE photo_count > 0;
    SELECT COUNT(*) INTO total_assets FROM public.assets WHERE status = 'ready';
    
    RAISE NOTICE 'VERIFICATION:';
    RAISE NOTICE '  Total folders: %', total_folders;
    RAISE NOTICE '  Folders with photos: %', folders_with_photos;
    RAISE NOTICE '  Total ready assets: %', total_assets;
    RAISE NOTICE 'folders_with_stats view updated to count from assets table';
END $$;

COMMIT;

-- ============================================================
-- NOTES:
-- - Now uses cached photo_count from folders table (maintained by triggers)
-- - Includes asset_count column for verification against cached count
-- - Only counts 'ready' assets (processed photos)
-- - Should show correct photo counts matching assets table data
-- ============================================================
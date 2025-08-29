-- ============================================================
-- FIX FOLDERS_WITH_STATS VIEW TO USE CORRECT TABLE
-- ============================================================
-- Purpose: Fix folders_with_stats view to use 'folders' table instead of 'event_folders'
-- Date: 2025-08-26
-- Issue: Schema inconsistency causing folder creation failures
-- ============================================================

BEGIN;

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.folders_with_stats;

-- Create corrected view using 'folders' table
CREATE OR REPLACE VIEW public.folders_with_stats AS
SELECT 
    f.*,
    COALESCE(child_folders.count, 0) as child_folder_count,
    COALESCE(child_photos.count, 0) as photo_count
FROM public.folders f
LEFT JOIN (
    SELECT parent_id, COUNT(*) as count
    FROM public.folders
    WHERE parent_id IS NOT NULL
    GROUP BY parent_id
) child_folders ON f.id = child_folders.parent_id
LEFT JOIN (
    SELECT folder_id, COUNT(*) as count
    FROM public.photos
    WHERE folder_id IS NOT NULL
    GROUP BY folder_id
) child_photos ON f.id = child_photos.folder_id;

-- Grant necessary permissions
GRANT SELECT ON public.folders_with_stats TO service_role;
GRANT SELECT ON public.folders_with_stats TO authenticated;

COMMIT;
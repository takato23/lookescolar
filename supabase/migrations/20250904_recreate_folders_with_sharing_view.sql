-- ============================================================
-- Migration: Recreate folders_with_sharing view safely
-- Purpose: Fix 42P16 error (cannot drop columns from view) by dropping and recreating the view
-- Date: 2025-09-04
-- ============================================================

BEGIN;

-- Drop the view to avoid column incompatibility errors on CREATE OR REPLACE
DROP VIEW IF EXISTS public.folders_with_sharing CASCADE;

-- Recreate with the expected definition
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
    -- URLs for easy access
    CASE 
        WHEN f.share_token IS NOT NULL THEN '/f/' || f.share_token
        ELSE NULL 
    END as family_url,
    CASE 
        WHEN f.share_token IS NOT NULL THEN '/api/qr?token=' || f.share_token
        ELSE NULL 
    END as qr_url,
    -- Event info
    e.name as event_name,
    e.date as event_date
FROM public.folders f
LEFT JOIN public.events e ON f.event_id = e.id;

-- Grant permissions
GRANT SELECT ON public.folders_with_sharing TO service_role;
GRANT SELECT ON public.folders_with_sharing TO authenticated;

COMMIT;

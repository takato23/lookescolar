-- ============================================================
-- FOLDER SHARING SYSTEM - Seamless Integration
-- ============================================================
-- Purpose: Add sharing capabilities to existing folders table
-- Compatible with: Current PhotoAdmin and family access system
-- Date: 2025-08-26
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Add sharing columns to existing folders table
-- ============================================================
ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS publish_settings jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS published_at timestamptz NULL;

-- Index for fast token lookups (critical for family access)
CREATE INDEX IF NOT EXISTS idx_folders_share_token ON public.folders(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folders_published ON public.folders(is_published, published_at) WHERE is_published = true;

-- ============================================================
-- 2. Token generation function
-- ============================================================
CREATE OR REPLACE FUNCTION generate_folder_share_token()
RETURNS text AS $$
BEGIN
    -- Generate 32 character hex token (same format as existing system)
    RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Folder publishing function
-- ============================================================
CREATE OR REPLACE FUNCTION publish_folder(folder_uuid uuid)
RETURNS jsonb AS $$
DECLARE
    new_token text;
    folder_record record;
    result jsonb;
BEGIN
    -- Generate unique token
    LOOP
        new_token := generate_folder_share_token();
        -- Check if token already exists (very unlikely but safe)
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM folders WHERE share_token = new_token
            UNION
            SELECT 1 FROM subjects WHERE token = new_token
            UNION  
            SELECT 1 FROM codes WHERE token = new_token
        );
    END LOOP;
    
    -- Update folder with sharing info
    UPDATE public.folders 
    SET 
        share_token = new_token,
        is_published = true,
        published_at = now(),
        publish_settings = COALESCE(publish_settings, '{}'::jsonb) || jsonb_build_object(
            'published_by', current_setting('request.jwt.claims.sub', true),
            'publish_method', 'folder_share'
        )
    WHERE id = folder_uuid
    RETURNING * INTO folder_record;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Folder not found: %', folder_uuid;
    END IF;
    
    -- Return result
    result := jsonb_build_object(
        'success', true,
        'folder_id', folder_record.id,
        'share_token', folder_record.share_token,
        'url', '/f/' || folder_record.share_token,
        'qr_url', '/api/qr?token=' || folder_record.share_token,
        'published_at', folder_record.published_at
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. Unpublish folder function
-- ============================================================
CREATE OR REPLACE FUNCTION unpublish_folder(folder_uuid uuid)
RETURNS jsonb AS $$
DECLARE
    folder_record record;
BEGIN
    UPDATE public.folders 
    SET 
        share_token = NULL,
        is_published = false,
        published_at = NULL,
        publish_settings = COALESCE(publish_settings, '{}'::jsonb) || jsonb_build_object(
            'unpublished_at', now(),
            'unpublished_by', current_setting('request.jwt.claims.sub', true)
        )
    WHERE id = folder_uuid
    RETURNING * INTO folder_record;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Folder not found: %', folder_uuid;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'folder_id', folder_record.id,
        'unpublished_at', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. Enhanced view for admin interface
-- ============================================================
CREATE OR REPLACE VIEW public.folders_with_sharing AS
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

-- ============================================================
-- 6. RLS Policies for sharing
-- ============================================================

-- Admins can manage all folder sharing
CREATE POLICY "Admins can manage folder sharing" ON folders
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);

-- Families can view published folders (for future direct access if needed)
CREATE POLICY "Public can view published folder metadata" ON folders
FOR SELECT USING (is_published = true);

-- Grant permissions on new view
GRANT SELECT ON public.folders_with_sharing TO service_role;
GRANT SELECT ON public.folders_with_sharing TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION generate_folder_share_token() TO service_role;
GRANT EXECUTE ON FUNCTION publish_folder(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION unpublish_folder(uuid) TO service_role;

COMMIT;

-- ============================================================
-- 7. Verification queries (for testing)
-- ============================================================

-- Test: Check if migration worked
-- SELECT 'Migration completed successfully' as status;

-- Test: Verify new columns exist
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'folders' 
-- AND column_name IN ('share_token', 'is_published', 'publish_settings', 'published_at');

-- Test: Verify functions exist
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name LIKE '%folder%';
-- ============================================================
-- RLS Policies for Photo Gallery MVP
-- Purpose: Secure access control for unified photo management
-- Date: 2024-03-15
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FOLDERS POLICIES
-- ============================================================

-- Admin: Full access to all folders
CREATE POLICY "Admin can manage all folders" ON folders
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'user_role' = 'admin'
    );

-- Public: No direct folder access (access through tokens only)
CREATE POLICY "No public folder access" ON folders
    FOR SELECT USING (false);

-- ============================================================
-- ASSETS POLICIES  
-- ============================================================

-- Admin: Full access to all assets
CREATE POLICY "Admin can manage all assets" ON assets
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'user_role' = 'admin'
    );

-- Public: Can view assets that are in albums they have token access to
CREATE POLICY "Public can view assets through valid tokens" ON assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM album_assets aa
            JOIN access_tokens at ON aa.album_id = at.album_id
            WHERE aa.asset_id = assets.id
                AND at.token = current_setting('app.current_token', true)
                AND at.expires_at > NOW()
                AND assets.status = 'ready'
                AND assets.approved = true
        )
    );

-- ============================================================
-- ALBUMS POLICIES
-- ============================================================

-- Admin: Full access to all albums
CREATE POLICY "Admin can manage all albums" ON albums
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'user_role' = 'admin'
    );

-- Public: Can view albums they have token access to
CREATE POLICY "Public can view albums through valid tokens" ON albums
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM access_tokens at
            WHERE at.album_id = albums.id
                AND at.token = current_setting('app.current_token', true)
                AND at.expires_at > NOW()
        )
    );

-- ============================================================
-- ALBUM_ASSETS POLICIES
-- ============================================================

-- Admin: Full access to all album-asset relationships
CREATE POLICY "Admin can manage all album assets" ON album_assets
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'user_role' = 'admin'
    );

-- Public: Can view album-asset relationships for albums they have access to
CREATE POLICY "Public can view album assets through valid tokens" ON album_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM access_tokens at
            WHERE at.album_id = album_assets.album_id
                AND at.token = current_setting('app.current_token', true)
                AND at.expires_at > NOW()
        )
    );

-- ============================================================
-- ACCESS_TOKENS POLICIES
-- ============================================================

-- Admin: Full access to all tokens
CREATE POLICY "Admin can manage all access tokens" ON access_tokens
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'user_role' = 'admin'
    );

-- Public: Can only view their own valid tokens (for validation)
CREATE POLICY "Public can validate their own tokens" ON access_tokens
    FOR SELECT USING (
        token = current_setting('app.current_token', true)
        AND expires_at > NOW()
    );

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

-- Originals bucket: Admin only
CREATE POLICY "Admin only access to originals" ON storage.objects
    FOR ALL USING (
        bucket_id = 'originals' AND (
            auth.jwt() ->> 'role' = 'admin' OR
            auth.jwt() ->> 'user_role' = 'admin'
        )
    );

-- Previews bucket: Admin full access, public read for valid tokens
CREATE POLICY "Admin full access to previews" ON storage.objects
    FOR ALL USING (
        bucket_id = 'previews' AND (
            auth.jwt() ->> 'role' = 'admin' OR
            auth.jwt() ->> 'user_role' = 'admin'
        )
    );

CREATE POLICY "Public read access to previews with valid token" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'previews' AND
        EXISTS (
            SELECT 1 FROM assets a
            JOIN album_assets aa ON a.id = aa.asset_id
            JOIN access_tokens at ON aa.album_id = at.album_id
            WHERE a.preview_path = storage.objects.name
                AND at.token = current_setting('app.current_token', true)
                AND at.expires_at > NOW()
                AND a.status = 'ready'
                AND a.approved = true
        )
    );

-- ============================================================
-- HELPER FUNCTIONS FOR TOKEN VALIDATION
-- ============================================================

-- Function to set current token for session
CREATE OR REPLACE FUNCTION set_current_token(token_value TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_token', token_value, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and set token with access count increment
CREATE OR REPLACE FUNCTION validate_and_use_token(token_value TEXT)
RETURNS TABLE(
    valid BOOLEAN,
    album_id UUID,
    album_name TEXT,
    expires_at TIMESTAMPTZ,
    remaining_access INTEGER
) AS $$
DECLARE
    token_record access_tokens%ROWTYPE;
    album_record albums%ROWTYPE;
BEGIN
    -- Find the token
    SELECT * INTO token_record
    FROM access_tokens
    WHERE token = token_value
        AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 0;
        RETURN;
    END IF;
    
    -- Check access limit
    IF token_record.max_access_count IS NOT NULL 
       AND token_record.access_count >= token_record.max_access_count THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 0;
        RETURN;
    END IF;
    
    -- Get album info
    SELECT * INTO album_record
    FROM albums
    WHERE id = token_record.album_id;
    
    -- Increment access count
    UPDATE access_tokens
    SET access_count = access_count + 1
    WHERE id = token_record.id;
    
    -- Set token for session
    PERFORM set_config('app.current_token', token_value, true);
    
    -- Return success
    RETURN QUERY SELECT 
        true,
        album_record.id,
        album_record.name,
        token_record.expires_at,
        CASE 
            WHEN token_record.max_access_count IS NULL THEN -1
            ELSE token_record.max_access_count - (token_record.access_count + 1)
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get album assets for valid token
CREATE OR REPLACE FUNCTION get_album_assets_by_token(token_value TEXT)
RETURNS TABLE(
    asset_id UUID,
    filename TEXT,
    preview_path TEXT,
    watermark_path TEXT,
    width INTEGER,
    height INTEGER,
    sort_order INTEGER
) AS $$
BEGIN
    -- Validate token first
    IF NOT EXISTS (
        SELECT 1 FROM access_tokens
        WHERE token = token_value
            AND expires_at > NOW()
    ) THEN
        RETURN;
    END IF;
    
    -- Set token for session
    PERFORM set_config('app.current_token', token_value, true);
    
    -- Return assets
    RETURN QUERY
    SELECT 
        a.id,
        a.filename,
        a.preview_path,
        a.watermark_path,
        a.width,
        a.height,
        aa.sort_order
    FROM assets a
    JOIN album_assets aa ON a.id = aa.asset_id
    JOIN access_tokens at ON aa.album_id = at.album_id
    WHERE at.token = token_value
        AND at.expires_at > NOW()
        AND a.status = 'ready'
        AND a.approved = true
    ORDER BY aa.sort_order, a.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ADMIN HELPER FUNCTIONS
-- ============================================================

-- Function to create album with assets
CREATE OR REPLACE FUNCTION create_album_with_assets(
    album_name TEXT,
    folder_id_param UUID,
    asset_ids UUID[],
    watermark_text_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_album_id UUID;
    asset_id UUID;
    sort_counter INTEGER := 0;
BEGIN
    -- Check admin permissions
    IF NOT (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'user_role' = 'admin') THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;
    
    -- Create album
    INSERT INTO albums (name, folder_id, watermark_text)
    VALUES (album_name, folder_id_param, watermark_text_param)
    RETURNING id INTO new_album_id;
    
    -- Add assets to album
    FOREACH asset_id IN ARRAY asset_ids LOOP
        INSERT INTO album_assets (album_id, asset_id, sort_order)
        VALUES (new_album_id, asset_id, sort_counter);
        sort_counter := sort_counter + 1;
    END LOOP;
    
    RETURN new_album_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate access token
CREATE OR REPLACE FUNCTION generate_access_token(
    album_id_param UUID,
    expires_days INTEGER DEFAULT 30,
    max_access INTEGER DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    new_token TEXT;
BEGIN
    -- Check admin permissions
    IF NOT (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'user_role' = 'admin') THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;
    
    -- Generate secure token
    new_token := encode(gen_random_bytes(32), 'hex');
    
    -- Insert token
    INSERT INTO access_tokens (token, album_id, expires_at, max_access_count)
    VALUES (
        new_token, 
        album_id_param, 
        NOW() + (expires_days || ' days')::INTERVAL,
        max_access
    );
    
    RETURN new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- Grant access to tables for authenticated users (admins)
GRANT ALL ON folders TO authenticated;
GRANT ALL ON assets TO authenticated;
GRANT ALL ON albums TO authenticated;
GRANT ALL ON album_assets TO authenticated;
GRANT ALL ON access_tokens TO authenticated;

-- Grant read access to views
GRANT SELECT ON folders_with_stats TO authenticated, anon;
GRANT SELECT ON albums_with_stats TO authenticated, anon;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION set_current_token(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_and_use_token(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_album_assets_by_token(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_album_with_assets(TEXT, UUID, UUID[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_access_token(UUID, INTEGER, INTEGER) TO authenticated;
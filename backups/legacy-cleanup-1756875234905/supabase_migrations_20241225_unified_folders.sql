-- Migration: Unified Folders System
-- Converts event_folders to unified folder hierarchy
-- Date: 2024-12-25
-- Version: v2.0.0

BEGIN;

-- Create unified folders table
CREATE TABLE IF NOT EXISTS public.folders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    path text GENERATED ALWAYS AS (
        CASE 
            WHEN parent_id IS NULL THEN name
            ELSE name -- Will be computed by trigger for full path
        END
    ) STORED,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    
    -- Constraints
    CONSTRAINT folders_name_not_empty CHECK (length(name) > 0),
    CONSTRAINT folders_no_self_reference CHECK (id != parent_id)
);

-- Create assets table (replaces photos for unified system)
CREATE TABLE IF NOT EXISTS public.assets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
    filename text NOT NULL,
    original_path text NOT NULL,
    preview_path text,
    checksum text NOT NULL,
    file_size bigint NOT NULL,
    mime_type text NOT NULL,
    dimensions jsonb, -- { width: number, height: number }
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    
    -- Constraints
    CONSTRAINT assets_filename_not_empty CHECK (length(filename) > 0),
    CONSTRAINT assets_checksum_not_empty CHECK (length(checksum) > 0)
);

-- Create albums table (for public access)
CREATE TABLE IF NOT EXISTS public.albums (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    folder_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
    watermark_text text,
    is_public boolean DEFAULT false,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    
    CONSTRAINT albums_name_not_empty CHECK (length(name) > 0)
);

-- Create album_assets junction table
CREATE TABLE IF NOT EXISTS public.album_assets (
    album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    position integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    
    PRIMARY KEY (album_id, asset_id)
);

-- Create access_tokens table (for public album access)
CREATE TABLE IF NOT EXISTS public.access_tokens (
    token text PRIMARY KEY,
    album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    usage_count integer DEFAULT 0,
    max_usage integer,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT access_tokens_token_not_empty CHECK (length(token) > 0),
    CONSTRAINT access_tokens_expires_future CHECK (expires_at > now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS folders_parent_id_idx ON public.folders(parent_id);
CREATE INDEX IF NOT EXISTS folders_event_id_idx ON public.folders(event_id);
CREATE INDEX IF NOT EXISTS folders_path_idx ON public.folders USING gin(path gin_trgm_ops);

CREATE INDEX IF NOT EXISTS assets_folder_id_idx ON public.assets(folder_id);
CREATE INDEX IF NOT EXISTS assets_checksum_idx ON public.assets(checksum);
CREATE INDEX IF NOT EXISTS assets_status_idx ON public.assets(status) WHERE status != 'ready';
CREATE INDEX IF NOT EXISTS assets_created_at_idx ON public.assets(created_at DESC);

CREATE INDEX IF NOT EXISTS albums_folder_id_idx ON public.albums(folder_id);
CREATE INDEX IF NOT EXISTS albums_is_public_idx ON public.albums(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS album_assets_album_id_idx ON public.album_assets(album_id);
CREATE INDEX IF NOT EXISTS album_assets_position_idx ON public.album_assets(album_id, position);

CREATE INDEX IF NOT EXISTS access_tokens_album_id_idx ON public.access_tokens(album_id);
CREATE INDEX IF NOT EXISTS access_tokens_expires_at_idx ON public.access_tokens(expires_at) WHERE expires_at > now();

-- RLS Policies

-- Folders: Admin full access, public no access
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage folders"
ON public.folders
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Assets: Admin full access, public can only read via albums
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage assets"
ON public.assets
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Public can read assets in public albums"
ON public.assets
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.album_assets aa
        JOIN public.albums a ON aa.album_id = a.id
        WHERE aa.asset_id = assets.id
        AND a.is_public = true
    )
);

-- Albums: Admin manages, public can read public ones
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage albums"
ON public.albums
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Public can read public albums"
ON public.albums
FOR SELECT
TO anon
USING (is_public = true);

-- Album_assets: Admin manages, public can read public ones
ALTER TABLE public.album_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage album assets"
ON public.album_assets
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Public can read public album assets"
ON public.album_assets
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.albums
        WHERE albums.id = album_assets.album_id
        AND albums.is_public = true
    )
);

-- Access_tokens: Admin manages, anon can read unexpired ones
ALTER TABLE public.access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage access tokens"
ON public.access_tokens
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Anyone can read unexpired tokens"
ON public.access_tokens
FOR SELECT
TO anon
USING (expires_at > now());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER folders_updated_at
    BEFORE UPDATE ON public.folders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER assets_updated_at
    BEFORE UPDATE ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER albums_updated_at
    BEFORE UPDATE ON public.albums
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to compute folder path
CREATE OR REPLACE FUNCTION public.compute_folder_path(folder_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    result text := '';
    current_folder record;
    parent_folder record;
BEGIN
    -- Get current folder
    SELECT * INTO current_folder FROM public.folders WHERE id = folder_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- If no parent, return just the name
    IF current_folder.parent_id IS NULL THEN
        RETURN current_folder.name;
    END IF;
    
    -- Build path recursively
    WITH RECURSIVE folder_path AS (
        -- Base case: current folder
        SELECT id, name, parent_id, 0 as level
        FROM public.folders
        WHERE id = folder_id
        
        UNION ALL
        
        -- Recursive case: parent folders
        SELECT f.id, f.name, f.parent_id, fp.level + 1
        FROM public.folders f
        INNER JOIN folder_path fp ON f.id = fp.parent_id
    )
    SELECT string_agg(name, ' > ' ORDER BY level DESC)
    INTO result
    FROM folder_path;
    
    RETURN result;
END;
$$;

-- Trigger to update path when folder changes
CREATE OR REPLACE FUNCTION public.update_folder_paths()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update path for current folder
    NEW.path = public.compute_folder_path(NEW.id);
    
    -- Update paths for all descendant folders
    WITH RECURSIVE descendants AS (
        SELECT id FROM public.folders WHERE parent_id = NEW.id
        UNION ALL
        SELECT f.id FROM public.folders f
        INNER JOIN descendants d ON f.parent_id = d.id
    )
    UPDATE public.folders
    SET path = public.compute_folder_path(id)
    WHERE id IN (SELECT id FROM descendants);
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER folders_update_path
    BEFORE INSERT OR UPDATE OF name, parent_id ON public.folders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_folder_paths();

COMMIT;
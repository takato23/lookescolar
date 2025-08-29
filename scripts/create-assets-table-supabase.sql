-- ============================================================
-- CREATE ASSETS TABLE FOR SUPABASE
-- Execute this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Create the assets table (replaces photos for unified system)
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
    created_by uuid REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT assets_filename_not_empty CHECK (length(filename) > 0),
    CONSTRAINT assets_checksum_not_empty CHECK (length(checksum) > 0),
    CONSTRAINT assets_file_size_positive CHECK (file_size > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS assets_folder_id_idx ON public.assets(folder_id);
CREATE INDEX IF NOT EXISTS assets_checksum_idx ON public.assets(checksum);
CREATE INDEX IF NOT EXISTS assets_status_idx ON public.assets(status) WHERE status != 'ready';
CREATE INDEX IF NOT EXISTS assets_created_at_idx ON public.assets(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for assets
CREATE POLICY "Enable read access for all users" ON public.assets
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.assets
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.assets
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.assets
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;

-- Insert some test data for the existing folder
INSERT INTO public.assets (
    folder_id,
    filename,
    original_path,
    preview_path,
    checksum,
    file_size,
    mime_type,
    status
) VALUES (
    '1d4fe778-f4fa-4d11-8b8e-647f63a485d2',
    'test-photo-1.jpg',
    '/storage/originals/test-photo-1.jpg',
    '/storage/previews/test-photo-1.jpg',
    'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef12',
    1024000,
    'image/jpeg',
    'ready'
), (
    '1d4fe778-f4fa-4d11-8b8e-647f63a485d2',
    'test-photo-2.jpg',
    '/storage/originals/test-photo-2.jpg',
    '/storage/previews/test-photo-2.jpg',
    'def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef123456ab',
    2048000,
    'image/jpeg',
    'ready'
) ON CONFLICT DO NOTHING;

-- Verify the creation
SELECT 
    'assets' as table_name,
    count(*) as record_count,
    array_agg(DISTINCT status) as statuses
FROM public.assets
WHERE folder_id = '1d4fe778-f4fa-4d11-8b8e-647f63a485d2';




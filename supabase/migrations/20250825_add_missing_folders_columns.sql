-- Migration: Add missing depth and sort_order columns to folders table
-- Date: 2025-08-25
-- Fixes API errors where columns are expected but don't exist

BEGIN;

-- Add missing columns to folders table
ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS depth INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS description text;

-- Add constraints
ALTER TABLE public.folders 
ADD CONSTRAINT IF NOT EXISTS folder_depth_limit CHECK (depth >= 0 AND depth <= 10),
ADD CONSTRAINT IF NOT EXISTS sort_order_non_negative CHECK (sort_order >= 0);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_sort_order ON public.folders(parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_folders_depth ON public.folders(depth) WHERE depth > 0;

-- Function to calculate and update folder depths
CREATE OR REPLACE FUNCTION public.calculate_folder_depth(folder_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    current_depth integer := 0;
    parent_id_val uuid;
BEGIN
    -- Get parent_id of current folder
    SELECT parent_id INTO parent_id_val 
    FROM public.folders 
    WHERE id = folder_id;
    
    -- If no parent, depth is 0
    IF parent_id_val IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate depth recursively
    WITH RECURSIVE parent_chain AS (
        -- Base case: start with the folder
        SELECT id, parent_id, 0 as level
        FROM public.folders
        WHERE id = folder_id
        
        UNION ALL
        
        -- Recursive case: get parent folders
        SELECT f.id, f.parent_id, pc.level + 1
        FROM public.folders f
        INNER JOIN parent_chain pc ON f.id = pc.parent_id
        WHERE pc.level < 10  -- Prevent infinite recursion
    )
    SELECT MAX(level) INTO current_depth
    FROM parent_chain;
    
    RETURN COALESCE(current_depth, 0);
END;
$$;

-- Update existing folders with correct depths
UPDATE public.folders 
SET depth = public.calculate_folder_depth(id)
WHERE depth != public.calculate_folder_depth(id);

-- Enhanced trigger to update depth when folder structure changes
CREATE OR REPLACE FUNCTION public.update_folder_depth_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    new_depth integer;
BEGIN
    -- Calculate new depth
    new_depth := public.calculate_folder_depth(NEW.id);
    NEW.depth := new_depth;
    
    -- Check depth limit
    IF new_depth > 10 THEN
        RAISE EXCEPTION 'Folder depth limit exceeded (maximum 10 levels)';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for depth updates
DROP TRIGGER IF EXISTS folders_depth_update ON public.folders;
CREATE TRIGGER folders_depth_update
    BEFORE INSERT OR UPDATE OF parent_id ON public.folders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_folder_depth_trigger();

-- Update any child folders when parent changes
CREATE OR REPLACE FUNCTION public.update_child_folders_depth()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update all descendant folders' depths
    WITH RECURSIVE descendants AS (
        -- Direct children
        SELECT id FROM public.folders 
        WHERE parent_id = NEW.id
        
        UNION ALL
        
        -- Nested children
        SELECT f.id FROM public.folders f
        INNER JOIN descendants d ON f.parent_id = d.id
    )
    UPDATE public.folders 
    SET depth = public.calculate_folder_depth(id)
    WHERE id IN (SELECT id FROM descendants);
    
    RETURN NEW;
END;
$$;

-- Create trigger for updating child depths
DROP TRIGGER IF EXISTS folders_update_child_depths ON public.folders;
CREATE TRIGGER folders_update_child_depths
    AFTER INSERT OR UPDATE OF parent_id ON public.folders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_child_folders_depth();

COMMIT;
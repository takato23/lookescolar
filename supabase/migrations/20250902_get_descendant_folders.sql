-- Returns all descendant folder IDs (including the folder itself)
CREATE OR REPLACE FUNCTION public.get_descendant_folders(p_folder_id uuid)
RETURNS TABLE(id uuid) AS $$
  WITH RECURSIVE descendants AS (
    SELECT f.id
    FROM public.folders f
    WHERE f.id = p_folder_id
    UNION ALL
    SELECT c.id
    FROM public.folders c
    JOIN descendants d ON c.parent_id = d.id
  )
  SELECT id FROM descendants;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION public.get_descendant_folders(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_descendant_folders(uuid) TO anon;

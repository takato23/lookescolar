-- ============================================================
-- Function: get_folder_subtree_photo_counts
-- Purpose: Return total photo counts (status='ready') for each folder id
--          including all descendant folders.
-- Date: 2025-09-05
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_folder_subtree_photo_counts(p_folder_ids uuid[])
RETURNS TABLE(folder_id uuid, total_photos bigint) AS $$
  WITH roots AS (
    SELECT unnest(p_folder_ids) AS folder_id
  ),
  descendants AS (
    -- For each root, get all descendants (including root)
    SELECT r.folder_id AS root_id, f.id AS folder_id
    FROM roots r
    JOIN LATERAL (
      SELECT d.id
      FROM public.get_descendant_folders(r.folder_id) d
      UNION ALL
      SELECT r.folder_id
    ) f ON TRUE
  ),
  counts AS (
    SELECT d.root_id AS folder_id, COUNT(a.id) AS total
    FROM descendants d
    JOIN public.assets a ON a.folder_id = d.folder_id
    WHERE a.status = 'ready'
    GROUP BY d.root_id
  )
  SELECT roots.folder_id, COALESCE(counts.total, 0) AS total_photos
  FROM roots
  LEFT JOIN counts ON counts.folder_id = roots.folder_id;
$$ LANGUAGE sql STABLE PARALLEL SAFE;

GRANT EXECUTE ON FUNCTION public.get_folder_subtree_photo_counts(uuid[]) TO authenticated, anon;

COMMIT;


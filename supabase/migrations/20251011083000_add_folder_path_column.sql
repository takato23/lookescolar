-- ============================================================================
-- Migration: Ensure folders.path exists for hierarchical sharing
-- Date: 2025-10-11
-- Purpose: Add the `path` column to `public.folders` when missing and backfill
--          values so later migrations (e.g. sharing scopes) can index it.
-- ============================================================================

BEGIN;

-- 1) Add column if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'folders'
      AND column_name = 'path'
  )
  THEN
    ALTER TABLE public.folders
      ADD COLUMN path text;
  END IF;
END $$;

-- 2) Backfill hierarchical paths using parent relationships when available
WITH RECURSIVE folder_tree AS (
  SELECT
    f.id,
    f.parent_id,
    f.name,
    f.id::text AS id_text,
    COALESCE(NULLIF(trim(f.name), ''), f.id::text) AS segment,
    COALESCE(NULLIF(trim(f.name), ''), f.id::text) AS path
  FROM public.folders f
  WHERE f.parent_id IS NULL

  UNION ALL

  SELECT
    child.id,
    child.parent_id,
    child.name,
    child.id::text AS id_text,
    COALESCE(NULLIF(trim(child.name), ''), child.id::text) AS segment,
    parent.path || ' / ' || COALESCE(NULLIF(trim(child.name), ''), child.id::text) AS path
  FROM public.folders child
  JOIN folder_tree parent ON child.parent_id = parent.id
)
UPDATE public.folders f
SET path = folder_tree.path
FROM folder_tree
WHERE f.id = folder_tree.id
  AND (f.path IS NULL OR f.path = '');

-- 3) Fallback: ensure every folder has at least some path value
UPDATE public.folders
SET path = COALESCE(NULLIF(path, ''), COALESCE(NULLIF(name, ''), id::text));

COMMIT;

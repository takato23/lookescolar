-- ============================================================
-- Migration: Fix share_tokens.folder_id foreign key to folders
-- Purpose: Ensure share_tokens.folder_id references public.folders(id)
--          instead of legacy event_folders. Keeps data as-is.
-- Date: 2025-09-02
-- ============================================================

BEGIN;

-- 0) Create table if missing with expected columns
CREATE TABLE IF NOT EXISTS public.share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  folder_id UUID NULL,
  photo_ids UUID[] DEFAULT '{}',
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NULL,
  max_views INTEGER NULL,
  view_count INTEGER DEFAULT 0,
  allow_download BOOLEAN DEFAULT false,
  allow_comments BOOLEAN DEFAULT false,
  share_type TEXT CHECK (share_type IN ('folder','photos','event')) DEFAULT 'event',
  title TEXT NULL,
  description TEXT NULL,
  password_hash TEXT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1) Ensure column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'share_tokens' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE public.share_tokens
      ADD COLUMN folder_id UUID NULL;
  END IF;
END $$;

-- 2) Drop existing FK on share_tokens.folder_id if it references legacy table
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT c.conname INTO fk_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
  WHERE t.relname = 'share_tokens'
    AND a.attname = 'folder_id'
    AND c.contype = 'f';

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.share_tokens DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

-- 3) Add new FK to public.folders(id)
ALTER TABLE public.share_tokens
  ADD CONSTRAINT share_tokens_folder_id_fkey
  FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE CASCADE;

-- 4) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_share_tokens_folder ON public.share_tokens(folder_id);

COMMIT;

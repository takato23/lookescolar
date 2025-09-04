-- ============================================================
-- Migration: Unify share_tokens schema with API expectations
-- Purpose: Ensure columns used by /api/admin/share exist and are consistent
-- Date: 2025-09-02
-- ============================================================

BEGIN;

-- 1) Add missing columns used by the share service/endpoint
ALTER TABLE public.share_tokens
  ADD COLUMN IF NOT EXISTS share_type text CHECK (share_type IN ('folder','photos','event')) DEFAULT 'event',
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS max_views integer,
  ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_download boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_comments boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2) Backfill view counters from legacy columns if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'share_tokens' AND column_name = 'access_count'
  ) THEN
    EXECUTE 'UPDATE public.share_tokens SET view_count = COALESCE(view_count, access_count)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'share_tokens' AND column_name = 'max_access_count'
  ) THEN
    EXECUTE 'UPDATE public.share_tokens SET max_views = COALESCE(max_views, max_access_count)';
  END IF;
END $$;

-- 3) Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_share_tokens_active ON public.share_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_share_tokens_event ON public.share_tokens(event_id);

-- 4) RLS is managed by prior migrations; keep permissions consistent
GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_tokens TO authenticated;
GRANT SELECT ON public.share_tokens TO anon;

COMMIT;

-- Verification (optional)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name='share_tokens';


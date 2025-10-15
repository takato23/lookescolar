-- ============================================================================
-- Migration: Sharing System Scope & Audience Foundations
-- Date: 2025-10-11
-- Purpose: Introduce scope_config, share audiences, and precalculated contents
-- ============================================================================

BEGIN;

-- 1) Scope metadata on share tokens
ALTER TABLE public.share_tokens
  ADD COLUMN IF NOT EXISTS scope_config jsonb;

UPDATE public.share_tokens st
SET scope_config = jsonb_build_object(
    'scope',
    CASE
      WHEN st.share_type = 'folder' THEN 'folder'
      WHEN st.share_type = 'photos' THEN 'selection'
      ELSE 'event'
    END,
    'anchor_id',
    CASE
      WHEN st.share_type = 'folder' AND st.folder_id IS NOT NULL THEN st.folder_id
      ELSE st.event_id
    END,
    'include_descendants', false,
    'filters',
    CASE
      WHEN st.share_type = 'photos' AND st.photo_ids IS NOT NULL THEN jsonb_build_object('photo_ids', st.photo_ids)
      ELSE '{}'::jsonb
    END
  )
WHERE st.scope_config IS NULL;

ALTER TABLE public.share_tokens
  ALTER COLUMN scope_config SET DEFAULT '{}'::jsonb,
  ALTER COLUMN scope_config SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_share_tokens_scope_gin
  ON public.share_tokens USING gin (scope_config);

-- 2) Scope metadata on public access tokens (if table exists)
ALTER TABLE public.public_access_tokens
  ADD COLUMN IF NOT EXISTS scope_config jsonb;

UPDATE public.public_access_tokens pat
SET scope_config = COALESCE(
    pat.scope_config,
    (SELECT st.scope_config
     FROM public.share_tokens st
     WHERE st.public_access_token_id = pat.id
     LIMIT 1),
    '{}'::jsonb
  );

ALTER TABLE public.public_access_tokens
  ALTER COLUMN scope_config SET DEFAULT '{}'::jsonb,
  ALTER COLUMN scope_config SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_public_access_tokens_scope_gin
  ON public.public_access_tokens USING gin (scope_config);

-- 3) Audience registry
CREATE TABLE IF NOT EXISTS public.share_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token_id uuid NOT NULL REFERENCES public.share_tokens(id) ON DELETE CASCADE,
  audience_type text NOT NULL CHECK (audience_type IN ('family','group','manual')),
  subject_id uuid,
  contact_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','scheduled','sent','failed','cancelled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_audiences_token
  ON public.share_audiences (share_token_id);

CREATE INDEX IF NOT EXISTS idx_share_audiences_status
  ON public.share_audiences (status);

DROP TRIGGER IF EXISTS set_share_audiences_updated_at ON public.share_audiences;
CREATE TRIGGER set_share_audiences_updated_at
  BEFORE UPDATE ON public.share_audiences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Precalculated share contents (optional per token)
CREATE TABLE IF NOT EXISTS public.share_token_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token_id uuid NOT NULL REFERENCES public.share_tokens(id) ON DELETE CASCADE,
  photo_id uuid NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_share_token_contents_unique
  ON public.share_token_contents (share_token_id, photo_id);

CREATE INDEX IF NOT EXISTS idx_share_token_contents_photo
  ON public.share_token_contents (photo_id);

-- 5) Folder path index to speed descendant lookups
CREATE INDEX IF NOT EXISTS idx_folders_path_prefix
  ON public.folders (path text_pattern_ops);

COMMIT;

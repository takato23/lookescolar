-- ============================================================
-- Migration: Add subject_id to share_tokens for family-scoped filtering
-- Purpose: Enable server-side filtering of assets per family/student
-- Date: 2025-09-02
-- ============================================================

BEGIN;

ALTER TABLE public.share_tokens
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_share_tokens_subject ON public.share_tokens(subject_id);

COMMIT;


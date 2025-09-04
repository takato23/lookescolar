-- ============================================================
-- Migration: Share Favorites (Proofing MVP)
-- Purpose: Allow visitors (by share token) to mark favorite assets
-- Date: 2025-09-02
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.share_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token_id UUID NOT NULL REFERENCES public.share_tokens(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (share_token_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_share_favorites_token ON public.share_favorites(share_token_id);
CREATE INDEX IF NOT EXISTS idx_share_favorites_asset ON public.share_favorites(asset_id);

COMMIT;


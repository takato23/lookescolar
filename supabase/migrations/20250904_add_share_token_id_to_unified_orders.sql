-- Add share_token_id to unified_orders for unified analytics
BEGIN;
ALTER TABLE unified_orders
  ADD COLUMN IF NOT EXISTS share_token_id UUID REFERENCES share_tokens(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_unified_orders_share_token_id ON unified_orders(share_token_id);
COMMIT;

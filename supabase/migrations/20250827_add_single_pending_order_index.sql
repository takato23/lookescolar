-- Enforce single pending order per subject to mitigate race conditions in checkout
-- Safe to run multiple times thanks to IF NOT EXISTS

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_single_pending
ON orders (subject_id)
WHERE status = 'pending';

COMMENT ON INDEX idx_orders_single_pending IS 'Ensure at most one pending order per subject';





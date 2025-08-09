-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE egress_metrics ENABLE ROW LEVEL SECURITY;

-- Important: Since we're using service role from API routes,
-- we'll create restrictive policies that only allow service role access
-- No direct client access is allowed

-- Events policies (admin only via service role)
CREATE POLICY "Service role full access on events"
  ON events
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Subjects policies
CREATE POLICY "Service role full access on subjects"
  ON subjects
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Subject tokens policies
CREATE POLICY "Service role full access on subject_tokens"
  ON subject_tokens
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Photos policies
CREATE POLICY "Service role full access on photos"
  ON photos
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Price lists policies
CREATE POLICY "Service role full access on price_lists"
  ON price_lists
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Price list items policies
CREATE POLICY "Service role full access on price_list_items"
  ON price_list_items
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Orders policies
CREATE POLICY "Service role full access on orders"
  ON orders
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Order items policies
CREATE POLICY "Service role full access on order_items"
  ON order_items
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Email templates policies
CREATE POLICY "Service role full access on email_templates"
  ON email_templates
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Email queue policies
CREATE POLICY "Service role full access on email_queue"
  ON email_queue
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Egress metrics policies
CREATE POLICY "Service role full access on egress_metrics"
  ON egress_metrics
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
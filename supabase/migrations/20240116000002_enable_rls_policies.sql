-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Events policies
-- Admin can view all events
CREATE POLICY "Admin can view all events" ON events
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admin can create events
CREATE POLICY "Admin can create events" ON events
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Admin can update events
CREATE POLICY "Admin can update events" ON events
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Admin can delete events
CREATE POLICY "Admin can delete events" ON events
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Subjects policies
-- Admin can manage all subjects
CREATE POLICY "Admin can view all subjects" ON subjects
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can create subjects" ON subjects
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin can update subjects" ON subjects
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can delete subjects" ON subjects
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Service role can access subjects by token (for family access)
CREATE POLICY "Service role can access subjects" ON subjects
  FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- Photos policies
-- Admin can manage all photos
CREATE POLICY "Admin can view all photos" ON photos
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can create photos" ON photos
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin can update photos" ON photos
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can delete photos" ON photos
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Service role can access photos (for family access via API)
CREATE POLICY "Service role can access photos" ON photos
  FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- Photo_subjects policies
-- Admin can manage all photo-subject relationships
CREATE POLICY "Admin can view photo_subjects" ON photo_subjects
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can create photo_subjects" ON photo_subjects
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin can update photo_subjects" ON photo_subjects
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can delete photo_subjects" ON photo_subjects
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Service role can access photo_subjects (for family access via API)
CREATE POLICY "Service role can access photo_subjects" ON photo_subjects
  FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- Orders policies
-- Admin can view all orders
CREATE POLICY "Admin can view all orders" ON orders
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Service role can manage orders (for family creation via API)
CREATE POLICY "Service role can create orders" ON orders
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can update orders" ON orders
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can view orders" ON orders
  FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- Order_items policies
-- Admin can view all order items
CREATE POLICY "Admin can view all order_items" ON order_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Service role can manage order items (for family creation via API)
CREATE POLICY "Service role can create order_items" ON order_items
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can view order_items" ON order_items
  FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- Payments policies
-- Admin can view all payments
CREATE POLICY "Admin can view all payments" ON payments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Service role can manage payments (for webhook processing)
CREATE POLICY "Service role can create payments" ON payments
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can update payments" ON payments
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can view payments" ON payments
  FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');
-- ============================================
-- FIX URGENTE: Políticas RLS
-- El problema es que las políticas actuales no permiten INSERT con service_role
-- ============================================

-- Primero eliminar las políticas existentes que están mal configuradas
DROP POLICY IF EXISTS "Service role has full access to events" ON events;
DROP POLICY IF EXISTS "Service role has full access to photos" ON photos;
DROP POLICY IF EXISTS "Service role has full access to subjects" ON subjects;
DROP POLICY IF EXISTS "Service role has full access to orders" ON orders;
DROP POLICY IF EXISTS "Service role has full access to order_items" ON order_items;
DROP POLICY IF EXISTS "Service role has full access to photo_subjects" ON photo_subjects;
DROP POLICY IF EXISTS "Service role has full access to admin_users" ON admin_users;
DROP POLICY IF EXISTS "Service role has full access to egress_metrics" ON egress_metrics;

-- ============================================
-- RECREAR POLÍTICAS CORRECTAMENTE
-- Necesitamos políticas separadas para cada operación
-- ============================================

-- EVENTS table
CREATE POLICY "Service role can SELECT events" ON events
    FOR SELECT TO service_role
    USING (true);

CREATE POLICY "Service role can INSERT events" ON events
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can UPDATE events" ON events
    FOR UPDATE TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can DELETE events" ON events
    FOR DELETE TO service_role
    USING (true);

-- PHOTOS table
CREATE POLICY "Service role can SELECT photos" ON photos
    FOR SELECT TO service_role
    USING (true);

CREATE POLICY "Service role can INSERT photos" ON photos
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can UPDATE photos" ON photos
    FOR UPDATE TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can DELETE photos" ON photos
    FOR DELETE TO service_role
    USING (true);

-- SUBJECTS table
CREATE POLICY "Service role can SELECT subjects" ON subjects
    FOR SELECT TO service_role
    USING (true);

CREATE POLICY "Service role can INSERT subjects" ON subjects
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can UPDATE subjects" ON subjects
    FOR UPDATE TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can DELETE subjects" ON subjects
    FOR DELETE TO service_role
    USING (true);

-- PHOTO_SUBJECTS table
CREATE POLICY "Service role can SELECT photo_subjects" ON photo_subjects
    FOR SELECT TO service_role
    USING (true);

CREATE POLICY "Service role can INSERT photo_subjects" ON photo_subjects
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can UPDATE photo_subjects" ON photo_subjects
    FOR UPDATE TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can DELETE photo_subjects" ON photo_subjects
    FOR DELETE TO service_role
    USING (true);

-- ORDERS table
CREATE POLICY "Service role can SELECT orders" ON orders
    FOR SELECT TO service_role
    USING (true);

CREATE POLICY "Service role can INSERT orders" ON orders
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can UPDATE orders" ON orders
    FOR UPDATE TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can DELETE orders" ON orders
    FOR DELETE TO service_role
    USING (true);

-- ORDER_ITEMS table
CREATE POLICY "Service role can SELECT order_items" ON order_items
    FOR SELECT TO service_role
    USING (true);

CREATE POLICY "Service role can INSERT order_items" ON order_items
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can UPDATE order_items" ON order_items
    FOR UPDATE TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can DELETE order_items" ON order_items
    FOR DELETE TO service_role
    USING (true);

-- ADMIN_USERS table
CREATE POLICY "Service role can SELECT admin_users" ON admin_users
    FOR SELECT TO service_role
    USING (true);

CREATE POLICY "Service role can INSERT admin_users" ON admin_users
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can UPDATE admin_users" ON admin_users
    FOR UPDATE TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can DELETE admin_users" ON admin_users
    FOR DELETE TO service_role
    USING (true);

-- EGRESS_METRICS table
CREATE POLICY "Service role can SELECT egress_metrics" ON egress_metrics
    FOR SELECT TO service_role
    USING (true);

CREATE POLICY "Service role can INSERT egress_metrics" ON egress_metrics
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can UPDATE egress_metrics" ON egress_metrics
    FOR UPDATE TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can DELETE egress_metrics" ON egress_metrics
    FOR DELETE TO service_role
    USING (true);

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Este query debe retornar las políticas creadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('events', 'photos', 'subjects', 'orders')
ORDER BY tablename, policyname;
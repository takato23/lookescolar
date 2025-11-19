-- Script para crear tenant y verificar plan premium
-- Ejecutar desde Supabase SQL Editor
--
-- IMPORTANTE: Este script crea el tenant si no existe
-- La subscripción premium ya fue asignada previamente

-- 1. Crear el tenant (si no existe)
INSERT INTO public.tenants (id, slug, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'legacy-tenant', 'Legacy Tenant')
ON CONFLICT (id) DO NOTHING;

-- 2. Verificar que el tenant se creó
SELECT * FROM public.tenants WHERE id = '00000000-0000-0000-0000-000000000001';

-- 3. Verificar que la subscripción premium existe
SELECT
  tenant_id,
  plan_code,
  status,
  current_period_start,
  current_period_end
FROM public.tenant_plan_subscriptions
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- Resultado esperado:
-- - Tenant "Legacy Tenant" creado con ID 00000000-0000-0000-0000-000000000001
-- - Subscripción con plan_code = 'premium', status = 'active'
-- - 200 shares por evento, 20,000 fotos por evento, eventos ilimitados

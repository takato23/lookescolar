BEGIN;

CREATE TABLE IF NOT EXISTS public.plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  max_events INTEGER,
  max_photos_per_event INTEGER,
  max_shares_per_event INTEGER,
  price_monthly NUMERIC(10,2),
  currency TEXT DEFAULT 'ARS',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_plans_updated_at ON public.plans;
CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.tenant_plan_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES public.plans(code) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  billing_provider TEXT,
  billing_external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_plan_active_unique
  ON public.tenant_plan_subscriptions(tenant_id)
  WHERE status = 'active';

DROP TRIGGER IF EXISTS set_tenant_plan_subscriptions_updated_at
  ON public.tenant_plan_subscriptions;
CREATE TRIGGER set_tenant_plan_subscriptions_updated_at
  BEFORE UPDATE ON public.tenant_plan_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plans (code, name, description, max_events, max_photos_per_event, max_shares_per_event, price_monthly, currency)
VALUES
  ('free', 'Free', 'Hasta 2 eventos activos y 200 fotos por evento.', 2, 200, 3, 0, 'ARS'),
  ('basic', 'Básico', 'Ideal para escuelas pequeñas.', 8, 1000, 20, 14999, 'ARS'),
  ('pro', 'Pro', 'Pensado para equipos con múltiples fotógrafos.', 25, 5000, 50, 34999, 'ARS'),
  ('premium', 'Premium', 'Cobertura ilimitada para redes de estudios.', NULL, 20000, 200, 69999, 'ARS')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_events = EXCLUDED.max_events,
  max_photos_per_event = EXCLUDED.max_photos_per_event,
  max_shares_per_event = EXCLUDED.max_shares_per_event,
  price_monthly = EXCLUDED.price_monthly,
  currency = EXCLUDED.currency,
  updated_at = NOW();

INSERT INTO public.tenant_plan_subscriptions (tenant_id, plan_code, status, created_at, updated_at)
SELECT t.id, 'free', 'active', NOW(), NOW()
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tenant_plan_subscriptions s
  WHERE s.tenant_id = t.id
    AND s.status = 'active'
);

COMMIT;

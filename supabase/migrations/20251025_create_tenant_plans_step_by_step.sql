-- Alternative step-by-step migration to avoid deadlocks
-- Execute each section separately if needed

-- SECTION 1: Create basic plans table
CREATE TABLE IF NOT EXISTS public.plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- SECTION 2: Add columns to plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_events INTEGER;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_photos_per_event INTEGER;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_shares_per_event INTEGER;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price_monthly NUMERIC(10,2);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ARS';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- SECTION 3: Create tenant_plan_subscriptions table
CREATE TABLE IF NOT EXISTS public.tenant_plan_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES public.plans(code) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SECTION 4: Add additional columns to tenant_plan_subscriptions
ALTER TABLE public.tenant_plan_subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
ALTER TABLE public.tenant_plan_subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE public.tenant_plan_subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.tenant_plan_subscriptions ADD COLUMN IF NOT EXISTS billing_provider TEXT;
ALTER TABLE public.tenant_plan_subscriptions ADD COLUMN IF NOT EXISTS billing_external_id TEXT;

-- SECTION 5: Add constraints and indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'tenant_plan_subscriptions_status_check'
  ) THEN
    ALTER TABLE public.tenant_plan_subscriptions 
    ADD CONSTRAINT tenant_plan_subscriptions_status_check 
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_plan_active_unique
  ON public.tenant_plan_subscriptions(tenant_id)
  WHERE status = 'active';

-- SECTION 6: Insert plans one by one
INSERT INTO public.plans (code, name, description, max_events, max_photos_per_event, max_shares_per_event, price_monthly, currency)
VALUES ('free', 'Free', 'Hasta 2 eventos activos y 200 fotos por evento.', 2, 200, 3, 0, 'ARS')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.plans (code, name, description, max_events, max_photos_per_event, max_shares_per_event, price_monthly, currency)
VALUES ('basic', 'Básico', 'Ideal para escuelas pequeñas.', 8, 1000, 20, 14999, 'ARS')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.plans (code, name, description, max_events, max_photos_per_event, max_shares_per_event, price_monthly, currency)
VALUES ('pro', 'Pro', 'Pensado para equipos con múltiples fotógrafos.', 25, 5000, 50, 34999, 'ARS')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.plans (code, name, description, max_events, max_photos_per_event, max_shares_per_event, price_monthly, currency)
VALUES ('premium', 'Premium', 'Cobertura ilimitada para redes de estudios.', NULL, 20000, 200, 69999, 'ARS')
ON CONFLICT (code) DO NOTHING;

-- SECTION 7: Assign free plan to existing tenants
INSERT INTO public.tenant_plan_subscriptions (tenant_id, plan_code, status, created_at, updated_at)
SELECT t.id, 'free', 'active', NOW(), NOW()
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_plan_subscriptions s
  WHERE s.tenant_id = t.id AND s.status = 'active'
);

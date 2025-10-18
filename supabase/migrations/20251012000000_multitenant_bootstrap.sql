BEGIN;

-- 1. Tenant registry -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  primary_domain TEXT UNIQUE,
  fallback_domains TEXT[] DEFAULT '{}'::TEXT[],
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenants_set_updated_at ON public.tenants;
CREATE TRIGGER tenants_set_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Default tenant used for legacy data and fallback
INSERT INTO public.tenants (id, slug, name)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'default',
  'Default Tenant'
)
ON CONFLICT (id) DO UPDATE
SET slug = EXCLUDED.slug,
    name = EXCLUDED.name;

-- Store default tenant id for use in helper functions
PERFORM set_config(
  'app.default_tenant_id',
  '00000000-0000-0000-0000-000000000000',
  false
);

-- 2. Helper functions ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_request_header(header_name TEXT)
RETURNS TEXT AS $$
DECLARE
  headers_json JSON;
BEGIN
  BEGIN
    headers_json := current_setting('request.headers', true)::JSON;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  RETURN COALESCE(
    headers_json ->> lower(header_name),
    headers_json ->> upper(replace(header_name, '-', '_')),
    headers_json ->> replace(lower(header_name), '-', '_')
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.resolve_tenant_domain(hostname TEXT)
RETURNS UUID AS $$
DECLARE
  cleaned_hostname TEXT;
  tenant_id UUID;
BEGIN
  IF hostname IS NULL OR length(trim(hostname)) = 0 THEN
    RETURN NULL;
  END IF;

  cleaned_hostname := lower(split_part(hostname, ':', 1));

  SELECT t.id INTO tenant_id
  FROM public.tenants t
  WHERE t.primary_domain = cleaned_hostname
     OR cleaned_hostname = ANY(t.fallback_domains)
  LIMIT 1;

  RETURN tenant_id;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
DECLARE
  tenant_header TEXT;
  tenant_domain UUID;
  default_tenant UUID;
BEGIN
  tenant_header := public.get_request_header('x-tenant-id');
  IF tenant_header IS NOT NULL THEN
    BEGIN
      RETURN tenant_header::UUID;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;

  tenant_domain := public.resolve_tenant_domain(public.get_request_header('host'));
  IF tenant_domain IS NOT NULL THEN
    RETURN tenant_domain;
  END IF;

  BEGIN
    default_tenant := current_setting('app.default_tenant_id', true)::UUID;
    RETURN default_tenant;
  EXCEPTION WHEN others THEN
    RETURN '00000000-0000-0000-0000-000000000000';
  END;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  role TEXT;
BEGIN
  BEGIN
    role := COALESCE(auth.jwt() ->> 'role', auth.jwt() ->> 'user_role');
  EXCEPTION WHEN others THEN
    role := NULL;
  END;

  RETURN role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Schema changes --------------------------------------------------------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
  REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.folders
  ADD COLUMN IF NOT EXISTS tenant_id UUID
    REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS tenant_id UUID
    REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS tenant_id UUID
    REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS tenant_id UUID
    REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tenant_id UUID
    REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID
    REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.subject_tokens
  ADD COLUMN IF NOT EXISTS tenant_id UUID
    REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.photo_subjects
  ADD COLUMN IF NOT EXISTS tenant_id UUID
    REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.folder_shares
  ADD COLUMN IF NOT EXISTS tenant_id UUID
    REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.access_tokens
  ADD COLUMN IF NOT EXISTS tenant_id UUID
    REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Backfill tenant_id using related event when possible
UPDATE public.folders f
SET tenant_id = e.tenant_id
FROM public.events e
WHERE f.event_id = e.id AND (f.tenant_id IS NULL OR f.tenant_id = '00000000-0000-0000-0000-000000000000');

UPDATE public.photos p
SET tenant_id = COALESCE(e.tenant_id, f.tenant_id, '00000000-0000-0000-0000-000000000000')
FROM public.events e
LEFT JOIN public.folders f ON p.folder_id = f.id
WHERE (p.tenant_id IS NULL OR p.tenant_id = '00000000-0000-0000-0000-000000000000')
  AND (p.event_id = e.id OR p.folder_id = f.id);

UPDATE public.subjects s
SET tenant_id = e.tenant_id
FROM public.events e
WHERE s.event_id = e.id AND (s.tenant_id IS NULL OR s.tenant_id = '00000000-0000-0000-0000-000000000000');

UPDATE public.store_settings ss
SET tenant_id = e.tenant_id
FROM public.events e
WHERE ss.event_id = e.id AND (ss.tenant_id IS NULL OR ss.tenant_id = '00000000-0000-0000-0000-000000000000');

UPDATE public.orders o
SET tenant_id = e.tenant_id
FROM public.events e
WHERE o.event_id = e.id AND (o.tenant_id IS NULL OR o.tenant_id = '00000000-0000-0000-0000-000000000000');

UPDATE public.order_items oi
SET tenant_id = o.tenant_id
FROM public.orders o
WHERE oi.order_id = o.id AND (oi.tenant_id IS NULL OR oi.tenant_id = '00000000-0000-0000-0000-000000000000');

UPDATE public.subject_tokens st
SET tenant_id = s.tenant_id
FROM public.subjects s
WHERE st.subject_id = s.id AND (st.tenant_id IS NULL OR st.tenant_id = '00000000-0000-0000-0000-000000000000');

UPDATE public.photo_subjects ps
SET tenant_id = p.tenant_id
FROM public.photos p
WHERE ps.photo_id = p.id AND (ps.tenant_id IS NULL OR ps.tenant_id = '00000000-0000-0000-0000-000000000000');

UPDATE public.folder_shares fs
SET tenant_id = f.tenant_id
FROM public.folders f
WHERE fs.folder_id = f.id AND (fs.tenant_id IS NULL OR fs.tenant_id = '00000000-0000-0000-0000-000000000000');

UPDATE public.access_tokens at
SET tenant_id = f.tenant_id
FROM public.folders f
WHERE at.folder_id = f.id AND (at.tenant_id IS NULL OR at.tenant_id = '00000000-0000-0000-0000-000000000000');

-- Set NOT NULL where safe
ALTER TABLE public.folders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.photos ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.subjects ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.store_settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.order_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.subject_tokens ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.photo_subjects ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.folder_shares ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.access_tokens ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.events ALTER COLUMN tenant_id DROP DEFAULT;

-- Indexes for tenant filtering
CREATE INDEX IF NOT EXISTS idx_events_tenant ON public.events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_folders_tenant ON public.folders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_photos_tenant ON public.photos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subjects_tenant ON public.subjects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_settings_tenant ON public.store_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant ON public.order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subject_tokens_tenant ON public.subject_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_tenant ON public.photo_subjects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_folder_shares_tenant ON public.folder_shares(tenant_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_tenant ON public.access_tokens(tenant_id);

-- 4. Tenant-aware RLS policies --------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_admin_access" ON public.tenants;
CREATE POLICY "tenant_admin_access" ON public.tenants
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DO $$
DECLARE
  tbl TEXT;
  tables_array TEXT[] := ARRAY[
    'events', 'folders', 'photos', 'subjects', 'store_settings',
    'orders', 'order_items', 'subject_tokens', 'photo_subjects',
    'folder_shares', 'access_tokens'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_array LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON public.%I;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Admin can manage all %I" ON public.%I;', tbl, tbl);
    EXECUTE format('
      CREATE POLICY "Service role full access" ON public.%I
        FOR ALL TO service_role USING (true);
    ', tbl);
    EXECUTE format('
      CREATE POLICY "Tenant scoped access" ON public.%I
        FOR ALL TO authenticated
        USING (tenant_id = public.current_tenant_id() OR public.is_admin_user())
        WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_admin_user());
    ', tbl);
  END LOOP;
END $$;

COMMIT;

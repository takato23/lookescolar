-- ============================================================
-- Migration: Family Token Aliases
-- Purpose: Introduce human-readable aliases for enhanced tokens
-- Date: 2025-10-08
-- ============================================================

BEGIN;

-- Ensure generic updated_at trigger function exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.token_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias TEXT NOT NULL,
  short_code TEXT NOT NULL,
  token_id UUID NOT NULL,
  generated_by UUID REFERENCES auth.users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT token_aliases_alias_unique UNIQUE (alias),
  CONSTRAINT token_aliases_short_code_unique UNIQUE (short_code),
  CONSTRAINT token_aliases_alias_length CHECK (char_length(alias) BETWEEN 3 AND 12),
  CONSTRAINT token_aliases_alias_lower CHECK (alias = regexp_replace(lower(alias), '[^a-z0-9]', '', 'g')),
  CONSTRAINT token_aliases_alias_format CHECK (alias ~ '^[a-z0-9]+$'),
  CONSTRAINT token_aliases_short_code_format CHECK (short_code ~ '^[A-Z0-9]{4,12}$')
);

CREATE INDEX IF NOT EXISTS idx_token_aliases_token_id
  ON public.token_aliases(token_id);

CREATE INDEX IF NOT EXISTS idx_token_aliases_created_at
  ON public.token_aliases(created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'enhanced_tokens'
  ) THEN
    BEGIN
      ALTER TABLE public.token_aliases
        ADD CONSTRAINT token_aliases_token_id_fkey
        FOREIGN KEY (token_id)
        REFERENCES public.enhanced_tokens(id)
        ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  ELSE
    RAISE NOTICE 'token_aliases: enhanced_tokens table not found. Run enhanced token migration before enforcing FK.';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS set_token_aliases_updated_at ON public.token_aliases;
CREATE TRIGGER set_token_aliases_updated_at
  BEFORE UPDATE ON public.token_aliases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.token_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS token_aliases_admin_all ON public.token_aliases;

DO $$
DECLARE
  has_user_metadata boolean;
  has_raw_user_meta boolean;
  metadata_column text;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'users'
      AND column_name = 'user_metadata'
  )
  INTO has_user_metadata;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'users'
      AND column_name = 'raw_user_meta_data'
  )
  INTO has_raw_user_meta;

  IF has_user_metadata THEN
    metadata_column := 'auth.users.user_metadata';
  ELSIF has_raw_user_meta THEN
    metadata_column := 'auth.users.raw_user_meta_data';
  ELSE
    metadata_column := NULL;
    RAISE NOTICE 'token_aliases: auth.users has no metadata column; admin policy will only verify auth.uid().' ;
  END IF;

  IF metadata_column IS NULL THEN
    EXECUTE '
      CREATE POLICY token_aliases_admin_all
      ON public.token_aliases
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM auth.users
          WHERE auth.users.id = auth.uid()
        )
      );
    ';
  ELSE
    EXECUTE format('
      CREATE POLICY token_aliases_admin_all
      ON public.token_aliases
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM auth.users
          WHERE auth.users.id = auth.uid()
            AND (%s ->> ''role'') = ''admin''
        )
      );
    ', metadata_column);
  END IF;
END;
$$;

DROP POLICY IF EXISTS token_aliases_service_all ON public.token_aliases;

CREATE POLICY token_aliases_service_all
  ON public.token_aliases FOR ALL
  TO service_role
  USING (TRUE);

COMMIT;

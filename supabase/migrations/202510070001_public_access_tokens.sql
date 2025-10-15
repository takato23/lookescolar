-- Migration: Create unified public access token registry
-- Date: 2025-10-07
-- Purpose: consolidate share_tokens, subject_tokens, student_tokens, and folder share tokens into public_access_tokens

BEGIN;

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.public_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL,
  access_type text NOT NULL CHECK (access_type IN ('share_event','share_folder','share_photos','folder_share','family_subject','family_student')),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  share_token_id uuid REFERENCES public.share_tokens(id) ON DELETE SET NULL,
  subject_token_id uuid,
  student_token_id uuid,
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  subject_id uuid,
  student_id uuid,
  share_type text,
  photo_ids uuid[],
  title text,
  description text,
  password_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  allow_download boolean NOT NULL DEFAULT false,
  allow_comments boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  max_views integer,
  view_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_legacy boolean NOT NULL DEFAULT true,
  legacy_source text NOT NULL CHECK (legacy_source IN ('share_tokens','subject_tokens','student_tokens','folders')),
  legacy_reference text,
  legacy_payload jsonb,
  legacy_migrated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_public_access_tokens_event ON public.public_access_tokens(event_id);
CREATE INDEX IF NOT EXISTS idx_public_access_tokens_access_type ON public.public_access_tokens(access_type);

DROP TRIGGER IF EXISTS set_public_access_tokens_updated_at ON public.public_access_tokens;
CREATE TRIGGER set_public_access_tokens_updated_at
  BEFORE UPDATE ON public.public_access_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.share_tokens
  ADD COLUMN IF NOT EXISTS public_access_token_id uuid REFERENCES public.public_access_tokens(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS legacy_migrated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_share_tokens_public_access ON public.share_tokens(public_access_token_id);

-- Conditionally add foreign keys and columns if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subject_tokens') THEN
    ALTER TABLE public.subject_tokens
      ADD COLUMN IF NOT EXISTS public_access_token_id uuid REFERENCES public.public_access_tokens(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS legacy_migrated_at timestamptz;

    CREATE INDEX IF NOT EXISTS idx_subject_tokens_public_access ON public.subject_tokens(public_access_token_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_tokens') THEN
    ALTER TABLE public.student_tokens
      ADD COLUMN IF NOT EXISTS public_access_token_id uuid REFERENCES public.public_access_tokens(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS legacy_migrated_at timestamptz;

    CREATE INDEX IF NOT EXISTS idx_student_tokens_public_access ON public.student_tokens(public_access_token_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'student_tokens'
  ) THEN
    ALTER TABLE public.student_tokens
      ADD COLUMN IF NOT EXISTS public_access_token_id uuid REFERENCES public.public_access_tokens(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS legacy_migrated_at timestamptz;

    CREATE INDEX IF NOT EXISTS idx_student_tokens_public_access ON public.student_tokens(public_access_token_id);
  END IF;
END $$;

ALTER TABLE public.folders
  ADD COLUMN IF NOT EXISTS public_access_token_id uuid REFERENCES public.public_access_tokens(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS legacy_public_access_migrated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_folders_public_access ON public.folders(public_access_token_id);

WITH migrated AS (
  INSERT INTO public.public_access_tokens (
    id,
    token,
    access_type,
    event_id,
    share_token_id,
    folder_id,
    share_type,
    photo_ids,
    title,
    description,
    password_hash,
    metadata,
    allow_download,
    allow_comments,
    expires_at,
    max_views,
    view_count,
    is_active,
    is_legacy,
    legacy_source,
    legacy_reference,
    legacy_payload,
    legacy_migrated_at,
    created_at,
    updated_at
  )
  SELECT
    COALESCE(st.public_access_token_id, gen_random_uuid()) AS id,
    st.token,
    CASE
      WHEN st.share_type = 'folder' THEN 'share_folder'
      WHEN st.share_type = 'photos' THEN 'share_photos'
      ELSE 'share_event'
    END AS access_type,
    st.event_id,
    st.id,
    st.folder_id,
    st.share_type,
    st.photo_ids,
    st.title,
    st.description,
    st.password_hash,
    COALESCE(st.metadata, '{}'::jsonb),
    COALESCE(st.allow_download, false),
    COALESCE(st.allow_comments, false),
    st.expires_at,
    st.max_views,
    st.view_count,
    st.is_active,
    true,
    'share_tokens',
    st.id::text,
    jsonb_build_object('share_type', st.share_type, 'photo_ids', st.photo_ids),
    COALESCE(st.legacy_migrated_at, now()),
    st.created_at,
    st.updated_at
  FROM public.share_tokens st
  WHERE st.token IS NOT NULL
  ON CONFLICT (token) DO UPDATE
    SET
      access_type = EXCLUDED.access_type,
      event_id = EXCLUDED.event_id,
      share_token_id = EXCLUDED.share_token_id,
      folder_id = EXCLUDED.folder_id,
      share_type = EXCLUDED.share_type,
      photo_ids = EXCLUDED.photo_ids,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      password_hash = EXCLUDED.password_hash,
      metadata = EXCLUDED.metadata,
      allow_download = EXCLUDED.allow_download,
      allow_comments = EXCLUDED.allow_comments,
      expires_at = EXCLUDED.expires_at,
      max_views = EXCLUDED.max_views,
      view_count = GREATEST(public.public_access_tokens.view_count, EXCLUDED.view_count),
      is_active = EXCLUDED.is_active,
      legacy_source = EXCLUDED.legacy_source,
      legacy_reference = EXCLUDED.legacy_reference,
      legacy_payload = COALESCE(public.public_access_tokens.legacy_payload, '{}'::jsonb) || COALESCE(EXCLUDED.legacy_payload, '{}'::jsonb),
      legacy_migrated_at = COALESCE(public.public_access_tokens.legacy_migrated_at, EXCLUDED.legacy_migrated_at),
      updated_at = EXCLUDED.updated_at,
      created_at = LEAST(public.public_access_tokens.created_at, EXCLUDED.created_at)
  RETURNING id, share_token_id
)
UPDATE public.share_tokens st
SET
  public_access_token_id = migrated.id,
  legacy_migrated_at = COALESCE(st.legacy_migrated_at, now())
FROM migrated
WHERE st.id = migrated.share_token_id;

-- Skip subject_tokens migration if tables don't exist or are empty
DO $$
DECLARE
  table_exists BOOLEAN := FALSE;
  has_data BOOLEAN := FALSE;
BEGIN
  -- Check if both tables exist
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('subject_tokens', 'subjects')
  ) INTO table_exists;

  IF table_exists THEN
    -- Use dynamic SQL to check if table has data without referencing it directly
    BEGIN
      EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.subject_tokens WHERE token IS NOT NULL LIMIT 1)' INTO has_data;

      IF has_data THEN
        RAISE NOTICE 'Migrating subject_tokens...';

        EXECUTE '
          INSERT INTO public.public_access_tokens (
            token,
            access_type,
            event_id,
            subject_token_id,
            subject_id,
            expires_at,
            is_active,
            is_legacy,
            legacy_source,
            legacy_reference,
            legacy_payload,
            legacy_migrated_at,
            created_at,
            updated_at
          )
          SELECT
            st.token,
            ''family_subject'',
            subj.event_id,
            st.id,
            st.subject_id,
            st.expires_at,
            COALESCE(st.expires_at IS NULL OR st.expires_at > now(), true),
            true,
            ''subject_tokens'',
            st.id::text,
            jsonb_build_object(''subject_id'', st.subject_id),
            COALESCE(st.legacy_migrated_at, now()),
            st.created_at,
            st.updated_at
          FROM public.subject_tokens st
          LEFT JOIN public.subjects subj ON subj.id = st.subject_id
          WHERE st.token IS NOT NULL
          ON CONFLICT (token) DO NOTHING;
        ';

        RAISE NOTICE 'Subject tokens migration completed';
      ELSE
        RAISE NOTICE 'No subject tokens to migrate';
      END IF;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE 'Subject tokens table not accessible, skipping migration';
    END;
  ELSE
    RAISE NOTICE 'Subject tokens tables not found, skipping migration';
  END IF;
END $$;

-- Skip student_tokens migration if tables don't exist or are empty
DO $$
DECLARE
  table_exists BOOLEAN := FALSE;
  has_data BOOLEAN := FALSE;
BEGIN
  -- Check if both tables exist
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('student_tokens', 'students')
  ) INTO table_exists;

  IF table_exists THEN
    -- Use dynamic SQL to check if table has data without referencing it directly
    BEGIN
      EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.student_tokens WHERE token IS NOT NULL LIMIT 1)' INTO has_data;

      IF has_data THEN
        RAISE NOTICE 'Migrating student_tokens...';

        EXECUTE '
          INSERT INTO public.public_access_tokens (
            token,
            access_type,
            event_id,
            student_token_id,
            student_id,
            expires_at,
            is_active,
            is_legacy,
            legacy_source,
            legacy_reference,
            legacy_payload,
            legacy_migrated_at,
            created_at,
            updated_at
          )
          SELECT
            st.token,
            ''family_student'',
            s.event_id,
            st.id,
            st.student_id,
            st.expires_at,
            COALESCE(st.expires_at IS NULL OR st.expires_at > now(), true),
            true,
            ''student_tokens'',
            st.id::text,
            jsonb_build_object(''student_id'', st.student_id),
            COALESCE(st.legacy_migrated_at, now()),
            st.created_at,
            COALESCE(st.created_at, now())
          FROM public.student_tokens st
          LEFT JOIN public.students s ON s.id = st.student_id
          WHERE st.token IS NOT NULL
          ON CONFLICT (token) DO NOTHING;
        ';

        RAISE NOTICE 'Student tokens migration completed';
      ELSE
        RAISE NOTICE 'No student tokens to migrate';
      END IF;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE 'Student tokens table not accessible, skipping migration';
    END;
  ELSE
    RAISE NOTICE 'Student tokens tables not found, skipping migration';
  END IF;
END $$;

UPDATE public.folders f
SET
  public_access_token_id = pat.id,
  legacy_public_access_migrated_at = COALESCE(f.legacy_public_access_migrated_at, now())
FROM public.public_access_tokens pat
WHERE pat.token = f.share_token
  AND pat.share_token_id IS NOT NULL
  AND (f.public_access_token_id IS DISTINCT FROM pat.id);

WITH folder_source AS (
  SELECT f.*
  FROM public.folders f
  WHERE f.share_token IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.public_access_tokens pat
      WHERE pat.token = f.share_token
    )
), migrated_folders AS (
  INSERT INTO public.public_access_tokens (
    id,
    token,
    access_type,
    event_id,
    folder_id,
    is_active,
    is_legacy,
    legacy_source,
    legacy_reference,
    legacy_payload,
    legacy_migrated_at,
    created_at,
    updated_at
  )
  SELECT
    COALESCE(f.public_access_token_id, gen_random_uuid()),
    f.share_token,
    'folder_share',
    f.event_id,
    f.id,
    COALESCE(f.is_published, false),
    true,
    'folders',
    f.id::text,
    jsonb_build_object(
      'name', f.name,
      'is_published', f.is_published,
      'published_at', f.published_at
    ),
    COALESCE(f.legacy_public_access_migrated_at, now()),
    f.created_at,
    f.updated_at
  FROM folder_source f
  ON CONFLICT (token) DO UPDATE
    SET
      event_id = COALESCE(EXCLUDED.event_id, public.public_access_tokens.event_id),
      folder_id = EXCLUDED.folder_id,
      is_active = EXCLUDED.is_active,
      legacy_source = EXCLUDED.legacy_source,
      legacy_reference = EXCLUDED.legacy_reference,
      legacy_payload = COALESCE(public.public_access_tokens.legacy_payload, '{}'::jsonb) || COALESCE(EXCLUDED.legacy_payload, '{}'::jsonb),
      legacy_migrated_at = COALESCE(public.public_access_tokens.legacy_migrated_at, EXCLUDED.legacy_migrated_at),
      updated_at = EXCLUDED.updated_at,
      created_at = LEAST(public.public_access_tokens.created_at, EXCLUDED.created_at)
  RETURNING id, folder_id
)
UPDATE public.folders f
SET
  public_access_token_id = migrated_folders.id,
  legacy_public_access_migrated_at = COALESCE(f.legacy_public_access_migrated_at, now())
FROM migrated_folders
WHERE f.id = migrated_folders.folder_id;

-- Add foreign key constraints conditionally
DO $$
BEGIN
  -- Add subject_token_id constraint if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subject_tokens') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'public_access_tokens'
      AND constraint_name = 'fk_public_access_tokens_subject_token_id'
    ) THEN
      ALTER TABLE public.public_access_tokens
      ADD CONSTRAINT fk_public_access_tokens_subject_token_id
      FOREIGN KEY (subject_token_id) REFERENCES public.subject_tokens(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Add student_token_id constraint if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_tokens') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'public_access_tokens'
      AND constraint_name = 'fk_public_access_tokens_student_token_id'
    ) THEN
      ALTER TABLE public.public_access_tokens
      ADD CONSTRAINT fk_public_access_tokens_student_token_id
      FOREIGN KEY (student_token_id) REFERENCES public.student_tokens(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Add subject_id constraint if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subjects') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'public_access_tokens'
      AND constraint_name = 'fk_public_access_tokens_subject_id'
    ) THEN
      ALTER TABLE public.public_access_tokens
      ADD CONSTRAINT fk_public_access_tokens_subject_id
      FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Add student_id constraint if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'public_access_tokens'
      AND constraint_name = 'fk_public_access_tokens_student_id'
    ) THEN
      ALTER TABLE public.public_access_tokens
      ADD CONSTRAINT fk_public_access_tokens_student_id
      FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

COMMIT;

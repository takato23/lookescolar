-- ============================================================
-- HIERARCHICAL SYSTEM SETUP - Manual Application
-- ============================================================
-- This script sets up the hierarchical token system manually
-- Apply this through Supabase Dashboard > SQL Editor
-- ============================================================

-- STEP 1: Create folders table (base for hierarchy)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
    parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    
    -- Performance fields
    depth integer NOT NULL DEFAULT 0 CHECK (depth >= 0 AND depth <= 10),
    sort_order integer DEFAULT 0 CHECK (sort_order >= 0),
    photo_count integer DEFAULT 0 CHECK (photo_count >= 0),
    
    -- Publishing control for hierarchy
    is_published boolean DEFAULT false,
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT folders_no_self_reference CHECK (id != parent_id),
    CONSTRAINT folders_unique_name_per_parent UNIQUE(parent_id, name, event_id)
);

-- STEP 2: Create assets table (replaces scattered photo references)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
    
    -- File info
    filename text NOT NULL CHECK (length(filename) BETWEEN 1 AND 255),
    original_path text NOT NULL,
    preview_path text,
    
    -- Technical fields
    file_size bigint NOT NULL CHECK (file_size > 0),
    checksum text NOT NULL CHECK (length(checksum) = 64),
    mime_type text NOT NULL CHECK (mime_type ~ '^image/'),
    
    -- Status for processing
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT assets_checksum_unique UNIQUE(checksum),
    CONSTRAINT assets_path_unique UNIQUE(original_path)
);

-- STEP 3: Create courses table (domain separation)
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE (event_id, name)
);

-- STEP 4: Create course_members table (families belong to courses)
-- ============================================================
CREATE TABLE IF NOT EXISTS course_members (
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  PRIMARY KEY (course_id, subject_id)
);

-- STEP 5: Create folder_courses table (folders linked to courses)
-- ============================================================
CREATE TABLE IF NOT EXISTS folder_courses (
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  PRIMARY KEY (folder_id, course_id)
);

-- STEP 6: Create asset_subjects table (asset tagging for families)
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_subjects (
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  tagged_by uuid REFERENCES auth.users(id),
  
  PRIMARY KEY (asset_id, subject_id)
);

-- STEP 7: Create unified access_tokens table (secure hierarchical tokens)
-- ============================================================
CREATE TABLE IF NOT EXISTS access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('event','course','family')),
  
  -- Resource according to scope (only one non-null per constraint)
  event_id  uuid REFERENCES events(id)   ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id)  ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,

  -- SECURITY: Hash + salt (never plain text)
  token_hash bytea NOT NULL,        -- digest(plain_token || salt, 'sha256')
  salt bytea NOT NULL,              -- gen_random_bytes(16)
  token_prefix text NOT NULL CHECK (length(token_prefix) BETWEEN 8 AND 12),
  
  -- GRANULAR CONTROL
  access_level text NOT NULL DEFAULT 'read_only' CHECK (access_level IN ('full','read_only')),
  can_download boolean NOT NULL DEFAULT false,
  max_uses int CHECK (max_uses IS NULL OR max_uses > 0),
  used_count int NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  
  -- TIME MANAGEMENT
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  
  -- METADATA
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}',

  -- CONSTRAINTS: One resource per scope
  CONSTRAINT access_tokens_scope_resource_check CHECK (
    (scope='event'  AND event_id IS NOT NULL AND course_id IS NULL AND subject_id IS NULL) OR
    (scope='course' AND course_id IS NOT NULL AND event_id IS NULL  AND subject_id IS NULL) OR
    (scope='family' AND subject_id IS NOT NULL AND event_id IS NULL AND course_id IS NULL)
  ),
  
  -- CONSTRAINTS: Usage limits
  CONSTRAINT access_tokens_usage_limit_check CHECK (
    max_uses IS NULL OR used_count <= max_uses
  )
);

-- STEP 8: Create token_access_logs table (complete auditability)
-- ============================================================
CREATE TABLE IF NOT EXISTS token_access_logs (
  id bigserial PRIMARY KEY,
  access_token_id uuid NOT NULL REFERENCES access_tokens(id) ON DELETE CASCADE,
  
  -- ACCESS DATA
  occurred_at timestamptz NOT NULL DEFAULT now(),
  ip inet,
  user_agent text,
  path text,
  action text CHECK (action IN ('list_folders', 'list_assets', 'download', 'view')),
  
  -- RESULT
  ok boolean NOT NULL,
  response_time_ms int CHECK (response_time_ms >= 0),
  notes text
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Folders indexes
CREATE INDEX IF NOT EXISTS idx_folders_parent_tree ON folders(parent_id, sort_order) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folders_root ON folders(sort_order) WHERE parent_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_folders_event ON folders(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folders_event_published ON folders(event_id, is_published, depth, sort_order) WHERE is_published = true;

-- Assets indexes
CREATE INDEX IF NOT EXISTS idx_assets_folder_status ON assets(folder_id, status) WHERE status = 'ready';
CREATE INDEX IF NOT EXISTS idx_assets_checksum ON assets(checksum);
CREATE INDEX IF NOT EXISTS idx_assets_processing ON assets(status, created_at) WHERE status != 'ready';

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_event_id ON courses(event_id);
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(event_id, name);

-- Relationship indexes
CREATE INDEX IF NOT EXISTS idx_course_members_subject ON course_members(subject_id);
CREATE INDEX IF NOT EXISTS idx_course_members_course ON course_members(course_id);
CREATE INDEX IF NOT EXISTS idx_folder_courses_course ON folder_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_folder_courses_folder ON folder_courses(folder_id);
CREATE INDEX IF NOT EXISTS idx_asset_subjects_subject ON asset_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_asset_subjects_asset ON asset_subjects(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_subjects_tagged_by ON asset_subjects(tagged_by);

-- Token indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_tokens_prefix ON access_tokens(token_prefix);
CREATE INDEX IF NOT EXISTS idx_access_tokens_scope_event ON access_tokens(scope, event_id) WHERE scope = 'event';
CREATE INDEX IF NOT EXISTS idx_access_tokens_scope_course ON access_tokens(scope, course_id) WHERE scope = 'course';
CREATE INDEX IF NOT EXISTS idx_access_tokens_scope_subject ON access_tokens(scope, subject_id) WHERE scope = 'family';
CREATE INDEX IF NOT EXISTS idx_access_tokens_created_by ON access_tokens(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires_at ON access_tokens(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_access_tokens_revoked_at ON access_tokens(revoked_at) WHERE revoked_at IS NOT NULL;

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_token_access_logs_token ON token_access_logs(access_token_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_access_logs_time ON token_access_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_access_logs_ip ON token_access_logs(ip, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_access_logs_action ON token_access_logs(action, occurred_at DESC);

-- ============================================================
-- RLS POLICIES (Development bypass enabled)
-- ============================================================

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_access_logs ENABLE ROW LEVEL SECURITY;

-- Admin access policies (with development bypass)
CREATE POLICY "Admin full access folders"
ON folders FOR ALL TO authenticated
USING (
  CASE 
    WHEN current_setting('app.environment', true) = 'development' THEN true
    ELSE EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  END
);

CREATE POLICY "Admin full access assets"
ON assets FOR ALL TO authenticated
USING (
  CASE 
    WHEN current_setting('app.environment', true) = 'development' THEN true
    ELSE EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  END
);

CREATE POLICY "Admin full access courses"
ON courses FOR ALL TO authenticated
USING (
  CASE 
    WHEN current_setting('app.environment', true) = 'development' THEN true
    ELSE EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  END
);

CREATE POLICY "Admin full access course_members"
ON course_members FOR ALL TO authenticated
USING (
  CASE 
    WHEN current_setting('app.environment', true) = 'development' THEN true
    ELSE EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  END
);

CREATE POLICY "Admin full access folder_courses"
ON folder_courses FOR ALL TO authenticated
USING (
  CASE 
    WHEN current_setting('app.environment', true) = 'development' THEN true
    ELSE EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  END
);

CREATE POLICY "Admin full access asset_subjects"
ON asset_subjects FOR ALL TO authenticated
USING (
  CASE 
    WHEN current_setting('app.environment', true) = 'development' THEN true
    ELSE EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  END
);

CREATE POLICY "Admin full access access_tokens"
ON access_tokens FOR ALL TO authenticated
USING (
  CASE 
    WHEN current_setting('app.environment', true) = 'development' THEN true
    ELSE EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  END
);

CREATE POLICY "Admin full access token_access_logs"
ON token_access_logs FOR ALL TO authenticated
USING (
  CASE 
    WHEN current_setting('app.environment', true) = 'development' THEN true
    ELSE EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  END
);

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
DECLARE
  table_count INTEGER := 0;
  required_tables TEXT[] := ARRAY[
    'folders', 'assets', 'courses', 'course_members', 
    'folder_courses', 'asset_subjects', 'access_tokens', 'token_access_logs'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY required_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      table_count := table_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 HIERARCHICAL SYSTEM SETUP COMPLETE! 🎉';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created: %/%', table_count, array_length(required_tables, 1);
  RAISE NOTICE '';
  RAISE NOTICE '🏗️  System Architecture:';
  RAISE NOTICE '   📁 folders → hierarchical photo organization';
  RAISE NOTICE '   🖼️  assets → unified photo storage';
  RAISE NOTICE '   📚 courses → domain separation (courses ≠ subjects)';
  RAISE NOTICE '   👥 course_members → families belong to courses';
  RAISE NOTICE '   🔗 folder_courses → folders linked to courses';
  RAISE NOTICE '   🏷️  asset_subjects → photo tagging for families';
  RAISE NOTICE '   🔐 access_tokens → secure hierarchical tokens';
  RAISE NOTICE '   📊 token_access_logs → complete audit trail';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Token Hierarchy Ready:';
  RAISE NOTICE '   🏫 Event tokens → full school/event access';
  RAISE NOTICE '   📚 Course tokens → specific course access';
  RAISE NOTICE '   👨‍👩‍👧‍👦 Family tokens → family-specific access';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Ready for Phase 2: Backend Services & API Functions';
  
  IF table_count = array_length(required_tables, 1) THEN
    RAISE NOTICE '🚀 All tables created successfully!';
  ELSE
    RAISE WARNING '⚠️ Some tables may be missing - check table creation logs';
  END IF;
END $$;
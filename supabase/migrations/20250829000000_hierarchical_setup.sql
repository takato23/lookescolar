/**
 * HIERARCHICAL SYSTEM SETUP - Phase 1
 * 
 * Creates the complete hierarchical token system with 8 core tables
 * Applied manually on 2025-08-29 via SQL Editor
 * This migration file is for version control and repair purposes
 */

-- ============================================================
-- CORE HIERARCHICAL TABLES
-- ============================================================

-- Folders table (hierarchical photo organization)
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  depth INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  photo_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assets table (replaces photos with better structure)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_path TEXT NOT NULL,
  preview_path TEXT,
  file_size BIGINT NOT NULL DEFAULT 0,
  checksum TEXT,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses table (domain separation from subjects)
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Course memberships (many-to-many: courses ↔ subjects/families)
CREATE TABLE IF NOT EXISTS course_members (
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (course_id, subject_id)
);

-- Folder-course assignments (many-to-many: folders ↔ courses)
CREATE TABLE IF NOT EXISTS folder_courses (
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (folder_id, course_id)
);

-- Asset-subject tagging (many-to-many: assets ↔ subjects)
CREATE TABLE IF NOT EXISTS asset_subjects (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tagged_by TEXT, -- admin who tagged the photo
  PRIMARY KEY (asset_id, subject_id)
);

-- ============================================================
-- HIERARCHICAL TOKEN SYSTEM
-- ============================================================

-- Access tokens (secure hierarchical access)
CREATE TABLE IF NOT EXISTS access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('event', 'course', 'family')),
  -- Resource fields (only one will be set based on scope)
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  -- Security fields
  token_hash BYTEA NOT NULL, -- SHA-256 hash of token
  salt BYTEA NOT NULL, -- Random salt for hashing
  token_prefix TEXT NOT NULL, -- First 8 chars for quick lookup (E_, C_, F_)
  -- Access control
  access_level TEXT NOT NULL DEFAULT 'read_only' CHECK (access_level IN ('full', 'read_only')),
  can_download BOOLEAN NOT NULL DEFAULT false,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  -- Time management
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Token access logs (audit trail)
CREATE TABLE IF NOT EXISTS token_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token_id UUID NOT NULL REFERENCES access_tokens(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip INET,
  user_agent TEXT,
  path TEXT,
  action TEXT NOT NULL CHECK (action IN ('list_folders', 'list_assets', 'download', 'view')),
  ok BOOLEAN NOT NULL DEFAULT true,
  response_time_ms INTEGER,
  notes TEXT
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Folders indexes
CREATE INDEX IF NOT EXISTS idx_folders_event_id ON folders(event_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_depth ON folders(depth);

-- Assets indexes
CREATE INDEX IF NOT EXISTS idx_assets_folder_id ON assets(folder_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_filename ON assets(filename);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_event_id ON courses(event_id);

-- Course members indexes
CREATE INDEX IF NOT EXISTS idx_course_members_course_id ON course_members(course_id);
CREATE INDEX IF NOT EXISTS idx_course_members_subject_id ON course_members(subject_id);

-- Folder courses indexes
CREATE INDEX IF NOT EXISTS idx_folder_courses_folder_id ON folder_courses(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_courses_course_id ON folder_courses(course_id);

-- Asset subjects indexes
CREATE INDEX IF NOT EXISTS idx_asset_subjects_asset_id ON asset_subjects(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_subjects_subject_id ON asset_subjects(subject_id);

-- Token indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_tokens_prefix ON access_tokens(token_prefix);
CREATE INDEX IF NOT EXISTS idx_access_tokens_scope_resource ON access_tokens(scope, event_id, course_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_status ON access_tokens(expires_at, revoked_at) WHERE expires_at IS NOT NULL OR revoked_at IS NOT NULL;

-- Token logs indexes
CREATE INDEX IF NOT EXISTS idx_token_access_logs_token_id ON token_access_logs(access_token_id);
CREATE INDEX IF NOT EXISTS idx_token_access_logs_occurred_at ON token_access_logs(occurred_at);
CREATE INDEX IF NOT EXISTS idx_token_access_logs_action ON token_access_logs(action);

-- ============================================================
-- CONSTRAINTS AND VALIDATIONS
-- ============================================================

-- Ensure token has exactly one resource reference
ALTER TABLE access_tokens ADD CONSTRAINT chk_access_tokens_single_resource
CHECK (
  (scope = 'event' AND event_id IS NOT NULL AND course_id IS NULL AND subject_id IS NULL) OR
  (scope = 'course' AND course_id IS NOT NULL AND event_id IS NULL AND subject_id IS NULL) OR
  (scope = 'family' AND subject_id IS NOT NULL AND event_id IS NULL AND course_id IS NULL)
);

-- Unique course names per event
ALTER TABLE courses ADD CONSTRAINT uk_courses_event_name UNIQUE (event_id, name);

-- Folder depth validation
ALTER TABLE folders ADD CONSTRAINT chk_folders_depth CHECK (depth >= 0 AND depth <= 10);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_access_logs ENABLE ROW LEVEL SECURITY;

-- Admin policies (full access for authenticated admin users)
CREATE POLICY "Admins can manage folders" ON folders
FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage assets" ON assets
FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage courses" ON courses
FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage course_members" ON course_members
FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage folder_courses" ON folder_courses
FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage asset_subjects" ON asset_subjects
FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage access_tokens" ON access_tokens
FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view token_access_logs" ON token_access_logs
FOR SELECT TO authenticated
USING (auth.jwt() ->> 'role' = 'admin');

-- Public access is handled through SECURITY DEFINER functions only
-- No direct table access for anonymous/public users
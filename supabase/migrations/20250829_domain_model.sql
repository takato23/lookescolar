-- ============================================================
-- MIGRACIÓN: Modelo de Dominios Separados
-- Fecha: 2025-08-28
-- Propósito: Separar cursos de familias, crear relaciones claras
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CURSOS: Entidad separada y clara
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE (event_id, name)
);

-- Índices para courses
CREATE INDEX IF NOT EXISTS idx_courses_event_id ON courses(event_id);
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(event_id, name);

-- ============================================================
-- 2. MEMBRESÍAS: Familias pertenecen a cursos (N:M)
-- ============================================================
CREATE TABLE IF NOT EXISTS course_members (
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  PRIMARY KEY (course_id, subject_id)
);

-- Índices para course_members
CREATE INDEX IF NOT EXISTS idx_course_members_subject ON course_members(subject_id);
CREATE INDEX IF NOT EXISTS idx_course_members_course ON course_members(course_id);

-- ============================================================
-- 3. CARPETAS ↔ CURSOS: Relación lógica para acceso por curso
-- ============================================================
CREATE TABLE IF NOT EXISTS folder_courses (
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  PRIMARY KEY (folder_id, course_id)
);

-- Índices para folder_courses
CREATE INDEX IF NOT EXISTS idx_folder_courses_course ON folder_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_folder_courses_folder ON folder_courses(folder_id);

-- ============================================================
-- 4. ASSETS ↔ FAMILIAS: Etiquetado para acceso familiar
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_subjects (
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  tagged_by uuid REFERENCES auth.users(id),
  
  PRIMARY KEY (asset_id, subject_id)
);

-- Índices para asset_subjects  
CREATE INDEX IF NOT EXISTS idx_asset_subjects_subject ON asset_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_asset_subjects_asset ON asset_subjects(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_subjects_tagged_by ON asset_subjects(tagged_by);

-- ============================================================
-- 5. TRIGGERS: Actualización automática de timestamps
-- ============================================================

-- Trigger para courses.updated_at
CREATE OR REPLACE FUNCTION update_course_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_course_updated_at();

-- ============================================================
-- 6. RLS POLICIES: Seguridad por defecto
-- ============================================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_subjects ENABLE ROW LEVEL SECURITY;

-- Policies para admin (desarrollo + producción)
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

-- ============================================================
-- 7. FUNCIONES AUXILIARES: Para gestión de datos
-- ============================================================

-- Función para obtener cursos de un evento
CREATE OR REPLACE FUNCTION get_event_courses(p_event_id uuid)
RETURNS TABLE (
  course_id uuid,
  course_name text,
  member_count bigint,
  folder_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    COALESCE(member_stats.count, 0) as member_count,
    COALESCE(folder_stats.count, 0) as folder_count
  FROM courses c
  LEFT JOIN (
    SELECT course_id, COUNT(*) as count
    FROM course_members
    GROUP BY course_id
  ) member_stats ON member_stats.course_id = c.id
  LEFT JOIN (
    SELECT course_id, COUNT(*) as count
    FROM folder_courses
    GROUP BY course_id
  ) folder_stats ON folder_stats.course_id = c.id
  WHERE c.event_id = p_event_id
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener familias de un curso
CREATE OR REPLACE FUNCTION get_course_families(p_course_id uuid)
RETURNS TABLE (
  subject_id uuid,
  first_name text,
  last_name text,
  family_name text,
  photo_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.first_name,
    s.last_name,
    s.family_name,
    COALESCE(photo_stats.count, 0) as photo_count
  FROM course_members cm
  JOIN subjects s ON s.id = cm.subject_id
  LEFT JOIN (
    SELECT subject_id, COUNT(*) as count
    FROM asset_subjects
    GROUP BY subject_id
  ) photo_stats ON photo_stats.subject_id = s.id
  WHERE cm.course_id = p_course_id
  ORDER BY s.family_name, s.first_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ============================================================
-- VERIFICACIÓN: Comprobar que las tablas se crearon correctamente
-- ============================================================

DO $$
DECLARE
  table_count INTEGER := 0;
  required_tables TEXT[] := ARRAY['courses', 'course_members', 'folder_courses', 'asset_subjects'];
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

  RAISE NOTICE '✅ Domain model tables created: %/%', table_count, array_length(required_tables, 1);
  
  IF table_count = array_length(required_tables, 1) THEN
    RAISE NOTICE '🎉 All domain model tables ready!';
  ELSE
    RAISE WARNING '⚠️ Some tables may be missing';
  END IF;
END $$;
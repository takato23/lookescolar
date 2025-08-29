-- ============================================================
-- MIGRACIÓN: Sistema de Tokens Unificado y Seguro
-- Fecha: 2025-08-28
-- Propósito: Tabla única para todos los scopes con seguridad real
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABLA UNIFICADA: Todos los scopes con seguridad hash+salt
-- ============================================================
CREATE TABLE IF NOT EXISTS access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('event','course','family')),
  
  -- Recurso según scope (solo uno no-null por constraint)
  event_id  uuid REFERENCES events(id)   ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id)  ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,

  -- 🔐 SEGURIDAD: Hash + salt (nunca texto plano)
  token_hash bytea NOT NULL,        -- digest(plain_token || salt, 'sha256')
  salt bytea NOT NULL,              -- gen_random_bytes(16)
  token_prefix text NOT NULL CHECK (length(token_prefix) BETWEEN 8 AND 12),
  
  -- 🎛️ CONTROL GRANULAR
  access_level text NOT NULL DEFAULT 'read_only' CHECK (access_level IN ('full','read_only')),
  can_download boolean NOT NULL DEFAULT false,
  max_uses int CHECK (max_uses IS NULL OR max_uses > 0),
  used_count int NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  
  -- 📅 GESTIÓN TEMPORAL
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  
  -- 📊 METADATOS
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}',

  -- ✅ CONSTRAINT: Un solo recurso por scope
  CONSTRAINT access_tokens_scope_resource_check CHECK (
    (scope='event'  AND event_id IS NOT NULL AND course_id IS NULL AND subject_id IS NULL) OR
    (scope='course' AND course_id IS NOT NULL AND event_id IS NULL  AND subject_id IS NULL) OR
    (scope='family' AND subject_id IS NOT NULL AND event_id IS NULL AND course_id IS NULL)
  ),
  
  -- ✅ CONSTRAINT: Si hay max_uses, used_count no debe excederlo
  CONSTRAINT access_tokens_usage_limit_check CHECK (
    max_uses IS NULL OR used_count <= max_uses
  )
);

-- ============================================================
-- 2. ÍNDICES OPTIMIZADOS: Para consultas rápidas
-- ============================================================

-- Índice principal para lookup rápido por prefix
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_tokens_prefix ON access_tokens(token_prefix);

-- Índices por scope y recurso
CREATE INDEX IF NOT EXISTS idx_access_tokens_scope_event ON access_tokens(scope, event_id) WHERE scope = 'event';
CREATE INDEX IF NOT EXISTS idx_access_tokens_scope_course ON access_tokens(scope, course_id) WHERE scope = 'course';
CREATE INDEX IF NOT EXISTS idx_access_tokens_scope_subject ON access_tokens(scope, subject_id) WHERE scope = 'family';

-- Índices para gestión admin
CREATE INDEX IF NOT EXISTS idx_access_tokens_created_by ON access_tokens(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires_at ON access_tokens(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_access_tokens_revoked_at ON access_tokens(revoked_at) WHERE revoked_at IS NOT NULL;

-- Índice covering para validación (evita lookup adicional)
CREATE INDEX IF NOT EXISTS idx_access_tokens_validation ON access_tokens(token_prefix) 
INCLUDE (token_hash, salt, expires_at, revoked_at, max_uses, used_count, scope);

-- ============================================================
-- 3. LOGS DE AUDITORÍA: Observabilidad completa
-- ============================================================
CREATE TABLE IF NOT EXISTS token_access_logs (
  id bigserial PRIMARY KEY,
  access_token_id uuid NOT NULL REFERENCES access_tokens(id) ON DELETE CASCADE,
  
  -- 📊 DATOS DEL ACCESO
  occurred_at timestamptz NOT NULL DEFAULT now(),
  ip inet,
  user_agent text,
  path text,         -- /s/:token o recurso solicitado
  action text CHECK (action IN ('list_folders', 'list_assets', 'download', 'view')),
  
  -- 🎯 RESULTADO
  ok boolean NOT NULL,
  response_time_ms int CHECK (response_time_ms >= 0),
  notes text
);

-- Índices para logs de auditoría
CREATE INDEX IF NOT EXISTS idx_token_access_logs_token ON token_access_logs(access_token_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_access_logs_time ON token_access_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_access_logs_ip ON token_access_logs(ip, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_access_logs_action ON token_access_logs(action, occurred_at DESC);

-- ============================================================
-- 4. TRIGGERS: Gestión automática de contadores
-- ============================================================

-- Trigger para incrementar used_count automáticamente
CREATE OR REPLACE FUNCTION increment_token_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo incrementar en logs exitosos
  IF NEW.ok = true THEN
    UPDATE access_tokens 
    SET 
      used_count = used_count + 1,
      last_used_at = NEW.occurred_at
    WHERE id = NEW.access_token_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER token_access_logs_increment_usage
  AFTER INSERT ON token_access_logs
  FOR EACH ROW
  EXECUTE FUNCTION increment_token_usage();

-- ============================================================
-- 5. RLS POLICIES: Seguridad por defecto
-- ============================================================

-- Habilitar RLS
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy para admin en access_tokens
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

-- Policy para admin en token_access_logs
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
-- 6. FUNCIONES AUXILIARES: Gestión de tokens
-- ============================================================

-- Función para validar y obtener datos del token
CREATE OR REPLACE FUNCTION validate_access_token(p_token_plain text)
RETURNS TABLE (
  token_id uuid,
  scope text,
  resource_id uuid,
  access_level text,
  can_download boolean,
  is_valid boolean,
  reason text
) SECURITY DEFINER AS $$
DECLARE
  v_token access_tokens%ROWTYPE;
  v_prefix text := left(p_token_plain, 10);
  v_expected_hash bytea;
BEGIN
  -- Buscar token por prefix
  SELECT * INTO v_token
  FROM access_tokens
  WHERE token_prefix = v_prefix;
  
  -- Token no encontrado
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::uuid, NULL::text, false, false, 'Token not found';
    RETURN;
  END IF;
  
  -- Verificar hash cryptográfico
  v_expected_hash := digest(p_token_plain || v_token.salt, 'sha256');
  IF v_token.token_hash != v_expected_hash THEN
    RETURN QUERY SELECT v_token.id, NULL::text, NULL::uuid, NULL::text, false, false, 'Invalid token';
    RETURN;
  END IF;
  
  -- Verificar si está revocado
  IF v_token.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT v_token.id, v_token.scope, NULL::uuid, NULL::text, false, false, 'Token revoked';
    RETURN;
  END IF;
  
  -- Verificar expiración
  IF v_token.expires_at IS NOT NULL AND v_token.expires_at <= now() THEN
    RETURN QUERY SELECT v_token.id, v_token.scope, NULL::uuid, NULL::text, false, false, 'Token expired';
    RETURN;
  END IF;
  
  -- Verificar límite de usos
  IF v_token.max_uses IS NOT NULL AND v_token.used_count >= v_token.max_uses THEN
    RETURN QUERY SELECT v_token.id, v_token.scope, NULL::uuid, NULL::text, false, false, 'Usage limit exceeded';
    RETURN;
  END IF;
  
  -- Token válido - devolver datos
  RETURN QUERY SELECT 
    v_token.id,
    v_token.scope,
    COALESCE(v_token.event_id, v_token.course_id, v_token.subject_id),
    v_token.access_level,
    v_token.can_download,
    true,
    'Valid'::text;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de uso de un token
CREATE OR REPLACE FUNCTION get_token_usage_stats(p_token_id uuid)
RETURNS TABLE (
  total_accesses bigint,
  successful_accesses bigint,
  failed_accesses bigint,
  unique_ips bigint,
  first_access timestamptz,
  last_access timestamptz,
  avg_response_time_ms numeric
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE ok = true),
    COUNT(*) FILTER (WHERE ok = false),
    COUNT(DISTINCT ip),
    MIN(occurred_at),
    MAX(occurred_at),
    ROUND(AVG(response_time_ms), 2)
  FROM token_access_logs
  WHERE access_token_id = p_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar tokens expirados (mantenimiento)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS TABLE (
  cleaned_tokens integer,
  cleaned_logs integer
) SECURITY DEFINER AS $$
DECLARE
  v_tokens_cleaned integer;
  v_logs_cleaned integer;
BEGIN
  -- Eliminar logs de tokens eliminados hace más de 90 días
  DELETE FROM token_access_logs 
  WHERE access_token_id IN (
    SELECT id FROM access_tokens 
    WHERE revoked_at < now() - interval '90 days'
  );
  GET DIAGNOSTICS v_logs_cleaned = ROW_COUNT;
  
  -- Eliminar tokens expirados hace más de 30 días
  DELETE FROM access_tokens 
  WHERE (expires_at < now() - interval '30 days') 
     OR (revoked_at < now() - interval '90 days');
  GET DIAGNOSTICS v_tokens_cleaned = ROW_COUNT;
  
  RETURN QUERY SELECT v_tokens_cleaned, v_logs_cleaned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ============================================================
-- VERIFICACIÓN: Comprobar que las tablas se crearon correctamente
-- ============================================================

DO $$
DECLARE
  table_count INTEGER := 0;
  required_tables TEXT[] := ARRAY['access_tokens', 'token_access_logs'];
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

  RAISE NOTICE '✅ Unified token tables created: %/%', table_count, array_length(required_tables, 1);
  
  IF table_count = array_length(required_tables, 1) THEN
    RAISE NOTICE '🔐 Token security system ready!';
  ELSE
    RAISE WARNING '⚠️ Some token tables may be missing';
  END IF;
END $$;
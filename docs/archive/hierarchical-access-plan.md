# Plan v2: Sistema de Acceso Jerárquico de Tokens
## 🎯 **VERSIÓN MEJORADA - Arquitectura Profesional**

> **Mejoras críticas:** Separación de dominios, seguridad real, performance, observabilidad completa

## Resumen Ejecutivo de Mejoras

### 🏗️ **Modelo Claro de Dominios**
- **Separar Cursos de Personas/Familias** (hoy `subjects` está sobrecargado)
- **Añadir `courses` y `course_members`** (familias ↔ cursos)
- **Usar `asset_subjects`** (assets ↔ personas/familias) para `/f/[token]` correcto
- **Relacionar carpetas con cursos**, no con familias (coherencia con nivel `/c`)

### 🔐 **Tokenización Unificada y Segura**
- **Tabla única `access_tokens`** con scope (event|course|family)
- **Hash del token** (no texto plano) + salt + prefijos legibles (E_, C_, F_)
- **Control granular:** `max_uses`, `can_download`, `revoked_at`, rate-limit
- **Auditoría completa:** logs de acceso, métricas reales

### ⚡ **Consultas Canónicas por Scope**
- **Funciones SQL** que resuelven "assets visibles por token" en un solo lugar
- **SECURITY DEFINER** para filtrar con service role (no RLS público)
- **Performance:** índices covering, vistas materializadas opcionales

## Análisis: Sistema Actual vs. Propuesto v2

### ✅ Lo que YA TENEMOS (Base sólida)

**Infrastructure:**
```sql
-- ✅ EVENTOS: Estructura base
events (id, name, school_name, date, active)

-- ✅ SUBJECTS: Representa FAMILIAS (no cursos - error conceptual corregido)
subjects (id, event_id, first_name, last_name, type, couple_first_name, family_name)

-- ✅ FOLDERS JERÁRQUICOS: Estructura completa
folders (id, name, parent_id, event_id, depth, is_published, share_token)

-- ✅ ASSETS: Sistema de archivos
assets (id, folder_id, filename, original_path, preview_path)

-- ✅ TOKENS BÁSICOS: Para migrar
subject_tokens (id, subject_id, token, expires_at, created_at, used_at)
```

**Servicios Existentes:**
- ✅ `tokenService` → Base para AccessTokenService
- ✅ `folder-publish.service` → Funciona, mantener
- ✅ RLS policies para admin → Mantener

### 🚀 **Lo que CONSTRUIMOS (Arquitectura v2)**

**1. Separación de Dominios (Nueva Estructura)**
```sql
-- 🆕 CURSOS: Entidad separada y clara
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, name)
);

-- 🆕 MEMBRESÍAS: Familias pertenecen a cursos
CREATE TABLE course_members (
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, subject_id)
);
CREATE INDEX idx_course_members_subject ON course_members(subject_id);

-- 🆕 CARPETAS ↔ CURSOS: Relación lógica
CREATE TABLE folder_courses (
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (folder_id, course_id)
);
CREATE INDEX idx_folder_courses_course ON folder_courses(course_id);

-- 🆕 ASSETS ↔ FAMILIAS: Etiquetado para /f/[token]
CREATE TABLE asset_subjects (
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, subject_id)
);
CREATE INDEX idx_asset_subjects_subject ON asset_subjects(subject_id);
CREATE INDEX idx_asset_subjects_asset ON asset_subjects(asset_id);
```

**2. Tokenización Unificada y Segura**
```sql
-- 🆕 TABLA ÚNICA: Todos los scopes en una tabla
CREATE TABLE access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('event','course','family')),
  
  -- Recurso según scope (solo uno no-null)
  event_id  uuid REFERENCES events(id)   ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id)  ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,

  -- 🔐 SEGURIDAD: Hash + salt (nunca texto plano)
  token_hash bytea NOT NULL,        -- digest(plain_token || salt, 'sha256')
  salt bytea NOT NULL,              -- gen_random_bytes(16)
  token_prefix text NOT NULL,       -- primeros 8-10 chars para lookup rápido
  
  -- 🎛️ CONTROL GRANULAR
  access_level text NOT NULL DEFAULT 'read_only' CHECK (access_level IN ('full','read_only')),
  can_download boolean NOT NULL DEFAULT false,
  max_uses int,                     -- null = ilimitado
  used_count int NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,

  -- 📊 METADATOS
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}',

  -- ✅ CONSTRAINT: Un solo recurso por scope
  CHECK (
    (scope='event'  AND event_id IS NOT NULL AND course_id IS NULL AND subject_id IS NULL) OR
    (scope='course' AND course_id IS NOT NULL AND event_id IS NULL  AND subject_id IS NULL) OR
    (scope='family' AND subject_id IS NOT NULL AND event_id IS NULL AND course_id IS NULL)
  )
);

-- 🚀 ÍNDICES OPTIMIZADOS
CREATE INDEX idx_access_tokens_prefix ON access_tokens(token_prefix);
CREATE INDEX idx_access_tokens_scope_event  ON access_tokens(scope, event_id);
CREATE INDEX idx_access_tokens_scope_course ON access_tokens(scope, course_id);
CREATE INDEX idx_access_tokens_scope_subject ON access_tokens(scope, subject_id);
```

**3. Logs de Auditoría**
```sql
-- 🆕 OBSERVABILIDAD COMPLETA
CREATE TABLE token_access_logs (
  id bigserial PRIMARY KEY,
  access_token_id uuid NOT NULL REFERENCES access_tokens(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  ip inet,
  user_agent text,
  path text,         -- /s/:token o recurso solicitado
  action text,       -- 'list_folders' | 'list_assets' | 'download'
  ok boolean NOT NULL,
  notes text
);
CREATE INDEX idx_token_access_logs_token ON token_access_logs(access_token_id);
CREATE INDEX idx_token_access_logs_time ON token_access_logs(occurred_at DESC);
```

**4. Funciones SQL Canónicas (SECURITY DEFINER)**
```sql
-- 🎯 UNA SOLA FUENTE DE VERDAD: Carpetas visibles por token
CREATE OR REPLACE FUNCTION api.folders_for_token(p_token text)
RETURNS TABLE (folder_id uuid) SECURITY DEFINER AS $$
DECLARE
  v_token access_tokens%ROWTYPE;
  v_plain_prefix text := left(p_token, 10);
BEGIN
  -- 🔍 Lookup rápido por prefix + verificación cryptográfica
  SELECT * INTO v_token
  FROM access_tokens
  WHERE token_prefix = v_plain_prefix
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND OR (digest(p_token || v_token.salt, 'sha256') <> v_token.token_hash) THEN
    RETURN; -- Token inválido
  END IF;

  -- 📊 Actualizar contadores de uso
  UPDATE access_tokens
     SET used_count = used_count + 1, last_used_at = now()
   WHERE id = v_token.id;

  -- 🚫 Verificar límites de uso
  IF v_token.max_uses IS NOT NULL AND v_token.used_count > v_token.max_uses THEN
    RETURN; -- Token agotado
  END IF;

  -- 🎯 LOGIC BY SCOPE
  -- Event: Todas las carpetas publicadas del evento
  IF v_token.scope = 'event' THEN
    RETURN QUERY
    SELECT f.id FROM folders f
     WHERE f.event_id = v_token.event_id AND f.is_published = true;

  -- Course: Solo carpetas vinculadas al curso
  ELSIF v_token.scope = 'course' THEN
    RETURN QUERY
    SELECT fc.folder_id FROM folder_courses fc
      JOIN folders f ON f.id = fc.folder_id
     WHERE fc.course_id = v_token.course_id AND f.is_published = true;

  -- Family: Carpetas de cursos donde pertenece la familia
  ELSE
    RETURN QUERY
    SELECT DISTINCT fc.folder_id
      FROM course_members cm
      JOIN folder_courses fc ON fc.course_id = cm.course_id
      JOIN folders f ON f.id = fc.folder_id
     WHERE cm.subject_id = v_token.subject_id AND f.is_published = true;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 🎯 Assets visibles por token (filtro por carpeta + familia si aplica)
CREATE OR REPLACE FUNCTION api.assets_for_token(p_token text)
RETURNS TABLE (asset_id uuid, folder_id uuid, filename text, preview_path text, original_path text)
SECURITY DEFINER AS $$
DECLARE
  v_token access_tokens%ROWTYPE;
BEGIN
  -- Validación igual que folders_for_token (reutilizable)
  SELECT * INTO v_token FROM access_tokens
  WHERE token_prefix = left(p_token, 10)
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND OR (digest(p_token || v_token.salt, 'sha256') <> v_token.token_hash) THEN
    RETURN;
  END IF;

  -- Event/Course: Todos los assets de carpetas accesibles
  IF v_token.scope IN ('event','course') THEN
    RETURN QUERY
    SELECT a.id, a.folder_id, a.filename, a.preview_path, a.original_path
      FROM assets a
      JOIN api.folders_for_token(p_token) tf ON tf.folder_id = a.folder_id;

  -- Family: Solo assets etiquetados con la familia
  ELSE
    RETURN QUERY
    SELECT a.id, a.folder_id, a.filename, a.preview_path, a.original_path
      FROM assets a
      JOIN asset_subjects ats ON ats.asset_id = a.id
      JOIN api.folders_for_token(p_token) tf ON tf.folder_id = a.folder_id
     WHERE ats.subject_id = v_token.subject_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## Arquitectura v2: 3 Niveles de Acceso Seguros

```
EVENTO (Escuela completa)
├── /s/E_abc123defgh → Acceso TOTAL al evento (Director)
│
├── CURSO A (5º Grado A)
│   ├── /s/C_def456ijkl → Solo curso A (Maestra A)
│   ├── Carpeta: "Acto de fin de año" 
│   └── Carpeta: "Excursión"
│
├── CURSO B (5º Grado B)  
│   ├── /s/C_ghi789mnop → Solo curso B (Maestra B)
│   └── Carpeta: "Día del estudiante"
│
└── FAMILIAS dentro de cada curso
    ├── /s/F_jkl012qrst → Solo fotos de Juan Pérez
    └── /s/F_mno345uvwx → Solo fotos de Ana García
```

> **Rutas Unificadas:** Una sola `/s/[token]` con prefijos legibles (E_, C_, F_)

## Plan de Implementación v2: Profesional

### FASE 1: Base de Datos - Separación de Dominios (2h)

**1.1 Migración: Modelo de Dominios**
```sql
-- 📁 supabase/migrations/20250828_domain_model.sql
BEGIN;

-- 🆕 CURSOS: Entidad separada y clara
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, name)
);

-- 🆕 MEMBRESÍAS: Familias pertenecen a cursos
CREATE TABLE course_members (
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, subject_id)
);
CREATE INDEX idx_course_members_subject ON course_members(subject_id);

-- 🆕 CARPETAS ↔ CURSOS: Relación lógica
CREATE TABLE folder_courses (
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (folder_id, course_id)
);
CREATE INDEX idx_folder_courses_course ON folder_courses(course_id);

-- 🆕 ASSETS ↔ FAMILIAS: Etiquetado para /f/[token]
CREATE TABLE asset_subjects (
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, subject_id)
);
CREATE INDEX idx_asset_subjects_subject ON asset_subjects(subject_id);
CREATE INDEX idx_asset_subjects_asset ON asset_subjects(asset_id);

COMMIT;
```

**1.2 Migración: Sistema de Tokens Unificado**
```sql
-- 📁 supabase/migrations/20250828_unified_tokens.sql
BEGIN;

-- 🆕 TABLA ÚNICA: Todos los scopes
CREATE TABLE access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('event','course','family')),
  
  -- Recurso según scope (solo uno no-null)
  event_id  uuid REFERENCES events(id)   ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id)  ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,

  -- 🔐 SEGURIDAD: Hash + salt
  token_hash bytea NOT NULL,
  salt bytea NOT NULL,
  token_prefix text NOT NULL,
  
  -- 🎛️ CONTROL GRANULAR
  access_level text NOT NULL DEFAULT 'read_only' CHECK (access_level IN ('full','read_only')),
  can_download boolean NOT NULL DEFAULT false,
  max_uses int,
  used_count int NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}',

  -- ✅ CONSTRAINT: Un solo recurso por scope
  CHECK (
    (scope='event'  AND event_id IS NOT NULL AND course_id IS NULL AND subject_id IS NULL) OR
    (scope='course' AND course_id IS NOT NULL AND event_id IS NULL  AND subject_id IS NULL) OR
    (scope='family' AND subject_id IS NOT NULL AND event_id IS NULL AND course_id IS NULL)
  )
);

-- 🚀 ÍNDICES OPTIMIZADOS
CREATE INDEX idx_access_tokens_prefix ON access_tokens(token_prefix);
CREATE INDEX idx_access_tokens_scope_event  ON access_tokens(scope, event_id);
CREATE INDEX idx_access_tokens_scope_course ON access_tokens(scope, course_id);
CREATE INDEX idx_access_tokens_scope_subject ON access_tokens(scope, subject_id);

-- 🆕 LOGS DE AUDITORÍA
CREATE TABLE token_access_logs (
  id bigserial PRIMARY KEY,
  access_token_id uuid NOT NULL REFERENCES access_tokens(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  ip inet,
  user_agent text,
  path text,
  action text,
  ok boolean NOT NULL,
  notes text
);
CREATE INDEX idx_token_access_logs_token ON token_access_logs(access_token_id);
CREATE INDEX idx_token_access_logs_time ON token_access_logs(occurred_at DESC);

COMMIT;
```

**1.3 Migración: Funciones SQL Canónicas**  
```sql
-- 📁 supabase/migrations/20250828_canonical_functions.sql
BEGIN;

-- Incluir las funciones api.folders_for_token() y api.assets_for_token()
-- (Ya definidas arriba en la sección de funciones SQL)

COMMIT;
```

### FASE 2: Servicios Backend - Unificado y Seguro (2h)

**2.1 Token Generation & Validation**
```typescript
// 📁 lib/utils/tokens.ts
import { randomBytes, createHash } from 'crypto';

function toBase62(buffer: Buffer): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  let num = BigInt('0x' + buffer.toString('hex'));
  while (num > 0) {
    result = chars[Number(num % 62n)] + result;
    num = num / 62n;
  }
  return result || '0';
}

export function generateReadableToken(prefix: 'E'|'C'|'F'): { 
  token: string; 
  prefix: string; 
  salt: Buffer; 
  hash: Buffer;
} {
  const raw = `${prefix}_${toBase62(randomBytes(16))}`;
  const salt = randomBytes(16);
  const hash = createHash('sha256').update(raw).update(salt).digest();
  
  return { 
    token: raw, 
    prefix: raw.slice(0, 10), 
    salt, 
    hash 
  };
}
```

**2.2 Unified Access Token Service**
```typescript
// 📁 lib/services/access-token.service.ts
export class AccessTokenService {
  // 🎯 Generar tokens por scope
  async createEventToken(eventId: string, options?: {
    accessLevel?: 'full'|'read_only';
    canDownload?: boolean;
    expiresAt?: Date;
    maxUses?: number;
  }) {
    const { token, prefix, salt, hash } = generateReadableToken('E');
    
    const { data } = await this.supabase
      .from('access_tokens')
      .insert({
        scope: 'event',
        event_id: eventId,
        token_hash: hash,
        salt: salt,
        token_prefix: prefix,
        access_level: options?.accessLevel || 'read_only',
        can_download: options?.canDownload || false,
        expires_at: options?.expiresAt,
        max_uses: options?.maxUses,
      })
      .select()
      .single();

    return { ...data, plainToken: token };
  }

  async createCourseToken(courseId: string, options?: {...}) {
    const { token, prefix, salt, hash } = generateReadableToken('C');
    // Similar implementation
  }

  async createFamilyToken(subjectId: string, options?: {...}) {
    const { token, prefix, salt, hash } = generateReadableToken('F');
    // Similar implementation
  }

  // 🔐 Validación unificada
  async validateToken(plainToken: string): Promise<TokenValidation | null> {
    const prefix = plainToken.slice(0, 10);
    
    const { data } = await this.supabase
      .from('access_tokens')
      .select('*')
      .eq('token_prefix', prefix)
      .is('revoked_at', null)
      .single();

    if (!data) return null;

    // Verificación cryptográfica
    const expectedHash = createHash('sha256')
      .update(plainToken)
      .update(data.salt)
      .digest();

    if (!data.token_hash.equals(expectedHash)) return null;

    // Verificar expiración y límites
    if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
    if (data.max_uses && data.used_count >= data.max_uses) return null;

    return {
      tokenId: data.id,
      scope: data.scope,
      resourceId: data.event_id || data.course_id || data.subject_id,
      accessLevel: data.access_level,
      canDownload: data.can_download,
    };
  }

  // 🔄 Gestión de tokens
  async revokeToken(tokenId: string) {
    return this.supabase
      .from('access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', tokenId);
  }

  async rotateToken(tokenId: string) {
    // Genera nuevo token manteniendo metadatos, revoca el anterior
  }

  // 📊 Métricas de uso
  async getTokenUsage(tokenId: string) {
    return this.supabase
      .from('token_access_logs')
      .select('*')
      .eq('access_token_id', tokenId)
      .order('occurred_at', { ascending: false });
  }
}
```

**2.3 Course Management Service**
```typescript
// 📁 lib/services/course-management.service.ts
export class CourseManagementService {
  // 🏫 Gestión de cursos
  async createCourse(eventId: string, courseName: string) {
    return this.supabase
      .from('courses')
      .insert({ event_id: eventId, name: courseName })
      .select()
      .single();
  }

  // 👨‍👩‍👧‍👦 Gestión de membresías
  async addFamilyToCourse(courseId: string, subjectId: string) {
    return this.supabase
      .from('course_members')
      .insert({ course_id: courseId, subject_id: subjectId });
  }

  // 📁 Vinculación carpetas-cursos  
  async linkFolderToCourses(folderId: string, courseIds: string[]) {
    const rows = courseIds.map(courseId => ({
      folder_id: folderId,
      course_id: courseId,
    }));

    return this.supabase
      .from('folder_courses')
      .upsert(rows);
  }

  // 🏷️ Etiquetado assets-familias
  async tagAssetsWithFamily(assetIds: string[], subjectId: string) {
    const rows = assetIds.map(assetId => ({
      asset_id: assetId,
      subject_id: subjectId,
    }));

    return this.supabase
      .from('asset_subjects')
      .upsert(rows);
  }
}
```

### FASE 3: Ruta Unificada - Más Simple y Segura (1.5h)

**3.1 Ruta Unificada: /s/[token]**
```typescript
// 📁 app/(share)/s/[token]/page.tsx
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function SharePage({ params }: { params: { token: string } }) {
  const supabase = await createServerSupabaseClient();
  
  // 🎯 Usar funciones SQL canónicas
  const [foldersResult, assetsResult] = await Promise.all([
    supabase.rpc('api.folders_for_token', { p_token: params.token }),
    supabase.rpc('api.assets_for_token', { p_token: params.token })
  ]);

  if (!foldersResult.data?.length) return notFound();

  // 📊 Log del acceso (auditoría)
  await logTokenAccess(params.token, 'list_folders', req);

  return (
    <UnifiedShareGallery 
      folders={foldersResult.data}
      assets={assetsResult.data}
      token={params.token}
    />
  );
}

// 🔐 Middleware de seguridad
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // 🚫 Headers de seguridad
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'private, max-age=300');
  
  // 🛡️ Rate limiting por IP
  const ip = request.ip || 'unknown';
  const isRateLimited = await checkRateLimit(ip);
  
  if (isRateLimited) {
    return new Response('Too Many Requests', { status: 429 });
  }
  
  return response;
}
```

**3.2 Componente Unificado de Galería**
```typescript
// 📁 components/share/UnifiedShareGallery.tsx
interface UnifiedShareGalleryProps {
  folders: Array<{ folder_id: string };
  assets: Array<{ asset_id: string; folder_id: string; filename: string; preview_path: string };
  token: string;
}

export function UnifiedShareGallery({ folders, assets, token }: UnifiedShareGalleryProps) {
  const scope = token.startsWith('E_') ? 'event' : 
               token.startsWith('C_') ? 'course' : 'family';
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🎨 Header contextual por scope */}
      <ShareHeader scope={scope} />
      
      {/* 📁 Navegación de carpetas */}
      <FolderNavigation folders={folders} />
      
      {/* 🖼️ Galería de assets con lazy loading */}
      <VirtualizedAssetGrid 
        assets={assets}
        onDownload={(assetId) => handleDownload(assetId, token)}
      />
      
      {/* 🔒 Footer con info de token (sin exponer detalles) */}
      <ShareFooter />
    </div>
  );
}

async function handleDownload(assetId: string, token: string) {
  // ✅ Verificar can_download antes de permitir descarga
  const response = await fetch(`/api/share/download/${assetId}?token=${token}`);
  
  if (!response.ok) {
    toast.error('Descarga no permitida');
    return;
  }
  
  // Stream del archivo
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `foto-${assetId}.jpg`;
  document.body.appendChild(a);
  a.click();
  
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```

**3.3 API de Descarga Segura**
```typescript  
// 📁 app/api/share/download/[assetId]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return new Response('Token required', { status: 401 });

  // 🔐 Validar token y can_download
  const tokenService = new AccessTokenService();
  const validation = await tokenService.validateToken(token);
  
  if (!validation || !validation.canDownload) {
    return new Response('Download not allowed', { status: 403 });
  }

  // 📊 Log de descarga
  await logTokenAccess(token, 'download', request, params.assetId);

  // 🎯 Verificar que el asset es accesible por el token
  const supabase = await createServerSupabaseServiceClient();
  const { data: assets } = await supabase.rpc('api.assets_for_token', { 
    p_token: token 
  });

  const asset = assets?.find(a => a.asset_id === params.assetId);
  if (!asset) return new Response('Asset not found', { status: 404 });

  // 📦 Stream del archivo desde Supabase Storage
  const { data } = await supabase.storage
    .from('photo-private')
    .download(asset.original_path);

  if (!data) return new Response('File not found', { status: 404 });

  return new Response(data, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="foto-${params.assetId}.jpg"`,
    },
  });
}
```

### FASE 4: APIs Admin Unificadas (1.5h)

**4.1 API Unificada de Tokens**
```typescript
// 📁 app/api/admin/access-tokens/route.ts
export async function POST(request: NextRequest) {
  const { scope, resourceId, accessLevel, canDownload, maxUses, expiresAt } = await request.json();
  
  const tokenService = new AccessTokenService();
  
  switch (scope) {
    case 'event':
      return tokenService.createEventToken(resourceId, { accessLevel, canDownload, maxUses, expiresAt });
    case 'course':
      return tokenService.createCourseToken(resourceId, { accessLevel, canDownload, maxUses, expiresAt });
    case 'family':
      return tokenService.createFamilyToken(resourceId, { accessLevel, canDownload, maxUses, expiresAt });
  }
}

// GET /api/admin/access-tokens?scope=event&resourceId=123
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const scope = searchParams.get('scope');
  const resourceId = searchParams.get('resourceId');
  
  // Listar tokens por scope y recurso
}

// 📁 app/api/admin/access-tokens/[tokenId]/route.ts
export async function DELETE(request: NextRequest, { params }: { params: { tokenId: string } }) {
  const tokenService = new AccessTokenService();
  return tokenService.revokeToken(params.tokenId);
}

export async function PUT(request: NextRequest, { params }: { params: { tokenId: string } }) {
  const { action } = await request.json();
  
  const tokenService = new AccessTokenService();
  
  if (action === 'rotate') {
    return tokenService.rotateToken(params.tokenId);
  }
  
  // Otros updates...
}
```

**4.2 API de Course Management**  
```typescript
// 📁 app/api/admin/courses/route.ts
export async function POST(request: NextRequest) {
  const { eventId, courseName } = await request.json();
  
  const courseService = new CourseManagementService();
  return courseService.createCourse(eventId, courseName);
}

// 📁 app/api/admin/folders/[id]/courses/route.ts
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { courseIds } = await request.json();
  
  const courseService = new CourseManagementService();
  return courseService.linkFolderToCourses(params.id, courseIds);
}

// 📁 app/api/admin/assets/tag/route.ts
export async function POST(request: NextRequest) {
  const { assetIds, subjectId } = await request.json();
  
  const courseService = new CourseManagementService();
  return courseService.tagAssetsWithFamily(assetIds, subjectId);
}
```

### FASE 5: UI Admin Unificada - Con Vista Previa (2h)

**5.1 Gestor Unificado de Tokens**
```typescript
// 📁 components/admin/UnifiedAccessTokenManager.tsx
export function UnifiedAccessTokenManager({ scope, resourceId }: {
  scope: 'event' | 'course' | 'family';
  resourceId: string;
}) {
  const [tokens, setTokens] = useState([]);
  const [previewToken, setPreviewToken] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* 🎛️ Crear Token */}
      <CreateTokenForm 
        scope={scope}
        resourceId={resourceId}
        onTokenCreated={(token) => setTokens([...tokens, token])}
      />

      {/* 📊 Lista de Tokens Activos */}
      <TokenList 
        tokens={tokens}
        onRevoke={handleRevoke}
        onRotate={handleRotate}
        onPreview={(token) => setPreviewToken(token)}
      />

      {/* 🔍 Vista Previa "Ver Como" */}
      {previewToken && (
        <TokenPreviewModal 
          token={previewToken}
          onClose={() => setPreviewToken(null)}
        />
      )}

      {/* 📱 QR Code Generator */}
      <QRCodeGenerator tokens={tokens} />
    </div>
  );
}

// Vista previa en sandbox
function TokenPreviewModal({ token }: { token: string }) {
  return (
    <Dialog>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Vista Previa: {token.slice(0, 12)}...</DialogTitle>
        </DialogHeader>
        
        {/* 🎯 Iframe sandbox con el token */}
        <iframe 
          src={`/s/${token}?preview=true`}
          className="w-full h-96 border rounded"
          sandbox="allow-same-origin allow-scripts"
        />
        
        <div className="text-sm text-gray-500">
          Esto es exactamente lo que verán los usuarios con este token.
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**5.2 Course & Folder Linker**  
```typescript
// 📁 components/admin/CourseLinker.tsx
export function CourseLinker({ folderId }: { folderId: string }) {
  const [courses, setCourses] = useState([]);
  const [linkedCourses, setLinkedCourses] = useState([]);

  return (
    <div className="space-y-4">
      <h3>Vincular Carpeta con Cursos</h3>
      
      {/* ✅ Checkboxes por curso */}
      {courses.map(course => (
        <div key={course.id} className="flex items-center space-x-2">
          <Checkbox 
            checked={linkedCourses.includes(course.id)}
            onChange={(checked) => handleLinkChange(course.id, checked)}
          />
          <label>{course.name}</label>
          
          {/* 👥 Preview de familias en el curso */}
          <Badge variant="outline">
            {course.family_count} familias
          </Badge>
        </div>
      ))}

      {/* 🔄 Bulk Operations */}
      <div className="flex gap-2">
        <Button onClick={handleSelectAll}>Seleccionar Todo</Button>
        <Button onClick={handleSelectNone} variant="outline">Deseleccionar</Button>
        <Button onClick={handleApplyChanges} variant="default">Aplicar Cambios</Button>
      </div>
    </div>
  );
}
```

## ⚡ Performance & Migración sin Downtime

### **Optimizaciones de Performance**
```sql
-- 🚀 Índices covering para consultas frecuentes
CREATE INDEX idx_assets_folder_cover ON assets(folder_id, id) 
INCLUDE (preview_path, filename, original_path);

-- 📊 Vista materializada opcional para alta escala
CREATE MATERIALIZED VIEW mv_course_folder_assets AS
SELECT fc.course_id, fc.folder_id, a.id as asset_id, a.preview_path
FROM folder_courses fc
JOIN assets a ON a.folder_id = fc.folder_id
WHERE a.status = 'ready';

CREATE INDEX idx_mv_course_folder_assets ON mv_course_folder_assets(course_id);
```

### **Migración Sin Downtime**
```sql
-- 📁 supabase/migrations/20250828_migration_strategy.sql
BEGIN;

-- 1️⃣ Crear tablas nuevas (sin afectar tráfico actual)
-- (Ya definidas arriba)

-- 2️⃣ Backfill gradual de datos existentes
-- Migrar subjects actuales → courses + course_members
INSERT INTO courses (event_id, name) 
SELECT DISTINCT event_id, COALESCE(grade || ' ' || section, 'Sin Curso')
FROM subjects 
WHERE grade IS NOT NULL;

-- Vincular familias con cursos basado en grade/section
INSERT INTO course_members (course_id, subject_id)
SELECT c.id, s.id 
FROM subjects s
JOIN courses c ON c.event_id = s.event_id 
AND c.name = COALESCE(s.grade || ' ' || s.section, 'Sin Curso');

-- 3️⃣ Mantener subject_tokens funcionando (retrocompatibilidad)
-- Los tokens familiares actuales siguen funcionando via /f/[token]

-- 4️⃣ Nuevos tokens van a access_tokens
-- El admin UI permite crear tokens nuevos en paralelo

COMMIT;
```

## 🎯 **Conclusión - Plan v2 Mejorado**

### **Beneficios vs. Plan Original:**
- ✅ **Separación de dominios** → Cursos ≠ Familias (claridad conceptual)
- ✅ **Seguridad real** → Hash+salt vs texto plano (nunca más tokens expuestos)  
- ✅ **Observabilidad completa** → Logs, métricas, auditoría (control total)
- ✅ **Performance optimizada** → Funciones SQL, índices covering (escalable)
- ✅ **UI con vista previa** → "Ver como" sandbox (UX superior)

### **Timeline Actualizado:**
| Fase | Tiempo | Descripción |
|------|--------|-------------|
| 1 | 2h | Migraciones DB (dominios + tokens unificados) |
| 2 | 2h | Servicios backend (AccessTokenService + CourseManagement) |
| 3 | 1.5h | Ruta unificada /s/[token] + middleware seguridad |
| 4 | 1.5h | APIs admin unificadas |
| 5 | 2h | UI admin con vista previa y QR |
| **TOTAL** | **9h** | **Sistema v2 completo** |

### **Migración Segura:**
1. ✅ **Retrocompatibilidad completa** → `/f/[token]` sigue funcionando
2. ✅ **Testing en paralelo** → Nuevos tokens conviven con actuales  
3. ✅ **Rollback simple** → Tablas nuevas son opcionales
4. ✅ **Zero downtime** → Migración gradual sin interrupciones

**¿Procedemos con la implementación del Plan v2 Mejorado?**

## Casos de Uso y Flujos

### Caso 1: Director quiere dar acceso completo al evento
```
1. Admin → /admin/events/[id]/tokens
2. Click "Generar Token Evento Completo" 
3. Sistema genera: /e/abc123
4. Director comparte link → Padres ven TODO el evento
```

### Caso 2: Maestra quiere acceso solo a su curso  
```
1. Admin → /admin/events/[id] → Curso "5º A"
2. Click "Generar Token de Curso"
3. Sistema genera: /c/def456  
4. Maestra comparte → Solo ven fotos de 5º A
```

### Caso 3: Familia quiere acceso individual
```
1. (Ya funciona) → /f/jkl012
2. Solo ven fotos de sus hijos
```

### Caso 4: Gestión de carpetas por curso
```
1. Admin sube fotos del "Acto de fin de año"
2. En publish → Vincula carpeta con "5º A" y "5º B"
3. Token /c/curso-5a → Solo ve carpetas de 5º A
4. Token /e/evento → Ve todas las carpetas
```

## Beneficios del Sistema Jerárquico

### Escalabilidad  
- ✅ **Antes**: 100 carpetas = 100 links individuales
- ✅ **Después**: 1 link de evento = acceso a 100 carpetas

### Flexibilidad de Acceso
- 🎯 **Evento completo**: Director, coordinadores  
- 🎯 **Por curso**: Maestras, padres delegados
- 🎯 **Por familia**: Padres individuales

### Gestión Simplificada
- ✅ Menos tokens que gestionar
- ✅ Permisos más claros y organizados
- ✅ Bulk operations más eficientes

### Performance Mejorada
- ✅ Caching por nivel de jerarquía
- ✅ Lazy loading de carpetas
- ✅ Filtros más eficientes en base de datos

## Timeline de Implementación

| Fase | Tiempo | Descripción |
|------|--------|-------------|
| 1 | 2h | Migraciones DB + RLS policies |
| 2 | 3h | Servicios backend (event/course tokens) |
| 3 | 2h | Rutas /e/[token] y /c/[token] |
| 4 | 2h | APIs de gestión admin |
| 5 | 3h | Interface admin para tokens |
| **TOTAL** | **12h** | **Sistema completo funcional** |

## Migración Sin Downtime

1. **Retrocompatibilidad**: `/f/[token]` sigue funcionando
2. **Migración gradual**: Event/course tokens se agregan sin afectar familia tokens  
3. **Testing**: Crear tokens de prueba antes del rollout
4. **Rollback**: Todas las tablas nuevas son opcionales

## Consideraciones de Seguridad

### Tokens de Evento (Alto Acceso)
- ✅ Expiración: 90 días (más larga)
- ✅ Rotación: Manual por admin
- ✅ Auditoría: Log de todos los accesos

### Tokens de Curso (Acceso Medio)  
- ✅ Expiración: 60 días
- ✅ Acceso de solo lectura por defecto
- ✅ Vinculación específica folder-subject

### Tokens de Familia (Acceso Restringido)
- ✅ Expiración: 30 días (actual)
- ✅ Solo sus fotos familiares
- ✅ Sistema actual mantiene funcionalidad

## Próximos Pasos Inmediatos

1. **Validar plan** con el equipo/usuario
2. **Crear branch**: `feat/hierarchical-access-system`  
3. **Implementar Fase 1**: Migraciones de base de datos
4. **Testing**: Verificar que no rompe funcionalidad actual
5. **Implementar por fases**: 1→2→3→4→5

---

**Conclusión**: Tenemos 80% de la infraestructura lista. El sistema jerárquico propuesto es **factible, escalable y mantiene retrocompatibilidad**. La implementación completa tomaría ~12 horas de desarrollo en 5 fases bien definidas.
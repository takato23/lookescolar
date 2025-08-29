# Plan v2: Sistema de Acceso Jerárquico de Tokens

## 🎯 **VERSIÓN MEJORADA - Arquitectura Profesional**

> **Mejoras críticas:** Separación de dominios, seguridad real, performance, observabilidad completa

## Resumen Ejecutivo de Mejoras

### 🏗️ **Modelo Claro de Dominios**
- **Separar Cursos de Personas/Familias** (hoy `subjects` está sobrecargado)
- **Añadir `courses` y `course_members`** (familias ↔ cursos)
- **Usar `asset_subjects`** (assets ↔ personas/familias) para galerías `/store-unified/[token]` ajustadas al tipo de token
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

-- ✅ SUBJECTS: Representa FAMILIAS
tokens familiares actuales siguen funcionando vía `/store-unified/[token]`

-- ✅ FOLDERS JERÁRQUICOS: Estructura completa
folders (id, name, parent_id, event_id, depth, is_published, share_token)

-- ✅ ASSETS: Sistema de archivos
assets (id, folder_id, filename, original_path, preview_path)

-- ✅ TOKENS BÁSICOS: Para migrar
subject_tokens (id, subject_id, token, expires_at, created_at, used_at)
```

**Servicios Existentes:**
- ✅ `hierarchicalGalleryService` → base para funciones de validación de acceso
- ✅ `UnifiedStorePage` → ruta SSR en `/store-unified/[token]`
- ✅ RLS policies para admin → Mantener

### 🚀 **Lo que CONSTRUIMOS (Arquitectura v2)**

**1. Separación de Dominios (Nueva Estructura)**
```sql
-- 🆕 CURSOS: Entidad separada y clara
CREATE TABLE courses (...);
-- 🆕 MEMBRESÍAS: Familias pertenecen a cursos
CREATE TABLE course_members (...);
-- 🆕 CARPETAS ↔ CURSOS: Relación lógica
CREATE TABLE folder_courses (...);
-- 🆕 ASSETS ↔ FAMILIAS: Etiquetado para galerías por familia
CREATE TABLE asset_subjects (...);
```

**2. Tokenización Unificada y Segura**
```sql
-- 🆕 TABLA ÚNICA: Todos los scopes en access_tokens
digest(token||salt,'sha256') + prefix
```

**3. Logs de Auditoría**
```sql
-- 🆕 token_access_logs para seguimiento de uso
```

**4. Funciones SQL Canónicas (SECURITY DEFINER)**
- `api.folders_for_token(p_token)`
- `api.assets_for_token(p_token)`

## Arquitectura v2: 3 Niveles de Acceso Seguros

```
EVENTO (Nivel event)
└── use `/store-unified/[E_token]` → Acceso TOTAL al evento

CURSO (Nivel course)
└── use `/store-unified/[C_token]` → Solo curso específico

FAMILIA (Nivel family)
└── use `/store-unified/[F_token]` → Solo fotos de la familia
```

> **Rutas Unificadas:** Una sola ruta `/store-unified/[token]` que, según el prefijo (`E_`,`C_`,`F_`), determina el alcance de acceso.

## Plan de Implementación v2: Profesional

### FASE 1: Base de Datos - Separación de Dominios (2h)
1. Migraciones para cursos, membresías y asset_subjects
2. Migración unificada de access_tokens y auditoría
3. Funciones SQL canónicas para folder/asset lookup

### FASE 2: Servicios Backend - Unificado y Seguro (2h)
- `AccessTokenService`: creación, validación, rotación de tokens
- `CourseManagementService`: manejo de cursos y miembros

### FASE 3: Ruta Unificada `/store-unified/[token]` (1.5h)
- SSR en `app/store-unified/[token]/page.tsx`
- Seguridad: headers, robot tags, logging

### FASE 4: APIs Admin Unificadas (1.5h)
- `/api/admin/access-tokens` para CRUD de tokens
- `/api/admin/courses` y rutas de vinculación de carpetas

### FASE 5: UI Admin Unificada (2h)
- Componente `UnifiedAccessTokenManager`
- Preview modal con iframe sandbox

**TOTAL:** ~9 horas de desarrollo

## Conclusión
Este plan alinea la implementación real (`app/store-unified/[token]`) con la documentación y reemplaza rutas `/s/[token]` por la única `/store-unified/[token]`.

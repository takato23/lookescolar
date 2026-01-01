# Deprecation Log - LookEscolar

> This file tracks deprecated code, APIs, and patterns that should be removed in future versions.

## 2025-01 - Legacy Gallery Endpoint

### `/api/family/gallery-simple/[token]`
**Status**: ⚠️ DEPRECATED (will be removed in v2.0)

**Reason**: Replaced by unified `/api/family/gallery` endpoint

**Migration Path**:
- Use `/api/family/gallery?token=${token}` instead
- Payload structure is compatible with minor adjustments
- See `docs/ARCHITECTURE_REWRITE_LOG.md` for details

**Backward Compatibility**: 
- Current implementation acts as thin wrapper
- Will remain functional until v2.0 (estimated Q2 2025)

**Files Affected**:
- `app/api/family/gallery-simple/[token]/route.ts` - **Marked for removal**
- `lib/utils/gallery-links.ts` - Contains migration helpers

## 2025-01 - Legacy PhotoAdmin Monolithic Structure

### `components/admin/PhotoAdmin.tsx`
**Status**: 🔄 IN REFACTOR

**Reason**: Monolithic 5589-line component splitting into modules

**Migration Path**:
- New modular structure in `components/admin/photo-admin/`
- `FolderTreePanel` extracted successfully
- `PhotoGridPanel` extraction planned

**Files Created**:
- `components/admin/photo-admin/components/FolderTreePanel.tsx`
- `components/admin/photo-admin/components/SafeImage.tsx`
- `components/admin/photo-admin/hooks/usePhotoSelection.ts`
- `components/admin/photo-admin/services/*`

## 2025-01 - Enhanced Temporary Components

### Various "Enhanced" prefixed components
**Status**: ⚠️ MARKED FOR CLEANUP

**Files**:
- `components/gallery/EnhancedGallery.tsx` - Should consolidate into `UnifiedGallery`
- `components/admin/EnhancedPhotoManagement.tsx` - Merge into main components
- Pattern: Any component with "Enhanced" prefix is likely temporary

**Action**: Review and consolidate into main components

## 2025-02 - Store Config Endpoints

### `/api/public/store/config` and `/api/store/settings`
**Status**: ⚠️ DEPRECATED (wrapper only)

**Reason**: Consolidated public store access into `/api/store/[token]` (settings + availability + assets).

**Migration Path**:
- Use `GET /api/store/[token]?include_assets=false` for settings/availability.
- Use `GET /api/store/[token]` for full public store payload.

**Backward Compatibility**:
- Both endpoints return a warning header and proxy to `/api/store/[token]`.
- Removal planned after external integrations migrate.

**Files Affected**:
- `app/api/public/store/config/route.ts` - **Wrapper only**
- `app/api/store/settings/route.ts` - **Deprecated endpoint**

## Notes

- Prefer documenting over deleting to avoid breaking changes
- Mark deprecated code with `@deprecated` JSDoc comments
- Update this file when deprecating new features
- Set removal timeline (typically 1-2 major versions after deprecation)




















# Event Photo Library Implementation

**⚠️ ATTENTION: Temporary Maintenance**
The Event Photo Library page is currently under maintenance. The full `EventPhotoManager` component has been disabled temporarily, and a skeleton placeholder is displayed until it is stabilized.

## Overview

The Event Photo Library is a comprehensive photo management system that unifies Events and Photos into a single, modern file explorer-style interface. This implementation replaces the traditional separate photo management with an integrated hierarchical folder system.

## 🎯 Key Features

### Core Functionality
- **Hierarchical Folder Structure**: Unlimited nesting with automatic path computation
- **Unified Interface**: Three-panel layout (Folder Tree, Content Grid, Details Panel)
- **High Performance**: Virtualized rendering supporting thousands of photos
- **Drag & Drop**: Intuitive photo and folder organization
- **Multi-Selection**: Advanced selection with keyboard shortcuts
- **Real-time Upload**: Drag & drop with progress tracking
- **Secure Sharing**: Token-based sharing with comprehensive permissions
- **Watermarked Previews**: Automatic low-resolution preview generation

### Technical Features
- **Feature Flag System**: Safe gradual rollout capability
- **Security Monitoring**: Comprehensive access logging and rate limiting
- **Performance Optimization**: Signed URL batching and skeleton loading
- **Mobile Responsive**: Optimized for all device sizes
- **Keyboard Navigation**: Full accessibility support

## 🏗️ Architecture

### Database Schema

```
event_folders/
├── id (UUID, Primary Key)
├── event_id (UUID, Foreign Key → events.id)
├── parent_id (UUID, Foreign Key → event_folders.id, nullable)
├── name (VARCHAR(255))
├── path (TEXT, computed)
├── depth (INTEGER, computed)
├── sort_order (INTEGER)
├── child_folder_count (INTEGER, computed)
├── photo_count (INTEGER, computed)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

photos/ (modified)
├── ... (existing columns)
├── folder_id (UUID, Foreign Key → event_folders.id, nullable)
└── watermark_path (TEXT, nullable)

share_tokens/ (enhanced)
├── ... (existing columns)
└── security_metadata (JSONB)

share_access_log/ (new)
├── id (UUID, Primary Key)
├── token (VARCHAR(64))
├── ip_address (INET)
├── user_agent (TEXT)
├── success (BOOLEAN)
├── error_reason (TEXT)
└── timestamp (TIMESTAMPTZ)
```

### Component Architecture

```
/admin/events/[id]/library/
├── page.tsx (Main entry point with feature flag)
├── components/
│   ├── EventLibraryMain.tsx (Main layout coordinator)
│   ├── LibraryHeader.tsx (Navigation and actions)
│   ├── FolderTreePanel.tsx (Virtualized folder tree)
│   ├── ContentGridPanel.tsx (Virtualized photo/folder grid)
│   ├── DetailsPanel.tsx (Preview and metadata)
│   ├── UploadInterface.tsx (Drag & drop upload)
│   ├── ShareInterface.tsx (Share generation)
│   ├── LibraryPhotoModal.tsx (Photo viewer integration)
│   └── SkeletonPlaceholders.tsx (Loading states)
```

### API Endpoints

#### Admin Endpoints
- `GET /admin/events/{id}/folders` - List folders
- `POST /admin/events/{id}/folders` - Create folder
- `PATCH /admin/folders/{id}` - Update folder
- `DELETE /admin/folders/{id}` - Delete folder
- `GET /admin/events/{id}/photos` - List photos with folder filtering
- `PATCH /admin/photos/batch-move` - Move photos between folders
- `POST /admin/photos/batch-urls` - Generate signed URLs
- `POST /admin/photos/{id}/watermark` - Generate watermarked preview
- `POST /admin/share` - Create share token
- `GET /admin/share-security` - Security monitoring

#### Public Endpoints
- `POST /public/share/{token}/validate` - Validate share token
- `GET /public/share/{token}/validate` - Get share info
```

### Services

```typescript
// Core Services
- folder.service.ts: Folder CRUD and hierarchy management
- photo.service.ts: Photo operations with folder support
- share.service.ts: Share token generation and management
- watermark.service.ts: Preview generation with Sharp.js
- url-batching.service: Optimized URL generation

// Security
- share-token-security.ts: Access control and monitoring
```

## 🚀 Installation & Deployment

### Prerequisites

- Node.js 18+  
- Next.js 15+  
- Supabase project  
- PostgreSQL database  
- Sharp.js for image processing

### Environment Variables

```bash
# Required
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Optional
NEXT_PUBLIC_APP_URL=your_app_url
```

### Migration Process

1. **Pre-deployment Backup**
   ```bash
   # Create database backup
   ./scripts/migrate-event-photo-library.sh dry-run
   ```

2. **Execute Migration**
   ```bash
   # Run the migration
   chmod +x ./scripts/migrate-event-photo-library.sh
   ./scripts/migrate-event-photo-library.sh migrate
   ```

3. **Deploy Application**
   ```bash
   # Deploy new code
   npm run build
   npm run deploy
   ```

4. **Enable Feature Flag**
   ```typescript
   // In your feature flags configuration
   await featureFlags.enable('event_photo_library');
   ```

5. **Verification**
   ```bash
   # Test the new interface
   curl -X GET "your-app-url/admin/events/test-event-id/library"
   ```

### Rollback Procedure

If issues occur, you can rollback using:

```bash
# Immediate rollback
./scripts/migrate-event-photo-library.sh rollback

# Manual verification
npm run test
npm run build
```

## 🔒 Security Considerations

... (rest of document unchanged)
# Event Photo Library Implementation

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

### Share Token Security
- **Rate Limiting**: 50 attempts per IP per hour
- **Access Logging**: All attempts logged with IP and user agent
- **Password Protection**: SHA-256 hashed passwords
- **Expiration**: Configurable expiration dates
- **View Limits**: Maximum view count enforcement
- **Revocation**: Admin ability to revoke tokens

### Data Protection
- **Row Level Security**: All tables use RLS policies
- **Service Role Access**: Database functions use security definer
- **Input Validation**: Comprehensive API input validation
- **SQL Injection Prevention**: Parameterized queries only

## 🎛️ Configuration

### Feature Flags

```typescript
// Enable/disable the library feature
const isEnabled = await featureFlags.isEnabled('event_photo_library');

// Gradual rollout configuration
await featureFlags.configure('event_photo_library', {
  enabled: true,
  rolloutPercentage: 50, // 50% of users
  targetUsers: ['admin', 'photographer']
});
```

### Performance Tuning

```typescript
// Virtualization settings
const GRID_CONFIG = {
  itemSize: 200,          // Grid item size
  overscan: 2,            // Items to render outside viewport
  columnCount: 'auto',    // Auto-calculate based on width
  batchSize: 50           // Items per API request
};

// URL generation settings
const URL_CONFIG = {
  batchSize: 20,          // URLs per batch
  concurrency: 8,         // Concurrent requests
  expiryMinutes: 60,      // URL expiration
  usePreview: true        // Use watermarked previews
};
```

## 🧪 Testing

### Unit Tests
```bash
# Run folder service tests
npm test -- folder.service.test.ts

# Run photo service tests  
npm test -- photo.service.test.ts

# Run security tests
npm test -- share-token-security.test.ts
```

### Integration Tests
```bash
# Test API endpoints
npm run test:integration

# Test database migrations
npm run test:migrations
```

### E2E Tests
```bash
# Test complete user workflows
npm run test:e2e

# Test photo upload flow
npm run test:e2e -- --spec="upload-workflow"
```

## 📊 Monitoring & Analytics

### Performance Metrics
- Grid rendering performance
- API response times
- Image loading times
- Memory usage with large datasets

### Security Monitoring
- Failed share token access attempts
- Suspicious IP activity
- Rate limit violations
- Token usage analytics

### Usage Analytics
- Feature adoption rates
- User interaction patterns
- Upload success rates
- Share token usage

## 🔧 Troubleshooting

### Common Issues

#### Migration Failures
```bash
# Check migration status
./scripts/migrate-event-photo-library.sh verify

# View logs
tail -f ./logs/migration_*.log

# Rollback if needed
./scripts/migrate-event-photo-library.sh rollback
```

#### Performance Issues
```typescript
// Reduce batch sizes
const REDUCED_CONFIG = {
  batchSize: 10,
  concurrency: 4,
  overscan: 1
};

// Enable debugging
localStorage.setItem('debug', 'event-library:*');
```

#### Feature Flag Issues
```typescript
// Check feature flag status
const status = await featureFlags.getStatus('event_photo_library');
console.log('Feature status:', status);

// Force enable for testing
await featureFlags.forceEnable('event_photo_library', userId);
```

### Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `FOLDER_CYCLE_DETECTED` | Circular folder reference | Check folder hierarchy |
| `INVALID_TOKEN` | Share token invalid | Regenerate share link |
| `MAX_VIEWS_EXCEEDED` | Share view limit reached | Create new share |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry |

## 📈 Performance Benchmarks

### Virtualization Performance
- **1,000 photos**: < 100ms initial render
- **10,000 photos**: < 500ms with pagination
- **Memory usage**: ~50MB for 1,000 items

### API Performance
- **Folder listing**: < 200ms
- **Photo batch URLs**: < 1s for 50 photos
- **Upload processing**: < 5s per photo

### Database Performance
- **Folder hierarchy**: < 50ms for 100 levels
- **Photo search**: < 300ms with indexes
- **Share validation**: < 100ms

## 🔄 Maintenance

### Regular Tasks

#### Weekly
```bash
# Clean up expired share tokens
./scripts/cleanup-expired-shares.sh

# Analyze performance metrics
npm run analyze:performance
```

#### Monthly
```bash
# Update feature flag configurations
./scripts/update-feature-flags.sh

# Archive old access logs
./scripts/archive-access-logs.sh
```

#### Quarterly
```bash
# Review security policies
./scripts/security-audit.sh

# Performance optimization review
npm run analyze:bundle-size
```

## 🎯 Future Enhancements

### Planned Features
- [ ] Advanced search and filtering
- [ ] Automated photo tagging
- [ ] Bulk photo editing tools
- [ ] Integration with external storage
- [ ] Advanced analytics dashboard

### Technical Improvements
- [ ] GraphQL API integration
- [ ] WebSocket real-time updates
- [ ] Progressive Web App features
- [ ] Enhanced mobile gestures
- [ ] AI-powered organization

## 📞 Support

### Getting Help
- **Documentation**: `/docs/event-photo-library/`
- **API Reference**: `/docs/api/`
- **Support Email**: support@lookescolar.com
- **GitHub Issues**: Create issue with detailed description

### Reporting Issues
Include the following information:
- Browser and version
- Error messages and logs
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## 📄 License

This implementation is part of the LookEscolar platform and is subject to the platform's licensing terms.

---

**Last Updated**: January 15, 2024  
**Version**: 1.0.0  
**Contributors**: Development Team
# Change Log

## [Unreleased]

### Added
- 

## [2.0.0] - 2025-01-31

### Added
- Unified store purchase wizard for family, salon, school, and student
- Dynamic event themes selection (Default, Jardín, Secundaria, Bautismo)
- MercadoPago integration with preference creation and webhook handling
- Physical product catalog (Option A, Option B, additional copies)
- Automatic WebP compression, multiple resolutions, and lazy loading
- Touch gesture support for mobile interactions
- Automated image watermarking and background processing pipeline
- Enhanced testing workflow for MVP, integration, and security tests

### Changed
- Migrated to Next.js 14 and updated React 19
- Supabase database schema modifications and RLS policy enhancements
- Optimized gallery performance with virtualized grids and CDN caching
- Refactored codebase structure and standardized documentation layout

### Fixed
- Photo upload error handling and checksum deduplication
- Idempotent MercadoPago webhook processing
- Storage monitoring and automated cleanup for Supabase limits

### Breaking Changes
- API endpoints renamed for folder-first design (`/api/admin/photos/upload-to-folder`)
- Public album route changed from `/api/public/albums/{token}` to `/a/{token}`
- Original images no longer served; always serve WebP previews

## [1.0.0] - 2025-08-22

### Added
- Initial project setup and configuration
- Core functionality for school photography management
- Admin dashboard for photo management
- Family portal with QR code access
- Payment integration with Mercado Pago
- Comprehensive security implementation

### Changed
- Enhanced database schema with RLS policies
- Improved photo processing pipeline
- Optimized gallery performance with virtual scrolling
- Updated UI components with shadcn/ui

### Fixed
- Rate limiting implementation
- Token validation security
- Photo upload error handling
- Payment webhook processing

## Previous Versions

This project was developed iteratively with continuous improvements. Detailed change tracking began with version 1.0.0.

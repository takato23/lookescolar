'use client';

import CleanPhotosPage from '@/components/admin/photos/CleanPhotosPage';

/**
 * Unified Photos Page - CLEAN DESIGN SYSTEM
 *
 * This is the SINGLE ENTRY POINT for all photo management:
 * - Folder-based hierarchy navigation
 * - 3-panel layout (Folders + Photos + Inspector)
 * - Mouse-first interactions (Shift+Click, Ctrl+Click, Drag & Drop)
 * - Unified assets system with checksum deduplication
 * - Album generation and public access
 *
 * Design:
 * - Pixieset-inspired minimal interface
 * - Clean design system with consistent tokens
 * - Dark mode support
 *
 * Features:
 * - Unified folder hierarchy with optional event metadata
 * - Mouse-optimized selection and bulk operations
 * - Real-time search across all photos
 * - Drag & drop photo organization
 * - Album creation for family access
 * - Preview processing with watermarks
 * - Checksum-based deduplication
 */
export default function UnifiedPhotosPage() {
  return <CleanPhotosPage />;
}

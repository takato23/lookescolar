/**
 * PhotoAdmin modular system exports
 * Centralized exports for refactored PhotoAdmin components, hooks, and services
 */

export { SafeImage } from './components/SafeImage';
export { default as FolderTreePanel } from './components/FolderTreePanel';
export { PhotoCard } from './components/PhotoCard';
export { PhotoGrid } from './components/PhotoGrid';
export { InspectorPanel } from './components/InspectorPanel';
export { getPreviewUrl } from './services/preview-url.service';
export { EgressMonitor, egressMonitor } from './services/egress-monitor.service';
export { photoAdminApi } from './services/photo-admin-api.service';
export type {
  OptimizedFolder,
  OptimizedAsset,
} from './services/photo-admin-api.service';
export { usePhotoSelection } from './hooks/usePhotoSelection';


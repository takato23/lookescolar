declare module '@/lib/services/photo.service' {
  export {
    photoService,
    type Photo,
    type PhotoFilters,
  } from '../../lib/services/photo.service';
}

declare module '@/lib/services/enhanced-order.service' {
  export {
    EnhancedOrderService,
    type OrderFilters,
    type OrderStats,
    type UpdateOrderRequest,
  } from '../../lib/services/enhanced-order.service';
}

declare module '@/lib/services/order-analytics.service' {
  export {
    OrderAnalyticsService,
    type AnalyticsFilters,
    type OrderMetrics,
  } from '../../lib/services/order-analytics.service';
}

declare module '@/lib/supabase/server' {
  export {
    createServerSupabaseServiceClient,
  } from '../../lib/supabase/server';
}

declare module '@/lib/services/folder.service' {
  export {
    folderService,
    type CreateFolderRequest,
    type FolderOperationResult,
    type FoldersListResult,
  } from '../../lib/services/folder.service';
}

declare module '@/lib/services/photo-classification.service' {
  export {
    photoClassificationService,
  } from '../../lib/services/photo-classification.service';
}

declare module '@/lib/services/qr-batch-processing.service' {
  export {
    qrBatchProcessingService,
  } from '../../lib/services/qr-batch-processing.service';
}

declare module '@/lib/services/gallery-theme.service' {
  import GalleryThemeServiceDefault, {
    GALLERY_THEMES,
    type EventTheme,
    type GalleryTheme,
  } from '../../lib/services/gallery-theme.service';
  export default GalleryThemeServiceDefault;
  export { GALLERY_THEMES, EventTheme, GalleryTheme };
}

declare module '@/lib/services/order-workflow.service' {
  export {
    orderWorkflowService,
    OrderWorkflowService,
    type OrderWorkflowContext,
    type WorkflowTrigger,
  } from '../../lib/services/order-workflow.service';
}

declare module '@/lib/services/photo-classification.service' {
  export {
    photoClassificationService,
  } from '../../lib/services/photo-classification.service';
}

import { ElementType } from 'react';

export interface ActivityItem {
    id: string;
    type:
    | 'event_created'
    | 'photos_uploaded'
    | 'order_created'
    | 'order_completed';
    message: string;
    timestamp: string;
}

export interface EventSummary {
    id: string;
    name: string;
    location: string | null;
    date: string | null;
    totalStudents: number;
    photosUploaded: number;
    expectedPhotos: number;
    status: 'planning' | 'in_progress' | 'processing' | 'completed';
}

export interface QuickAccessSummary {
    lastEvent: string;
    lastEventDate: string | null;
    photosToProcess: number;
    pendingUploads: number;
    recentActivity: string;
}

export interface PhotoManagementSummary {
    totalPhotos: number;
    processedToday: number;
    pendingProcessing: number;
    publishedGalleries: number;
    lastUploadAt: string | null;
}

export interface OrdersSummary {
    newOrders: number;
    pendingDelivery: number;
    totalRevenueCents: number;
    todayOrders: number;
}

export interface BusinessMetricsSummary {
    monthlyRevenueCents: number;
    activeClients: number;
    completionRate: number;
    avgOrderValueCents: number;
}

export interface RevenueHistoryItem {
    date: string;
    revenue: number;
}

export interface ActivityHistoryItem {
    date: string;
    uploads: number;
    orders: number;
}

export interface DashboardStats {
    activeEvents: number;
    totalPhotos: number;
    registeredFamilies: number;
    totalSales: number;
    todayUploads: number;
    todayOrders: number;
    todayPayments: number;
    pendingOrders: number;
    storageUsed: number;
    storageLimit: number;
    recentActivity: ActivityItem[];
    eventSummaries: EventSummary[];
    quickAccess: QuickAccessSummary;
    photoManagement: PhotoManagementSummary;
    ordersSummary: OrdersSummary;
    businessMetrics: BusinessMetricsSummary;
    revenueHistory: RevenueHistoryItem[];
    activityHistory: ActivityHistoryItem[];
}

export interface ShortcutCardProps {
    id: string;
    href: string;
    title: string;
    description: string;
    icon: ElementType;
}

export interface HighlightMetricProps {
    id: string;
    label: string;
    value: string;
    helper: string;
    icon: ElementType;
    index?: number;
}

export interface AlertItemProps {
    id: string;
    title: string;
    description: string;
    badge: string;
    tone: 'info' | 'warning' | 'danger' | 'success';
    icon: ElementType;
    index?: number;
}

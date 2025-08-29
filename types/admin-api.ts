// Tipos para las APIs del dashboard admin

// API: /api/admin/stats
export interface GlobalStats {
  events: {
    total: number;
    active: number;
    completed: number;
  };
  photos: {
    total: number;
    tagged: number;
    untagged: number;
    uploaded_today: number;
  };
  subjects: {
    total: number;
    with_tokens: number;
  };
  orders: {
    total: number;
    pending: number;
    approved: number;
    delivered: number;
    failed: number;
    total_revenue_cents: number;
    monthly_revenue_cents: number;
  };
  storage: {
    photos_count: number;
    estimated_size_gb: number;
  };
  activity: {
    recent_uploads: number;
    recent_orders: number;
    recent_payments: number;
  };
  system: {
    health_status: 'healthy' | 'warning' | 'critical';
    expired_tokens: number;
    cache_timestamp: string;
  };
}

export interface GlobalStatsResponse {
  success: true;
  data: GlobalStats;
  generated_at: string;
}

// API: /api/admin/events
export interface EventWithStats {
  id: string;
  name: string;
  school: string;
  date: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  stats?: {
    total_subjects: number;
    total_photos: number;
    approved_photos: number;
    tagged_photos: number;
    total_orders: number;
    pending_orders: number;
    approved_orders: number;
    delivered_orders: number;
    total_revenue_cents: number;
    last_photo_uploaded?: string;
    last_order_created?: string;
  } | null;
}

export interface EventsResponse {
  events: EventWithStats[];
  meta: {
    total: number;
    filtered_by: string | null;
    sorted_by: string;
    includes_stats: boolean;
    generated_at: string;
  };
}

// API: /api/admin/orders
export interface OrderItem {
  id: string;
  quantity: number;
  price_cents: number;
  label: string;
  photo: {
    id: string;
    storage_path: string;
  } | null;
}

export interface OrderAuditEvent {
  action_type: string;
  created_at: string;
  changed_by_type: string | null;
  notes: string | null;
  old_values?: any;
  new_values?: any;
}

export interface OrderWithDetails {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  status: 'pending' | 'approved' | 'delivered' | 'failed';
  enhanced_status?: 'pending_overdue' | 'delivery_overdue' | string;
  mp_payment_id: string | null;
  mp_status: string | null;
  mp_preference_id?: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  delivered_at: string | null;
  total_amount_cents: number;
  total_items: number;
  // Enhanced tracking fields
  priority_level: number | null;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  delivery_method: string | null;
  tracking_number: string | null;
  // Audit information
  status_history: any[] | null;
  last_status_change: string | null;
  status_changed_by: string | null;
  audit_log_count?: number;
  recent_audit_events?: OrderAuditEvent[];
  // Time calculations
  hours_since_created?: number;
  hours_since_status_change?: number;
  event: {
    id: string;
    name: string;
    school: string;
    date: string;
  } | null;
  subject: {
    id: string;
    name: string;
    type: 'student' | 'couple' | 'family';
  } | null;
  items: OrderItem[];
}

export interface OrdersResponse {
  orders: OrderWithDetails[];
  stats: {
    total: number;
    by_status: {
      pending: number;
      approved: number;
      delivered: number;
      failed: number;
    };
    total_revenue_cents: number;
    filtered_by: {
      event_id: string | null;
      status: string | null;
    };
  };
  generated_at: string;
}

// API: /api/admin/activity
export interface ActivityItem {
  id: string;
  type:
    | 'photo_upload'
    | 'event_created'
    | 'order_created'
    | 'order_status_changed'
    | 'subject_created'
    | 'payment_processed';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    event_id?: string;
    event_name?: string;
    subject_id?: string;
    subject_name?: string;
    order_id?: string;
    photo_count?: number;
    amount_cents?: number;
    status_from?: string;
    status_to?: string;
  };
}

export interface ActivityResponse {
  success: true;
  activities: ActivityItem[];
  stats: {
    total_items: number;
    time_range_hours: number;
    types_requested: string[];
    by_type: {
      photo_upload: number;
      event_created: number;
      order_created: number;
      subject_created: number;
      payment_processed: number;
      order_status_changed: number;
    };
  };
  generated_at: string;
}

// API: /api/admin/performance
export interface PerformanceAlert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  value: number | string;
  threshold?: number;
}

export interface PerformanceMetrics {
  storage: {
    total_photos: number;
    estimated_size_gb: number;
    egress_today_gb: number;
    egress_monthly_gb: number;
    storage_utilization_percent: number;
    avg_photo_size_kb: number;
  };
  database: {
    total_tables: number;
    total_records: number;
    health_status: 'healthy' | 'warning' | 'critical';
    expired_tokens: number;
    pending_orders_count: number;
    active_events_count: number;
  };
  activity: {
    photos_processed_today: number;
    orders_created_today: number;
    payments_processed_today: number;
    unique_visitors_today: number;
    conversion_rate_percent: number;
  };
  system: {
    uptime_hours: number;
    last_refresh_dashboard_stats: string | null;
    cache_hit_rate_percent: number;
    avg_response_time_ms: number;
    error_rate_percent: number;
  };
  alerts: PerformanceAlert[];
}

export interface PerformanceResponse {
  success: true;
  metrics: PerformanceMetrics;
  generated_at: string;
}

// Tipos para queries comunes
export interface ApiError {
  error: string;
}

export interface ApiMeta {
  total?: number;
  page?: number;
  limit?: number;
  generated_at: string;
}

export type AdminApiResponse<T> = T | { error: string };

// Query parameters comunes
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FilterParams {
  status?: string;
  event_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface SortParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

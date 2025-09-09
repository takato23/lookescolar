import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import type { OrderWithDetails, OrderAuditEvent } from '@/types/admin-api';
import type { Tables } from '@/types/database';

export type OrderStatus =
  | 'pending'
  | 'approved'
  | 'delivered'
  | 'failed'
  | 'cancelled';
export type DeliveryMethod = 'pickup' | 'email' | 'postal' | 'hand_delivery';
export type AuditActionType =
  | 'created'
  | 'status_changed'
  | 'payment_updated'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'notes_added'
  | 'admin_action';

export interface UpdateOrderRequest {
  status?: OrderStatus;
  notes?: string;
  priority_level?: number;
  estimated_delivery_date?: string;
  delivery_method?: DeliveryMethod;
  tracking_number?: string;
}

export interface OrderFilters {
  status?: OrderStatus | 'all';
  event_id?: string;
  priority_level?: number;
  delivery_method?: DeliveryMethod;
  created_after?: string;
  created_before?: string;
  overdue_only?: boolean;
  search_query?: string;
}

export interface OrderStats {
  total: number;
  by_status: Record<OrderStatus, number>;
  total_revenue_cents: number;
  overdue_pending: number;
  overdue_delivery: number;
  avg_processing_time_hours: number;
  priority_distribution: Record<number, number>;
}

export class EnhancedOrderService {
  private supabase: any = null;
  private initializing: Promise<void> | null = null;
  private static availability: {
    available: boolean;
    lastCheck: number;
    disabledUntil?: number;
  } = { available: true, lastCheck: 0 };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (!this.initializing) {
      this.initializing = this.initSupabase();
    }
    return this.initializing;
  }

  private async initSupabase() {
    try {
      this.supabase = await createServerSupabaseServiceClient();
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  private async ensureInitialized() {
    if (this.initializing) {
      await this.initializing;
    }
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
  }

  /**
   * Check if the backing view exists. If it doesn't, disable enhanced service
   * for a period to avoid noisy fallbacks.
   */
  async isAvailable(): Promise<boolean> {
    // Allow explicit opt-out via env
    if (process.env['ENHANCED_ORDERS'] === 'false') {
      EnhancedOrderService.availability.available = false;
      return false;
    }

    const now = Date.now();
    const state = EnhancedOrderService.availability;
    const isDev = process.env.NODE_ENV !== 'production';
    // In dev, recheck aggressively and don't lock out for long
    const ttl = isDev ? 15 * 1000 : 5 * 60 * 1000; // 15s dev, 5m prod
    if (!isDev && state.disabledUntil && now < state.disabledUntil) return false;
    if (now - state.lastCheck < ttl) return state.available;

    try {
      await this.ensureInitialized();
      const probe = await this.supabase
        .from('order_details_with_audit')
        .select('id')
        .limit(1);
      state.available = !probe.error;
      state.lastCheck = now;
      return state.available;
    } catch (e: any) {
      const msg = String(e?.message || e).toLowerCase();
      // Missing relation: back off for 6h
      if (msg.includes('does not exist') || msg.includes('relation')) {
        state.available = false;
        // In dev, do not set long backoff; recheck on next ttl
        state.disabledUntil = isDev ? undefined : now + 6 * 60 * 60 * 1000;
        state.lastCheck = now;
        return false;
      }
      // Unknown error: short backoff
      state.available = false;
      state.disabledUntil = isDev ? undefined : now + 30 * 60 * 1000; // 30 min in prod
      state.lastCheck = now;
      return false;
    }
  }

  /**
   * Get orders with enhanced filtering and audit information
   */
  async getOrders(
    filters: OrderFilters = {},
    page = 1,
    limit = 50
  ): Promise<{
    orders: OrderWithDetails[];
    stats: OrderStats;
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
      has_more: boolean;
    };
  }> {
    // If not available, short-circuit to let API choose fallback without noise
    if (!(await this.isAvailable())) {
      throw new Error('ENHANCED_ORDERS_DISABLED');
    }
    await this.ensureInitialized();
    const offset = (page - 1) * limit;

    try {
      // Build the query with filters
      let query = this.supabase.from('order_details_with_audit').select('*');

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.event_id) {
        query = query.eq('event_id', filters.event_id);
      }

      if (filters.priority_level) {
        query = query.eq('priority_level', filters.priority_level);
      }

      if (filters.delivery_method) {
        query = query.eq('delivery_method', filters.delivery_method);
      }

      if (filters.created_after) {
        query = query.gte('created_at', filters.created_after);
      }

      if (filters.created_before) {
        query = query.lte('created_at', filters.created_before);
      }

      if (filters.overdue_only) {
        query = query.in('enhanced_status', [
          'pending_overdue',
          'delivery_overdue',
        ]);
      }

      if (filters.search_query) {
        query = query.or(`
          contact_name.ilike.%${filters.search_query}%,
          contact_email.ilike.%${filters.search_query}%,
          subject_name.ilike.%${filters.search_query}%,
          tracking_number.ilike.%${filters.search_query}%
        `);
      }

      // Get total count for pagination
      const countQuery = query;
      const { count } = await countQuery.select('*', {
        count: 'exact',
        head: true,
      });
      const total = count || 0;

      // Get paginated results
      const { data: orders, error } = await query
        .order('priority_level', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to fetch orders: ${error.message}`);
      }

      // Calculate statistics
      const stats = await this.calculateOrderStats(filters);

      return {
        orders: orders as OrderWithDetails[],
        stats,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
          has_more: total > page * limit,
        },
      };
    } catch (error) {
      if (String((error as any)?.message || '').includes('ENHANCED_ORDERS_DISABLED')) {
        throw error;
      }
      console.error('Error in getOrders:', error);
      // Re-throw to let the API route handle the fallback
      throw error;
    }
  }

  /**
   * Update order with audit trail
   */
  async updateOrder(
    orderId: string,
    updates: UpdateOrderRequest,
    adminId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<OrderWithDetails> {
    await this.ensureInitialized();
    const { data: currentOrder, error: fetchError } = await this.supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !currentOrder) {
      throw new Error('Order not found');
    }

    // Prepare the update data
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (adminId) {
      updateData.status_changed_by = adminId;
    }

    // Update the order
    const { data: updatedOrder, error: updateError } = await this.supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    // Log admin action if there are significant changes
    if (updates.status || updates.notes || updates.priority_level) {
      await this.logAuditEvent({
        order_id: orderId,
        action_type: 'admin_action',
        old_values: {
          status: currentOrder.status,
          notes: currentOrder.notes,
          priority_level: currentOrder.priority_level,
        },
        new_values: {
          status: updates.status || currentOrder.status,
          notes: updates.notes || currentOrder.notes,
          priority_level: updates.priority_level || currentOrder.priority_level,
        },
        changed_by: adminId,
        changed_by_type: 'admin',
        ip_address: ipAddress,
        user_agent: userAgent,
        notes: `Admin updated order: ${Object.keys(updates).join(', ')}`,
      });
    }

    // Return the updated order with details
    return this.getOrderById(orderId);
  }

  /**
   * Get order by ID with full details
   */
  async getOrderById(orderId: string): Promise<OrderWithDetails> {
    const { data: order, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        event:events(name, school, date),
        subject:subjects(name, email, phone)
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new Error('Order not found');
    }

    // Transform to OrderWithDetails format
    const transformedOrder = {
      ...order,
      event_name: order.event?.name || null,
      event_school: order.event?.school || null,
      event_date: order.event?.date || null,
      subject_name: order.subject?.name || null,
      subject_email: order.subject?.email || null,
      subject_phone: order.subject?.phone || null,
      audit_log_count: 0,
      recent_audit_events: null,
      enhanced_status: order.status,
      hours_since_created: null,
      hours_since_status_change: null,
    };

    return transformedOrder as OrderWithDetails;
  }

  /**
   * Get audit trail for an order
   */
  async getOrderAuditTrail(orderId: string): Promise<OrderAuditEvent[]> {
    await this.ensureInitialized();
    const { data: auditEvents, error } = await this.supabase
      .from('order_audit_log')
      .select(
        `
        action_type,
        old_values,
        new_values,
        changed_by_type,
        notes,
        created_at,
        admin_users!left(name)
      `
      )
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch audit trail: ${error.message}`);
    }

    return auditEvents as OrderAuditEvent[];
  }

  /**
   * Bulk update orders
   */
  async bulkUpdateOrders(
    orderIds: string[],
    updates: Partial<UpdateOrderRequest>,
    adminId?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    await this.ensureInitialized();
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const orderId of orderIds) {
      try {
        await this.updateOrder(orderId, updates, adminId);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Order ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return results;
  }

  /**
   * Calculate order statistics
   */
  private async calculateOrderStats(
    filters: OrderFilters = {}
  ): Promise<OrderStats> {
    await this.ensureInitialized();
    let query = this.supabase
      .from('orders')
      .select(
        'status, total_cents, created_at, last_status_change, priority_level'
      );

    // Apply same filters as main query
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.event_id) {
      query = query.eq('event_id', filters.event_id);
    }

    const { data: orders, error } = await query;

    if (error || !orders) {
      throw new Error('Failed to calculate stats');
    }

    const stats: OrderStats = {
      total: orders.length,
      by_status: {
        pending: 0,
        approved: 0,
        delivered: 0,
        failed: 0,
        cancelled: 0,
      },
      total_revenue_cents: 0,
      overdue_pending: 0,
      overdue_delivery: 0,
      avg_processing_time_hours: 0,
      priority_distribution: {},
    };

    let totalProcessingTime = 0;
    let processedOrders = 0;

    for (const order of orders) {
      // Count by status
      if (stats.by_status.hasOwnProperty(order.status)) {
        stats.by_status[order.status as OrderStatus]++;
      }

      // Revenue (only from approved/delivered orders)
      if (order.status === 'approved' || order.status === 'delivered') {
        stats.total_revenue_cents += order.total_cents || 0;
      }

      // Overdue calculations
      const createdAt = new Date(order.created_at);
      const now = new Date();
      const hoursSinceCreated =
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      if (order.status === 'pending' && hoursSinceCreated > 24) {
        stats.overdue_pending++;
      }

      // Processing time for delivered orders
      if (order.status === 'delivered' && order.last_status_change) {
        const lastChange = new Date(order.last_status_change);
        const processingHours =
          (lastChange.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        totalProcessingTime += processingHours;
        processedOrders++;
      }

      // Priority distribution
      const priority = order.priority_level || 1;
      stats.priority_distribution[priority] =
        (stats.priority_distribution[priority] || 0) + 1;
    }

    // Calculate average processing time
    if (processedOrders > 0) {
      stats.avg_processing_time_hours = totalProcessingTime / processedOrders;
    }

    return stats;
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(event: {
    order_id: string;
    action_type: AuditActionType;
    old_values?: any;
    new_values?: any;
    changed_by?: string;
    changed_by_type?: string;
    ip_address?: string;
    user_agent?: string;
    notes?: string;
  }): Promise<void> {
    await this.ensureInitialized();
    const { error } = await this.supabase.from('order_audit_log').insert({
      ...event,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw error for audit logging failures
    }
  }
}

// Export a singleton instance
let enhancedOrderServiceInstance: EnhancedOrderService | null = null;

export function getEnhancedOrderService(): EnhancedOrderService {
  if (!enhancedOrderServiceInstance) {
    enhancedOrderServiceInstance = new EnhancedOrderService();
  }
  return enhancedOrderServiceInstance;
}

export const enhancedOrderService = getEnhancedOrderService();

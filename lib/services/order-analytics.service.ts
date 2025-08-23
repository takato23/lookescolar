import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export interface OrderMetrics {
  overview: {
    total_orders: number;
    total_revenue_cents: number;
    average_order_value_cents: number;
    orders_today: number;
    revenue_today_cents: number;
    conversion_rate: number;
    pending_orders: number;
    overdue_orders: number;
  };
  trends: {
    daily_orders: Array<{
      date: string;
      orders_count: number;
      revenue_cents: number;
      average_value_cents: number;
    }>;
    weekly_summary: {
      current_week: {
        orders: number;
        revenue_cents: number;
      };
      previous_week: {
        orders: number;
        revenue_cents: number;
      };
      growth_rate: number;
    };
    monthly_summary: {
      current_month: {
        orders: number;
        revenue_cents: number;
      };
      previous_month: {
        orders: number;
        revenue_cents: number;
      };
      growth_rate: number;
    };
  };
  status_breakdown: {
    by_status: Record<string, {
      count: number;
      percentage: number;
      revenue_cents: number;
    }>;
    processing_times: {
      average_hours: number;
      median_hours: number;
      fastest_hours: number;
      slowest_hours: number;
    };
  };
  performance: {
    top_events: Array<{
      event_id: string;
      event_name: string;
      school_name: string;
      orders_count: number;
      revenue_cents: number;
      average_order_value_cents: number;
    }>;
    peak_hours: Array<{
      hour: number;
      orders_count: number;
      percentage: number;
    }>;
    geographical_distribution: Array<{
      school: string;
      orders_count: number;
      revenue_cents: number;
    }>;
  };
  forecasting: {
    next_30_days: {
      predicted_orders: number;
      predicted_revenue_cents: number;
      confidence_level: number;
    };
    seasonal_trends: Array<{
      month: number;
      average_orders: number;
      average_revenue_cents: number;
    }>;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    title: string;
    description: string;
    count?: number;
    created_at: string;
  }>;
}

export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  event_id?: string;
  status?: string[];
  include_forecasting?: boolean;
}

export class OrderAnalyticsService {
  private supabase;

  constructor() {
    this.supabase = createServerSupabaseServiceClient();
  }

  /**
   * Get comprehensive order metrics
   */
  async getOrderMetrics(filters: AnalyticsFilters = {}): Promise<OrderMetrics> {
    const startTime = Date.now();
    
    try {
      const {
        start_date = this.getDateDaysAgo(30),
        end_date = new Date().toISOString(),
        event_id,
        status,
        include_forecasting = true
      } = filters;

      // Execute all analytics queries in parallel
      const [overview, trends, statusBreakdown, performance, alerts] = await Promise.all([
        this.getOverviewMetrics(start_date, end_date, event_id, status),
        this.getTrendMetrics(start_date, end_date, event_id, status),
        this.getStatusBreakdown(start_date, end_date, event_id, status),
        this.getPerformanceMetrics(start_date, end_date, event_id, status),
        this.getAlerts()
      ]);

      let forecasting = {
        next_30_days: {
          predicted_orders: 0,
          predicted_revenue_cents: 0,
          confidence_level: 0,
        },
        seasonal_trends: [],
      };

      if (include_forecasting) {
        forecasting = await this.getForecastingData(start_date, end_date);
      }

      const duration = Date.now() - startTime;
      console.log(`[Order Analytics] Metrics calculated in ${duration}ms`);

      return {
        overview,
        trends,
        status_breakdown: statusBreakdown,
        performance,
        forecasting,
        alerts,
      };

    } catch (error) {
      console.error('[Order Analytics] Failed to get metrics:', error);
      throw new Error(`Analytics calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get overview metrics
   */
  private async getOverviewMetrics(
    startDate: string,
    endDate: string,
    eventId?: string,
    status?: string[]
  ): Promise<OrderMetrics['overview']> {
    // Build base query
    let query = this.supabase
      .from('orders')
      .select('id, total_cents, status, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (eventId) {
      query = query.eq('event_id', eventId);
    }
    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    const totalOrders = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, order) => {
      return sum + (order.status === 'approved' || order.status === 'delivered' ? order.total_cents : 0);
    }, 0) || 0;

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Today's metrics
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders?.filter(order => 
      order.created_at.startsWith(today)
    ).length || 0;
    
    const todayRevenue = orders?.filter(order => 
      order.created_at.startsWith(today) && 
      (order.status === 'approved' || order.status === 'delivered')
    ).reduce((sum, order) => sum + order.total_cents, 0) || 0;

    // Pending and overdue orders
    const pendingOrders = orders?.filter(order => order.status === 'pending').length || 0;
    
    // Calculate overdue orders (pending for more than 24 hours)
    const overdueOrders = orders?.filter(order => {
      if (order.status !== 'pending') return false;
      const hoursSinceCreated = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
      return hoursSinceCreated > 24;
    }).length || 0;

    // Simple conversion rate calculation (delivered / total)
    const deliveredOrders = orders?.filter(order => order.status === 'delivered').length || 0;
    const conversionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

    return {
      total_orders: totalOrders,
      total_revenue_cents: totalRevenue,
      average_order_value_cents: Math.round(averageOrderValue),
      orders_today: todayOrders,
      revenue_today_cents: todayRevenue,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      pending_orders: pendingOrders,
      overdue_orders: overdueOrders,
    };
  }

  /**
   * Get trend metrics
   */
  private async getTrendMetrics(
    startDate: string,
    endDate: string,
    eventId?: string,
    status?: string[]
  ): Promise<OrderMetrics['trends']> {
    // Get daily aggregated data
    let query = this.supabase.rpc('get_daily_order_stats', {
      start_date: startDate,
      end_date: endDate,
      event_filter: eventId || null,
      status_filter: status || null
    });

    // Fallback if RPC doesn't exist - use regular query
    const { data: dailyData, error: dailyError } = await query;
    
    let dailyOrders = [];
    if (dailyError) {
      // Fallback: Manual aggregation
      const { data: orders } = await this.supabase
        .from('orders')
        .select('created_at, total_cents, status')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const grouped = this.groupOrdersByDate(orders || []);
      dailyOrders = Object.entries(grouped).map(([date, dayOrders]) => ({
        date,
        orders_count: dayOrders.length,
        revenue_cents: dayOrders.reduce((sum, order) => 
          sum + (order.status === 'approved' || order.status === 'delivered' ? order.total_cents : 0), 0
        ),
        average_value_cents: dayOrders.length > 0 ? 
          dayOrders.reduce((sum, order) => sum + order.total_cents, 0) / dayOrders.length : 0
      }));
    } else {
      dailyOrders = dailyData || [];
    }

    // Calculate weekly and monthly summaries
    const now = new Date();
    const currentWeekStart = this.getWeekStart(now);
    const previousWeekStart = this.getWeekStart(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentWeekOrders = dailyOrders.filter(day => new Date(day.date) >= currentWeekStart);
    const previousWeekOrders = dailyOrders.filter(day => {
      const date = new Date(day.date);
      return date >= previousWeekStart && date < currentWeekStart;
    });

    const currentMonthOrders = dailyOrders.filter(day => new Date(day.date) >= currentMonthStart);
    const previousMonthOrders = dailyOrders.filter(day => {
      const date = new Date(day.date);
      return date >= previousMonthStart && date < currentMonthStart;
    });

    const currentWeekStats = {
      orders: currentWeekOrders.reduce((sum, day) => sum + day.orders_count, 0),
      revenue_cents: currentWeekOrders.reduce((sum, day) => sum + day.revenue_cents, 0)
    };

    const previousWeekStats = {
      orders: previousWeekOrders.reduce((sum, day) => sum + day.orders_count, 0),
      revenue_cents: previousWeekOrders.reduce((sum, day) => sum + day.revenue_cents, 0)
    };

    const currentMonthStats = {
      orders: currentMonthOrders.reduce((sum, day) => sum + day.orders_count, 0),
      revenue_cents: currentMonthOrders.reduce((sum, day) => sum + day.revenue_cents, 0)
    };

    const previousMonthStats = {
      orders: previousMonthOrders.reduce((sum, day) => sum + day.orders_count, 0),
      revenue_cents: previousMonthOrders.reduce((sum, day) => sum + day.revenue_cents, 0)
    };

    const weeklyGrowthRate = previousWeekStats.orders > 0 ?
      ((currentWeekStats.orders - previousWeekStats.orders) / previousWeekStats.orders) * 100 : 0;

    const monthlyGrowthRate = previousMonthStats.orders > 0 ?
      ((currentMonthStats.orders - previousMonthStats.orders) / previousMonthStats.orders) * 100 : 0;

    return {
      daily_orders: dailyOrders,
      weekly_summary: {
        current_week: currentWeekStats,
        previous_week: previousWeekStats,
        growth_rate: Math.round(weeklyGrowthRate * 100) / 100,
      },
      monthly_summary: {
        current_month: currentMonthStats,
        previous_month: previousMonthStats,
        growth_rate: Math.round(monthlyGrowthRate * 100) / 100,
      },
    };
  }

  /**
   * Get status breakdown and processing times
   */
  private async getStatusBreakdown(
    startDate: string,
    endDate: string,
    eventId?: string,
    status?: string[]
  ): Promise<OrderMetrics['status_breakdown']> {
    let query = this.supabase
      .from('orders')
      .select('status, total_cents, created_at, last_status_change')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (eventId) query = query.eq('event_id', eventId);
    if (status && status.length > 0) query = query.in('status', status);

    const { data: orders, error } = await query;
    if (error) throw error;

    const totalOrders = orders?.length || 0;
    const statusCounts: Record<string, { count: number; revenue_cents: number }> = {};
    const processingTimes: number[] = [];

    orders?.forEach(order => {
      // Count by status
      if (!statusCounts[order.status]) {
        statusCounts[order.status] = { count: 0, revenue_cents: 0 };
      }
      statusCounts[order.status].count++;
      
      if (order.status === 'approved' || order.status === 'delivered') {
        statusCounts[order.status].revenue_cents += order.total_cents;
      }

      // Calculate processing time for completed orders
      if (order.status === 'delivered' && order.last_status_change) {
        const processingHours = (new Date(order.last_status_change).getTime() - 
                               new Date(order.created_at).getTime()) / (1000 * 60 * 60);
        processingTimes.push(processingHours);
      }
    });

    // Calculate processing time statistics
    const avgProcessingTime = processingTimes.length > 0 ?
      processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length : 0;

    const sortedTimes = processingTimes.sort((a, b) => a - b);
    const medianProcessingTime = sortedTimes.length > 0 ?
      sortedTimes[Math.floor(sortedTimes.length / 2)] : 0;

    const fastestTime = sortedTimes.length > 0 ? sortedTimes[0] : 0;
    const slowestTime = sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0;

    // Convert counts to include percentages
    const byStatus: Record<string, { count: number; percentage: number; revenue_cents: number }> = {};
    Object.entries(statusCounts).forEach(([status, data]) => {
      byStatus[status] = {
        count: data.count,
        percentage: totalOrders > 0 ? Math.round((data.count / totalOrders) * 10000) / 100 : 0,
        revenue_cents: data.revenue_cents,
      };
    });

    return {
      by_status: byStatus,
      processing_times: {
        average_hours: Math.round(avgProcessingTime * 100) / 100,
        median_hours: Math.round(medianProcessingTime * 100) / 100,
        fastest_hours: Math.round(fastestTime * 100) / 100,
        slowest_hours: Math.round(slowestTime * 100) / 100,
      },
    };
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(
    startDate: string,
    endDate: string,
    eventId?: string,
    status?: string[]
  ): Promise<OrderMetrics['performance']> {
    // Get event performance data
    const { data: eventData } = await this.supabase
      .from('orders')
      .select(`
        total_cents,
        created_at,
        events(id, name, school)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .not('events', 'is', null);

    // Group by events
    const eventGroups: Record<string, any[]> = {};
    eventData?.forEach(order => {
      const event = (order as any).events;
      if (event) {
        const key = event.id;
        if (!eventGroups[key]) eventGroups[key] = [];
        eventGroups[key].push({ ...order, event });
      }
    });

    const topEvents = Object.entries(eventGroups)
      .map(([eventId, orders]) => {
        const event = orders[0].event;
        const revenue = orders.reduce((sum, order) => sum + order.total_cents, 0);
        return {
          event_id: eventId,
          event_name: event.name,
          school_name: event.school,
          orders_count: orders.length,
          revenue_cents: revenue,
          average_order_value_cents: orders.length > 0 ? Math.round(revenue / orders.length) : 0,
        };
      })
      .sort((a, b) => b.revenue_cents - a.revenue_cents)
      .slice(0, 10);

    // Calculate peak hours
    const hourCounts: Record<number, number> = {};
    eventData?.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const totalOrdersForHours = Object.values(hourCounts).reduce((sum, count) => sum + count, 0);
    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        orders_count: count,
        percentage: totalOrdersForHours > 0 ? Math.round((count / totalOrdersForHours) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.orders_count - a.orders_count);

    // Geographical distribution by school
    const schoolGroups: Record<string, any[]> = {};
    eventData?.forEach(order => {
      const event = (order as any).events;
      if (event?.school) {
        const school = event.school;
        if (!schoolGroups[school]) schoolGroups[school] = [];
        schoolGroups[school].push(order);
      }
    });

    const geographicalDistribution = Object.entries(schoolGroups)
      .map(([school, orders]) => ({
        school,
        orders_count: orders.length,
        revenue_cents: orders.reduce((sum, order) => sum + order.total_cents, 0),
      }))
      .sort((a, b) => b.orders_count - a.orders_count)
      .slice(0, 20);

    return {
      top_events: topEvents,
      peak_hours: peakHours,
      geographical_distribution: geographicalDistribution,
    };
  }

  /**
   * Get forecasting data (simplified)
   */
  private async getForecastingData(
    startDate: string,
    endDate: string
  ): Promise<OrderMetrics['forecasting']> {
    // Simple forecasting based on historical trends
    const { data: historicalData } = await this.supabase
      .from('orders')
      .select('created_at, total_cents, status')
      .gte('created_at', this.getDateDaysAgo(90))
      .lte('created_at', endDate);

    if (!historicalData || historicalData.length === 0) {
      return {
        next_30_days: {
          predicted_orders: 0,
          predicted_revenue_cents: 0,
          confidence_level: 0,
        },
        seasonal_trends: [],
      };
    }

    // Calculate monthly averages for seasonal trends
    const monthlyData: Record<number, { orders: number; revenue: number; count: number }> = {};
    historicalData.forEach(order => {
      const month = new Date(order.created_at).getMonth();
      if (!monthlyData[month]) {
        monthlyData[month] = { orders: 0, revenue: 0, count: 0 };
      }
      monthlyData[month].orders++;
      monthlyData[month].count++;
      if (order.status === 'approved' || order.status === 'delivered') {
        monthlyData[month].revenue += order.total_cents;
      }
    });

    const seasonalTrends = Array.from({ length: 12 }, (_, month) => {
      const data = monthlyData[month];
      return {
        month: month + 1,
        average_orders: data ? Math.round(data.orders / Math.max(data.count / 30, 1)) : 0,
        average_revenue_cents: data ? Math.round(data.revenue / Math.max(data.count / 30, 1)) : 0,
      };
    });

    // Simple 30-day prediction based on recent trend
    const recentOrders = historicalData.filter(order => {
      const orderDate = new Date(order.created_at);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return orderDate >= thirtyDaysAgo;
    });

    const avgDailyOrders = recentOrders.length / 30;
    const avgDailyRevenue = recentOrders.reduce((sum, order) => {
      return sum + (order.status === 'approved' || order.status === 'delivered' ? order.total_cents : 0);
    }, 0) / 30;

    return {
      next_30_days: {
        predicted_orders: Math.round(avgDailyOrders * 30),
        predicted_revenue_cents: Math.round(avgDailyRevenue * 30),
        confidence_level: Math.min(95, Math.max(60, recentOrders.length * 2)), // Simple confidence based on data volume
      },
      seasonal_trends: seasonalTrends,
    };
  }

  /**
   * Get system alerts
   */
  private async getAlerts(): Promise<OrderMetrics['alerts']> {
    const alerts: OrderMetrics['alerts'] = [];
    const now = new Date();

    // Check for overdue orders
    const { data: overdueOrders } = await this.supabase
      .from('orders')
      .select('id, created_at')
      .eq('status', 'pending')
      .lt('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

    if (overdueOrders && overdueOrders.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Overdue Orders',
        description: `${overdueOrders.length} orders have been pending for more than 24 hours`,
        count: overdueOrders.length,
        created_at: now.toISOString(),
      });
    }

    // Check for failed payments
    const { data: failedOrders } = await this.supabase
      .from('orders')
      .select('id')
      .eq('status', 'failed')
      .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

    if (failedOrders && failedOrders.length > 0) {
      alerts.push({
        type: 'error',
        title: 'Failed Payments',
        description: `${failedOrders.length} orders failed in the last 24 hours`,
        count: failedOrders.length,
        created_at: now.toISOString(),
      });
    }

    // Check for high volume
    const { data: todayOrders } = await this.supabase
      .from('orders')
      .select('id')
      .gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString());

    if (todayOrders && todayOrders.length > 50) { // Threshold for high volume
      alerts.push({
        type: 'info',
        title: 'High Order Volume',
        description: `${todayOrders.length} orders received today`,
        count: todayOrders.length,
        created_at: now.toISOString(),
      });
    }

    return alerts;
  }

  // Helper methods
  private getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  private getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(date.setDate(diff));
  }

  private groupOrdersByDate(orders: any[]): Record<string, any[]> {
    return orders.reduce((groups, order) => {
      const date = order.created_at.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(order);
      return groups;
    }, {});
  }
}

export const orderAnalyticsService = new OrderAnalyticsService();
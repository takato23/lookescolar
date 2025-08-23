'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Clock,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Users,
  Target,
  Activity,
  BarChart3,
  PieChart,
  Minus,
  Loader2,
  Download,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Timer,
  Zap,
  School,
  MapPin,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
// Note: Date range picker component to be implemented separately
import type { OrderMetrics } from '@/lib/services/order-analytics.service';

interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  event_id?: string;
  status?: string[];
  include_forecasting?: boolean;
}

interface AnalyticsData {
  success: boolean;
  data: OrderMetrics;
  performance: {
    generation_time_ms: number;
    cache_status: string;
  };
  metadata: {
    filters_applied: number;
    generated_at: string;
    data_points: {
      daily_trends: number;
      top_events: number;
      peak_hours: number;
      alerts: number;
    };
    insights?: {
      conversion_rate: number;
      growth_trend: 'positive' | 'negative' | 'stable';
      peak_performance_hour: number;
      top_performing_event: string;
    };
  };
}

export default function OrderAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [filters, setFilters] = useState<AnalyticsFilters>({
    include_forecasting: true,
  });
  const [tempFilters, setTempFilters] = useState<AnalyticsFilters>({});

  // Load analytics data
  const loadAnalytics = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.event_id) params.append('event_id', filters.event_id);
      if (filters.status) params.append('status', filters.status.join(','));
      if (filters.include_forecasting !== undefined) {
        params.append('include_forecasting', filters.include_forecasting.toString());
      }

      const response = await fetch(`/api/admin/orders/analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const data: AnalyticsData = await response.json();
      setAnalytics(data);
      setLastRefresh(new Date());

      console.log(`[Analytics Dashboard] Data loaded in ${data.performance.generation_time_ms}ms`);

    } catch (error) {
      console.error('Error loading analytics:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      alert('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  // Auto-refresh logic
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadAnalytics(false); // Refresh without showing loading spinner
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [autoRefresh, loadAnalytics]);

  // Apply filters
  const applyFilters = () => {
    setFilters({ ...tempFilters });
  };

  // Clear filters
  const clearFilters = () => {
    const clearedFilters = { include_forecasting: true };
    setFilters(clearedFilters);
    setTempFilters(clearedFilters);
  };

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(cents / 100);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Get trend icon
  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get alert icon
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Eye className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800 mb-1">Error loading analytics</h3>
              <p className="text-sm text-red-700 mb-3">{error}</p>
              <Button
                onClick={() => loadAnalytics()}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const { data: metrics, performance, metadata } = analytics;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights and metrics for order management
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Updated {lastRefresh.toLocaleTimeString()}
          </div>
          <Button
            onClick={() => loadAnalytics()}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="text-sm text-muted-foreground bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span>
            Generated in {performance.generation_time_ms}ms • 
            {metadata.filters_applied} filters applied • 
            {metadata.data_points.daily_trends} data points
          </span>
          {metadata.insights && (
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3 w-3" />
              {metadata.insights.growth_trend} trend
            </Badge>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{metrics.overview.total_orders.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.overview.orders_today} today
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.overview.total_revenue_cents)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(metrics.overview.revenue_today_cents)} today
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{formatPercentage(metrics.overview.conversion_rate)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Delivery success rate
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.overview.average_order_value_cents)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Per order average
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {metrics.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              System Alerts ({metrics.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.alerts.map((alert, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    {alert.count && (
                      <Badge variant="outline" className="mt-1">{alert.count} items</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Week</p>
                  <p className="text-lg font-semibold">
                    {metrics.trends.weekly_summary.current_week.orders} orders
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(metrics.trends.weekly_summary.current_week.revenue_cents)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metrics.trends.weekly_summary.growth_rate)}
                    <span className={`text-sm font-medium ${
                      metrics.trends.weekly_summary.growth_rate > 0 ? 'text-green-600' : 
                      metrics.trends.weekly_summary.growth_rate < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {formatPercentage(Math.abs(metrics.trends.weekly_summary.growth_rate))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">vs last week</p>
                </div>
              </div>
              
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">Previous Week</p>
                <p className="text-sm">
                  {metrics.trends.weekly_summary.previous_week.orders} orders • 
                  {formatCurrency(metrics.trends.weekly_summary.previous_week.revenue_cents)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Month</p>
                  <p className="text-lg font-semibold">
                    {metrics.trends.monthly_summary.current_month.orders} orders
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(metrics.trends.monthly_summary.current_month.revenue_cents)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metrics.trends.monthly_summary.growth_rate)}
                    <span className={`text-sm font-medium ${
                      metrics.trends.monthly_summary.growth_rate > 0 ? 'text-green-600' : 
                      metrics.trends.monthly_summary.growth_rate < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {formatPercentage(Math.abs(metrics.trends.monthly_summary.growth_rate))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">vs last month</p>
                </div>
              </div>
              
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">Previous Month</p>
                <p className="text-sm">
                  {metrics.trends.monthly_summary.previous_month.orders} orders • 
                  {formatCurrency(metrics.trends.monthly_summary.previous_month.revenue_cents)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Order Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(metrics.status_breakdown.by_status).map(([status, data]) => (
              <div key={status} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(status)}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                  <div>
                    <p className="font-medium">{data.count}</p>
                    <p className="text-sm text-muted-foreground">{formatPercentage(data.percentage)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(data.revenue_cents)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Processing Times
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold">{metrics.status_breakdown.processing_times.average_hours.toFixed(1)}h</p>
                <p className="text-sm text-muted-foreground">Average</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{metrics.status_breakdown.processing_times.median_hours.toFixed(1)}h</p>
                <p className="text-sm text-muted-foreground">Median</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-green-600">{metrics.status_breakdown.processing_times.fastest_hours.toFixed(1)}h</p>
                <p className="text-sm text-muted-foreground">Fastest</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-red-600">{metrics.status_breakdown.processing_times.slowest_hours.toFixed(1)}h</p>
                <p className="text-sm text-muted-foreground">Slowest</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Performing Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.performance.top_events.slice(0, 5).map((event, index) => (
                <div key={event.event_id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <p className="font-medium">{event.event_name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <School className="h-3 w-3" />
                        {event.school_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{event.orders_count} orders</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(event.revenue_cents)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Peak Order Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.performance.peak_hours.slice(0, 8).map((hourData, index) => (
                <div key={hourData.hour} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium w-12">
                      {hourData.hour.toString().padStart(2, '0')}:00
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${hourData.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">{hourData.orders_count}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({formatPercentage(hourData.percentage)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecasting */}
      {metrics.forecasting && filters.include_forecasting && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              30-Day Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {metrics.forecasting.next_30_days.predicted_orders}
                </p>
                <p className="text-sm text-muted-foreground">Predicted Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(metrics.forecasting.next_30_days.predicted_revenue_cents)}
                </p>
                <p className="text-sm text-muted-foreground">Predicted Revenue</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {metrics.forecasting.next_30_days.confidence_level}%
                </p>
                <p className="text-sm text-muted-foreground">Confidence Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Geographical Distribution */}
      {metrics.performance.geographical_distribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Orders by School
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {metrics.performance.geographical_distribution.slice(0, 9).map((school, index) => (
                <div key={school.school} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <p className="font-medium text-sm">{school.school}</p>
                      <p className="text-xs text-muted-foreground">{school.orders_count} orders</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{formatCurrency(school.revenue_cents)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
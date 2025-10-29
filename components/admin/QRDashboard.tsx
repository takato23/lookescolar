'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  Camera,
  BarChart3,
  Settings,
  Download,
  Upload,
  WifiOff,
  Wifi,
  Database,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedQRScanner } from '@/components/qr/EnhancedQRScanner';
import { OfflineQRScanner } from '@/components/qr/OfflineQRScanner';
import { QRPerformanceDashboard } from '@/components/admin/QRPerformanceDashboard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QRDashboardProps {
  className?: string;
  eventId?: string;
}

interface DashboardMetrics {
  totalScans: number;
  uniqueScans: number;
  successRate: number;
  avgScanTime: number;
  onlineScans: number;
  offlineScans: number;
  pendingSync: number;
  topDevices: Array<{ device: string; count: number }>;
  scansByHour: Record<number, number>;
  scansByDay: Record<string, number>;
}

interface SystemStatus {
  qrGeneration: 'healthy' | 'degraded' | 'unhealthy';
  qrDetection: 'healthy' | 'degraded' | 'unhealthy';
  cache: 'healthy' | 'degraded' | 'unhealthy';
  database: 'healthy' | 'degraded' | 'unhealthy';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function QRDashboard({ className, eventId }: QRDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Load initial data
    loadDashboardData();

    // Set up auto-refresh
    const interval = setInterval(loadDashboardData, 60000); // Refresh every minute

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, [eventId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // In a real implementation, you would fetch actual data from APIs
      // For now, we'll simulate the data
      setTimeout(() => {
        setMetrics({
          totalScans: 1247,
          uniqueScans: 892,
          successRate: 0.94,
          avgScanTime: 1240,
          onlineScans: 987,
          offlineScans: 260,
          pendingSync: 12,
          topDevices: [
            { device: 'iPhone 12', count: 342 },
            { device: 'Samsung Galaxy S21', count: 298 },
            { device: 'iPad Pro', count: 156 },
            { device: 'Google Pixel 5', count: 134 },
            { device: 'Other', count: 317 },
          ],
          scansByHour: {
            8: 45,
            9: 78,
            10: 123,
            11: 156,
            12: 98,
            13: 67,
            14: 89,
            15: 134,
            16: 167,
            17: 98,
            18: 76,
            19: 45,
          },
          scansByDay: {
            '2023-06-01': 234,
            '2023-06-02': 345,
            '2023-06-03': 212,
            '2023-06-04': 189,
            '2023-06-05': 267,
          },
        });

        setSystemStatus({
          qrGeneration: 'healthy',
          qrDetection: 'healthy',
          cache: 'healthy',
          database: 'healthy',
        });

        setLoading(false);
      }, 500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load dashboard data'
      );
      setLoading(false);
    }
  };

  // Prepare data for charts
  const hourlyData = metrics
    ? Object.entries(metrics.scansByHour).map(([hour, count]) => ({
        hour: `${hour}:00`,
        scans: count,
      }))
    : [];

  const dailyData = metrics
    ? Object.entries(metrics.scansByDay).map(([date, count]) => ({
        date: date.split('-')[2], // Just the day
        scans: count,
      }))
    : [];

  const deviceData = metrics ? metrics.topDevices : [];

  if (loading && !metrics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg">Loading QR dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-400 bg-red-100 p-4 text-red-700">
        <h3 className="font-bold">Error</h3>
        <p>{error}</p>
        <Button onClick={loadDashboardData} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">QR Management Dashboard</h1>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
          <Button variant="outline" onClick={loadDashboardData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scanner">Scanner</TabsTrigger>
          <TabsTrigger value="offline">Offline</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Scans
                </CardTitle>
                <BarChart3 className="text-gray-500 dark:text-gray-400 h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.totalScans.toLocaleString() || '0'}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  +12% from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Success Rate
                </CardTitle>
                <CheckCircle className="text-gray-500 dark:text-gray-400 h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics
                    ? `${(metrics.successRate * 100).toFixed(1)}%`
                    : '0%'}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  +2.3% from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Scan Time
                </CardTitle>
                <Clock className="text-gray-500 dark:text-gray-400 h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics ? `${metrics.avgScanTime}ms` : '0ms'}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  -120ms from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Unique Users
                </CardTitle>
                <Users className="text-gray-500 dark:text-gray-400 h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.uniqueScans.toLocaleString() || '0'}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  +8% from last week
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="flex items-center justify-between rounded border p-3">
                  <span className="font-medium">QR Generation</span>
                  <Badge
                    variant={
                      systemStatus?.qrGeneration === 'healthy'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {systemStatus?.qrGeneration || 'unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded border p-3">
                  <span className="font-medium">QR Detection</span>
                  <Badge
                    variant={
                      systemStatus?.qrDetection === 'healthy'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {systemStatus?.qrDetection || 'unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded border p-3">
                  <span className="font-medium">Cache</span>
                  <Badge
                    variant={
                      systemStatus?.cache === 'healthy'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {systemStatus?.cache || 'unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded border p-3">
                  <span className="font-medium">Database</span>
                  <Badge
                    variant={
                      systemStatus?.database === 'healthy'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {systemStatus?.database || 'unknown'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Scans by Hour */}
            <Card>
              <CardHeader>
                <CardTitle>Scans by Hour</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="scans" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Scans by Day */}
            <Card>
              <CardHeader>
                <CardTitle>Scans by Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="scans"
                        stroke="#8884d8"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Devices */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ device, percent }) =>
                          `${device}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {deviceData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scanner Tab */}
        <TabsContent value="scanner">
          <EnhancedQRScanner
            eventId={eventId}
            enableAnalytics={true}
            showAdvancedControls={true}
            scanMode="continuous"
          />
        </TabsContent>

        {/* Offline Tab */}
        <TabsContent value="offline">
          <OfflineQRScanner eventId={eventId} />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <QRPerformanceDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

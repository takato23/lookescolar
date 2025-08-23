'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

interface QRPerformanceData {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  cache: {
    entries: number;
    hitRate: number;
    memoryUsageMB: number;
    avgGenerationTimeMs: number;
    efficiency: number;
  };
  metrics: {
    totalHits: number;
    totalMisses: number;
    totalRequests: number;
  };
  components: {
    cache: string;
    qrGeneration: string;
    memory: string;
  };
  issues?: string[];
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  avgGenerationTime: number;
  cacheEfficiency: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function QRPerformanceDashboard() {
  const [performanceData, setPerformanceData] = useState<QRPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchPerformanceData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchPerformanceData, 30000);
    setRefreshInterval(interval);
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/qr/performance?action=health');
      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }
      
      const data = await response.json();
      setPerformanceData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateCache = async (pattern?: string) => {
    try {
      const response = await fetch('/api/qr/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'invalidate-cache',
          pattern: pattern || 'qr:'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to invalidate cache');
      }
      
      // Refresh data after invalidation
      fetchPerformanceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invalidate cache');
    }
  };

  const handleResetStats = async () => {
    try {
      const response = await fetch('/api/qr/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset-stats'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset stats');
      }
      
      // Refresh data after reset
      fetchPerformanceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset stats');
    }
  };

  if (loading && !performanceData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading QR performance data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <h3 className="font-bold">Error</h3>
        <p>{error}</p>
        <Button onClick={fetchPerformanceData} className="mt-2">Retry</Button>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
        <h3 className="font-bold">No Data</h3>
        <p>Unable to load QR performance data.</p>
      </div>
    );
  }

  const statusColors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    unhealthy: 'bg-red-500'
  };

  const componentStatusColors = {
    operational: 'bg-green-500',
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    unhealthy: 'bg-red-500'
  };

  // Data for charts
  const cacheData = [
    { name: 'Hit Rate', value: performanceData.cache.hitRate },
    { name: 'Efficiency', value: performanceData.cache.efficiency },
  ];

  const requestDistribution = [
    { name: 'Hits', value: performanceData.metrics.totalHits },
    { name: 'Misses', value: performanceData.metrics.totalMisses },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">QR Performance Dashboard</h2>
        <div className="flex space-x-2">
          <Button onClick={fetchPerformanceData} variant="outline">
            Refresh
          </Button>
          <Button onClick={() => handleInvalidateCache()} variant="outline">
            Clear Cache
          </Button>
          <Button onClick={handleResetStats} variant="outline">
            Reset Stats
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${statusColors[performanceData.status]}`}></div>
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{performanceData.status}</div>
            <p className="text-sm text-gray-500">Overall system health</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cache Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.cache.hitRate}%</div>
            <p className="text-sm text-gray-500">Efficiency metric</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cache Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.cache.entries}</div>
            <p className="text-sm text-gray-500">Active cache items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generation Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.cache.avgGenerationTimeMs}ms</div>
            <p className="text-sm text-gray-500">Avg QR generation</p>
          </CardContent>
        </Card>
      </div>

      {/* Component Status */}
      <Card>
        <CardHeader>
          <CardTitle>Component Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(performanceData.components).map(([component, status]) => (
              <div key={component} className="flex items-center justify-between p-3 border rounded">
                <span className="font-medium capitalize">{component.replace(/([A-Z])/g, ' $1')}</span>
                <Badge className={componentStatusColors[status as keyof typeof componentStatusColors]}>
                  {status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cache Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cacheData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={requestDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {requestDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium mb-2">Cache Metrics</h4>
              <ul className="space-y-1 text-sm">
                <li>Memory Usage: {performanceData.cache.memoryUsageMB} MB</li>
                <li>Cache Efficiency: {performanceData.cache.efficiency}%</li>
                <li>Total Entries: {performanceData.cache.entries}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Request Metrics</h4>
              <ul className="space-y-1 text-sm">
                <li>Total Requests: {performanceData.metrics.totalRequests}</li>
                <li>Hits: {performanceData.metrics.totalHits}</li>
                <li>Misses: {performanceData.metrics.totalMisses}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">System Metrics</h4>
              <ul className="space-y-1 text-sm">
                <li>Uptime: {performanceData.timestamp}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues */}
      {performanceData.issues && performanceData.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Issues Detected</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1">
              {performanceData.issues.map((issue, index) => (
                <li key={index} className="text-red-600">{issue}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
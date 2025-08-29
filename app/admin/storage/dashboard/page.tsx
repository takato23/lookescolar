'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'recharts';

interface StorageStats {
  totalPhotos: number;
  totalSizeMB: number;
  optimizedSizeMB: number;
  originalSizeMB: number;
  savingsMB: number;
  savingsPercentage: number;
  freeTierUsagePercentage: number;
  bucketUsage: {
    previews: number;
    originals: number;
    watermarks: number;
  };
  compressionStats: {
    level0: number;
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };
  dailyUploads: Array<{
    date: string;
    count: number;
    sizeMB: number;
  }>;
}

interface PhotoDetail {
  id: string;
  filename: string;
  originalSizeKB: number;
  optimizedSizeKB: number;
  compressionLevel: number;
  optimizationRatio: number;
  createdAt: string;
  eventId: string;
  eventName: string;
}

export default function StorageDashboard() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [photos, setPhotos] = useState<PhotoDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchStorageStats();
    fetchRecentPhotos();
  }, [timeRange]);

  const fetchStorageStats = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would call your API
      // const response = await fetch(`/api/admin/storage/stats?range=${timeRange}`);
      // const data = await response.json();

      // Mock data for demonstration
      const mockStats: StorageStats = {
        totalPhotos: 15420,
        totalSizeMB: 820,
        optimizedSizeMB: 820,
        originalSizeMB: 4630,
        savingsMB: 3810,
        savingsPercentage: 82.3,
        freeTierUsagePercentage: 82.0,
        bucketUsage: {
          previews: 820,
          originals: 0,
          watermarks: 0,
        },
        compressionStats: {
          level0: 0,
          level1: 1200,
          level2: 3400,
          level3: 5600,
          level4: 3200,
          level5: 2000,
        },
        dailyUploads: [
          { date: '2023-05-01', count: 120, sizeMB: 4.8 },
          { date: '2023-05-02', count: 95, sizeMB: 3.9 },
          { date: '2023-05-03', count: 180, sizeMB: 7.2 },
          { date: '2023-05-04', count: 145, sizeMB: 5.8 },
          { date: '2023-05-05', count: 210, sizeMB: 8.4 },
          { date: '2023-05-06', count: 85, sizeMB: 3.4 },
          { date: '2023-05-07', count: 165, sizeMB: 6.6 },
        ],
      };

      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching storage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPhotos = async () => {
    try {
      // In a real implementation, this would call your API
      // const response = await fetch('/api/admin/storage/recent-photos');
      // const data = await response.json();

      // Mock data for demonstration
      const mockPhotos: PhotoDetail[] = [
        {
          id: '1',
          filename: 'school-event-001.jpg',
          originalSizeKB: 2450,
          optimizedSizeKB: 32,
          compressionLevel: 4,
          optimizationRatio: 98.7,
          createdAt: '2023-05-07T14:30:00Z',
          eventId: 'event-1',
          eventName: 'Spring School Photos 2023',
        },
        {
          id: '2',
          filename: 'class-group-002.jpg',
          originalSizeKB: 3120,
          optimizedSizeKB: 45,
          compressionLevel: 3,
          optimizationRatio: 98.6,
          createdAt: '2023-05-07T13:45:00Z',
          eventId: 'event-1',
          eventName: 'Spring School Photos 2023',
        },
        {
          id: '3',
          filename: 'individual-portrait-003.jpg',
          originalSizeKB: 2870,
          optimizedSizeKB: 38,
          compressionLevel: 4,
          optimizationRatio: 98.7,
          createdAt: '2023-05-06T16:20:00Z',
          eventId: 'event-2',
          eventName: 'Senior Portraits 2023',
        },
      ];

      setPhotos(mockPhotos);
    } catch (error) {
      console.error('Error fetching recent photos:', error);
    }
  };

  const compressionLevelColors = [
    '#8884d8',
    '#83a6ed',
    '#8dd1e1',
    '#82ca9d',
    '#a4de6c',
    '#d0ed57',
  ];

  const bucketColors = ['#0088FE', '#00C49F', '#FFBB28'];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="mb-6 text-3xl font-bold">Storage Dashboard</h1>
        <p>Error loading storage statistics.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Storage Dashboard</h1>
        <div className="flex gap-2">
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            onClick={() => setTimeRange('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            onClick={() => setTimeRange('30d')}
          >
            30 Days
          </Button>
          <Button
            variant={timeRange === '90d' ? 'default' : 'outline'}
            onClick={() => setTimeRange('90d')}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="text-muted-foreground h-4 w-4"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalPhotos.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">Photos optimized</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="text-muted-foreground h-4 w-4"
            >
              <path d="M3 6h18" />
              <path d="M7 12h10" />
              <path d="M10 18h4" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSizeMB.toLocaleString()} MB
            </div>
            <p className="text-muted-foreground text-xs">
              <span className="font-medium text-green-600">
                {stats.savingsPercentage.toFixed(1)}% savings
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Free Tier Usage
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="text-muted-foreground h-4 w-4"
            >
              <path d="M12 2v20" />
              <path d="m19 9-7 7-7-7" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.freeTierUsagePercentage.toFixed(1)}%
            </div>
            <p className="text-muted-foreground text-xs">of 1GB limit</p>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{
                  width: `${Math.min(stats.freeTierUsagePercentage, 100)}%`,
                }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Compression
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="text-muted-foreground h-4 w-4"
            >
              <path d="M7 12l5 5 5-5" />
              <path d="M7 7l5 5 5-5" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.7%</div>
            <p className="text-muted-foreground text-xs">
              Average optimization ratio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Uploads</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyUploads}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="Photos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compression Levels</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Level 0', value: stats.compressionStats.level0 },
                    { name: 'Level 1', value: stats.compressionStats.level1 },
                    { name: 'Level 2', value: stats.compressionStats.level2 },
                    { name: 'Level 3', value: stats.compressionStats.level3 },
                    { name: 'Level 4', value: stats.compressionStats.level4 },
                    { name: 'Level 5', value: stats.compressionStats.level5 },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {Object.keys(stats.compressionStats).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        compressionLevelColors[
                          index % compressionLevelColors.length
                        ]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Photos */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Optimized Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex-1">
                  <div className="font-medium">{photo.filename}</div>
                  <div className="text-muted-foreground text-sm">
                    {photo.eventName}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-medium">
                      {photo.optimizedSizeKB} KB
                    </div>
                    <div className="text-muted-foreground text-sm">
                      <span className="text-green-600">
                        {photo.optimizationRatio.toFixed(1)}% saved
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    Level {photo.compressionLevel}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

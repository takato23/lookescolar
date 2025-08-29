'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Camera,
  Check,
  Users,
  BookOpen,
  TrendingUp,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';

interface GalleryStats {
  total_photos: number;
  approved_photos: number;
  individual_photos: number;
  group_photos: number;
  activity_photos: number;
  event_photos: number;
  by_grade?: Record<string, number>;
  by_date?: Array<{ date: string; count: number }>;
}

interface GalleryStatsDashboardProps {
  eventId: string;
  levelId?: string;
  courseId?: string;
  studentId?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function GalleryStatsDashboard({
  eventId,
  levelId,
  courseId,
  studentId,
}: GalleryStatsDashboardProps) {
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [eventId, levelId, courseId, studentId]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (levelId) params.set('level_id', levelId);
      if (courseId) params.set('course_id', courseId);
      if (studentId) params.set('student_id', studentId);

      const response = await fetch(
        `/api/admin/events/${eventId}/stats/gallery?${params}`
      );

      if (!response.ok) {
        throw new Error('Failed to load gallery statistics');
      }

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.error || 'Failed to load gallery statistics');
      }
    } catch (err) {
      console.error('Error loading gallery stats:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load gallery statistics'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
        <span className="ml-2">Cargando estadísticas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="text-destructive h-5 w-5" />
            <h3 className="text-destructive font-medium">Error</h3>
          </div>
          <p className="text-destructive mt-2 text-sm">{error}</p>
          <button
            className="text-destructive mt-3 text-sm hover:underline"
            onClick={loadStats}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="bg-muted rounded-lg p-4 text-center">
          <ImageIcon className="text-muted-foreground mx-auto mb-2 h-12 w-12" />
          <p className="text-muted-foreground">
            No hay estadísticas disponibles
          </p>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const photoTypeData = [
    { name: 'Individual', value: stats.individual_photos || 0 },
    { name: 'Grupo', value: stats.group_photos || 0 },
    { name: 'Actividad', value: stats.activity_photos || 0 },
    { name: 'Evento', value: stats.event_photos || 0 },
  ];

  const approvalData = [
    { name: 'Aprobadas', value: stats.approved_photos || 0 },
    {
      name: 'Pendientes',
      value: (stats.total_photos || 0) - (stats.approved_photos || 0),
    },
  ];

  const gradeData = stats.by_grade
    ? Object.entries(stats.by_grade).map(([grade, count]) => ({
        name: grade,
        value: count,
      }))
    : [];

  const dateData = stats.by_date || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total</p>
                <p className="text-2xl font-bold">{stats.total_photos || 0}</p>
              </div>
              <Camera className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Aprobadas</p>
                <p className="text-2xl font-bold">
                  {stats.approved_photos || 0}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Individuales</p>
                <p className="text-2xl font-bold">
                  {stats.individual_photos || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Grupales</p>
                <p className="text-2xl font-bold">{stats.group_photos || 0}</p>
              </div>
              <BookOpen className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Photo Types Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tipos de Fotos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={photoTypeData}
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
                    {photoTypeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Fotos']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Approval Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              Estado de Aprobación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={approvalData}
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
                    {approvalData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#10B981' : '#EF4444'}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Fotos']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Photos by Grade (if available) */}
        {gradeData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Fotos por Grado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={gradeData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [value, 'Fotos']} />
                    <Legend />
                    <Bar dataKey="value" name="Fotos" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos by Date (if available) */}
        {dateData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fotos por Fecha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dateData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [value, 'Fotos']} />
                    <Legend />
                    <Bar dataKey="count" name="Fotos" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

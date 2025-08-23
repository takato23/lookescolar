'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, Clock, AlertTriangle, Camera, Users, 
  TrendingUp, Target, Award, BarChart3, Zap,
  Calendar, Download, RefreshCw, ArrowUp, ArrowDown,
  Folder, GraduationCap, BookOpen, User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStats {
  total: number;
  completed: number;
  pending: number;
  percentage: number;
}

interface LevelProgress {
  id: string;
  name: string;
  type: 'event' | 'level' | 'course' | 'student';
  icon: React.ElementType;
  color: string;
  photos: ProgressStats;
  tagging: ProgressStats;
  approval: ProgressStats;
  students: ProgressStats;
  lastActivity?: string;
  estimatedCompletion?: string;
  children?: LevelProgress[];
}

interface ProgressIndicatorsProps {
  eventId: string;
  refreshInterval?: number;
  showDetails?: boolean;
  onProgressUpdate?: (progress: LevelProgress[]) => void;
}

export default function ProgressIndicators({
  eventId,
  refreshInterval = 30000, // 30 seconds
  showDetails = true,
  onProgressUpdate
}: ProgressIndicatorsProps) {
  const [progressData, setProgressData] = useState<LevelProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch progress data
  const fetchProgressData = async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/progress`);
      const data = await response.json();
      
      if (data.success) {
        setProgressData(data.progress || []);
        setLastUpdate(new Date());
        onProgressUpdate?.(data.progress || []);
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchProgressData();
    
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchProgressData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [eventId, autoRefresh, refreshInterval]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (progressData.length === 0) return null;

    const totals = progressData.reduce(
      (acc, level) => ({
        photos: {
          total: acc.photos.total + level.photos.total,
          completed: acc.photos.completed + level.photos.completed
        },
        tagging: {
          total: acc.tagging.total + level.tagging.total,
          completed: acc.tagging.completed + level.tagging.completed
        },
        approval: {
          total: acc.approval.total + level.approval.total,
          completed: acc.approval.completed + level.approval.completed
        }
      }),
      {
        photos: { total: 0, completed: 0 },
        tagging: { total: 0, completed: 0 },
        approval: { total: 0, completed: 0 }
      }
    );

    return {
      photos: {
        ...totals.photos,
        percentage: totals.photos.total > 0 ? (totals.photos.completed / totals.photos.total) * 100 : 0
      },
      tagging: {
        ...totals.tagging,
        percentage: totals.tagging.total > 0 ? (totals.tagging.completed / totals.tagging.total) * 100 : 0
      },
      approval: {
        ...totals.approval,
        percentage: totals.approval.total > 0 ? (totals.approval.completed / totals.approval.total) * 100 : 0
      }
    };
  }, [progressData]);

  // Progress card component
  const ProgressCard = ({ level, isNested = false }: { level: LevelProgress; isNested?: boolean }) => {
    const Icon = level.icon;
    
    const getStatusColor = (percentage: number) => {
      if (percentage >= 90) return 'text-green-600';
      if (percentage >= 70) return 'text-blue-600';
      if (percentage >= 40) return 'text-yellow-600';
      return 'text-red-600';
    };

    const getStatusIcon = (percentage: number) => {
      if (percentage >= 90) return CheckCircle;
      if (percentage >= 70) return TrendingUp;
      if (percentage >= 40) return Clock;
      return AlertTriangle;
    };

    return (
      <Card className={cn(
        "transition-all hover:shadow-md",
        isNested && "ml-6 border-l-4 border-l-gray-200"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", level.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{level.name}</CardTitle>
                <p className="text-sm text-muted-foreground capitalize">
                  {level.type}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {level.estimatedCompletion && (
                <Badge variant="outline" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {level.estimatedCompletion}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Photos progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Fotos Subidas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {level.photos.completed} / {level.photos.total}
                </span>
                <span className={cn("font-medium", getStatusColor(level.photos.percentage))}>
                  {Math.round(level.photos.percentage)}%
                </span>
              </div>
            </div>
            <Progress value={level.photos.percentage} className="h-2" />
          </div>

          {/* Tagging progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="font-medium">Etiquetado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {level.tagging.completed} / {level.tagging.total}
                </span>
                <span className={cn("font-medium", getStatusColor(level.tagging.percentage))}>
                  {Math.round(level.tagging.percentage)}%
                </span>
              </div>
            </div>
            <Progress value={level.tagging.percentage} className="h-2" />
          </div>

          {/* Approval progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Aprobación</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {level.approval.completed} / {level.approval.total}
                </span>
                <span className={cn("font-medium", getStatusColor(level.approval.percentage))}>
                  {Math.round(level.approval.percentage)}%
                </span>
              </div>
            </div>
            <Progress value={level.approval.percentage} className="h-2" />
          </div>

          {/* Student progress (if applicable) */}
          {level.students.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">Estudiantes con Fotos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {level.students.completed} / {level.students.total}
                  </span>
                  <span className={cn("font-medium", getStatusColor(level.students.percentage))}>
                    {Math.round(level.students.percentage)}%
                  </span>
                </div>
              </div>
              <Progress value={level.students.percentage} className="h-2" />
            </div>
          )}

          {/* Status summary */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {level.lastActivity && (
                <>
                  <Clock className="h-3 w-3" />
                  <span>Última actividad: {level.lastActivity}</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {[level.photos, level.tagging, level.approval].map((stat, index) => {
                const StatusIcon = getStatusIcon(stat.percentage);
                return (
                  <StatusIcon 
                    key={index}
                    className={cn("h-4 w-4", getStatusColor(stat.percentage))} 
                  />
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Overall progress summary
  const OverallProgressSummary = () => {
    if (!overallProgress) return null;

    return (
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Progreso General del Evento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Photos */}
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-3">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 30}`}
                    strokeDashoffset={`${2 * Math.PI * 30 * (1 - overallProgress.photos.percentage / 100)}`}
                    className="text-blue-600 transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-600">
                    {Math.round(overallProgress.photos.percentage)}%
                  </span>
                </div>
              </div>
              <h3 className="font-medium text-blue-900">Fotos Subidas</h3>
              <p className="text-sm text-blue-700">
                {overallProgress.photos.completed} / {overallProgress.photos.total}
              </p>
            </div>

            {/* Tagging */}
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-3">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 30}`}
                    strokeDashoffset={`${2 * Math.PI * 30 * (1 - overallProgress.tagging.percentage / 100)}`}
                    className="text-purple-600 transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-purple-600">
                    {Math.round(overallProgress.tagging.percentage)}%
                  </span>
                </div>
              </div>
              <h3 className="font-medium text-purple-900">Etiquetado</h3>
              <p className="text-sm text-purple-700">
                {overallProgress.tagging.completed} / {overallProgress.tagging.total}
              </p>
            </div>

            {/* Approval */}
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-3">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 30}`}
                    strokeDashoffset={`${2 * Math.PI * 30 * (1 - overallProgress.approval.percentage / 100)}`}
                    className="text-green-600 transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-green-600">
                    {Math.round(overallProgress.approval.percentage)}%
                  </span>
                </div>
              </div>
              <h3 className="font-medium text-green-900">Aprobación</h3>
              <p className="text-sm text-green-700">
                {overallProgress.approval.completed} / {overallProgress.approval.total}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 rounded"></div>
                <div className="h-2 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Progreso del Evento</h2>
          <p className="text-muted-foreground">
            Última actualización: {lastUpdate.toLocaleTimeString('es-AR')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(autoRefresh && "bg-green-50 border-green-200")}
          >
            <Zap className="h-4 w-4 mr-1" />
            Auto-refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProgressData}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Overall progress */}
      <OverallProgressSummary />

      {/* Individual progress cards */}
      {showDetails && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Progreso por Nivel</h3>
          {progressData.map(level => (
            <div key={level.id}>
              <ProgressCard level={level} />
              {level.children && level.children.map(child => (
                <ProgressCard key={child.id} level={child} isNested />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
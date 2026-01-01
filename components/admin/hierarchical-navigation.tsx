'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Camera,
  ExternalLink,
  FolderTree,
  GraduationCap,
  LineChart,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { HierarchicalFolderTreeEnhanced } from '@/components/admin/HierarchicalFolderTreeEnhanced';

const NAVIGATION_VIEWS = ['overview', 'folders', 'students', 'analytics'] as const;
type NavigationView = (typeof NAVIGATION_VIEWS)[number];

type FolderNode = {
  id: string;
  name: string;
  parent_id: string | null;
  depth: number;
  photo_count: number;
  has_children: boolean;
  event_id?: string | null;
  level_type?: 'event' | 'nivel' | 'salon' | 'familia';
};

interface HierarchicalNavigationProps {
  eventId: string;
  eventName?: string;
  initialView?: NavigationView | string;
  eventSnapshot?: Record<string, any> | null;
  analytics?: Record<string, any> | null;
}

const formatNumber = (value: number | undefined | null, options?: Intl.NumberFormatOptions) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toLocaleString('es-AR', { maximumFractionDigits: 1, ...options });
};

const formatPercent = (value: number | undefined | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
};

export default function HierarchicalNavigation({
  eventId,
  eventName,
  initialView = 'folders',
  eventSnapshot,
  analytics,
}: HierarchicalNavigationProps) {
  const defaultView: NavigationView = NAVIGATION_VIEWS.includes(initialView as NavigationView)
    ? (initialView as NavigationView)
    : 'folders';

  const [activeView, setActiveView] = useState<NavigationView>(defaultView);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadFolders = async () => {
      setLoading(true);
      setError(null);

      try {
        const limit = 50;
        let offset = 0;
        let total = Number.POSITIVE_INFINITY;
        const aggregated: FolderNode[] = [];

        while (offset < total) {
          const response = await fetch(
            `/api/admin/folders?event_id=${encodeURIComponent(eventId)}&limit=${limit}&offset=${offset}`,
            { signal: controller.signal }
          );

          if (!response.ok) {
            throw new Error(`Error fetching folders: ${response.status}`);
          }

          const json = await response.json();
          const batch: FolderNode[] = Array.isArray(json.folders) ? json.folders : [];
          aggregated.push(...batch);

          const reportedCount = typeof json.count === 'number' ? json.count : undefined;
          if (typeof reportedCount === 'number' && Number.isFinite(reportedCount) && reportedCount >= 0) {
            total = reportedCount;
          } else if (batch.length < limit) {
            total = offset + batch.length;
          }

          offset += limit;
          if (batch.length < limit) break;
        }

        if (controller.signal.aborted) return;

        setFolders(aggregated);
        setExpandedFolders((prev) => {
          if (prev.length > 0) return prev;
          const roots = aggregated.filter((folder) => !folder.parent_id).map((folder) => folder.id);
          return roots.length > 0 ? roots : prev;
        });
        setSelectedFolderId((current) => {
          if (current) return current;
          const first = aggregated[0]?.id;
          return first || null;
        });
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        console.error('[HierarchicalNavigation] Failed to load folders', fetchError);
        setError('No pudimos cargar la estructura de carpetas. Intentá nuevamente.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadFolders();

    return () => {
      controller.abort();
    };
  }, [eventId, reloadKey]);

  const folderMap = useMemo(() => {
    const map = new Map<string, FolderNode>();
    folders.forEach((folder) => {
      map.set(folder.id, folder);
    });
    return map;
  }, [folders]);

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return folderMap.get(selectedFolderId) || null;
  }, [folderMap, selectedFolderId]);

  const selectedFolderBreadcrumb = useMemo(() => {
    if (!selectedFolderId) return [] as FolderNode[];
    const trail: FolderNode[] = [];
    const visited = new Set<string>();
    let currentId: string | null = selectedFolderId;

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const node = folderMap.get(currentId);
      if (!node) break;
      trail.unshift(node);
      currentId = node.parent_id;
    }

    return trail;
  }, [folderMap, selectedFolderId]);

  const childFolders = useMemo(() => {
    if (!selectedFolderId) return [] as FolderNode[];
    return folders.filter((folder) => folder.parent_id === selectedFolderId);
  }, [folders, selectedFolderId]);

  const handleFolderToggle = (folderId: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId]
    );
  };

  const handleFolderAction = (
    action: 'delete' | 'rename' | 'move' | 'share' | 'create_child',
    folder: FolderNode
  ) => {
    console.info('[HierarchicalNavigation] Action triggered', action, folder);
  };

  const metrics = analytics || eventSnapshot?.stats || null;
  const performance = metrics?.performance;
  const recentActivity = metrics?.recent_activity;

  return (
    <Tabs
      value={activeView}
      onValueChange={(view) => setActiveView(view as NavigationView)}
      className="w-full"
    >
      <Card className="border-border/30 bg-background/60 backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-xl font-semibold">
              Exploración jerárquica{eventName ? ` · ${eventName}` : ''}
            </CardTitle>
            <Badge variant="outline" className="font-normal">
              {formatNumber(folders.length, { maximumFractionDigits: 0 })} carpetas
            </Badge>
          </div>
          <TabsList className="bg-background/60 text-muted-foreground flex w-full flex-wrap gap-2 rounded-full p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex items-center gap-2 rounded-full px-3 py-2 text-sm"
            >
              <GraduationCap className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="folders"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex items-center gap-2 rounded-full px-3 py-2 text-sm"
            >
              <FolderTree className="h-4 w-4" />
              Carpetas
            </TabsTrigger>
            <TabsTrigger
              value="students"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex items-center gap-2 rounded-full px-3 py-2 text-sm"
            >
              <Users className="h-4 w-4" />
              Estudiantes
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex items-center gap-2 rounded-full px-3 py-2 text-sm"
            >
              <LineChart className="h-4 w-4" />
              Analítica
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>
          <TabsContent value="overview" className="space-y-4">
            {metrics ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <OverviewMetricCard
                  label="Niveles"
                  value={metrics.total_levels}
                  helper="Organización académica"
                  icon={<GraduationCap className="h-5 w-5 text-blue-500" />}
                />
                <OverviewMetricCard
                  label="Cursos"
                  value={metrics.total_courses}
                  helper={`${formatNumber(metrics.active_courses, { maximumFractionDigits: 0 })} activos`}
                  icon={<Users className="h-5 w-5 text-purple-500" />}
                />
                <OverviewMetricCard
                  label="Estudiantes"
                  value={metrics.total_students}
                  helper={`${formatNumber(metrics.active_students, { maximumFractionDigits: 0 })} activos`}
                  icon={<Users className="h-5 w-5 text-emerald-500" />}
                />
                <OverviewMetricCard
                  label="Fotos totales"
                  value={metrics.total_photos}
                  helper={`${formatNumber(metrics.approved_photos, { maximumFractionDigits: 0 })} aprobadas`}
                  icon={<Camera className="h-5 w-5 text-orange-500" />}
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 rounded-2xl" />
                ))}
              </div>
            )}
            {metrics && recentActivity ? (
              <Card className="border-border/40 bg-background/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">Actividad reciente (7 días)</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                  <ActivitySummary label="Nuevos estudiantes" value={recentActivity.new_students} />
                  <ActivitySummary label="Fotos subidas" value={recentActivity.new_photos} />
                  <ActivitySummary label="Pedidos nuevos" value={recentActivity.new_orders} />
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="folders" className="space-y-4">
            {error ? (
              <Alert variant="destructive" className="border-red-200 bg-red-50/80">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Error al cargar carpetas</AlertTitle>
                <AlertDescription className="mt-1 space-y-3">
                  <p>{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReloadKey((key) => key + 1)}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" /> Reintentar
                  </Button>
                </AlertDescription>
              </Alert>
            ) : loading ? (
              <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <Skeleton className="h-80 rounded-2xl" />
                <Skeleton className="h-80 rounded-2xl" />
              </div>
            ) : folders.length === 0 ? (
              <Card className="border-dashed border-border/40 bg-background/70">
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
                  <FolderTree className="h-8 w-8 text-muted-foreground" />
                  <p>No encontramos carpetas para este evento todavía.</p>
                  <Link href={`/admin/events/${eventId}/library`}>
                    <Button className="gap-2" variant="default">
                      <ExternalLink className="h-4 w-4" /> Gestionar en el editor completo
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <div className="rounded-2xl border border-border/30 bg-background/80 p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Estructura</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {formatNumber(folders.length, { maximumFractionDigits: 0 })} carpetas
                    </Badge>
                  </div>
                  <div className="max-h-[520px] overflow-y-auto pr-2">
                    <HierarchicalFolderTreeEnhanced
                      folders={folders}
                      selectedFolderId={selectedFolderId}
                      expandedFolders={expandedFolders}
                      showEventContext={false}
                      onFolderSelect={setSelectedFolderId}
                      onFolderToggle={handleFolderToggle}
                      onFolderAction={handleFolderAction}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedFolder ? (
                    <Card className="border-border/30 bg-background/80">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold">
                          {selectedFolder.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        {selectedFolderBreadcrumb.length > 1 ? (
                          <div className="flex flex-wrap items-center gap-1 text-muted-foreground">
                            {selectedFolderBreadcrumb.map((folder, index) => (
                              <span key={folder.id} className="flex items-center gap-1">
                                {index > 0 ? <span className="text-muted-foreground/40">/</span> : null}
                                <span>{folder.name}</span>
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <FolderStat label="Nivel" value={selectedFolder.depth} />
                          <FolderStat label="Fotos" value={selectedFolder.photo_count} />
                          <FolderStat label="Subcarpetas" value={childFolders.length} />
                          <FolderStat label="Tiene hijos" value={selectedFolder.has_children ? 'Sí' : 'No'} />
                        </div>

                        <Link href={`/admin/events/${eventId}/library`}>
                          <Button variant="secondary" className="w-full gap-2">
                            <ExternalLink className="h-4 w-4" /> Abrir en el gestor completo
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed border-border/30 bg-background/60">
                      <CardContent className="flex h-full items-center justify-center py-16 text-sm text-muted-foreground">
                        Seleccioná una carpeta para ver detalles.
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            {metrics ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <OverviewMetricCard
                  label="Estudiantes activos"
                  value={metrics.active_students}
                  helper={`${formatPercent(
                    metrics.total_students > 0
                      ? (metrics.active_students / metrics.total_students) * 100
                      : undefined
                  )} del total`}
                  icon={<Users className="h-5 w-5 text-emerald-500" />}
                />
                <OverviewMetricCard
                  label="Con curso asignado"
                  value={metrics.students_with_course}
                  helper={`${formatPercent(
                    metrics.total_students > 0
                      ? (metrics.students_with_course / metrics.total_students) * 100
                      : undefined
                  )} cubiertos`}
                  icon={<GraduationCap className="h-5 w-5 text-blue-500" />}
                />
                <OverviewMetricCard
                  label="Sin curso"
                  value={metrics.students_without_course}
                  helper="Revisá la organización"
                  icon={<AlertCircle className="h-5 w-5 text-orange-500" />}
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 rounded-2xl" />
                ))}
              </div>
            )}
            <Card className="border-border/30 bg-background/80">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
                <div>
                  <p className="text-sm font-medium">Gestioná estudiantes del evento</p>
                  <p className="text-sm text-muted-foreground">
                    Accedé al panel dedicado para sincronizar datos de cursos y clientes.
                  </p>
                </div>
                <Link href={`/admin/events/${eventId}/students`}>
                  <Button className="gap-2">
                    <ExternalLink className="h-4 w-4" /> Abrir módulo de estudiantes
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {metrics ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <AnalyticsCard
                  title="Salud general"
                  value={formatNumber(performance?.health_score)}
                  helper="Indicador interno basado en tagging, órdenes y cobertura"
                  progress={performance?.health_score}
                />
                <AnalyticsCard
                  title="Avance de catalogación"
                  value={formatPercent(metrics.photo_tagging_progress)}
                  helper="Porcentaje de fotos etiquetadas"
                  progress={metrics.photo_tagging_progress}
                />
                <AnalyticsCard
                  title="Conversión a pedidos"
                  value={formatPercent(metrics.order_conversion_rate)}
                  helper="Pedidos vs. estudiantes activos"
                  progress={metrics.order_conversion_rate}
                />
                <AnalyticsCard
                  title="Fotos por estudiante"
                  value={formatNumber(metrics.avg_photos_per_student, { maximumFractionDigits: 2 })}
                  helper="Promedio de fotos aprobadas por estudiante"
                />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-36 rounded-2xl" />
                ))}
              </div>
            )}
            <Card className="border-border/30 bg-background/80">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
                <div>
                  <p className="text-sm font-medium">¿Necesitás más detalle?</p>
                  <p className="text-sm text-muted-foreground">
                    Abrí la biblioteca completa del evento para ver métricas avanzadas y ejecutar acciones.
                  </p>
                </div>
                <Link href={`/admin/events/${eventId}/library`}>
                  <Button variant="secondary" className="gap-2">
                    <ExternalLink className="h-4 w-4" /> Ir a la biblioteca del evento
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}

interface OverviewMetricCardProps {
  label: string;
  value: number | undefined;
  helper?: string;
  icon: ReactNode;
}

function OverviewMetricCard({ label, value, helper, icon }: OverviewMetricCardProps) {
  return (
    <Card className="border-border/30 bg-background/80">
      <CardContent className="space-y-3 py-5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{label}</span>
          <span>{icon}</span>
        </div>
        <p className="text-2xl font-semibold text-foreground">{formatNumber(value, { maximumFractionDigits: 0 })}</p>
        {helper ? <p className="text-xs text-muted-foreground/80">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

interface ActivitySummaryProps {
  label: string;
  value: number | undefined;
}

function ActivitySummary({ label, value }: ActivitySummaryProps) {
  return (
    <div className="rounded-2xl border border-border/30 bg-background/80 p-4 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{formatNumber(value, { maximumFractionDigits: 0 })}</p>
    </div>
  );
}

interface FolderStatProps {
  label: string;
  value: string | number | undefined;
}

function FolderStat({ label, value }: FolderStatProps) {
  return (
    <div className="rounded-xl border border-border/30 bg-background/70 p-3 text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-semibold">{typeof value === 'number' ? formatNumber(value, { maximumFractionDigits: 0 }) : value ?? '—'}</p>
    </div>
  );
}

interface AnalyticsCardProps {
  title: string;
  value: string;
  helper?: string;
  progress?: number | null;
}

function AnalyticsCard({ title, value, helper, progress }: AnalyticsCardProps) {
  const normalized = typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : null;
  return (
    <Card className="border-border/30 bg-background/80">
      <CardContent className="space-y-4 py-5">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {helper ? <p className="text-sm text-muted-foreground">{helper}</p> : null}
        </div>
        <p className="text-3xl font-semibold">{value}</p>
        {typeof normalized === 'number' ? (
          <div className="h-2 w-full rounded-full bg-muted/40">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
              style={{ width: `${normalized}%` }}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

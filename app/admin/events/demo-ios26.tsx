'use client';

import Link from 'next/link';
import {
  Plus,
  Calendar,
  ArrowLeft,
  Home,
  Sparkles,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { EventCard } from '@/components/admin/EventCard';

// Mock data for demonstration
const mockEvents = [
  {
    id: '1',
    school: 'Colegio San José',
    date: '2025-09-15',
    active: true,
    photo_price: 1500,
    created_at: '2025-08-01',
    updated_at: '2025-08-20',
    stats: {
      totalPhotos: 124,
      totalSubjects: 42,
      totalOrders: 18,
      revenue: 27000,
      untaggedPhotos: 5,
      pendingOrders: 2,
    },
  },
  {
    id: '2',
    school: 'Instituto Santa María',
    date: '2025-09-22',
    active: true,
    photo_price: 1800,
    created_at: '2025-08-05',
    updated_at: '2025-08-20',
    stats: {
      totalPhotos: 89,
      totalSubjects: 35,
      totalOrders: 12,
      revenue: 21600,
      untaggedPhotos: 0,
      pendingOrders: 1,
    },
  },
  {
    id: '3',
    school: 'Escuela Primaria Los Álamos',
    date: '2025-09-30',
    active: true,
    photo_price: 1200,
    created_at: '2025-08-10',
    updated_at: '2025-08-20',
    stats: {
      totalPhotos: 156,
      totalSubjects: 58,
      totalOrders: 24,
      revenue: 18600,
      untaggedPhotos: 12,
      pendingOrders: 3,
    },
  },
  {
    id: '4',
    school: 'Colegio Nacional Buenos Aires',
    date: '2025-10-05',
    active: false,
    photo_price: 2000,
    created_at: '2025-08-15',
    updated_at: '2025-08-20',
    stats: {
      totalPhotos: 0,
      totalSubjects: 0,
      totalOrders: 0,
      revenue: 0,
      untaggedPhotos: 0,
      pendingOrders: 0,
    },
  },
  {
    id: '5',
    school: 'Jardín de Infantes Mi Mundo',
    date: '2025-10-12',
    active: true,
    photo_price: 1000,
    created_at: '2025-08-18',
    updated_at: '2025-08-20',
    stats: {
      totalPhotos: 67,
      totalSubjects: 25,
      totalOrders: 8,
      revenue: 8000,
      untaggedPhotos: 3,
      pendingOrders: 0,
    },
  },
];

export default function EventsDemoPage() {
  // Calculate statistics for the dashboard
  const totalEvents = mockEvents.length;
  const totalPhotos = mockEvents.reduce(
    (sum, event) => sum + (event.stats?.totalPhotos || 0),
    0
  );
  const totalRevenue = mockEvents.reduce(
    (sum, event) => sum + (event.stats?.revenue || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:space-y-8">
        {/* Enhanced Header with Breadcrumbs and Stats */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl" />
          <div className="liquid-glass-card-ios26 relative rounded-2xl border border-border/20 p-6 shadow-xl sm:p-8">
            {/* Breadcrumbs */}
            <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
              <Link
                href="/admin"
                className="flex items-center gap-1 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground dark:text-foreground">
                Eventos
              </span>
            </nav>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <Link href="/admin">
                  <button className="liquid-glass-button-ios26 rounded-full p-2 transition-colors hover:bg-surface/10">
                    <ArrowLeft className="h-5 w-5 text-foreground dark:text-muted-foreground" />
                  </button>
                </Link>
                <div>
                  <h1 className="gradient-text-ios26 mb-2 text-2xl font-bold sm:text-3xl md:text-4xl">
                    Eventos
                  </h1>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground sm:text-base">
                    Gestiona tus sesiones fotográficas y organiza por colegios
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/admin/events/new">
                  <button className="liquid-glass-button-ios26 flex items-center gap-2 rounded-xl px-4 py-2 shadow-lg transition-all hover:bg-surface/10 sm:px-6 sm:py-3">
                    <Plus className="h-5 w-5" />
                    <span className="font-semibold text-foreground dark:text-muted-foreground">
                      Nuevo Evento
                    </span>
                  </button>
                </Link>
              </div>
            </div>

            {/* Stats Dashboard */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="glass-stat-card-ios26 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100/50 p-2 dark:bg-blue-900/30">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    Total Eventos
                  </p>
                  <p className="text-xl font-bold text-foreground dark:text-foreground">
                    {totalEvents}
                  </p>
                </div>
              </div>

              <div className="glass-stat-card-ios26 flex items-center gap-3">
                <div className="rounded-lg bg-purple-100/50 p-2 dark:bg-purple-900/30">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    Fotos Totales
                  </p>
                  <p className="text-xl font-bold text-foreground dark:text-foreground">
                    {totalPhotos}
                  </p>
                </div>
              </div>

              <div className="glass-stat-card-ios26 flex items-center gap-3">
                <div className="rounded-lg bg-green-100/50 p-2 dark:bg-green-900/30">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    Ingresos Totales
                  </p>
                  <p className="text-xl font-bold text-foreground dark:text-foreground">
                    ${totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Events Content */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {mockEvents.map((event, index) => (
              <div
                key={event.id}
                className="animate-slide-up"
                style={{ animationDelay: `${0.1 + index * 0.05}s` }}
              >
                <EventCard event={event} className="flex h-full flex-col" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Suspense } from 'react';
import { DashboardClient } from '@/components/admin/dashboard/DashboardClient';
import { DashboardSkeleton } from '@/components/admin/dashboard/DashboardSkeleton';

export const metadata = {
  title: 'Dashboard Profesional | LookEscolar',
  description:
    'Panel de control profesional para gestión de fotografía escolar',
};

// This page is now a server component that renders the client dashboard
export default function ProDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient />
    </Suspense>
  );
}

import { Suspense } from 'react';
import { DashboardClient } from '@/components/admin/dashboard/DashboardClient';
import { DashboardSkeleton } from '@/components/admin/dashboard/DashboardSkeleton';

export const metadata = {
  title: 'Dashboard | LookEscolar',
  description: 'Panel de control para gestión de fotografía escolar',
};

export default function AdminHomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient />
    </Suspense>
  );
}

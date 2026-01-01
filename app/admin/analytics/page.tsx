'use client';

import AnalyticsView from '@/components/admin/analytics/AnalyticsView';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
      <div className="container mx-auto py-8">
        <div className="mb-6 px-6">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>
        <AnalyticsView />
      </div>
    </div>
  );
}

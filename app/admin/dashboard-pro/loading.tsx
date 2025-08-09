'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoadingDashboardPro() {
  return (
    <div
      className="bg-background min-h-screen p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                <div className="bg-muted mt-3 h-8 w-32 animate-pulse rounded" />
                <div className="bg-muted mt-2 h-3 w-40 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="bg-muted h-8 w-8 animate-pulse rounded-lg" />
                <div className="bg-muted h-4 w-1/3 animate-pulse rounded" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

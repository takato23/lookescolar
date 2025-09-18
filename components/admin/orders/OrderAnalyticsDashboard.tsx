'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OrderAnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            Order analytics coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

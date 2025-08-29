'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SecurityAuditDashboard() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Security Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Security audit dashboard coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
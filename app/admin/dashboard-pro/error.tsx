'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ErrorDashboardPro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optional: report to monitoring service
    // (intentionally avoid console to satisfy lint rules)
  }, [error]);

  return (
    <div className="bg-background min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <Card
          aria-live="assertive"
          aria-label="Error en el dashboard profesional"
        >
          <CardHeader>
            <CardTitle>Ocurrió un error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              Intenta recargar la página. Si el problema persiste, contacta al
              soporte.
            </p>
            {error?.message && (
              <pre className="text-muted-foreground bg-muted whitespace-pre-wrap rounded p-3 text-xs">
                {error.message}
              </pre>
            )}
            <div>
              <Button onClick={reset} aria-label="Reintentar cargar dashboard">
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

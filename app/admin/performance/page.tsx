'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OperationalDashboard } from '@/components/admin/OperationalDashboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Activity } from 'lucide-react';

export default function PerformancePage() {
  const router = useRouter();

  return (
    <div className="gradient-mesh min-h-screen">
      <div className="container mx-auto space-y-8 px-6 py-8">
        {/* Header */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/admin')}
                className="rounded-full p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-gradient mb-2 text-3xl font-bold md:text-4xl">
                  Monitor de Performance
                </h1>
                <p className="text-muted-foreground">
                  Sistema de monitoreo operacional avanzado con métricas en
                  tiempo real
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Dashboard */}
        <OperationalDashboard />

        {/* Back to Dashboard Button */}
        <div className="flex justify-center pt-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push('/admin')}
            className="shadow-3d rounded-full px-8"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Volver al Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

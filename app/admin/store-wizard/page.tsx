'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { loadStoreConfig, saveStoreConfigAction } from '@/app/admin/store-settings/actions';
import type { StoreConfig } from '@/lib/validations/store-config';

// Dynamic import for the wizard to reduce initial bundle
const StoreSetupWizard = dynamic(
  () => import('@/components/admin/store-settings/StoreSetupWizard'),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white p-8 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8b7355] border-t-transparent" />
            <span className="text-sm text-neutral-600">Cargando configuración...</span>
          </div>
        </div>
      </div>
    ),
  }
);

function StoreWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');

  const [loading, setLoading] = useState(true);
  const [initialConfig, setInitialConfig] = useState<Partial<StoreConfig> | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        const result = await loadStoreConfig(eventId);
        if (result.success && result.config) {
          setInitialConfig(result.config);
        }
      } catch (err) {
        console.error('Error loading config:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, [eventId]);

  const handleComplete = async (config: StoreConfig) => {
    if (!eventId) {
      setError('No se especificó el evento');
      return;
    }

    try {
      const result = await saveStoreConfigAction(eventId, config);
      if (result.success) {
        // Navigate back to event page with success message
        router.push(`/admin/events/${eventId}?store_configured=true`);
      } else {
        setError(result.error || 'Error guardando configuración');
      }
    } catch (err) {
      console.error('Error saving config:', err);
      setError('Error guardando configuración');
    }
  };

  const handleCancel = () => {
    if (eventId) {
      router.push(`/admin/events/${eventId}`);
    } else {
      router.push('/admin/events');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white p-8 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8b7355] border-t-transparent" />
            <span className="text-sm text-neutral-600">Cargando configuración...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white p-8 shadow-xl max-w-md text-center">
          <h2 className="text-lg font-medium text-neutral-900 mb-2">Error</h2>
          <p className="text-sm text-neutral-600 mb-4">
            No se especificó el evento para configurar la tienda.
          </p>
          <button
            onClick={() => router.push('/admin/events')}
            className="bg-[#8b7355] px-6 py-2 text-sm font-medium text-white hover:bg-[#7a6349]"
          >
            Ir a Eventos
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800 shadow-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}
      <StoreSetupWizard
        eventId={eventId}
        initialConfig={initialConfig}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </>
  );
}

export default function StoreWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-8 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8b7355] border-t-transparent" />
              <span className="text-sm text-neutral-600">Cargando...</span>
            </div>
          </div>
        </div>
      }
    >
      <StoreWizardContent />
    </Suspense>
  );
}

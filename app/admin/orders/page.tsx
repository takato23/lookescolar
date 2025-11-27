'use client';

import React from 'react';

// Lazy load the clean design version
const CleanOrdersPage = React.lazy(() => import('@/components/admin/orders/CleanOrdersPage'));

export default function OrdersPage() {
  return (
    <React.Suspense fallback={<OrdersLoadingState />}>
      <CleanOrdersPage />
    </React.Suspense>
  );
}

function OrdersLoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--clean-border)] border-t-[var(--clean-accent)] rounded-full animate-spin" />
        <p className="text-sm text-[var(--clean-text-muted)]">Cargando pedidos...</p>
      </div>
    </div>
  );
}

'use client';

import { useEffect, type ReactNode } from 'react';
import { useAdminLayout } from '@/components/admin/admin-layout-context';

interface OrdersLayoutProps {
  children: ReactNode;
}

export default function AdminOrdersLayout({ children }: OrdersLayoutProps) {
  const { setConfig, resetConfig } = useAdminLayout();

  useEffect(() => {
    setConfig({
      showHeader: true, // Mostrar el AdminHeader con perfil, tema, notificaciones
    });

    return () => {
      resetConfig();
    };
  }, [resetConfig, setConfig]);

  return <>{children}</>;
}

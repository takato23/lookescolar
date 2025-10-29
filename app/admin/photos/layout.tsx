'use client';

import { useEffect, type ReactNode } from 'react';
import { useAdminLayout } from '@/components/admin/admin-layout-context';
import { cn } from '@/lib/utils';

type PhotosLayoutProps = {
  children: ReactNode;
};

const IMMERSIVE_WRAPPER_CLASSES =
  'bg-slate-950 text-slate-100 antialiased';
const IMMERSIVE_CONTENT_CLASSES = 'bg-transparent';
const IMMERSIVE_MAIN_CLASSES = 'flex flex-col';

export default function AdminPhotosLayout({ children }: PhotosLayoutProps) {
  const { setVariant, resetConfig } = useAdminLayout();

  useEffect(() => {
    setVariant('immersive', {
      wrapperClassName: cn(
        IMMERSIVE_WRAPPER_CLASSES,
        'relative isolate'
      ),
      contentClassName: cn(
        'min-h-screen',
        IMMERSIVE_CONTENT_CLASSES
      ),
      mainClassName: cn('flex-1 overflow-hidden', IMMERSIVE_MAIN_CLASSES),
    });

    return () => {
      resetConfig();
    };
  }, [resetConfig, setVariant]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(98,226,162,0.14),_transparent_55%)]" />
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

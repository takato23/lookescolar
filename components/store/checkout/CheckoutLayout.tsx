'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface CheckoutLayoutProps {
  header: {
    badge?: string;
    title: string;
    subtitle?: string;
  };
  sidebar?: ReactNode;
  mobileSummary?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function CheckoutLayout({
  header,
  sidebar,
  mobileSummary,
  children,
  footer,
  className,
}: CheckoutLayoutProps) {
  return (
    <div className={cn('looke-store relative min-h-screen bg-background text-foreground', className)}>
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-primary/20 via-background to-transparent" />
        <div className="absolute -left-32 top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-24 top-32 h-64 w-64 rounded-full bg-accent/25 blur-[160px]" />
        <div className="absolute bottom-0 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-24 pt-20 sm:px-6 lg:px-10">
        <header className="space-y-4">
          {header.badge ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
              {header.badge}
            </span>
          ) : null}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {header.title}
            </h1>
            {header.subtitle ? (
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                {header.subtitle}
              </p>
            ) : null}
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px] md:items-start">
          <div className="flex flex-col gap-6">
            {children}
            {footer}
          </div>
          {sidebar ? <aside className="hidden md:block">{sidebar}</aside> : null}
        </div>

        {mobileSummary ? (
          <div className="md:hidden">{mobileSummary}</div>
        ) : null}
      </div>
    </div>
  );
}


'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Camera, Search, Bell, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AppShellCompactProps {
  children: ReactNode;
  title?: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  showSearch?: boolean;
  showNotifications?: boolean;
  actions?: ReactNode;
}

export default function AppShellCompact({
  children,
  title = 'LookEscolar',
  searchPlaceholder = 'Buscar...',
  onSearch,
  showSearch = false,
  showNotifications = false,
  actions,
}: AppShellCompactProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-pink-50/50 to-blue-50/50 dark:from-purple-950/20 dark:via-purple-900/10 dark:to-blue-950/20">
      {/* Compact Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            >
              <div className="rounded-lg bg-gradient-to-r from-primary to-secondary p-2 text-white">
                <Camera className="h-5 w-5" />
              </div>
              <span className="hidden font-semibold sm:block">{title}</span>
            </Link>

            {/* Context/Breadcrumb area */}
            <div className="hidden text-sm text-muted-foreground md:block">
              {title !== 'LookEscolar' && (
                <span className="text-foreground font-medium">{title}</span>
              )}
            </div>
          </div>

          {/* Center - Search */}
          {showSearch && (
            <div className="flex-1 max-w-md mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={searchPlaceholder}
                  className="pl-10 bg-background/50 border-border/50 focus:bg-background"
                  onChange={(e) => onSearch?.(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Custom Actions */}
            {actions}

            {/* Notifications */}
            {showNotifications && (
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
              </Button>
            )}

            {/* Settings */}
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>

            {/* User Menu */}
            <Button variant="ghost" size="sm">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        {children}
      </main>
    </div>
  );
}

// Utility components for common layouts
export function AdminShell({ children, ...props }: Omit<AppShellCompactProps, 'title'>) {
  return (
    <AppShellCompact
      title="Admin Panel"
      showSearch
      showNotifications
      searchPlaceholder="Buscar eventos, fotos..."
      {...props}
    >
      {children}
    </AppShellCompact>
  );
}

export function GalleryShell({ children, ...props }: Omit<AppShellCompactProps, 'title'>) {
  return (
    <AppShellCompact
      title="Galería"
      showSearch
      searchPlaceholder="Buscar fotos..."
      {...props}
    >
      {children}
    </AppShellCompact>
  );
}

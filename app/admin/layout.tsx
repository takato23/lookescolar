'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
// Clean Design - Pixieset-inspired (active design)
import CleanSidebar from '@/components/admin/CleanSidebar';
import CleanHeader from '@/components/admin/CleanHeader';
import LiquidGlassNav from '@/components/admin/LiquidGlassNav';
import { AdminFloatingNav } from '@/components/admin/AdminFloatingNav';
import {
  MobileNavigation,
  adminNavigationItems,
} from '@/components/ui/mobile-navigation';
import { MobileOptimizations } from '@/components/family/MobileOptimizations';
import {
  NotificationProvider,
  useRealTimeNotifications,
} from '@/components/ui/NotificationSystem';
import { KeyboardProvider } from '@/components/ui/KeyboardShortcuts';
import {
  AdminLayoutProvider,
  useAdminLayout,
} from '@/components/admin/admin-layout-context';
import { cn } from '@/lib/utils';
import '@/styles/admin-dark-mode-fixes.css';
import '@/styles/dashboard-animations.css';
import '@/styles/admin-contrast.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize dark mode on mount
  useEffect(() => {
    const applyDarkMode = () => {
      const storedTheme = localStorage.getItem('lookescolar-theme');
      const systemPrefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      const shouldBeDark =
        storedTheme === 'dark' ||
        storedTheme === 'night' ||
        (storedTheme === 'system' && systemPrefersDark);

      const html = document.documentElement;
      if (shouldBeDark) {
        html.classList.add('dark');
        html.setAttribute('data-theme', 'dark');
      } else {
        html.classList.remove('dark');
        html.setAttribute('data-theme', 'light');
      }
    };

    applyDarkMode();

    // Listen for theme changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'lookescolar-theme') applyDarkMode();
    };
    const handleMedia = () => applyDarkMode();

    window.addEventListener('storage', handleStorage);
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', handleMedia);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .removeEventListener('change', handleMedia);
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      // En desarrollo, usar usuario mock (verificamos si estamos en localhost)
      const isDevelopment =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1');

      if (isDevelopment) {
        const mockUser = {
          id: 'dev-user',
          email: 'admin@lookescolar.com',
          app_metadata: {},
          user_metadata: { name: 'Admin Dev' },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          role: 'admin',
        } as User;

        setUser(mockUser);
        setLoading(false);
        return;
      }

      // En producción, obtener usuario real
      try {
        const { authClient } = await import('@/lib/supabase/auth-client');
        const { user, error } = await authClient.getCurrentUser();

        if (error || !user) {
          // Si no hay usuario o hay error, redirigir al login
          router.replace('/login');
          return;
        }

        setUser(user);
        setLoading(false);
      } catch (err) {
        console.error('Error al verificar autenticación:', err);
        // En caso de error, usar mock en desarrollo
        if (isDevelopment) {
          const mockUser = {
            id: 'dev-user',
            email: 'admin@lookescolar.com',
            app_metadata: {},
            user_metadata: { name: 'Admin Dev' },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            role: 'admin',
          } as User;
          setUser(mockUser);
          setLoading(false);
        } else {
          router.replace('/login');
        }
      }
    };

    initAuth();

    // Escuchar cambios en el estado de autenticación (solo en producción)
    const isDevelopment =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1');

    if (!isDevelopment) {
      let subscription: { unsubscribe: () => void } | undefined;
      (async () => {
        try {
          const { authClient } = await import('@/lib/supabase/auth-client');
          const result = authClient.onAuthStateChange((nextUser) => {
            if (!nextUser) {
              router.replace('/login');
            } else {
              setUser(nextUser);
            }
          });
          subscription = result.data.subscription;
        } catch (err) {
          console.error('Error al suscribirse a cambios de auth:', err);
        }
      })();

      return () => {
        subscription?.unsubscribe();
      };
    }
    return undefined;
  }, [router]);

  if (loading) {
    return (
      <div className="liquid-glass-app flex min-h-screen items-center justify-center">
        <div className="liquid-card animate-scale-in p-8">
          <div className="flex items-center space-x-4">
            <div className="spinner-glass"></div>
            <span className="liquid-nav-text text-lg font-medium">
              Verificando autenticacion...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay usuario después de cargar, no renderizar el layout
  // El useEffect ya se encargará de la redirección
  if (!user) {
    return null;
  }

  return (
    <NotificationProvider>
      <AdminLayoutProvider>
        <KeyboardProvider>
          <AdminLayoutContent user={user}>{children}</AdminLayoutContent>
        </KeyboardProvider>
      </AdminLayoutProvider>
    </NotificationProvider>
  );
}

function AdminLayoutContent({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User;
}) {
  // Initialize real-time notifications
  useRealTimeNotifications();
  const { config } = useAdminLayout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Active design system (Clean design is the only active one)
  const USE_CLEAN_DESIGN = true; // Light mode Pixieset-inspired

  const isImmersive = config.variant === 'immersive';

  // Wrapper class based on active design system
  const wrapperClassName = USE_CLEAN_DESIGN
    ? cn('clean-app min-h-screen', config.wrapperClassName)
    : cn(
        'liquid-glass-app min-h-screen bg-[#050505] text-slate-100 antialiased relative isolate',
        config.wrapperClassName
      );

  const renderFloatingNav = () => {
    if (!config.showFloatingNav) return null;
    return (
      <div
        className={cn(
          'sticky top-6 z-30 mb-6 px-4 sm:px-6 lg:px-10 xl:px-16',
          config.floatingNavWrapperClassName
        )}
      >
        <AdminFloatingNav />
      </div>
    );
  };

  return (
    <MobileOptimizations>
      <div className={wrapperClassName}>
        {/* Background effects - only for dark modes */}
        {!USE_CLEAN_DESIGN && (
          <>
            {/* Background Texture */}
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-20"
              style={{
                backgroundImage: "url('/images/background-texture.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />

            {/* Cinematic Gradient Overlay */}
            <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_rgba(68,170,255,0.08),_transparent_50%)]" />
            <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,_rgba(212,175,55,0.05),_transparent_50%)]" />
          </>
        )}

        {config.showMobileNav && !USE_CLEAN_DESIGN && (
          <MobileNavigation
            items={adminNavigationItems}
            user={
              user && user.email
                ? {
                    name: user.email.split('@')[0],
                    email: user.email,
                  }
                : null
            }
            onLogout={async () => {
              const { authClient } = await import('@/lib/supabase/auth-client');
              await authClient.logout();
              window.location.href = '/login';
            }}
            className="lg:hidden"
          />
        )}

        {isImmersive ? (
          <div
            className={cn(
              'relative flex min-h-screen flex-col',
              config.contentClassName
            )}
          >
            {renderFloatingNav()}
            <main
              className={cn('flex-1 overflow-hidden', config.mainClassName)}
            >
              {children}
            </main>
          </div>
        ) : USE_CLEAN_DESIGN ? (
          /* Clean Design - Pixieset-inspired Light Mode */
          <div className="clean-layout">
            {/* Clean Sidebar - Hidden on mobile, visible on desktop */}
            <CleanSidebar
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content Area */}
            <div className="clean-main">
              {/* Clean Header - Simplified on mobile */}
              <CleanHeader
                user={user}
                onMobileMenuToggle={() =>
                  setIsMobileMenuOpen(!isMobileMenuOpen)
                }
              />

              {/* Page Content */}
              <main className="flex-1 overflow-x-hidden">
                <div
                  className={cn(
                    'clean-content',
                    (pathname === '/admin' ||
                      pathname.startsWith('/admin/dashboard-pro')) &&
                      'clean-content--dashboard'
                  )}
                >
                  {children}
                </div>
              </main>
            </div>

            {/* Liquid Glass Floating Navigation */}
            <LiquidGlassNav />
          </div>
        ) : (
          /* Original Layout */
          <div className={cn('relative flex', config.contentClassName)}>
            {/* Desktop Sidebar */}
            {config.showSidebar && (
              <div className="hidden lg:block">
                <AdminSidebar isMobileOpen={false} onMobileToggle={() => {}} />
              </div>
            )}

            {/* Main Content */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Desktop Header */}
              {config.showHeader && (
                <div className="hidden lg:block">
                  <AdminHeader user={user} onMobileMenuToggle={() => {}} />
                </div>
              )}

              {renderFloatingNav()}

              {/* Page Content - Adjusted for mobile navigation */}
              <main
                className={cn(
                  'min-h-screen flex-1 overflow-x-hidden',
                  config.mainClassName
                )}
              >
                {config.showMobileNav ? (
                  <>
                    <div className="min-h-screen overflow-y-auto px-2 pb-20 pt-14 lg:hidden">
                      {children}
                    </div>

                    <div className="hidden lg:block">{children}</div>
                  </>
                ) : (
                  <div className="h-full">{children}</div>
                )}
              </main>
            </div>
          </div>
        )}
      </div>
    </MobileOptimizations>
  );
}

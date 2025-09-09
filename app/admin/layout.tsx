'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
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
import '@/styles/admin-dark-mode-fixes.css';
import Script from 'next/script';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

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
      <KeyboardProvider>
        {/* Force dark mode application script */}
        <Script 
          src="/scripts/force-dark-mode.js" 
          strategy="afterInteractive"
          priority={true}
        />
        <AdminLayoutContent user={user}>{children}</AdminLayoutContent>
      </KeyboardProvider>
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

  return (
    <MobileOptimizations>
      <div className="liquid-glass-app min-h-screen">
        {/* Mobile Navigation */}
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

        <div className="relative flex">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <AdminSidebar isMobileOpen={false} onMobileToggle={() => {}} />
          </div>

          {/* Main Content */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Desktop Header */}
            <div className="hidden lg:block">
              <AdminHeader user={user} onMobileMenuToggle={() => {}} />
            </div>

            {/* Page Content - Adjusted for mobile navigation */}
            <main className="min-h-screen flex-1 overflow-x-hidden">
              {/* Mobile content with proper spacing */}
              <div className="min-h-screen overflow-y-auto px-2 pb-20 pt-14 lg:hidden">
                {children}
              </div>

              {/* Desktop content */}
              <div className="hidden lg:block">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </MobileOptimizations>
  );
}

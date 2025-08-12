'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';

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
      <div className="gradient-mesh flex min-h-screen items-center justify-center">
        <div className="glass-card animate-scale-in p-8">
          <div className="flex items-center space-x-4">
            <div className="spinner-glass"></div>
            <span className="text-foreground text-lg font-medium">
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
    <div className="gradient-mesh-dark dark:gradient-mesh min-h-screen">
      <div className="relative flex">
        {/* Sidebar - Now responsive */}
        <AdminSidebar
          isMobileOpen={isMobileMenuOpen}
          onMobileToggle={toggleMobileMenu}
        />

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header - With mobile menu button */}
          <AdminHeader user={user} onMobileMenuToggle={toggleMobileMenu} />

          {/* Page Content - Add padding for mobile */}
          <main className="flex-1 overflow-x-hidden">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

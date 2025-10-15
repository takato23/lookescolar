import { ReactNode, Suspense } from 'react';
import { FamilyHeader } from '@/components/family/FamilyHeader';
import { FamilyNavigation } from '@/components/family/FamilyNavigation';
import { MobileNavigation } from '@/components/ui/mobile-navigation';
import { familyNavigationItems } from '@/components/ui/navigation-items';
import { MobileOptimizations } from '@/components/family/MobileOptimizations';

interface FamilyLayoutProps {
  children: ReactNode;
  params: { token: string };
}

export default async function FamilyLayout({
  children,
  params,
}: FamilyLayoutProps) {
  const { token } = params;
  // Navegación móvil con items parametrizados por token
  const baseItems = Array.isArray(familyNavigationItems)
    ? familyNavigationItems
    : [];
  const navigationItems = baseItems.map((item) => ({
    ...item,
    href: item.href.replace('/f', `/f/${token}`),
  }));

  return (
    <MobileOptimizations>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        {/* Background pattern */}
        <div className="fixed inset-0 opacity-30">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,_white,_rgba(255,255,255,0))]" />
        </div>

        {/* Mobile Navigation */}
        <MobileNavigation items={navigationItems} className="lg:hidden" />

        {/* Desktop Header with subject info */}
        <div className="hidden lg:block">
          <Suspense fallback={<FamilyHeaderSkeleton />}>
            <FamilyHeader token={token} />
          </Suspense>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:block">
          <Suspense fallback={<div className="h-16" />}>
            <FamilyNavigation token={token} />
          </Suspense>
        </div>

        {/* Main content - Adjusted for mobile navigation */}
        <main className="relative z-10 mx-auto max-w-6xl px-4 py-6 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-6 lg:pt-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="relative z-10 mt-16 border-t border-purple-200 bg-white/50 py-8 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl px-6">
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
                <a
                  href="mailto:contacto@lookescolar.com"
                  className="transition-colors hover:text-purple-600"
                >
                  📧 Contacto
                </a>
                <a
                  href="tel:+541234567890"
                  className="transition-colors hover:text-purple-600"
                >
                  📞 Soporte
                </a>
                <a
                  href="/ayuda"
                  className="transition-colors hover:text-purple-600"
                >
                  ❓ Ayuda
                </a>
              </div>
              <p className="text-sm text-gray-600">
                © 2024 LookEscolar - Fotografía Escolar Digital
              </p>
              <p className="text-xs text-gray-500">
                Tus fotos están protegidas con acceso seguro mediante token
                único
              </p>
            </div>
          </div>
        </footer>
      </div>
    </MobileOptimizations>
  );
}

// Skeleton para el header mientras carga
function FamilyHeaderSkeleton() {
  return (
    <header className="relative z-10 border-b border-purple-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <span className="text-xl text-white">📸</span>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-2xl font-bold text-transparent">
                LookEscolar
              </h1>
              <div className="mt-1 h-4 w-32 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
          <div className="text-right">
            <div className="mb-1 h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </header>
  );
}

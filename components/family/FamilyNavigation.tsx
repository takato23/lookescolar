import { familyService } from '@/lib/services/family.service';

interface FamilyNavigationProps {
  token: string;
}

export async function FamilyNavigation({ token }: FamilyNavigationProps) {
  const subject = await familyService.validateToken(token);

  if (!subject) {
    return null;
  }

  // Obtener pedido activo para mostrar estado
  const activeOrder = await familyService.getActiveOrder(subject.id);

  return (
    <nav className="relative z-10 border-b border-purple-100 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <a
              href={`/f/${token}`}
              className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100 hover:text-purple-900"
            >
              <span>🏠</span>
              <span>Inicio</span>
            </a>
            <a
              href={`/f/${token}#gallery`}
              className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-purple-50 hover:text-purple-700"
            >
              <span>📸</span>
              <span>Galería</span>
            </a>
            <a
              href={`/f/${token}#cart`}
              className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-purple-50 hover:text-purple-700"
            >
              <span>🛒</span>
              <span>Carrito</span>
            </a>
          </div>

          <div className="flex items-center space-x-4">
            {activeOrder && (
              <div className="hidden items-center space-x-2 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800 sm:flex">
                <span>📋</span>
                <span className="font-medium">
                  Pedido{' '}
                  {activeOrder.status === 'pending'
                    ? 'Pendiente'
                    : activeOrder.status === 'processing'
                      ? 'Procesando'
                      : activeOrder.status === 'paid'
                        ? 'Pagado'
                        : 'Activo'}
                </span>
              </div>
            )}

            <div className="hidden text-xs text-gray-500 sm:block">
              Token: {token.slice(0, 4)}...{token.slice(-4)}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

import { familyService } from '@/lib/services/family.service';

interface OrderStatusProps {
  token: string;
}

export async function OrderStatus({ token }: OrderStatusProps) {
  const subject = await familyService.validateToken(token);
  if (!subject) return null;

  const activeOrder = await familyService.getActiveOrder(subject.id);
  if (!activeOrder) return null;

  const statusConfig = {
    pending: {
      color: 'yellow',
      icon: '⏳',
      title: 'Pedido Pendiente',
      description: 'Tu pedido está siendo procesado',
    },
    processing: {
      color: 'blue',
      icon: '🔄',
      title: 'Procesando Pago',
      description: 'Verificando tu pago con Mercado Pago',
    },
    paid: {
      color: 'green',
      icon: '✅',
      title: 'Pagado - Listo para Retirar',
      description: 'Tu pedido está listo. Puedes retirar las fotos originales',
    },
    delivered: {
      color: 'gray',
      icon: '📦',
      title: 'Entregado',
      description: 'Pedido completado exitosamente',
    },
  };

  const config =
    statusConfig[activeOrder.status as keyof typeof statusConfig] ||
    statusConfig.pending;

  return (
    <div
      className={`bg-${config.color}-50 border border-${config.color}-200 rounded-2xl p-6 shadow-sm`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div
            className={`h-12 w-12 bg-${config.color}-100 flex items-center justify-center rounded-full`}
          >
            <span className="text-2xl">{config.icon}</span>
          </div>
          <div>
            <h3 className={`text-lg font-semibold text-${config.color}-800`}>
              {config.title}
            </h3>
            <p className={`text-${config.color}-700 text-sm`}>
              {config.description}
            </p>
            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-600">
              <span>Pedido #{activeOrder.id.slice(0, 8)}</span>
              <span>•</span>
              <span>
                {new Date(activeOrder.created_at).toLocaleDateString('es-AR')}
              </span>
              <span>•</span>
              <span className="font-semibold">
                ${activeOrder.total_amount.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}
          >
            {config.title}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {activeOrder.items.length} foto
            {activeOrder.items.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {activeOrder.status === 'paid' && (
        <div className="mt-4 rounded-lg bg-green-100 p-4">
          <div className="flex items-center space-x-2 text-green-800">
            <span>🎉</span>
            <span className="font-semibold">¡Pago confirmado!</span>
          </div>
          <p className="mt-1 text-sm text-green-700">
            Tus fotos están listas para retirar. Te contactaremos para coordinar
            la entrega de las fotos originales sin marca de agua.
          </p>
        </div>
      )}

      {activeOrder.status === 'processing' && (
        <div className="mt-4 rounded-lg bg-blue-100 dark:bg-blue-950/30 p-4">
          <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
            <span>ℹ️</span>
            <span className="font-semibold">Verificando pago...</span>
          </div>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
            Estamos verificando tu pago con Mercado Pago. Esto puede tomar unos
            minutos.
          </p>
        </div>
      )}
    </div>
  );
}

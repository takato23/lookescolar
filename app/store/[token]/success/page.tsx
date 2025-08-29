import { redirect } from 'next/navigation';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

interface SuccessPageProps {
  params: { token: string };
  searchParams: { order_id?: string };
}

export default async function SuccessPage({
  params,
  searchParams,
}: SuccessPageProps) {
  const { token } = params;
  const { order_id } = searchParams;

  // Si no hay order_id, mostrar página genérica (para validación de MercadoPago)
  if (!order_id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-8 text-center shadow-2xl">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            Página de Éxito
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            Esta página es para validación de MercadoPago
          </p>
          <a
            href={`/store/${token}`}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            Volver a la tienda
          </a>
        </div>
      </div>
    );
  }

  const supabase = await createServerSupabaseServiceClient();

  // Obtener información de la orden
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', order_id)
    .single();

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-8 text-center shadow-2xl">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            Orden no encontrada
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            La orden especificada no existe
          </p>
          <a
            href={`/store/${token}`}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            Volver a la tienda
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 text-center shadow-2xl">
        {/* Icono de éxito */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-12 w-12 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Título */}
        <h1 className="mb-4 text-3xl font-bold text-gray-900">
          ¡Pago Exitoso! 🎉
        </h1>

        {/* Mensaje */}
        <p className="mb-8 text-lg text-gray-600">
          Tu orden ha sido procesada correctamente. Te enviaremos un email con
          los detalles de envío.
        </p>

        {/* Detalles de la orden */}
        <div className="mb-8 rounded-xl bg-gray-50 p-6 text-left">
          <h3 className="mb-4 font-semibold text-gray-900">
            Detalles de tu orden:
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium">Número de orden:</span>{' '}
              {order.order_number}
            </p>
            <p>
              <span className="font-medium">Total:</span> $
              {(order.total_amount / 100).toLocaleString('es-AR')}
            </p>
            <p>
              <span className="font-medium">Estado:</span>
              <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                {order.status === 'pending'
                  ? 'Pendiente de confirmación'
                  : order.status}
              </span>
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <a
            href={`/store/${token}`}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            Volver a la tienda
          </a>
          <a
            href="/"
            className="rounded-lg bg-gray-200 px-6 py-3 text-gray-800 transition-colors hover:bg-gray-300"
          >
            Ir al inicio
          </a>
        </div>

        {/* Información adicional */}
        <div className="mt-8 text-sm text-gray-500">
          <p>
            Recibirás un email de confirmación en:{' '}
            <strong>{order.contact_email}</strong>
          </p>
          <p className="mt-2">
            ¿Tienes alguna pregunta? Contacta a soporte@lookescolar.com
          </p>
        </div>
      </div>
    </div>
  );
}

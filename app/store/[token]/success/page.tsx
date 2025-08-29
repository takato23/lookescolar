import { redirect } from 'next/navigation';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

interface SuccessPageProps {
  params: { token: string };
  searchParams: { order_id?: string };
}

export default async function SuccessPage({ params, searchParams }: SuccessPageProps) {
  const { token } = params;
  const { order_id } = searchParams;

  // Si no hay order_id, mostrar página genérica (para validación de MercadoPago)
  if (!order_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Página de Éxito</h1>
          <p className="text-lg text-gray-600 mb-8">Esta página es para validación de MercadoPago</p>
          <a href={`/store/${token}`} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Orden no encontrada</h1>
          <p className="text-lg text-gray-600 mb-8">La orden especificada no existe</p>
          <a href={`/store/${token}`} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Volver a la tienda
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        {/* Icono de éxito */}
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          ¡Pago Exitoso! 🎉
        </h1>

        {/* Mensaje */}
        <p className="text-lg text-gray-600 mb-8">
          Tu orden ha sido procesada correctamente. Te enviaremos un email con los detalles de envío.
        </p>

        {/* Detalles de la orden */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
          <h3 className="font-semibold text-gray-900 mb-4">Detalles de tu orden:</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p><span className="font-medium">Número de orden:</span> {order.order_number}</p>
            <p><span className="font-medium">Total:</span> ${(order.total_amount / 100).toLocaleString('es-AR')}</p>
            <p><span className="font-medium">Estado:</span> 
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                {order.status === 'pending' ? 'Pendiente de confirmación' : order.status}
              </span>
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={`/store/${token}`}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver a la tienda
          </a>
          <a
            href="/"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Ir al inicio
          </a>
        </div>

        {/* Información adicional */}
        <div className="mt-8 text-sm text-gray-500">
          <p>Recibirás un email de confirmación en: <strong>{order.contact_email}</strong></p>
          <p className="mt-2">¿Tienes alguna pregunta? Contacta a soporte@lookescolar.com</p>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';

export default async function SharePaymentSuccess({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <h1 className="text-xl font-semibold text-green-800">¡Pago aprobado!</h1>
        <p className="mt-2 text-sm text-green-700">
          Gracias por tu compra. Estamos procesando tu pedido.
        </p>
        <div className="mt-4">
          <Link href={`/share/${token}`} className="text-green-800 underline">
            Volver a la galería
          </Link>
        </div>
      </div>
    </div>
  );
}

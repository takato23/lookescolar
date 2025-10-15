import Link from 'next/link';

export default async function SharePaymentFailure({ params }: { params: { token: string } }) {
  const { token } = params;
  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-semibold text-red-800">Pago rechazado</h1>
        <p className="mt-2 text-sm text-red-700">
          No se pudo completar el pago. Intenta nuevamente o usa otro medio.
        </p>
        <div className="mt-4 flex gap-4">
          <Link href={`/share/${token}/store`} className="text-red-800 underline">
            Volver al checkout
          </Link>
          <Link href={`/share/${token}`} className="text-red-800 underline">
            Ver galería
          </Link>
        </div>
      </div>
    </div>
  );
}

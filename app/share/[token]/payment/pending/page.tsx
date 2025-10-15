import Link from 'next/link';

export default async function SharePaymentPending({ params }: { params: { token: string } }) {
  const { token } = params;
  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
        <h1 className="text-xl font-semibold text-yellow-800">Pago pendiente</h1>
        <p className="mt-2 text-sm text-yellow-700">
          Tu pago está en proceso. Te avisaremos cuando se confirme.
        </p>
        <div className="mt-4 flex gap-4">
          <Link href={`/share/${token}`} className="text-yellow-800 underline">
            Volver a la galería
          </Link>
          <Link href={`/share/${token}/store`} className="text-yellow-800 underline">
            Ir a la tienda
          </Link>
        </div>
      </div>
    </div>
  );
}

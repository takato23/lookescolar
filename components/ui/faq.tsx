export function StoreFAQ({ className = '' }: { className?: string }) {
  const qa = [
    {
      q: '¿Cómo recibo mis fotos?',
      a: 'Imprimimos tu álbum y lo enviamos al domicilio indicado. Si elegiste descargas digitales, recibirás un correo con el enlace seguro.',
    },
    {
      q: '¿Cuánto tarda el envío?',
      a: 'Producción 2–3 días hábiles, envío 1–2 días hábiles. Te notificamos por email con el seguimiento.',
    },
    {
      q: '¿Puedo cambiar mis fotos?',
      a: 'Podés solicitar cambios dentro de las 12 horas posteriores a la compra respondiendo al email de confirmación.',
    },
    {
      q: '¿Es seguro el pago?',
      a: 'Sí. Usamos Mercado Pago y canales cifrados. No almacenamos los datos de tu tarjeta.',
    },
  ];
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 ${className}`}>
      <h3 className="text-base font-semibold mb-3">Preguntas frecuentes</h3>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        {qa.map((item) => (
          <div key={item.q} className="rounded-md border p-3">
            <p className="font-medium">{item.q}</p>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}


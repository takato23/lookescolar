import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Camera } from 'lucide-react';

export function FooterCTA() {
  return (
    <section className="relative bg-gradient-to-r from-primary-500 to-secondary-500 px-6 py-32">
      <div className="mx-auto max-w-4xl text-center text-white">
        <div className="mb-8">
          <Camera className="mx-auto mb-6 h-16 w-16 opacity-90" />
          <h2 className="mb-6 text-4xl font-bold lg:text-6xl">
            ¿Listo para <span className="text-yellow-300">empezar?</span>
          </h2>
          <p className="mx-auto max-w-2xl text-xl opacity-90">
            Únete a miles de fotógrafos que ya transformaron su negocio con
            LookEscolar. Comienza gratis hoy mismo.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/admin">
            <Button
              size="lg"
              variant="secondary"
              className="rounded-2xl bg-white px-8 py-4 text-primary-600 shadow-lg hover:bg-gray-100"
            >
              <Camera className="mr-2 h-5 w-5" />
              Empezar Gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>

          <Link href="#demo">
            <Button
              size="lg"
              variant="ghost"
              className="rounded-2xl border-white px-8 py-4 text-white hover:bg-white/10"
            >
              Ver Demo
            </Button>
          </Link>
        </div>

        <div className="mt-12 border-t border-white/20 pt-8">
          <p className="text-sm opacity-75">
            Sin compromiso • Cancelación gratuita • Soporte incluido
          </p>
        </div>
      </div>
    </section>
  );
}

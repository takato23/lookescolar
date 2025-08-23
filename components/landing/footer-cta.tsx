import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Camera } from 'lucide-react';

export function FooterCTA() {
  return (
    <section className="relative px-6 py-32 bg-gradient-to-r from-primary-500 to-secondary-500">
      <div className="mx-auto max-w-4xl text-center text-white">
        <div className="mb-8">
          <Camera className="h-16 w-16 mx-auto mb-6 opacity-90" />
          <h2 className="mb-6 text-4xl font-bold lg:text-6xl">
            ¿Listo para <span className="text-yellow-300">empezar?</span>
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Únete a miles de fotógrafos que ya transformaron su negocio con LookEscolar. 
            Comienza gratis hoy mismo.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/admin">
            <Button 
              size="lg" 
              variant="secondary"
              className="bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 rounded-2xl shadow-lg"
            >
              <Camera className="h-5 w-5 mr-2" />
              Empezar Gratis
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
          
          <Link href="#demo">
            <Button 
              size="lg" 
              variant="ghost"
              className="text-white border-white hover:bg-white/10 px-8 py-4 rounded-2xl"
            >
              Ver Demo
            </Button>
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-white/20">
          <p className="text-sm opacity-75">
            Sin compromiso • Cancelación gratuita • Soporte incluido
          </p>
        </div>
      </div>
    </section>
  );
}
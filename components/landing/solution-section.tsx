import { PLACEHOLDER_IMAGES } from '@/lib/config/placeholder-images';

export function SolutionSection() {
  return (
    <section className="relative bg-gradient-to-r from-primary-500/5 to-secondary-500/5 px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="mb-6 text-4xl font-bold lg:text-6xl">
            Nuestra <span className="text-gradient">solución</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mx-auto max-w-3xl text-xl">
            Una plataforma segura, rápida y profesional diseñada específicamente
            para fotógrafos escolares.
          </p>
        </div>

        {/* Product Mockups Grid */}
        <div className="grid gap-8 md:grid-cols-3 mt-12">
          <div className="group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <img
              src={PLACEHOLDER_IMAGES.mockups.printPackage}
              alt="Paquetes de impresión"
              className="w-full h-64 object-cover"
            />
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">Paquetes Personalizados</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Creá tus propios paquetes de fotos con diferentes tamaños y precios.
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <img
              src={PLACEHOLDER_IMAGES.mockups.schoolFolderOpen}
              alt="Carpetas escolares"
              className="w-full h-64 object-cover"
            />
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">Carpetas Escolares</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Ofrecé el clásico producto escolar con foto individual y grupal.
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <img
              src={PLACEHOLDER_IMAGES.mockups.framedPhoto}
              alt="Fotos enmarcadas"
              className="w-full h-64 object-cover"
            />
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">Productos Premium</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Vendé fotos enmarcadas, lienzos y productos de alto valor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

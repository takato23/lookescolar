'use client';

export function MockAdmin() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header provisional */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎨 Mockups Admin - LookEscolar
          </h1>
          <p className="text-gray-600">
            Playground para nuevas interfaces de UI. Ruta segura sin afectar producción.
          </p>
        </div>

        {/* Placeholder para el componente real */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Sandbox Listo
            </h2>
            <p className="text-gray-600 mb-6">
              Ahora puedes pegar aquí el componente del canvas de LookEscolar
            </p>
            <div className="bg-green-100 border border-green-300 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                ✅ Ruta configurada: /admin/mockups
              </p>
              <p className="text-green-700 text-sm mt-1">
                ✅ Directorio _mockups creado
              </p>
              <p className="text-green-700 text-sm mt-1">
                ✅ Componente MockAdmin.tsx listo para reemplazar
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

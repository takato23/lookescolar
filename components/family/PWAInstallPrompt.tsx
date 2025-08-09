'use client';

import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, installPWA } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Verificar si ya fue descartado en esta sesión
  useEffect(() => {
    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);

    try {
      const success = await installPWA();
      if (success) {
        setIsDismissed(true);
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // No mostrar si no es instalable, ya está instalado, o fue descartado
  if (!isInstallable || isInstalled || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:bottom-6 md:left-6 md:right-auto md:max-w-sm">
      <div className="overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-xl backdrop-blur-sm">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3">
          <div className="flex items-center">
            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <span className="text-xl">📱</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Instalar LookEscolar</h3>
              <p className="text-sm text-purple-100">
                Acceso rápido desde tu pantalla de inicio
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-4 space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <svg
                className="mr-2 h-4 w-4 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Acceso offline a tus fotos</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <svg
                className="mr-2 h-4 w-4 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Notificaciones de nuevas fotos</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <svg
                className="mr-2 h-4 w-4 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Experiencia como app nativa</span>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isInstalling ? (
                <div className="flex items-center justify-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Instalando...
                </div>
              ) : (
                <>
                  <svg
                    className="mr-2 inline h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Instalar
                </>
              )}
            </button>

            <button
              onClick={handleDismiss}
              className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              Ahora no
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-gray-500">
            No guardamos datos personales en tu dispositivo
          </p>
        </div>
      </div>
    </div>
  );
}

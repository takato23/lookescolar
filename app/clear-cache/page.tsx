'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ClearCachePage() {
  const [cleared, setCleared] = useState(false);
  const [status, setStatus] = useState<string[]>([]);

  useEffect(() => {
    const clearAll = async () => {
      const newStatus: string[] = [];

      // Limpiar Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          const success = await registration.unregister();
          if (success) {
            newStatus.push(
              `✅ Service Worker eliminado: ${registration.scope}`
            );
          }
        }

        if (registrations.length === 0) {
          newStatus.push('ℹ️ No hay Service Workers registrados');
        }
      }

      // Limpiar Cache Storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
          newStatus.push(`✅ Cache eliminado: ${name}`);
        }

        if (cacheNames.length === 0) {
          newStatus.push('ℹ️ No hay caches almacenados');
        }
      }

      // Limpiar localStorage
      if (typeof window !== 'undefined') {
        const localStorageSize = localStorage.length;
        localStorage.clear();
        if (localStorageSize > 0) {
          newStatus.push(
            `✅ LocalStorage limpiado (${localStorageSize} items)`
          );
        } else {
          newStatus.push('ℹ️ LocalStorage ya estaba vacío');
        }
      }

      // Limpiar sessionStorage
      if (typeof window !== 'undefined') {
        const sessionStorageSize = sessionStorage.length;
        sessionStorage.clear();
        if (sessionStorageSize > 0) {
          newStatus.push(
            `✅ SessionStorage limpiado (${sessionStorageSize} items)`
          );
        } else {
          newStatus.push('ℹ️ SessionStorage ya estaba vacío');
        }
      }

      setStatus(newStatus);
      setCleared(true);
    };

    clearAll();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="mb-6 text-3xl font-bold text-white">
          🧹 Limpieza de Cache y Service Workers
        </h1>

        <div className="mb-6 space-y-2">
          {status.map((msg, index) => (
            <div key={index} className="font-mono text-sm text-white/80">
              {msg}
            </div>
          ))}
        </div>

        {cleared && (
          <div className="mb-6 rounded-xl border border-green-500/50 bg-green-500/20 p-4">
            <p className="text-green-200">
              ✨ Limpieza completa! Tu navegador está limpio de Service Workers
              y caches antiguos.
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <Link
            href="/"
            className="transform rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
          >
            Ir al Inicio
          </Link>

          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-white/10 px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-white/20"
          >
            Recargar Página
          </button>
        </div>

        <div className="mt-8 rounded-xl bg-white/5 p-4">
          <h2 className="mb-2 font-semibold text-white">
            💡 Tip para desarrolladores:
          </h2>
          <p className="mb-2 text-sm text-white/70">
            Si estás desarrollando múltiples apps en localhost, usa diferentes
            puertos para cada una:
          </p>
          <ul className="space-y-1 text-sm text-white/60">
            <li>• App 1: localhost:3000</li>
            <li>• App 2: localhost:3001</li>
            <li>• App 3: localhost:3002</li>
          </ul>
          <p className="mt-2 text-sm text-white/70">
            O usa el modo incógnito mientras desarrollas para evitar conflictos
            de cache.
          </p>
        </div>
      </div>
    </div>
  );
}

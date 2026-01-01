'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function QuickSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [eventId, setEventId] = useState('');
  const [tokens, setTokens] = useState<Array<{ name: string; token: string }>>(
    []
  );
  const [message, setMessage] = useState('');

  const createTestData = async () => {
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/quick-setup', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setMessage('Error: ' + (json.error || 'No se pudo crear datos'));
        return;
      }
      setEventId(json.event.id);
      setTokens(
        json.subjects.map((s: any) => ({ name: s.name, token: s.token }))
      );
      setMessage(
        `✅ Evento creado: ${json.event.name}\n✅ ${json.subjects.length} invitados creados con tokens`
      );
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold text-foreground">
          🚀 Setup Rápido - Sistema de Fotografía
        </h1>

        <div className="rounded-xl bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-2xl font-semibold text-foreground">
            Crear Datos de Prueba
          </h2>

          <p className="mb-6 text-gray-500 dark:text-gray-400">
            Este botón creará automáticamente:
          </p>
          <ul className="mb-6 list-inside list-disc space-y-2 text-gray-500 dark:text-gray-400">
            <li>1 Evento: "Graduación 2024"</li>
            <li>4 Invitados con sus tokens únicos</li>
            <li>Todo listo para empezar a subir fotos</li>
          </ul>

          <button
            onClick={createTestData}
            disabled={loading}
            aria-label="Crear evento e invitados de prueba"
            className="mb-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Evento e Invitados de Prueba'}
          </button>

          {message && (
            <div className="mb-6 whitespace-pre-line rounded-lg bg-green-50 p-4 text-green-800">
              {message}
            </div>
          )}

          {eventId && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-6">
              <h3 className="mb-4 text-lg font-semibold text-blue-900">
                ✅ Evento Creado - ID: {eventId}
              </h3>

              <div className="mb-4">
                <p className="mb-2 font-semibold text-foreground">
                  Ahora puedes:
                </p>
                <div className="space-y-2">
                  <a
                    href="/admin/photos"
                    aria-label="Ir a Subir Fotos"
                    className="block rounded-lg bg-purple-600 px-4 py-2 text-center font-semibold text-white transition hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
                  >
                    📸 Ir a Subir Fotos
                  </a>
                </div>
              </div>
            </div>
          )}

          {tokens.length > 0 && (
            <div className="mt-6 rounded-lg bg-yellow-50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-yellow-900">
                🔑 Tokens de Acceso para Clientes
              </h3>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Guarda estos enlaces. Cada cliente accede con su link único:
              </p>
              <div className="space-y-3">
                {tokens.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-yellow-200 bg-white p-4"
                  >
                    <p className="mb-2 font-semibold text-foreground">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`http://localhost:3000/store-unified/${item.token}`}
                        className="flex-1 rounded border bg-muted p-2 text-sm"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `http://localhost:3000/store-unified/${item.token}`
                          );
                          alert('Copiado!');
                        }}
                        aria-label={`Copiar enlace de ${item.name}`}
                        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                      >
                        Copiar
                      </button>
                      <a
                        href={`/store-unified/${item.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Abrir enlace de ${item.name}`}
                        className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
                      >
                        Abrir
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-xl bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-2xl font-semibold text-foreground">
            📋 Instrucciones Paso a Paso
          </h2>

          <ol className="list-inside list-decimal space-y-4 text-gray-500 dark:text-gray-400">
            <li>
              <strong>Crear Datos:</strong> Click en el botón "Crear Evento e
              Invitados de Prueba"
            </li>
            <li>
              <strong>Subir Fotos:</strong> Ve a "Ir a Subir Fotos" y sube
              algunas imágenes
            </li>
            <li>
              <strong>Etiquetar:</strong> En la galería, selecciona fotos y
              asígnalas a los invitados
            </li>
            <li>
              <strong>Ver como Cliente:</strong> Usa los enlaces generados para
              ver las fotos de cada invitado
            </li>
          </ol>

          <div className="mt-6 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4">
            <p className="text-sm font-semibold text-amber-900">💡 Tip:</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Las fotos se procesan con marca de agua "MUESTRA" automáticamente.
              Los clientes solo verán las fotos que les asignes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

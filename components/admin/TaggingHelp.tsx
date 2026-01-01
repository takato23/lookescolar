'use client';

import React, { useState } from 'react';

interface Shortcut {
  keys: string;
  description: string;
  icon: string;
}

interface Tip {
  title: string;
  description: string;
  icon: string;
}

const shortcuts: Shortcut[] = [
  {
    keys: 'Click',
    description: 'Seleccionar foto individual',
    icon: '👆',
  },
  {
    keys: 'Ctrl + Click',
    description: 'Selección múltiple de fotos',
    icon: '🔄',
  },
  {
    keys: 'Ctrl + A',
    description: 'Seleccionar todas las fotos',
    icon: '📸',
  },
  {
    keys: 'Ctrl + C',
    description: 'Limpiar selección',
    icon: '✨',
  },
  {
    keys: 'Ctrl + Z',
    description: 'Deshacer última acción',
    icon: '↩️',
  },
  {
    keys: 'Esc',
    description: 'Cancelar acción pendiente',
    icon: '❌',
  },
];

const tips: Tip[] = [
  {
    title: 'Selección Eficiente',
    description:
      'Usa Ctrl+Click para seleccionar múltiples fotos antes de asignarlas a un invitado.',
    icon: '⚡',
  },
  {
    title: 'Workflow Recomendado',
    description:
      'Organiza por grupos: selecciona todas las fotos de un invitado, asígnalas, y continúa con el siguiente.',
    icon: '📋',
  },
  {
    title: 'Progreso Visual',
    description:
      'La barra de progreso te muestra el avance. Verde significa que vas bien encaminado.',
    icon: '📊',
  },
  {
    title: 'Tiempo Estimado',
    description:
      'El sistema calcula automáticamente cuánto tiempo te queda basado en tu velocidad.',
    icon: '⏰',
  },
];

export function TaggingHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'tips'>('shortcuts');

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-xl text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-blue-600"
        title="Ayuda y Shortcuts"
      >
        ❓
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Ayuda de Tagging</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-2xl leading-none text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-4 flex space-x-1">
              <button
                onClick={() => setActiveTab('shortcuts')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'shortcuts'
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                ⌨️ Shortcuts
              </button>
              <button
                onClick={() => setActiveTab('tips')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'tips'
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                💡 Tips
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto p-6">
            {activeTab === 'shortcuts' && (
              <div className="space-y-4">
                <div className="mb-4 text-gray-500 dark:text-gray-400">
                  Usa estos atajos de teclado para hacer el tagging más rápido:
                </div>

                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 rounded-lg bg-muted p-3"
                  >
                    <div className="text-2xl">{shortcut.icon}</div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center space-x-2">
                        <span className="rounded bg-muted px-2 py-1 font-mono text-sm font-medium text-foreground">
                          {shortcut.keys}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {shortcut.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'tips' && (
              <div className="space-y-4">
                <div className="mb-4 text-gray-500 dark:text-gray-400">
                  Consejos para hacer el tagging de manera más eficiente:
                </div>

                {tips.map((tip, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50 p-4"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{tip.icon}</div>
                      <div>
                        <h3 className="mb-2 font-medium text-foreground">
                          {tip.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                          {tip.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-muted px-6 py-4">
            <div className="text-center text-sm text-gray-500">
              <span className="inline-flex items-center">
                💡 Tip: Este panel se puede abrir en cualquier momento con el
                botón de ayuda
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

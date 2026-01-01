'use client';

import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent: () => void;
  onUploadPhotos: () => void;
  onShareLinks: () => void;
  onViewOrders: () => void;
}

export function GuideModal({
  isOpen,
  onClose,
  onCreateEvent,
  onUploadPhotos,
  onShareLinks,
  onViewOrders,
}: GuideModalProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Manejo de foco al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      firstButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Cerrar con Esc
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      aria-label="Fondo del modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        aria-describedby="guide-desc"
        className="bg-white dark:bg-gray-900 text-foreground shadow-3d border-border w-full max-w-lg rounded-2xl border p-6 outline-none"
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 id="guide-title" className="text-xl font-bold">
            Modo asistido
          </h2>
          <Button
            aria-label="Cerrar guía"
            variant="ghost"
            onClick={onClose}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Cerrar
          </Button>
        </div>

        <p id="guide-desc" className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
          Te guiamos paso a paso. Elegí una acción para continuar.
        </p>

        <ol className="mb-6 grid list-decimal grid-cols-1 gap-3 pl-5">
          <li className="bg-muted/40 rounded-lg p-3">
            <div className="font-medium">Crear evento</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              Nombre del colegio y fecha
            </div>
          </li>
          <li className="bg-muted/40 rounded-lg p-3">
            <div className="font-medium">Subir fotos</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              Arrastrá o seleccioná archivos
            </div>
          </li>
          <li className="bg-muted/40 rounded-lg p-3">
            <div className="font-medium">Compartir enlaces/QR</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              Enviá el acceso a los clientes
            </div>
          </li>
          <li className="bg-muted/40 rounded-lg p-3">
            <div className="font-medium">Revisar pedidos</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              Ver ventas y pagos
            </div>
          </li>
        </ol>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            ref={firstButtonRef}
            aria-label="Ir a crear evento"
            variant="secondary"
            onClick={onCreateEvent}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Crear evento
          </Button>
          <Button
            aria-label="Ir a subir fotos"
            variant="outline"
            onClick={onUploadPhotos}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Subir fotos
          </Button>
          <Button
            aria-label="Ir a compartir enlaces"
            variant="outline"
            onClick={onShareLinks}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Compartir enlaces/QR
          </Button>
          <Button
            aria-label="Ir a ver pedidos"
            variant="outline"
            onClick={onViewOrders}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Ver pedidos
          </Button>
        </div>
      </div>
    </div>
  );
}

export default GuideModal;

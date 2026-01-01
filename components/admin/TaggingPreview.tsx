'use client';

import React from 'react';

interface PendingAssignment {
  photoIds: string[];
  subjectId: string;
  subjectName: string;
}

interface TaggingPreviewProps {
  assignment: PendingAssignment;
  onConfirm: () => void;
  onCancel: () => void;
  processing: boolean;
}

export function TaggingPreview({
  assignment,
  onConfirm,
  onCancel,
  processing,
}: TaggingPreviewProps) {
  const photoCount = assignment.photoIds.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground">
            Confirmar Asignación
          </h3>
          {!processing && (
            <button
              onClick={onCancel}
              className="text-2xl leading-none text-gray-400 hover:text-muted-foreground"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div className="mb-6 space-y-4">
          {/* Resumen visual */}
          <div className="rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 p-4">
            <div className="flex items-center justify-center space-x-4">
              {/* Fotos */}
              <div className="text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/30">
                  <span className="text-2xl">📷</span>
                </div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {photoCount} foto{photoCount !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Flecha */}
              <div className="flex flex-1 justify-center">
                <span className="text-2xl text-gray-400">→</span>
              </div>

              {/* Alumno */}
              <div className="text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <span className="text-2xl">👤</span>
                </div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Invitado</div>
              </div>
            </div>
          </div>

          {/* Detalles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 py-2">
              <span className="text-gray-500 dark:text-gray-400">Fotos a asignar:</span>
              <span className="font-medium text-foreground">{photoCount}</span>
            </div>

            <div className="flex items-start justify-between border-b border-gray-100 py-2">
              <span className="text-gray-500 dark:text-gray-400">Invitado:</span>
              <span className="max-w-48 break-words text-right font-medium text-foreground">
                {assignment.subjectName}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-gray-500 dark:text-gray-400">ID de fotos:</span>
              <div className="max-w-48 text-right text-xs text-gray-500">
                {assignment.photoIds
                  .slice(0, 3)
                  .map((id) => `#${id.slice(-6)}`)
                  .join(', ')}
                {assignment.photoIds.length > 3 &&
                  ` +${assignment.photoIds.length - 3} más`}
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            disabled={processing}
            className="flex-1 rounded-xl bg-muted px-4 py-3 font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            disabled={processing}
            className="flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                Asignando...
              </>
            ) : (
              'Confirmar Asignación'
            )}
          </button>
        </div>

        {/* Info adicional */}
        <div className="mt-4 rounded-lg bg-yellow-50 p-3">
          <div className="flex items-start space-x-2">
            <span className="text-sm text-yellow-600">💡</span>
            <div className="text-xs text-yellow-700">
              <strong>Tip:</strong> Puedes usar Ctrl+Z para deshacer esta
              asignación después de confirmarla.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

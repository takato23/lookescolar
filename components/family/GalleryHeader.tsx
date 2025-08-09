'use client';

interface GalleryHeaderProps {
  totalPhotos: number;
  displayedPhotos: number;
  selectedCount: number;
  favoritesCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

export function GalleryHeader({
  totalPhotos,
  displayedPhotos,
  selectedCount,
  favoritesCount,
  onSelectAll,
  onClearSelection,
}: GalleryHeaderProps) {
  return (
    <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      {/* Título y estadísticas */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          📸 Galería de Fotos
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>
              <strong>{displayedPhotos}</strong>
              {displayedPhotos !== totalPhotos && ` de ${totalPhotos}`} fotos
            </span>
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center space-x-1 font-medium text-purple-600">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{selectedCount} seleccionadas</span>
            </div>
          )}

          {favoritesCount > 0 && (
            <div className="flex items-center space-x-1 text-red-600">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span>{favoritesCount} favoritos</span>
            </div>
          )}
        </div>
      </div>

      {/* Controles de selección */}
      <div className="flex items-center space-x-3">
        {selectedCount > 0 ? (
          <>
            <button
              onClick={onClearSelection}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
            >
              Deseleccionar todas
            </button>

            <div className="h-5 w-px bg-gray-300"></div>

            <div className="flex items-center space-x-2 text-sm font-medium text-purple-600">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white">
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span>
                {selectedCount} foto{selectedCount !== 1 ? 's' : ''} en el
                carrito
              </span>
            </div>
          </>
        ) : (
          <>
            {displayedPhotos > 0 && (
              <button
                onClick={onSelectAll}
                className="rounded-md bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
              >
                Seleccionar todas las visibles
              </button>
            )}
          </>
        )}

        {/* Indicador de acceso seguro */}
        <div className="hidden items-center space-x-1 text-xs text-green-600 sm:flex">
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span>Acceso seguro</span>
        </div>
      </div>
    </div>
  );
}

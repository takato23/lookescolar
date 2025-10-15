'use client';

import { useMemo, useState } from 'react';

export type EngagementFilter = 'all' | 'favorites' | 'purchased' | 'unpurchased';

export interface FiltersState {
  search: string;
  dateRange: { from?: string; to?: string };
  engagement: EngagementFilter;
}

interface EngagementStats {
  totalPhotos: number;
  totalFavorites: number;
  totalInCart: number;
  totalPurchased: number;
}

interface PhotoFiltersProps {
  filters: FiltersState;
  onUpdateFilters: (filters: Partial<FiltersState>) => void;
  totalPhotos: number;
  filteredPhotos: number;
  stats?: EngagementStats | null;
}

export function PhotoFilters({
  filters,
  onUpdateFilters,
  totalPhotos,
  filteredPhotos,
  stats,
}: PhotoFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search);

  const resolvedStats: EngagementStats = useMemo(
    () => ({
      totalPhotos: stats?.totalPhotos ?? totalPhotos,
      totalFavorites: stats?.totalFavorites ?? 0,
      totalInCart: stats?.totalInCart ?? 0,
      totalPurchased: stats?.totalPurchased ?? 0,
    }),
    [stats, totalPhotos]
  );

  const unpurchasedCount = Math.max(
    0,
    resolvedStats.totalPhotos - resolvedStats.totalPurchased
  );

  const hasActiveFilters =
    filters.search ||
    filters.dateRange.from ||
    filters.dateRange.to ||
    filters.engagement !== 'all';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateFilters({ search: searchValue });
  };

  const clearAllFilters = () => {
    setSearchValue('');
    onUpdateFilters({
      search: '',
      dateRange: {},
      engagement: 'all',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header siempre visible */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          {/* Buscador */}
          <form onSubmit={handleSearchSubmit} className="flex items-center">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-48 rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <svg
                className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchValue && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchValue('');
                    onUpdateFilters({ search: '' });
                  }}
                  className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="submit"
              className="ml-2 rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            >
              Buscar
            </button>
          </form>

          <div className="flex items-center space-x-2">
            {[
              {
                key: 'all' as EngagementFilter,
                label: 'Todas',
                count: resolvedStats.totalPhotos,
              },
              {
                key: 'favorites' as EngagementFilter,
                label: 'Favoritas',
                count: resolvedStats.totalFavorites,
              },
              {
                key: 'purchased' as EngagementFilter,
                label: 'Compradas',
                count: resolvedStats.totalPurchased,
              },
              {
                key: 'unpurchased' as EngagementFilter,
                label: 'Sin comprar',
                count: unpurchasedCount,
              },
            ].map((option) => {
              const isActive = filters.engagement === option.key;
              return (
                <button
                  key={option.key}
                  onClick={() => onUpdateFilters({ engagement: option.key })}
                  className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  aria-pressed={isActive}
                >
                  <span>{option.label}</span>
                  <span
                    className={`inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full border px-2 text-xs ${
                      isActive
                        ? 'border-white/40 bg-white/20 text-white'
                        : 'border-gray-300 bg-white text-gray-600'
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Resultados */}
          <div className="text-sm text-gray-600">
            {filteredPhotos === totalPhotos ? (
              <span>{totalPhotos} fotos</span>
            ) : (
              <span>
                {filteredPhotos} de {totalPhotos} fotos
              </span>
            )}
          </div>

          {resolvedStats.totalInCart > 0 && (
            <div className="text-xs font-medium text-amber-600 sm:text-sm">
              <span className="rounded-full bg-amber-100 px-3 py-1">
                {resolvedStats.totalInCart}{' '}
                {resolvedStats.totalInCart === 1
                  ? 'foto en carrito compartido'
                  : 'fotos en carrito compartido'}
              </span>
            </div>
          )}

          {/* Botón expandir/contraer */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
          >
            <span>Filtros avanzados</span>
            <svg
              className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Panel expandible */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Rango de fechas */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Rango de fechas
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={filters.dateRange.from || ''}
                  onChange={(e) =>
                    onUpdateFilters({
                      dateRange: {
                        ...filters.dateRange,
                        from: e.target.value || undefined,
                      },
                    })
                  }
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <span className="text-gray-500">hasta</span>
                <input
                  type="date"
                  value={filters.dateRange.to || ''}
                  onChange={(e) =>
                    onUpdateFilters({
                      dateRange: {
                        ...filters.dateRange,
                        to: e.target.value || undefined,
                      },
                    })
                  }
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-end">
              <div className="space-y-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center space-x-2 text-sm text-red-600 hover:text-red-800"
                  >
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Limpiar filtros</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filtros activos */}
          {hasActiveFilters && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Filtros activos:
                </span>

                {filters.search && (
                  <span className="inline-flex items-center space-x-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                    <span>Búsqueda: "{filters.search}"</span>
                    <button
                      onClick={() => onUpdateFilters({ search: '' })}
                      className="text-purple-500 hover:text-purple-700"
                    >
                      ×
                    </button>
                  </span>
                )}

                {filters.dateRange.from && (
                  <span className="inline-flex items-center space-x-1 rounded-full bg-blue-100 dark:bg-blue-950/30 px-3 py-1 text-xs font-medium text-blue-700">
                    <span>Desde: {formatDate(filters.dateRange.from)}</span>
                    <button
                      onClick={() =>
                        onUpdateFilters({
                          dateRange: { ...filters.dateRange, from: undefined },
                        })
                      }
                      className="text-blue-500 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </span>
                )}

                {filters.dateRange.to && (
                  <span className="inline-flex items-center space-x-1 rounded-full bg-blue-100 dark:bg-blue-950/30 px-3 py-1 text-xs font-medium text-blue-700">
                    <span>Hasta: {formatDate(filters.dateRange.to)}</span>
                    <button
                      onClick={() =>
                        onUpdateFilters({
                          dateRange: { ...filters.dateRange, to: undefined },
                        })
                      }
                      className="text-blue-500 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </span>
                )}

                {filters.engagement !== 'all' && (
                  <span className="inline-flex items-center space-x-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                    <span>
                      {filters.engagement === 'favorites' && 'Favoritas'}
                      {filters.engagement === 'purchased' && 'Compradas'}
                      {filters.engagement === 'unpurchased' && 'Sin comprar'}
                    </span>
                    <button
                      onClick={() => onUpdateFilters({ engagement: 'all' })}
                      className="text-purple-500 hover:text-purple-700"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

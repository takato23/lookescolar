'use client';

import React from 'react';
import { CheckIcon, GridIcon, ListIcon, SearchIcon } from '@/app/admin/_mockups/icons';

export type FilterType = 'all' | 'approved' | 'pending' | 'tagged';
export type ViewType = 'grid' | 'list';

type Props = {
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
  view: ViewType;
  onViewChange: (v: ViewType) => void;
  areAllVisibleSelected: boolean;
  onToggleSelectAll: () => void;
};

const chips: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'tagged', label: 'Etiquetadas' },
];

export default function PhotosFilters(props: Props): JSX.Element {
  const {
    filter,
    onFilterChange,
    searchValue,
    onSearchChange,
    view,
    onViewChange,
    areAllVisibleSelected,
    onToggleSelectAll,
  } = props;

  return (
    <div className="mt-2 space-y-2">
      <div className="relative">
        <label htmlFor="search-photos" className="sr-only">
          Buscar fotos
        </label>
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          <SearchIcon className="h-4 w-4" />
        </span>
        <input
          id="search-photos"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => {
            const active = c.key === filter;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={active}
                onClick={() => onFilterChange(c.key)}
                className={
                  'rounded-full border px-3 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-slate-400 ' +
                  (active
                    ? 'border-slate-800 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Vista de grilla"
            aria-pressed={view === 'grid'}
            onClick={() => onViewChange('grid')}
            className={
              'inline-flex h-9 w-9 items-center justify-center rounded-xl border outline-none focus:ring-2 focus:ring-slate-400 ' +
              (view === 'grid'
                ? 'border-slate-800 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')
            }
          >
            <GridIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Vista de lista"
            aria-pressed={view === 'list'}
            onClick={() => onViewChange('list')}
            className={
              'inline-flex h-9 w-9 items-center justify-center rounded-xl border outline-none focus:ring-2 focus:ring-slate-400 ' +
              (view === 'list'
                ? 'border-slate-800 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')
            }
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleSelectAll}
          className={
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-slate-400 ' +
            (areAllVisibleSelected
              ? 'border-emerald-600 bg-emerald-500 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')
          }
        >
          <CheckIcon className="h-3.5 w-3.5" />
          Seleccionar todas
        </button>
      </div>
    </div>
  );
}


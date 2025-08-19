'use client';

import React from 'react';
import { CheckIcon } from '@/app/admin/_mockups/icons';
import type { ViewType } from '@/app/admin/_mockups/PhotosFilters';

export type Photo = {
  id: string;
  src: string;
  name: string;
  sizeKB: number;
  date: string; // ISO date string (YYYY-MM-DD)
  status: 'approved' | 'pending';
};

type Props = {
  photo: Photo;
  selected: boolean;
  onToggle: () => void;
  view: ViewType;
};

export default function PhotoCard({ photo, selected, onToggle, view }: Props): JSX.Element {
  if (view === 'list') {
    return (
      <div
        role="option"
        aria-selected={selected}
        className="flex items-center gap-3 py-2"
      >
        <button
          type="button"
          aria-label={selected ? 'Quitar selección' : 'Seleccionar'}
          onClick={onToggle}
          className={
            'relative inline-flex h-6 w-6 items-center justify-center rounded border ' +
            (selected
              ? 'border-emerald-600 bg-emerald-500 text-white'
              : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')
          }
        >
          {selected && <CheckIcon className="h-3.5 w-3.5" />}
        </button>

        <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800">
          <img src={photo.src} alt={photo.name} className="h-full w-full object-cover" />
          {photo.status === 'approved' ? (
            <span className="absolute right-1 top-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white shadow">
              Aprobada
            </span>
          ) : (
            <span className="absolute right-1 top-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-medium text-white shadow">
              Pendiente
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{photo.name}</div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            {photo.sizeKB} KB • {photo.date}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="option"
      aria-selected={selected}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="relative aspect-square overflow-hidden">
        <img src={photo.src} alt={photo.name} className="h-full w-full object-cover" />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/10" />

        {/* Checkbox top-left */}
        <button
          type="button"
          aria-label={selected ? 'Quitar selección' : 'Seleccionar'}
          onClick={onToggle}
          className={
            'absolute left-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-medium outline-none focus:ring-2 focus:ring-slate-400 ' +
            (selected
              ? 'border-emerald-600 bg-emerald-500 text-white'
              : 'border-white/80 bg-white/90 text-slate-700 hover:bg-white')
          }
        >
          {selected && <CheckIcon className="h-4 w-4" />}
        </button>

        {/* Badge top-right */}
        {photo.status === 'approved' ? (
          <span className="absolute right-2 top-2 z-10 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
            Aprobada
          </span>
        ) : (
          <span className="absolute right-2 top-2 z-10 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
            Pendiente
          </span>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{photo.name}</div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            {photo.sizeKB} KB • {photo.date}
          </div>
        </div>
      </div>
    </div>
  );
}


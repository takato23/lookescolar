'use client';

import { BellIcon, MenuIcon, SearchIcon } from '@/app/admin/_mockups/icons';
import React from 'react';

export default function MobileNav(): JSX.Element {
  return (
    <header className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <button
        type="button"
        aria-label="Abrir menú"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      <div className="text-sm font-semibold tracking-tight">LookEscolar</div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Buscar"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <SearchIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Notificaciones"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <BellIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}


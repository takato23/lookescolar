'use client';

import { useEffect, useMemo, useState } from 'react';
import MobileNav from '@/app/admin/_mockups/MobileNav';
import PhotosFilters, { FilterType, ViewType } from '@/app/admin/_mockups/PhotosFilters';
import PhotoCard, { Photo } from '@/app/admin/_mockups/PhotoCard';
import Fab from '@/app/admin/_mockups/Fab';

type PhotosStatus = Photo['status'];

const photosMock: Photo[] = [
  {
    id: '1',
    src: '/mockups/photos/blue.svg',
    name: 'IMG_0001',
    sizeKB: 324,
    date: '2024-08-01',
    status: 'approved',
  },
  {
    id: '2',
    src: '/mockups/photos/green.svg',
    name: 'IMG_0002',
    sizeKB: 512,
    date: '2024-08-02',
    status: 'pending',
  },
  {
    id: '3',
    src: '/mockups/photos/red.svg',
    name: 'IMG_0003',
    sizeKB: 221,
    date: '2024-08-03',
    status: 'approved',
  },
  {
    id: '4',
    src: '/mockups/photos/purple.svg',
    name: 'IMG_0004',
    sizeKB: 289,
    date: '2024-08-04',
    status: 'pending',
  },
  {
    id: '5',
    src: '/mockups/photos/blue.svg',
    name: 'IMG_0005',
    sizeKB: 178,
    date: '2024-08-05',
    status: 'approved',
  },
  {
    id: '6',
    src: '/mockups/photos/green.svg',
    name: 'IMG_0006',
    sizeKB: 342,
    date: '2024-08-06',
    status: 'pending',
  },
  {
    id: '7',
    src: '/mockups/photos/red.svg',
    name: 'IMG_0007',
    sizeKB: 403,
    date: '2024-08-07',
    status: 'approved',
  },
  {
    id: '8',
    src: '/mockups/photos/purple.svg',
    name: 'IMG_0008',
    sizeKB: 267,
    date: '2024-08-08',
    status: 'pending',
  },
  {
    id: '9',
    src: '/mockups/photos/blue.svg',
    name: 'IMG_0009',
    sizeKB: 310,
    date: '2024-08-09',
    status: 'approved',
  },
  {
    id: '10',
    src: '/mockups/photos/green.svg',
    name: 'IMG_0010',
    sizeKB: 198,
    date: '2024-08-10',
    status: 'pending',
  },
];

export default function PhotosMobilePage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [view, setView] = useState<ViewType>('grid');
  const [searchRaw, setSearchRaw] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Debounce search 200ms
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchRaw.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [searchRaw]);

  const visiblePhotos = useMemo(() => {
    return photosMock.filter((p) => {
      const byFilter: boolean =
        filter === 'all' ? true : filter === 'tagged' ? false : p.status === (filter as PhotosStatus);
      const bySearch: boolean = search === '' ? true : p.name.toLowerCase().includes(search);
      return byFilter && bySearch;
    });
  }, [filter, search]);

  const areAllVisibleSelected = useMemo(() => {
    if (visiblePhotos.length === 0) return false;
    return visiblePhotos.every((p) => selected.has(p.id));
  }, [visiblePhotos, selected]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (areAllVisibleSelected) {
        visiblePhotos.forEach((p) => next.delete(p.id));
      } else {
        visiblePhotos.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const onFabClick = () => {
    // eslint-disable-next-line no-console
    console.log('Selected IDs:', Array.from(selected));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-900">
      <div className="mx-auto w-[430px] max-w-full p-3">
        <MobileNav />

        <div className="sticky top-0 z-20 -mx-3 mb-3 bg-white/70 px-3 pb-3 pt-2 backdrop-blur-md backdrop-saturate-150 dark:bg-slate-900/60">
          <div className="flex items-baseline justify-between">
            <h1 className="text-lg font-semibold tracking-tight">Fotos ({photosMock.length})</h1>
          </div>
          <PhotosFilters
            filter={filter}
            onFilterChange={setFilter}
            searchValue={searchRaw}
            onSearchChange={setSearchRaw}
            view={view}
            onViewChange={setView}
            areAllVisibleSelected={areAllVisibleSelected}
            onToggleSelectAll={toggleSelectAllVisible}
          />
        </div>

        <div
          className={
            view === 'grid'
              ? 'grid grid-cols-2 gap-3 sm:grid-cols-3'
              : 'divide-y divide-slate-200 dark:divide-slate-800'
          }
        >
          {visiblePhotos.map((p) => (
            <PhotoCard key={p.id} photo={p} selected={selected.has(p.id)} onToggle={() => toggleSelect(p.id)} view={view} />
          ))}
        </div>

        <Fab onClick={onFabClick} />
      </div>
    </div>
  );
}

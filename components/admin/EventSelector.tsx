'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
// TEMP: Commented out missing popover component
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { ChevronsUpDown, Star, Search } from 'lucide-react';

interface EventLite { id: string; name: string }

export default function EventSelector({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (id: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<EventLite[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const debounced = useDebounce(query, 250);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem('le:favEventIds') || '[]'));
      setRecents(JSON.parse(localStorage.getItem('le:recentEventIds') || '[]'));
    } catch {}
  }, []);

  const fetchPage = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (debounced.length >= 2) params.set('q', debounced);
    params.set('limit', '20');
    params.set('offset', String(reset ? 0 : offset));
    const res = await fetch(`/api/admin/events/search?${params}`);
    const data = await res.json();
    setItems((prev) => (reset ? data.events : [...prev, ...data.events]));
    setOffset(data.nextOffset || 0);
    setHasMore(Boolean(data.hasMore));
    setLoading(false);
  };

  useEffect(() => { fetchPage(true); }, [debounced]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (!hasMore || loading) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) fetchPage(false);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [open, hasMore, loading]);

  const displayValue = useMemo(() => items.find((e) => e.id === value)?.name || 'Seleccionar evento', [items, value]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem('le:favEventIds', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    // update recents
    setRecents((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 10);
      try { localStorage.setItem('le:recentEventIds', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const favoriteItems = items.filter((e) => favorites.includes(e.id));
  const recentItems = items.filter((e) => recents.includes(e.id) && !favorites.includes(e.id));

  // TEMP: Simplified select dropdown without popover
  return (
    <select 
      className={cn('w-72 p-2 border rounded-md bg-white', className)}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Seleccionar evento</option>
      {items.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name}
        </option>
      ))}
    </select>
  );
}



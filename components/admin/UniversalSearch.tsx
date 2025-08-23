'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, X, Loader2, Users, Camera, Folder, 
  GraduationCap, BookOpen, User, FileImage,
  Clock, ArrowRight, Filter, SortAsc, Zap
} from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

// Search result types
interface SearchResult {
  id: string;
  type: 'event' | 'level' | 'course' | 'student' | 'photo';
  title: string;
  subtitle?: string;
  description?: string;
  path: string[];
  metadata?: {
    photoCount?: number;
    studentCount?: number;
    courseCount?: number;
    uploadDate?: string;
    lastActivity?: string;
    tags?: string[];
  };
  score: number; // Relevance score
  highlighted?: {
    title?: string;
    subtitle?: string;
    description?: string;
  };
}

interface SearchFilters {
  types: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags: string[];
  hasPhotos?: boolean;
  approved?: boolean;
}

interface UniversalSearchProps {
  eventId: string;
  onResultSelect: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
  showFilters?: boolean;
  maxResults?: number;
}

export default function UniversalSearch({
  eventId,
  onResultSelect,
  placeholder = "Buscar en todo el evento...",
  className,
  showFilters = true,
  maxResults = 50
}: UniversalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    types: [],
    tags: []
  });
  const [quickFilters, setQuickFilters] = useState({
    withPhotos: false,
    approved: false,
    recent: false
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const url = new URL(`/api/admin/events/${eventId}/search`, window.location.origin);
      url.searchParams.set('q', searchQuery);
      url.searchParams.set('limit', maxResults.toString());
      
      // Add filters
      if (filters.types.length > 0) {
        url.searchParams.set('types', filters.types.join(','));
      }
      if (filters.tags.length > 0) {
        url.searchParams.set('tags', filters.tags.join(','));
      }
      if (quickFilters.withPhotos) {
        url.searchParams.set('has_photos', 'true');
      }
      if (quickFilters.approved) {
        url.searchParams.set('approved', 'true');
      }
      if (quickFilters.recent) {
        url.searchParams.set('recent', 'true');
      }

      const response = await fetch(url.toString());
      const data = await response.json();
      
      setResults(data.results || []);
      
      // Save to recent searches
      if (searchQuery.length > 2) {
        setRecentSearches(prev => {
          const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)];
          return updated.slice(0, 5); // Keep only 5 recent searches
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [eventId, maxResults, filters, quickFilters]);

  // Effect for debounced search
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, performSearch]);

  // Handle result selection
  const handleResultSelect = useCallback((result: SearchResult) => {
    onResultSelect(result);
    setIsOpen(false);
    setQuery('');
  }, [onResultSelect]);

  // Handle recent search selection
  const handleRecentSearchSelect = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    setIsOpen(true);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  }, []);

  // Result item component
  const ResultItem = useCallback(({ result }: { result: SearchResult }) => {
    const getTypeIcon = () => {
      switch (result.type) {
        case 'level':
          return <GraduationCap className="h-4 w-4" />;
        case 'course':
          return <BookOpen className="h-4 w-4" />;
        case 'student':
          return <User className="h-4 w-4" />;
        case 'photo':
          return <Camera className="h-4 w-4" />;
        default:
          return <Folder className="h-4 w-4" />;
      }
    };

    const getTypeColor = () => {
      switch (result.type) {
        case 'level':
          return 'bg-blue-100 text-blue-700';
        case 'course':
          return 'bg-purple-100 text-purple-700';
        case 'student':
          return 'bg-green-100 text-green-700';
        case 'photo':
          return 'bg-orange-100 text-orange-700';
        default:
          return 'bg-gray-100 text-gray-700';
      }
    };

    return (
      <CommandItem
        value={result.id}
        onSelect={() => handleResultSelect(result)}
        className="flex items-start gap-3 p-3 cursor-pointer"
      >
        <div className={cn("p-1.5 rounded-lg", getTypeColor())}>
          {getTypeIcon()}
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">
              {result.highlighted?.title || result.title}
            </h4>
            <Badge variant="outline" className="text-xs capitalize">
              {result.type}
            </Badge>
          </div>
          
          {result.subtitle && (
            <p className="text-xs text-muted-foreground truncate">
              {result.highlighted?.subtitle || result.subtitle}
            </p>
          )}
          
          {result.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {result.highlighted?.description || result.description}
            </p>
          )}
          
          {/* Path breadcrumb */}
          {result.path.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {result.path.slice(0, 3).map((pathItem, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <ArrowRight className="h-3 w-3" />}
                  <span className="truncate max-w-20">{pathItem}</span>
                </React.Fragment>
              ))}
              {result.path.length > 3 && (
                <>
                  <ArrowRight className="h-3 w-3" />
                  <span>...</span>
                </>
              )}
            </div>
          )}
          
          {/* Metadata */}
          {result.metadata && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {result.metadata.photoCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Camera className="h-3 w-3" />
                  <span>{result.metadata.photoCount}</span>
                </div>
              )}
              {result.metadata.studentCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{result.metadata.studentCount}</span>
                </div>
              )}
              {result.metadata.uploadDate && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(result.metadata.uploadDate).toLocaleDateString('es-AR')}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          {Math.round(result.score * 100)}%
        </div>
      </CommandItem>
    );
  }, [handleResultSelect]);

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    
    results.forEach(result => {
      if (!groups[result.type]) {
        groups[result.type] = [];
      }
      if (groups[result.type]) {
        groups[result.type].push(result);
      }
    });
    
    // Sort groups by priority and results by score
    const sortedGroups: [string, SearchResult[]][] = [];
    const typeOrder = ['photo', 'student', 'course', 'level', 'event'];
    
    typeOrder.forEach(type => {
      if (groups[type]) {
        sortedGroups.push([
          type,
          groups[type].sort((a, b) => b.score - a.score)
        ]);
      }
    });
    
    return sortedGroups;
  }, [results]);

  // Type labels
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'level': return 'Niveles';
      case 'course': return 'Cursos';
      case 'student': return 'Estudiantes';
      case 'photo': return 'Fotos';
      case 'event': return 'Eventos';
      default: return type;
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="pl-9 pr-10"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={clearSearch}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-[600px] p-0" 
          align="start"
          onOpenAutoFocus={(e: Event) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList className="max-h-96">
              {/* Quick filters */}
              {showFilters && (
                <>
                  <div className="p-3 border-b">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground">Filtros:</span>
                      
                      <Button
                        variant={quickFilters.withPhotos ? "default" : "outline"}
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setQuickFilters(prev => ({ ...prev, withPhotos: !prev.withPhotos }))}
                      >
                        <Camera className="h-3 w-3 mr-1" />
                        Con fotos
                      </Button>
                      
                      <Button
                        variant={quickFilters.approved ? "default" : "outline"}
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setQuickFilters(prev => ({ ...prev, approved: !prev.approved }))}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Aprobadas
                      </Button>
                      
                      <Button
                        variant={quickFilters.recent ? "default" : "outline"}
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setQuickFilters(prev => ({ ...prev, recent: !prev.recent }))}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Recientes
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Recent searches */}
              {!query && recentSearches.length > 0 && (
                <CommandGroup heading="Búsquedas recientes">
                  {recentSearches.map((search, index) => (
                    <CommandItem
                      key={index}
                      value={search}
                      onSelect={() => handleRecentSearchSelect(search)}
                      className="flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{search}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Search results */}
              {query && (
                <>
                  {loading ? (
                    <div className="p-6 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Buscando...</p>
                    </div>
                  ) : results.length === 0 ? (
                    <CommandEmpty>
                      <div className="text-center py-6">
                        <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          No se encontraron resultados para "{query}"
                        </p>
                      </div>
                    </CommandEmpty>
                  ) : (
                    <>
                      {groupedResults.map(([type, typeResults], groupIndex) => (
                        <React.Fragment key={type}>
                          {groupIndex > 0 && <CommandSeparator />}
                          <CommandGroup heading={`${getTypeLabel(type)} (${typeResults.length})`}>
                            {typeResults.slice(0, 10).map(result => (
                              <ResultItem key={result.id} result={result} />
                            ))}
                            {typeResults.length > 10 && (
                              <div className="px-3 py-2 text-xs text-muted-foreground">
                                Y {typeResults.length - 10} resultados más...
                              </div>
                            )}
                          </CommandGroup>
                        </React.Fragment>
                      ))}
                      
                      {/* Results summary */}
                      <div className="border-t p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {results.length} resultados encontrados
                          </span>
                          <div className="flex items-center gap-1">
                            <SortAsc className="h-3 w-3" />
                            <span>Ordenado por relevancia</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
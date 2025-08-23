'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Clock, Calendar, DollarSign, Users, Image, Tag, Zap, TrendingUp, Filter, Command } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchSuggestion {
  id: string;
  type: 'school' | 'date' | 'tag' | 'status' | 'filter';
  value: string;
  label: string;
  description?: string;
  icon?: any;
  count?: number;
}

interface AdvancedSearchProps {
  onSearch: (query: string) => void;
  onFilterApply: (filters: any) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  className?: string;
  events?: any[];
}

export function AdvancedSearch({ 
  onSearch, 
  onFilterApply, 
  placeholder = "Buscar eventos, escuelas, fechas...", 
  suggestions = [],
  className,
  events = []
}: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Generate smart suggestions based on available data
  const generateSmartSuggestions = (): SearchSuggestion[] => {
    const smartSuggestions: SearchSuggestion[] = [];
    
    // School suggestions
    const schools = [...new Set(events.map(e => e.school))];
    schools.forEach(school => {
      if (school.toLowerCase().includes(query.toLowerCase())) {
        smartSuggestions.push({
          id: `school-${school}`,
          type: 'school',
          value: school,
          label: school,
          description: `Buscar eventos de ${school}`,
          icon: Users,
          count: events.filter(e => e.school === school).length
        });
      }
    });

    // Date-based suggestions
    if (query.toLowerCase().includes('hoy') || query.toLowerCase().includes('today')) {
      smartSuggestions.push({
        id: 'date-today',
        type: 'date',
        value: 'today',
        label: 'Eventos de hoy',
        description: 'Ver eventos programados para hoy',
        icon: Calendar
      });
    }

    if (query.toLowerCase().includes('semana') || query.toLowerCase().includes('week')) {
      smartSuggestions.push({
        id: 'date-week',
        type: 'date',
        value: 'this-week',
        label: 'Esta semana',
        description: 'Eventos de los próximos 7 días',
        icon: Calendar
      });
    }

    // Status-based suggestions
    if (query.toLowerCase().includes('activ') || query.toLowerCase().includes('active')) {
      smartSuggestions.push({
        id: 'status-active',
        type: 'status',
        value: 'active',
        label: 'Eventos activos',
        description: 'Ver solo eventos activos',
        icon: Zap,
        count: events.filter(e => e.active).length
      });
    }

    if (query.toLowerCase().includes('borrador') || query.toLowerCase().includes('draft')) {
      smartSuggestions.push({
        id: 'status-draft',
        type: 'status',
        value: 'draft',
        label: 'Borradores',
        description: 'Ver eventos en borrador',
        icon: Clock,
        count: events.filter(e => !e.active).length
      });
    }

    // Revenue-based suggestions
    if (query.toLowerCase().includes('ingreso') || query.toLowerCase().includes('revenue')) {
      smartSuggestions.push({
        id: 'filter-high-revenue',
        type: 'filter',
        value: 'high-revenue',
        label: 'Altos ingresos',
        description: 'Eventos con más de $50,000',
        icon: TrendingUp
      });
    }

    // Photo-based suggestions
    if (query.toLowerCase().includes('foto') || query.toLowerCase().includes('photo')) {
      smartSuggestions.push({
        id: 'filter-many-photos',
        type: 'filter',
        value: 'many-photos',
        label: 'Muchas fotos',
        description: 'Eventos con más de 100 fotos',
        icon: Image
      });
    }

    return smartSuggestions.slice(0, 8); // Limit to 8 suggestions
  };

  const allSuggestions = [...generateSmartSuggestions(), ...suggestions];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    setShowSuggestions(true);
    
    // Trigger search with debounce
    const timeoutId = setTimeout(() => {
      onSearch(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'school') {
      setQuery(suggestion.value);
      onSearch(suggestion.value);
    } else if (suggestion.type === 'date' || suggestion.type === 'status' || suggestion.type === 'filter') {
      applyQuickFilter(suggestion);
    }
    
    // Add to recent searches
    const newRecentSearches = [suggestion.label, ...recentSearches.filter(s => s !== suggestion.label)].slice(0, 5);
    setRecentSearches(newRecentSearches);
    localStorage.setItem('recentEventSearches', JSON.stringify(newRecentSearches));
    
    setShowSuggestions(false);
  };

  const applyQuickFilter = (suggestion: SearchSuggestion) => {
    const filters: any = {};
    
    switch (suggestion.value) {
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        filters.dateRange = { start: today, end: today };
        break;
      case 'this-week':
        const startOfWeek = new Date();
        const endOfWeek = new Date();
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        filters.dateRange = {
          start: startOfWeek.toISOString().split('T')[0],
          end: endOfWeek.toISOString().split('T')[0]
        };
        break;
      case 'active':
        filters.status = 'active';
        break;
      case 'draft':
        filters.status = 'draft';
        break;
      case 'high-revenue':
        filters.minRevenue = 50000;
        break;
      case 'many-photos':
        filters.minPhotos = 100;
        break;
    }
    
    onFilterApply(filters);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || allSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allSuggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && allSuggestions[selectedIndex]) {
          handleSuggestionClick(allSuggestions[selectedIndex]);
        } else {
          onSearch(query);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Load recent searches on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentEventSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Update suggestion refs
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  return (
    <div className={cn("relative w-full", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay hiding to allow suggestion clicks
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder={placeholder}
          className="neural-glass-card pl-10 pr-20 w-full border-white/20 bg-white/50 backdrop-blur-md focus:bg-white/70 transition-all duration-300"
        />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearSearch}
              className="h-6 w-6 p-0 hover:bg-gray-200/70"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-6 w-6 p-0 hover:bg-gray-200/70"
          >
            <Filter className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Keyboard shortcut hint */}
        <div className="absolute right-12 top-1/2 transform -translate-y-1/2 hidden lg:flex items-center gap-1 text-xs text-gray-400">
          <Command className="h-3 w-3" />
          <span>K</span>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (query || recentSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 neural-glass-card border border-white/20 bg-white/95 backdrop-blur-md rounded-xl shadow-lg max-h-80 overflow-y-auto">
          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Búsquedas recientes</span>
              </div>
              <div className="space-y-1">
                {recentSearches.slice(0, 3).map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(search);
                      onSearch(search);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100/70 rounded-lg transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Smart Suggestions */}
          {allSuggestions.length > 0 && (
            <div className="p-2">
              {!query && (
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sugerencias rápidas
                </div>
              )}
              <div className="space-y-1">
                {allSuggestions.map((suggestion, index) => {
                  const Icon = suggestion.icon || Search;
                  return (
                    <div
                      key={suggestion.id}
                      ref={el => { suggestionRefs.current[index] = el; }}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200",
                        selectedIndex === index
                          ? "bg-blue-100/70 text-blue-800"
                          : "text-gray-700 hover:bg-gray-100/70"
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg",
                        selectedIndex === index
                          ? "bg-blue-200/70"
                          : "bg-gray-100/70"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {suggestion.label}
                          </span>
                          {suggestion.count !== undefined && (
                            <span className="text-xs text-gray-500 bg-gray-200/70 px-2 py-0.5 rounded-full ml-2">
                              {suggestion.count}
                            </span>
                          )}
                        </div>
                        {suggestion.description && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">
                            {suggestion.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Results */}
          {query && allSuggestions.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm font-medium">No se encontraron sugerencias</div>
              <div className="text-xs">Intenta con diferentes términos de búsqueda</div>
            </div>
          )}
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="absolute top-full left-0 right-0 z-40 mt-2 neural-glass-card border border-white/20 bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Filtros avanzados</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAdvanced(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyQuickFilter({ id: 'today', value: 'today', label: 'Hoy', type: 'date' })}
              className="justify-start"
            >
              <Calendar className="h-3 w-3 mr-2" />
              Hoy
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyQuickFilter({ id: 'active', value: 'active', label: 'Activos', type: 'status' })}
              className="justify-start"
            >
              <Zap className="h-3 w-3 mr-2" />
              Activos
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyQuickFilter({ id: 'high-revenue', value: 'high-revenue', label: 'Alto ingreso', type: 'filter' })}
              className="justify-start"
            >
              <TrendingUp className="h-3 w-3 mr-2" />
              Alto ingreso
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyQuickFilter({ id: 'many-photos', value: 'many-photos', label: 'Muchas fotos', type: 'filter' })}
              className="justify-start"
            >
              <Image className="h-3 w-3 mr-2" />
              Muchas fotos
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
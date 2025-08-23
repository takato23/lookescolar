'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Filter,
  Calendar as CalendarIcon,
  X,
  Save,
  Download,
  RotateCcw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface OrderFilters {
  status?: string[];
  event_id?: string;
  priority_level?: number[];
  delivery_method?: string[];
  created_after?: string;
  created_before?: string;
  delivery_after?: string;
  delivery_before?: string;
  amount_min?: number;
  amount_max?: number;
  overdue_only?: boolean;
  has_payment?: boolean;
  search_query?: string;
  contact_info?: string;
}

interface AdvancedOrderFiltersProps {
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
  onExport?: (filters: OrderFilters) => void;
  events?: Array<{ id: string; name: string; school: string }>;
  className?: string;
}

const DEFAULT_FILTERS: OrderFilters = {
  status: [],
  priority_level: [],
  delivery_method: [],
  overdue_only: false,
  has_payment: false,
};

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'delivered', label: 'Delivered', color: 'bg-blue-500' },
  { value: 'failed', label: 'Failed', color: 'bg-red-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-500' },
];

const PRIORITY_LEVELS = [
  { value: 1, label: 'Low (1)', color: 'bg-gray-500' },
  { value: 2, label: 'Normal (2)', color: 'bg-blue-500' },
  { value: 3, label: 'Medium (3)', color: 'bg-yellow-500' },
  { value: 4, label: 'High (4)', color: 'bg-orange-500' },
  { value: 5, label: 'Critical (5)', color: 'bg-red-500' },
];

const DELIVERY_METHODS = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'email', label: 'Email' },
  { value: 'postal', label: 'Postal' },
  { value: 'hand_delivery', label: 'Hand Delivery' },
];

export default function AdvancedOrderFilters({
  filters,
  onFiltersChange,
  onExport,
  events = [],
  className,
}: AdvancedOrderFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<OrderFilters>(filters);
  const [savedFilters, setSavedFilters] = useState<OrderFilters[]>([]);

  // Load saved filters from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lookescolar-order-filters');
      if (saved) {
        setSavedFilters(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  }, []);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateFilter = (key: keyof OrderFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const toggleArrayFilter = (key: keyof OrderFilters, value: any) => {
    const currentArray = (localFilters[key] as any[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const resetFilters = () => {
    const reset = { ...DEFAULT_FILTERS };
    setLocalFilters(reset);
    onFiltersChange(reset);
  };

  const saveCurrentFilters = () => {
    const filterName = prompt('Enter a name for this filter set:');
    if (filterName) {
      const newSavedFilters = [
        ...savedFilters,
        { ...localFilters, _name: filterName } as any
      ];
      setSavedFilters(newSavedFilters);
      localStorage.setItem('lookescolar-order-filters', JSON.stringify(newSavedFilters));
    }
  };

  const loadSavedFilter = (savedFilter: OrderFilters) => {
    const { _name, ...filterData } = savedFilter as any;
    setLocalFilters(filterData);
    onFiltersChange(filterData);
    setIsOpen(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status?.length) count++;
    if (filters.priority_level?.length) count++;
    if (filters.delivery_method?.length) count++;
    if (filters.event_id) count++;
    if (filters.created_after || filters.created_before) count++;
    if (filters.delivery_after || filters.delivery_before) count++;
    if (filters.amount_min || filters.amount_max) count++;
    if (filters.overdue_only) count++;
    if (filters.has_payment) count++;
    if (filters.search_query) count++;
    if (filters.contact_info) count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  return (
    <div className={cn('relative', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant=\"outline\"
            size=\"sm\"
            className={cn(
              'gap-2 relative',
              activeCount > 0 && 'border-primary text-primary'
            )}
          >
            <Filter className=\"h-4 w-4\" />
            Advanced Filters
            {activeCount > 0 && (
              <Badge 
                variant=\"secondary\" 
                className=\"ml-1 h-5 w-5 rounded-full p-0 text-xs\"
              >
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className=\"w-[600px] max-h-[70vh] overflow-y-auto\"
          align=\"end\"
        >
          <Card className=\"border-0 shadow-none\">
            <CardHeader className=\"pb-4\">
              <div className=\"flex items-center justify-between\">
                <CardTitle className=\"text-lg\">Advanced Filters</CardTitle>
                <div className=\"flex gap-2\">
                  <Button
                    variant=\"ghost\"
                    size=\"sm\"
                    onClick={saveCurrentFilters}
                    className=\"gap-1\"
                  >
                    <Save className=\"h-3 w-3\" />
                    Save
                  </Button>
                  <Button
                    variant=\"ghost\"
                    size=\"sm\"
                    onClick={resetFilters}
                    className=\"gap-1\"
                  >
                    <RotateCcw className=\"h-3 w-3\" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className=\"space-y-6\">
              {/* Search Fields */}
              <div className=\"space-y-4\">
                <Label className=\"text-sm font-medium\">Search</Label>
                <div className=\"grid grid-cols-1 gap-3\">
                  <div>
                    <Label className=\"text-xs text-muted-foreground\">General Search</Label>
                    <Input
                      placeholder=\"Search orders, contacts, events...\"
                      value={localFilters.search_query || ''}
                      onChange={(e) => updateFilter('search_query', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className=\"text-xs text-muted-foreground\">Contact Info</Label>
                    <Input
                      placeholder=\"Name, email, phone...\"
                      value={localFilters.contact_info || ''}
                      onChange={(e) => updateFilter('contact_info', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className=\"space-y-3\">
                <Label className=\"text-sm font-medium\">Order Status</Label>
                <div className=\"flex flex-wrap gap-2\">
                  {ORDER_STATUSES.map((status) => (
                    <div key={status.value} className=\"flex items-center space-x-2\">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={localFilters.status?.includes(status.value) || false}
                        onCheckedChange={() => toggleArrayFilter('status', status.value)}
                      />
                      <Label
                        htmlFor={`status-${status.value}`}
                        className=\"flex items-center gap-2 text-sm cursor-pointer\"
                      >
                        <div className={cn('w-2 h-2 rounded-full', status.color)} />
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div className=\"space-y-3\">
                <Label className=\"text-sm font-medium\">Priority Level</Label>
                <div className=\"flex flex-wrap gap-2\">
                  {PRIORITY_LEVELS.map((priority) => (
                    <div key={priority.value} className=\"flex items-center space-x-2\">
                      <Checkbox
                        id={`priority-${priority.value}`}
                        checked={localFilters.priority_level?.includes(priority.value) || false}
                        onCheckedChange={() => toggleArrayFilter('priority_level', priority.value)}
                      />
                      <Label
                        htmlFor={`priority-${priority.value}`}
                        className=\"flex items-center gap-2 text-sm cursor-pointer\"
                      >
                        <div className={cn('w-2 h-2 rounded-full', priority.color)} />
                        {priority.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event Filter */}
              {events.length > 0 && (
                <div className=\"space-y-3\">
                  <Label className=\"text-sm font-medium\">Event</Label>
                  <Select
                    value={localFilters.event_id || ''}
                    onValueChange={(value) => updateFilter('event_id', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder=\"Select event...\" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=\"\">All Events</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name} - {event.school}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Delivery Method Filter */}
              <div className=\"space-y-3\">
                <Label className=\"text-sm font-medium\">Delivery Method</Label>
                <div className=\"flex flex-wrap gap-2\">
                  {DELIVERY_METHODS.map((method) => (
                    <div key={method.value} className=\"flex items-center space-x-2\">
                      <Checkbox
                        id={`delivery-${method.value}`}
                        checked={localFilters.delivery_method?.includes(method.value) || false}
                        onCheckedChange={() => toggleArrayFilter('delivery_method', method.value)}
                      />
                      <Label
                        htmlFor={`delivery-${method.value}`}
                        className=\"text-sm cursor-pointer\"
                      >
                        {method.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amount Range */}
              <div className=\"space-y-3\">
                <Label className=\"text-sm font-medium\">Order Amount (ARS)</Label>
                <div className=\"grid grid-cols-2 gap-3\">
                  <div>
                    <Label className=\"text-xs text-muted-foreground\">Minimum</Label>
                    <Input
                      type=\"number\"
                      placeholder=\"0\"
                      value={localFilters.amount_min || ''}
                      onChange={(e) => updateFilter('amount_min', e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                  <div>
                    <Label className=\"text-xs text-muted-foreground\">Maximum</Label>
                    <Input
                      type=\"number\"
                      placeholder=\"No limit\"
                      value={localFilters.amount_max || ''}
                      onChange={(e) => updateFilter('amount_max', e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                </div>
              </div>

              {/* Date Ranges */}
              <div className=\"grid grid-cols-1 gap-4\">
                {/* Created Date Range */}
                <div className=\"space-y-3\">
                  <Label className=\"text-sm font-medium\">Order Date Range</Label>
                  <div className=\"grid grid-cols-2 gap-3\">
                    <div>
                      <Label className=\"text-xs text-muted-foreground\">From</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant=\"outline\"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !localFilters.created_after && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className=\"mr-2 h-4 w-4\" />
                            {localFilters.created_after
                              ? format(new Date(localFilters.created_after), 'PPP')
                              : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className=\"w-auto p-0\">
                          <Calendar
                            mode=\"single\"
                            selected={localFilters.created_after ? new Date(localFilters.created_after) : undefined}
                            onSelect={(date) => updateFilter('created_after', date?.toISOString())}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label className=\"text-xs text-muted-foreground\">To</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant=\"outline\"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !localFilters.created_before && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className=\"mr-2 h-4 w-4\" />
                            {localFilters.created_before
                              ? format(new Date(localFilters.created_before), 'PPP')
                              : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className=\"w-auto p-0\">
                          <Calendar
                            mode=\"single\"
                            selected={localFilters.created_before ? new Date(localFilters.created_before) : undefined}
                            onSelect={(date) => updateFilter('created_before', date?.toISOString())}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>

              {/* Special Filters */}
              <div className=\"space-y-3\">
                <Label className=\"text-sm font-medium\">Special Filters</Label>
                <div className=\"space-y-2\">
                  <div className=\"flex items-center space-x-2\">
                    <Checkbox
                      id=\"overdue-only\"
                      checked={localFilters.overdue_only || false}
                      onCheckedChange={(checked) => updateFilter('overdue_only', checked)}
                    />
                    <Label htmlFor=\"overdue-only\" className=\"text-sm cursor-pointer\">
                      Show only overdue orders
                    </Label>
                  </div>
                  <div className=\"flex items-center space-x-2\">
                    <Checkbox
                      id=\"has-payment\"
                      checked={localFilters.has_payment || false}
                      onCheckedChange={(checked) => updateFilter('has_payment', checked)}
                    />
                    <Label htmlFor=\"has-payment\" className=\"text-sm cursor-pointer\">
                      Only orders with payment information
                    </Label>
                  </div>
                </div>
              </div>

              {/* Saved Filters */}
              {savedFilters.length > 0 && (
                <div className=\"space-y-3\">
                  <Label className=\"text-sm font-medium\">Saved Filters</Label>
                  <div className=\"space-y-2 max-h-32 overflow-y-auto\">
                    {savedFilters.map((savedFilter, index) => (
                      <div key={index} className=\"flex items-center justify-between p-2 border rounded\">
                        <span className=\"text-sm\">{(savedFilter as any)._name}</span>
                        <div className=\"flex gap-2\">
                          <Button
                            variant=\"ghost\"
                            size=\"sm\"
                            onClick={() => loadSavedFilter(savedFilter)}
                          >
                            Load
                          </Button>
                          <Button
                            variant=\"ghost\"
                            size=\"sm\"
                            onClick={() => {
                              const newSaved = savedFilters.filter((_, i) => i !== index);
                              setSavedFilters(newSaved);
                              localStorage.setItem('lookescolar-order-filters', JSON.stringify(newSaved));
                            }}
                          >
                            <X className=\"h-3 w-3\" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className=\"flex justify-between pt-4 border-t\">
                <div className=\"flex gap-2\">
                  {onExport && (
                    <Button
                      variant=\"outline\"
                      size=\"sm\"
                      onClick={() => onExport(localFilters)}
                      className=\"gap-2\"
                    >
                      <Download className=\"h-4 w-4\" />
                      Export Filtered
                    </Button>
                  )}
                </div>
                <div className=\"flex gap-2\">
                  <Button
                    variant=\"outline\"
                    size=\"sm\"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size=\"sm\"
                    onClick={applyFilters}
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}
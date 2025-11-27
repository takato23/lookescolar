'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, Folder, Search } from 'lucide-react';

// =============================================================================
// FILTER CHIP - Pill button for filtering
// =============================================================================

interface FilterChipProps {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
}

export function FilterChip({ label, count, active, onClick, icon: Icon }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn('clean-filter-chip', active && 'clean-filter-chip--active')}
    >
      {Icon && <Icon className="clean-filter-icon" />}
      {label}
      {count !== undefined && count > 0 && (
        <span className="clean-filter-count">{count}</span>
      )}
    </button>
  );
}

// =============================================================================
// STAT CARD - Minimalist metric card
// =============================================================================

interface CleanStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
}

export function CleanStatCard({ label, value, icon: Icon, trend, description }: CleanStatCardProps) {
  return (
    <div className="clean-stat-card">
      <div className="clean-stat-icon">
        <Icon className="w-5 h-5" />
      </div>
      <div className="clean-stat-content">
        <span className="clean-stat-value">{value}</span>
        <span className="clean-stat-label">{label}</span>
        {description && <span className="clean-stat-description">{description}</span>}
      </div>
      {trend && trend !== 'neutral' && (
        <div className={cn(
          'clean-stat-trend',
          trend === 'up' && 'clean-stat-trend--up',
          trend === 'down' && 'clean-stat-trend--down'
        )}>
          {trend === 'up' ? '↑' : '↓'}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PAGE HEADER - Title + actions
// =============================================================================

interface CleanPageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function CleanPageHeader({ title, subtitle, children }: CleanPageHeaderProps) {
  return (
    <div className="clean-page-header">
      <div>
        <h1 className="clean-page-title">{title}</h1>
        {subtitle && <p className="clean-page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="clean-page-actions">{children}</div>}
    </div>
  );
}

// =============================================================================
// EMPTY STATE - Generic empty state with icon and CTA
// =============================================================================

interface CleanEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function CleanEmptyState({
  icon: Icon = Folder,
  title,
  description,
  action
}: CleanEmptyStateProps) {
  return (
    <div className="clean-empty">
      <Icon className="clean-empty-icon" />
      <h3 className="clean-empty-title">{title}</h3>
      <p className="clean-empty-description">{description}</p>
      {action}
    </div>
  );
}

// =============================================================================
// STATUS BADGE - Status with dot indicator
// =============================================================================

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'muted' | 'draft' | 'active' | 'published' | 'inactive';

interface CleanStatusBadgeProps {
  status: StatusVariant;
  label: string;
}

export function CleanStatusBadge({ status, label }: CleanStatusBadgeProps) {
  const statusClass = `clean-status--${status}`;

  return (
    <span className={cn('clean-status', statusClass)}>
      <span className="clean-status-dot" />
      {label}
    </span>
  );
}

// =============================================================================
// CARD - Base card with hover effect
// =============================================================================

interface CleanCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function CleanCard({ children, className, onClick, hoverable = true }: CleanCardProps) {
  return (
    <div
      className={cn(
        'clean-card',
        hoverable && 'clean-card--hoverable',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// =============================================================================
// SEARCH INPUT - Styled search input
// =============================================================================

interface CleanSearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CleanSearchInput({
  placeholder = 'Buscar...',
  value,
  onChange,
  className
}: CleanSearchInputProps) {
  return (
    <div className={cn('clean-search-input', className)}>
      <Search className="clean-search-input-icon" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="clean-search-input-field"
      />
    </div>
  );
}

// =============================================================================
// DROPDOWN SELECT - Clean styled dropdown
// =============================================================================

interface DropdownOption {
  value: string;
  label: string;
}

interface CleanDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CleanDropdown({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  className
}: CleanDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn('clean-dropdown', className)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// =============================================================================
// LOADING SPINNER - Clean loading indicator
// =============================================================================

export function CleanLoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('clean-spinner', className)}>
      <div className="clean-spinner-dot" />
      <div className="clean-spinner-dot" />
      <div className="clean-spinner-dot" />
    </div>
  );
}

// =============================================================================
// AVATAR - User avatar with initials fallback
// =============================================================================

interface CleanAvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CleanAvatar({ name, src, size = 'md' }: CleanAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div className={cn('clean-avatar', sizeClasses[size])}>
      {src ? (
        <img src={src} alt={name} className="clean-avatar-img" />
      ) : (
        <span className="clean-avatar-initials">{initials}</span>
      )}
    </div>
  );
}

// =============================================================================
// GRID - Responsive grid layout
// =============================================================================

interface CleanGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
}

export function CleanGrid({ children, cols = 3, gap = 'md' }: CleanGridProps) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={cn('grid', colClasses[cols], gapClasses[gap])}>
      {children}
    </div>
  );
}

// =============================================================================
// BULK ACTIONS BAR - Floating bar for selected items
// =============================================================================

interface CleanBulkActionsProps {
  selectedCount: number;
  onClear: () => void;
  children: ReactNode;
}

export function CleanBulkActions({ selectedCount, onClear, children }: CleanBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="clean-bulk-actions">
      <span className="clean-bulk-count">
        {selectedCount} {selectedCount === 1 ? 'seleccionado' : 'seleccionados'}
      </span>
      <div className="clean-bulk-buttons">{children}</div>
      <button onClick={onClear} className="clean-bulk-clear">
        Cancelar
      </button>
    </div>
  );
}

// =============================================================================
// MODAL - Clean modal dialog
// =============================================================================

interface CleanModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function CleanModal({ open, onClose, title, children, size = 'md' }: CleanModalProps) {
  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="clean-modal-overlay" onClick={onClose}>
      <div
        className={cn('clean-modal', sizeClasses[size])}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="clean-modal-header">
          <h2 className="clean-modal-title">{title}</h2>
          <button onClick={onClose} className="clean-modal-close">
            ×
          </button>
        </div>
        <div className="clean-modal-content">{children}</div>
      </div>
    </div>
  );
}

// =============================================================================
// SKELETON LOADER - Animated loading placeholder
// =============================================================================

interface CleanSkeletonProps {
  variant?: 'text' | 'text-sm' | 'text-lg' | 'avatar' | 'card' | 'stat' | 'image' | 'rect';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function CleanSkeleton({ variant = 'rect', width, height, className }: CleanSkeletonProps) {
  const variantClasses = {
    'text': 'clean-skeleton clean-skeleton--text',
    'text-sm': 'clean-skeleton clean-skeleton--text-sm',
    'text-lg': 'clean-skeleton clean-skeleton--text-lg',
    'avatar': 'clean-skeleton clean-skeleton--avatar',
    'card': 'clean-skeleton clean-skeleton--card',
    'stat': 'clean-skeleton clean-skeleton--stat',
    'image': 'clean-skeleton clean-skeleton--image',
    'rect': 'clean-skeleton',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return <div className={cn(variantClasses[variant], className)} style={style} />;
}

// Skeleton Card - Pre-built card skeleton
export function CleanSkeletonCard() {
  return (
    <div className="clean-skeleton-card clean-card-animated">
      <div className="clean-skeleton-card-header">
        <CleanSkeleton variant="avatar" />
        <div style={{ flex: 1 }}>
          <CleanSkeleton variant="text" width="70%" />
          <CleanSkeleton variant="text-sm" width="50%" />
        </div>
      </div>
      <div className="clean-skeleton-card-body">
        <CleanSkeleton variant="text" />
        <CleanSkeleton variant="text" width="85%" />
        <CleanSkeleton variant="text-sm" />
      </div>
      <div className="clean-skeleton-card-footer">
        <CleanSkeleton width={60} height={24} />
        <CleanSkeleton width={80} height={32} />
      </div>
    </div>
  );
}

// Skeleton Stat Card
export function CleanSkeletonStat() {
  return (
    <div className="clean-stat-card">
      <div className="clean-stat-icon">
        <CleanSkeleton variant="avatar" className="w-8 h-8" />
      </div>
      <div className="clean-stat-content">
        <CleanSkeleton variant="text-lg" width={60} />
        <CleanSkeleton variant="text-sm" width={80} />
      </div>
    </div>
  );
}

// Skeleton Grid - Multiple skeleton cards
interface CleanSkeletonGridProps {
  count?: number;
  type?: 'card' | 'stat';
  cols?: 2 | 3 | 4 | 5;
}

export function CleanSkeletonGrid({ count = 6, type = 'card', cols }: CleanSkeletonGridProps) {
  const Component = type === 'stat' ? CleanSkeletonStat : CleanSkeletonCard;
  const gridClass = type === 'stat' ? 'clean-stats-grid' : 'clean-skeleton-grid';
  const colsClass = cols ? `clean-grid--${cols}` : '';

  return (
    <div className={cn(gridClass, colsClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </div>
  );
}

// =============================================================================
// TOOLTIP - Hover information wrapper
// =============================================================================

interface CleanTooltipProps {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function CleanTooltip({ children, content, position = 'top' }: CleanTooltipProps) {
  const positionClasses = {
    top: '',
    bottom: 'clean-tooltip--bottom',
    left: 'clean-tooltip--left',
    right: 'clean-tooltip--right',
  };

  return (
    <div className={cn('clean-tooltip', positionClasses[position])} data-tooltip={content}>
      {children}
    </div>
  );
}

// =============================================================================
// PROGRESS BAR - Loading/progress indicator
// =============================================================================

interface CleanProgressProps {
  value?: number; // 0-100, undefined for indeterminate
  className?: string;
  animated?: boolean;
}

export function CleanProgress({ value, className, animated }: CleanProgressProps) {
  const isIndeterminate = value === undefined;

  return (
    <div className={cn('clean-progress', isIndeterminate && 'clean-progress-indeterminate', className)}>
      <div
        className={cn('clean-progress-bar', animated && 'clean-progress-bar--animated')}
        style={!isIndeterminate ? { width: `${Math.min(100, Math.max(0, value))}%` } : undefined}
      />
    </div>
  );
}

// =============================================================================
// LOADING DOTS - Alternative loading indicator
// =============================================================================

export function CleanLoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('clean-loading-dots', className)}>
      <div className="clean-loading-dot" />
      <div className="clean-loading-dot" />
      <div className="clean-loading-dot" />
    </div>
  );
}

// =============================================================================
// ICON BUTTON WITH TOOLTIP - Action button with hover info
// =============================================================================

interface CleanIconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  tooltip?: string;
  variant?: 'default' | 'ghost' | 'danger' | 'success' | 'primary' | 'info';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  animated?: boolean;
}

export function CleanIconButton({
  icon: Icon,
  onClick,
  tooltip,
  variant = 'default',
  size = 'md',
  disabled,
  className,
  animated = true,
}: CleanIconButtonProps) {
  const variantClasses = {
    default: 'clean-icon-btn',
    ghost: 'clean-icon-btn clean-icon-btn--ghost',
    danger: 'clean-icon-btn clean-icon-btn--danger',
    success: 'clean-icon-btn clean-icon-btn--success',
    primary: 'clean-icon-btn clean-icon-btn--primary',
    info: 'clean-icon-btn clean-icon-btn--info',
  };

  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const button = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        variantClasses[variant],
        sizeClasses[size],
        animated && 'clean-icon-btn-animated',
        className
      )}
    >
      <Icon className={iconSizes[size]} />
    </button>
  );

  if (tooltip) {
    return (
      <CleanTooltip content={tooltip}>
        {button}
      </CleanTooltip>
    );
  }

  return button;
}

// =============================================================================
// ANIMATED CARD WRAPPER - Adds animation to cards
// =============================================================================

interface CleanAnimatedCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  index?: number;
  onClick?: () => void;
}

export function CleanAnimatedCard({ children, className, hover = true, index, onClick }: CleanAnimatedCardProps) {
  return (
    <div
      className={cn(
        'clean-card-animated',
        hover && 'clean-card-hover',
        onClick && 'cursor-pointer',
        className
      )}
      style={index !== undefined ? { animationDelay: `${index * 50}ms` } : undefined}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

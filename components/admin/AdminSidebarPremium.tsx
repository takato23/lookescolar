'use client'

import { useState, useEffect, useCallback, memo, useRef, useMemo, type ComponentType } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  LucideIcon,
  X,
  ChevronDown,
  ChevronRight,
  Activity,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useResolvedTheme } from '@/components/providers/theme-provider'
import {
  DashboardIcon,
  EventsIcon,
  FoldersIcon,
  OrdersIcon,
  QrIcon,
  SettingsIcon,
} from '@/components/ui/icons/LiquidIcons'
import { AperturaLogo } from '@/components/ui/branding/AperturaLogo'
import { useBrandingData } from '@/lib/hooks/useTenantBranding'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon | ComponentType<{ size?: number; className?: string }>
  description?: string
  badge?: string | number
  shortcut?: string
  isLiquidIcon?: boolean
}

// Keyboard navigation constants
const KEYS = {
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  HOME: 'Home',
  END: 'End',
  ESCAPE: 'Escape',
  ENTER: 'Enter',
  SPACE: ' ',
} as const

// Main navigation items
const mainNavItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: DashboardIcon,
    description: 'Resumen general',
    shortcut: '⌘1',
    isLiquidIcon: true,
  },
  {
    href: '/admin/events',
    label: 'Eventos',
    icon: EventsIcon,
    description: 'Gestionar eventos',
    shortcut: '⌘2',
    isLiquidIcon: true,
  },
  {
    href: '/admin/photos',
    label: 'Fotos',
    icon: FoldersIcon,
    description: 'Galería y carpetas',
    shortcut: '⌘3',
    isLiquidIcon: true,
  },
  {
    href: '/admin/publish',
    label: 'Publicar',
    icon: QrIcon,
    description: 'Compartir con clientes',
    shortcut: '⌘5',
    isLiquidIcon: true,
  },
  {
    href: '/admin/orders',
    label: 'Pedidos',
    icon: OrdersIcon,
    description: 'Ventas y entregas',
    shortcut: '⌘4',
    isLiquidIcon: true,
  },
  {
    href: '/admin/settings',
    label: 'Ajustes',
    icon: SettingsIcon,
    description: 'Sistema',
    shortcut: '⌘7',
    isLiquidIcon: true,
  },
]

// Stable orb configuration - prevents hydration mismatch
const ORB_CONFIG = [
  {
    id: 'primary',
    width: 'w-64',
    height: 'h-64',
    blur: 'blur-3xl',
    opacity: 'opacity-20',
    gradient: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)',
    position: { top: '-10%', left: '-10%' },
    animation: 'floatOrb 15s ease-in-out infinite',
    delay: '0s',
  },
  {
    id: 'secondary',
    width: 'w-48',
    height: 'h-48',
    blur: 'blur-3xl',
    opacity: 'opacity-15',
    gradient: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)',
    position: { bottom: '20%', right: '-15%' },
    animation: 'floatOrb 20s ease-in-out infinite reverse',
    delay: '-5s',
  },
  {
    id: 'accent',
    width: 'w-32',
    height: 'h-32',
    blur: 'blur-2xl',
    opacity: 'opacity-10',
    gradient: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)',
    position: { top: '50%', left: '30%' },
    animation: 'floatOrb 12s ease-in-out infinite',
    delay: '-3s',
  },
] as const

// Floating orb background component
const FloatingOrbs = memo(function FloatingOrbs({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {ORB_CONFIG.map((orb) => (
        <div
          key={orb.id}
          className={cn('absolute rounded-full', orb.width, orb.height, orb.blur, orb.opacity)}
          style={{
            background: orb.gradient,
            ...orb.position,
            animation: reducedMotion ? 'none' : orb.animation,
            animationDelay: reducedMotion ? '0s' : orb.delay,
          }}
        />
      ))}
    </div>
  )
})

// Nav item component with premium effects
const NavItemPremium = memo(function NavItemPremium({
  item,
  isActive,
  isCollapsed,
  theme,
  onClick,
  isFocused,
  reducedMotion,
  tabIndex,
  onKeyDown,
  setRef,
}: {
  item: NavItem
  isActive: boolean
  isCollapsed: boolean
  theme: string | undefined
  onClick?: () => void
  isFocused?: boolean
  reducedMotion?: boolean
  tabIndex?: number
  onKeyDown?: (e: React.KeyboardEvent) => void
  setRef?: (el: HTMLAnchorElement | null) => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const Icon = item.icon
  const isLight = theme === 'light'

  // Memoized ARIA description
  const ariaDescription = useMemo(() => {
    const parts = [item.description]
    if (item.badge) parts.push(`${item.badge} pendientes`)
    if (item.shortcut) parts.push(`Atajo: ${item.shortcut}`)
    return parts.filter(Boolean).join('. ')
  }, [item.description, item.badge, item.shortcut])

  return (
    <li role="none">
      <Link
        ref={setRef}
        href={item.href}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="menuitem"
        tabIndex={tabIndex}
        aria-current={isActive ? 'page' : undefined}
        aria-describedby={ariaDescription ? `nav-desc-${item.href.replace(/\//g, '-')}` : undefined}
        className={cn(
          'group relative flex items-center rounded-xl',
          reducedMotion ? 'transition-none' : 'transition-all duration-300',
          isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5',
          // Base styles
          isLight
            ? isActive
              ? 'bg-white shadow-lg shadow-indigo-500/10'
              : 'hover:bg-white/60'
            : isActive
              ? 'bg-white/10 backdrop-blur-md shadow-lg shadow-white/5'
              : 'hover:bg-white/5',
          // Transform - only if motion allowed
          !reducedMotion && isHovered && !isActive && 'transform -translate-y-0.5',
          // Focus ring
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          isLight
            ? 'focus-visible:ring-indigo-500 focus-visible:ring-offset-white'
            : 'focus-visible:ring-white/60 focus-visible:ring-offset-neutral-900',
          // Programmatic focus indicator
          isFocused && (isLight ? 'ring-2 ring-indigo-500' : 'ring-2 ring-white/60')
        )}
        title={isCollapsed ? item.label : undefined}
      >
        {/* Hidden description for screen readers */}
        {ariaDescription && (
          <span id={`nav-desc-${item.href.replace(/\//g, '-')}`} className="sr-only">
            {ariaDescription}
          </span>
        )}

        {/* Active indicator glow - only if motion allowed */}
        {isActive && !reducedMotion && (
          <div
            className={cn(
              'absolute inset-0 rounded-xl opacity-50 blur-xl -z-10',
              isLight ? 'bg-indigo-500/20' : 'bg-white/10'
            )}
            aria-hidden="true"
          />
        )}

        {/* Hover gradient - only if motion allowed */}
        {isHovered && !isActive && !reducedMotion && (
          <div
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
            aria-hidden="true"
          />
        )}

        {/* Icon container */}
        <div
          className={cn(
            'relative flex items-center justify-center rounded-lg',
            reducedMotion ? 'transition-none' : 'transition-all duration-300',
            isCollapsed ? 'p-2' : 'p-1.5',
            isLight
              ? isActive
                ? 'bg-indigo-100'
                : 'bg-neutral-100/80 group-hover:bg-white'
              : isActive
                ? 'bg-white/15'
                : 'bg-white/5 group-hover:bg-white/10'
          )}
        >
          <Icon
            className={cn(
              reducedMotion ? 'transition-none' : 'transition-all duration-300',
              isCollapsed ? 'h-5 w-5' : 'h-4 w-4',
              isLight
                ? isActive
                  ? 'text-indigo-600'
                  : 'text-neutral-600 group-hover:text-neutral-900'
                : isActive
                  ? 'text-white'
                  : 'text-white/70 group-hover:text-white',
              !reducedMotion && isActive && 'scale-110'
            )}
            aria-hidden="true"
          />
        </div>

        {/* Label and description */}
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <span
              className={cn(
                'block text-sm font-medium truncate',
                reducedMotion ? 'transition-none' : 'transition-colors duration-300',
                isLight
                  ? isActive
                    ? 'text-neutral-900'
                    : 'text-neutral-700 group-hover:text-neutral-900'
                  : isActive
                    ? 'text-white'
                    : 'text-white/70 group-hover:text-white'
              )}
            >
              {item.label}
            </span>
            {item.description && (
              <span
                className={cn(
                  'block text-[10px] truncate',
                  reducedMotion ? 'transition-none' : 'transition-colors duration-300',
                  isLight
                    ? 'text-neutral-500'
                    : isActive
                      ? 'text-white/60'
                      : 'text-white/40 group-hover:text-white/60'
                )}
                aria-hidden="true"
              >
                {item.description}
              </span>
            )}
          </div>
        )}

        {/* Badge */}
        {item.badge && !isCollapsed && (
          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-semibold rounded-full',
              isLight
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white/15 text-white'
            )}
            aria-label={`${item.badge} elementos pendientes`}
          >
            {item.badge}
          </span>
        )}

        {/* Active dot - only if motion allowed */}
        {isActive && (
          <div
            className={cn(
              'absolute right-2 w-1.5 h-1.5 rounded-full',
              !reducedMotion && 'animate-pulse',
              isLight ? 'bg-indigo-500' : 'bg-emerald-400',
              isCollapsed && 'right-1'
            )}
            aria-hidden="true"
          />
        )}

        {/* Shortcut hint */}
        {item.shortcut && !isCollapsed && isHovered && (
          <span
            className={cn(
              'absolute right-2 text-[9px] font-mono px-1.5 py-0.5 rounded',
              isLight
                ? 'bg-neutral-100 text-neutral-500'
                : 'bg-white/10 text-white/50'
            )}
            aria-hidden="true"
          >
            {item.shortcut}
          </span>
        )}
      </Link>
    </li>
  )
})

// Stats card mini component
const StatsCardMini = memo(function StatsCardMini({
  value,
  label,
  icon: Icon,
  theme,
  reducedMotion,
}: {
  value: string | number
  label: string
  icon: LucideIcon
  theme: string | undefined
  reducedMotion?: boolean
}) {
  const isLight = theme === 'light'

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl p-3',
        reducedMotion ? 'transition-none' : 'transition-all duration-300',
        !reducedMotion && 'hover:-translate-y-0.5 hover:shadow-md',
        isLight
          ? 'bg-white/80 hover:bg-white shadow-sm'
          : 'bg-white/5 hover:bg-white/10 backdrop-blur-sm'
      )}
      role="group"
      aria-label={`${label}: ${value}`}
    >
      {/* Gradient hover effect - only if motion allowed */}
      {!reducedMotion && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      <div className="relative flex items-center justify-between">
        <div>
          <div
            className={cn(
              'text-xl font-bold tabular-nums',
              isLight ? 'text-neutral-900' : 'text-white'
            )}
          >
            {value}
          </div>
          <div
            className={cn(
              'text-[9px] font-semibold uppercase tracking-widest',
              isLight ? 'text-neutral-500' : 'text-white/50'
            )}
          >
            {label}
          </div>
        </div>
        <Icon
          className={cn(
            'h-4 w-4',
            reducedMotion ? 'transition-none' : 'transition-transform duration-300 group-hover:scale-110',
            isLight ? 'text-neutral-400' : 'text-white/40'
          )}
          aria-hidden="true"
        />
      </div>
    </div>
  )
})

interface AdminSidebarPremiumProps {
  isMobileOpen?: boolean
  onMobileToggle?: () => void
  /** Disable animations for reduced motion preference */
  reducedMotion?: boolean
}

export default function AdminSidebarPremium({
  isMobileOpen = false,
  onMobileToggle,
  reducedMotion: reducedMotionProp,
}: AdminSidebarPremiumProps) {
  const pathname = usePathname()
  const theme = useResolvedTheme()
  const { branding } = useBrandingData()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(reducedMotionProp ?? false)

  const sidebarRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLUListElement>(null)
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([])

  // Check for prefers-reduced-motion
  useEffect(() => {
    if (reducedMotionProp !== undefined) {
      setPrefersReducedMotion(reducedMotionProp)
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [reducedMotionProp])

  useEffect(() => {
    setIsOpen(isMobileOpen)
  }, [isMobileOpen])

  // Keyboard shortcut handler for global navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + number shortcuts
      if ((e.metaKey || e.ctrlKey) && /^[1-7]$/.test(e.key)) {
        const index = parseInt(e.key) - 1
        if (index < mainNavItems.length) {
          e.preventDefault()
          navItemRefs.current[index]?.click()
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Focus management when mobile sidebar opens
  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      // Focus first nav item when sidebar opens on mobile
      const firstNavItem = navItemRefs.current[0]
      if (firstNavItem) {
        setTimeout(() => firstNavItem.focus(), 100)
      }
    }
  }, [isOpen])

  const isActive = useCallback(
    (href: string) => {
      if (href === '/admin') {
        return pathname === '/admin'
      }
      return pathname.startsWith(href)
    },
    [pathname]
  )

  const handleLinkClick = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && onMobileToggle) {
      onMobileToggle()
    }
  }, [onMobileToggle])

  // Keyboard navigation handler for nav items
  const handleNavKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    const itemCount = mainNavItems.length

    switch (e.key) {
      case KEYS.ARROW_DOWN:
        e.preventDefault()
        const nextIndex = (index + 1) % itemCount
        setFocusedIndex(nextIndex)
        navItemRefs.current[nextIndex]?.focus()
        break
      case KEYS.ARROW_UP:
        e.preventDefault()
        const prevIndex = (index - 1 + itemCount) % itemCount
        setFocusedIndex(prevIndex)
        navItemRefs.current[prevIndex]?.focus()
        break
      case KEYS.HOME:
        e.preventDefault()
        setFocusedIndex(0)
        navItemRefs.current[0]?.focus()
        break
      case KEYS.END:
        e.preventDefault()
        setFocusedIndex(itemCount - 1)
        navItemRefs.current[itemCount - 1]?.focus()
        break
      case KEYS.ESCAPE:
        if (isOpen && onMobileToggle) {
          e.preventDefault()
          onMobileToggle()
        }
        break
    }
  }, [isOpen, onMobileToggle])

  // Handle blur to reset focus index
  const handleNavBlur = useCallback(() => {
    // Delay to allow focus to move to another nav item
    setTimeout(() => {
      if (!navRef.current?.contains(document.activeElement)) {
        setFocusedIndex(-1)
      }
    }, 0)
  }, [])

  const isLight = theme === 'light'

  // Memoized active index for initial focus
  const activeIndex = useMemo(() => {
    return mainNavItems.findIndex(item =>
      item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
    )
  }, [pathname])

  return (
    <>
      {/* Mobile Overlay with blur */}
      {isOpen && (
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/40 backdrop-blur-md lg:hidden',
            !prefersReducedMotion && 'animate-fade-in'
          )}
          onClick={onMobileToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex min-h-screen flex-col lg:static',
          prefersReducedMotion ? 'transition-none' : 'transition-all duration-500 ease-out',
          // Width
          isCollapsed ? 'w-20' : 'w-72',
          // Transform for mobile
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Background and border based on theme
          isLight
            ? 'bg-gradient-to-b from-white/95 via-neutral-50/95 to-white/95 border-r border-neutral-200/50'
            : 'bg-gradient-to-b from-neutral-950/95 via-neutral-900/95 to-neutral-950/95 border-r border-white/5',
          // Backdrop blur
          'backdrop-blur-xl',
          // Shadow
          isLight ? 'shadow-xl shadow-neutral-900/5' : 'shadow-2xl shadow-black/50'
        )}
        role="navigation"
        aria-label="Navegación principal del panel de administración"
        aria-hidden={!isOpen && typeof window !== 'undefined' && window.innerWidth < 1024 ? true : undefined}
      >
        {/* Floating orbs background (dark mode only) */}
        {!isLight && <FloatingOrbs reducedMotion={prefersReducedMotion} />}

        {/* Mobile Header */}
        <div
          className={cn(
            'flex items-center justify-between border-b p-4 lg:hidden',
            isLight ? 'border-neutral-200 bg-white' : 'border-white/10 bg-neutral-900'
          )}
        >
          <h2
            className={cn(
              'text-lg font-semibold',
              isLight ? 'text-neutral-900' : 'text-white'
            )}
          >
            Navegación
          </h2>
          <button
            onClick={onMobileToggle}
            className={cn(
              'rounded-full p-2 transition-all duration-200 active:scale-90',
              isLight
                ? 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            )}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Header */}
        <div
          className={cn(
            'relative border-b p-5 transition-all duration-300',
            isCollapsed ? 'px-3' : 'px-5',
            isLight ? 'border-neutral-200/50' : 'border-white/5'
          )}
        >
          <div className="flex items-center justify-between mb-5">
            {/* Logo and title */}
            <div
              className={cn(
                'flex items-center gap-3 transition-all duration-300',
                isCollapsed ? 'justify-center' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'relative flex items-center justify-center rounded-xl transition-all duration-300',
                  isCollapsed ? 'h-10 w-10' : 'h-12 w-12',
                  isLight
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25'
                    : 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10'
                )}
              >
                {branding.logoUrl ? (
                  <Image
                    src={branding.logoUrl}
                    alt={branding.appName}
                    width={isCollapsed ? 24 : 32}
                    height={isCollapsed ? 24 : 32}
                    className="object-contain transition-transform duration-200 hover:scale-110"
                  />
                ) : (
                  <AperturaLogo
                    variant={isLight ? 'white' : 'white'}
                    size={isCollapsed ? 'sm' : 'md'}
                    className="transition-transform duration-200 hover:scale-110"
                  />
                )}
                {/* Sparkle effect */}
                <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-400 animate-pulse" />
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <h1
                    className={cn(
                      'text-lg font-bold tracking-tight transition-all duration-300',
                      isLight ? 'text-neutral-900' : 'text-white'
                    )}
                  >
                    {branding.appName}
                  </h1>
                  <p
                    className={cn(
                      'text-[10px] font-medium transition-all duration-300',
                      isLight ? 'text-neutral-500' : 'text-white/50'
                    )}
                  >
                    {branding.appSubtitle}
                  </p>
                </div>
              )}
            </div>

            {/* Collapse button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                'hidden lg:flex items-center justify-center rounded-lg transition-all duration-200 active:scale-90',
                isCollapsed ? 'h-8 w-8' : 'h-9 w-9',
                isLight
                  ? 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700'
                  : 'text-white/40 hover:bg-white/10 hover:text-white'
              )}
              aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Quick stats */}
          {!isCollapsed && (
            <div className="grid grid-cols-2 gap-2" role="region" aria-label="Estadísticas rápidas">
              <StatsCardMini
                value="12"
                label="Eventos"
                icon={Activity}
                theme={theme}
                reducedMotion={prefersReducedMotion}
              />
              <StatsCardMini
                value="847"
                label="Fotos"
                icon={BarChart3}
                theme={theme}
                reducedMotion={prefersReducedMotion}
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            'flex-1 overflow-y-auto',
            prefersReducedMotion ? 'transition-none' : 'transition-all duration-300',
            isCollapsed ? 'px-2 py-4' : 'px-4 py-6'
          )}
          aria-label="Menú de navegación"
        >
          {/* Section label */}
          {!isCollapsed && (
            <div className="mb-4 px-3">
              <h2
                id="nav-section-label"
                className={cn(
                  'text-[10px] font-bold uppercase tracking-widest',
                  isLight ? 'text-neutral-400' : 'text-white/40'
                )}
              >
                Navegación
              </h2>
            </div>
          )}

          {/* Nav items */}
          <ul
            ref={navRef}
            className="space-y-1"
            role="menu"
            aria-labelledby={!isCollapsed ? 'nav-section-label' : undefined}
            onBlur={handleNavBlur}
          >
            {mainNavItems.map((item, index) => {
              // Create a stable ref callback for each item
              const setRef = (el: HTMLAnchorElement | null) => {
                navItemRefs.current[index] = el
              }

              return (
                <NavItemPremium
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  isCollapsed={isCollapsed}
                  theme={theme}
                  onClick={handleLinkClick}
                  isFocused={focusedIndex === index}
                  reducedMotion={prefersReducedMotion}
                  tabIndex={index === (activeIndex >= 0 ? activeIndex : 0) ? 0 : -1}
                  onKeyDown={(e) => handleNavKeyDown(e, index)}
                  setRef={setRef}
                />
              )
            })}
          </ul>

          {/* Screen reader instructions */}
          <div className="sr-only" aria-live="polite">
            Use las teclas de flecha para navegar. Home para ir al inicio, End para ir al final.
            Use Ctrl/Cmd + número (1-7) para acceder directamente a las secciones.
          </div>
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div
            className={cn(
              'hidden border-t p-4 lg:block',
              isLight ? 'border-neutral-200/50 bg-neutral-50/50' : 'border-white/5 bg-white/[0.02]'
            )}
          >
            <div
              className={cn(
                'rounded-xl p-4 text-center transition-all duration-300',
                isLight
                  ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100'
                  : 'bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10'
              )}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-emerald-500" />
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isLight ? 'text-neutral-800' : 'text-white'
                  )}
                >
                  Sistema Activo
                </span>
              </div>
              <p
                className={cn(
                  'text-[10px] mb-3',
                  isLight ? 'text-neutral-600' : 'text-white/50'
                )}
              >
                {branding.tagline}
              </p>
              <div className="flex items-center justify-center gap-1.5">
                <span
                  className={cn(
                    'text-[9px] font-medium px-2 py-0.5 rounded-full',
                    isLight
                      ? 'bg-neutral-100 text-neutral-600'
                      : 'bg-white/10 text-white/60'
                  )}
                >
                  v2.0.0
                </span>
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Seguro
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

export { AdminSidebarPremium }

'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Camera,
  Users,
  Tag,
  Package,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  Activity,
  BarChart3,
  Upload,
  FolderOpen,
  Search,
  Command,
  Keyboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDashboardStats } from './hooks/useDashboardStats';
import { cn } from '@/lib/utils/cn';

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  href: string;
  badge?: number;
  children?: SidebarItem[];
  shortcut?: string;
}

interface ProSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ProSidebar({
  collapsed = false,
  onToggleCollapse,
}: ProSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(['workflow']);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { pendingOrders, activeEvents, todayUploads } = useDashboardStats();

  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/admin',
      shortcut: '⌘+D',
    },
    {
      id: 'workflow',
      label: 'Workflow',
      icon: Activity,
      href: '#',
      children: [
        {
          id: 'events',
          label: 'Eventos',
          icon: Calendar,
          href: '/admin/events',
          badge: activeEvents,
          shortcut: '⌘+E',
        },
        {
          id: 'photos',
          label: 'Fotos',
          icon: Camera,
          href: '/admin/photos',
          shortcut: '⌘+P',
        },
        {
          id: 'upload',
          label: 'Subir Fotos',
          icon: Upload,
          href: '/admin/photos?action=upload',
          badge: todayUploads > 0 ? todayUploads : undefined,
          shortcut: '⌘+U',
        },
        {
          id: 'tagging',
          label: 'Etiquetar',
          icon: Tag,
          href: '/admin/tagging',
          shortcut: '⌘+T',
        },
      ],
    },
    {
      id: 'management',
      label: 'Gestión',
      icon: FolderOpen,
      href: '#',
      children: [
        {
          id: 'subjects',
          label: 'Alumnos',
          icon: Users,
          href: '/admin/subjects',
          shortcut: '⌘+A',
        },
        {
          id: 'orders',
          label: 'Pedidos',
          icon: Package,
          href: '/admin/orders',
          badge: pendingOrders,
          shortcut: '⌘+O',
        },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      href: '/admin/analytics',
      shortcut: '⌘+R',
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: Settings,
      href: '/admin/settings',
      shortcut: '⌘+,',
    },
  ];

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleNavigation = (href: string, shortcut?: string) => {
    if (href !== '#') {
      router.push(href);
    }
  };

  const handleLogout = () => {
    router.push('/login');
  };

  const SidebarItem = ({
    item,
    depth = 0,
  }: {
    item: SidebarItem;
    depth?: number;
  }) => {
    const isActive =
      pathname === item.href ||
      (item.children && item.children.some((child) => pathname === child.href));
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div className="mb-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-9 w-full justify-start px-3 transition-all duration-200',
            depth > 0 && 'ml-4 w-[calc(100%_-_16px)]',
            isActive &&
              !hasChildren &&
              'border-r-2 border-primary-500 bg-primary-50 text-primary-700',
            !collapsed && 'text-sm',
            collapsed && 'justify-center px-2'
          )}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              handleNavigation(item.href, item.shortcut);
            }
          }}
        >
          <item.icon
            className={cn(
              'flex-shrink-0',
              collapsed ? 'h-5 w-5' : 'mr-3 h-4 w-4'
            )}
          />

          {!collapsed && (
            <>
              <span className="flex-1 text-left font-medium">{item.label}</span>

              {item.badge !== undefined && item.badge > 0 && (
                <span className="min-w-[20px] rounded-full bg-red-500 px-2 py-0.5 text-center text-xs text-white">
                  {item.badge}
                </span>
              )}

              {hasChildren && (
                <div className="ml-2 flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              )}

              {item.shortcut && showShortcuts && (
                <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                  {item.shortcut}
                </span>
              )}
            </>
          )}
        </Button>

        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children?.map((child) => (
              <SidebarItem key={child.id} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card
      className={cn(
        'flex h-screen flex-col border-r bg-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
      variant="surface"
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center border-b p-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <div>
            <h2 className="text-foreground text-lg font-semibold">
              Look Escolar
            </h2>
            <p className="text-muted-foreground text-xs">Panel Profesional</p>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="p-1.5"
        >
          <Command className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-2">
          {sidebarItems.map((item) => (
            <SidebarItem key={item.id} item={item} />
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="border-t p-3">
        {!collapsed && (
          <div className="mb-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => setShowShortcuts(!showShortcuts)}
            >
              <Keyboard className="mr-2 h-4 w-4" />
              {showShortcuts ? 'Ocultar' : 'Mostrar'} Shortcuts
            </Button>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full transition-colors duration-200 hover:bg-red-50 hover:text-red-700',
            collapsed ? 'justify-center px-2' : 'justify-start'
          )}
          onClick={handleLogout}
        >
          <LogOut
            className={cn(
              'flex-shrink-0',
              collapsed ? 'h-4 w-4' : 'mr-3 h-4 w-4'
            )}
          />
          {!collapsed && <span>Cerrar Sesión</span>}
        </Button>
      </div>
    </Card>
  );
}

'use client';

import { useTheme, type Theme } from '@/components/providers/theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sun, Moon, Monitor, Star, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const themes = [
  { value: 'light' as Theme, label: 'Claro', icon: Sun, description: 'Ideal para el día' },
  { value: 'dark' as Theme, label: 'Oscuro', icon: Moon, description: 'Reduce fatiga visual' },
  { value: 'night' as Theme, label: 'Noche', icon: Star, description: 'Extra oscuro para dormir' },
  { value: 'system' as Theme, label: 'Sistema', icon: Monitor, description: 'Sigue tu dispositivo' },
];

export function ThemeToggleEnhanced() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const currentTheme = themes.find(t => t.value === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-xl border transition-all duration-300",
            "bg-background/80 backdrop-blur-sm",
            "border-border/50 hover:border-border",
            "hover:bg-muted/80",
            "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          )}
        >
          <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 text-blue-400" />
          <span className="sr-only">Cambiar tema: {currentTheme.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(
          "w-48 p-1.5",
          "bg-card/95 backdrop-blur-xl",
          "border border-border/50",
          "shadow-lg shadow-black/5 dark:shadow-black/20",
          "rounded-xl"
        )}
      >
        {themes.map(({ value, label, icon: Icon, description }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200",
              theme === value
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted/80"
            )}
          >
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              theme === value
                ? "bg-primary/20 text-primary"
                : "bg-muted/60 text-muted-foreground"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-muted-foreground truncate">{description}</div>
            </div>
            {theme === value && (
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggleSimple() {
  const { resolvedTheme, setTheme, theme } = useTheme();

  const cycleTheme = () => {
    // Cycle through: light -> dark -> night -> light
    const cycle: Theme[] = ['light', 'dark', 'night'];
    const currentIndex = cycle.indexOf(theme as Theme);
    const nextIndex = (currentIndex + 1) % cycle.length;
    const nextTheme = cycle[nextIndex];
    setTheme(nextTheme);
  };

  const Icon = resolvedTheme === 'dark' ? Sun : Moon;
  const label = resolvedTheme === 'dark'
    ? 'Cambiar a modo claro'
    : 'Cambiar a modo oscuro';

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={cn(
        "relative h-10 w-10 rounded-xl transition-all duration-300",
        "inline-flex items-center justify-center",
        "bg-background/80 backdrop-blur-sm",
        "border border-border/50 hover:border-border",
        "hover:bg-muted/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        "active:scale-95"
      )}
      aria-label={label}
    >
      <Sun className={cn(
        "h-[18px] w-[18px] absolute transition-all duration-500 text-amber-500",
        resolvedTheme === 'dark'
          ? "rotate-90 scale-0 opacity-0"
          : "rotate-0 scale-100 opacity-100"
      )} />
      <Moon className={cn(
        "h-[18px] w-[18px] absolute transition-all duration-500 text-blue-400",
        resolvedTheme === 'dark'
          ? "rotate-0 scale-100 opacity-100"
          : "-rotate-90 scale-0 opacity-0"
      )} />
    </button>
  );
}

// Compact version for mobile headers
export function ThemeToggleCompact() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "h-8 w-8 rounded-lg transition-all duration-200",
        "inline-flex items-center justify-center",
        "hover:bg-muted/80 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      )}
      aria-label={resolvedTheme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
    >
      <Sun className={cn(
        "h-4 w-4 transition-all duration-300 text-amber-500",
        resolvedTheme === 'dark' ? "scale-0 rotate-90" : "scale-100 rotate-0"
      )} />
      <Moon className={cn(
        "h-4 w-4 absolute transition-all duration-300 text-blue-400",
        resolvedTheme === 'dark' ? "scale-100 rotate-0" : "scale-0 -rotate-90"
      )} />
    </button>
  );
}

'use client';

import { useTheme } from '@/components/providers/theme-provider';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggleEnhanced() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Oscuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-9 w-9 rounded-lg border border-border dark:border-gray-700 hover:bg-muted dark:hover:bg-gray-800 transition-all"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {themes.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value as any)}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              theme === value && "bg-muted dark:bg-gray-800"
            )}
          >
            <div className="flex items-center space-x-2">
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </div>
            {theme === value && (
              <Check className="h-3 w-3 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggleSimple() {
  const { toggleTheme, resolvedTheme, theme, setTheme } = useTheme();

  const handleClick = () => {
    console.log('🔧 Theme toggle clicked - current resolved theme:', resolvedTheme, 'current theme:', theme);
    console.log('📊 localStorage before:', localStorage.getItem('lookescolar-theme'));
    console.log('🎨 HTML classes before:', document.documentElement.className);

    // Método directo: manipular las clases CSS directamente
    const html = document.documentElement;
    const isCurrentlyDark = html.classList.contains('dark');

    console.log('🎯 Currently dark?', isCurrentlyDark);

    // Remover clases anteriores
    html.classList.remove('light', 'dark');

    // Aplicar nueva clase
    const newTheme = isCurrentlyDark ? 'light' : 'dark';
    html.classList.add(newTheme);

    console.log('🔄 Applied theme directly to DOM:', newTheme);
    console.log('🎨 HTML classes after direct manipulation:', html.className);

    // LIMPIAR todos los estilos inline previos antes de aplicar nuevos
    console.log('🧹 Cleaning previous inline styles...');

    // Limpiar estilos del html
    html.style.removeProperty('background-color');
    html.style.removeProperty('color');

    // Limpiar estilos del body
    document.body.style.removeProperty('background-color');
    document.body.style.removeProperty('color');

    // Limpiar estilos del contenedor store
    const storeContainer = document.querySelector('.pixieset-store-template');
    if (storeContainer) {
      (storeContainer as HTMLElement).style.removeProperty('background-color');
      (storeContainer as HTMLElement).style.removeProperty('color');
    }

    // Aplicar estilos según el tema
    if (newTheme === 'dark') {
      // Variables CSS para dark
      html.style.setProperty('--background', '222.2 84% 4.9%');
      html.style.setProperty('--foreground', '210 40% 98%');
      html.style.setProperty('--muted', '217.2 32.6% 17.5%');
      html.style.setProperty('--muted-foreground', '215 20.2% 65.1%');
      html.style.setProperty('--card', '222.2 84% 4.9%');
      html.style.setProperty('--border', '217.2 32.6% 17.5%');

      // Aplicar estilos directos con máxima prioridad
      html.style.setProperty('background-color', '#0f0f23', 'important');
      html.style.setProperty('color', '#fafaff', 'important');

      document.body.style.setProperty('background-color', '#0f0f23', 'important');
      document.body.style.setProperty('color', '#fafaff', 'important');

      // Aplicar al contenedor principal
      if (storeContainer) {
        (storeContainer as HTMLElement).style.setProperty('background-color', '#0f0f23', 'important');
        (storeContainer as HTMLElement).style.setProperty('color', '#fafaff', 'important');
        console.log('🌙 DARK: Applied styles to store container');
      }

      console.log('🌙 DARK theme applied - background should be dark, text should be light');
    } else {
      // Variables CSS para light
      html.style.setProperty('--background', '0 0% 100%');
      html.style.setProperty('--foreground', '222.2 84% 4.9%');
      html.style.setProperty('--muted', '210 40% 96.1%');
      html.style.setProperty('--muted-foreground', '215.4 16.3% 46.9%');
      html.style.setProperty('--card', '0 0% 100%');
      html.style.setProperty('--border', '214.3 31.8% 91.4%');

      // Aplicar estilos directos con máxima prioridad
      html.style.setProperty('background-color', '#ffffff', 'important');
      html.style.setProperty('color', '#0f0f23', 'important');

      document.body.style.setProperty('background-color', '#ffffff', 'important');
      document.body.style.setProperty('color', '#0f0f23', 'important');

      // Aplicar al contenedor principal
      if (storeContainer) {
        (storeContainer as HTMLElement).style.setProperty('background-color', '#ffffff', 'important');
        (storeContainer as HTMLElement).style.setProperty('color', '#0f0f23', 'important');
        console.log('☀️ LIGHT: Applied styles to store container');
      }

      console.log('☀️ LIGHT theme applied - background should be white, text should be dark');
    }

    // También actualizar el estado del componente
    setTheme(newTheme);

    setTimeout(() => {
      console.log('📊 localStorage after:', localStorage.getItem('lookescolar-theme'));
      console.log('🎨 Final HTML classes:', document.documentElement.className);
      console.log('🎨 Final computed background:', getComputedStyle(document.documentElement).getPropertyValue('--background'));
      console.log('✅ Theme toggle completed');
    }, 100);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative h-9 w-9 rounded-lg border border-border dark:border-gray-700 hover:bg-muted dark:hover:bg-gray-800 transition-all inline-flex items-center justify-center bg-background"
      aria-label={resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      style={{ zIndex: 9999 }}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  );
}
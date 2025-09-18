'use client';

import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/theme-context';

interface ThemeAwareTextProps {
  className?: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'muted';
  as?: keyof JSX.IntrinsicElements;
}

export function ThemeAwareText({ 
  className, 
  children, 
  variant = 'primary', 
  as: Component = 'span' 
}: ThemeAwareTextProps) {
  const { resolvedTheme, highContrast } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const getTextColor = () => {
    if (highContrast) {
      return isDark ? 'text-white' : 'text-black';
    }

    switch (variant) {
      case 'primary':
        return isDark ? 'text-white' : 'text-gray-900';
      case 'secondary':
        return isDark ? 'text-white/90' : 'text-gray-700';
      case 'muted':
        return isDark ? 'text-white/70' : 'text-gray-500';
      default:
        return isDark ? 'text-white' : 'text-gray-900';
    }
  };

  return (
    <Component className={cn(getTextColor(), className)}>
      {children}
    </Component>
  );
}
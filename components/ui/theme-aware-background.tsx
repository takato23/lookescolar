'use client';

import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/theme-context';

interface ThemeAwareBackgroundProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'gradient' | 'solid' | 'subtle';
}

export function ThemeAwareBackground({ 
  children, 
  className, 
  variant = 'gradient' 
}: ThemeAwareBackgroundProps) {
  const { resolvedTheme, highContrast } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const getBackgroundClasses = () => {
    if (highContrast) {
      return isDark ? 'bg-black text-white' : 'bg-white text-black';
    }

    switch (variant) {
      case 'gradient':
        return isDark 
          ? 'bg-gradient-to-br from-blue-950 via-purple-950 to-pink-950 text-white'
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-900';
      
      case 'solid':
        return isDark 
          ? 'bg-gray-900 text-white'
          : 'bg-white text-gray-900';
      
      case 'subtle':
        return isDark 
          ? 'bg-gray-950 text-white'
          : 'bg-gray-50 text-gray-900';
      
      default:
        return isDark 
          ? 'bg-gradient-to-br from-blue-950 via-purple-950 to-pink-950 text-white'
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-900';
    }
  };

  return (
    <div className={cn(
      'min-h-screen transition-colors duration-500',
      getBackgroundClasses(),
      className
    )}>
      {/* Background effects - only in dark mode and not high contrast */}
      {isDark && !highContrast && variant === 'gradient' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float" style={{ animationDelay: '4s' }} />
        </div>
      )}
      
      {/* Light mode subtle background pattern */}
      {!isDark && !highContrast && variant === 'gradient' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full filter blur-3xl opacity-40" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full filter blur-3xl opacity-40" style={{ animationDelay: '2s' }} />
        </div>
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
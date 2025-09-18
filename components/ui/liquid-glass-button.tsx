'use client';

import { ButtonHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useTheme } from '@/components/providers/theme-provider';

interface LiquidGlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  liquid?: boolean;
}

const LiquidGlassButton = forwardRef<HTMLButtonElement, LiquidGlassButtonProps>(
  ({ className, variant = 'default', size = 'md', liquid = true, children, ...props }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    
    const sizeClasses = {
      sm: 'h-9 px-4 text-xs font-semibold',
      md: 'h-11 px-5 text-sm font-bold',
      lg: 'h-13 px-7 text-base font-extrabold'
    };

    const variantGradients = {
      default: 'from-white/[0.15] via-white/[0.08] to-white/[0.12]',
      primary: 'from-blue-300/[0.25] via-purple-300/[0.15] to-pink-300/[0.2]',
      secondary: 'from-emerald-300/[0.25] via-teal-300/[0.15] to-cyan-300/[0.2]',
      ghost: 'from-white/[0.08] via-transparent to-white/[0.05]',
      danger: 'from-red-300/[0.25] via-rose-300/[0.15] to-pink-300/[0.2]'
    };

    const getTextColor = () => {
      // IMPORTANTE: El fondo glass blur necesita alto contraste
      // En modo claro usar negro/gris muy oscuro, en modo oscuro usar blanco
      
      if (variant === 'ghost') {
        // Ghost tiene menos fondo, necesita menos contraste
        return isDark ? 'text-gray-100' : 'text-gray-700';
      }
      if (variant === 'primary' || variant === 'secondary') {
        // En botones con gradiente brillante el texto oscuro funciona mejor en ambos temas
        return 'text-slate-900';
      }
      
      // Para todos los demás variantes, máximo contraste
      return isDark ? 'text-white' : 'text-slate-900';
    };
    
    const getTextShadow = () => {
      // Agregar más sombra para mejorar legibilidad sobre glass
      if (isDark) {
        return '[text-shadow:_0_2px_4px_rgba(0,0,0,0.8)]';
      }
      return '[text-shadow:_0_1px_3px_rgba(255,255,255,0.8),_0_1px_2px_rgba(0,0,0,0.3)]';
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          // Ultra frost glass base
          'relative overflow-hidden transition-all duration-700',
          'backdrop-blur-3xl backdrop-saturate-[2.5] backdrop-contrast-[1.1]',
          'border-[2px] border-white/[0.18]',
          'shadow-[0_8px_32px_0_rgba(31,38,135,0.37),inset_0_2px_0_0_rgba(255,255,255,0.2),inset_0_-2px_0_0_rgba(0,0,0,0.1)]',
          
          // Dynamic rounded corners for liquid effect
          liquid ? 'rounded-[2rem]' : 'rounded-2xl',
          
          // Size classes
          sizeClasses[size],
          
          // Text styling
          getTextColor(),
          'font-bold tracking-wide',
          getTextShadow(),
          
          // Interactive states
          'hover:shadow-[0_20px_40px_-5px_rgba(31,38,135,0.6),inset_0_2px_0_0_rgba(255,255,255,0.3),inset_0_-2px_0_0_rgba(0,0,0,0.15)]',
          'hover:border-white/[0.25]',
          'hover:scale-[1.03] hover:-translate-y-0.5',
          'active:scale-[0.97] active:translate-y-0',
          
          // Z-index stacking
          '[&>*]:relative [&>*]:z-20',
          
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ 
          rotateX: 5,
          rotateY: 5,
        }}
        whileTap={{ 
          scale: 0.96,
          rotateX: 0,
          rotateY: 0,
        }}
        style={{
          transformStyle: 'preserve-3d',
          perspective: '1000px',
          // Color calculado para contrastar con cada variante
          color:
            variant === 'primary' || variant === 'secondary'
              ? '#0f172a' // slate-900
              : isDark
              ? 'rgba(255,255,255,0.98)'
              : '#0f172a',
        }}
        {...props}
      >
        {/* Main gradient background */}
        <div 
          className={cn(
            'absolute inset-0 bg-gradient-to-br transition-all duration-500',
            variantGradients[variant],
            isHovered && 'opacity-90'
          )}
        />

        {/* Liquid morphing background */}
        {liquid && (
          <div className="absolute inset-[-20%] animate-liquid-slow">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] via-transparent to-white/[0.05] blur-xl" />
          </div>
        )}

        {/* Frost texture layer */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none">
          <svg className="w-full h-full">
            <defs>
              <filter id="liquidFrost">
                <feTurbulence 
                  type="fractalNoise" 
                  baseFrequency={isHovered ? "1.5" : "1.2"} 
                  numOctaves="5" 
                  seed="10"
                  result="turbulence"
                />
                <feColorMatrix in="turbulence" type="saturate" values="0" />
                <feComponentTransfer>
                  <feFuncA type="discrete" tableValues="0 0.05 0.1 0.15 0.2 0.25 0.3 0.35 0.4 0.45 0.5" />
                </feComponentTransfer>
                <feGaussianBlur stdDeviation="0.5" />
              </filter>
            </defs>
            <rect width="100%" height="100%" filter="url(#liquidFrost)" />
          </svg>
        </div>

        {/* Animated shimmer */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.2] to-transparent mix-blend-overlay"
          animate={{
            x: isHovered ? ['0%', '200%'] : '0%',
          }}
          transition={{
            duration: 1,
            ease: 'easeInOut',
          }}
          style={{
            transform: 'translateX(-100%)',
          }}
        />

        {/* Iridescent overlay */}
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/[0.15] via-purple-400/[0.1] to-pink-400/[0.15] animate-pulse-slow" />
          <div className="absolute inset-0 bg-gradient-to-l from-cyan-400/[0.1] via-transparent to-rose-400/[0.1] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>

        {/* Inner highlight */}
        <div className="absolute inset-[1px] rounded-[inherit] bg-gradient-to-b from-white/[0.15] to-transparent opacity-60" />

        {/* Bottom reflection */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-white/[0.05] to-transparent rounded-b-[inherit]" />

        {/* Content - ensure children inherit visible color and icon stroke */}
        <span
          className={cn(
            'relative z-30 inline-flex items-center gap-2 mix-blend-normal',
            // Ensure any nested elements (spans, svgs) inherit the computed color
            '[&_*]:text-[inherit] [&_*]:text-inherit',
            // Lucide icons use stroke; force stroke to currentColor for visibility
            '[&_*]:stroke-current [&_*]:fill-none'
          )}
          // Keep clicks on the button element
          style={{ color: 'inherit' }}
        >
          {children}
        </span>

        {/* 3D depth effect on hover */}
        {isHovered && (
          <motion.div 
            className="absolute inset-0 rounded-[inherit] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'radial-gradient(circle at 50% 50%, transparent 30%, rgba(255,255,255,0.1) 100%)',
              transform: 'translateZ(20px)',
            }}
          />
        )}
      </motion.button>
    );
  }
);

LiquidGlassButton.displayName = 'LiquidGlassButton';

export { LiquidGlassButton };

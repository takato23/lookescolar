'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useInView, useAnimation, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

// Stagger Children Animation - Para listas de elementos
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className,
  delay = 0,
  staggerDelay = 0.1,
}) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: delay,
        staggerChildren: staggerDelay,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 10,
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Parallax Scroll Effect - Para fondos y elementos decorativos
interface ParallaxElementProps {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}

export const ParallaxElement: React.FC<ParallaxElementProps> = ({
  children,
  speed = 0.5,
  className,
}) => {
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffsetY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.div
      className={className}
      style={{
        transform: `translateY(${offsetY * speed}px)`,
      }}
    >
      {children}
    </motion.div>
  );
};

// Reveal on Scroll - Para contenido que aparece al hacer scroll
interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className,
  delay = 0,
  duration = 0.6,
  y = 30,
}) => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            duration,
            delay,
            ease: [0.25, 0.1, 0.25, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

// Magnetic Hover - Efecto magnético al hover
interface MagneticHoverProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export const MagneticHover: React.FC<MagneticHoverProps> = ({
  children,
  className,
  strength = 0.3,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const ref = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        x: position.x,
        y: position.y,
      }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
      }}
    >
      {children}
    </motion.div>
  );
};

// Tilt Card - Efecto 3D al hover
interface Tilt3DCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}

export const Tilt3DCard: React.FC<Tilt3DCardProps> = ({
  children,
  className,
  maxTilt = 10,
}) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const ref = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setRotateX((y - 0.5) * maxTilt);
    setRotateY((x - 0.5) * -maxTilt);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={ref}
      className={cn('preserve-3d', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX,
        rotateY,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
    >
      {children}
    </motion.div>
  );
};

// Skeleton Loading - Para estados de carga elegantes
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  animation = 'pulse',
  width,
  height,
}) => {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
    rounded: 'rounded-xl',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div
      className={cn(
        'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: width || '100%',
        height: height || (variant === 'text' ? '1rem' : '100%'),
      }}
    />
  );
};

// Pulse Dot - Indicador de actividad
export const PulseDot: React.FC<{ color?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  color = 'bg-green-500',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  return (
    <span className="relative inline-flex">
      <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', color)} />
      <span className={cn('relative inline-flex rounded-full', sizeClasses[size], color)} />
    </span>
  );
};

// Counter Animation - Para números animados
interface AnimatedCounterProps {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  from = 0,
  to,
  duration = 2,
  className,
  prefix = '',
  suffix = '',
}) => {
  const [count, setCount] = useState(from);
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const increment = (to - from) / (duration * 60);
      const timer = setInterval(() => {
        setCount((prev) => {
          const next = prev + increment;
          if ((increment > 0 && next >= to) || (increment < 0 && next <= to)) {
            clearInterval(timer);
            return to;
          }
          return next;
        });
      }, 1000 / 60);

      return () => clearInterval(timer);
    }
  }, [from, to, duration, isInView]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {Math.round(count).toLocaleString()}
      {suffix}
    </span>
  );
};

// Image with Loading State - Para carga elegante de imágenes
interface AnimatedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  placeholderSrc?: string;
  showSkeleton?: boolean;
}

export const AnimatedImage: React.FC<AnimatedImageProps> = ({
  src,
  alt,
  className,
  placeholderSrc,
  showSkeleton = true,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence>
        {(showSkeleton && !isLoaded) && (
          <motion.div
            className="absolute inset-0"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Skeleton variant="rectangular" className="h-full w-full" />
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.img
        src={src}
        alt={alt}
        className={cn('w-full h-full object-cover', className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        {...props}
      />
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <span className="text-gray-500">Error al cargar imagen</span>
        </div>
      )}
    </div>
  );
};

// Smooth Page Transition Wrapper
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 20,
      }}
    >
      {children}
    </motion.div>
  );
};
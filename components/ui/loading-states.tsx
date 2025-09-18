'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Gallery Skeleton optimizado para muchas imágenes
interface GallerySkeletonProps {
  count?: number;
  columns?: number;
  className?: string;
}

export const GallerySkeleton: React.FC<GallerySkeletonProps> = ({
  count = 12,
  columns = 4,
  className,
}) => {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  }[columns] || 'grid-cols-4';

  return (
    <div className={cn('grid gap-4', gridClass, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.03, duration: 0.3 }}
        >
          <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600">
            <div className="w-full h-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
          <div className="mt-2 h-4 bg-muted dark:bg-gray-700 rounded w-3/4 animate-pulse" />
        </motion.div>
      ))}
    </div>
  );
};

// Smart Loading Spinner con mensaje contextual
interface SmartSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SmartSpinner: React.FC<SmartSpinnerProps> = ({
  message = 'Cargando...',
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div className="relative">
        <motion.div
          className={cn(
            'rounded-full border-4 border-border dark:border-gray-700',
            sizeClasses[size]
          )}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent" />
        </motion.div>
        
        {/* Pulse effect */}
        <motion.div
          className={cn(
            'absolute inset-0 rounded-full bg-indigo-500/20',
            sizeClasses[size]
          )}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      
      {message && (
        <motion.p
          className="text-sm text-muted-foreground dark:text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
};

// Progress Bar para uploads
interface UploadProgressProps {
  progress: number;
  fileName?: string;
  className?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  fileName,
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      {fileName && (
        <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2 truncate">
          {fileName}
        </p>
      )}
      
      <div className="relative h-2 bg-muted dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
      </div>
      
      <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{progress}%</span>
        {progress < 100 && <span>Subiendo...</span>}
        {progress === 100 && <span className="text-green-500">¡Completado!</span>}
      </div>
    </div>
  );
};

// Content Placeholder para texto
interface ContentPlaceholderProps {
  lines?: number;
  className?: string;
}

export const ContentPlaceholder: React.FC<ContentPlaceholderProps> = ({
  lines = 3,
  className,
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className="h-4 bg-muted dark:bg-gray-700 rounded animate-pulse"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          style={{
            width: `${100 - (i === lines - 1 ? 40 : i * 10)}%`,
          }}
        />
      ))}
    </div>
  );
};

// Loading Overlay para transiciones de página
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Cargando contenido...',
}) => {
  if (!isLoading) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop con blur */}
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md" />
      
      {/* Content */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <SmartSpinner message={message} size="lg" />
      </motion.div>
    </motion.div>
  );
};

// Dots Loading Animation
export const DotsLoading: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-indigo-500"
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
};

// Pulse Loading for avatars and icons
interface PulseLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  className?: string;
}

export const PulseLoading: React.FC<PulseLoadingProps> = ({
  size = 'md',
  shape = 'circle',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-lg',
  };

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      <div
        className={cn(
          'absolute inset-0 bg-gray-300 dark:bg-gray-600',
          shapeClasses[shape],
          'animate-pulse'
        )}
      />
      <motion.div
        className={cn(
          'absolute inset-0 bg-gray-400 dark:bg-gray-500',
          shapeClasses[shape]
        )}
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </div>
  );
};
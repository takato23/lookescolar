/**
 * Apple-Grade Protected Image Component
 *
 * Prevents image theft with multiple anti-download protections:
 * - Context menu blocking
 * - Drag and drop prevention
 * - Keyboard shortcut blocking
 * - Right-click prevention
 * - Touch gesture protection
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface ProtectedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  className?: string;
  priority?: boolean;
  unoptimized?: boolean;
  sizes?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  // Anti-theft protection options
  enableContextMenuBlock?: boolean;
  enableDragBlock?: boolean;
  enableKeyboardBlock?: boolean;
  enableTouchBlock?: boolean;
  watermarkText?: string;
}

export function ProtectedImage({
  src,
  alt,
  width,
  height,
  quality = 80,
  className = '',
  priority = false,
  unoptimized = false,
  sizes,
  style,
  onLoad,
  onError,
  enableContextMenuBlock = true,
  enableDragBlock = true,
  enableKeyboardBlock = true,
  enableTouchBlock = true,
  watermarkText = 'MUESTRA',
}: ProtectedImageProps) {
  const imageRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    if (!imageRef.current) return;

    const element = imageRef.current;

    // Prevent context menu (right-click)
    const handleContextMenu = (e: Event) => {
      if (enableContextMenuBlock) {
        e.preventDefault();
        showAntiTheftMessage();
        return false;
      }
    };

    // Prevent drag and drop
    const handleDragStart = (e: Event) => {
      if (enableDragBlock) {
        e.preventDefault();
        showAntiTheftMessage();
        return false;
      }
    };

    // Prevent keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enableKeyboardBlock) return;

      // Block common download/save shortcuts
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 's' || e.key === 'S' || e.key === 'c' || e.key === 'C')
      ) {
        e.preventDefault();
        showAntiTheftMessage();
        return false;
      }

      // Block Print Screen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        showAntiTheftMessage();
        return false;
      }
    };

    // Prevent touch actions that could lead to saving
    const handleTouchStart = (e: TouchEvent) => {
      if (enableTouchBlock && e.touches.length > 1) {
        e.preventDefault();
        showAntiTheftMessage();
        return false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (enableTouchBlock && e.touches.length > 1) {
        e.preventDefault();
        return false;
      }
    };

    // Add event listeners
    if (enableContextMenuBlock) {
      element.addEventListener('contextmenu', handleContextMenu);
    }

    if (enableDragBlock) {
      element.addEventListener('dragstart', handleDragStart);
    }

    if (enableKeyboardBlock) {
      document.addEventListener('keydown', handleKeyDown);
    }

    if (enableTouchBlock) {
      element.addEventListener('touchstart', handleTouchStart);
      element.addEventListener('touchmove', handleTouchMove);
    }

    // Cleanup
    return () => {
      if (enableContextMenuBlock) {
        element.removeEventListener('contextmenu', handleContextMenu);
      }

      if (enableDragBlock) {
        element.removeEventListener('dragstart', handleDragStart);
      }

      if (enableKeyboardBlock) {
        document.removeEventListener('keydown', handleKeyDown);
      }

      if (enableTouchBlock) {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [
    enableContextMenuBlock,
    enableDragBlock,
    enableKeyboardBlock,
    enableTouchBlock,
  ]);

  const showAntiTheftMessage = () => {
    // In a real implementation, you might want to show a toast or modal
    // For now, we'll just log to console
    console.log(
      '🚫 Descarga de imagen bloqueada - Esta es una muestra protegida'
    );

    // You could also show a toast notification:
    // toast.error('Esta imagen está protegida. Por favor, compre la versión física.');
  };

  // Don't render protection on server-side to avoid hydration issues
  if (!isClient) {
    return (
      <div ref={imageRef} className={`relative ${className}`} style={style}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          quality={quality}
          priority={priority}
          unoptimized={unoptimized}
          sizes={sizes}
          onLoad={onLoad}
          onError={onError}
          className="select-none"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <motion.div
      ref={imageRef}
      className={`relative ${className}`}
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Main image with protection */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        unoptimized={unoptimized}
        sizes={sizes}
        onLoad={onLoad}
        onError={onError}
        className="pointer-events-none select-none"
        draggable={false}
      />

      {/* Overlay protection layer */}
      <div
        className="pointer-events-auto absolute inset-0"
        style={{
          background: 'transparent',
          cursor: 'not-allowed',
        }}
        title="Imagen protegida - Compre la versión física"
      />

      {/* Watermark overlay */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{
          background: 'transparent',
        }}
      >
        <div
          className="rotate-12 transform select-none text-2xl font-bold text-white/20 md:text-4xl"
          style={{
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
          }}
        >
          {watermarkText}
        </div>
      </div>

      {/* Anti-theft instructions */}
      <div
        className="pointer-events-none absolute bottom-2 left-2 select-none rounded bg-black/50 px-2 py-1 text-xs text-white"
        style={{
          backdropFilter: 'blur(4px)',
        }}
      >
        Muestra protegida
      </div>
    </motion.div>
  );
}

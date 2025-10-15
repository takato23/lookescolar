'use client';

import React, { useState, useEffect } from 'react';

interface WatermarkPreviewProps {
  text: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  opacity: number;
  size: 'small' | 'medium' | 'large';
}

export function WatermarkPreview({ text, position, opacity, size }: WatermarkPreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const getPositionClasses = () => {
    const baseClasses = 'absolute pointer-events-none select-none font-semibold text-muted-foreground dark:text-muted-foreground transition-all duration-300 z-10';

    switch (position) {
      case 'bottom-right':
        return `${baseClasses} bottom-3 right-3 text-right`;
      case 'bottom-left':
        return `${baseClasses} bottom-3 left-3 text-left`;
      case 'top-right':
        return `${baseClasses} top-3 right-3 text-right`;
      case 'top-left':
        return `${baseClasses} top-3 left-3 text-left`;
      case 'center':
        return `${baseClasses} top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center`;
      default:
        return `${baseClasses} bottom-3 right-3 text-right`;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'text-xs px-2 py-1 leading-tight';
      case 'medium':
        return 'text-sm px-3 py-1.5 leading-tight';
      case 'large':
        return 'text-base px-4 py-2 leading-tight';
      default:
        return 'text-sm px-3 py-1.5 leading-tight';
    }
  };

  const getOpacityStyle = () => {
    return {
      opacity: opacity / 100,
    };
  };

  const getFontWeight = () => {
    switch (size) {
      case 'small':
        return 'font-medium';
      case 'medium':
        return 'font-semibold';
      case 'large':
        return 'font-bold';
      default:
        return 'font-semibold';
    }
  };

  if (!text.trim()) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-muted-foreground dark:text-muted-foreground0">
          <div className="text-sm">Sin watermark</div>
          <div className="text-xs">Ingresa texto para ver preview</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${getPositionClasses()} ${getSizeClasses()} ${getFontWeight()} bg-surface/90 dark:bg-background/90 backdrop-blur-sm rounded-md border border-border/50 dark:border-border/50 shadow-lg`}
      style={getOpacityStyle()}
      aria-label={`Preview del watermark: ${text}`}
    >
      {text}
    </div>
  );
}

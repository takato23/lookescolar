'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';
import { DeviceType, getDeviceWidth } from './PreviewDeviceSelector';

interface PreviewFrameProps {
  src: string;
  device: DeviceType;
  title?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function PreviewFrame({
  src,
  device,
  title = 'Vista previa',
  className,
  onLoad,
  onError,
}: PreviewFrameProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const deviceWidth = getDeviceWidth(device);

  // Calculate scale to fit container
  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth - 32; // padding
      const containerHeight = containerRef.current.offsetHeight - 32;

      // Device aspect ratio (assuming 16:9 for desktop, different for mobile)
      const deviceHeight = device === 'mobile'
        ? deviceWidth * 1.78 // ~16:9 inverted
        : device === 'tablet'
        ? deviceWidth * 1.33 // 4:3
        : deviceWidth * 0.625; // 16:10

      const scaleX = containerWidth / deviceWidth;
      const scaleY = containerHeight / deviceHeight;

      // Use the smaller scale to ensure it fits
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(newScale);
    };

    calculateScale();

    const resizeObserver = new ResizeObserver(calculateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [device, deviceWidth]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // Reset loading state when src changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  const deviceHeight = device === 'mobile'
    ? deviceWidth * 1.78
    : device === 'tablet'
    ? deviceWidth * 1.33
    : deviceWidth * 0.625;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900',
        className
      )}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Cargando preview...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center gap-3 text-center px-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-medium text-foreground">Error al cargar el preview</p>
              <p className="text-sm text-muted-foreground mt-1">
                Intenta refrescar o verifica que la URL sea valida
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Device frame */}
      <div
        className={cn(
          'transition-all duration-300 ease-out',
          device === 'mobile' && 'rounded-[2.5rem] border-[8px] border-slate-800 shadow-2xl',
          device === 'tablet' && 'rounded-[1.5rem] border-[6px] border-slate-700 shadow-xl',
          device === 'desktop' && 'rounded-lg border-2 border-slate-300 shadow-lg'
        )}
        style={{
          width: deviceWidth,
          height: deviceHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Mobile notch */}
        {device === 'mobile' && (
          <div className="absolute left-1/2 top-0 z-20 h-6 w-24 -translate-x-1/2 rounded-b-2xl bg-slate-800" />
        )}

        {/* Iframe */}
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          className={cn(
            'h-full w-full bg-white',
            device === 'mobile' && 'rounded-[2rem]',
            device === 'tablet' && 'rounded-[1.25rem]',
            device === 'desktop' && 'rounded-md'
          )}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>

      {/* Device info badge */}
      <div className="absolute bottom-3 left-3 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
        {deviceWidth}px
      </div>
    </div>
  );
}

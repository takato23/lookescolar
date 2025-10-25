'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminEvent } from './types';
import { getEventDisplayName, getEventInitials, resolveEventThumbnail } from './utils';

type SupportedAspectRatio = '3/2' | '4/3' | '16/9' | '1/1';

interface EventThumbnailProps {
  event: AdminEvent;
  className?: string;
  aspectRatio?: SupportedAspectRatio;
}

export const EventThumbnail = ({
  event,
  className,
  aspectRatio = '3/2',
}: EventThumbnailProps) => {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const displayName = useMemo(() => getEventDisplayName(event), [event]);
  const thumbnailSrc = useMemo(() => resolveEventThumbnail(event), [event]);
  const initials = useMemo(() => getEventInitials(event), [event]);

  const aspectClass = useMemo(() => {
    switch (aspectRatio) {
      case '4/3':
        return 'aspect-[4/3]';
      case '16/9':
        return 'aspect-video';
      case '1/1':
        return 'aspect-square';
      case '3/2':
      default:
        return 'aspect-[3/2]';
    }
  }, [aspectRatio]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/60 bg-muted/60 text-xs text-muted-foreground',
        aspectClass,
        className
      )}
    >
      {!loaded && !hasError && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      )}

      {thumbnailSrc && !hasError ? (
        <Image
          src={thumbnailSrc}
          alt={`Portada de ${displayName}`}
          fill
          sizes="(min-width: 1280px) 320px, (min-width: 768px) 260px, 100vw"
          className={cn(
            'object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          priority={false}
          loading="lazy"
          onError={() => setHasError(true)}
          onLoadingComplete={() => setLoaded(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-secondary/20 text-lg font-semibold uppercase tracking-wide">
          {initials}
        </div>
      )}

      <span className="sr-only">{displayName}</span>
    </div>
  );
};

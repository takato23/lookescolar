'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PixiesetLandingProps {
  brandName?: string;
  eventName: string;
  eventDate?: string;
  coverImageUrl?: string;
  thumbnails?: Array<{ id: string; url: string }>;
  onViewGallery: () => void;
  className?: string;
}

/**
 * Landing page component styled like Pixieset
 * Features: Large serif typography, elegant buttons, split layout
 */
export function PixiesetLanding({
  brandName = 'LOOKESCOLAR',
  eventName,
  eventDate,
  coverImageUrl,
  thumbnails = [],
  onViewGallery,
  className,
}: PixiesetLandingProps) {
  // Use first thumbnails as decorative images if no cover
  const displayThumbnails = thumbnails.slice(0, 3);
  const hasCover = Boolean(coverImageUrl);
  const hasDecoImages = displayThumbnails.length > 0 || hasCover;

  return (
    <div className={cn('min-h-screen bg-[#faf9f7]', className)}>
      {/* Main Content */}
      <div className="flex min-h-screen">
        {/* Left Side - Text Content */}
        <div className="flex w-full flex-col justify-center px-8 py-16 lg:w-1/2 lg:px-16 xl:px-24">
          <div className="mx-auto max-w-lg">
            {/* Brand Name */}
            <p className="mb-6 text-xs font-light tracking-[0.3em] text-neutral-500 uppercase">
              {brandName}
            </p>

            {/* Event Name - Large Serif Typography */}
            <h1 className="mb-6 font-serif text-5xl font-normal leading-tight tracking-tight text-neutral-900 lg:text-6xl xl:text-7xl">
              {eventName}
            </h1>

            {/* Event Date */}
            {eventDate && (
              <p className="mb-10 text-sm font-light tracking-[0.15em] text-neutral-500 uppercase">
                {eventDate}
              </p>
            )}

            {/* View Gallery Button - Pixieset Style */}
            <button
              onClick={onViewGallery}
              className="inline-flex items-center justify-center bg-[#8b7355] px-8 py-3.5 text-xs font-medium tracking-[0.2em] text-white uppercase transition-all duration-200 hover:bg-[#7a6349] focus:outline-none focus:ring-2 focus:ring-[#8b7355] focus:ring-offset-2"
            >
              Ver galeria
            </button>
          </div>
        </div>

        {/* Right Side - Images */}
        {hasDecoImages && (
          <div className="relative hidden w-1/2 bg-[#f5f4f2] lg:block">
            {hasCover ? (
              // Single cover image
              <div className="absolute inset-0">
                <img
                  src={coverImageUrl}
                  alt={eventName}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              // Collage of thumbnails - Pixieset style
              <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1">
                {/* Main large image */}
                {displayThumbnails[0] && (
                  <div className="col-span-2 row-span-2 relative overflow-hidden">
                    <img
                      src={displayThumbnails[0].url}
                      alt="Preview 1"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                {/* Smaller images */}
                <div className="grid grid-cols-2 col-span-2 gap-1">
                  {displayThumbnails.slice(1).map((thumb, idx) => (
                    <div key={thumb.id} className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={thumb.url}
                        alt={`Preview ${idx + 2}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Floating thumbnails - Pixieset style overlay */}
            {displayThumbnails.length > 0 && !hasCover && (
              <div className="absolute left-4 top-4 flex gap-2">
                {displayThumbnails.slice(0, 2).map((thumb) => (
                  <div
                    key={thumb.id}
                    className="h-16 w-16 overflow-hidden rounded-sm border-2 border-white shadow-lg"
                  >
                    <img
                      src={thumb.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
                {thumbnails.length > 2 && (
                  <div className="flex h-16 w-16 items-center justify-center rounded-sm border-2 border-white bg-white/80 text-sm font-medium text-neutral-600 shadow-lg backdrop-blur-sm">
                    +{thumbnails.length - 2}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PixiesetLanding;

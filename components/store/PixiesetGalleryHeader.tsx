'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ShoppingCart, Heart, Share2, Play, Printer } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface PixiesetGalleryHeaderProps {
  eventName: string;
  brandName?: string;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  cartCount?: number;
  favoritesCount?: number;
  onCartClick?: () => void;
  onFavoritesClick?: () => void;
  onShareClick?: () => void;
  onSlideshowClick?: () => void;
  onPrintStoreClick?: () => void;
  className?: string;
}

/**
 * Gallery header styled like Pixieset
 * Features: Event name, tabs for sections, action buttons
 */
export function PixiesetGalleryHeader({
  eventName,
  brandName,
  tabs = [],
  activeTab,
  onTabChange,
  cartCount = 0,
  favoritesCount = 0,
  onCartClick,
  onFavoritesClick,
  onShareClick,
  onSlideshowClick,
  onPrintStoreClick,
  className,
}: PixiesetGalleryHeaderProps) {
  return (
    <header className={cn('sticky top-0 z-40 border-b border-neutral-200 bg-white', className)}>
      <div className="px-4 lg:px-8">
        {/* Top Row - Event Name & Actions */}
        <div className="flex h-14 items-center justify-between">
          {/* Left - Event Info */}
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium uppercase tracking-wider text-neutral-900">
              {eventName}
            </h1>
            {brandName && (
              <>
                <span className="text-neutral-300">|</span>
                <span className="text-xs font-light uppercase tracking-wider text-neutral-500">
                  {brandName}
                </span>
              </>
            )}
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-1">
            {/* Print Store */}
            {onPrintStoreClick && (
              <button
                onClick={onPrintStoreClick}
                className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print Store</span>
              </button>
            )}

            {/* Divider */}
            <div className="mx-2 h-5 w-px bg-neutral-200" />

            {/* Cart */}
            {onCartClick && (
              <button
                onClick={onCartClick}
                className="relative flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#8b7355] text-[10px] font-medium text-white">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Favorites */}
            {onFavoritesClick && (
              <button
                onClick={onFavoritesClick}
                className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900"
              >
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Favorites</span>
                {favoritesCount > 0 && (
                  <span className="ml-1 text-xs text-neutral-400">
                    ({favoritesCount})
                  </span>
                )}
              </button>
            )}

            {/* Share */}
            {onShareClick && (
              <button
                onClick={onShareClick}
                className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

            {/* Slideshow */}
            {onSlideshowClick && (
              <button
                onClick={onSlideshowClick}
                className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900"
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Slideshow</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row - Tabs (if any) */}
        {tabs.length > 0 && (
          <div className="flex gap-6 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  'relative py-3 text-sm font-normal transition-colors',
                  activeTab === tab.id
                    ? 'text-neutral-900'
                    : 'text-neutral-400 hover:text-neutral-600'
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1.5 text-xs text-neutral-400">
                    ({tab.count})
                  </span>
                )}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

export default PixiesetGalleryHeader;

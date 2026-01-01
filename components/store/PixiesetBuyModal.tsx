'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, ArrowLeft, ChevronRight } from 'lucide-react';

interface PackageOption {
  id: string;
  name: string;
  price: number;
  itemCount: number;
  description: string;
  imageUrl?: string;
}

interface PrintOption {
  id: string;
  name: string;
  size: string;
  price: number;
}

interface PixiesetBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  photoAlt?: string;
  thumbnails?: Array<{ id: string; url: string }>;
  packages: PackageOption[];
  prints?: PrintOption[];
  onSelectPackage: (packageId: string) => void;
  onAddToCart: (packageId: string) => void;
  onVisitStore?: () => void;
  currency?: string;
}

type Tab = 'packages' | 'prints' | 'wall-art';

/**
 * Buy modal styled like Pixieset
 * Features: Split layout, tabs for categories, elegant typography
 */
export function PixiesetBuyModal({
  isOpen,
  onClose,
  photoUrl,
  photoAlt = 'Selected photo',
  thumbnails = [],
  packages,
  prints = [],
  onSelectPackage,
  onAddToCart,
  onVisitStore,
  currency = 'ARS',
}: PixiesetBuyModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('packages');
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const handleSelectPackage = (pkgId: string) => {
    setSelectedPackage(pkgId);
    onSelectPackage(pkgId);
  };

  const handleAddToCart = () => {
    if (selectedPackage) {
      onAddToCart(selectedPackage);
    }
  };

  if (!isOpen) return null;

  const displayThumbnails = thumbnails.slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative flex h-[90vh] max-h-[800px] w-full max-w-5xl overflow-hidden bg-white shadow-2xl">
        {/* Left Side - Photo */}
        <div className="relative hidden w-1/2 bg-[#f5f4f2] lg:block">
          {/* Main Photo */}
          <div className="flex h-full items-center justify-center p-8">
            <img
              src={photoUrl}
              alt={photoAlt}
              className="max-h-full max-w-full object-contain shadow-lg"
            />
          </div>

          {/* Thumbnails overlay - Pixieset style */}
          {displayThumbnails.length > 0 && (
            <div className="absolute left-4 top-4 flex gap-2">
              {displayThumbnails.map((thumb) => (
                <div
                  key={thumb.id}
                  className="h-14 w-14 overflow-hidden border-2 border-white shadow-md"
                >
                  <img
                    src={thumb.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Back button */}
          <button
            onClick={onClose}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center bg-white/90 text-neutral-600 shadow-md transition-colors hover:bg-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Right Side - Options */}
        <div className="flex w-full flex-col lg:w-1/2">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <h2 className="text-lg font-normal text-neutral-900">
              Buy This Photo
            </h2>
            <div className="flex items-center gap-4">
              {onVisitStore && (
                <button
                  onClick={onVisitStore}
                  className="flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-700"
                >
                  Visit Store
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-neutral-400 transition-colors hover:text-neutral-600 lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs - Pixieset style */}
          <div className="border-b border-neutral-200 px-6">
            <div className="flex gap-8">
              {[
                { id: 'packages' as Tab, label: 'Packages' },
                { id: 'prints' as Tab, label: 'Prints' },
                { id: 'wall-art' as Tab, label: 'Wall Art' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative py-4 text-sm font-normal transition-colors',
                    activeTab === tab.id
                      ? 'text-neutral-900'
                      : 'text-neutral-400 hover:text-neutral-600'
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {activeTab === 'packages' && (
              <div className="space-y-4">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => handleSelectPackage(pkg.id)}
                    className={cn(
                      'w-full text-left transition-all',
                      selectedPackage === pkg.id
                        ? 'ring-2 ring-[#8b7355]'
                        : 'hover:bg-neutral-50'
                    )}
                  >
                    <div className="flex gap-4 border border-neutral-200 p-4">
                      {/* Package Image/Icon */}
                      {pkg.imageUrl ? (
                        <div className="h-24 w-24 flex-shrink-0 overflow-hidden bg-[#e8f4f8]">
                          <img
                            src={pkg.imageUrl}
                            alt={pkg.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center bg-[#e8f4f8] text-xs text-neutral-500">
                          <div className="text-center">
                            <div className="text-lg font-medium">{pkg.itemCount}</div>
                            <div>items</div>
                          </div>
                        </div>
                      )}

                      {/* Package Info */}
                      <div className="flex flex-1 flex-col justify-center">
                        <h3 className="text-base font-normal text-neutral-900">
                          {pkg.name}
                        </h3>
                        <p className="mt-1 text-sm text-neutral-500">
                          {pkg.itemCount} items - {formatPrice(pkg.price)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'prints' && (
              <div className="space-y-3">
                {prints.length > 0 ? (
                  prints.map((print) => (
                    <div
                      key={print.id}
                      className="flex items-center justify-between border border-neutral-200 p-4 hover:bg-neutral-50"
                    >
                      <div>
                        <h3 className="text-sm font-normal text-neutral-900">
                          {print.name}
                        </h3>
                        <p className="text-xs text-neutral-500">{print.size}</p>
                      </div>
                      <span className="text-sm font-medium text-neutral-900">
                        {formatPrice(print.price)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-neutral-500">
                    No prints available for this photo
                  </p>
                )}
              </div>
            )}

            {activeTab === 'wall-art' && (
              <div className="py-8 text-center">
                <p className="text-sm text-neutral-500">
                  Wall art options coming soon
                </p>
              </div>
            )}
          </div>

          {/* Selected Package Detail */}
          {selectedPackage && activeTab === 'packages' && (
            <div className="border-t border-neutral-200 bg-white px-6 py-6">
              {(() => {
                const pkg = packages.find((p) => p.id === selectedPackage);
                if (!pkg) return null;

                return (
                  <div className="space-y-4">
                    {/* Package Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <button
                          onClick={() => setSelectedPackage(null)}
                          className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </button>
                      </div>
                      <span className="text-sm text-neutral-500">
                        More Details
                        <ChevronRight className="ml-1 inline h-4 w-4" />
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-normal text-neutral-900">
                        {pkg.name}
                      </h3>
                      <p className="mt-1 text-lg font-medium text-neutral-900">
                        {formatPrice(pkg.price)}
                      </p>
                    </div>

                    <p className="text-sm leading-relaxed text-neutral-600">
                      {pkg.description}
                    </p>

                    <div className="text-sm text-neutral-500">
                      This package contains {pkg.itemCount} items:
                    </div>

                    {/* Add to Cart Button - Pixieset style */}
                    <button
                      onClick={handleAddToCart}
                      className="w-full bg-[#8b7355] py-4 text-xs font-medium tracking-[0.15em] text-white uppercase transition-colors hover:bg-[#7a6349]"
                    >
                      Add to Cart
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PixiesetBuyModal;

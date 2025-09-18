'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  ImageIcon, 
  ArrowLeft,
  ShoppingCart,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Photo {
  id: string;
  url: string;
  preview_url?: string;
  alt: string;
  student?: string;
  subject?: string;
  isGroupPhoto?: boolean;
}

interface PackageOption {
  id: string;
  name: string;
  price: number;
  description: string;
  itemCount: number;
  contents: {
    individualPhotos: number;
    groupPhotos: number;
    copyPhotos: number;
  };
}

interface PixiesetPackageSelectorProps {
  photo: Photo | null; // Ahora puede ser null
  packages: PackageOption[];
  onBack: () => void;
  onSelectPackage: (packageId: string) => void;
  onAddToCart: (packageId: string) => void;
  className?: string;
  settings?: any;
  theme?: any;
}

export function PixiesetPackageSelector({
  photo,
  packages,
  onBack,
  onSelectPackage,
  onAddToCart,
  className,
  settings,
  theme
}: PixiesetPackageSelectorProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('packages');

  const formatPrice = (price: number) => {
    return `ARS${(price / 100).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const handlePackageSelect = (packageId: string) => {
    // En el nuevo flujo, directamente ir a selección de fotos
    onSelectPackage(packageId);
  };

  const selectedPkg = packages.find(p => p.id === selectedPackage);

  return (
    <div className={cn("min-h-screen bg-gray-50", className)}>
      {/* Header - Mobile optimized */}
      <div className="bg-white border-b border-gray-200 p-2 sm:p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm sm:text-base">Volver</span>
          </Button>

          <div className="text-right">
            <button className="text-blue-600 hover:underline text-xs sm:text-sm p-2">
              <span className="hidden sm:inline">Más Detalles →</span>
              <span className="sm:hidden">Detalles</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-3 sm:p-6">
        <div className={cn("grid gap-4 sm:gap-8", photo ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
          
          {/* Photo Preview - Solo mostrar si hay foto - Mobile optimized */}
          {photo && (
            <div className="space-y-3 sm:space-y-4">
              <div className="aspect-square bg-white rounded-lg overflow-hidden shadow-sm">
                <img
                  src={photo.preview_url || photo.url}
                  alt={photo.alt}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Thumbnails */}
              <div className="flex gap-2">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded border">
                  <img
                    src={photo.preview_url || photo.url}
                    alt=""
                    className="w-full h-full object-cover opacity-60"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Product Selection - Mobile optimized */}
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h1 className="text-lg sm:text-2xl font-medium mb-1 sm:mb-2">
                {photo ? "Comprar Esta Foto" : "Elegí tu Paquete"}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {photo ? "Selecciona un paquete para esta foto" : "Selecciona el paquete que prefieras y luego elegí las fotos"}
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-9 sm:h-10">
                <TabsTrigger value="packages" className="text-xs sm:text-sm">Paquetes</TabsTrigger>
                <TabsTrigger value="prints" className="text-xs sm:text-sm">Copias</TabsTrigger>
                <TabsTrigger value="wallart" className="text-xs sm:text-sm">Cuadros</TabsTrigger>
              </TabsList>

              <TabsContent value="packages" className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
                {packages.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={cn(
                      "border transition-all cursor-pointer hover:shadow-lg hover:border-blue-300",
                      "border-gray-200"
                    )}
                    onClick={() => handlePackageSelect(pkg.id)}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded flex items-center justify-center flex-shrink-0">
                              <img
                                src="/api/placeholder/40/40"
                                alt="Package preview"
                                className="w-6 h-6 sm:w-8 sm:h-8 rounded"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-base sm:text-lg">{pkg.name}</h3>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {pkg.itemCount} elementos - {formatPrice(pkg.price)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Package Details - Always visible - Mobile optimized */}
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="leading-tight">({pkg.contents.individualPhotos}x) Fotos Individuales - 15x21 / Brillante</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="leading-tight">({pkg.contents.copyPhotos}x) Copias - 4x5 / Brillante</span>
                          </div>
                          {pkg.contents.groupPhotos > 0 && (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="leading-tight">(1x) Foto Grupal - 15x21 / Brillante</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 text-sm sm:text-base min-h-[44px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePackageSelect(pkg.id);
                            }}
                          >
                            ELEGIR FOTOS →
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="prints" className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
                <div className="text-center py-8 sm:py-12 text-gray-500">
                  <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm sm:text-base px-4">Las copias individuales estarán disponibles después de comprar un paquete</p>
                </div>
              </TabsContent>

              <TabsContent value="wallart" className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
                <div className="text-center py-8 sm:py-12 text-gray-500">
                  <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm sm:text-base px-4">Los cuadros decorativos estarán disponibles después de comprar un paquete</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PixiesetPackageSelector;

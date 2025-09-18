'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  ShoppingCart,
  Package,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  CreditCard,
  Image,
  Users,
  Camera,
  Info,
  Check,
  X,
  ShoppingBag,
} from 'lucide-react';
import { ProductOption } from '@/lib/types/unified-store';

interface CartItem {
  id: string;
  type: 'folder' | 'extra_print';
  name: string;
  price: number;
  quantity: number;
  photos?: Array<{ id: string; url: string }>;
  package?: ProductOption;
}

interface CartSidebarProps {
  selectedPackage: ProductOption | null;
  selectedIndividualPhotos: Array<{ id: string; url: string }>;
  selectedGroupPhoto?: { id: string; url: string };
  extraPrints: CartItem[];
  onAddExtraPrint: () => void;
  onRemoveExtraPrint: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onCheckout: () => void;
  className?: string;
}

export function CartSidebar({
  selectedPackage,
  selectedIndividualPhotos,
  selectedGroupPhoto,
  extraPrints,
  onAddExtraPrint,
  onRemoveExtraPrint,
  onUpdateQuantity,
  onCheckout,
  className,
}: CartSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isComplete = selectedPackage && 
    selectedIndividualPhotos.length === selectedPackage.contents.individualPhotos &&
    (selectedPackage.contents.groupPhotos === 0 || !!selectedGroupPhoto);

  const folderPrice = selectedPackage?.price || 0;
  const extraPrintsTotal = extraPrints.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalPrice = folderPrice + extraPrintsTotal;

  const CartContent = () => (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Carpeta Principal */}
          {selectedPackage && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Carpeta Principal</CardTitle>
                  </div>
                  {isComplete ? (
                    <Badge variant="default" className="bg-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      Completa
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      En Progreso
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm">{selectedPackage.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Carpeta de {selectedPackage.contents.folderSize}
                  </p>
                </div>

                {/* Contenido de la Carpeta */}
                <div className="space-y-2 text-xs">
                  {/* Fotos Individuales */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      <span>Fotos Individuales</span>
                    </div>
                    <Badge variant={selectedIndividualPhotos.length === selectedPackage.contents.individualPhotos ? "default" : "outline"} className="text-xs">
                      {selectedIndividualPhotos.length}/{selectedPackage.contents.individualPhotos}
                    </Badge>
                  </div>

                  {/* Fotitos */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      <span>Fotitos ({selectedPackage.contents.smallSize})</span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400">{selectedPackage.contents.smallPhotos}</span>
                  </div>

                  {/* Foto Grupal */}
                  {selectedPackage.contents.groupPhotos > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        <span>Foto Grupal</span>
                      </div>
                      <Badge variant={selectedGroupPhoto ? "default" : "outline"} className="text-xs">
                        {selectedGroupPhoto ? '1/1' : '0/1'}
                      </Badge>
                    </div>
                  )}
                </div>

                <Separator />
                
                {/* Precio */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Precio</span>
                  <span className="text-lg font-bold text-primary">
                    ${folderPrice.toLocaleString('es-AR')}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Copias Adicionales */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Copias Adicionales</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={onAddExtraPrint}
                disabled={!isComplete}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar
              </Button>
            </div>

            {extraPrints.length > 0 ? (
              <div className="space-y-2">
                {extraPrints.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{item.name}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.photos?.length} foto{item.photos?.length !== 1 ? 's' : ''} seleccionada{item.photos?.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRemoveExtraPrint(item.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Quantity Control */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-sm font-medium">
                          ${(item.price * item.quantity).toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-4 border-dashed">
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  <Image className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No hay copias adicionales</p>
                  <p className="text-xs mt-1">Completá tu carpeta primero</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer con Total y Checkout */}
      <div className="border-t bg-background p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Carpeta</span>
            <span>${folderPrice.toLocaleString('es-AR')}</span>
          </div>
          {extraPrintsTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span>Copias Adicionales</span>
              <span>${extraPrintsTotal.toLocaleString('es-AR')}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold text-primary">
              ${totalPrice.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        <Button
          onClick={onCheckout}
          disabled={!isComplete}
          className="w-full"
          size="lg"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Proceder al Pago
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        {!isComplete && (
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Completá la selección de fotos para continuar
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <Card className={cn("hidden lg:block h-full", className)}>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <CardTitle>Tu Compra</CardTitle>
            </div>
            <Badge variant="secondary">
              {(extraPrints.length + (selectedPackage ? 1 : 0))} items
            </Badge>
          </div>
        </CardHeader>
        <CartContent />
      </Card>

      {/* Mobile Floating Button & Sheet */}
      <div className="lg:hidden">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button
              className="fixed bottom-4 right-4 rounded-full shadow-lg z-50"
              size="lg"
            >
              <ShoppingBag className="h-5 w-5 mr-2" />
              Ver Carrito
              {totalPrice > 0 && (
                <Badge className="ml-2 bg-white text-primary">
                  ${totalPrice.toLocaleString('es-AR')}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[90vw] sm:w-[400px] p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Tu Compra</SheetTitle>
            </SheetHeader>
            <CartContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
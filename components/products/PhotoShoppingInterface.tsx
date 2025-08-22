'use client';

import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Package, 
  Star, 
  Filter, 
  Grid3X3, 
  Camera,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  useProductCartStore,
  useProductSelection,
  useProductCartCalculation 
} from '@/lib/stores/product-cart-store';
import { ProductCatalogDisplay } from './ProductCatalogDisplay';
import { PhotoProductSelector } from './PhotoProductSelector';
import { EnhancedCartDrawer } from './EnhancedCartDrawer';
import { 
  ProductCatalog,
  PhotoProduct,
  ComboPackage,
  PricingContext
} from '@/lib/types/products';
import { formatProductPrice } from '@/lib/services/product-pricing';

interface PhotoShoppingInterfaceProps {
  photos: Array<{
    id: string;
    filename?: string;
    watermark_url?: string;
    original_filename?: string;
  }>;
  eventId: string;
  token?: string;
  onCheckout: () => Promise<void>;
  className?: string;
}

export function PhotoShoppingInterface({
  photos,
  eventId,
  token,
  onCheckout,
  className = ''
}: PhotoShoppingInterfaceProps) {
  const [catalog, setCatalog] = useState<ProductCatalog | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'select_photos' | 'select_products' | 'review'>('select_photos');
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const {
    setProductContext,
    reset: resetCart
  } = useProductCartStore();

  const {
    selectedPhotos,
    selectPhoto,
    deselectPhoto,
    isPhotoSelected,
    clearPhotos
  } = useProductSelection();

  const {
    totalItems,
    totalPrice,
    formattedTotal,
    validateCart
  } = useProductCartCalculation();

  const selectedPhotosList = Array.from(selectedPhotos).map(photoId => {
    const photo = photos.find(p => p.id === photoId);
    return {
      id: photoId,
      filename: photo?.filename || photo?.original_filename,
      watermark_url: photo?.watermark_url
    };
  });

  // Initialize pricing context
  useEffect(() => {
    setProductContext({
      event_id: eventId,
      bulk_discount_threshold: 5,
      bulk_discount_percentage: 10
    });
  }, [eventId, setProductContext]);

  // Load product catalog
  useEffect(() => {
    loadProductCatalog();
  }, [eventId]);

  const loadProductCatalog = async () => {
    try {
      setIsLoadingCatalog(true);
      setCatalogError(null);

      const response = await fetch(`/api/products/catalog?event_id=${eventId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al cargar catálogo');
      }

      setCatalog(result.data);
    } catch (error) {
      console.error('[PhotoShoppingInterface] Error loading catalog:', error);
      setCatalogError(error instanceof Error ? error.message : 'Error al cargar catálogo');
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const handlePhotoClick = (photo: typeof photos[0]) => {
    if (isPhotoSelected(photo.id)) {
      deselectPhoto(photo.id);
    } else {
      selectPhoto(
        photo.id, 
        photo.filename || photo.original_filename, 
        photo.watermark_url
      );
    }
  };

  const handleContinueToProducts = () => {
    if (selectedPhotos.size === 0) {
      alert('Selecciona al menos una foto para continuar');
      return;
    }
    setCurrentStep('select_products');
  };

  const handleProductSelect = (product: PhotoProduct) => {
    setIsProductSelectorOpen(true);
  };

  const handleComboSelect = (combo: ComboPackage) => {
    setIsProductSelectorOpen(true);
  };

  const handleOpenCart = () => {
    setIsCartOpen(true);
  };

  const handleCheckout = async () => {
    try {
      await onCheckout();
      resetCart();
      setCurrentStep('select_photos');
    } catch (error) {
      console.error('[PhotoShoppingInterface] Checkout error:', error);
      throw error; // Re-throw to be handled by the cart
    }
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case 'select_photos':
        return selectedPhotos.size > 0 ? 33 : 0;
      case 'select_products':
        return totalItems > 0 ? 66 : 33;
      case 'review':
        return 100;
      default:
        return 0;
    }
  };

  const PhotoGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {photos.map((photo) => {
        const selected = isPhotoSelected(photo.id);
        
        return (
          <Card
            key={photo.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selected 
                ? 'ring-2 ring-purple-500 border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-purple-300'
            }`}
            onClick={() => handlePhotoClick(photo)}
          >
            <CardContent className="p-3">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3">
                {photo.watermark_url ? (
                  <img
                    src={photo.watermark_url}
                    alt={photo.filename || photo.original_filename || 'Foto'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                
                {selected && (
                  <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                    <div className="bg-purple-500 text-white rounded-full p-2">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-600 truncate">
                {photo.filename || photo.original_filename || 'Sin nombre'}
              </div>
              
              {selected && (
                <Badge className="mt-2 bg-purple-500 text-white text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Seleccionada
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const StepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${
            currentStep === 'select_photos' ? 'text-purple-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              selectedPhotos.size > 0 ? 'bg-purple-500 text-white' : 'bg-gray-200'
            }`}>
              <Camera className="h-4 w-4" />
            </div>
            <span className="font-medium">Seleccionar Fotos</span>
          </div>
          
          <ArrowRight className="h-4 w-4 text-gray-400" />
          
          <div className={`flex items-center space-x-2 ${
            currentStep === 'select_products' ? 'text-purple-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              totalItems > 0 ? 'bg-purple-500 text-white' : 'bg-gray-200'
            }`}>
              <Package className="h-4 w-4" />
            </div>
            <span className="font-medium">Elegir Productos</span>
          </div>
          
          <ArrowRight className="h-4 w-4 text-gray-400" />
          
          <div className={`flex items-center space-x-2 ${
            currentStep === 'review' ? 'text-purple-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'review' ? 'bg-purple-500 text-white' : 'bg-gray-200'
            }`}>
              <ShoppingCart className="h-4 w-4" />
            </div>
            <span className="font-medium">Finalizar</span>
          </div>
        </div>
        
        {totalItems > 0 && (
          <Button
            onClick={handleOpenCart}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Ver Carrito ({totalItems})
          </Button>
        )}
      </div>
      
      <Progress value={getStepProgress()} className="w-full" />
    </div>
  );

  if (isLoadingCatalog) {
    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando catálogo de productos...</p>
        </div>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className={`${className}`}>
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            {catalogError}
            <Button 
              variant="link" 
              className="ml-2 text-red-700 underline p-0"
              onClick={loadProductCatalog}
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay productos disponibles
        </h3>
        <p className="text-gray-600">
          No se encontraron productos para este evento
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <StepIndicator />

      <Tabs value={currentStep} onValueChange={(value: any) => setCurrentStep(value)}>
        <TabsContent value="select_photos" className="space-y-6">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Selecciona las fotos que deseas comprar
            </h2>
            <p className="text-gray-600">
              Haz clic en las fotos para seleccionarlas. Puedes elegir cuantas quieras.
            </p>
            
            {selectedPhotos.size > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-purple-900">
                      {selectedPhotos.size} foto{selectedPhotos.size !== 1 ? 's' : ''} seleccionada{selectedPhotos.size !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearPhotos}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Limpiar selección
                    </Button>
                    <Button
                      onClick={handleContinueToProducts}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Continuar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <PhotoGrid />
        </TabsContent>

        <TabsContent value="select_products" className="space-y-6">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Elige los productos para tus fotos
            </h2>
            <p className="text-gray-600">
              Selecciona entre productos individuales o paquetes combo con descuentos especiales.
            </p>
            
            {selectedPhotos.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Camera className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {selectedPhotos.size} foto{selectedPhotos.size !== 1 ? 's' : ''} seleccionada{selectedPhotos.size !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep('select_photos')}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    Cambiar selección
                  </Button>
                </div>
              </div>
            )}
          </div>

          <ProductCatalogDisplay
            categories={catalog.categories}
            products={catalog.products}
            combos={catalog.combos}
            onProductSelect={handleProductSelect}
            onComboSelect={handleComboSelect}
            selectedPhotos={selectedPhotosList.map(p => p.id)}
            eventId={eventId}
          />
        </TabsContent>
      </Tabs>

      {/* Product Selector Modal */}
      <PhotoProductSelector
        isOpen={isProductSelectorOpen}
        onClose={() => setIsProductSelectorOpen(false)}
        selectedPhotos={selectedPhotosList}
        products={catalog.products}
        combos={catalog.combos}
        categories={catalog.categories}
        eventId={eventId}
      />

      {/* Enhanced Cart Drawer */}
      <EnhancedCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleCheckout}
        eventId={eventId}
        token={token}
      />

      {/* Floating Cart Button */}
      {totalItems > 0 && (
        <Button
          onClick={handleOpenCart}
          className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 z-50"
        >
          <div className="relative">
            <ShoppingCart className="h-6 w-6" />
            <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {totalItems}
            </span>
          </div>
        </Button>
      )}
    </div>
  );
}
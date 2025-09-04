'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Camera,
  Package,
  Star,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  Sparkles,
  Crown,
  Download,
  Palette,
  Ruler,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  PhotoProduct,
  ComboPackage,
  ProductCategory,
  formatProductSize,
  formatProductSpecs,
  isPhysicalProduct,
} from '@/lib/types/products';
import { formatProductPrice } from '@/lib/services/product-pricing';
import { useProductCustomization } from '@/lib/stores/product-cart-store';

interface PhotoProductSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPhotos: Array<{
    id: string;
    filename?: string;
    watermark_url?: string;
  }>;
  products: PhotoProduct[];
  combos: ComboPackage[];
  categories: ProductCategory[];
  eventId?: string;
}

interface ProductCustomization {
  finish?: string;
  paper_quality?: string;
  quantity: number;
  special_instructions?: string;
}

export function PhotoProductSelector({
  isOpen,
  onClose,
  selectedPhotos,
  products,
  combos,
  categories,
  eventId,
}: PhotoProductSelectorProps) {
  const [currentStep, setCurrentStep] = useState<
    'select' | 'customize' | 'confirm'
  >('select');
  const [selectedProductType, setSelectedProductType] = useState<
    'individual' | 'combo'
  >('individual');
  const [marketTab, setMarketTab] = useState<'packages' | 'prints' | 'wallart'>('packages');
  const [selectedProduct, setSelectedProduct] = useState<PhotoProduct | null>(
    null
  );
  const [selectedCombo, setSelectedCombo] = useState<ComboPackage | null>(null);
  const [customizations, setCustomizations] = useState<
    Record<string, ProductCustomization>
  >({});
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const { selectProductForPhoto, selectComboForPhotos, getPhotoProduct } =
    useProductCustomization();

  const currentPhoto = selectedPhotos[currentPhotoIndex];
  const isLastPhoto = currentPhotoIndex === selectedPhotos.length - 1;
  const isFirstPhoto = currentPhotoIndex === 0;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('select');
      setCurrentPhotoIndex(0);
      setSelectedProduct(null);
      setSelectedCombo(null);
      setCustomizations({});
    }
  }, [isOpen]);

  const handleProductSelect = (product: PhotoProduct) => {
    setSelectedProduct(product);
    setSelectedCombo(null);
    setSelectedProductType('individual');

    // Initialize customization for current photo
    const photoId = currentPhoto.id;
    setCustomizations((prev) => ({
      ...prev,
      [photoId]: {
        quantity: 1,
        finish: product.finish || 'glossy',
        paper_quality: product.paper_quality || 'standard',
      },
    }));

    setCurrentStep('customize');
  };

  const handleComboSelect = (combo: ComboPackage) => {
    setSelectedCombo(combo);
    setSelectedProduct(null);
    setSelectedProductType('combo');
    setCurrentStep('customize');
  };

  const handleCustomizationChange = (
    photoId: string,
    field: keyof ProductCustomization,
    value: any
  ) => {
    setCustomizations((prev) => ({
      ...prev,
      [photoId]: {
        ...prev[photoId],
        [field]: value,
      },
    }));
  };

  const handleConfirmSelection = () => {
    if (selectedProductType === 'individual' && selectedProduct) {
      // Apply individual product to current photo
      const customization = customizations[currentPhoto.id];
      selectProductForPhoto(
        currentPhoto.id,
        selectedProduct.id,
        selectedProduct,
        customization?.quantity || 1
      );

      // Move to next photo or finish
      if (!isLastPhoto) {
        setCurrentPhotoIndex((prev) => prev + 1);
        setCurrentStep('select');
        setSelectedProduct(null);
      } else {
        setCurrentStep('confirm');
      }
    } else if (selectedProductType === 'combo' && selectedCombo) {
      // Apply combo to all selected photos
      const photoIds = selectedPhotos.map((photo) => photo.id);
      selectComboForPhotos(photoIds, selectedCombo.id, selectedCombo);
      setCurrentStep('confirm');
    }
  };

  const handleFinish = () => {
    onClose();
  };

  const goToPreviousPhoto = () => {
    if (!isFirstPhoto) {
      setCurrentPhotoIndex((prev) => prev - 1);
      setCurrentStep('select');
      setSelectedProduct(null);
      setSelectedCombo(null);
    }
  };

  const goToNextPhoto = () => {
    if (!isLastPhoto) {
      setCurrentPhotoIndex((prev) => prev + 1);
      setCurrentStep('select');
      setSelectedProduct(null);
      setSelectedCombo(null);
    }
  };

  const ProductCard = ({ product }: { product: PhotoProduct }) => {
    const isSelected = selectedProduct?.id === product.id;

    return (
      <Card
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected
            ? 'border-purple-500 ring-2 ring-purple-500'
            : 'border-gray-200 hover:border-purple-300'
        }`}
        onClick={() => handleProductSelect(product)}
      >
        <CardHeader className="pb-3">
          <div className="relative">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                width={200}
                height={150}
                className="h-32 w-full rounded-lg bg-gray-100 object-cover"
              />
            ) : (
              <div className="flex h-32 w-full items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-pink-100">
                <Camera className="h-8 w-8 text-purple-500" />
              </div>
            )}

            {product.is_featured && (
              <Badge className="absolute right-2 top-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-xs text-black">
                <Star className="mr-1 h-3 w-3" />
                Destacado
              </Badge>
            )}

            {isSelected && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-purple-500/20">
                <div className="rounded-full bg-purple-500 p-2 text-white">
                  <Check className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900">{product.name}</h3>
            {product.description && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                {product.description}
              </p>
            )}
          </div>

          <div className="space-y-1">
            {isPhysicalProduct(product) && (
              <div className="text-sm text-gray-500">
                📏 {formatProductSize(product)}
              </div>
            )}
            <div className="text-sm text-gray-500">
              {formatProductSpecs(product)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-purple-600">
              {formatProductPrice(product.base_price)}
            </div>
            {product.type === 'digital' && (
              <Badge variant="outline" className="text-xs">
                <Download className="mr-1 h-3 w-3" />
                Digital
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const ComboCard = ({ combo }: { combo: ComboPackage }) => {
    const isSelected = selectedCombo?.id === combo.id;
    const canSelectCombo =
      selectedPhotos.length >= combo.min_photos &&
      (!combo.max_photos || selectedPhotos.length <= combo.max_photos);

    return (
      <Card
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected
            ? 'border-purple-500 ring-2 ring-purple-500'
            : canSelectCombo
              ? 'border-gray-200 hover:border-purple-300'
              : 'cursor-not-allowed border-gray-200 opacity-50'
        }`}
        onClick={() => canSelectCombo && handleComboSelect(combo)}
      >
        <CardHeader className="pb-3">
          <div className="relative">
            {combo.badge_text && (
              <Badge
                className={`absolute left-2 top-2 z-10 text-xs ${
                  combo.badge_color === 'blue'
                    ? 'bg-blue-500'
                    : combo.badge_color === 'green'
                      ? 'bg-green-500'
                      : combo.badge_color === 'purple'
                        ? 'bg-purple-500'
                        : combo.badge_color === 'orange'
                          ? 'bg-orange-500'
                          : 'bg-blue-500'
                } text-white`}
              >
                {combo.badge_text}
              </Badge>
            )}

            {combo.image_url ? (
              <Image
                src={combo.image_url}
                alt={combo.name}
                width={200}
                height={150}
                className="h-32 w-full rounded-lg bg-gray-100 object-cover"
              />
            ) : (
              <div className="flex h-32 w-full items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 via-pink-100 to-purple-100">
                <Package className="mr-2 h-8 w-8 text-purple-500" />
                <span className="font-medium text-purple-700">
                  {combo.name}
                </span>
              </div>
            )}

            {isSelected && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-purple-500/20">
                <div className="rounded-full bg-purple-500 p-2 text-white">
                  <Check className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900">{combo.name}</h3>
            {combo.description && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                {combo.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Fotos incluidas:</span>
              <span className="font-medium">
                {combo.min_photos}
                {combo.max_photos &&
                  combo.max_photos !== combo.min_photos &&
                  ` - ${combo.max_photos}`}
                {!combo.max_photos && '+'}
              </span>
            </div>

            {!canSelectCombo && (
              <Alert className="py-2">
                <Info className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  {selectedPhotos.length < combo.min_photos
                    ? `Necesitas al menos ${combo.min_photos} fotos`
                    : `Máximo ${combo.max_photos} fotos permitidas`}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-purple-600">
              {formatProductPrice(combo.base_price)}
            </div>
            <Badge variant="outline" className="text-xs">
              <Package className="mr-1 h-3 w-3" />
              Combo
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  const CustomizationPanel = () => {
    if (!selectedProduct) return null;

    const customization = customizations[currentPhoto.id] || {};

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Personaliza tu producto
          </h3>
          <p className="text-sm text-gray-600">
            {selectedProduct.name} para {currentPhoto.filename || 'tu foto'}
          </p>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label className="font-medium">Cantidad</Label>
          <Select
            value={customization.quantity?.toString() || '1'}
            onValueChange={(value) =>
              handleCustomizationChange(
                currentPhoto.id,
                'quantity',
                parseInt(value)
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 10].map((qty) => (
                <SelectItem key={qty} value={qty.toString()}>
                  {qty} {qty === 1 ? 'copia' : 'copias'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Physical product customizations */}
        {isPhysicalProduct(selectedProduct) && (
          <>
            {/* Finish */}
            <div className="space-y-3">
              <Label className="flex items-center font-medium">
                <Palette className="mr-2 h-4 w-4" />
                Acabado
              </Label>
              <RadioGroup
                value={
                  customization.finish || selectedProduct.finish || 'glossy'
                }
                onValueChange={(value) =>
                  handleCustomizationChange(currentPhoto.id, 'finish', value)
                }
              >
                <div className="grid grid-cols-2 gap-3">
                  {['glossy', 'matte', 'canvas', 'metallic'].map((finish) => (
                    <div key={finish} className="flex items-center space-x-2">
                      <RadioGroupItem value={finish} id={`finish-${finish}`} />
                      <Label
                        htmlFor={`finish-${finish}`}
                        className="text-sm capitalize"
                      >
                        {finish === 'glossy' && 'Brillante'}
                        {finish === 'matte' && 'Mate'}
                        {finish === 'canvas' && 'Canvas'}
                        {finish === 'metallic' && 'Metálico'}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Paper Quality */}
            <div className="space-y-3">
              <Label className="flex items-center font-medium">
                <Crown className="mr-2 h-4 w-4" />
                Calidad del papel
              </Label>
              <RadioGroup
                value={
                  customization.paper_quality ||
                  selectedProduct.paper_quality ||
                  'standard'
                }
                onValueChange={(value) =>
                  handleCustomizationChange(
                    currentPhoto.id,
                    'paper_quality',
                    value
                  )
                }
              >
                <div className="space-y-2">
                  {[
                    { value: 'standard', label: 'Estándar', extra: '' },
                    { value: 'premium', label: 'Premium', extra: '+$500' },
                    {
                      value: 'professional',
                      label: 'Profesional',
                      extra: '+$1000',
                    },
                  ].map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2"
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={`quality-${option.value}`}
                      />
                      <Label
                        htmlFor={`quality-${option.value}`}
                        className="flex-1 text-sm"
                      >
                        {option.label}{' '}
                        {option.extra && (
                          <span className="font-medium text-purple-600">
                            {option.extra}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </>
        )}

        {/* Price Preview */}
        <div className="rounded-lg bg-purple-50 p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">Precio total:</span>
            <span className="text-xl font-bold text-purple-600">
              {formatProductPrice(
                selectedProduct.base_price * (customization.quantity || 1)
              )}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Camera className="mr-2 h-5 w-5 text-purple-500" />
              Seleccionar productos
            </span>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              {selectedProductType === 'individual' && (
                <span>
                  Foto {currentPhotoIndex + 1} de {selectedPhotos.length}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Photo Preview */}
          {currentStep !== 'confirm' && (
            <div className="flex items-center justify-center">
              <div className="relative">
                {currentPhoto?.watermark_url ? (
                  <Image
                    src={currentPhoto.watermark_url}
                    alt={currentPhoto.filename || 'Foto seleccionada'}
                    width={150}
                    height={150}
                    className="h-32 w-32 rounded-lg border-2 border-purple-200 object-cover"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-100 to-pink-100">
                    <Camera className="h-8 w-8 text-purple-500" />
                  </div>
                )}
                <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 transform bg-purple-500 text-xs text-white">
                  {currentPhoto?.filename || 'Foto'}
                </Badge>
              </div>
            </div>
          )}

          {/* Step Content */}
          {currentStep === 'select' && (
            <div className="space-y-4">
              {/* Pixieset-like tabs */}
              <Tabs value={marketTab} onValueChange={(v: any) => setMarketTab(v)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="packages">Packages</TabsTrigger>
                  <TabsTrigger value="prints">Prints</TabsTrigger>
                  <TabsTrigger value="wallart">Wall Art</TabsTrigger>
                </TabsList>

                <TabsContent value="packages" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {combos
                      .filter((c) => c.is_active)
                      .map((combo) => (
                        <ComboCard key={combo.id} combo={combo} />
                      ))}
                  </div>
                </TabsContent>

                <TabsContent value="prints" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {products
                      .filter((p) => p.is_active && p.type === 'print')
                      .map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                  </div>
                </TabsContent>

                <TabsContent value="wallart" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {products
                      .filter(
                        (p) =>
                          p.is_active &&
                          (p.finish === 'canvas' ||
                            p.finish === 'metallic' ||
                            (p.category?.name || '')
                              .toLowerCase()
                              .includes('wall'))
                      )
                      .map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {currentStep === 'customize' && <CustomizationPanel />}

          {currentStep === 'confirm' && (
            <div className="space-y-4 text-center">
              <div className="mb-4 text-green-600">
                <CheckCircle className="mx-auto mb-2 h-16 w-16" />
                <h3 className="text-lg font-semibold">
                  ¡Productos agregados al carrito!
                </h3>
                <p className="text-gray-600">
                  {selectedProductType === 'combo'
                    ? `Combo aplicado a ${selectedPhotos.length} fotos`
                    : `Producto configurado para ${selectedPhotos.length} foto(s)`}
                </p>
              </div>
            </div>
          )}

          {/* Navigation and Actions */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center space-x-2">
              {currentStep !== 'confirm' &&
                selectedProductType === 'individual' &&
                !isFirstPhoto && (
                  <Button variant="outline" onClick={goToPreviousPhoto}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Anterior
                  </Button>
                )}
            </div>

            <div className="flex items-center space-x-2">
              {currentStep === 'select' &&
                (selectedProduct || selectedCombo) && (
                  <Button
                    onClick={handleConfirmSelection}
                    className="bg-purple-600 text-white hover:bg-purple-700"
                  >
                    {selectedProductType === 'combo'
                      ? 'Aplicar combo'
                      : 'Personalizar'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}

              {currentStep === 'customize' && (
                <Button
                  onClick={handleConfirmSelection}
                  className="bg-purple-600 text-white hover:bg-purple-700"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {isLastPhoto || selectedProductType === 'combo'
                    ? 'Agregar al carrito'
                    : 'Siguiente foto'}
                </Button>
              )}

              {currentStep === 'confirm' && (
                <Button
                  onClick={handleFinish}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Finalizar
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

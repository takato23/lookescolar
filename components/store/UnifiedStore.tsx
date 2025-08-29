'use client';

import { useState, useEffect } from 'react';
import { useUnifiedStore } from '@/lib/stores/unified-store';
import { PRODUCT_CATALOG } from '@/lib/types/unified-store';
import { ThemedGalleryWrapper } from '@/components/gallery/ThemedGalleryWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ShoppingCart, Package, Image, Users, User, MapPin, Mail, Phone, CreditCard, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { z } from 'zod';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
}

interface Subject {
  id: string;
  name: string;
  grade_section: string;
  event: {
    name: string;
    school_name: string;
    theme?: string;
  };
}

interface UnifiedStoreProps {
  token: string;
  photos: Photo[];
  subject: Subject;
  onBack?: () => void;
}

// Validation schemas
const ContactSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Teléfono inválido').optional(),
  street: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  city: z.string().min(2, 'La ciudad es requerida'),
  state: z.string().min(2, 'La provincia es requerida'),
  zipCode: z.string().min(4, 'Código postal inválido'),
});

export function UnifiedStore({
  token,
  photos,
  subject,
  onBack,
}: UnifiedStoreProps) {
  const {
    // State
    selectedPackage,
    selectedPhotos,
    cartItems,
    checkoutStep,
    contactInfo,
    
    // Actions
    setToken,
    setEventInfo,
    selectPackage,
    selectIndividualPhoto,
    selectGroupPhoto,
    removeSelectedPhoto,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    setContactInfo,
    nextStep,
    prevStep,
    canProceedToNextStep,
    getTotalPrice,
    getBasePrice,
    getAdditionsPrice,
    createOrder,
  } = useUnifiedStore();

  // Local state for contact form and payment
  const [contactForm, setContactForm] = useState({
    name: contactInfo?.name || '',
    email: contactInfo?.email || '',
    phone: contactInfo?.phone || '',
    street: contactInfo?.address?.street || '',
    city: contactInfo?.address?.city || '',
    state: contactInfo?.address?.state || '',
    zipCode: contactInfo?.address?.zipCode || '',
  });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Initialize store
  useEffect(() => {
    setToken(token);
    setEventInfo({
      name: subject.event.name,
      schoolName: subject.event.school_name,
      gradeSection: subject.grade_section,
    });
  }, [token, subject, setToken, setEventInfo]);

  // Get event theme
  const eventTheme = (subject.event.theme as any) || 'default';

  // Separate photos by type (this would need to come from API in real implementation)
  const individualPhotos = photos.filter(p => !p.filename.toLowerCase().includes('grupo'));
  const groupPhotos = photos.filter(p => p.filename.toLowerCase().includes('grupo'));

  // Handle contact form changes
  const handleContactFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (contactErrors[name]) {
      setContactErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Save contact info to store
  const saveContactInfo = () => {
    try {
      const validatedData = ContactSchema.parse(contactForm);
      
      const contactInfo = {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone || '',
        address: {
          street: validatedData.street,
          city: validatedData.city,
          state: validatedData.state,
          zipCode: validatedData.zipCode,
          country: 'Argentina',
        },
      };
      
      setContactInfo(contactInfo);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setContactErrors(newErrors);
        return false;
      }
      return false;
    }
  };

  // Process payment
  const processPayment = async () => {
    if (!selectedPackage || !contactInfo) {
      toast.error('Información incompleta');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Create order
      const order = createOrder();
      if (!order) {
        throw new Error('Error creando la orden');
      }

      // Create payment preference
      const response = await fetch('/api/store/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error creando preferencia de pago');
      }

      const { init_point, sandbox_init_point } = await response.json();
      
      // Redirect to MercadoPago checkout
      const checkoutUrl = process.env.NODE_ENV === 'production' ? init_point : sandbox_init_point;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error('URL de pago no disponible');
      }

    } catch (error) {
      console.error('Payment error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error procesando el pago'
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const renderPackageSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Selecciona tu Paquete</h2>
        <p className="text-muted-foreground">
          Elige entre nuestras opciones de carpetas personalizadas
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {PRODUCT_CATALOG.productOptions.map((option) => (
          <Card 
            key={option.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedPackage?.id === option.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => selectPackage(option.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {option.name}
                </CardTitle>
                <Badge variant="secondary">
                  {formatCurrency(option.basePrice)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {option.description}
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Carpeta personalizada:</span>
                  <span className="font-medium">{option.contents.folderSize}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fotos individuales:</span>
                  <span className="font-medium">
                    {option.contents.individualPhotos} x {option.contents.individualSize}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Fotos pequeñas:</span>
                  <span className="font-medium">
                    {option.contents.smallPhotos} x {option.contents.smallSize}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Foto grupal:</span>
                  <span className="font-medium">
                    {option.contents.groupPhotos} x {option.contents.groupSize}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button 
          onClick={nextStep} 
          disabled={!canProceedToNextStep()}
          className="theme-button"
        >
          Continuar
        </Button>
      </div>
    </div>
  );

  const renderPhotoSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Selecciona tus Fotos</h2>
        <p className="text-muted-foreground">
          Elige las fotos que quieres incluir en tu {selectedPackage?.name}
        </p>
      </div>

      {selectedPackage && (
        <div className="grid gap-6">
          {/* Individual Photos */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Image className="h-5 w-5" />
              Fotos Individuales 
              <Badge variant="outline">
                {selectedPhotos.individual.length}/{selectedPackage.contents.individualPhotos}
              </Badge>
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {individualPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className={`photo-card cursor-pointer transition-all ${
                    selectedPhotos.individual.includes(photo.id) 
                      ? 'selected-photo' 
                      : ''
                  }`}
                  onClick={() => selectIndividualPhoto(photo.id)}
                >
                  <img
                    src={photo.preview_url}
                    alt={photo.filename}
                    className="w-full h-32 object-cover rounded"
                  />
                  <p className="text-xs mt-1 truncate">{photo.filename}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Group Photos */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Fotos Grupales
              <Badge variant="outline">
                {selectedPhotos.group.length}/{selectedPackage.contents.groupPhotos}
              </Badge>
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {groupPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className={`photo-card cursor-pointer transition-all ${
                    selectedPhotos.group.includes(photo.id) 
                      ? 'selected-photo' 
                      : ''
                  }`}
                  onClick={() => selectGroupPhoto(photo.id)}
                >
                  <img
                    src={photo.preview_url}
                    alt={photo.filename}
                    className="w-full h-32 object-cover rounded"
                  />
                  <p className="text-xs mt-1 truncate">{photo.filename}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          Anterior
        </Button>
        <Button 
          onClick={nextStep} 
          disabled={!canProceedToNextStep()}
          className="theme-button"
        >
          Continuar
        </Button>
      </div>
    </div>
  );

  const renderExtrasSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Copias Adicionales</h2>
        <p className="text-muted-foreground">
          Añade copias extras en diferentes tamaños (opcional)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PRODUCT_CATALOG.additionalCopies.map((copy) => (
          <Card key={copy.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{copy.name}</h4>
                <Badge variant="secondary">
                  {formatCurrency(copy.price)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const existingItem = cartItems.find(item => item.productId === copy.id);
                    if (existingItem && existingItem.quantity > 0) {
                      updateCartItemQuantity(existingItem.id, existingItem.quantity - 1);
                    }
                  }}
                >
                  -
                </Button>
                
                <span className="w-8 text-center">
                  {cartItems.find(item => item.productId === copy.id)?.quantity || 0}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const existingItem = cartItems.find(item => item.productId === copy.id);
                    if (existingItem) {
                      updateCartItemQuantity(existingItem.id, existingItem.quantity + 1);
                    } else {
                      addToCart({
                        type: 'additional_copy',
                        productId: copy.id,
                        quantity: 1,
                        unitPrice: copy.price,
                        metadata: { size: copy.size }
                      });
                    }
                  }}
                >
                  +
                </Button>
              </div>
              
              {copy.isSet && (
                <p className="text-xs text-muted-foreground mt-1">
                  Set de {copy.setQuantity} fotos
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          Anterior
        </Button>
        <Button onClick={nextStep} className="theme-button">
          Continuar
        </Button>
      </div>
    </div>
  );

  const renderContactForm = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Información de Contacto</h2>
        <p className="text-muted-foreground">
          Completa tus datos para el envío del pedido
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Datos Personales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre completo *</Label>
              <Input
                id="name"
                name="name"
                value={contactForm.name}
                onChange={handleContactFormChange}
                placeholder="Tu nombre completo"
              />
              {contactErrors.name && (
                <p className="text-sm text-red-500 mt-1">{contactErrors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={contactForm.email}
                onChange={handleContactFormChange}
                placeholder="tu@email.com"
              />
              {contactErrors.email && (
                <p className="text-sm text-red-500 mt-1">{contactErrors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={contactForm.phone}
                onChange={handleContactFormChange}
                placeholder="11 1234-5678"
              />
              {contactErrors.phone && (
                <p className="text-sm text-red-500 mt-1">{contactErrors.phone}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Dirección de Envío
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="street">Dirección *</Label>
              <Input
                id="street"
                name="street"
                value={contactForm.street}
                onChange={handleContactFormChange}
                placeholder="Av. Corrientes 1234, Piso 5, Depto A"
              />
              {contactErrors.street && (
                <p className="text-sm text-red-500 mt-1">{contactErrors.street}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="city">Ciudad *</Label>
                <Input
                  id="city"
                  name="city"
                  value={contactForm.city}
                  onChange={handleContactFormChange}
                  placeholder="Buenos Aires"
                />
                {contactErrors.city && (
                  <p className="text-sm text-red-500 mt-1">{contactErrors.city}</p>
                )}
              </div>

              <div>
                <Label htmlFor="state">Provincia *</Label>
                <Input
                  id="state"
                  name="state"
                  value={contactForm.state}
                  onChange={handleContactFormChange}
                  placeholder="CABA"
                />
                {contactErrors.state && (
                  <p className="text-sm text-red-500 mt-1">{contactErrors.state}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="zipCode">Código Postal *</Label>
              <Input
                id="zipCode"
                name="zipCode"
                value={contactForm.zipCode}
                onChange={handleContactFormChange}
                placeholder="1043"
              />
              {contactErrors.zipCode && (
                <p className="text-sm text-red-500 mt-1">{contactErrors.zipCode}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          Anterior
        </Button>
        <Button 
          onClick={() => {
            if (saveContactInfo()) {
              nextStep();
            }
          }}
          className="theme-button"
        >
          Continuar
        </Button>
      </div>
    </div>
  );

  const renderPayment = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Finalizar Pedido</h2>
        <p className="text-muted-foreground">
          Revisa tu pedido y procede al pago seguro
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen del Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Base Package */}
          {selectedPackage && (
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{selectedPackage.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedPackage.description}
                </p>
              </div>
              <p className="font-medium">{formatCurrency(selectedPackage.basePrice)}</p>
            </div>
          )}

          {/* Additional Copies */}
          {cartItems.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium">Copias Adicionales:</p>
                {cartItems.map((item) => {
                  const copy = PRODUCT_CATALOG.additionalCopies.find(c => c.id === item.productId);
                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{copy?.name} x{item.quantity}</span>
                      <span>{formatCurrency(item.totalPrice)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Shipping */}
          <Separator />
          <div className="flex justify-between">
            <span>Envío</span>
            <span>{formatCurrency(PRODUCT_CATALOG.pricing.shippingCost || 0)}</span>
          </div>

          {/* Total */}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(getTotalPrice())}</span>
          </div>
        </CardContent>
      </Card>

      {/* Contact Summary */}
      {contactInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Información de Envío</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{contactInfo.name}</p>
              <p>{contactInfo.email}</p>
              {contactInfo.phone && <p>{contactInfo.phone}</p>}
              <p>{contactInfo.address.street}</p>
              <p>{contactInfo.address.city}, {contactInfo.address.state} {contactInfo.address.zipCode}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          Anterior
        </Button>
        <Button 
          onClick={processPayment}
          disabled={isProcessingPayment}
          className="theme-button flex items-center gap-2"
        >
          {isProcessingPayment ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Pagar con MercadoPago
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (checkoutStep) {
      case 'package':
        return renderPackageSelection();
      case 'photos':
        return renderPhotoSelection();
      case 'extras':
        return renderExtrasSelection();
      case 'contact':
        return renderContactForm();
      case 'payment':
        return renderPayment();
      default:
        return renderPackageSelection();
    }
  };

  return (
    <ThemedGalleryWrapper eventTheme={eventTheme as any}>
      <div className="min-h-screen p-4">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a la galería
            </Button>
            
            <div className="text-center">
              <h1 className="text-lg font-semibold">{subject.event.name}</h1>
              <p className="text-sm text-muted-foreground">
                {subject.event.school_name}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Paso {['package', 'photos', 'extras', 'contact', 'payment'].indexOf(checkoutStep) + 1} de 5
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(((['package', 'photos', 'extras', 'contact', 'payment'].indexOf(checkoutStep) + 1) / 5) * 100)}%` 
              }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {renderCurrentStep()}
        </div>
      </div>
    </ThemedGalleryWrapper>
  );
}

export default UnifiedStore;

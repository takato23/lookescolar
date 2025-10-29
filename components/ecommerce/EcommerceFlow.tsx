'use client';

import { useState, useEffect } from 'react';
import { Box, Stack, Typography, Container, Fab, Badge } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Button } from '@/components/ui/button';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import { useUnifiedStore } from '@/lib/stores/unified-store';
import { CheckoutStepIndicator } from './CheckoutStepIndicator';
import { ProductPackageCard } from './ProductPackageCard';
import { PhotoSelectionGrid } from './PhotoSelectionGrid';
import { ContactForm } from './ContactForm';
import { CartDrawer } from './CartDrawer';
import { QuantityControl } from './QuantityControl';
import { 
  CheckoutStep, 
  mockEcommerceData, 
  formatCurrency,
  AdditionalCopy 
} from '@/lib/types/ecommerceMockData';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';

const FlowContainer = styled(Box)({
  minHeight: '100vh',
  backgroundColor: '#ffffff',
  paddingTop: '24px',
  paddingBottom: '100px', // Space for floating cart button
});

const StepContent = styled(Box)({
  marginTop: '32px',
  marginBottom: '48px',
});

const NavigationBar = styled(Box)({
  position: 'sticky',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: '#ffffff',
  borderTop: '1px solid #e5e7eb',
  padding: '16px 24px',
  zIndex: 1000,
});

const FloatingCartButton = styled(Fab)({
  position: 'fixed',
  bottom: '100px',
  right: '24px',
  zIndex: 1001,
  backgroundColor: '#1976d2',
  color: '#ffffff',
  '&:hover': {
    backgroundColor: '#1565c0',
    transform: 'scale(1.05)',
  }
});

// Validation schema for contact info
const ContactSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Teléfono inválido').optional(),
  street: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  city: z.string().min(2, 'La ciudad es requerida'),
  state: z.string().min(2, 'La provincia es requerida'),
  zipCode: z.string().min(4, 'Código postal inválido'),
});

interface EcommerceFlowProps {
  token: string;
  onComplete?: (orderId: string) => void;
}

export function EcommerceFlow({ token, onComplete }: EcommerceFlowProps) {
  const {
    selectedPackage,
    selectedPhotos,
    cartItems,
    checkoutStep,
    contactInfo,
    selectPackage,
    selectIndividualPhoto,
    selectGroupPhoto,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    setContactInfo,
    nextStep,
    prevStep,
    canProceedToNextStep,
    getTotalPrice,
    createOrder,
    setToken,
    setCatalog,
  } = useUnifiedStore();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<CheckoutStep[]>([]);

  // Initialize store
  useEffect(() => {
    setToken(token);
  }, [token, setToken]);

  useEffect(() => {
    setCatalog({
      packages: mockEcommerceData.packages.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        basePrice: pkg.basePrice,
        price: pkg.basePrice,
        type: 'package',
        enabled: true,
        contents: pkg.contents,
        features: pkg.features,
      })),
      additionalCopies: mockEcommerceData.additionalCopies,
      pricing: {
        currency: mockEcommerceData.pricing.currency,
        shippingCost: mockEcommerceData.pricing.shippingCost,
        freeShippingThreshold: mockEcommerceData.pricing.freeShippingThreshold,
        taxIncluded: mockEcommerceData.pricing.taxIncluded,
      },
    });
  }, [setCatalog]);

  // Track completed steps
  useEffect(() => {
    const newCompletedSteps: CheckoutStep[] = [];
    
    if (selectedPackage) newCompletedSteps.push(CheckoutStep.PACKAGE);
    if (selectedPackage && 
        selectedPhotos.individual.length === selectedPackage.contents.individualPhotos &&
        selectedPhotos.group.length === selectedPackage.contents.groupPhotos) {
      newCompletedSteps.push(CheckoutStep.PHOTOS);
    }
    if (newCompletedSteps.includes(CheckoutStep.PHOTOS)) {
      newCompletedSteps.push(CheckoutStep.EXTRAS);
    }
    if (contactInfo) newCompletedSteps.push(CheckoutStep.CONTACT);
    
    setCompletedSteps(newCompletedSteps);
  }, [selectedPackage, selectedPhotos, contactInfo]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = getTotalPrice();

  const handlePhotoSelect = (photoId: string, type: 'individual' | 'group') => {
    if (type === 'individual') {
      selectIndividualPhoto(photoId);
    } else {
      selectGroupPhoto(photoId);
    }
  };

  const handleContactInfoChange = (info: any) => {
    setContactInfo(info);
    setContactErrors({});
  };

  const validateContactInfo = () => {
    if (!contactInfo) return false;
    
    try {
      ContactSchema.parse({
        name: contactInfo.name,
        email: contactInfo.email,
        phone: contactInfo.phone,
        street: contactInfo.address.street,
        city: contactInfo.address.city,
        state: contactInfo.address.state,
        zipCode: contactInfo.address.zipCode,
      });
      setContactErrors({});
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
      }
      return false;
    }
  };

  const handleNextStep = () => {
    if (checkoutStep === CheckoutStep.CONTACT) {
      if (!validateContactInfo()) {
        toast.error('Por favor completa todos los campos requeridos');
        return;
      }
    }
    nextStep();
  };

  const handleCheckout = async () => {
    if (!selectedPackage || !contactInfo) {
      toast.error('Información incompleta');
      return;
    }

    setIsProcessingPayment(true);

    try {
      const order = createOrder();
      if (!order) {
        throw new Error('Error creando la orden');
      }

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('¡Pedido procesado exitosamente!');
      onComplete?.(order.id);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Error procesando el pago');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const renderStepContent = () => {
    switch (checkoutStep) {
      case CheckoutStep.PACKAGE:
        return (
          <Stack spacing={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 2 }}>
                Selecciona tu Paquete
              </Typography>
              <Typography variant="body1" sx={{ color: '#6b7280', maxWidth: '600px', mx: 'auto' }}>
                Elige el paquete que mejor se adapte a tus necesidades. Cada paquete incluye una carpeta personalizada con fotos impresas de alta calidad.
              </Typography>
            </Box>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 4, maxWidth: '1000px', mx: 'auto' }}>
              {mockEcommerceData.packages.map((pkg, index) => (
                <ProductPackageCard
                  key={pkg.id}
                  package={pkg}
                  selected={selectedPackage?.id === pkg.id}
                  onSelect={selectPackage}
                  popular={index === 1}
                />
              ))}
            </Box>
          </Stack>
        );

      case CheckoutStep.PHOTOS:
        if (!selectedPackage) return null;
        
        return (
          <Stack spacing={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 2 }}>
                Selecciona tus Fotos
              </Typography>
              <Typography variant="body1" sx={{ color: '#6b7280', maxWidth: '600px', mx: 'auto' }}>
                Elige las fotos que quieres incluir en tu {selectedPackage.name}. 
                Necesitas seleccionar {selectedPackage.contents.individualPhotos} foto{selectedPackage.contents.individualPhotos !== 1 ? 's' : ''} individual{selectedPackage.contents.individualPhotos !== 1 ? 'es' : ''} y {selectedPackage.contents.groupPhotos} foto grupal.
              </Typography>
            </Box>
            
            <PhotoSelectionGrid
              photos={mockEcommerceData.availablePhotos}
              selectedPhotos={selectedPhotos}
              requirements={{
                individualPhotos: selectedPackage.contents.individualPhotos,
                groupPhotos: selectedPackage.contents.groupPhotos,
              }}
              onPhotoSelect={handlePhotoSelect}
            />
          </Stack>
        );

      case CheckoutStep.EXTRAS:
        return (
          <Stack spacing={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 2 }}>
                Copias Adicionales
              </Typography>
              <Typography variant="body1" sx={{ color: '#6b7280', maxWidth: '600px', mx: 'auto' }}>
                Agrega copias extras en diferentes tamaños para compartir con familiares y amigos.
              </Typography>
            </Box>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3, maxWidth: '1000px', mx: 'auto' }}>
              {mockEcommerceData.additionalCopies.map((copy) => {
                const existingItem = cartItems.find(item => item.productId === copy.id);
                const quantity = existingItem?.quantity || 0;
                
                return (
                  <Card key={copy.id} sx={{ height: '100%' }}>
                    <CardHeader sx={{ textAlign: 'center', pb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {copy.name}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1976d2' }}>
                        {formatCurrency(copy.price)}
                      </Typography>
                      {copy.isSet && (
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                          Set de {copy.setQuantity} fotos
                        </Typography>
                      )}
                    </CardHeader>
                    
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
                        {copy.description}
                      </Typography>
                      
                      <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
                        <QuantityControl
                          value={quantity}
                          onChange={(newQuantity) => {
                            if (existingItem) {
                              updateCartItemQuantity(existingItem.id, newQuantity);
                            } else if (newQuantity > 0) {
                              addToCart({
                                type: 'additional_copy',
                                productId: copy.id,
                                quantity: newQuantity,
                                unitPrice: copy.price,
                                metadata: { size: copy.size },
                              });
                            }
                          }}
                          min={0}
                          max={10}
                        />
                      </Stack>
                      
                      {quantity > 0 && (
                        <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 600, mt: 2 }}>
                          Subtotal: {formatCurrency(quantity * copy.price)}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Stack>
        );

      case CheckoutStep.CONTACT:
        return (
          <Stack spacing={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 2 }}>
                Información de Contacto
              </Typography>
              <Typography variant="body1" sx={{ color: '#6b7280', maxWidth: '600px', mx: 'auto' }}>
                Completa tus datos para procesar el pedido y coordinar el envío.
              </Typography>
            </Box>
            
            <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
              <ContactForm
                contactInfo={contactInfo}
                onContactInfoChange={handleContactInfoChange}
                errors={contactErrors}
              />
            </Box>
          </Stack>
        );

      case CheckoutStep.PAYMENT:
        return (
          <Stack spacing={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 2 }}>
                Resumen del Pedido
              </Typography>
              <Typography variant="body1" sx={{ color: '#6b7280', maxWidth: '600px', mx: 'auto' }}>
                Revisa tu pedido antes de proceder al pago.
              </Typography>
            </Box>
            
            <Box sx={{ maxWidth: '600px', mx: 'auto' }}>
              <Card>
                <CardHeader>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Resumen del Pedido
                  </Typography>
                </CardHeader>
                <CardContent>
                  <Stack spacing={3}>
                    {/* Package */}
                    {selectedPackage && (
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                          {selectedPackage.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
                          {selectedPackage.description}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                          {formatCurrency(selectedPackage.basePrice)}
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Additional Items */}
                    {cartItems.length > 0 && (
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                          Copias Adicionales
                        </Typography>
                        {cartItems.map((item) => (
                          <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="body2">
                              {item.metadata?.size ? `Copia ${item.metadata.size}` : 'Copia adicional'} x{item.quantity}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatCurrency(item.totalPrice)}
                            </Typography>
                          </Stack>
                        ))}
                      </Box>
                    )}
                    
                    {/* Total */}
                    <Box sx={{ pt: 2, borderTop: '1px solid #e5e7eb' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Total
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
                          {formatCurrency(totalPrice)}
                        </Typography>
                      </Stack>
                    </Box>
                    
                    {/* Payment Button */}
                    <Button
                      onClick={handleCheckout}
                      disabled={isProcessingPayment}
                      sx={{ 
                        width: '100%', 
                        py: 2, 
                        fontSize: '1.1rem',
                        fontWeight: 600,
                      }}
                    >
                      {isProcessingPayment ? (
                        'Procesando...'
                      ) : (
                        <>
                          <PaymentOutlinedIcon sx={{ mr: 1 }} />
                          Pagar con MercadoPago
                        </>
                      )}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <FlowContainer>
      <Container maxWidth="lg">
        {/* Step Indicator */}
        <CheckoutStepIndicator
          currentStep={checkoutStep}
          completedSteps={completedSteps}
        />
        
        {/* Step Content */}
        <StepContent>
          {renderStepContent()}
        </StepContent>
      </Container>

      {/* Navigation Bar */}
      <NavigationBar>
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={checkoutStep === CheckoutStep.PACKAGE}
              startIcon={<ArrowBackIcon />}
            >
              Anterior
            </Button>
            
            <Button
              onClick={handleNextStep}
              disabled={!canProceedToNextStep() || checkoutStep === CheckoutStep.PAYMENT}
              endIcon={<ArrowForwardIcon />}
            >
              {checkoutStep === CheckoutStep.PAYMENT ? 'Finalizar' : 'Continuar'}
            </Button>
          </Stack>
        </Container>
      </NavigationBar>

      {/* Floating Cart Button */}
      {totalItems > 0 && (
        <FloatingCartButton
          onClick={() => setIsCartOpen(true)}
          aria-label="Ver carrito"
        >
          <Badge badgeContent={totalItems} color="error">
            <ShoppingCartOutlinedIcon />
          </Badge>
        </FloatingCartButton>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateCartItemQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={() => {
          setIsCartOpen(false);
          // Navigate to payment step if not already there
          if (checkoutStep !== CheckoutStep.PAYMENT) {
            // You might want to implement a way to jump to payment step
          }
        }}
        totalPrice={totalPrice}
      />
    </FlowContainer>
  );
}

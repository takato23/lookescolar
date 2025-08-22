'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeftIcon, ShoppingCartIcon } from 'lucide-react';
import { useWizardStore } from '@/lib/stores/wizard-store';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';
import StepOptions from './wizard/step-options';
import StepSelection from './wizard/step-selection';
import StepUpsell from './wizard/step-upsell';
import StepSummary from './wizard/step-summary';

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
  };
}

interface WizardPageProps {
  onBackToGallery?: () => void;
}

export default function WizardPage({ onBackToGallery }: WizardPageProps) {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  const { 
    currentStep, 
    nextStep, 
    prevStep, 
    setStep,
    setToken,
    reset,
    canProceed,
    setPhotos: setSelectedPhotos
  } = useWizardStore();
  
  const { items: cartItems } = useUnifiedCartStore();

  // Initialize wizard with token and cart data
  useEffect(() => {
    if (token) {
      setToken(token);
      
      // Initialize wizard with current cart items
      if (cartItems.length > 0) {
        const photoIds = cartItems.map(item => item.photoId);
        setSelectedPhotos(photoIds);
      }
      
      loadGallery();
    }
  }, [token, setToken, cartItems, setSelectedPhotos]);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/family/gallery-simple/${token}?page=1&limit=200`);

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Error cargando galería');
        return;
      }

      const data = await response.json();
      setPhotos(data.photos || []);
      setSubject(data.subject);
    } catch (err) {
      console.error('Error:', err);
      setError('Error cargando la galería');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    try {
      setCheckoutLoading(true);
      
      // Here you would implement the actual checkout logic
      // For now, we'll simulate the process
      const response = await fetch('/api/family/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          contactInfo: { name: 'Cliente', email: 'cliente@example.com' },
          wizardData: {
            selectedOption: useWizardStore.getState().selectedOption,
            selectedPhotos: useWizardStore.getState().selectedPhotos,
            selectedUpsells: useWizardStore.getState().selectedUpsells,
          }
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error en checkout');
      }
      
      const data = await response.json();
      
      // Reset wizard and redirect to payment
      reset();
      window.location.href = data.redirectUrl;
    } catch (err) {
      console.error('[Wizard] Checkout error:', err);
      alert('No se pudo iniciar el pago. Por favor intentá de nuevo.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleBackToGallery = () => {
    reset();
    if (onBackToGallery) {
      onBackToGallery();
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <div>
            <p className="text-lg font-medium text-gray-700">Cargando wizard de compra...</p>
            <p className="text-sm text-gray-500 mt-1">Esto puede tomar unos segundos</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
        <div className="rounded-xl bg-white p-8 shadow-xl max-w-md w-full">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error cargando galería</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full rounded-lg bg-purple-600 px-4 py-2 text-white font-medium hover:bg-purple-700 transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToGallery}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Volver a la galería
              </button>
              
              {subject?.event && (
                <div className="text-sm text-gray-600">
                  {subject.event.name} • {subject.event.school_name}
                </div>
              )}
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    step <= currentStep
                      ? 'bg-purple-600'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Step Titles */}
          <div className="mt-2">
            <div className="text-sm text-gray-600">
              Paso {currentStep} de 4: {
                currentStep === 1 ? 'Seleccionar paquete' :
                currentStep === 2 ? 'Elegir fotos' :
                currentStep === 3 ? 'Agregar extras' :
                'Confirmar pedido'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Wizard Steps */}
      <div className="relative">
        {currentStep === 1 && (
          <StepOptions onNext={nextStep} />
        )}
        
        {currentStep === 2 && (
          <StepSelection 
            photos={photos}
            onNext={nextStep}
            onPrev={prevStep}
            loading={false}
          />
        )}
        
        {currentStep === 3 && (
          <StepUpsell 
            onNext={nextStep}
            onPrev={prevStep}
          />
        )}
        
        {currentStep === 4 && (
          <StepSummary 
            photos={photos}
            onPrev={prevStep}
            onCheckout={handleCheckout}
            loading={checkoutLoading}
          />
        )}
      </div>
    </div>
  );
}
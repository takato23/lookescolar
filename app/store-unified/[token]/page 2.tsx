'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { usePublicStore } from '@/lib/hooks/useStoreSettings';
import { useFamilyGallery } from '@/lib/hooks/useFamilyGallery';
import { PasswordProtectionModal } from '@/components/store/PasswordProtectionModal';
import { EditorialTemplate } from '@/components/store/templates/EditorialTemplate';
import { PixiesetTemplate } from '@/components/store/templates/PixiesetTemplate';
import { MinimalTemplate } from '@/components/store/templates/MinimalTemplate';
import { ModernMinimalTemplate } from '@/components/store/templates/ModernMinimalTemplate';
import { BoldVibrantTemplate } from '@/components/store/templates/BoldVibrantTemplate';
import { PremiumPhotographyTemplate } from '@/components/store/templates/PremiumPhotographyTemplate';
import { StudioDarkTemplate } from '@/components/store/templates/StudioDarkTemplate';
import { ClassicGalleryTemplate } from '@/components/store/templates/ClassicGalleryTemplate';
import { FashionEditorialTemplate } from '@/components/store/templates/FashionEditorialTemplate';
import { TemplateSelector } from '@/components/store/TemplateSelector';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, AlertCircle, Settings, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PhotoDebugInfo } from '@/components/store/PhotoDebugInfo';

// Template components map
const templateComponents = {
  pixieset: PixiesetTemplate,
  editorial: EditorialTemplate,
  minimal: MinimalTemplate,
  'modern-minimal': ModernMinimalTemplate,
  'bold-vibrant': BoldVibrantTemplate,
  'premium-photography': PremiumPhotographyTemplate,
  'studio-dark': StudioDarkTemplate,
  'classic-gallery': ClassicGalleryTemplate,
  'fashion-editorial': FashionEditorialTemplate
};

export default function StoreUnifiedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params?.token as string;
  
  // Template selection state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [storePassword, setStorePassword] = useState<string>('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const { 
    settings, 
    loading: settingsLoading, 
    error: settingsError, 
    passwordRequired,
    storeAvailable,
    retry: retryStoreSettings 
  } = usePublicStore(token, storePassword);
  const {
    data: galleryData,
    photos,
    subject,
    totalPhotos,
    isPreselected,
    loading: galleryLoading,
    error: galleryError,
    retry: retryGallery,
  } = useFamilyGallery(token);

  // Check for demo mode and template override from URL params
  useEffect(() => {
    const templateParam = searchParams?.get('template');
    const demoParam = searchParams?.get('demo');
    
    if (demoParam === 'true') {
      setIsDemo(true);
      setShowTemplateSelector(true);
    }
    
    if (templateParam && templateComponents[templateParam as keyof typeof templateComponents]) {
      setSelectedTemplate(templateParam);
    }
  }, [searchParams]);

  // Set default template when settings load
  useEffect(() => {
    if (settings && !selectedTemplate) {
      setSelectedTemplate(settings.template || 'pixieset');
    }
  }, [settings, selectedTemplate]);

  // Handle password protection
  useEffect(() => {
    if (passwordRequired && !storePassword) {
      setShowPasswordModal(true);
    } else {
      setShowPasswordModal(false);
    }
  }, [passwordRequired, storePassword]);

  // Handle password submission
  const handlePasswordSubmit = (password: string) => {
    setStorePassword(password);
    setShowPasswordModal(false);
  };

  // Combinar estados de carga
  const loading = settingsLoading || galleryLoading;
  const error = settingsError || galleryError;

  // Ensure dialogs/portals inherit the neutral store theme by applying the class to body
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.add('store-theme-reset');
      return () => document.body.classList.remove('store-theme-reset');
    }
  }, []);

  // Password protection modal
  if (showPasswordModal) {
    return (
      <PasswordProtectionModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handlePasswordSubmit}
        error={passwordRequired ? settingsError : null}
        brandName={settings?.custom_branding?.brand_name || 'LookEscolar'}
        welcomeMessage={settings?.welcome_message}
      />
    );
  }

  // Loading state
  if (loading && !passwordRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {settingsLoading && galleryLoading ? 'Cargando tienda...' : 
               settingsLoading ? 'Cargando configuración...' : 'Cargando fotos...'}
            </h2>
            <p className="text-gray-500">
              Por favor espera mientras cargamos tu galería
            </p>
          </div>
        </div>
      </div>
    );
  }

  if ((error && !passwordRequired) || (!settings && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {!storeAvailable ? 'Tienda no disponible' : 'Error al cargar la tienda'}
            </h2>
            <p className="text-gray-600">
              {error || 'No se pudo obtener la configuración de la tienda'}
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={() => {
                if (galleryError) retryGallery();
                else retryStoreSettings();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
            {passwordRequired && (
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Ingresar Contraseña
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Store disabled or not available
  if (!settings?.enabled || !storeAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-4">
          <ShoppingBag className="h-16 w-16 mx-auto text-gray-300" />
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Tienda Temporalmente Cerrada
            </h2>
            <p className="text-gray-600 max-w-md">
              {!storeAvailable 
                ? (settings?.store_schedule?.maintenance_message || 'La tienda se encuentra temporalmente no disponible.')
                : 'La tienda se encuentra temporalmente deshabilitada. Por favor, vuelve a intentar más tarde.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get template component
  const currentTemplate = selectedTemplate || settings?.template || 'pixieset';
  const TemplateComponent = templateComponents[currentTemplate as keyof typeof templateComponents] || PixiesetTemplate;

  // Show empty state if no photos
  if (!loading && photos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-4">
          <ShoppingBag className="h-16 w-16 mx-auto text-gray-300" />
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No hay fotos disponibles
            </h2>
            <p className="text-gray-600 max-w-md">
              {subject ? `No se encontraron fotos para ${subject.name}.` : 'No se encontraron fotos para este token.'}
              <br />
              Por favor, contacta con el colegio si crees que esto es un error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render store template with real data
  // Prefer subject from token; fallback to eventName for folder shares
  const effectiveSubject = subject || (galleryData?.eventName
    ? { name: galleryData.eventName, grade: '', section: '' }
    : undefined);

  // Apply custom CSS from branding settings
  useEffect(() => {
    if (settings?.custom_branding?.custom_css && typeof document !== 'undefined') {
      const customStyleId = 'store-custom-css';
      let styleElement = document.getElementById(customStyleId);
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = customStyleId;
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = settings.custom_branding.custom_css;
      
      return () => {
        const element = document.getElementById(customStyleId);
        if (element) element.remove();
      };
    }
  }, [settings?.custom_branding?.custom_css]);

  // Apply dynamic theme colors
  const dynamicStyles = settings?.custom_branding ? {
    '--store-primary': settings.custom_branding.primary_color || settings.colors.primary,
    '--store-secondary': settings.custom_branding.secondary_color || settings.colors.secondary,
    '--store-accent': settings.custom_branding.accent_color || settings.colors.accent,
    '--store-background': settings.colors.background,
    '--store-surface': settings.colors.surface,
    '--store-text': settings.colors.text,
    '--store-text-secondary': settings.colors.text_secondary,
    fontFamily: settings.custom_branding.font_family || 'Inter, sans-serif'
  } as React.CSSProperties : {};

  return (
    <div 
      className="store-theme-reset min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
      style={dynamicStyles}
    >
      {/* Demo Template Selector */}
      {(isDemo || showTemplateSelector) && (
        <div className="fixed top-4 left-4 z-50 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">
                {isDemo ? 'Demo Templates' : 'Template Selector'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplateSelector(!showTemplateSelector)}
            >
              {showTemplateSelector ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          
          {showTemplateSelector && (
            <TemplateSelector
              currentTemplate={currentTemplate as any}
              onTemplateChange={(template) => {
                setSelectedTemplate(template);
                if (isDemo) {
                  // Update URL params in demo mode
                  const url = new URL(window.location.href);
                  url.searchParams.set('template', template);
                  window.history.pushState({}, '', url);
                }
              }}
            />
          )}
          
          {isDemo && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                🎨 Demo Mode: Prueba diferentes templates
              </p>
            </div>
          )}
        </div>
      )}

      {/* Welcome Message */}
      {settings.welcome_message && !isDemo && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <p className="text-blue-800 text-sm text-center">
              {settings.welcome_message}
            </p>
          </div>
        </div>
      )}

      {/* Template Component */}
      <TemplateComponent
        settings={settings}
        photos={photos}
        token={token}
        subject={effectiveSubject as any}
        isPreselected={isPreselected}
        totalPhotos={totalPhotos}
      />
      
      {/* Debug Info */}
      <PhotoDebugInfo photos={photos} data={galleryData} />
      
      {/* Demo Instructions */}
      {isDemo && (
        <div className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-start space-x-2">
            <Eye className="h-5 w-5 mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Modo Demo Activo</h4>
              <p className="text-sm text-blue-100">
                Usa el selector de templates para probar diferentes diseños.
                <br />
                <strong>URL:</strong> ?demo=true&template=nombre
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal Template Component (fallback)
function MinimalTemplate({ settings, photos, token }: any) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Galería Fotográfica
        </h1>
        <p className="text-gray-600">
          Encuentra y compra tus fotos escolares
        </p>
      </div>

      {/* Products */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Productos Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(settings.products)
            .filter(([_, product]: [string, any]) => product.enabled)
            .map(([id, product]: [string, any]) => (
              <div key={id} className="border rounded-lg p-4">
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                <p className="text-lg font-semibold text-blue-600">
                  ${product.price}
                </p>
              </div>
            ))}
        </div>
      </div>

      {/* Photo Gallery */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Galería de Fotos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {photos.slice(0, 12).map((photo: any) => (
            <div key={photo.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img 
                src={photo.url} 
                alt={photo.alt}
                className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

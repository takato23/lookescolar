'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Settings2,
  Building2,
  Palette,
  ImageIcon,
  Camera,
  Upload,
  DollarSign,
  Bell,
  MessageCircle,
  Key,
  Globe,
  Download,
  Save,
  HardDrive,
  QrCode,
  ShoppingCart,
  Check,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Undo2,
  Paintbrush,
  ToggleLeft,
} from 'lucide-react';
import { FeaturesSettings } from './FeaturesSettings';
import { useTenantBranding, DEFAULT_BRANDING, type TenantBranding } from '@/lib/hooks/useTenantBranding';
import { AperturaLogo } from '@/components/ui/branding/AperturaLogo';
import {
  CleanPageHeader,
  CleanCard,
  CleanSkeleton,
  CleanSkeletonGrid,
  CleanAnimatedCard,
  CleanIconButton,
  CleanStatusBadge,
  CleanProgress,
} from '@/components/admin/shared/CleanComponents';
import { LiquidThemeToggle } from '@/components/ui/theme/LiquidThemeToggle';
import { useTheme } from '@/components/providers/theme-provider';

// =============================================================================
// TYPES
// =============================================================================

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

type PlanCode = 'free' | 'basic' | 'pro' | 'premium';

interface PlanUsageSummary {
  activeEvents: number;
  busiestPhotoEvent?: {
    eventId: string;
    eventName: string | null;
    photoCount: number;
  };
  busiestShareEvent?: {
    eventId: string;
    eventName: string | null;
    shareCount: number;
  };
}

interface PlanApiResponse {
  plan: {
    code: PlanCode;
    name: string;
    description: string;
    maxEvents: number | null;
    maxPhotosPerEvent: number | null;
    maxSharesPerEvent: number | null;
    priceMonthly: number | null;
    currency: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
  };
  usage: PlanUsageSummary;
}

interface FormData {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  businessWebsite: string;
  watermarkText: string;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  watermarkOpacity: number;
  watermarkSize: 'small' | 'medium' | 'large';
  galleryDefaultStyle: 'pixieset' | 'grid' | 'masonry';
  galleryDefaultCoverTitle: string;
  galleryDefaultCoverSubtitle: string;
  galleryDefaultAccentColor: string;
  galleryDefaultShowShare: boolean;
  galleryDefaultShowFavorites: boolean;
  uploadMaxSizeMb: number;
  uploadMaxConcurrent: number;
  uploadQuality: number;
  uploadMaxResolution: string;
  defaultPhotoPriceArs: number;
  bulkDiscountPercentage: number;
  bulkDiscountMinimum: number;
  packPriceArs: number;
  checkoutTermsUrl: string;
  checkoutThankYouMessage: string;
  checkoutMinItems: number;
  checkoutMaxItems: number;
  checkoutShowPromoCode: boolean;
  imageResolutions: string[];
  imageDefaultFormat: 'webp' | 'jpeg' | 'png';
  imageQualityThumbnail: number;
  imageQualityPreview: number;
  imageQualityOriginal: number;
  imagePreserveExif: boolean;
  notifyNewOrders: boolean;
  notifyPayments: boolean;
  notifyWeeklyReport: boolean;
  notifyStorageAlerts: boolean;
  timezone: string;
  dateFormat: string;
  currency: string;
  language: string;
  autoCleanupPreviews: boolean;
  cleanupPreviewDays: number;
  storageAlertThreshold: number;
  storageAlertEnabled: boolean;
  egressAlertThreshold: number;
  egressAlertEnabled: boolean;
  autoOptimizeImages: boolean;
  qrDefaultSize: 'small' | 'medium' | 'large';
  qrDetectionSensitivity: 'low' | 'medium' | 'high';
  qrAutoTagOnUpload: boolean;
  qrShowInGallery: boolean;
  whatsappEnabled: boolean;
  whatsappPhone: string;
  whatsappNotifyNewOrders: boolean;
  whatsappNotifyPaymentConfirmed: boolean;
  whatsappNotifyReadyForPickup: boolean;
  tokenDefaultDurationDays: number;
  tokenAutoRenew: boolean;
  shareMaxPerEvent: number;
  shareDefaultExpiration: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PLAN_OPTIONS: Array<{
  code: PlanCode;
  name: string;
  description: string;
  priceLabel: string;
  limits: { label: string; value: string }[];
}> = [
  {
    code: 'free',
    name: 'Free',
    description: 'Para empezar con 2 eventos activos.',
    priceLabel: 'Gratis',
    limits: [
      { label: 'Eventos activos', value: '2' },
      { label: 'Fotos por evento', value: '200' },
      { label: 'Shares por evento', value: '3' },
    ],
  },
  {
    code: 'basic',
    name: 'Basico',
    description: 'Ideal para escuelas pequenas.',
    priceLabel: 'ARS 14.999 / mes',
    limits: [
      { label: 'Eventos activos', value: '8' },
      { label: 'Fotos por evento', value: '1.000' },
      { label: 'Shares por evento', value: '20' },
    ],
  },
  {
    code: 'pro',
    name: 'Pro',
    description: 'Para equipos con multiples fotografos.',
    priceLabel: 'ARS 34.999 / mes',
    limits: [
      { label: 'Eventos activos', value: '25' },
      { label: 'Fotos por evento', value: '5.000' },
      { label: 'Shares por evento', value: '50' },
    ],
  },
  {
    code: 'premium',
    name: 'Premium',
    description: 'Cobertura ilimitada para franquicias.',
    priceLabel: 'ARS 69.999 / mes',
    limits: [
      { label: 'Eventos activos', value: 'Ilimitado' },
      { label: 'Fotos por evento', value: '20.000' },
      { label: 'Shares por evento', value: '200' },
    ],
  },
];

const SECTIONS: SettingsSection[] = [
  { id: 'branding', title: 'Marca', description: 'Nombre y logo', icon: Paintbrush },
  { id: 'features', title: 'Funcionalidades', description: 'Habilitar/deshabilitar', icon: ToggleLeft },
  { id: 'plan', title: 'Plan y Limites', description: 'Tu plan y uso actual', icon: Settings2 },
  { id: 'business', title: 'Negocio', description: 'Datos de contacto', icon: Building2 },
  { id: 'appearance', title: 'Apariencia', description: 'Tema visual', icon: Palette },
  { id: 'watermark', title: 'Marca de Agua', description: 'Watermark en fotos', icon: ImageIcon },
  { id: 'gallery', title: 'Galeria', description: 'Config. de galerias', icon: Camera },
  { id: 'upload', title: 'Subida', description: 'Limites de upload', icon: Upload },
  { id: 'imageProcessing', title: 'Imagenes', description: 'Resolucion y calidad', icon: ImageIcon },
  { id: 'pricing', title: 'Precios', description: 'Precios por defecto', icon: DollarSign },
  { id: 'checkout', title: 'Checkout', description: 'Proceso de compra', icon: ShoppingCart },
  { id: 'notifications', title: 'Notificaciones', description: 'Alertas y emails', icon: Bell },
  { id: 'whatsapp', title: 'WhatsApp', description: 'Notificaciones WA', icon: MessageCircle },
  { id: 'tokens', title: 'Tokens', description: 'Links compartidos', icon: Key },
  { id: 'localization', title: 'Localizacion', description: 'Zona horaria', icon: Globe },
  { id: 'storage', title: 'Storage', description: 'Alertas de espacio', icon: HardDrive },
  { id: 'qr', title: 'Codigos QR', description: 'Config. de QR', icon: QrCode },
  { id: 'backup', title: 'Backup', description: 'Respaldo de datos', icon: Download },
];

const DEFAULT_FORM_DATA: FormData = {
  businessName: 'LookEscolar',
  businessEmail: '',
  businessPhone: '',
  businessAddress: '',
  businessWebsite: '',
  watermarkText: '(c) LookEscolar',
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 70,
  watermarkSize: 'medium',
  galleryDefaultStyle: 'pixieset',
  galleryDefaultCoverTitle: '',
  galleryDefaultCoverSubtitle: '',
  galleryDefaultAccentColor: '#10b981',
  galleryDefaultShowShare: true,
  galleryDefaultShowFavorites: true,
  uploadMaxSizeMb: 10,
  uploadMaxConcurrent: 5,
  uploadQuality: 72,
  uploadMaxResolution: '1920',
  defaultPhotoPriceArs: 500,
  bulkDiscountPercentage: 10,
  bulkDiscountMinimum: 5,
  packPriceArs: 2000,
  checkoutTermsUrl: '',
  checkoutThankYouMessage: '',
  checkoutMinItems: 1,
  checkoutMaxItems: 100,
  checkoutShowPromoCode: false,
  imageResolutions: ['300', '800', '1200'],
  imageDefaultFormat: 'webp',
  imageQualityThumbnail: 72,
  imageQualityPreview: 80,
  imageQualityOriginal: 90,
  imagePreserveExif: false,
  notifyNewOrders: true,
  notifyPayments: true,
  notifyWeeklyReport: true,
  notifyStorageAlerts: true,
  timezone: 'America/Argentina/Buenos_Aires',
  dateFormat: 'DD/MM/YYYY',
  currency: 'ARS',
  language: 'es',
  autoCleanupPreviews: true,
  cleanupPreviewDays: 90,
  storageAlertThreshold: 80,
  storageAlertEnabled: true,
  egressAlertThreshold: 70,
  egressAlertEnabled: true,
  autoOptimizeImages: true,
  qrDefaultSize: 'medium',
  qrDetectionSensitivity: 'medium',
  qrAutoTagOnUpload: true,
  qrShowInGallery: false,
  whatsappEnabled: false,
  whatsappPhone: '',
  whatsappNotifyNewOrders: false,
  whatsappNotifyPaymentConfirmed: false,
  whatsappNotifyReadyForPickup: false,
  tokenDefaultDurationDays: 30,
  tokenAutoRenew: false,
  shareMaxPerEvent: 50,
  shareDefaultExpiration: 7,
};

// =============================================================================
// COMPONENTS
// =============================================================================

// Clean Input Component
function CleanInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
  helpText,
}: {
  label: string;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  helpText?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="clean-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="clean-input"
      />
      {helpText && <p className="clean-help-text">{helpText}</p>}
    </div>
  );
}

// Clean Select Component
function CleanSelect({
  label,
  value,
  onChange,
  options,
  helpText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  helpText?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="clean-label">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="clean-select">
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helpText && <p className="clean-help-text">{helpText}</p>}
    </div>
  );
}

// Clean Toggle Component
function CleanToggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <span className="clean-label">{label}</span>
        {description && <p className="clean-help-text">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
          checked ? 'bg-[var(--clean-accent)]' : 'bg-[var(--clean-bg-muted)]'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

// Clean Slider Component
function CleanSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="clean-label">{label}</label>
        <span className="text-sm font-medium text-[var(--clean-text)]">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="clean-slider"
      />
    </div>
  );
}

// Section Header Component
function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-4 pb-6 border-b border-[var(--clean-border)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--clean-accent-light)]">
        <Icon className="h-5 w-5 text-[var(--clean-accent)]" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-[var(--clean-text)]">{title}</h2>
        {description && <p className="text-sm text-[var(--clean-text-secondary)]">{description}</p>}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CleanSettingsPage() {
  const [activeSection, setActiveSection] = useState('branding');
  const { branding, updateBranding, isUpdating: isBrandingSaving } = useTenantBranding();
  const [brandingForm, setBrandingForm] = useState<Partial<TenantBranding>>(DEFAULT_BRANDING);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [etag, setEtag] = useState('');
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [originalFormData, setOriginalFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [planData, setPlanData] = useState<PlanApiResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planSaving, setPlanSaving] = useState(false);
  const [prevSection, setPrevSection] = useState('business');
  const { resolvedTheme } = useTheme();
  const contentRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Detectar cambios sin guardar
  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  }, [formData, originalFormData]);

  // Cambio de sección con animación y auto-scroll al pill
  const handleSectionChange = useCallback((sectionId: string) => {
    setPrevSection(activeSection);
    setActiveSection(sectionId);
    // Scroll al top del contenido
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    // Auto-scroll al pill activo en mobile
    requestAnimationFrame(() => {
      const pillElement = pillRefs.current.get(sectionId);
      const navContainer = mobileNavRef.current;
      if (pillElement && navContainer) {
        const pillRect = pillElement.getBoundingClientRect();
        const navRect = navContainer.getBoundingClientRect();
        const scrollLeft = pillElement.offsetLeft - (navRect.width / 2) + (pillRect.width / 2);
        navContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    });
  }, [activeSection]);

  // Revertir cambios
  const handleRevert = useCallback(() => {
    setFormData(originalFormData);
    toast.info('Cambios revertidos');
  }, [originalFormData]);

  // Load plan data
  const loadPlanData = useCallback(async () => {
    try {
      setPlanLoading(true);
      const response = await fetch('/api/admin/tenant-plan');
      if (response.ok) {
        const data = await response.json();
        setPlanData(data);
      }
    } catch (error) {
      console.error('Error loading plan:', error);
      toast.error('No se pudo cargar el plan');
    } finally {
      setPlanLoading(false);
    }
  }, []);

  // Update plan
  const handlePlanUpdate = useCallback(
    async (planCode: PlanCode) => {
      if (planSaving) return;
      try {
        setPlanSaving(true);
        const response = await fetch('/api/admin/tenant-plan', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planCode }),
        });
        if (response.ok) {
          const data = await response.json();
          setPlanData({ plan: data.plan, usage: data.usage });
          toast.success('Plan actualizado');
        } else {
          throw new Error('Error al actualizar');
        }
      } catch (error) {
        toast.error('No se pudo actualizar el plan');
      } finally {
        setPlanSaving(false);
      }
    },
    [planSaving]
  );

  // Format price
  const formatPrice = useCallback((value: number | null, currency: string) => {
    if (value == null || value === 0) return 'Gratis';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const settings = await response.json();
        const responseEtag = response.headers.get('ETag') || '';
        setEtag(responseEtag);
        const newFormData = {
          ...DEFAULT_FORM_DATA,
          ...settings,
          businessEmail: settings.businessEmail ?? '',
          businessPhone: settings.businessPhone ?? '',
          businessAddress: settings.businessAddress ?? '',
          businessWebsite: settings.businessWebsite ?? '',
          uploadMaxResolution: String(settings.uploadMaxResolution ?? DEFAULT_FORM_DATA.uploadMaxResolution),
        };
        setFormData(newFormData);
        setOriginalFormData(newFormData);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Error al cargar configuracion');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadPlanData();
  }, [loadSettings, loadPlanData]);

  // Sync branding form with loaded branding
  useEffect(() => {
    if (branding) {
      setBrandingForm(branding);
    }
  }, [branding]);

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (etag) headers['If-Match'] = etag;

      const payload = {
        ...formData,
        businessEmail: formData.businessEmail.trim() || null,
        businessWebsite: formData.businessWebsite.trim() || null,
      };

      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        const newEtag = response.headers.get('ETag') || '';
        setEtag(newEtag);
        toast.success('Configuracion guardada');
        const responsePayload =
          'data' in updatedSettings ? updatedSettings.data : updatedSettings;
        const newFormData = {
          ...formData,
          ...responsePayload,
          businessEmail: responsePayload.businessEmail ?? '',
          businessPhone: responsePayload.businessPhone ?? '',
          businessAddress: responsePayload.businessAddress ?? '',
          businessWebsite: responsePayload.businessWebsite ?? '',
          uploadMaxResolution: String(
            responsePayload.uploadMaxResolution ?? formData.uploadMaxResolution
          ),
        };
        setFormData(newFormData);
        setOriginalFormData(newFormData); // Reset original después de guardar
      } else if (response.status === 412) {
        toast.error('Configuracion modificada por otro usuario. Recargando...');
        await loadSettings();
      } else {
        let errorMessage = 'Error al guardar';
        try {
          const errorData = await response.json();
          const details =
            errorData?.details ??
            errorData?.error ??
            errorData?.message ??
            null;
          if (details && typeof details === 'object') {
            const firstError = Object.values(details).flat()[0];
            if (typeof firstError === 'string') {
              errorMessage = `Error al guardar: ${firstError}`;
            }
          } else if (typeof details === 'string') {
            errorMessage = `Error al guardar: ${details}`;
          }
        } catch {
          // Ignore JSON parsing errors
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('Error al guardar configuracion');
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="clean-app">
        <div className="clean-content">
          <div className="mb-8">
            <CleanSkeleton variant="text-lg" width="200px" />
            <CleanSkeleton variant="text" width="300px" className="mt-2" />
          </div>
          <div className="flex gap-8">
            <div className="w-60 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <CleanSkeleton key={i} height={44} />
              ))}
            </div>
            <div className="flex-1">
              <CleanSkeletonGrid count={4} type="card" cols={2} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="clean-app">
      <div className="clean-content">
        {/* Header */}
        <CleanPageHeader title="Configuracion" subtitle={`Gestiona tu plataforma ${branding.appName}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Indicador de cambios sin guardar - compacto en mobile */}
            {hasChanges && (
              <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline text-sm font-medium text-amber-700 dark:text-amber-300">
                  Cambios sin guardar
                </span>
              </div>
            )}

            {/* Botón revertir - solo ícono en mobile */}
            {hasChanges && (
              <button
                onClick={handleRevert}
                className="clean-btn clean-btn--secondary !px-2 sm:!px-4"
                title="Revertir cambios"
              >
                <Undo2 className="h-4 w-4" />
                <span className="hidden sm:inline">Revertir</span>
              </button>
            )}

            {/* Botón guardar - compacto en mobile */}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className={cn(
                'clean-btn clean-btn--primary !px-3 sm:!px-4',
                !hasChanges && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Guardar</span>
                </>
              )}
            </button>
          </div>
        </CleanPageHeader>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Mobile Section Selector - Horizontal Scrollable Pills */}
          <div
            ref={mobileNavRef}
            className="lg:hidden -mx-4 px-4 overflow-x-auto scrollbar-hide scroll-smooth"
          >
            <div className="flex gap-2 pb-2 min-w-max">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    ref={(el) => {
                      if (el) pillRefs.current.set(section.id, el);
                    }}
                    onClick={() => handleSectionChange(section.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all touch-manipulation',
                      isActive
                        ? 'bg-[var(--clean-accent)] text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-[var(--clean-bg-elevated)] text-[var(--clean-text-secondary)] hover:bg-[var(--clean-bg-muted)] active:scale-95'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {section.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Navigation - Desktop */}
          <nav className="hidden lg:block w-60 shrink-0">
            <div className="clean-card p-2 space-y-0.5 sticky top-4">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-200',
                      isActive
                        ? 'bg-[var(--clean-accent-light)] text-[var(--clean-accent)] shadow-sm'
                        : 'text-[var(--clean-text-secondary)] hover:bg-[var(--clean-bg-muted)] hover:text-[var(--clean-text)]'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{section.title}</span>
                    {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Content Area */}
          <div className="flex-1 min-w-0" ref={contentRef}>
            <CleanAnimatedCard
              className="clean-card p-4 sm:p-6"
              key={activeSection}
            >
              {/* Branding Section */}
              {activeSection === 'branding' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={Paintbrush}
                    title="Personalizar Marca"
                    description="Configura el nombre y logo de tu plataforma"
                  />

                  {/* Preview Card */}
                  <div className="rounded-xl border border-[var(--clean-border)] bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                        {brandingForm.logoUrl ? (
                          <img
                            src={brandingForm.logoUrl}
                            alt={brandingForm.appName}
                            className="h-12 w-12 object-contain"
                          />
                        ) : (
                          <AperturaLogo variant="gradient" size="lg" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-[var(--clean-text)]">
                          {brandingForm.appName || 'Apertura'}
                        </h3>
                        <p className="text-sm text-[var(--clean-text-secondary)]">
                          {brandingForm.appSubtitle || 'Panel Admin'}
                        </p>
                        <p className="text-xs text-[var(--clean-text-muted)] mt-1">
                          {brandingForm.tagline || 'Distribucion de Fotografia Profesional'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CleanInput
                      label="Nombre de la App"
                      value={brandingForm.appName || ''}
                      onChange={(v) => setBrandingForm((prev) => ({ ...prev, appName: v }))}
                      placeholder="Mi Estudio de Fotos"
                      helpText="Este nombre aparecera en el sidebar y cabecera"
                    />
                    <CleanInput
                      label="Subtitulo"
                      value={brandingForm.appSubtitle || ''}
                      onChange={(v) => setBrandingForm((prev) => ({ ...prev, appSubtitle: v }))}
                      placeholder="Panel Admin"
                    />
                  </div>

                  <CleanInput
                    label="Tagline / Eslogan"
                    value={brandingForm.tagline || ''}
                    onChange={(v) => setBrandingForm((prev) => ({ ...prev, tagline: v }))}
                    placeholder="Fotografia Escolar Premium"
                    helpText="Aparece en el footer del sidebar"
                  />

                  <CleanInput
                    label="URL del Logo (opcional)"
                    value={brandingForm.logoUrl || ''}
                    onChange={(v) => setBrandingForm((prev) => ({ ...prev, logoUrl: v }))}
                    placeholder="https://ejemplo.com/mi-logo.png"
                    helpText="Deja vacio para usar el logo de Apertura por defecto"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="clean-label">Color Primario</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={brandingForm.primaryColor || '#8B5CF6'}
                          onChange={(e) => setBrandingForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                          className="h-10 w-14 rounded-lg border border-[var(--clean-border)] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={brandingForm.primaryColor || '#8B5CF6'}
                          onChange={(e) => setBrandingForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                          className="clean-input flex-1"
                          placeholder="#8B5CF6"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="clean-label">Color de Acento</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={brandingForm.accentColor || '#10B981'}
                          onChange={(e) => setBrandingForm((prev) => ({ ...prev, accentColor: e.target.value }))}
                          className="h-10 w-14 rounded-lg border border-[var(--clean-border)] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={brandingForm.accentColor || '#10B981'}
                          onChange={(e) => setBrandingForm((prev) => ({ ...prev, accentColor: e.target.value }))}
                          className="clean-input flex-1"
                          placeholder="#10B981"
                        />
                      </div>
                    </div>
                  </div>

                  <CleanToggle
                    label="Mostrar 'Powered by Apertura'"
                    description="Muestra credito a la plataforma en el footer"
                    checked={brandingForm.showPoweredBy || false}
                    onChange={(v) => setBrandingForm((prev) => ({ ...prev, showPoweredBy: v }))}
                  />

                  {/* Save Branding Button */}
                  <div className="flex justify-end pt-4 border-t border-[var(--clean-border)]">
                    <button
                      onClick={() => {
                        updateBranding(brandingForm);
                        toast.success('Marca actualizada correctamente');
                      }}
                      disabled={isBrandingSaving}
                      className="clean-btn clean-btn--primary"
                    >
                      {isBrandingSaving ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Guardar Marca
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Features Section */}
              {activeSection === 'features' && <FeaturesSettings />}

              {/* Plan Section */}
              {activeSection === 'plan' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={Settings2}
                    title="Plan y Limites"
                    description="Estado del plan actual y uso"
                  />

                  {planLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="h-6 w-6 animate-spin text-[var(--clean-text-muted)]" />
                    </div>
                  ) : planData ? (
                    <div className="space-y-6">
                      {/* Current Plan */}
                      <div className="rounded-xl bg-gradient-to-r from-[var(--clean-accent)] to-teal-500 p-6 text-white">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-2xl font-bold">{planData.plan.name}</h3>
                            <p className="text-white/80 mt-1">{planData.plan.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">
                              {formatPrice(planData.plan.priceMonthly, planData.plan.currency)}
                            </p>
                            <p className="text-white/60 text-sm">por mes</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
                          <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                            <p className="text-white/60 text-xs uppercase">Eventos activos</p>
                            <p className="text-xl font-bold mt-1">
                              {planData.usage.activeEvents}
                              {planData.plan.maxEvents && (
                                <span className="text-white/60 text-sm font-normal">
                                  {' '}
                                  / {planData.plan.maxEvents}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                            <p className="text-white/60 text-xs uppercase">Estado</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                              <span className="text-xl font-bold capitalize">{planData.plan.status}</span>
                            </div>
                          </div>
                          <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                            <p className="text-white/60 text-xs uppercase">Fotos max</p>
                            <p className="text-xl font-bold mt-1">
                              {planData.plan.maxPhotosPerEvent?.toLocaleString() || 'Ilimitado'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Plan Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {PLAN_OPTIONS.map((option) => {
                          const isCurrent = planData.plan.code === option.code;
                          return (
                            <div
                              key={option.code}
                              className={cn(
                                'rounded-xl border p-5 transition-all',
                                isCurrent
                                  ? 'border-[var(--clean-accent)] bg-[var(--clean-accent-light)]'
                                  : 'border-[var(--clean-border)] hover:border-[var(--clean-border-hover)]'
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4
                                    className={cn(
                                      'font-semibold',
                                      isCurrent ? 'text-[var(--clean-accent)]' : 'text-[var(--clean-text)]'
                                    )}
                                  >
                                    {option.name}
                                  </h4>
                                  <p className="text-sm text-[var(--clean-text-secondary)] mt-0.5">
                                    {option.description}
                                  </p>
                                </div>
                                <span className="text-sm font-medium text-[var(--clean-text-muted)]">
                                  {option.priceLabel}
                                </span>
                              </div>

                              <ul className="mt-4 space-y-2">
                                {option.limits.map((limit) => (
                                  <li
                                    key={limit.label}
                                    className="flex items-center gap-2 text-sm text-[var(--clean-text-secondary)]"
                                  >
                                    <Check className="h-3.5 w-3.5 text-[var(--clean-accent)]" />
                                    {limit.label}: <strong>{limit.value}</strong>
                                  </li>
                                ))}
                              </ul>

                              <button
                                onClick={() => handlePlanUpdate(option.code)}
                                disabled={isCurrent || planSaving}
                                className={cn(
                                  'w-full mt-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                  isCurrent
                                    ? 'bg-[var(--clean-accent)]/10 text-[var(--clean-accent)] cursor-default'
                                    : 'bg-[var(--clean-text)] text-white hover:bg-[var(--clean-text)]/90'
                                )}
                              >
                                {isCurrent ? 'Plan actual' : planSaving ? 'Actualizando...' : 'Seleccionar'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[var(--clean-text-muted)]">
                      No se pudo cargar la informacion del plan
                    </div>
                  )}
                </div>
              )}

              {/* Business Section */}
              {activeSection === 'business' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={Building2}
                    title="Informacion del Negocio"
                    description="Datos de contacto de tu estudio"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CleanInput
                      label="Nombre del Negocio"
                      value={formData.businessName}
                      onChange={(v) => updateFormData({ businessName: v })}
                      placeholder="Tu estudio de fotografia"
                    />
                    <CleanInput
                      label="Email de Contacto"
                      type="email"
                      value={formData.businessEmail}
                      onChange={(v) => updateFormData({ businessEmail: v })}
                      placeholder="contacto@ejemplo.com"
                    />
                    <CleanInput
                      label="Telefono"
                      type="tel"
                      value={formData.businessPhone}
                      onChange={(v) => updateFormData({ businessPhone: v })}
                      placeholder="+54 11 1234-5678"
                    />
                    <CleanInput
                      label="Sitio Web"
                      type="url"
                      value={formData.businessWebsite}
                      onChange={(v) => updateFormData({ businessWebsite: v })}
                      placeholder="https://ejemplo.com"
                    />
                  </div>

                  <CleanInput
                    label="Direccion"
                    value={formData.businessAddress}
                    onChange={(v) => updateFormData({ businessAddress: v })}
                    placeholder="Direccion completa del estudio"
                  />
                </div>
              )}

              {/* Appearance Section */}
              {activeSection === 'appearance' && (
                <div className="space-y-6">
                  <SectionHeader icon={Palette} title="Apariencia" description="Personaliza el tema visual" />

                  <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--clean-border)]">
                    <div>
                      <h4 className="font-medium text-[var(--clean-text)]">Tema de la Aplicacion</h4>
                      <p className="text-sm text-[var(--clean-text-secondary)]">
                        Tema actual: {resolvedTheme === 'dark' ? 'Oscuro' : 'Claro'}
                      </p>
                    </div>
                    <LiquidThemeToggle />
                  </div>

                  <CleanInput
                    label="Color de Acento de Galeria"
                    type="color"
                    value={formData.galleryDefaultAccentColor}
                    onChange={(v) => updateFormData({ galleryDefaultAccentColor: v })}
                    helpText="Color principal para botones y acentos en la galeria publica"
                  />
                </div>
              )}

              {/* Watermark Section */}
              {activeSection === 'watermark' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={ImageIcon}
                    title="Marca de Agua"
                    description="Configuracion del watermark"
                  />

                  <CleanInput
                    label="Texto de Marca de Agua"
                    value={formData.watermarkText}
                    onChange={(v) => updateFormData({ watermarkText: v })}
                    placeholder="(c) Tu Estudio"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CleanSelect
                      label="Posicion"
                      value={formData.watermarkPosition}
                      onChange={(v) =>
                        updateFormData({
                          watermarkPosition: v as FormData['watermarkPosition'],
                        })
                      }
                      options={[
                        { value: 'top-left', label: 'Superior Izquierda' },
                        { value: 'top-right', label: 'Superior Derecha' },
                        { value: 'bottom-left', label: 'Inferior Izquierda' },
                        { value: 'bottom-right', label: 'Inferior Derecha' },
                        { value: 'center', label: 'Centro' },
                      ]}
                    />
                    <CleanSelect
                      label="Tamano"
                      value={formData.watermarkSize}
                      onChange={(v) =>
                        updateFormData({ watermarkSize: v as FormData['watermarkSize'] })
                      }
                      options={[
                        { value: 'small', label: 'Pequeno' },
                        { value: 'medium', label: 'Mediano' },
                        { value: 'large', label: 'Grande' },
                      ]}
                    />
                  </div>

                  <CleanSlider
                    label="Opacidad"
                    value={formData.watermarkOpacity}
                    onChange={(v) => updateFormData({ watermarkOpacity: v })}
                    min={10}
                    max={100}
                    unit="%"
                  />
                </div>
              )}

              {/* Gallery Section */}
              {activeSection === 'gallery' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={Camera}
                    title="Galeria"
                    description="Configuracion predeterminada de galerias"
                  />

                  <CleanSelect
                    label="Estilo de Galeria"
                    value={formData.galleryDefaultStyle}
                    onChange={(v) =>
                      updateFormData({ galleryDefaultStyle: v as FormData['galleryDefaultStyle'] })
                    }
                    options={[
                      { value: 'pixieset', label: 'Pixieset (Elegante)' },
                      { value: 'grid', label: 'Grid (Uniforme)' },
                      { value: 'masonry', label: 'Masonry (Dinamico)' },
                    ]}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CleanInput
                      label="Titulo de Portada"
                      value={formData.galleryDefaultCoverTitle}
                      onChange={(v) => updateFormData({ galleryDefaultCoverTitle: v })}
                      placeholder="Fotos del Evento"
                    />
                    <CleanInput
                      label="Subtitulo de Portada"
                      value={formData.galleryDefaultCoverSubtitle}
                      onChange={(v) => updateFormData({ galleryDefaultCoverSubtitle: v })}
                      placeholder="Recuerdos especiales"
                    />
                  </div>

                  <div className="space-y-3">
                    <CleanToggle
                      label="Mostrar boton de compartir"
                      checked={formData.galleryDefaultShowShare}
                      onChange={(v) => updateFormData({ galleryDefaultShowShare: v })}
                    />
                    <CleanToggle
                      label="Mostrar favoritos"
                      checked={formData.galleryDefaultShowFavorites}
                      onChange={(v) => updateFormData({ galleryDefaultShowFavorites: v })}
                    />
                  </div>
                </div>
              )}

              {/* Upload Section */}
              {activeSection === 'upload' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={Upload}
                    title="Subida de Archivos"
                    description="Limites y configuracion de upload"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CleanSlider
                      label="Tamano maximo"
                      value={formData.uploadMaxSizeMb}
                      onChange={(v) => updateFormData({ uploadMaxSizeMb: v })}
                      min={1}
                      max={50}
                      unit=" MB"
                    />
                    <CleanSlider
                      label="Uploads simultaneos"
                      value={formData.uploadMaxConcurrent}
                      onChange={(v) => updateFormData({ uploadMaxConcurrent: v })}
                      min={1}
                      max={10}
                    />
                  </div>

                  <CleanSlider
                    label="Calidad de compresion"
                    value={formData.uploadQuality}
                    onChange={(v) => updateFormData({ uploadQuality: v })}
                    min={50}
                    max={100}
                    unit="%"
                  />

                  <CleanSelect
                    label="Resolucion maxima"
                    value={formData.uploadMaxResolution}
                    onChange={(v) => updateFormData({ uploadMaxResolution: v })}
                    options={[
                      { value: '1920', label: '1920px (Full HD)' },
                      { value: '2560', label: '2560px (2K)' },
                      { value: '3840', label: '3840px (4K)' },
                    ]}
                  />
                </div>
              )}

              {/* Image Processing Section */}
              {activeSection === 'imageProcessing' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={ImageIcon}
                    title="Procesamiento de Imagenes"
                    description="Resoluciones, formato y calidad de las fotos"
                  />

                  {/* Resoluciones disponibles */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Resoluciones a generar
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {['300', '800', '1200', '1920', '2560'].map((res) => (
                        <button
                          key={res}
                          type="button"
                          onClick={() => {
                            const current = formData.imageResolutions || [];
                            if (current.includes(res)) {
                              updateFormData({
                                imageResolutions: current.filter(r => r !== res)
                              });
                            } else {
                              updateFormData({
                                imageResolutions: [...current, res].sort((a, b) => Number(a) - Number(b))
                              });
                            }
                          }}
                          className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                            'border-2',
                            formData.imageResolutions?.includes(res)
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          )}
                        >
                          {res}px
                          {formData.imageResolutions?.includes(res) && (
                            <Check className="inline-block ml-2 h-4 w-4" />
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="clean-help-text">
                      Se generaran variantes en cada resolucion seleccionada
                    </p>
                  </div>

                  <CleanSelect
                    label="Formato por defecto"
                    value={formData.imageDefaultFormat}
                    onChange={(v) => updateFormData({ imageDefaultFormat: v as 'webp' | 'jpeg' | 'png' })}
                    options={[
                      { value: 'webp', label: 'WebP (recomendado, mejor compresion)' },
                      { value: 'jpeg', label: 'JPEG (compatibilidad maxima)' },
                      { value: 'png', label: 'PNG (sin perdida, mas pesado)' },
                    ]}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CleanSlider
                      label="Calidad thumbnails"
                      value={formData.imageQualityThumbnail}
                      onChange={(v) => updateFormData({ imageQualityThumbnail: v })}
                      min={50}
                      max={100}
                      unit="%"
                    />
                    <CleanSlider
                      label="Calidad previews"
                      value={formData.imageQualityPreview}
                      onChange={(v) => updateFormData({ imageQualityPreview: v })}
                      min={50}
                      max={100}
                      unit="%"
                    />
                    <CleanSlider
                      label="Calidad original"
                      value={formData.imageQualityOriginal}
                      onChange={(v) => updateFormData({ imageQualityOriginal: v })}
                      min={70}
                      max={100}
                      unit="%"
                    />
                  </div>

                  <CleanToggle
                    label="Preservar metadatos EXIF"
                    description="Mantener informacion de camara, fecha y GPS en las fotos originales"
                    checked={formData.imagePreserveExif}
                    onChange={(v) => updateFormData({ imagePreserveExif: v })}
                  />
                </div>
              )}

              {/* Pricing Section */}
              {activeSection === 'pricing' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={DollarSign}
                    title="Precios por Defecto"
                    description="Configuracion de precios estandar"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CleanInput
                      label="Precio por Foto (ARS)"
                      type="number"
                      value={formData.defaultPhotoPriceArs}
                      onChange={(v) => updateFormData({ defaultPhotoPriceArs: Number(v) })}
                    />
                    <CleanInput
                      label="Precio de Pack (ARS)"
                      type="number"
                      value={formData.packPriceArs}
                      onChange={(v) => updateFormData({ packPriceArs: Number(v) })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CleanInput
                      label="Descuento por cantidad (%)"
                      type="number"
                      value={formData.bulkDiscountPercentage}
                      onChange={(v) => updateFormData({ bulkDiscountPercentage: Number(v) })}
                    />
                    <CleanInput
                      label="Minimo para descuento"
                      type="number"
                      value={formData.bulkDiscountMinimum}
                      onChange={(v) => updateFormData({ bulkDiscountMinimum: Number(v) })}
                      helpText="Cantidad minima de fotos"
                    />
                  </div>
                </div>
              )}

              {/* Checkout Section */}
              {activeSection === 'checkout' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={ShoppingCart}
                    title="Checkout y Tienda"
                    description="Configuracion del proceso de compra"
                  />

                  <CleanInput
                    label="URL de Terminos y Condiciones"
                    value={formData.checkoutTermsUrl}
                    onChange={(v) => updateFormData({ checkoutTermsUrl: v })}
                    placeholder="https://ejemplo.com/terminos"
                  />

                  <CleanInput
                    label="Mensaje de Agradecimiento"
                    value={formData.checkoutThankYouMessage}
                    onChange={(v) => updateFormData({ checkoutThankYouMessage: v })}
                    placeholder="Gracias por tu compra!"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CleanInput
                      label="Minimo de items"
                      type="number"
                      value={formData.checkoutMinItems}
                      onChange={(v) => updateFormData({ checkoutMinItems: Number(v) })}
                    />
                    <CleanInput
                      label="Maximo de items"
                      type="number"
                      value={formData.checkoutMaxItems}
                      onChange={(v) => updateFormData({ checkoutMaxItems: Number(v) })}
                    />
                  </div>

                  <CleanToggle
                    label="Mostrar campo de codigo promocional"
                    checked={formData.checkoutShowPromoCode}
                    onChange={(v) => updateFormData({ checkoutShowPromoCode: v })}
                  />
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={Bell}
                    title="Notificaciones"
                    description="Preferencias de alertas y emails"
                  />

                  <div className="space-y-3">
                    <CleanToggle
                      label="Nuevos pedidos"
                      description="Recibir notificacion cuando hay un nuevo pedido"
                      checked={formData.notifyNewOrders}
                      onChange={(v) => updateFormData({ notifyNewOrders: v })}
                    />
                    <CleanToggle
                      label="Pagos confirmados"
                      description="Notificar cuando se confirma un pago"
                      checked={formData.notifyPayments}
                      onChange={(v) => updateFormData({ notifyPayments: v })}
                    />
                    <CleanToggle
                      label="Reporte semanal"
                      description="Recibir resumen semanal de actividad"
                      checked={formData.notifyWeeklyReport}
                      onChange={(v) => updateFormData({ notifyWeeklyReport: v })}
                    />
                    <CleanToggle
                      label="Alertas de storage"
                      description="Avisar cuando el espacio esta por agotarse"
                      checked={formData.notifyStorageAlerts}
                      onChange={(v) => updateFormData({ notifyStorageAlerts: v })}
                    />
                  </div>
                </div>
              )}

              {/* WhatsApp Section */}
              {activeSection === 'whatsapp' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={MessageCircle}
                    title="Notificaciones WhatsApp"
                    description="Configuracion de notificaciones por WhatsApp"
                  />

                  <CleanToggle
                    label="Habilitar WhatsApp"
                    description="Activar notificaciones via WhatsApp"
                    checked={formData.whatsappEnabled}
                    onChange={(v) => updateFormData({ whatsappEnabled: v })}
                  />

                  {formData.whatsappEnabled && (
                    <>
                      <CleanInput
                        label="Numero de WhatsApp"
                        value={formData.whatsappPhone}
                        onChange={(v) => updateFormData({ whatsappPhone: v })}
                        placeholder="+54 11 1234-5678"
                        helpText="Numero donde recibiras las notificaciones"
                      />

                      <div className="space-y-3">
                        <CleanToggle
                          label="Nuevos pedidos"
                          checked={formData.whatsappNotifyNewOrders}
                          onChange={(v) => updateFormData({ whatsappNotifyNewOrders: v })}
                        />
                        <CleanToggle
                          label="Pagos confirmados"
                          checked={formData.whatsappNotifyPaymentConfirmed}
                          onChange={(v) => updateFormData({ whatsappNotifyPaymentConfirmed: v })}
                        />
                        <CleanToggle
                          label="Listo para retiro"
                          checked={formData.whatsappNotifyReadyForPickup}
                          onChange={(v) => updateFormData({ whatsappNotifyReadyForPickup: v })}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tokens Section */}
              {activeSection === 'tokens' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={Key}
                    title="Tokens y Compartidos"
                    description="Configuración de tokens para clientes"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CleanInput
                      label="Duracion de Token (dias)"
                      type="number"
                      value={formData.tokenDefaultDurationDays}
                      onChange={(v) => updateFormData({ tokenDefaultDurationDays: Number(v) })}
                      helpText="Dias hasta que expira el token"
                    />
                    <CleanInput
                      label="Max shares por evento"
                      type="number"
                      value={formData.shareMaxPerEvent}
                      onChange={(v) => updateFormData({ shareMaxPerEvent: Number(v) })}
                    />
                  </div>

                  <CleanInput
                    label="Expiracion de link (dias)"
                    type="number"
                    value={formData.shareDefaultExpiration}
                    onChange={(v) => updateFormData({ shareDefaultExpiration: Number(v) })}
                    helpText="Dias hasta que expiran los links compartidos"
                  />

                  <CleanToggle
                    label="Auto-renovar tokens"
                    description="Renovar automaticamente tokens antes de expirar"
                    checked={formData.tokenAutoRenew}
                    onChange={(v) => updateFormData({ tokenAutoRenew: v })}
                  />
                </div>
              )}

              {/* Localization Section */}
              {activeSection === 'localization' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={Globe}
                    title="Localizacion"
                    description="Zona horaria y formatos"
                  />

                  <CleanSelect
                    label="Zona Horaria"
                    value={formData.timezone}
                    onChange={(v) => updateFormData({ timezone: v })}
                    options={[
                      { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (Buenos Aires)' },
                      { value: 'America/Sao_Paulo', label: 'Brasil (Sao Paulo)' },
                      { value: 'America/Santiago', label: 'Chile (Santiago)' },
                      { value: 'America/Mexico_City', label: 'Mexico (Ciudad de Mexico)' },
                      { value: 'America/Bogota', label: 'Colombia (Bogota)' },
                    ]}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CleanSelect
                      label="Formato de Fecha"
                      value={formData.dateFormat}
                      onChange={(v) => updateFormData({ dateFormat: v })}
                      options={[
                        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                      ]}
                    />
                    <CleanSelect
                      label="Moneda"
                      value={formData.currency}
                      onChange={(v) => updateFormData({ currency: v })}
                      options={[
                        { value: 'ARS', label: 'Peso Argentino (ARS)' },
                        { value: 'USD', label: 'Dolar (USD)' },
                        { value: 'BRL', label: 'Real (BRL)' },
                        { value: 'CLP', label: 'Peso Chileno (CLP)' },
                        { value: 'MXN', label: 'Peso Mexicano (MXN)' },
                      ]}
                    />
                  </div>

                  <CleanSelect
                    label="Idioma"
                    value={formData.language}
                    onChange={(v) => updateFormData({ language: v })}
                    options={[
                      { value: 'es', label: 'Espanol' },
                      { value: 'en', label: 'English' },
                      { value: 'pt', label: 'Portugues' },
                    ]}
                  />
                </div>
              )}

              {/* Storage Section */}
              {activeSection === 'storage' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={HardDrive}
                    title="Alertas de Almacenamiento"
                    description="Configuracion de limites de storage"
                  />

                  <CleanToggle
                    label="Alertas de Storage"
                    description="Notificar cuando el almacenamiento este cerca del limite"
                    checked={formData.storageAlertEnabled}
                    onChange={(v) => updateFormData({ storageAlertEnabled: v })}
                  />

                  {formData.storageAlertEnabled && (
                    <CleanSlider
                      label="Umbral de alerta"
                      value={formData.storageAlertThreshold}
                      onChange={(v) => updateFormData({ storageAlertThreshold: v })}
                      min={50}
                      max={95}
                      unit="%"
                    />
                  )}

                  <CleanToggle
                    label="Alertas de Egress"
                    description="Notificar cuando el trafico este cerca del limite"
                    checked={formData.egressAlertEnabled}
                    onChange={(v) => updateFormData({ egressAlertEnabled: v })}
                  />

                  {formData.egressAlertEnabled && (
                    <CleanSlider
                      label="Umbral de egress"
                      value={formData.egressAlertThreshold}
                      onChange={(v) => updateFormData({ egressAlertThreshold: v })}
                      min={50}
                      max={95}
                      unit="%"
                    />
                  )}

                  <CleanToggle
                    label="Auto-optimizar imagenes"
                    description="Comprimir automaticamente imagenes para ahorrar espacio"
                    checked={formData.autoOptimizeImages}
                    onChange={(v) => updateFormData({ autoOptimizeImages: v })}
                  />

                  <CleanToggle
                    label="Limpieza automatica de previews"
                    description="Eliminar previews antiguos automaticamente"
                    checked={formData.autoCleanupPreviews}
                    onChange={(v) => updateFormData({ autoCleanupPreviews: v })}
                  />

                  {formData.autoCleanupPreviews && (
                    <CleanInput
                      label="Dias para mantener previews"
                      type="number"
                      value={formData.cleanupPreviewDays}
                      onChange={(v) => updateFormData({ cleanupPreviewDays: Number(v) })}
                      helpText="Eliminar previews mas antiguos que este numero de dias"
                    />
                  )}
                </div>
              )}

              {/* QR Section */}
              {activeSection === 'qr' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={QrCode}
                    title="Codigos QR"
                    description="Configuracion de generacion y deteccion"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CleanSelect
                      label="Tamano por defecto"
                      value={formData.qrDefaultSize}
                      onChange={(v) =>
                        updateFormData({ qrDefaultSize: v as FormData['qrDefaultSize'] })
                      }
                      options={[
                        { value: 'small', label: 'Pequeno' },
                        { value: 'medium', label: 'Mediano' },
                        { value: 'large', label: 'Grande' },
                      ]}
                    />
                    <CleanSelect
                      label="Sensibilidad de deteccion"
                      value={formData.qrDetectionSensitivity}
                      onChange={(v) =>
                        updateFormData({
                          qrDetectionSensitivity: v as FormData['qrDetectionSensitivity'],
                        })
                      }
                      options={[
                        { value: 'low', label: 'Baja' },
                        { value: 'medium', label: 'Media' },
                        { value: 'high', label: 'Alta' },
                      ]}
                    />
                  </div>

                  <div className="space-y-3">
                    <CleanToggle
                      label="Auto-tagear al subir"
                      description="Detectar y tagear QR automaticamente al subir fotos"
                      checked={formData.qrAutoTagOnUpload}
                      onChange={(v) => updateFormData({ qrAutoTagOnUpload: v })}
                    />
                    <CleanToggle
                      label="Mostrar QR en galeria"
                      description="Mostrar codigo QR en las fotos de la galeria"
                      checked={formData.qrShowInGallery}
                      onChange={(v) => updateFormData({ qrShowInGallery: v })}
                    />
                  </div>
                </div>
              )}

              {/* Backup Section */}
              {activeSection === 'backup' && (
                <div className="space-y-6">
                  <SectionHeader
                    icon={Download}
                    title="Backup y Exportacion"
                    description="Respaldo de datos del sistema"
                  />

                  <div className="rounded-lg border border-[var(--clean-border)] p-4 bg-[var(--clean-bg-subtle)]">
                    <h4 className="font-medium text-[var(--clean-text)]">Exportar Configuracion</h4>
                    <p className="text-sm text-[var(--clean-text-secondary)] mt-1">
                      Descarga un archivo JSON con toda la configuracion actual
                    </p>
                    <button
                      onClick={() => {
                        const dataStr = JSON.stringify(formData, null, 2);
                        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
                        const exportName = `lookescolar-config-${new Date().toISOString().split('T')[0]}.json`;
                        const linkElement = document.createElement('a');
                        linkElement.setAttribute('href', dataUri);
                        linkElement.setAttribute('download', exportName);
                        linkElement.click();
                        toast.success('Configuracion exportada');
                      }}
                      className="clean-btn clean-btn--secondary mt-3"
                    >
                      <Download className="h-4 w-4" />
                      Exportar JSON
                    </button>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <h4 className="font-medium text-amber-800 dark:text-amber-200">Zona Peligrosa</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Restablecer la configuracion a valores por defecto. Esta accion no se puede deshacer.
                    </p>
                    <button
                      onClick={() => {
                        if (confirm('Estas seguro de que deseas restablecer la configuracion?')) {
                          setFormData(DEFAULT_FORM_DATA);
                          toast.success('Configuracion restablecida');
                        }
                      }}
                      className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                    >
                      Restablecer valores por defecto
                    </button>
                  </div>
                </div>
              )}
            </CleanAnimatedCard>
          </div>
        </div>
      </div>
    </div>
  );
}

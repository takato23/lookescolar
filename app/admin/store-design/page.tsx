'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateSelector, type TemplateType } from '@/components/store/TemplateSelector';
import { StoreDesignPanel } from '@/components/admin/store-settings/StoreDesignPanel';
import { LiveStorePreview } from '@/components/admin/store-settings/LiveStorePreview';
import { BrandingSection } from '@/components/admin/store-settings/BrandingSection';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  Upload,
  Palette,
  Package,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { StoreConfig, StoreProduct } from '@/lib/validations/store-config';
import type { StoreDesignSettings } from '@/lib/store/store-design';

export default function StoreDesignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');

  // State management
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'settings' | 'preview'>('settings');

  // Auto-save reference
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const originalConfig = useRef<StoreConfig | null>(null);

  // Load configuration
  useEffect(() => {
    loadConfig();
  }, [eventId]);

  // Auto-save to localStorage
  useEffect(() => {
    if (config && isDirty) {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }

      autoSaveTimer.current = setTimeout(() => {
        localStorage.setItem('store-design-draft', JSON.stringify(config));
        toast.info('Borrador guardado automáticamente', {
          duration: 2000,
        });
      }, 2000);
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [config, isDirty]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S: Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) {
          handlePublish();
        }
      }
      // Cmd/Ctrl + P: Toggle preview
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setActiveTab(activeTab === 'settings' ? 'preview' : 'settings');
      }
      // Esc: Close modals/dialogs
      if (e.key === 'Escape') {
        // Handle escape logic if needed
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, activeTab]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      // Check for draft in localStorage
      const draft = localStorage.getItem('store-design-draft');
      if (draft) {
        const shouldRestoreDraft = confirm(
          'Se encontró un borrador guardado. ¿Deseas restaurarlo?'
        );
        if (shouldRestoreDraft) {
          const parsed = JSON.parse(draft);
          setConfig(parsed);
          originalConfig.current = parsed;
          setIsDirty(true);
          toast.success('Borrador restaurado');
          setIsLoading(false);
          return;
        }
      }

      // Load from API
      const endpoint = eventId
        ? `/api/admin/store-settings?eventId=${eventId}`
        : '/api/admin/store-settings?global=true';

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Error cargando configuración');

      const data = await response.json();
      setConfig(data);
      originalConfig.current = data;
      setIsDirty(false);
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Error cargando configuración');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!config) return;

    setIsSaving(true);
    try {
      const endpoint = eventId
        ? `/api/admin/store-settings?eventId=${eventId}`
        : '/api/admin/store-settings?global=true';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error('Error guardando configuración');

      const savedConfig = await response.json();
      setConfig(savedConfig);
      originalConfig.current = savedConfig;
      setIsDirty(false);

      // Clear draft from localStorage
      localStorage.removeItem('store-design-draft');

      toast.success('Configuración publicada exitosamente', {
        description: 'Los cambios ya están disponibles en la tienda.',
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error guardando configuración', {
        description: 'Por favor, intenta nuevamente.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = () => {
    if (!config) return;
    localStorage.setItem('store-design-draft', JSON.stringify(config));
    toast.success('Borrador guardado', {
      duration: 2000,
    });
  };

  const handleTemplateChange = useCallback((template: TemplateType) => {
    if (!config) return;
    setConfig({ ...config, template });
    setIsDirty(true);
  }, [config]);

  const handleDesignChange = useCallback((design: StoreDesignSettings) => {
    if (!config) return;
    setConfig({ ...config, design });
    setIsDirty(true);
  }, [config]);

  const handleLogoUpload = useCallback((url: string) => {
    if (!config) return;
    setConfig({ ...config, logo_url: url });
    setIsDirty(true);
  }, [config]);

  const handleBannerUpload = useCallback((url: string) => {
    if (!config) return;
    setConfig({ ...config, banner_url: url });
    setIsDirty(true);
  }, [config]);

  const handleRefreshPreview = () => {
    toast.info('Vista previa actualizada', { duration: 1500 });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background/50">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background/50">
        <Card className="p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-destructive" />
          <h2 className="mb-2 text-lg font-semibold">Error cargando configuración</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            No se pudo cargar la configuración de la tienda.
          </p>
          <Button onClick={loadConfig}>Reintentar</Button>
        </Card>
      </div>
    );
  }

  const deviceWidths = {
    desktop: 'max-w-full',
    tablet: 'max-w-2xl',
    mobile: 'max-w-sm',
  };

  return (
    <div className="min-h-screen bg-background/50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Diseño de Tienda
              </h1>
              <p className="text-xs text-muted-foreground">
                {eventId ? 'Configuración del evento' : 'Configuración global'}
              </p>
            </div>
            {isDirty && (
              <Badge variant="outline" className="ml-2 border-amber-500 text-amber-700">
                <AlertCircle className="mr-1 h-3 w-3" />
                Sin guardar
              </Badge>
            )}
            {!isDirty && (
              <Badge variant="outline" className="ml-2 border-emerald-500 text-emerald-700">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Guardado
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={!isDirty}
            >
              <Save className="mr-2 h-4 w-4" />
              Guardar borrador
            </Button>

            {/* Desktop preview toggle */}
            <div className="hidden lg:flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
              <Button
                variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setPreviewDevice('desktop')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={previewDevice === 'tablet' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setPreviewDevice('tablet')}
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setPreviewDevice('mobile')}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={handlePublish}
              disabled={!isDirty || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Publicar cambios
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {/* Mobile tabs */}
        <div className="lg:hidden mb-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings">Configuración</TabsTrigger>
              <TabsTrigger value="preview">Vista previa</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Desktop split view */}
        <div className="hidden lg:grid lg:grid-cols-[40%_60%] lg:gap-6">
          {/* Settings panel */}
          <div className="space-y-6 overflow-y-auto pr-4" style={{ maxHeight: 'calc(100vh - 140px)' }}>
            <SettingsPanel
              config={config}
              onTemplateChange={handleTemplateChange}
              onDesignChange={handleDesignChange}
              onLogoUpload={handleLogoUpload}
              onBannerUpload={handleBannerUpload}
            />
          </div>

          {/* Preview panel */}
          <div className="sticky top-24" style={{ maxHeight: 'calc(100vh - 140px)' }}>
            <PreviewPanel
              config={config}
              device={previewDevice}
              onRefresh={handleRefreshPreview}
            />
          </div>
        </div>

        {/* Mobile content */}
        <div className="lg:hidden">
          {activeTab === 'settings' ? (
            <SettingsPanel
              config={config}
              onTemplateChange={handleTemplateChange}
              onDesignChange={handleDesignChange}
              onLogoUpload={handleLogoUpload}
              onBannerUpload={handleBannerUpload}
            />
          ) : (
            <PreviewPanel
              config={config}
              device={previewDevice}
              onRefresh={handleRefreshPreview}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// Settings Panel Component
interface SettingsPanelProps {
  config: StoreConfig;
  onTemplateChange: (template: TemplateType) => void;
  onDesignChange: (design: StoreDesignSettings) => void;
  onLogoUpload: (url: string) => void;
  onBannerUpload: (url: string) => void;
}

function SettingsPanel({
  config,
  onTemplateChange,
  onDesignChange,
  onLogoUpload,
  onBannerUpload,
}: SettingsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Template selector */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Plantilla base</h2>
        </div>
        <TemplateSelector
          currentTemplate={config.template as TemplateType}
          onTemplateChange={onTemplateChange}
        />
      </Card>

      {/* Branding section */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Marca y logo</h2>
        </div>
        <BrandingSection
          logoUrl={config.logo_url}
          bannerUrl={config.banner_url}
          onLogoUpload={onLogoUpload}
          onBannerUpload={onBannerUpload}
        />
      </Card>

      {/* Design panel */}
      <Card className="p-6">
        <StoreDesignPanel
          design={config.design as StoreDesignSettings}
          onChange={onDesignChange}
          bannerUrl={config.banner_url}
          logoUrl={config.logo_url}
        />
      </Card>

      {/* Products section placeholder */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Productos</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Gestión de productos disponible próximamente
        </p>
      </Card>
    </div>
  );
}

// Preview Panel Component
interface PreviewPanelProps {
  config: StoreConfig;
  device: 'desktop' | 'tablet' | 'mobile';
  onRefresh: () => void;
}

function PreviewPanel({ config, device, onRefresh }: PreviewPanelProps) {
  return (
    <LiveStorePreview
      config={config}
      device={device}
      onRefresh={onRefresh}
    />
  );
}

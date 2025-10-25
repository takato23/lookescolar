'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import clsx from 'clsx';
import {
  Settings2,
  Building2,
  Palette,
  Upload,
  DollarSign,
  Bell,
  Globe,
  Download,
  Save,
  Trash2,
  Camera,
  ImageIcon,
} from 'lucide-react';
import { LiquidThemeToggle } from '@/components/ui/theme/LiquidThemeToggle';
import { useTheme } from '@/components/providers/theme-provider';

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
    description: 'Empezá gratis con 2 eventos activos.',
    priceLabel: 'Gratis',
    limits: [
      { label: 'Eventos activos', value: '2' },
      { label: 'Fotos por evento', value: '200' },
      { label: 'Shares por evento', value: '3' },
    ],
  },
  {
    code: 'basic',
    name: 'Básico',
    description: 'Ideal para escuelas pequeñas que suben hasta 1.000 fotos.',
    priceLabel: 'ARS 14.999 / mes',
    limits: [
      { label: 'Eventos activos', value: '8' },
      { label: 'Fotos por evento', value: '1.000' },
      { label: 'Shares por evento', value: '20' },
    ],
  },
  {
    code: 'pro',
    name: 'Pro',
    description: 'Diseñado para equipos con múltiples fotógrafos y catálogos grandes.',
    priceLabel: 'ARS 34.999 / mes',
    limits: [
      { label: 'Eventos activos', value: '25' },
      { label: 'Fotos por evento', value: '5.000' },
      { label: 'Shares por evento', value: '50' },
    ],
  },
  {
    code: 'premium',
    name: 'Premium',
    description: 'Cobertura ilimitada, ideal para franquicias o redes de estudios.',
    priceLabel: 'ARS 69.999 / mes',
    limits: [
      { label: 'Eventos activos', value: 'Ilimitado' },
      { label: 'Fotos por evento', value: '20.000' },
      { label: 'Shares por evento', value: '200' },
    ],
  },
];

const sections: SettingsSection[] = [
  {
    id: 'plan',
    title: 'Plan y Límites',
    description: 'Gestioná el plan del tenant y monitoreá el uso.',
    icon: Settings2,
  },
  {
    id: 'business',
    title: 'Información del Negocio',
    description: 'Datos básicos de tu fotografía escolar',
    icon: Building2,
  },
  {
    id: 'appearance',
    title: 'Apariencia',
    description: 'Tema y personalización visual',
    icon: Palette,
  },
  {
    id: 'watermark',
    title: 'Marca de Agua',
    description: 'Configuración del watermark en fotos',
    icon: ImageIcon,
  },
  {
    id: 'upload',
    title: 'Subida de Archivos',
    description: 'Límites y configuración de upload',
    icon: Upload,
  },
  {
    id: 'pricing',
    title: 'Precios por Defecto',
    description: 'Configuración de precios estándar',
    icon: DollarSign,
  },
  {
    id: 'notifications',
    title: 'Notificaciones',
    description: 'Preferencias de alertas y emails',
    icon: Bell,
  },
  {
    id: 'localization',
    title: 'Localización',
    description: 'Zona horaria y formato de fecha',
    icon: Globe,
  },
  {
    id: 'backup',
    title: 'Backup y Exportación',
    description: 'Respaldo de datos del sistema',
    icon: Download,
  },
];

export default function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState('business');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [etag, setEtag] = useState<string>('');
  const [formData, setFormData] = useState({
    businessName: 'LookEscolar',
    businessEmail: '',
    businessPhone: '',
    businessAddress: '',
    businessWebsite: '',
    watermarkText: '© LookEscolar',
    watermarkPosition: 'bottom-right' as const,
    watermarkOpacity: 70,
    watermarkSize: 'medium' as const,
    uploadMaxSizeMb: 10,
    uploadMaxConcurrent: 5,
    uploadQuality: 72,
    uploadMaxResolution: '1920' as const,
    defaultPhotoPriceArs: 500,
    bulkDiscountPercentage: 10,
    bulkDiscountMinimum: 5,
    packPriceArs: 2000,
    notifyNewOrders: true,
    notifyPayments: true,
    notifyWeeklyReport: true,
    notifyStorageAlerts: true,
    timezone: 'America/Argentina/Buenos_Aires',
    dateFormat: 'DD/MM/YYYY' as const,
    currency: 'ARS' as const,
    language: 'es' as const,
    autoCleanupPreviews: true,
    cleanupPreviewDays: 90,
  });
  const [planData, setPlanData] = useState<PlanApiResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planSaving, setPlanSaving] = useState(false);
  const { resolvedTheme } = useTheme();

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const settings = await response.json();
        const responseEtag = response.headers.get('ETag') || '';
        setEtag(responseEtag);
        const payload = settings as Partial<typeof formData>;

        setFormData((prev) => {
          const nextUploadMaxResolution =
            payload.uploadMaxResolution ?? prev.uploadMaxResolution;

          return {
            ...prev,
            ...payload,
            uploadMaxResolution: String(
              nextUploadMaxResolution
            ) as typeof prev.uploadMaxResolution,
          };
        });
      } else {
        toast.error('Error al cargar configuración');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const loadPlanData = useCallback(async () => {
    try {
      setPlanLoading(true);
      const response = await fetch('/api/admin/tenant-plan');
      if (!response.ok) {
        throw new Error('Request failed');
      }
      const data = (await response.json()) as PlanApiResponse;
      setPlanData(data);
    } catch (error) {
      console.error('Error loading plan data:', error);
      toast.error('No se pudo cargar la información del plan');
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlanData();
  }, [loadPlanData]);

  const handlePlanUpdate = useCallback(
    async (planCode: PlanCode) => {
      if (planSaving) return;
      try {
        setPlanSaving(true);
        const response = await fetch('/api/admin/tenant-plan', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ planCode }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          throw new Error(errorPayload?.error || 'Error al actualizar el plan');
        }

        const data = (await response.json()) as PlanApiResponse & {
          updated?: boolean;
        };
        setPlanData({ plan: data.plan, usage: data.usage });
        toast.success('Plan actualizado correctamente');
      } catch (error) {
        console.error('Error updating plan:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el plan'
        );
      } finally {
        setPlanSaving(false);
      }
    },
    [planSaving]
  );

  const formatPrice = useCallback((value: number | null, currency: string) => {
    if (value == null || value === 0) {
      return 'Gratis';
    }
    try {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currency || 'ARS',
        maximumFractionDigits: 0,
      }).format(value);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `${currency || 'ARS'} ${value}`;
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (etag) {
        headers['If-Match'] = etag;
      }

      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        const newEtag = response.headers.get('ETag') || '';
        setEtag(newEtag);
        toast.success('Configuración guardada exitosamente');

        // Update form data with response to ensure consistency
        const payload = (
          'data' in updatedSettings && updatedSettings.data
            ? updatedSettings.data
            : updatedSettings
        ) as Partial<typeof formData>;

        setFormData((prev) => {
          const nextUploadMaxResolution =
            payload.uploadMaxResolution ?? prev.uploadMaxResolution;

          return {
            ...prev,
            ...payload,
            uploadMaxResolution: String(
              nextUploadMaxResolution
            ) as typeof prev.uploadMaxResolution,
          };
        });
      } else if (response.status === 412) {
        toast.error(
          'La configuración fue modificada por otro usuario. Recargando...'
        );
        await loadSettings();
      } else {
        const error = await response
          .json()
          .catch(() => ({ error: 'Error desconocido' }));
        toast.error(`Error al guardar: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background/50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-2 text-white/80">
            Cargando configuración...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-3">
          <div
            className="liquid-glass-intense inline-flex items-center gap-3 rounded-xl border border-white/15 px-4 py-3 shadow-[0_26px_80px_-40px_rgba(16,24,40,0.55)]"
            data-liquid-tone="accent"
          >
            <div className="liquid-glass flex h-10 w-10 items-center justify-center rounded-lg" data-liquid-tone="muted">
              <Settings2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="chromatic-text text-xl font-semibold sm:text-2xl">
                Configuración
              </h1>
              <p className="text-xs text-white/65 sm:text-[13px]">
                Gestiona la experiencia de tu plataforma LookEscolar
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar */}
          <div className="space-y-4 lg:w-80">
            <div
              className="liquid-glass-intense rounded-2xl border border-white/12 p-4 shadow-[0_24px_72px_-38px_rgba(16,24,40,0.5)]"
              data-liquid-tone="muted"
            >
              <h3 className="chromatic-text mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                Secciones
              </h3>
              <div className="space-y-1.5">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;

                  return (
                    <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={clsx(
                    'touch-target liquid-glass flex w-full items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-all duration-200',
                    isActive ? 'text-white' : 'text-white/70 hover:text-white'
                  )}
                  data-liquid-tone={isActive ? 'accent' : 'muted'}
                >
                  <Icon
                    className={clsx(
                      'mt-0.5 h-3.5 w-3.5 flex-shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-white/60'
                      )}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white">
                        {section.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-white/60">
                        {section.description}
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div
              className="liquid-glass-intense rounded-3xl border border-white/12 shadow-[0_36px_120px_-48px_rgba(16,24,40,0.55)]"
              data-liquid-tone="muted"
            >
              {/* Plan Section */}
              {activeSection === 'plan' && (
                <div className="space-y-6 p-6">
                  <div className="flex flex-col gap-2">
                    <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                      <Settings2 className="h-5 w-5" />
                      Plan y Límites
                    </h2>
                    <p className="text-sm text-card-foreground/70">
                      Revisá el estado del plan actual, su uso y actualizalo cuando sea necesario.
                    </p>
                  </div>

                  {planLoading ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-card-foreground/70">
                      Cargando plan actual...
                    </div>
                  ) : planData ? (
                    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                          <div className="flex flex-col gap-1">
                            <h3 className="text-lg font-semibold text-white">
                              Plan actual: {planData.plan.name}
                            </h3>
                            <p className="text-sm text-card-foreground/70">
                              {planData.plan.description}
                            </p>
                          </div>
                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase text-card-foreground/55">
                                Precio
                              </p>
                              <p className="mt-1 text-lg font-semibold text-white">
                                {formatPrice(planData.plan.priceMonthly, planData.plan.currency)}
                              </p>
                              <p className="text-[11px] text-card-foreground/60">por mes</p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase text-card-foreground/55">
                                Eventos activos
                              </p>
                              <p className="mt-1 text-lg font-semibold text-white">
                                {planData.plan.maxEvents != null
                                  ? `${planData.usage.activeEvents} / ${planData.plan.maxEvents}`
                                  : `${planData.usage.activeEvents} · Sin límite`}
                              </p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                              <p className="text-xs uppercase text-card-foreground/55">
                                Estado
                              </p>
                              <p className="mt-1 text-lg font-semibold capitalize text-white">
                                {planData.plan.status}
                              </p>
                              {planData.plan.trialEndsAt && (
                                <p className="text-[11px] text-card-foreground/60">
                                  Trial hasta{' '}
                                  {new Date(planData.plan.trialEndsAt).toLocaleDateString('es-AR')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          {PLAN_OPTIONS.map((option) => {
                            const isCurrent = planData.plan.code === option.code;
                            return (
                              <div
                                key={option.code}
                                className={clsx(
                                  'rounded-2xl border p-5 transition-colors',
                                  isCurrent
                                    ? 'border-primary/70 bg-primary/10'
                                    : 'border-white/10 bg-white/5 hover:border-primary/40'
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h4 className="text-lg font-semibold text-white">
                                      {option.name}
                                    </h4>
                                    <p className="text-sm text-card-foreground/70">
                                      {option.description}
                                    </p>
                                  </div>
                                  <span className="text-sm font-medium text-white">
                                    {option.priceLabel}
                                  </span>
                                </div>
                                <ul className="mt-4 space-y-2 text-sm text-card-foreground/65">
                                  {option.limits.map((limit) => (
                                    <li key={limit.label} className="flex items-center gap-2">
                                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary/70" />
                                      <span>
                                        {limit.label}:{' '}
                                        <span className="font-medium text-white">
                                          {limit.value}
                                        </span>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                                <button
                                  onClick={() => handlePlanUpdate(option.code)}
                                  disabled={isCurrent || planSaving}
                                  className={clsx(
                                    'mt-4 w-full rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/60',
                                    isCurrent
                                      ? 'bg-primary/10 text-white'
                                      : 'bg-primary text-white hover:bg-primary/80',
                                    planSaving && !isCurrent ? 'opacity-70' : ''
                                  )}
                                >
                                  {isCurrent
                                    ? 'Plan actual'
                                    : planSaving
                                    ? 'Actualizando...'
                                    : `Cambiar a ${option.name}`}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                          <h4 className="text-sm font-semibold text-white">Uso destacado</h4>
                          <ul className="mt-4 space-y-3 text-sm text-card-foreground/70">
                            <li>
                              <span className="block text-xs uppercase text-card-foreground/50">
                                Evento con más fotos
                              </span>
                              <span className="font-medium text-white">
                                {planData.usage.busiestPhotoEvent
                                  ? `${planData.usage.busiestPhotoEvent.photoCount} fotos · ${
                                      planData.usage.busiestPhotoEvent.eventName ?? 'Sin nombre'
                                    }`
                                  : 'Sin fotos cargadas'}
                              </span>
                              {planData.plan.maxPhotosPerEvent != null && (
                                <span className="block text-xs text-card-foreground/55">
                                  Límite por evento: {planData.plan.maxPhotosPerEvent}
                                </span>
                              )}
                            </li>
                            <li>
                              <span className="block text-xs uppercase text-card-foreground/50">
                                Evento con más shares
                              </span>
                              <span className="font-medium text-white">
                                {planData.usage.busiestShareEvent
                                  ? `${planData.usage.busiestShareEvent.shareCount} shares · ${
                                      planData.usage.busiestShareEvent.eventName ?? 'Sin nombre'
                                    }`
                                  : 'Sin shares creados'}
                              </span>
                              {planData.plan.maxSharesPerEvent != null && (
                                <span className="block text-xs text-card-foreground/55">
                                  Límite por evento: {planData.plan.maxSharesPerEvent}
                                </span>
                              )}
                            </li>
                          </ul>
                        </div>
                        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-xs text-card-foreground/60">
                          ¿Necesitás límites mayores o facturación personalizada? Contactá a soporte para planes Enterprise o ajustes a medida.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-card-foreground/70">
                      No se pudo cargar la información del plan.
                    </div>
                  )}
                </div>
              )}

              {/* Business Info Section */}
              {activeSection === 'business' && (
                <div className="space-y-6 p-6">
                  <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                    <Building2 className="h-5 w-5" />
                    Información del Negocio
                  </h2>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Nombre del Negocio
                      </label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) =>
                          updateFormData({ businessName: e.target.value })
                        }
                        className="input-base"
                        placeholder="Ingresa el nombre de tu negocio"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Email de Contacto
                      </label>
                      <input
                        type="email"
                        value={formData.businessEmail || ''}
                        onChange={(e) =>
                          updateFormData({ businessEmail: e.target.value })
                        }
                        className="input-base"
                        placeholder="email@ejemplo.com"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={formData.businessPhone || ''}
                        onChange={(e) =>
                          updateFormData({ businessPhone: e.target.value })
                        }
                        className="input-base"
                        placeholder="+54 11 1234-5678"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Sitio Web
                      </label>
                      <input
                        type="url"
                        value={formData.businessWebsite || ''}
                        onChange={(e) =>
                          updateFormData({ businessWebsite: e.target.value })
                        }
                        className="input-base"
                        placeholder="https://ejemplo.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                      Dirección
                    </label>
                    <textarea
                      rows={3}
                      value={formData.businessAddress || ''}
                      onChange={(e) =>
                        updateFormData({ businessAddress: e.target.value })
                      }
                      className="input-base resize-none"
                      placeholder="Dirección completa del estudio"
                    />
                  </div>
                </div>
              )}

              {/* Appearance Section */}
              {activeSection === 'appearance' && (
                <div className="space-y-6 p-6">
                  <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                    <Palette className="h-5 w-5" />
                    Apariencia
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-3 block text-xs font-medium text-white">
                        Tema de la Aplicación
                      </label>
                      <div className="rounded-lg border border-border bg-surface/50 p-4">
                        <LiquidThemeToggle size="sm" />
                        <p className="mt-2 text-[13px] text-card-foreground/70">
                          Actual:{' '}
                          <span className="font-medium capitalize">
                            {resolvedTheme}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Logo del Negocio
                      </label>
                      <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                        <Camera className="mx-auto mb-2 h-8 w-8 text-card-foreground/40" />
                        <p className="mb-2 text-[13px] text-card-foreground/70">
                          Arrastra tu logo aquí o haz clic para seleccionar
                        </p>
                        <button className="btn-secondary text-[13px]">
                          Seleccionar Archivo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Watermark Section */}
              {activeSection === 'watermark' && (
                <div className="space-y-6 p-6">
                  <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                    <ImageIcon className="h-5 w-5" />
                    Marca de Agua
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Texto del Watermark
                      </label>
                      <input
                        type="text"
                        value={formData.watermarkText}
                        onChange={(e) =>
                          updateFormData({ watermarkText: e.target.value })
                        }
                        className="input-base"
                        placeholder="Texto que aparecerá en las fotos"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-xs font-medium text-white">
                          Posición
                        </label>
                        <select
                          className="input-base"
                          value={formData.watermarkPosition}
                          onChange={(e) =>
                            updateFormData({
                              watermarkPosition: e.target.value as any,
                            })
                          }
                        >
                          <option value="bottom-right">Abajo Derecha</option>
                          <option value="bottom-left">Abajo Izquierda</option>
                          <option value="top-right">Arriba Derecha</option>
                          <option value="top-left">Arriba Izquierda</option>
                          <option value="center">Centro</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium text-white">
                          Opacidad (%)
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={formData.watermarkOpacity}
                          onChange={(e) =>
                            updateFormData({
                              watermarkOpacity: Number(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium text-white">
                          Tamaño
                        </label>
                        <select
                          className="input-base"
                          value={formData.watermarkSize}
                          onChange={(e) =>
                            updateFormData({
                              watermarkSize: e.target.value as any,
                            })
                          }
                        >
                          <option value="small">Pequeño</option>
                          <option value="medium">Mediano</option>
                          <option value="large">Grande</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Section */}
              {activeSection === 'upload' && (
                <div className="space-y-6 p-6">
                  <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                    <Upload className="h-5 w-5" />
                    Subida de Archivos
                  </h2>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Tamaño máximo por foto (MB)
                      </label>
                      <input
                        type="number"
                        value={formData.uploadMaxSizeMb}
                        onChange={(e) =>
                          updateFormData({
                            uploadMaxSizeMb: Number(e.target.value),
                          })
                        }
                        min="1"
                        max="50"
                        className="input-base"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Uploads simultáneos máximos
                      </label>
                      <input
                        type="number"
                        value={formData.uploadMaxConcurrent}
                        onChange={(e) =>
                          updateFormData({
                            uploadMaxConcurrent: Number(e.target.value),
                          })
                        }
                        min="1"
                        max="10"
                        className="input-base"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Calidad de imagen (%)
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={formData.uploadQuality}
                        onChange={(e) =>
                          updateFormData({
                            uploadQuality: Number(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Resolución máxima (px)
                      </label>
                      <select
                        className="input-base"
                        value={formData.uploadMaxResolution}
                        onChange={(e) =>
                          updateFormData({
                            uploadMaxResolution: e.target.value as any,
                          })
                        }
                      >
                        <option value="1600">1600px</option>
                        <option value="1920">1920px</option>
                        <option value="2048">2048px</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Section */}
              {activeSection === 'pricing' && (
                <div className="space-y-6 p-6">
                  <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                    <DollarSign className="h-5 w-5" />
                    Precios por Defecto
                  </h2>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Precio por foto digital (ARS)
                      </label>
                      <input
                        type="number"
                        value={formData.defaultPhotoPriceArs}
                        onChange={(e) =>
                          updateFormData({
                            defaultPhotoPriceArs: Number(e.target.value),
                          })
                        }
                        min="0"
                        step="50"
                        className="input-base"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Descuento por cantidad (%)
                      </label>
                      <input
                        type="number"
                        value={formData.bulkDiscountPercentage}
                        onChange={(e) =>
                          updateFormData({
                            bulkDiscountPercentage: Number(e.target.value),
                          })
                        }
                        min="0"
                        max="50"
                        className="input-base"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Mínimo para descuento
                      </label>
                      <input
                        type="number"
                        value={formData.bulkDiscountMinimum}
                        onChange={(e) =>
                          updateFormData({
                            bulkDiscountMinimum: Number(e.target.value),
                          })
                        }
                        min="2"
                        className="input-base"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Precio pack completo (ARS)
                      </label>
                      <input
                        type="number"
                        value={formData.packPriceArs}
                        onChange={(e) =>
                          updateFormData({
                            packPriceArs: Number(e.target.value),
                          })
                        }
                        min="0"
                        step="100"
                        className="input-base"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div className="space-y-6 p-6">
                  <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                    <Bell className="h-5 w-5" />
                    Notificaciones
                  </h2>

                  <div className="space-y-4">
                    {[
                      {
                        id: 'new-orders',
                        label: 'Nuevos pedidos',
                        desc: 'Email cuando hay un pedido nuevo',
                      },
                      {
                        id: 'payment-confirmed',
                        label: 'Pagos confirmados',
                        desc: 'Email cuando se confirma un pago',
                      },
                      {
                        id: 'weekly-report',
                        label: 'Reporte semanal',
                        desc: 'Resumen de actividad cada domingo',
                      },
                      {
                        id: 'storage-alert',
                        label: 'Alertas de almacenamiento',
                        desc: 'Notificar cuando el storage esté lleno',
                      },
                    ].map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4"
                      >
                        <div>
                          <h4 className="font-medium text-white">
                            {notification.label}
                          </h4>
                          <p className="text-[13px] text-card-foreground/70">
                            {notification.desc}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.notifyNewOrders}
                          onChange={(e) =>
                            updateFormData({
                              notifyNewOrders: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded text-primary"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Localization Section */}
              {activeSection === 'localization' && (
                <div className="space-y-6 p-6">
                  <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                    <Globe className="h-5 w-5" />
                    Localización
                  </h2>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Zona Horaria
                      </label>
                      <select
                        className="input-base"
                        value={formData.timezone}
                        onChange={(e) =>
                          updateFormData({ timezone: e.target.value })
                        }
                      >
                        <option value="America/Argentina/Buenos_Aires">
                          Buenos Aires (ART)
                        </option>
                        <option value="America/Argentina/Cordoba">
                          Córdoba (ART)
                        </option>
                        <option value="America/Argentina/Mendoza">
                          Mendoza (ART)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Formato de Fecha
                      </label>
                      <select
                        className="input-base"
                        value={formData.dateFormat}
                        onChange={(e) =>
                          updateFormData({ dateFormat: e.target.value as any })
                        }
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Moneda
                      </label>
                      <select
                        className="input-base"
                        value={formData.currency}
                        onChange={(e) =>
                          updateFormData({ currency: e.target.value as any })
                        }
                      >
                        <option value="ARS">Peso Argentino (ARS)</option>
                        <option value="USD">Dólar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-white">
                        Idioma
                      </label>
                      <select
                        className="input-base"
                        value={formData.language}
                        onChange={(e) =>
                          updateFormData({ language: e.target.value as any })
                        }
                      >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Backup Section */}
              {activeSection === 'backup' && (
                <div className="space-y-6 p-6">
                  <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                    <Download className="h-5 w-5" />
                    Backup y Exportación
                  </h2>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-surface/50 p-4">
                      <h4 className="mb-2 font-medium text-white">
                        Exportar Datos
                      </h4>
                      <p className="mb-4 text-[13px] text-card-foreground/70">
                        Descarga una copia de todos tus eventos, fotos y pedidos
                      </p>
                      <button className="btn-secondary">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar Todo
                      </button>
                    </div>

                    <div className="rounded-lg border border-border bg-surface/50 p-4">
                      <h4 className="mb-2 font-medium text-white">
                        Limpieza Automática
                      </h4>
                      <p className="mb-4 text-[13px] text-card-foreground/70">
                        Configurar limpieza automática de previews antiguos
                      </p>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.autoCleanupPreviews}
                            onChange={(e) =>
                              updateFormData({
                                autoCleanupPreviews: e.target.checked,
                              })
                            }
                            className="mr-2"
                          />
                          Eliminar previews después de 90 días
                        </label>
                      </div>
                    </div>

                    <div className="border-error bg-error/5 rounded-lg border p-4">
                      <h4 className="mb-2 font-medium text-white">
                        Zona de Peligro
                      </h4>
                      <p className="mb-4 text-[13px] text-card-foreground/70">
                        Acciones irreversibles que afectan todos los datos
                      </p>
                      <button className="btn-base bg-error hover:bg-error-strong text-white">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Restablecer Sistema
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="border-t border-border p-6">
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-primary min-w-[120px]"
                  >
                    {isSaving ? (
                      <div className="flex items-center gap-2">
                        <div className="spinner-sm" />
                        Guardando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Guardar
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

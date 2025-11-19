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
  Sparkles,
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
      description: 'Diseñado para equipos con múltiples fotógrafos y catálogos grandes.',
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
      description: 'Cobertura ilimitada, ideal para franquicias o redes de estudios.',
      priceLabel: 'ARS 69.999 / mes',
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
    <div className="min-h-screen w-full p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900/50 via-slate-900/20 to-slate-900/5 p-8 shadow-2xl backdrop-blur-xl dark:from-white/5 dark:via-white/5 dark:to-transparent">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent opacity-50" />
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-purple-500/20 blur-2xl" />

          <div className="relative z-10 flex items-center gap-6">
            <div className="liquid-glass group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 shadow-inner transition-all duration-500 hover:scale-105 hover:shadow-blue-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <Settings2 className="relative z-10 h-10 w-10 text-slate-700 transition-colors duration-500 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-300" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-white dark:via-blue-100 dark:to-white">
                  Configuración
                </h1>
                <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 backdrop-blur-md dark:text-blue-300">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Admin
                </span>
              </div>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Gestiona la experiencia completa de tu plataforma LookEscolar
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar */}
          <div className="space-y-4 lg:w-80">
            <div className="liquid-glass-intense overflow-hidden rounded-3xl border border-white/20 p-4 shadow-xl backdrop-blur-xl dark:border-white/10">
              <h3 className="mb-4 px-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Secciones
              </h3>
              <div className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={clsx(
                        'group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-300',
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                      )}
                    >
                      <div
                        className={clsx(
                          'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-blue-600 dark:bg-white/5 dark:text-slate-400 dark:group-hover:text-blue-400'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{section.title}</div>
                        <div
                          className={clsx(
                            'text-[11px] transition-colors',
                            isActive ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400'
                          )}
                        >
                          {section.description}
                        </div>
                      </div>

                      {isActive && (
                        <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div
              className="liquid-glass-intense rounded-3xl border border-white/12 shadow-[0_36px_120px_-48px_rgba(16,24,40,0.55)]"
              data-liquid-tone="muted"
            >
              {activeSection === 'plan' && (
                <div className="space-y-8 p-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-white">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                        <Settings2 className="h-6 w-6" />
                      </div>
                      Plan y Límites
                    </h2>
                    <p className="text-base text-slate-600 dark:text-slate-300">
                      Revisá el estado del plan actual, su uso y actualizalo cuando sea necesario.
                    </p>
                  </div>

                  {planLoading ? (
                    <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/50 p-12 dark:border-white/10 dark:bg-white/5">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando plan actual...</p>
                      </div>
                    </div>
                  ) : planData ? (
                    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
                      <div className="space-y-6">
                        {/* Current Plan Card */}
                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-purple-700 p-8 text-white shadow-2xl">
                          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-black/10 blur-2xl"></div>

                          <div className="relative z-10">
                            <div className="flex flex-col gap-2">
                              <h3 className="text-3xl font-bold">
                                {planData.plan.name}
                              </h3>
                              <p className="text-blue-100">
                                {planData.plan.description}
                              </p>
                            </div>

                            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md">
                                <p className="text-xs font-medium uppercase tracking-wider text-blue-200">
                                  Precio
                                </p>
                                <p className="mt-1 text-xl font-bold">
                                  {formatPrice(planData.plan.priceMonthly, planData.plan.currency)}
                                </p>
                                <p className="text-xs text-blue-200/80">por mes</p>
                              </div>
                              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md">
                                <p className="text-xs font-medium uppercase tracking-wider text-blue-200">
                                  Eventos activos
                                </p>
                                <p className="mt-1 text-xl font-bold">
                                  {planData.plan.maxEvents != null
                                    ? `${planData.usage.activeEvents} / ${planData.plan.maxEvents}`
                                    : `${planData.usage.activeEvents} · Sin límite`}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md">
                                <p className="text-xs font-medium uppercase tracking-wider text-blue-200">
                                  Estado
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
                                  <p className="text-xl font-bold capitalize">
                                    {planData.plan.status}
                                  </p>
                                </div>
                                {planData.plan.trialEndsAt && (
                                  <p className="mt-1 text-xs text-blue-200/80">
                                    Trial hasta{' '}
                                    {new Date(planData.plan.trialEndsAt).toLocaleDateString('es-AR')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Plan Options */}
                        <div className="grid gap-4 md:grid-cols-2">
                          {PLAN_OPTIONS.map((option) => {
                            const isCurrent = planData.plan.code === option.code;
                            return (
                              <div
                                key={option.code}
                                className={clsx(
                                  'group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300',
                                  isCurrent
                                    ? 'border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10'
                                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20'
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h4 className={clsx("text-lg font-bold", isCurrent ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white")}>
                                      {option.name}
                                    </h4>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                      {option.description}
                                    </p>
                                  </div>
                                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                    {option.priceLabel}
                                  </span>
                                </div>

                                <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                                  {option.limits.map((limit) => (
                                    <li key={limit.label} className="flex items-center gap-3">
                                      <div className={clsx("h-1.5 w-1.5 rounded-full", isCurrent ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600")} />
                                      <span>
                                        {limit.label}:{' '}
                                        <span className="font-semibold text-slate-900 dark:text-white">
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
                                    'mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50',
                                    isCurrent
                                      ? 'cursor-default bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300'
                                      : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
                                    planSaving && !isCurrent ? 'opacity-70 cursor-not-allowed' : ''
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

                      <div className="space-y-6">
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                          <h4 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            Uso destacado
                          </h4>
                          <ul className="mt-6 space-y-6">
                            <li>
                              <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                                Evento con más fotos
                              </span>
                              <div className="mt-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                                <span className="block font-semibold text-slate-900 dark:text-white">
                                  {planData.usage.busiestPhotoEvent
                                    ? `${planData.usage.busiestPhotoEvent.photoCount} fotos`
                                    : 'Sin fotos cargadas'}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {planData.usage.busiestPhotoEvent?.eventName ?? 'Sin nombre'}
                                </span>
                              </div>
                              {planData.plan.maxPhotosPerEvent != null && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                  <div className="h-1 flex-1 rounded-full bg-slate-100 dark:bg-white/10">
                                    <div
                                      className="h-full rounded-full bg-blue-500"
                                      style={{ width: `${Math.min(100, ((planData.usage.busiestPhotoEvent?.photoCount || 0) / planData.plan.maxPhotosPerEvent) * 100)}%` }}
                                    />
                                  </div>
                                  <span>Límite: {planData.plan.maxPhotosPerEvent}</span>
                                </div>
                              )}
                            </li>
                            <li>
                              <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                                Evento con más shares
                              </span>
                              <div className="mt-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                                <span className="block font-semibold text-slate-900 dark:text-white">
                                  {planData.usage.busiestShareEvent
                                    ? `${planData.usage.busiestShareEvent.shareCount} shares`
                                    : 'Sin shares creados'}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {planData.usage.busiestShareEvent?.eventName ?? 'Sin nombre'}
                                </span>
                              </div>
                              {planData.plan.maxSharesPerEvent != null && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                  <div className="h-1 flex-1 rounded-full bg-slate-100 dark:bg-white/10">
                                    <div
                                      className="h-full rounded-full bg-purple-500"
                                      style={{ width: `${Math.min(100, ((planData.usage.busiestShareEvent?.shareCount || 0) / planData.plan.maxSharesPerEvent) * 100)}%` }}
                                    />
                                  </div>
                                  <span>Límite: {planData.plan.maxSharesPerEvent}</span>
                                </div>
                              )}
                            </li>
                          </ul>
                        </div>

                        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                          <p>
                            ¿Necesitás límites mayores o facturación personalizada?
                          </p>
                          <button className="mt-4 text-blue-600 hover:underline dark:text-blue-400">
                            Contactar a soporte
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                      No se pudo cargar la información del plan.
                    </div>
                  )}
                </div>
              )}
              {activeSection === 'business' && (
                <div className="space-y-8 p-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-white">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                        <Building2 className="h-6 w-6" />
                      </div>
                      Información del Negocio
                    </h2>
                    <p className="text-base text-slate-600 dark:text-slate-300">
                      Datos básicos de tu fotografía escolar
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Nombre del Negocio
                      </label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) =>
                          updateFormData({ businessName: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                        placeholder="Ingresa el nombre de tu negocio"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Email de Contacto
                      </label>
                      <input
                        type="email"
                        value={formData.businessEmail || ''}
                        onChange={(e) =>
                          updateFormData({ businessEmail: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                        placeholder="email@ejemplo.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={formData.businessPhone || ''}
                        onChange={(e) =>
                          updateFormData({ businessPhone: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                        placeholder="+54 11 1234-5678"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Sitio Web
                      </label>
                      <input
                        type="url"
                        value={formData.businessWebsite || ''}
                        onChange={(e) =>
                          updateFormData({ businessWebsite: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                        placeholder="https://ejemplo.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Dirección
                    </label>
                    <textarea
                      rows={3}
                      value={formData.businessAddress || ''}
                      onChange={(e) =>
                        updateFormData({ businessAddress: e.target.value })
                      }
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                      placeholder="Dirección completa del estudio"
                    />
                  </div>
                </div>
              )}

              {activeSection === 'appearance' && (
                <div className="space-y-8 p-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-white">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                        <Palette className="h-6 w-6" />
                      </div>
                      Apariencia
                    </h2>
                    <p className="text-base text-slate-600 dark:text-slate-300">
                      Tema y personalización visual
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Tema de la Aplicación
                      </label>
                      <div className="rounded-2xl border border-slate-200 bg-white/50 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center justify-between">
                          <LiquidThemeToggle size="md" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Actual:{' '}
                            <span className="font-semibold capitalize text-slate-900 dark:text-white">
                              {resolvedTheme}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Logo del Negocio
                      </label>
                      <div className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-10 transition-all hover:border-blue-500 hover:bg-blue-50/50 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/10">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 transition-colors group-hover:bg-blue-100 dark:bg-white/10 dark:group-hover:bg-blue-500/20">
                          <Camera className="h-8 w-8 text-slate-400 transition-colors group-hover:text-blue-600 dark:text-slate-500 dark:group-hover:text-blue-400" />
                        </div>
                        <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">
                          Arrastra tu logo aquí o haz clic para seleccionar
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          PNG, JPG o SVG (max. 2MB)
                        </p>
                        <button className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-white/10 dark:text-white dark:ring-white/10 dark:hover:bg-white/20">
                          Seleccionar Archivo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'watermark' && (
                <div className="space-y-8 p-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-white">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                      Marca de Agua
                    </h2>
                    <p className="text-base text-slate-600 dark:text-slate-300">
                      Configuración del watermark en fotos
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Texto del Watermark
                      </label>
                      <input
                        type="text"
                        value={formData.watermarkText}
                        onChange={(e) =>
                          updateFormData({ watermarkText: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                        placeholder="Texto que aparecerá en las fotos"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Posición
                        </label>
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
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

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Opacidad ({formData.watermarkOpacity}%)
                        </label>
                        <div className="flex h-[50px] items-center rounded-xl border border-slate-200 bg-white/50 px-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
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
                            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600 dark:bg-white/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Tamaño
                        </label>
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
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
              {activeSection === 'upload' && (
                <div className="space-y-8 p-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-white">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                        <Upload className="h-6 w-6" />
                      </div>
                      Subida de Archivos
                    </h2>
                    <p className="text-base text-slate-600 dark:text-slate-300">
                      Límites y configuración de upload
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Calidad de imagen ({formData.uploadQuality}%)
                      </label>
                      <div className="flex h-[50px] items-center rounded-xl border border-slate-200 bg-white/50 px-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
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
                          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600 dark:bg-white/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Resolución máxima (px)
                      </label>
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
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

              {activeSection === 'pricing' && (
                <div className="space-y-8 p-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-white">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                        <DollarSign className="h-6 w-6" />
                      </div>
                      Precios por Defecto
                    </h2>
                    <p className="text-base text-slate-600 dark:text-slate-300">
                      Configuración de precios estándar
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="space-y-8 p-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-white">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                        <Bell className="h-6 w-6" />
                      </div>
                      Notificaciones
                    </h2>
                    <p className="text-base text-slate-600 dark:text-slate-300">
                      Preferencias de alertas y emails
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        id: 'new-orders',
                        label: 'Nuevos pedidos',
                        desc: 'Email cuando hay un pedido nuevo',
                        checked: formData.notifyNewOrders,
                        key: 'notifyNewOrders',
                      },
                      {
                        id: 'payment-confirmed',
                        label: 'Pagos confirmados',
                        desc: 'Email cuando se confirma un pago',
                        checked: formData.notifyPayments,
                        key: 'notifyPayments',
                      },
                      {
                        id: 'weekly-report',
                        label: 'Reporte semanal',
                        desc: 'Resumen de actividad cada domingo',
                        checked: formData.notifyWeeklyReport,
                        key: 'notifyWeeklyReport',
                      },
                      {
                        id: 'storage-alert',
                        label: 'Alertas de almacenamiento',
                        desc: 'Notificar cuando el storage esté lleno',
                        checked: formData.notifyStorageAlerts,
                        key: 'notifyStorageAlerts',
                      },
                    ].map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/50 p-5 backdrop-blur-sm transition-all hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">
                            {notification.label}
                          </h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {notification.desc}
                          </p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={notification.checked}
                            onChange={(e) =>
                              updateFormData({
                                [notification.key]: e.target.checked,
                              })
                            }
                            className="peer sr-only"
                          />
                          <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:bg-white/10 dark:peer-focus:ring-blue-800"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'localization' && (
                <div className="space-y-8 p-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-white">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                        <Globe className="h-6 w-6" />
                      </div>
                      Localización
                    </h2>
                    <p className="text-base text-slate-600 dark:text-slate-300">
                      Zona horaria y formato de fecha
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Zona Horaria
                      </label>
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
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

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Formato de Fecha
                      </label>
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
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

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Moneda
                      </label>
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
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

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Idioma
                      </label>
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
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

              {activeSection === 'backup' && (
                <div className="space-y-8 p-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-white">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                        <Download className="h-6 w-6" />
                      </div>
                      Backup y Exportación
                    </h2>
                    <p className="text-base text-slate-600 dark:text-slate-300">
                      Respaldo de datos del sistema
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white/50 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                      <h4 className="mb-2 font-semibold text-slate-900 dark:text-white">
                        Exportar Datos
                      </h4>
                      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                        Descarga una copia de todos tus eventos, fotos y pedidos
                      </p>
                      <button className="inline-flex items-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar Todo
                      </button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white/50 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                      <h4 className="mb-2 font-semibold text-slate-900 dark:text-white">
                        Limpieza Automática
                      </h4>
                      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                        Configurar limpieza automática de previews antiguos
                      </p>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={formData.autoCleanupPreviews}
                            onChange={(e) =>
                              updateFormData({
                                autoCleanupPreviews: e.target.checked,
                              })
                            }
                            className="mr-3 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-white/20 dark:bg-white/10 dark:focus:ring-blue-600/50"
                          />
                          Eliminar previews después de 90 días
                        </label>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 backdrop-blur-sm dark:border-red-500/20 dark:bg-red-500/10">
                      <h4 className="mb-2 font-semibold text-red-700 dark:text-red-400">
                        Zona de Peligro
                      </h4>
                      <p className="mb-4 text-sm text-red-600/80 dark:text-red-400/80">
                        Acciones irreversibles que afectan todos los datos
                      </p>
                      <button className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 shadow-lg shadow-red-500/20">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Restablecer Sistema
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button (Hidden for Plan and Appearance sections if not needed, but Appearance might need it if we add more settings later. Plan has its own save) */}
              {activeSection !== 'plan' && activeSection !== 'appearance' && (
                <div className="border-t border-white/10 p-6">
                  <div className="flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="btn-primary min-w-[120px] flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Guardar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

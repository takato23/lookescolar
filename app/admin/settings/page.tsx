'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Settings2,
  Building2,
  Palette,
  Upload,
  DollarSign,
  Shield,
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

const sections: SettingsSection[] = [
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
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const settings = await response.json();
        const responseEtag = response.headers.get('ETag') || '';
        setEtag(responseEtag);
        setFormData({
          ...formData,
          ...settings,
          uploadMaxResolution: String(settings.uploadMaxResolution),
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
  };

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
        body: JSON.stringify({
          ...formData,
          uploadMaxResolution: Number(formData.uploadMaxResolution),
        }),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        const newEtag = response.headers.get('ETag') || '';
        setEtag(newEtag);
        toast.success('Configuración guardada exitosamente');

        // Update form data with response to ensure consistency
        setFormData({
          ...formData,
          ...updatedSettings,
          uploadMaxResolution: String(updatedSettings.uploadMaxResolution),
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
      <div className="bg-background/50 flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-gray-900 dark:text-gray-100 mt-2">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background/50 min-h-screen">
      <div className="mx-auto max-w-7xl p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-2">
              <Settings2 className="text-primary h-6 w-6" />
            </div>
            <h1 className="text-foreground text-3xl font-bold">
              Configuración
            </h1>
          </div>
          <p className="text-text-secondary">
            Gestiona la configuración general de tu sistema LookEscolar
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar */}
          <div className="space-y-2 lg:w-80">
            <div className="bg-white dark:bg-gray-900 border-border rounded-lg border p-4">
              <h3 className="text-gray-900 dark:text-gray-100 mb-3 font-semibold">
                Secciones
              </h3>
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`touch-target flex w-full items-start gap-3 rounded-lg p-3 text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-primary/10 text-primary border-primary/20 border'
                        : 'text-card-foreground hover:text-foreground hover:bg-surface'
                    } `}
                  >
                    <Icon
                      className={`mt-0.5 h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-card-foreground/60'}`}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{section.title}</div>
                      <div className="text-foreground/60 mt-0.5 text-xs">
                        {section.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-900 border-border rounded-lg border">
              {/* Business Info Section */}
              {activeSection === 'business' && (
                <div className="space-y-6 p-6">
                  <h2 className="text-gray-900 dark:text-gray-100 flex items-center gap-2 text-xl font-semibold">
                    <Building2 className="h-5 w-5" />
                    Información del Negocio
                  </h2>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                    <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                  <h2 className="text-gray-900 dark:text-gray-100 flex items-center gap-2 text-xl font-semibold">
                    <Palette className="h-5 w-5" />
                    Apariencia
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-900 dark:text-gray-100 mb-3 block text-sm font-medium">
                        Tema de la Aplicación
                      </label>
                      <div className="border-border rounded-lg border bg-surface/50 p-4">
                        <LiquidThemeToggle size="sm" />
                        <p className="text-card-foreground/70 mt-2 text-sm">
                          Actual:{' '}
                          <span className="font-medium capitalize">
                            {resolvedTheme}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
                        Logo del Negocio
                      </label>
                      <div className="border-border rounded-lg border-2 border-dashed p-6 text-center">
                        <Camera className="text-card-foreground/40 mx-auto mb-2 h-8 w-8" />
                        <p className="text-card-foreground/70 mb-2 text-sm">
                          Arrastra tu logo aquí o haz clic para seleccionar
                        </p>
                        <button className="btn-secondary text-sm">
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
                  <h2 className="text-gray-900 dark:text-gray-100 flex items-center gap-2 text-xl font-semibold">
                    <ImageIcon className="h-5 w-5" />
                    Marca de Agua
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                        <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                        <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                        <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                  <h2 className="text-gray-900 dark:text-gray-100 flex items-center gap-2 text-xl font-semibold">
                    <Upload className="h-5 w-5" />
                    Subida de Archivos
                  </h2>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                  <h2 className="text-gray-900 dark:text-gray-100 flex items-center gap-2 text-xl font-semibold">
                    <DollarSign className="h-5 w-5" />
                    Precios por Defecto
                  </h2>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                  <h2 className="text-gray-900 dark:text-gray-100 flex items-center gap-2 text-xl font-semibold">
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
                        className="border-border flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <h4 className="text-gray-900 dark:text-gray-100 font-medium">
                            {notification.label}
                          </h4>
                          <p className="text-card-foreground/70 text-sm">
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
                          className="text-primary h-4 w-4 rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Localization Section */}
              {activeSection === 'localization' && (
                <div className="space-y-6 p-6">
                  <h2 className="text-gray-900 dark:text-gray-100 flex items-center gap-2 text-xl font-semibold">
                    <Globe className="h-5 w-5" />
                    Localización
                  </h2>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                      <label className="text-gray-900 dark:text-gray-100 mb-2 block text-sm font-medium">
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
                  <h2 className="text-gray-900 dark:text-gray-100 flex items-center gap-2 text-xl font-semibold">
                    <Download className="h-5 w-5" />
                    Backup y Exportación
                  </h2>

                  <div className="space-y-4">
                    <div className="border-border rounded-lg border bg-surface/50 p-4">
                      <h4 className="text-gray-900 dark:text-gray-100 mb-2 font-medium">
                        Exportar Datos
                      </h4>
                      <p className="text-card-foreground/70 mb-4 text-sm">
                        Descarga una copia de todos tus eventos, fotos y pedidos
                      </p>
                      <button className="btn-secondary">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar Todo
                      </button>
                    </div>

                    <div className="border-border rounded-lg border bg-surface/50 p-4">
                      <h4 className="text-gray-900 dark:text-gray-100 mb-2 font-medium">
                        Limpieza Automática
                      </h4>
                      <p className="text-card-foreground/70 mb-4 text-sm">
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
                      <h4 className="text-gray-900 dark:text-gray-100 mb-2 font-medium">
                        Zona de Peligro
                      </h4>
                      <p className="text-card-foreground/70 mb-4 text-sm">
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
              <div className="border-border border-t p-6">
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

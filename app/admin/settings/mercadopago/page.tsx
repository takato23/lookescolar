'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  ExternalLink,
  AlertCircle,
  Eye,
  EyeOff,
  TestTube,
  CheckCircle,
  XCircle,
  Info,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface MPConfig {
  publicKey: string;
  accessToken: string;
  webhookSecret: string;
  environment: 'sandbox' | 'production';
  webhookUrl?: string;
}

export default function MercadoPagoSettingsPage() {
  const [config, setConfig] = useState<MPConfig>({
    publicKey: '',
    accessToken: '',
    webhookSecret: '',
    environment: 'sandbox',
  });
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(
    null
  );

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/settings/mercadopago');
      if (response.ok) {
        const data = await response.json();
        setConfig({
          ...config,
          ...data,
          webhookUrl: `${window.location.origin}/api/payments/webhook`,
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Error al guardar configuración');
      }

      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      toast.error('Error al guardar configuración');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/settings/mercadopago/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: config.accessToken,
          environment: config.environment,
        }),
      });

      if (response.ok) {
        setTestResult('success');
        toast.success('Conexión exitosa con Mercado Pago');
      } else {
        setTestResult('error');
        toast.error('Error al conectar con Mercado Pago');
      }
    } catch (error) {
      setTestResult('error');
      toast.error('Error al probar conexión');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen w-full p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900/50 via-slate-900/20 to-slate-900/5 p-8 shadow-2xl backdrop-blur-xl dark:from-white/5 dark:via-white/5 dark:to-transparent">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-blue-500/5 to-transparent opacity-50" />
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-green-500/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-blue-500/20 blur-2xl" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="liquid-glass group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 shadow-inner transition-all duration-500 hover:scale-105 hover:shadow-green-500/20">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-blue-500/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <CreditCard className="relative z-10 h-10 w-10 text-slate-700 transition-colors duration-500 group-hover:text-green-600 dark:text-white dark:group-hover:text-green-300" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="bg-gradient-to-r from-slate-900 via-green-800 to-slate-900 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-white dark:via-green-100 dark:to-white">
                    Mercado Pago
                  </h1>
                  <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 backdrop-blur-md dark:text-green-300">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Pagos
                  </span>
                </div>
                <p className="text-lg text-slate-600 dark:text-slate-300">
                  Configura las credenciales para procesar pagos con Mercado Pago
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                window.open(
                  'https://www.mercadopago.com.ar/developers/panel',
                  '_blank'
                )
              }
              className="hidden lg:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm font-medium text-slate-900 backdrop-blur-sm transition-all hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4" />
              Panel de Desarrolladores
            </button>
          </div>
        </div>

        {/* Instructions Card */}
        <div className="liquid-glass-intense rounded-3xl border border-white/20 p-8 shadow-xl backdrop-blur-xl dark:border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
              <Info className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              ¿Cómo obtener las credenciales?
            </h2>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-blue-50/40 p-6 backdrop-blur-sm dark:border-blue-500/20 dark:from-blue-500/10 dark:to-blue-500/5">
              <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">
                Pasos para configurar Mercado Pago:
              </h3>
              <ol className="list-inside list-decimal space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <li>
                  Ingresa al{' '}
                  <a
                    href="https://www.mercadopago.com.ar/developers/panel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 underline decoration-blue-400 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Panel de Desarrolladores de Mercado Pago
                  </a>
                </li>
                <li>Crea una aplicación nueva o selecciona una existente</li>
                <li>
                  En la sección <strong className="text-slate-900 dark:text-white">"Credenciales de prueba"</strong> (para
                  sandbox) o <strong className="text-slate-900 dark:text-white">"Credenciales de producción"</strong>{' '}
                  encontrarás:
                  <ul className="ml-6 mt-2 list-inside list-disc space-y-1">
                    <li>
                      <strong className="text-slate-900 dark:text-white">Public Key</strong>: Para el checkout en el frontend
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">Access Token</strong>: Para crear pagos desde el
                      backend
                    </li>
                  </ul>
                </li>
                <li>
                  Para el <strong className="text-slate-900 dark:text-white">Webhook Secret</strong>:
                  <ul className="ml-6 mt-2 list-inside list-disc space-y-1">
                    <li>Ve a "Webhooks" en tu aplicación</li>
                    <li>Configura la URL de webhook (copiala de abajo)</li>
                    <li>Selecciona el evento "Payment notifications"</li>
                    <li>Copia el secret que te proporciona MP</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-yellow-50/40 p-6 backdrop-blur-sm dark:border-amber-500/20 dark:from-amber-500/10 dark:to-yellow-500/5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-amber-900 dark:text-amber-300">Importante:</p>
                  <ul className="mt-2 list-inside list-disc space-y-1.5 text-amber-800 dark:text-amber-200">
                    <li>
                      Usa credenciales de <strong>prueba (sandbox)</strong> para
                      desarrollo
                    </li>
                    <li>
                      Solo usa credenciales de <strong>producción</strong> cuando
                      estés listo para cobrar real
                    </li>
                    <li>Nunca compartas tu Access Token con nadie</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="liquid-glass-intense rounded-3xl border border-white/20 p-8 shadow-xl backdrop-blur-xl dark:border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-white shadow-lg shadow-green-500/30">
              <CreditCard className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              Credenciales de Mercado Pago
            </h2>
          </div>

          <div className="space-y-6">
            {/* Environment Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Entorno
              </label>
              <div className="flex gap-4">
                <label className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white/50 px-4 py-3 transition-all hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <input
                    type="radio"
                    value="sandbox"
                    checked={config.environment === 'sandbox'}
                    onChange={(e) =>
                      setConfig({ ...config, environment: 'sandbox' })
                    }
                    className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-white/20"
                  />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    Sandbox (Pruebas)
                  </span>
                </label>
                <label className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white/50 px-4 py-3 transition-all hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <input
                    type="radio"
                    value="production"
                    checked={config.environment === 'production'}
                    onChange={(e) =>
                      setConfig({ ...config, environment: 'production' })
                    }
                    className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-white/20"
                  />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    Producción (Real)
                  </span>
                </label>
              </div>
              {config.environment === 'production' && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 dark:bg-red-500/10">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Modo producción: Los pagos serán reales
                  </p>
                </div>
              )}
            </div>

            {/* Public Key */}
            <div className="space-y-2">
              <label htmlFor="publicKey" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Public Key
              </label>
              <input
                id="publicKey"
                type="text"
                value={config.publicKey}
                onChange={(e) =>
                  setConfig({ ...config, publicKey: e.target.value })
                }
                placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 font-mono text-sm text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Se usa en el frontend para inicializar el checkout
              </p>
            </div>

            {/* Access Token */}
            <div className="space-y-2">
              <label htmlFor="accessToken" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Access Token
              </label>
              <div className="relative">
                <input
                  id="accessToken"
                  type={showAccessToken ? 'text' : 'password'}
                  value={config.accessToken}
                  onChange={(e) =>
                    setConfig({ ...config, accessToken: e.target.value })
                  }
                  placeholder="TEST-xxxxxxxxxxxx..."
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 pr-12 font-mono text-sm text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                />
                <button
                  type="button"
                  onClick={() => setShowAccessToken(!showAccessToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-300"
                >
                  {showAccessToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Token secreto para crear pagos desde el servidor
              </p>
            </div>

            {/* Webhook Secret */}
            <div className="space-y-2">
              <label htmlFor="webhookSecret" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Webhook Secret (Opcional)
              </label>
              <div className="relative">
                <input
                  id="webhookSecret"
                  type={showWebhookSecret ? 'text' : 'password'}
                  value={config.webhookSecret}
                  onChange={(e) =>
                    setConfig({ ...config, webhookSecret: e.target.value })
                  }
                  placeholder="tu_webhook_secret_de_mp"
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 pr-12 font-mono text-sm text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-white/10"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-300"
                >
                  {showWebhookSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Para verificar que las notificaciones vienen de MP (recomendado)
              </p>
            </div>

            {/* Webhook URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                URL de Webhook
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={
                    config.webhookUrl ||
                    `${window.location.origin}/api/payments/webhook`
                  }
                  readOnly
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 font-mono text-sm text-slate-600 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(config.webhookUrl || '');
                    toast.success('URL copiada al portapapeles');
                  }}
                  className="rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm font-medium text-slate-900 backdrop-blur-sm transition-all hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  Copiar
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configura esta URL en tu aplicación de Mercado Pago
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={saveConfig}
                disabled={loading || !config.publicKey || !config.accessToken}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/25 transition-all hover:shadow-xl hover:shadow-green-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar Configuración
                  </>
                )}
              </button>

              <button
                onClick={testConnection}
                disabled={testing || !config.accessToken}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/50 px-6 py-3 text-sm font-semibold text-slate-900 backdrop-blur-sm transition-all hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                {testing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent dark:border-white dark:border-t-transparent" />
                    Probando...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4" />
                    Probar Conexión
                  </>
                )}
              </button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div
                className={`flex items-start gap-4 rounded-2xl border p-6 backdrop-blur-sm ${
                  testResult === 'success'
                    ? 'border-green-200 bg-gradient-to-br from-green-50/80 to-green-50/40 dark:border-green-500/20 dark:from-green-500/10 dark:to-green-500/5'
                    : 'border-red-200 bg-gradient-to-br from-red-50/80 to-red-50/40 dark:border-red-500/20 dark:from-red-500/10 dark:to-red-500/5'
                }`}
              >
                {testResult === 'success' ? (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-green-900 dark:text-green-300">
                        Conexión exitosa
                      </p>
                      <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                        Las credenciales son válidas y Mercado Pago está
                        respondiendo correctamente
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-red-900 dark:text-red-300">
                        Error de conexión
                      </p>
                      <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                        Verifica que las credenciales sean correctas y
                        correspondan al entorno seleccionado
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="liquid-glass-intense rounded-3xl border border-white/20 p-8 shadow-xl backdrop-blur-xl dark:border-white/10">
          <h2 className="mb-6 text-2xl font-bold text-slate-800 dark:text-white">
            Enlaces Útiles
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <a
              href="https://www.mercadopago.com.ar/developers/es/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/50 p-5 backdrop-blur-sm transition-all hover:scale-[1.02] hover:border-blue-300 hover:bg-white hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-500/30 dark:hover:bg-white/10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:text-blue-400 dark:group-hover:bg-blue-500/20">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-white">Documentación</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Guías y referencias de la API
                </p>
              </div>
            </a>

            <a
              href="https://www.mercadopago.com.ar/developers/panel/test-users"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/50 p-5 backdrop-blur-sm transition-all hover:scale-[1.02] hover:border-purple-300 hover:bg-white hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:hover:border-purple-500/30 dark:hover:bg-white/10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white dark:bg-purple-500/10 dark:text-purple-400 dark:group-hover:bg-purple-500/20">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-white">Usuarios de Prueba</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Crea usuarios para testing
                </p>
              </div>
            </a>

            <a
              href="https://www.mercadopago.com.ar/activities"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/50 p-5 backdrop-blur-sm transition-all hover:scale-[1.02] hover:border-green-300 hover:bg-white hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:hover:border-green-500/30 dark:hover:bg-white/10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600 transition-colors group-hover:bg-green-600 group-hover:text-white dark:bg-green-500/10 dark:text-green-400 dark:group-hover:bg-green-500/20">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-white">Actividad de Cuenta</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Ve tus transacciones</p>
              </div>
            </a>

            <a
              href="https://vendedores.mercadolibre.com.ar/ingresos-mercadopago"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/50 p-5 backdrop-blur-sm transition-all hover:scale-[1.02] hover:border-amber-300 hover:bg-white hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:hover:border-amber-500/30 dark:hover:bg-white/10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white dark:bg-amber-500/10 dark:text-amber-400 dark:group-hover:bg-amber-500/20">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-white">Balance y Retiros</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Gestiona tu dinero</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

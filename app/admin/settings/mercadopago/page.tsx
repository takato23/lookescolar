'use client';

import { useState, useEffect } from 'react';
import { Save, ExternalLink, AlertCircle, Eye, EyeOff, TestTube, CheckCircle, XCircle, Info, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    environment: 'sandbox'
  });
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

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
          webhookUrl: `${window.location.origin}/api/payments/webhook`
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
        body: JSON.stringify(config)
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
          environment: config.environment
        })
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
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Configuración de Mercado Pago</h1>
          <p className="text-gray-600 mt-2">
            Configura las credenciales para procesar pagos con Mercado Pago
          </p>
        </div>
        <Button
          onClick={() => window.open('https://www.mercadopago.com.ar/developers/panel', '_blank')}
          variant="outline"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Panel de Desarrolladores
        </Button>
      </div>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            ¿Cómo obtener las credenciales?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Pasos para configurar Mercado Pago:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Ingresa al{' '}
                <a
                  href="https://www.mercadopago.com.ar/developers/panel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Panel de Desarrolladores de Mercado Pago
                </a>
              </li>
              <li>Crea una aplicación nueva o selecciona una existente</li>
              <li>
                En la sección <strong>"Credenciales de prueba"</strong> (para sandbox) o{' '}
                <strong>"Credenciales de producción"</strong> encontrarás:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li><strong>Public Key</strong>: Para el checkout en el frontend</li>
                  <li><strong>Access Token</strong>: Para crear pagos desde el backend</li>
                </ul>
              </li>
              <li>
                Para el <strong>Webhook Secret</strong>:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Ve a "Webhooks" en tu aplicación</li>
                  <li>Configura la URL de webhook (copiala de abajo)</li>
                  <li>Selecciona el evento "Payment notifications"</li>
                  <li>Copia el secret que te proporciona MP</li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Importante:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Usa credenciales de <strong>prueba (sandbox)</strong> para desarrollo</li>
                  <li>Solo usa credenciales de <strong>producción</strong> cuando estés listo para cobrar real</li>
                  <li>Nunca compartas tu Access Token con nadie</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credenciales de Mercado Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Selection */}
          <div>
            <Label>Entorno</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="sandbox"
                  checked={config.environment === 'sandbox'}
                  onChange={(e) => setConfig({ ...config, environment: 'sandbox' })}
                  className="text-primary"
                />
                <span>Sandbox (Pruebas)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="production"
                  checked={config.environment === 'production'}
                  onChange={(e) => setConfig({ ...config, environment: 'production' })}
                  className="text-primary"
                />
                <span>Producción (Real)</span>
              </label>
            </div>
            {config.environment === 'production' && (
              <p className="text-sm text-red-600 mt-1">
                ⚠️ Modo producción: Los pagos serán reales
              </p>
            )}
          </div>

          {/* Public Key */}
          <div>
            <Label htmlFor="publicKey">Public Key</Label>
            <Input
              id="publicKey"
              value={config.publicKey}
              onChange={(e) => setConfig({ ...config, publicKey: e.target.value })}
              placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono"
            />
            <p className="text-sm text-gray-500 mt-1">
              Se usa en el frontend para inicializar el checkout
            </p>
          </div>

          {/* Access Token */}
          <div>
            <Label htmlFor="accessToken">Access Token</Label>
            <div className="relative">
              <Input
                id="accessToken"
                type={showAccessToken ? 'text' : 'password'}
                value={config.accessToken}
                onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                placeholder="TEST-xxxxxxxxxxxx..."
                className="font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowAccessToken(!showAccessToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Token secreto para crear pagos desde el servidor
            </p>
          </div>

          {/* Webhook Secret */}
          <div>
            <Label htmlFor="webhookSecret">Webhook Secret (Opcional)</Label>
            <div className="relative">
              <Input
                id="webhookSecret"
                type={showWebhookSecret ? 'text' : 'password'}
                value={config.webhookSecret}
                onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
                placeholder="tu_webhook_secret_de_mp"
                className="font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Para verificar que las notificaciones vienen de MP (recomendado)
            </p>
          </div>

          {/* Webhook URL */}
          <div>
            <Label>URL de Webhook</Label>
            <div className="flex gap-2">
              <Input
                value={config.webhookUrl || `${window.location.origin}/api/payments/webhook`}
                readOnly
                className="font-mono bg-gray-50"
              />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(config.webhookUrl || '');
                  toast.success('URL copiada al portapapeles');
                }}
              >
                Copiar
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Configura esta URL en tu aplicación de Mercado Pago
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={saveConfig}
              disabled={loading || !config.publicKey || !config.accessToken}
            >
              {loading ? (
                <>Guardando...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Configuración
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing || !config.accessToken}
            >
              {testing ? (
                <>Probando...</>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Probar Conexión
                </>
              )}
            </Button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              testResult === 'success' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              {testResult === 'success' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">Conexión exitosa</p>
                    <p className="text-sm text-green-700">
                      Las credenciales son válidas y Mercado Pago está respondiendo correctamente
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-800">Error de conexión</p>
                    <p className="text-sm text-red-700">
                      Verifica que las credenciales sean correctas y correspondan al entorno seleccionado
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Enlaces Útiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://www.mercadopago.com.ar/developers/es/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              <div>
                <p className="font-semibold">Documentación</p>
                <p className="text-sm text-gray-600">Guías y referencias de la API</p>
              </div>
            </a>
            
            <a
              href="https://www.mercadopago.com.ar/developers/panel/test-users"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              <div>
                <p className="font-semibold">Usuarios de Prueba</p>
                <p className="text-sm text-gray-600">Crea usuarios para testing</p>
              </div>
            </a>
            
            <a
              href="https://www.mercadopago.com.ar/activities"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              <div>
                <p className="font-semibold">Actividad de Cuenta</p>
                <p className="text-sm text-gray-600">Ve tus transacciones</p>
              </div>
            </a>
            
            <a
              href="https://vendedores.mercadolibre.com.ar/ingresos-mercadopago"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              <div>
                <p className="font-semibold">Balance y Retiros</p>
                <p className="text-sm text-gray-600">Gestiona tu dinero</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
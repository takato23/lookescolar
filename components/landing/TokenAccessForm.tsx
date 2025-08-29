'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { QrCode, ArrowRight, Camera } from 'lucide-react';

interface CodeValidationResponse {
  valid: boolean;
  eventId?: string;
  student?: {
    id: string;
    name: string;
    event: {
      id: string;
      name: string;
    };
  };
  error?: string;
}

export function FamilyAccessForm() {
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const validateAccessCode = async (codeValue: string) => {
    try {
      const response = await fetch(`/api/family/validate-token/${codeValue}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Código no válido');
      }

      const data: CodeValidationResponse = await response.json();

      if (!data.valid || !data.eventId) {
        throw new Error('Código no encontrado. Verifica que esté completo');
      }

      // Redirect to the unified gallery with token as query parameter
      router.push(`/gallery/${data.eventId}?token=${codeValue}`);
    } catch (err) {
      console.error('Error validating access code:', err);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accessCode || accessCode.length < 20) {
      setError('Por favor ingresa un código de acceso válido');
      return;
    }

    setLoading(true);

    try {
      await validateAccessCode(accessCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos encontrar este código. ¿Está correcto?');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = () => {
    // For now, we'll just show an alert that this feature is coming soon
    alert(
      'Escaneo de QR estará disponible pronto. Por ahora, ingresa tu código manualmente.'
    );
  };

  return (
    <div
      className="w-full max-w-md animate-fade-in"
      style={{ animationDelay: '0.4s' }}
    >
      <Card variant="glass-strong" className="noise p-8 backdrop-blur-xl">
        <div className="mb-6 text-center">
          <h3 className="text-foreground text-2xl font-bold">
            Encuentra tus fotos escolares
          </h3>
          <p className="text-muted-foreground mt-2">
            Ingresa el código que recibiste del fotógrafo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="accessCode"
              className="text-foreground text-sm font-medium"
            >
              Código de acceso
            </label>
            <Input
              id="accessCode"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Ej: LES-2024-ABC123XYZ"
              className="w-full"
              aria-describedby="code-help"
              disabled={loading}
            />
            <p id="code-help" className="text-muted-foreground text-xs">
              Revisa el volante o email que recibiste del fotógrafo
            </p>
          </div>

          {error && (
            <div className="bg-error/10 text-error rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="glass"
              onClick={handleQRScan}
              className="flex-1"
              disabled={loading}
              aria-label="Escanear código QR"
            >
              <QrCode className="h-5 w-5" />
              <span className="ml-2">Escanear QR</span>
            </Button>

            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={loading || !accessCode}
              aria-label="Acceder a la galería"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <span>Acceder</span>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6 border-t border-glass-border/50 pt-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-primary-500/10 p-2">
              <Camera className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h4 className="text-foreground font-medium">
                ¿No tienes un código?
              </h4>
              <p className="text-muted-foreground text-sm">
                Contacta con el fotógrafo de tu evento para obtener tu código de acceso.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

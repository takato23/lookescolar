'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { QrCode, ArrowRight, Camera } from 'lucide-react';

interface TokenValidationResponse {
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

export function TokenAccessForm() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const validateToken = async (tokenValue: string) => {
    try {
      const response = await fetch(`/api/family/validate-token/${tokenValue}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token inválido');
      }

      const data: TokenValidationResponse = await response.json();
      
      if (!data.valid || !data.eventId) {
        throw new Error('Token inválido o evento no encontrado');
      }

      // Redirect to the unified gallery with token as query parameter
      router.push(`/gallery/${data.eventId}?token=${tokenValue}`);
    } catch (err) {
      console.error('Error validating token:', err);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!token || token.length < 20) {
      setError('Por favor ingresa un token válido');
      return;
    }

    setLoading(true);
    
    try {
      await validateToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error validando token');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = () => {
    // For now, we'll just show an alert that this feature is coming soon
    alert('Escaneo de QR estará disponible pronto. Por ahora, ingresa tu token manualmente.');
  };

  return (
    <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: '0.4s' }}>
      <Card variant="glass-strong" className="noise p-8 backdrop-blur-xl">
        <div className="mb-6 text-center">
          <h3 className="text-2xl font-bold text-foreground">Accede a tu galería</h3>
          <p className="text-muted-foreground mt-2">
            Ingresa tu token único o escanea el código QR
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="token" className="text-sm font-medium text-foreground">
              Token de acceso
            </label>
            <Input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Pega tu token aquí"
              className="w-full"
              aria-describedby="token-help"
              disabled={loading}
            />
            <p id="token-help" className="text-muted-foreground text-xs">
              Tu token se encuentra en el volante o correo que recibiste
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-error/10 p-3 text-sm text-error">
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
              disabled={loading || !token}
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
              <h4 className="font-medium text-foreground">¿No tienes un token?</h4>
              <p className="text-muted-foreground text-sm">
                Contacta con el fotógrafo de tu evento para obtener acceso.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
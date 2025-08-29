'use client';

import { useState } from 'react';
import { Key, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BrutalistSectionHeader,
  BrutalistText,
  BrutalistLabel,
} from '@/components/ui/brutalist-typography';

interface FamilyAccessSectionProps {
  onAccess?: (token: string) => void;
}

export function FamilyAccessSection({ onAccess }: FamilyAccessSectionProps) {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length < 6) return;

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (onAccess) {
      onAccess(token);
    }

    // Redirect to family gallery where they can view and buy photos
    window.location.href = `/f/${token}`;

    setIsLoading(false);
  };

  return (
    <section className="px-6 py-24">
      <div className="container mx-auto max-w-2xl text-center">
        <div className="mb-12">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center bg-black">
            <Key className="h-10 w-10 text-white" />
          </div>

          <BrutalistSectionHeader className="mb-6">
            ACCESO FAMILIAR
          </BrutalistSectionHeader>

          <BrutalistText className="mb-8 text-gray-600">
            Ingresá tu código para ver las fotos de tu hijo/a
          </BrutalistText>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <BrutalistLabel className="block text-center">
              Código de Acceso
            </BrutalistLabel>

            <Input
              type="text"
              placeholder="ABC123XYZ"
              value={token}
              onChange={(e) => setToken(e.target.value.toUpperCase())}
              className="mx-auto h-16 w-full max-w-sm rounded-none border-2 border-black bg-white px-8 text-center font-mono text-2xl tracking-[0.5em] focus:border-black focus:ring-0"
              maxLength={9}
              required
            />

            <BrutalistText className="text-sm text-gray-500">
              Encontrá tu código en el papel que te dieron en la escuela
            </BrutalistText>
          </div>

          <Button
            type="submit"
            disabled={isLoading || token.length < 6}
            className="group rounded-none border-2 border-black bg-black px-12 py-4 font-mono text-sm uppercase tracking-wider text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                Ver mis fotos
                <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-12 border-t border-gray-200 pt-8">
          <BrutalistText className="mb-4 text-sm text-gray-500">
            ¿No tenés tu código?
          </BrutalistText>
          <Button
            variant="ghost"
            className="font-mono text-xs uppercase tracking-wider hover:underline"
          >
            Consultá en la escuela
          </Button>
        </div>
      </div>
    </section>
  );
}

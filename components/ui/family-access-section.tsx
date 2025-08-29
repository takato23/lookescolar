'use client';

import { useState } from 'react';
import { Key, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrutalistSectionHeader, BrutalistText, BrutalistLabel } from '@/components/ui/brutalist-typography';

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
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (onAccess) {
      onAccess(token);
    }
    
    // Redirect to family gallery where they can view and buy photos
    window.location.href = `/f/${token}`;
    
    setIsLoading(false);
  };

  return (
    <section className="py-24 px-6">
      <div className="container mx-auto max-w-2xl text-center">
        <div className="mb-12">
          <div className="w-20 h-20 mx-auto mb-8 bg-black flex items-center justify-center">
            <Key className="w-10 h-10 text-white" />
          </div>
          
          <BrutalistSectionHeader className="mb-6">
            ACCESO FAMILIAR
          </BrutalistSectionHeader>
          
          <BrutalistText className="text-gray-600 mb-8">
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
              className="w-full max-w-sm mx-auto font-mono text-center text-2xl tracking-[0.5em] border-2 border-black bg-white focus:ring-0 focus:border-black rounded-none h-16 px-8"
              maxLength={9}
              required
            />
            
            <BrutalistText className="text-gray-500 text-sm">
              Encontrá tu código en el papel que te dieron en la escuela
            </BrutalistText>
          </div>
          
          <Button
            type="submit"
            disabled={isLoading || token.length < 6}
            className="bg-black text-white hover:bg-gray-800 font-mono uppercase tracking-wider text-sm px-12 py-4 rounded-none border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Ver mis fotos
                <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>
        
        <div className="mt-12 pt-8 border-t border-gray-200">
          <BrutalistText className="text-gray-500 text-sm mb-4">
            ¿No tenés tu código?
          </BrutalistText>
          <Button
            variant="ghost"
            className="font-mono uppercase tracking-wider text-xs hover:underline"
          >
            Consultá en la escuela
          </Button>
        </div>
      </div>
    </section>
  );
}
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          404 - Página no encontrada
        </h2>
        <p className="text-gray-600 mb-6">
          La página que buscas no existe o ha sido movida.
        </p>
        <Button onClick={() => router.push('/')}>
          <Home className="mr-2 h-4 w-4" />
          Volver al Inicio
        </Button>
      </div>
    </div>
  );
}

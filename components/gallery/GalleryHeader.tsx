'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

interface Event {
  id: string;
  name: string;
  school: string;
  date: string;
  created_at: string;
}

interface GalleryHeaderProps {
  event: Event;
  photoCount: number;
  formattedDate?: string;
}

export function GalleryHeader({ event, photoCount, formattedDate }: GalleryHeaderProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [token, setToken] = useState('');
  const router = useRouter();

  // Evitar toLocaleDateString en servidor para no causar hydration mismatch.
  // Si viene `formattedDate` desde el server, usar ese string directamente.

  const handleShare = async (platform: 'whatsapp' | 'email' | 'copy') => {
    const url = window.location.href;
    const title = `Fotos del evento "${event.name}" en ${event.school}`;
    const text = `¡Mira las fotos profesionales del evento "${event.name}"! ${photoCount} fotos disponibles.`;

    switch (platform) {
      case 'whatsapp':
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
        window.open(whatsappUrl, '_blank');
        break;

      case 'email':
        const emailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\nVer galería: ${url}`)}`;
        window.open(emailUrl);
        break;

      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          // You might want to show a toast here
          alert('Link copiado al portapapeles!');
        } catch (err) {
          console.error('Error copying to clipboard:', err);
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = url;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert('Link copiado al portapapeles!');
        }
        break;
    }

    setShowShareMenu(false);
  };

  return (
    <div className="space-y-8 text-center">
      {/* Main header */}
      <div className="space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
          <span className="text-2xl text-white">📸</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight text-gray-900 md:text-4xl lg:text-5xl">
            {event.name}
          </h1>
          <p className="text-lg text-gray-600 md:text-xl">
            {event.school}
          </p>
          <p className="text-base text-gray-500">{formattedDate ?? event.date}</p>
        </div>
      </div>

      {/* Stats and actions */}
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
        {/* Photo count badge */}
        <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50/80 px-4 py-2 shadow-sm">
          <span className="text-sm font-medium text-gray-700">
            {photoCount}{' '}
            {photoCount === 1 ? 'foto disponible' : 'fotos disponibles'}
          </span>
        </div>

        {/* Ver mis fotos (familias) */}
        <Button
          onClick={() => setOpenDialog(true)}
          className="rounded-full bg-indigo-600 text-white shadow-sm transition-colors hover:bg-indigo-700"
          aria-label="Abrir diálogo para ver mis fotos"
        >
          Ver mis fotos
        </Button>

        {/* Share button */}
        <div className="relative">
          <Button
            onClick={() => setShowShareMenu(!showShareMenu)}
            variant="outline"
            className="inline-flex items-center rounded-full border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50"
          >
            <span className="mr-2">📤</span>
            Compartir galería
          </Button>

          {/* Share menu */}
          {showShareMenu && (
            <div className="absolute right-0 top-full z-10 mt-2 min-w-[220px] rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
              <button
                onClick={() => handleShare('whatsapp')}
                className="flex w-full items-center space-x-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="text-green-500">💬</span>
                <span>Compartir por WhatsApp</span>
              </button>
              <button
                onClick={() => handleShare('email')}
                className="flex w-full items-center space-x-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="text-blue-500">📧</span>
                <span>Compartir por Email</span>
              </button>
              <button
                onClick={() => handleShare('copy')}
                className="flex w-full items-center space-x-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="text-gray-500">📋</span>
                <span>Copiar enlace</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Photographer branding */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
              <span className="text-lg font-semibold text-white">M</span>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">
                Melisa - Look Escolar
              </h3>
              <p className="text-sm text-gray-600">
                Fotografía Profesional
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 text-sm sm:flex-row">
            <span className="text-gray-600">¿Te gustan las fotos?</span>
            <a
              href="#contacto"
              className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <span className="mr-1">💬</span>
              Contactar
            </a>
          </div>
        </div>
      </div>

      {/* Dialog para token de familia */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent aria-label="Ingresar token de familia" aria-describedby="token-desc">
          <DialogHeader>
            <DialogTitle>Ver mis fotos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p id="token-desc" className="text-sm text-gray-600">
              Ingresa tu token privado para acceder a tu galería familiar.
            </p>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Pega tu token aquí"
              aria-label="Token privado"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpenDialog(false)}
                aria-label="Cancelar"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!token || token.length < 20) return;
                  router.push(`/f/${token}`);
                }}
                aria-label="Ir a mi galería"
              >
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Click outside handler for share menu */}
      {showShareMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowShareMenu(false)}
        />
      )}
    </div>
  );
}

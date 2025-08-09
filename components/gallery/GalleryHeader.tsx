'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

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
}

export function GalleryHeader({ event, photoCount }: GalleryHeaderProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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
    <div className="space-y-6 text-center">
      {/* Main header */}
      <div className="space-y-4">
        <div className="shadow-3d inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500">
          <span className="text-3xl text-white">📸</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-display text-foreground text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
            {event.name}
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl">
            📍 {event.school}
          </p>
          <p className="text-muted-foreground">📅 {formatDate(event.date)}</p>
        </div>
      </div>

      {/* Stats and actions */}
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
        {/* Photo count badge */}
        <div className="glass-card border-primary/30 from-primary/10 to-secondary/10 text-foreground shadow-3d-sm inline-flex items-center rounded-full border bg-gradient-to-r px-4 py-2">
          <span className="text-sm font-medium">
            {photoCount}{' '}
            {photoCount === 1 ? 'foto disponible' : 'fotos disponibles'}
          </span>
        </div>

        {/* Share button */}
        <div className="relative">
          <Button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="text-foreground shadow-3d-sm hover:shadow-3d inline-flex items-center rounded-full border border-white/20 bg-white/70 px-4 py-2 backdrop-blur-md transition-all duration-200 hover:-translate-y-[1px]"
          >
            <span className="mr-2">📤</span>
            Compartir galería
          </Button>

          {/* Share menu */}
          {showShareMenu && (
            <div className="glass-ultra shadow-3d absolute right-0 top-full z-10 mt-2 min-w-[220px] rounded-xl border border-white/10 py-2 ring-1 ring-white/10 backdrop-blur-2xl">
              <button
                onClick={() => handleShare('whatsapp')}
                className="hover:bg-accent/10 flex w-full items-center space-x-3 px-4 py-2 text-left text-sm"
              >
                <span className="text-green-500">💬</span>
                <span>Compartir por WhatsApp</span>
              </button>
              <button
                onClick={() => handleShare('email')}
                className="hover:bg-accent/10 flex w-full items-center space-x-3 px-4 py-2 text-left text-sm"
              >
                <span className="text-blue-500">📧</span>
                <span>Compartir por Email</span>
              </button>
              <button
                onClick={() => handleShare('copy')}
                className="hover:bg-accent/10 flex w-full items-center space-x-3 px-4 py-2 text-left text-sm"
              >
                <span className="text-gray-500">📋</span>
                <span>Copiar enlace</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Photographer branding */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-purple-50/50 to-pink-50/30 p-6 backdrop-blur-sm dark:from-neutral-800/40 dark:to-neutral-800/20">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center space-x-4">
            <div className="shadow-3d-sm flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <span className="text-lg font-semibold text-white">M</span>
            </div>
            <div className="text-left">
              <h3 className="text-foreground font-semibold">
                Melisa - Look Escolar
              </h3>
              <p className="text-muted-foreground text-sm">
                Fotografía Profesional
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 text-sm sm:flex-row">
            <span className="text-muted-foreground">¿Te gustan las fotos?</span>
            <a
              href="#contacto"
              className="shadow-3d-sm hover:shadow-3d inline-flex items-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 font-medium text-white transition-all duration-200 hover:-translate-y-[1px] hover:from-purple-600 hover:to-pink-600"
            >
              <span className="mr-1">💬</span>
              Contactar
            </a>
          </div>
        </div>
      </div>

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

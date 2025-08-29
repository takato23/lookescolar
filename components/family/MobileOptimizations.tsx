'use client';

import { useEffect, useState } from 'react';

interface MobileOptimizationsProps {
  children: React.ReactNode;
}

export function MobileOptimizations({ children }: MobileOptimizationsProps) {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [viewportHeight, setViewportHeight] = useState('100vh');

  useEffect(() => {
    // Detectar iOS
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isiOS);

    // Detectar standalone mode (PWA instalada)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Configurar viewport height dinámico para móviles
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      setViewportHeight(`${window.innerHeight}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    // Prevenir zoom en doble tap en iOS
    if (isiOS) {
      let lastTouchEnd = 0;
      document.addEventListener(
        'touchend',
        (event) => {
          const now = new Date().getTime();
          if (now - lastTouchEnd <= 300) {
            event.preventDefault();
          }
          lastTouchEnd = now;
        },
        false
      );
    }

    // Prevenir scroll de rebote en iOS
    document.addEventListener(
      'touchmove',
      (event) => {
        if (event.scale !== 1) {
          event.preventDefault();
        }
      },
      { passive: false }
    );

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  useEffect(() => {
    // Configurar meta tags dinámicos
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
      // Accesibilidad: permitir zoom del usuario y respetar tamaño del dispositivo
      metaViewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1'
      );
    }

    // Apple touch icon para iOS
    if (isIOS) {
      let appleTouchIcon = document.querySelector(
        'link[rel="apple-touch-icon"]'
      );
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement('link');
        appleTouchIcon.setAttribute('rel', 'apple-touch-icon');
        appleTouchIcon.setAttribute('href', '/icon-192x192.png');
        document.head.appendChild(appleTouchIcon);
      }

      // Apple mobile web app meta tags
      const metas = [
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'LookEscolar' },
      ];

      metas.forEach(({ name, content }) => {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', name);
          meta.setAttribute('content', content);
          document.head.appendChild(meta);
        }
      });
    }
  }, [isIOS]);

  return (
    <div
      className={`min-h-screen ${isStandalone ? 'pb-safe-area-inset-bottom' : ''}`}
      style={{
        minHeight: viewportHeight,
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Safe area spacing para dispositivos con notch */}
      {isStandalone && (
        <div className="h-safe-area-inset-top bg-gradient-to-r from-purple-500 to-pink-500" />
      )}

      <div className={`${isStandalone ? 'pb-safe-area-inset-bottom' : ''}`}>
        {children}
      </div>

      {/* Estilos inline para optimizaciones específicas */}
      <style jsx>{`
        :global(html) {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        :global(body) {
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch;
        }

        /* Prevenir selección accidental en móviles */
        :global(.no-select) {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        /* Botones optimizados para touch */
        :global(button, .btn) {
          min-height: 44px;
          min-width: 44px;
          touch-action: manipulation;
        }

        /* Inputs optimizados para móvil */
        :global(input, textarea, select) {
          font-size: 16px; /* Prevenir zoom en iOS */
        }

        /* Scrollbars personalizados para webkit */
        :global(.scrollbar-thin) {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
        }

        :global(.scrollbar-thin::-webkit-scrollbar) {
          width: 6px;
        }

        :global(.scrollbar-thin::-webkit-scrollbar-track) {
          background: transparent;
        }

        :global(.scrollbar-thin::-webkit-scrollbar-thumb) {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
        }

        /* Safe area insets para dispositivos con notch */
        :global(.pb-safe-area-inset-bottom) {
          padding-bottom: env(safe-area-inset-bottom);
        }

        :global(.pt-safe-area-inset-top) {
          padding-top: env(safe-area-inset-top);
        }

        :global(.h-safe-area-inset-top) {
          height: env(safe-area-inset-top);
        }

        /* Animations optimizadas para rendimiento */
        :global(.gpu-accelerated) {
          transform: translateZ(0);
          will-change: transform;
        }

        /* Pull-to-refresh prevention */
        :global(.prevent-pull-refresh) {
          overscroll-behavior-y: contain;
        }

        /* Focus styles mejorados para accesibilidad */
        :global(.focus-visible:focus-visible) {
          outline: 2px solid #8b5cf6;
          outline-offset: 2px;
        }

        /* Media queries para safe areas */
        @supports (padding: max(0px)) {
          :global(.safe-area-padding) {
            padding-left: max(16px, env(safe-area-inset-left));
            padding-right: max(16px, env(safe-area-inset-right));
          }
        }
      `}</style>
    </div>
  );
}

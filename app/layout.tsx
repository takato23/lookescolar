import type { Metadata, Viewport } from 'next';
import {
  Bricolage_Grotesque as BricolageGrotesque,
  Manrope,
} from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from 'sonner';
import './globals.css';
import { SkipToContent } from '@/components/ui/accessible';
import { WebVitalsTracker } from '@/components/performance/WebVitalsTracker';
import '@/lib/utils/message-channel-error-handler';
// Force rebuild

const NOISE_TEXTURE_FALLBACK =
  'url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noiseFilter%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.65%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noiseFilter)%27/%3E%3C/svg%3E")';

const display = BricolageGrotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});

const body = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: 'Lumina | Tu negocio de fotografía, simplificado',
  description:
    'La plataforma todo en uno para fotógrafos profesionales. Galerías privadas, venta de fotos, pagos automatizados y distribución física o digital.',
  keywords: 'fotografía escolar, fotos escolares, venta de fotos, Argentina',
  authors: [{ name: 'Melisa Fotografía' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

// Disable static optimization to prevent Next.js 15 prerendering issues
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Preconnect to critical origins for faster resource loading */}
        <link rel="preconnect" href="https://sdk.mercadopago.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://exaighpowgvbdappydyx.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://sdk.mercadopago.com" />
        <link rel="dns-prefetch" href="https://exaighpowgvbdappydyx.supabase.co" />

        {/* Mercado Pago SDK */}
        <script src="https://sdk.mercadopago.com/js/v2" async></script>
        {/* Forzar limpieza de SW/caché en dev si quedó algo colgado */}
        {process.env.NODE_ENV === 'development' && (
          <script src="/disable-sw.js" defer></script>
        )}
      </head>
      <body
        className={`${body.className} ${display.variable} ${body.variable} min-h-screen antialiased`}
      >
        <QueryProvider>
          <ThemeProvider defaultTheme="system" storageKey="lookescolar-theme">
            {/* Skip link for keyboard/reader users */}
            <SkipToContent targetId="main-content" />

            {/* Content wrapper */}
            <div className="relative z-10 min-h-screen">
              {/* Anchor for skip link */}
              <div id="main-content" tabIndex={-1} />
              {children}
            </div>
            <Toaster richColors position="top-right" />
            <div
              aria-hidden="true"
              className="liquid-noise-overlay"
              style={{
                backgroundImage: `var(--liquid-noise-texture, ${NOISE_TEXTURE_FALLBACK})`,
              }}
            />
            {/* Web Vitals Performance Tracking */}
            <WebVitalsTracker />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

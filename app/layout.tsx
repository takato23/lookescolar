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
import '@/lib/utils/message-channel-error-handler';

const NOISE_TEXTURE_FALLBACK =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")";

const display = BricolageGrotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

const body = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
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
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

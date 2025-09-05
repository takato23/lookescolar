import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from 'sonner';
import './globals.css';
import { SkipToContent } from '@/components/ui/accessible';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LookEscolar - Fotografía Escolar Digital',
  description: 'Sistema de gestión y venta de fotografías escolares',
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
      <body className={`${inter.className} min-h-screen antialiased`}>
        <QueryProvider>
          <ThemeProvider defaultTheme="system" storageKey="lookescolar-theme">
            {/* Skip link for keyboard/reader users */}
            <SkipToContent targetId="main-content" />
            {/* Enhanced gradient background with iOS 26 liquid glass effect */}
            <div className="fixed inset-0 bg-gradient-to-br from-purple-50/50 via-pink-50/50 to-blue-50/50 transition-colors duration-300 dark:from-purple-950/20 dark:via-purple-900/10 dark:to-blue-950/20" />
            <div className="gradient-mesh fixed inset-0 opacity-30 transition-opacity duration-300 dark:opacity-20" />

            {/* iOS 26 Liquid Glass Background */}
            <div className="liquid-glass-container fixed inset-0 -z-10 opacity-70 dark:opacity-50" />

            {/* Content wrapper with enhanced liquid glass background */}
            <div className="liquid-glass-card relative z-10 min-h-screen backdrop-blur-sm">
              {/* Anchor for skip link */}
              <div id="main-content" tabIndex={-1} />
              {children}
            </div>
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

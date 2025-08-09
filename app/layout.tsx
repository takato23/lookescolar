import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from 'sonner';
import './globals.css';

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
    <html lang="es" suppressHydrationWarning>
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
            {/* Dynamic gradient background that responds to theme */}
            <div className="fixed inset-0 bg-gradient-to-br from-purple-50/50 via-pink-50/50 to-blue-50/50 transition-colors duration-300 dark:from-purple-950/20 dark:via-purple-900/10 dark:to-blue-950/20" />
            <div className="gradient-mesh fixed inset-0 opacity-30 transition-opacity duration-300 dark:opacity-20" />

            {/* Content wrapper with theme-aware background */}
            <div className="bg-background/50 dark:bg-background/80 relative z-10 min-h-screen backdrop-blur-[2px]">
              {children}
            </div>
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

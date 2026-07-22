import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PWARegister from '@/components/PWARegister';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { getUsuarioConRol } from '@/lib/supabase/server';

export const metadata: Metadata = {
  metadataBase: new URL('https://hidelgarda.com.ar'),
  applicationName: 'Hidelgarda',
  title: 'RESTO PRESTA BINGEN ALL - Comida es Medicina',
  description: 'Cocina hildegardiana. Pedidos anticipados con 10 días.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Hidelgarda',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#b45309',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioConRol();

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <ThemeProvider>
          <PWARegister />
          <div className="min-h-screen flex flex-col">
            <SiteHeader usuario={usuario} />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}

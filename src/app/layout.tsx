import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { getUsuarioConRol } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'RESTO PRESTA BINGEN ALL - Comida es Medicina',
  description: 'Cocina hildegardiana. Pedidos anticipados con 10 días.',
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
          <div className="min-h-screen flex flex-col">
            <SiteHeader usuario={usuario} />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

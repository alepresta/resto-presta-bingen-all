import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RESTO PRESTA BINGEN ALL - Comida es Medicina',
  description: 'Cocina hildegardiana. Pedidos anticipados con 10 días.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

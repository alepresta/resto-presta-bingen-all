#!/bin/bash
set -e

echo "🌿 Instalando RESTO PRESTA BINGEN ALL..."

# ============================================
# 1. ESTRUCTURA DE CARPETAS
# ============================================
mkdir -p public/images
mkdir -p "src/app/(public)/menu/[slug]"
mkdir -p "src/app/(public)/pedido/[id]"
mkdir -p src/app/\(public\)/login
mkdir -p src/app/\(public\)/registro
mkdir -p src/app/\(admin\)/admin/pedidos
mkdir -p src/app/\(admin\)/admin/platos
mkdir -p src/app/\(admin\)/admin/clientes
mkdir -p src/app/\(admin\)/admin/configuracion
mkdir -p "src/app/api/menu/[slug]"
mkdir -p "src/app/api/menu/dia/[dia]"
mkdir -p "src/app/api/pedidos/[id]"
mkdir -p src/app/api/pago/crear
mkdir -p src/app/api/pago/webhook
mkdir -p "src/app/api/auth/[...nextauth]"
mkdir -p src/components/ui
mkdir -p src/lib
mkdir -p src/types
mkdir -p supabase/migrations
mkdir -p scripts

echo "📁 Estructura creada"

# ============================================
# 2. ARCHIVOS DE CONFIGURACIÓN
# ============================================

# package.json
cat > package.json << 'EOF'
{
  "name": "resto-presta-bingen-all",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "seed": "tsx scripts/seed.ts",
    "qr": "tsx scripts/generate-qr.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.1.0",
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next-auth": "^4.24.5",
    "date-fns": "^3.0.6",
    "mercadopago": "^2.0.0",
    "qrcode": "^1.5.3",
    "zod": "^3.22.4",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/qrcode": "^1.5.5",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "tsx": "^4.7.0"
  }
}
EOF

# tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# next.config.js
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};
module.exports = nextConfig;
EOF

# tailwind.config.ts
cat > tailwind.config.ts << 'EOF'
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        hildegard: {
          amber: '#D97706',
          green: '#059669',
          brown: '#92400E',
          cream: '#FEF3C7',
          gold: '#B45309',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
EOF

# postcss.config.js
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
EOF

# .env.local.example
cat > .env.local.example << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=cambia_esto_por_un_secreto_largo_y_aleatorio

# MercadoPago
MP_ACCESS_TOKEN=tu_access_token
MP_PUBLIC_KEY=tu_public_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SLUG=resto-presta-bingen-all
EOF

# .gitignore
cat > .gitignore << 'EOF'
node_modules
.next
.env.local
.env*.local
.DS_Store
*.tsbuildinfo
next-env.d.ts
public/qrs
EOF

echo "⚙️  Archivos de configuración creados"

# ============================================
# 3. TIPOS
# ============================================
cat > src/types/index.ts << 'EOF'
export interface Restaurante {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  logo?: string;
  tagline?: string;
  tema?: any;
  horario_apertura?: string;
  horario_cierre?: string;
  telefono?: string;
  direccion?: string;
  instagram?: string;
  email?: string;
}

export interface Plato {
  id: string;
  restaurante_id: string;
  categoria_id: number;
  dia_semana_id?: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen?: string;
  alergenos?: string[];
  tags?: string[];
  disponible: boolean;
  orden: number;
  es_estrella: boolean;
  disponible_todos_dias: boolean;
  propiedades_hildegardianas?: string;
  receta?: Receta;
}

export interface Receta {
  id: string;
  plato_id: string;
  ingredientes: { nombre: string; cantidad: number; unidad: string }[];
  pasos: string[];
  tiempo_min?: number;
  porciones?: number;
  dificultad?: 'fácil' | 'media' | 'difícil';
  notas_hildegardianas?: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  icono?: string;
  orden: number;
  disponible_todos_dias: boolean;
  horario_inicio?: string;
  horario_fin?: string;
}

export interface Cliente {
  id: string;
  user_id?: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  barrio?: string;
  ciudad?: string;
  notas?: string;
  es_vip: boolean;
  total_pedidos: number;
}

export type EstadoPedido = 
  | 'pendiente_pago'
  | 'confirmado'
  | 'en_preparacion'
  | 'listo'
  | 'entregado'
  | 'cancelado';

export interface Pedido {
  id: string;
  cliente_id: string;
  fecha_entrega: string;
  horario_entrega: string;
  tipo_entrega: 'domicilio' | 'retiro';
  direccion_entrega?: string;
  estado: EstadoPedido;
  subtotal: number;
  costo_envio: number;
  descuento: number;
  total: number;
  metodo_pago?: 'transferencia' | 'mercadopago' | 'efectivo';
  pago_confirmado: boolean;
  pago_referencia?: string;
  notas_cliente?: string;
  notas_admin?: string;
  modificado_admin: boolean;
  fecha_modificacion?: string;
  motivo_modificacion?: string;
  created_at: string;
  cliente?: Cliente;
  items?: PedidoItem[];
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  plato_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  notas?: string;
  plato?: Plato;
}
EOF

echo "📝 Tipos creados"

# ============================================
# 4. LIBRERÍAS
# ============================================
cat > src/lib/supabase.ts << 'EOF'
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
EOF

cat > src/lib/supabase-server.ts << 'EOF'
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

export function createServiceClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
EOF

cat > src/lib/validaciones.ts << 'EOF'
import { differenceInDays, addDays, isBefore, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from './supabase';

export interface ValidacionFecha {
  valido: boolean;
  mensaje: string;
  diasFaltantes?: number;
}

export function validarFechaEntrega(fechaEntrega: string): ValidacionFecha {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const fecha = parseISO(fechaEntrega);
  const diasMinimos = 10;
  
  if (isBefore(fecha, hoy)) {
    return {
      valido: false,
      mensaje: 'La fecha de entrega no puede ser anterior a hoy'
    };
  }
  
  const diasDiferencia = differenceInDays(fecha, hoy);
  
  if (diasDiferencia < diasMinimos) {
    const diasFaltantes = diasMinimos - diasDiferencia;
    return {
      valido: false,
      mensaje: 'Se requieren al menos ' + diasMinimos + ' días de anticipación. Faltan ' + diasFaltantes + ' días.',
      diasFaltantes
    };
  }
  
  return {
    valido: true,
    mensaje: '✅ Fecha válida. Entrega en ' + diasDiferencia + ' días (' + format(fecha, "EEEE dd 'de' MMMM", { locale: es }) + ')',
    diasFaltantes: diasDiferencia
  };
}

export async function verificarCapacidad(fechaEntrega: string) {
  const supabase = createClient();
  
  let { data: capacidad } = await supabase
    .from('capacidad_diaria')
    .select('*')
    .eq('fecha', fechaEntrega)
    .single();
  
  if (!capacidad) {
    const { data: nueva } = await supabase
      .from('capacidad_diaria')
      .insert({ fecha: fechaEntrega, capacidad_maxima: 50 })
      .select()
      .single();
    capacidad = nueva;
  }
  
  const lugaresDisponibles = capacidad.capacidad_maxima - 
    (capacidad.pedidos_confirmados + capacidad.pedidos_pendientes);
  
  return {
    disponible: lugaresDisponibles > 0,
    pedidosActuales: capacidad.pedidos_confirmados + capacidad.pedidos_pendientes,
    capacidadMaxima: capacidad.capacidad_maxima,
    lugaresDisponibles
  };
}

export function getFechaMinimaEntrega(): string {
  const hoy = new Date();
  const fechaMinima = addDays(hoy, 10);
  return fechaMinima.toISOString().split('T')[0];
}

export function getFechaMaximaEntrega(): string {
  const hoy = new Date();
  const fechaMaxima = addDays(hoy, 60);
  return fechaMaxima.toISOString().split('T')[0];
}
EOF

cat > src/lib/utils.ts << 'EOF'
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrecio(precio: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(precio);
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
EOF

echo "📚 Librerías creadas"

# ============================================
# 5. LAYOUT Y ESTILOS GLOBALES
# ============================================
cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
  title: 'RESTO PRESTA BINGEN ALL - Comida es Medicina',
  description: 'Cocina hildegardiana. Pedidos anticipados con 10 días. Espelta, hierbas medicinales y viriditas.',
  keywords: ['hildegarda de bingen', 'comida es medicina', 'espelta', 'viriditas', 'restaurante saludable'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.variable + ' ' + playfair.variable + ' font-sans antialiased'}>
        {children}
      </body>
    </html>
  );
}
EOF

cat > src/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gradient-to-b from-amber-50 to-orange-50 text-gray-900;
  }
}

@layer components {
  .btn-primary {
    @apply bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105;
  }
  
  .btn-secondary {
    @apply bg-white text-amber-700 font-semibold py-3 px-6 rounded-xl border-2 border-amber-300 hover:border-amber-500 transition-all;
  }
  
  .card {
    @apply bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow;
  }
}
EOF

echo "🎨 Layout y estilos creados"

# ============================================
# 6. PÁGINA PRINCIPAL
# ============================================
cat > "src/app/(public)/page.tsx" << 'EOF'
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-br from-amber-700 via-amber-600 to-orange-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">🌿</div>
          <h1 className="text-5xl md:text-6xl font-bold font-serif mb-4">
            RESTO PRESTA BINGEN ALL
          </h1>
          <p className="text-2xl italic text-amber-100 mb-2">
            &ldquo;Comida es Medicina&rdquo;
          </p>
          <p className="text-lg opacity-90 mb-8">
            Cocina hildegardiana • Pedidos anticipados
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/menu/resto-presta-bingen-all" className="btn-primary">
              🍽️ Ver Menú
            </Link>
            <Link href="/pedido" className="btn-secondary">
              📅 Hacer Pedido
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-bold mb-2">10 Días de Anticipación</h3>
            <p className="text-gray-600">
              Pedidos exclusivos con preparación artesanal y consciente
            </p>
          </div>
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">🌾</div>
            <h3 className="text-xl font-bold mb-2">Espelta Sagrada</h3>
            <p className="text-gray-600">
              El grano sagrado de Hildegarda en cada preparación
            </p>
          </div>
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">🌿</div>
            <h3 className="text-xl font-bold mb-2">Hierbas Medicinales</h3>
            <p className="text-gray-600">
              Cada plato con propiedades curativas específicas
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-green-50 to-amber-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold font-serif mb-6">Viriditas</h2>
          <p className="text-xl text-gray-700 leading-relaxed">
            La fuerza vital verde que Hildegarda describía como el poder sanador 
            de la naturaleza. Cada plato está preparado con <strong>espelta</strong>, 
            <strong> hierbas medicinales</strong> y <strong>ingredientes de estación</strong> 
            para nutrir cuerpo y alma.
          </p>
        </div>
      </section>

      <footer className="bg-amber-900 text-amber-100 py-8 text-center">
        <p className="font-serif text-xl mb-2">RESTO PRESTA BINGEN ALL</p>
        <p className="italic">&ldquo;Comida es Medicina&rdquo;</p>
        <p className="text-sm mt-4 opacity-75">
          Basado en las revelaciones de Santa Hildegarda de Bingen (1098-1179)
        </p>
      </footer>
    </div>
  );
}
EOF

echo "🏠 Página principal creada"

echo ""
echo "✅ Estructura base creada exitosamente!"
echo ""
echo "📦 Ahora ejecutá:"
echo "   npm install"
echo ""
echo "⚠️  Los archivos restantes (API routes, páginas de pedido, admin, scripts)"
echo "   los vamos a crear en el siguiente paso."

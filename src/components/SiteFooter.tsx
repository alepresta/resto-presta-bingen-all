import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="bg-amber-900 text-amber-100 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <p className="font-serif text-xl mb-1">RESTO PRESTA BINGEN ALL</p>
        <p className="italic text-sm">&ldquo;Comida es Medicina&rdquo;</p>
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
          <Link href="/menu/resto-presta-bingen-all" className="hover:underline">
            Menú
          </Link>
          <Link href="/inicio" className="hover:underline">
            Pedidos grupales
          </Link>
        </div>
        <p className="text-xs mt-4 opacity-75">
          Basado en las revelaciones de Santa Hildegarda de Bingen (1098-1179)
        </p>
      </div>
    </footer>
  );
}

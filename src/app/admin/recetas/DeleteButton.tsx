'use client';

import { useRouter } from 'next/navigation';

export default function DeleteButton({ recetaId }: { recetaId: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar esta receta?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/recetas/${recetaId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Error al eliminar');
      }

      // Recargar la página para ver los cambios
      router.refresh();
    } catch (error) {
      alert('Error al eliminar la receta');
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-semibold text-sm"
    >
      🗑️ Eliminar
    </button>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIAS = [
  { id: 'verduras', icono: '🥕', nombre: 'Verduras' },
  { id: 'frutas', icono: '🍎', nombre: 'Frutas' },
  { id: 'carnes', icono: '🥩', nombre: 'Carnes' },
  { id: 'pescados', icono: '🐟', nombre: 'Pescados' },
  { id: 'lacteos', icono: '', nombre: 'Lácteos' },
  { id: 'granos', icono: '🌾', nombre: 'Granos' },
  { id: 'legumbres', icono: '🫘', nombre: 'Legumbres' },
  { id: 'condimentos', icono: '🧂', nombre: 'Condimentos' },
  { id: 'aceites', icono: '🫒', nombre: 'Aceites' },
  { id: 'bebidas', icono: '🥤', nombre: 'Bebidas' },
  { id: 'hierbas', icono: '🌿', nombre: 'Hierbas' },
  { id: 'especias', icono: '🌶️', nombre: 'Especias' },
  { id: 'endulzantes', icono: '🍯', nombre: 'Endulzantes' },
  { id: 'frutos_secos', icono: '', nombre: 'Frutos Secos' },
  { id: 'otros', icono: '📦', nombre: 'Otros' },
];

const TEMPERAMENTOS = [
  { id: 'calido', nombre: 'Cálido' },
  { id: 'frio', nombre: 'Frío' },
  { id: 'humedo', nombre: 'Húmedo' },
  { id: 'seco', nombre: 'Seco' },
  { id: 'calido_seco', nombre: 'Cálido y Seco' },
  { id: 'calido_humedo', nombre: 'Cálido y Húmedo' },
  { id: 'frio_seco', nombre: 'Frío y Seco' },
  { id: 'frio_humedo', nombre: 'Frío y Húmedo' },
];

export default function NuevoIngredientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [form, setForm] = useState({
    nombre: '',
    nombre_cientifico: '',
    categoria: 'verduras',
    unidad_base: 'gramos',
    calorias: '',
    proteinas_g: '',
    carbohidratos_g: '',
    grasas_g: '',
    grasas_saturadas_g: '',
    fibra_g: '',
    azucar_g: '',
    sodio_mg: '',
    calcio_mg: '',
    hierro_mg: '',
    magnesio_mg: '',
    potasio_mg: '',
    zinc_mg: '',
    vitamina_a_mcg: '',
    vitamina_c_mg: '',
    vitamina_d_mcg: '',
    vitamina_b12_mcg: '',
    propiedades_hildegardianas: '',
    temperamento: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMensaje('');

    try {
      const res = await fetch('/api/admin/ingredientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          calorias: form.calorias ? parseFloat(form.calorias) : null,
          proteinas_g: form.proteinas_g ? parseFloat(form.proteinas_g) : null,
          carbohidratos_g: form.carbohidratos_g ? parseFloat(form.carbohidratos_g) : null,
          grasas_g: form.grasas_g ? parseFloat(form.grasas_g) : null,
          grasas_saturadas_g: form.grasas_saturadas_g ? parseFloat(form.grasas_saturadas_g) : null,
          fibra_g: form.fibra_g ? parseFloat(form.fibra_g) : null,
          azucar_g: form.azucar_g ? parseFloat(form.azucar_g) : null,
          sodio_mg: form.sodio_mg ? parseFloat(form.sodio_mg) : null,
          calcio_mg: form.calcio_mg ? parseFloat(form.calcio_mg) : null,
          hierro_mg: form.hierro_mg ? parseFloat(form.hierro_mg) : null,
          magnesio_mg: form.magnesio_mg ? parseFloat(form.magnesio_mg) : null,
          potasio_mg: form.potasio_mg ? parseFloat(form.potasio_mg) : null,
          zinc_mg: form.zinc_mg ? parseFloat(form.zinc_mg) : null,
          vitamina_a_mcg: form.vitamina_a_mcg ? parseFloat(form.vitamina_a_mcg) : null,
          vitamina_c_mg: form.vitamina_c_mg ? parseFloat(form.vitamina_c_mg) : null,
          vitamina_d_mcg: form.vitamina_d_mcg ? parseFloat(form.vitamina_d_mcg) : null,
          vitamina_b12_mcg: form.vitamina_b12_mcg ? parseFloat(form.vitamina_b12_mcg) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear');

      setMensaje('✅ Ingrediente creado exitosamente');
      setTimeout(() => router.push('/admin/ingredientes'), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-green-700 to-emerald-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">➕ Nuevo Ingrediente</h1>
            <p className="text-green-100 text-sm">Agregar al catálogo maestro</p>
          </div>
          <button
            onClick={() => router.push('/admin/ingredientes')}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            ← Volver
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}
        {mensaje && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {mensaje}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
          {/* Datos básicos */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">📋 Datos Básicos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: Zanahoria"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre Científico
                </label>
                <input
                  type="text"
                  name="nombre_cientifico"
                  value={form.nombre_cientifico}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: Daucus carota"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Categoría *
                </label>
                <select
                  name="categoria"
                  value={form.categoria}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icono} {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Unidad Base
                </label>
                <select
                  name="unidad_base"
                  value={form.unidad_base}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="gramos">Gramos</option>
                  <option value="ml">Mililitros</option>
                  <option value="unidades">Unidades</option>
                </select>
              </div>
            </div>
          </div>

          {/* Macros */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">🔬 Macronutrientes (por 100g)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'calorias', label: 'Calorías (kcal)', icono: '🔥' },
                { name: 'proteinas_g', label: 'Proteínas (g)', icono: '' },
                { name: 'carbohidratos_g', label: 'Carbohidratos (g)', icono: '🍞' },
                { name: 'grasas_g', label: 'Grasas (g)', icono: '🥑' },
                { name: 'grasas_saturadas_g', label: 'Grasas Sat. (g)', icono: '🧈' },
                { name: 'fibra_g', label: 'Fibra (g)', icono: '🌾' },
                { name: 'azucar_g', label: 'Azúcar (g)', icono: '' },
                { name: 'sodio_mg', label: 'Sodio (mg)', icono: '🧂' },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {field.icono} {field.label}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name={field.name}
                    value={form[field.name as keyof typeof form]}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Minerales */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">⚗️ Minerales (mg por 100g)</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { name: 'calcio_mg', label: 'Calcio' },
                { name: 'hierro_mg', label: 'Hierro' },
                { name: 'magnesio_mg', label: 'Magnesio' },
                { name: 'potasio_mg', label: 'Potasio' },
                { name: 'zinc_mg', label: 'Zinc' },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {field.label} (mg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name={field.name}
                    value={form[field.name as keyof typeof form]}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Vitaminas */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">💊 Vitaminas (por 100g)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'vitamina_a_mcg', label: 'Vitamina A (mcg)' },
                { name: 'vitamina_c_mg', label: 'Vitamina C (mg)' },
                { name: 'vitamina_d_mcg', label: 'Vitamina D (mcg)' },
                { name: 'vitamina_b12_mcg', label: 'Vitamina B12 (mcg)' },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name={field.name}
                    value={form[field.name as keyof typeof form]}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Hildegarda */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">✨ Sabiduría Hildegardiana</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Temperamento
                </label>
                <select
                  name="temperamento"
                  value={form.temperamento}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Seleccionar --</option>
                  {TEMPERAMENTOS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Propiedades Hildegardianas
                </label>
                <textarea
                  name="propiedades_hildegardianas"
                  value={form.propiedades_hildegardianas}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: Calienta el estómago, ayuda a la digestión..."
                />
              </div>
            </div>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Guardando...' : '💾 Guardar Ingrediente'}
          </button>
        </form>
      </main>
    </div>
  );
}

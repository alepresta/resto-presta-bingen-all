'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

const CATEGORIAS = [
  { id: 'verduras', icono: '🥕', nombre: 'Verduras' },
  { id: 'frutas', icono: '🍎', nombre: 'Frutas' },
  { id: 'carnes', icono: '', nombre: 'Carnes' },
  { id: 'pescados', icono: '🐟', nombre: 'Pescados' },
  { id: 'lacteos', icono: '🧀', nombre: 'Lácteos' },
  { id: 'granos', icono: '🌾', nombre: 'Granos' },
  { id: 'legumbres', icono: '🫘', nombre: 'Legumbres' },
  { id: 'condimentos', icono: '🧂', nombre: 'Condimentos' },
  { id: 'aceites', icono: '🫒', nombre: 'Aceites' },
  { id: 'bebidas', icono: '🥤', nombre: 'Bebidas' },
  { id: 'hierbas', icono: '🌿', nombre: 'Hierbas' },
  { id: 'especias', icono: '🌶️', nombre: 'Especias' },
  { id: 'endulzantes', icono: '🍯', nombre: 'Endulzantes' },
  { id: 'frutos_secos', icono: '🥜', nombre: 'Frutos Secos' },
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

const ORIGENES = [
  { id: 'vegetal', nombre: 'Vegetal' },
  { id: 'animal', nombre: 'Animal' },
  { id: 'mineral', nombre: 'Mineral' },
  { id: 'sintetico', nombre: 'Sintético' },
  { id: 'fermentado', nombre: 'Fermentado' },
];

export default function EditarIngredientePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [seccionActiva, setSeccionActiva] = useState('basico');

  const [form, setForm] = useState<any>({
    nombre: '', nombre_cientifico: '', categoria: 'verduras', unidad_base: 'gramos',
    // Macros
    calorias: '', proteinas_g: '', carbohidratos_g: '', grasas_g: '',
    grasas_saturadas_g: '', fibra_g: '', azucar_g: '', sodio_mg: '',
    // Minerales principales
    calcio_mg: '', hierro_mg: '', magnesio_mg: '', potasio_mg: '', zinc_mg: '',
    // Minerales traza
    fosforo_mg: '', cobre_mg: '', manganeso_mg: '', selenio_mcg: '',
    yodo_mcg: '', fluor_mcg: '', cloro_mg: '', azufre_mg: '',
    // Vitaminas
    vitamina_a_mcg: '', vitamina_c_mg: '', vitamina_d_mcg: '', vitamina_b12_mcg: '',
    vitamina_b1_mg: '', vitamina_b2_mg: '', vitamina_b3_mg: '', vitamina_b5_mg: '',
    vitamina_b6_mg: '', vitamina_b9_mcg: '', vitamina_e_mg: '', vitamina_k_mcg: '',
    // Ácidos grasos
    omega3_mg: '', omega6_mg: '', grasas_monoinsaturadas_g: '',
    grasas_poliinsaturadas_g: '', colesterol_mg: '',
    // Otros
    agua_g: '', cenizas_g: '', alcohol_g: '', cafeina_mg: '',
    // Índices
    indice_glucemico: '', carga_glucemica: '', valor_orac: '',
    indice_pral: '', ph: '',
    // Propiedades
    origen: '', estacionalidad: '', parte_util: '',
    alergenos: [] as string[],
    contraindicaciones: '',
    beneficios_hildegardianos: '',
    propiedades_hildegardianas: '',
    temperamento: '',
    compatibilidad_temperamento: [] as string[],
    activo: true,
  });

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch(`/api/admin/ingredientes/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const ing = data.ingrediente;
        setForm({
          ...ing,
          calorias: ing.calorias ?? '',
          proteinas_g: ing.proteinas_g ?? '',
          carbohidratos_g: ing.carbohidratos_g ?? '',
          grasas_g: ing.grasas_g ?? '',
          grasas_saturadas_g: ing.grasas_saturadas_g ?? '',
          fibra_g: ing.fibra_g ?? '',
          azucar_g: ing.azucar_g ?? '',
          sodio_mg: ing.sodio_mg ?? '',
          calcio_mg: ing.calcio_mg ?? '',
          hierro_mg: ing.hierro_mg ?? '',
          magnesio_mg: ing.magnesio_mg ?? '',
          potasio_mg: ing.potasio_mg ?? '',
          zinc_mg: ing.zinc_mg ?? '',
          fosforo_mg: ing.fosforo_mg ?? '',
          cobre_mg: ing.cobre_mg ?? '',
          manganeso_mg: ing.manganeso_mg ?? '',
          selenio_mcg: ing.selenio_mcg ?? '',
          yodo_mcg: ing.yodo_mcg ?? '',
          fluor_mcg: ing.fluor_mcg ?? '',
          cloro_mg: ing.cloro_mg ?? '',
          azufre_mg: ing.azufre_mg ?? '',
          vitamina_a_mcg: ing.vitamina_a_mcg ?? '',
          vitamina_c_mg: ing.vitamina_c_mg ?? '',
          vitamina_d_mcg: ing.vitamina_d_mcg ?? '',
          vitamina_b12_mcg: ing.vitamina_b12_mcg ?? '',
          vitamina_b1_mg: ing.vitamina_b1_mg ?? '',
          vitamina_b2_mg: ing.vitamina_b2_mg ?? '',
          vitamina_b3_mg: ing.vitamina_b3_mg ?? '',
          vitamina_b5_mg: ing.vitamina_b5_mg ?? '',
          vitamina_b6_mg: ing.vitamina_b6_mg ?? '',
          vitamina_b9_mcg: ing.vitamina_b9_mcg ?? '',
          vitamina_e_mg: ing.vitamina_e_mg ?? '',
          vitamina_k_mcg: ing.vitamina_k_mcg ?? '',
          omega3_mg: ing.omega3_mg ?? '',
          omega6_mg: ing.omega6_mg ?? '',
          grasas_monoinsaturadas_g: ing.grasas_monoinsaturadas_g ?? '',
          grasas_poliinsaturadas_g: ing.grasas_poliinsaturadas_g ?? '',
          colesterol_mg: ing.colesterol_mg ?? '',
          agua_g: ing.agua_g ?? '',
          cenizas_g: ing.cenizas_g ?? '',
          alcohol_g: ing.alcohol_g ?? '',
          cafeina_mg: ing.cafeina_mg ?? '',
          indice_glucemico: ing.indice_glucemico ?? '',
          carga_glucemica: ing.carga_glucemica ?? '',
          valor_orac: ing.valor_orac ?? '',
          indice_pral: ing.indice_pral ?? '',
          ph: ing.ph ?? '',
          alergenos: ing.alergenos || [],
          compatibilidad_temperamento: ing.compatibilidad_temperamento || [],
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setForm({ ...form, [target.name]: value });
  };

  const handleArrayChange = (campo: string, valor: string) => {
    const array = form[campo].filter((v: string) => v);
    if (valor && !array.includes(valor)) {
      setForm({ ...form, [campo]: [...array, valor] });
    }
  };

  const removeFromArray = (campo: string, valor: string) => {
    setForm({ ...form, [campo]: form[campo].filter((v: string) => v !== valor) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMensaje('');

    try {
      const res = await fetch(`/api/admin/ingredientes/${id}`, {
        method: 'PUT',
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
          fosforo_mg: form.fosforo_mg ? parseFloat(form.fosforo_mg) : null,
          cobre_mg: form.cobre_mg ? parseFloat(form.cobre_mg) : null,
          manganeso_mg: form.manganeso_mg ? parseFloat(form.manganeso_mg) : null,
          selenio_mcg: form.selenio_mcg ? parseFloat(form.selenio_mcg) : null,
          yodo_mcg: form.yodo_mcg ? parseFloat(form.yodo_mcg) : null,
          fluor_mcg: form.fluor_mcg ? parseFloat(form.fluor_mcg) : null,
          cloro_mg: form.cloro_mg ? parseFloat(form.cloro_mg) : null,
          azufre_mg: form.azufre_mg ? parseFloat(form.azufre_mg) : null,
          vitamina_a_mcg: form.vitamina_a_mcg ? parseFloat(form.vitamina_a_mcg) : null,
          vitamina_c_mg: form.vitamina_c_mg ? parseFloat(form.vitamina_c_mg) : null,
          vitamina_d_mcg: form.vitamina_d_mcg ? parseFloat(form.vitamina_d_mcg) : null,
          vitamina_b12_mcg: form.vitamina_b12_mcg ? parseFloat(form.vitamina_b12_mcg) : null,
          vitamina_b1_mg: form.vitamina_b1_mg ? parseFloat(form.vitamina_b1_mg) : null,
          vitamina_b2_mg: form.vitamina_b2_mg ? parseFloat(form.vitamina_b2_mg) : null,
          vitamina_b3_mg: form.vitamina_b3_mg ? parseFloat(form.vitamina_b3_mg) : null,
          vitamina_b5_mg: form.vitamina_b5_mg ? parseFloat(form.vitamina_b5_mg) : null,
          vitamina_b6_mg: form.vitamina_b6_mg ? parseFloat(form.vitamina_b6_mg) : null,
          vitamina_b9_mcg: form.vitamina_b9_mcg ? parseFloat(form.vitamina_b9_mcg) : null,
          vitamina_e_mg: form.vitamina_e_mg ? parseFloat(form.vitamina_e_mg) : null,
          vitamina_k_mcg: form.vitamina_k_mcg ? parseFloat(form.vitamina_k_mcg) : null,
          omega3_mg: form.omega3_mg ? parseFloat(form.omega3_mg) : null,
          omega6_mg: form.omega6_mg ? parseFloat(form.omega6_mg) : null,
          grasas_monoinsaturadas_g: form.grasas_monoinsaturadas_g ? parseFloat(form.grasas_monoinsaturadas_g) : null,
          grasas_poliinsaturadas_g: form.grasas_poliinsaturadas_g ? parseFloat(form.grasas_poliinsaturadas_g) : null,
          colesterol_mg: form.colesterol_mg ? parseFloat(form.colesterol_mg) : null,
          agua_g: form.agua_g ? parseFloat(form.agua_g) : null,
          cenizas_g: form.cenizas_g ? parseFloat(form.cenizas_g) : null,
          alcohol_g: form.alcohol_g ? parseFloat(form.alcohol_g) : null,
          cafeina_mg: form.cafeina_mg ? parseFloat(form.cafeina_mg) : null,
          indice_glucemico: form.indice_glucemico ? parseInt(form.indice_glucemico) : null,
          carga_glucemica: form.carga_glucemica ? parseFloat(form.carga_glucemica) : null,
          valor_orac: form.valor_orac ? parseInt(form.valor_orac) : null,
          indice_pral: form.indice_pral ? parseFloat(form.indice_pral) : null,
          ph: form.ph ? parseFloat(form.ph) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMensaje('✅ Ingrediente actualizado');
      setTimeout(() => router.push('/admin/ingredientes'), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirm('¿Eliminar este ingrediente?')) return;
    try {
      const res = await fetch(`/api/admin/ingredientes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      router.push('/admin/ingredientes');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  const secciones = [
    { id: 'basico', icono: '📋', nombre: 'Básico' },
    { id: 'macros', icono: '🔬', nombre: 'Macros' },
    { id: 'minerales', icono: '⚗️', nombre: 'Minerales' },
    { id: 'vitaminas', icono: '', nombre: 'Vitaminas' },
    { id: 'grasas', icono: '🥑', nombre: 'Grasas' },
    { id: 'indices', icono: '📊', nombre: 'Índices' },
    { id: 'propiedades', icono: '✨', nombre: 'Propiedades' },
    { id: 'hildegarda', icono: '🌿', nombre: 'Hildegarda' },
  ];

  const InputField = ({ name, label, unit, step = '0.01' }: { name: string; label: string; unit?: string; step?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          step={step}
          name={name}
          value={form[name]}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm pr-12"
          placeholder="0.00"
        />
        {unit && <span className="absolute right-3 top-2 text-xs text-gray-500">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-green-700 to-emerald-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">✏️ {form.nombre}</h1>
            <p className="text-green-100 text-sm">Análisis nutricional completo</p>
          </div>
          <button
            onClick={() => router.push('/admin/ingredientes')}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            ← Volver
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">❌ {error}</div>
        )}
        {mensaje && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{mensaje}</div>
        )}

        {/* Tabs de secciones */}
        <div className="bg-white rounded-xl shadow-md mb-6 overflow-x-auto">
          <div className="flex min-w-max">
            {secciones.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setSeccionActiva(sec.id)}
                className={`flex-1 px-4 py-3 font-semibold text-sm whitespace-nowrap transition-all ${
                  seccionActiva === sec.id
                    ? 'bg-green-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {sec.icono} {sec.nombre}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6">
          {/* SECCIÓN: BÁSICO */}
          {seccionActiva === 'basico' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-2">📋 Datos Básicos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                  <input type="text" name="nombre" value={form.nombre} onChange={handleChange} required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre Científico</label>
                  <input type="text" name="nombre_cientifico" value={form.nombre_cientifico || ''} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: Daucus carota" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría *</label>
                  <select name="categoria" value={form.categoria} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                    {CATEGORIAS.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icono} {cat.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Unidad Base</label>
                  <select name="unidad_base" value={form.unidad_base} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                    <option value="gramos">Gramos</option>
                    <option value="ml">Mililitros</option>
                    <option value="unidades">Unidades</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Origen</label>
                  <select name="origen" value={form.origen || ''} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                    <option value="">-- Seleccionar --</option>
                    {ORIGENES.map((o) => (
                      <option key={o.id} value={o.id}>{o.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Parte Util</label>
                  <input type="text" name="parte_util" value={form.parte_util || ''} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: raíz, hoja, fruto" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Estacionalidad</label>
                  <input type="text" name="estacionalidad" value={form.estacionalidad || ''} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: primavera,verano" />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange}
                      className="w-5 h-5 text-green-600 rounded" />
                    <span className="text-sm font-semibold text-gray-700">Ingrediente activo</span>
                  </label>
                </div>
              </div>

              {/* Alérgenos */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Alérgenos</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.alergenos.map((a: string) => (
                    <span key={a} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {a}
                      <button type="button" onClick={() => removeFromArray('alergenos', a)} className="text-red-500 hover:text-red-700">×</button>
                    </span>
                  ))}
                </div>
                <select
                  onChange={(e) => { handleArrayChange('alergenos', e.target.value); e.target.value = ''; }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="">+ Agregar alérgeno...</option>
                  {['gluten', 'lactosa', 'huevo', 'frutos_secos', 'soja', 'mariscos', 'pescado', 'mostaza', 'sesamo', 'sulfitos'].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* SECCIÓN: MACROS */}
          {seccionActiva === 'macros' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-2">🔬 Macronutrientes (por 100g)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InputField name="calorias" label="Calorías" unit="kcal" />
                <InputField name="proteinas_g" label="Proteínas" unit="g" />
                <InputField name="carbohidratos_g" label="Carbohidratos" unit="g" />
                <InputField name="grasas_g" label="Grasas totales" unit="g" />
                <InputField name="grasas_saturadas_g" label="Grasas Saturadas" unit="g" />
                <InputField name="fibra_g" label="Fibra" unit="g" />
                <InputField name="azucar_g" label="Azúcar" unit="g" />
                <InputField name="sodio_mg" label="Sodio" unit="mg" />
                <InputField name="agua_g" label="Agua" unit="g" />
                <InputField name="cenizas_g" label="Cenizas" unit="g" />
                <InputField name="alcohol_g" label="Alcohol" unit="g" />
                <InputField name="cafeina_mg" label="Cafeína" unit="mg" />
              </div>
            </div>
          )}

          {/* SECCIÓN: MINERALES */}
          {seccionActiva === 'minerales' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-2">⚗️ Minerales (por 100g)</h2>
              <h3 className="font-semibold text-gray-700">Principales</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <InputField name="calcio_mg" label="Calcio" unit="mg" />
                <InputField name="hierro_mg" label="Hierro" unit="mg" />
                <InputField name="magnesio_mg" label="Magnesio" unit="mg" />
                <InputField name="potasio_mg" label="Potasio" unit="mg" />
                <InputField name="zinc_mg" label="Zinc" unit="mg" />
              </div>
              <h3 className="font-semibold text-gray-700 mt-4">Traza</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InputField name="fosforo_mg" label="Fósforo" unit="mg" />
                <InputField name="cobre_mg" label="Cobre" unit="mg" step="0.001" />
                <InputField name="manganeso_mg" label="Manganeso" unit="mg" step="0.001" />
                <InputField name="selenio_mcg" label="Selenio" unit="mcg" />
                <InputField name="yodo_mcg" label="Yodo" unit="mcg" />
                <InputField name="fluor_mcg" label="Flúor" unit="mcg" />
                <InputField name="cloro_mg" label="Cloro" unit="mg" />
                <InputField name="azufre_mg" label="Azufre" unit="mg" />
              </div>
            </div>
          )}

          {/* SECCIÓN: VITAMINAS */}
          {seccionActiva === 'vitaminas' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-2">💊 Vitaminas (por 100g)</h2>
              <h3 className="font-semibold text-gray-700">Liposolubles</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InputField name="vitamina_a_mcg" label="Vitamina A" unit="mcg" />
                <InputField name="vitamina_d_mcg" label="Vitamina D" unit="mcg" />
                <InputField name="vitamina_e_mg" label="Vitamina E" unit="mg" step="0.001" />
                <InputField name="vitamina_k_mcg" label="Vitamina K" unit="mcg" />
              </div>
              <h3 className="font-semibold text-gray-700 mt-4">Hidrosolubles - Complejo B</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InputField name="vitamina_b1_mg" label="B1 (Tiamina)" unit="mg" step="0.001" />
                <InputField name="vitamina_b2_mg" label="B2 (Riboflavina)" unit="mg" step="0.001" />
                <InputField name="vitamina_b3_mg" label="B3 (Niacina)" unit="mg" step="0.001" />
                <InputField name="vitamina_b5_mg" label="B5 (Pantoténico)" unit="mg" step="0.001" />
                <InputField name="vitamina_b6_mg" label="B6 (Piridoxina)" unit="mg" step="0.001" />
                <InputField name="vitamina_b9_mcg" label="B9 (Folato)" unit="mcg" />
                <InputField name="vitamina_b12_mcg" label="B12" unit="mcg" />
                <InputField name="vitamina_c_mg" label="Vitamina C" unit="mg" />
              </div>
            </div>
          )}

          {/* SECCIÓN: GRASAS */}
          {seccionActiva === 'grasas' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-2">🥑 Ácidos Grasos (por 100g)</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InputField name="grasas_saturadas_g" label="Saturadas" unit="g" />
                <InputField name="grasas_monoinsaturadas_g" label="Monoinsaturadas" unit="g" />
                <InputField name="grasas_poliinsaturadas_g" label="Poliinsaturadas" unit="g" />
                <InputField name="omega3_mg" label="Omega-3" unit="mg" />
                <InputField name="omega6_mg" label="Omega-6" unit="mg" />
                <InputField name="colesterol_mg" label="Colesterol" unit="mg" />
              </div>
            </div>
          )}

          {/* SECCIÓN: ÍNDICES */}
          {seccionActiva === 'indices' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-2">📊 Índices de Calidad</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Índice Glucémico (0-100)</label>
                  <input type="number" name="indice_glucemico" value={form.indice_glucemico} onChange={handleChange}
                    min="0" max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm" />
                </div>
                <InputField name="carga_glucemica" label="Carga Glucémica" unit="" />
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">ORAC (Antioxidantes)</label>
                  <input type="number" name="valor_orac" value={form.valor_orac} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm" />
                </div>
                <InputField name="indice_pral" label="Índice PRAL" unit="" step="0.1" />
                <InputField name="ph" label="pH" unit="" step="0.1" />
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm text-blue-800">
                  <strong>💡 Referencia:</strong> PRAL negativo = alcalinizante | PRAL positivo = acidificante | 
                  IG bajo (&lt;55) | IG medio (56-69) | IG alto (&gt;70)
                </p>
              </div>
            </div>
          )}

          {/* SECCIÓN: PROPIEDADES */}
          {seccionActiva === 'propiedades' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-2">✨ Propiedades Generales</h2>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contraindicaciones</label>
                <textarea name="contraindicaciones" value={form.contraindicaciones || ''} onChange={handleChange} rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: No recomendado para personas con..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Beneficios para la salud</label>
                <textarea name="beneficios_hildegardianos" value={form.beneficios_hildegardianos || ''} onChange={handleChange} rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: Fortalece el sistema inmune, mejora la digestión..." />
              </div>
            </div>
          )}

          {/* SECCIÓN: HILDEGARDA */}
          {seccionActiva === 'hildegarda' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-2">🌿 Sabiduría Hildegardiana</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Temperamento del ingrediente</label>
                  <select name="temperamento" value={form.temperamento || ''} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                    <option value="">-- Seleccionar --</option>
                    {TEMPERAMENTOS.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Propiedades Hildegardianas</label>
                  <textarea name="propiedades_hildegardianas" value={form.propiedades_hildegardianas || ''} onChange={handleChange} rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Compatible con temperamentos (beneficia a)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.compatibilidad_temperamento.map((t: string) => {
                    const info = TEMPERAMENTOS.find(x => x.id === t);
                    return (
                      <span key={t} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        {info?.nombre}
                        <button type="button" onClick={() => removeFromArray('compatibilidad_temperamento', t)} className="text-purple-500 hover:text-purple-700">×</button>
                      </span>
                    );
                  })}
                </div>
                <select
                  onChange={(e) => { handleArrayChange('compatibilidad_temperamento', e.target.value); e.target.value = ''; }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="">+ Agregar temperamento...</option>
                  {TEMPERAMENTOS.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <button type="submit" disabled={saving}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50">
              {saving ? '💾 Guardando...' : '💾 Guardar Cambios'}
            </button>
            <button type="button" onClick={handleEliminar}
              className="bg-red-500 text-white px-6 py-4 rounded-lg hover:bg-red-600 font-bold">
              🗑️ Eliminar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

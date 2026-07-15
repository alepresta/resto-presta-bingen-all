'use client';

import { useState } from 'react';
import Link from 'next/link';

type Categoria = { id: string; icono: string; nombre: string };

type Col = {
  key: string;
  label: string;
  align?: 'left' | 'center';
  render?: (ing: any) => React.ReactNode;
};

type Grupo = {
  id: string;
  label: string;
  color: string;
  columnas: Col[];
};

const nulo = <span className="text-gray-500 font-medium">-</span>;

const formatNum = (v: any) =>
  v !== null && v !== undefined && v !== '' ? v : nulo;

const textoLargo = (v: any) =>
  v ? (
    <span className="line-clamp-3 max-w-[220px] inline-block align-top" title={v}>
      {v}
    </span>
  ) : (
    nulo
  );

const origenBadge = (ing: any) =>
  ing.origen ? (
    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
      {ing.origen === 'vegetal'
        ? '🌱'
        : ing.origen === 'animal'
        ? '🐄'
        : ing.origen === 'mineral'
        ? '⛏️'
        : '⚗️'}{' '}
      {ing.origen}
    </span>
  ) : (
    nulo
  );

const igBadge = (ing: any) =>
  ing.indice_glucemico !== null && ing.indice_glucemico !== undefined ? (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-bold ${
        ing.indice_glucemico < 55
          ? 'bg-green-100 text-green-700'
          : ing.indice_glucemico < 70
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-red-100 text-red-700'
      }`}
    >
      {ing.indice_glucemico}
    </span>
  ) : (
    nulo
  );

const tempBadge = (ing: any) =>
  ing.temperamento ? (
    <span className="inline-block bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-xs">
      {ing.temperamento.replace(/_/g, ' ')}
    </span>
  ) : (
    nulo
  );

const subtilitasBadge = (ing: any) =>
  ing.nivel_subtilitat !== null && ing.nivel_subtilitat !== undefined ? (
    <span className="inline-block bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold">
      {ing.nivel_subtilitat}/10
    </span>
  ) : (
    nulo
  );

const boolEmoji = (v: any, si: string, no: string) =>
  v === true ? si : v === false ? no : nulo;

const alergenosChips = (ing: any) =>
  Array.isArray(ing.alergenos) && ing.alergenos.length > 0 ? (
    <div className="flex flex-wrap gap-1 justify-center max-w-[160px]">
      {ing.alergenos.map((a: string) => (
        <span key={a} className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">
          {a}
        </span>
      ))}
    </div>
  ) : (
    nulo
  );

const GRUPOS: Grupo[] = [
  {
    id: 'general',
    label: '📋 General',
    color: 'text-gray-700',
    columnas: [
      { key: 'nombre_cientifico', label: '🔬 Científico', align: 'left', render: (ing) => (ing.nombre_cientifico ? <span className="italic text-gray-500">{ing.nombre_cientifico}</span> : nulo) },
      { key: 'origen', label: '🧬 Origen', render: origenBadge },
      { key: 'unidad_base', label: '📏 Unidad' },
      { key: 'parte_util', label: '🌱 Parte' },
      { key: 'estacion_ideal', label: '📅 Estación' },
    ],
  },
  {
    id: 'macros',
    label: '🔥 Macros',
    color: 'text-amber-700',
    columnas: [
      { key: 'calorias', label: '🔥 Cal' },
      { key: 'proteinas_g', label: '💪 Prot' },
      { key: 'carbohidratos_g', label: '🍞 Carbs' },
      { key: 'grasas_g', label: '🥑 Grasas' },
      { key: 'fibra_g', label: '🌾 Fibra' },
      { key: 'azucar_g', label: '🍬 Azúcar' },
      { key: 'agua_g', label: '💧 Agua' },
      { key: 'cenizas_g', label: '⬜ Cenizas' },
      { key: 'alcohol_g', label: '🍷 Alcohol' },
      { key: 'cafeina_mg', label: '☕ Cafeína' },
    ],
  },
  {
    id: 'grasas',
    label: '🥑 Grasas',
    color: 'text-yellow-700',
    columnas: [
      { key: 'grasas_saturadas_g', label: 'Sat' },
      { key: 'grasas_monoinsaturadas_g', label: 'Mono' },
      { key: 'grasas_poliinsaturadas_g', label: 'Poli' },
      { key: 'omega3_mg', label: 'Ω3' },
      { key: 'omega6_mg', label: 'Ω6' },
      { key: 'colesterol_mg', label: 'Colest' },
    ],
  },
  {
    id: 'minerales',
    label: '⚗️ Minerales',
    color: 'text-slate-700',
    columnas: [
      { key: 'sodio_mg', label: 'Na' },
      { key: 'potasio_mg', label: 'K' },
      { key: 'calcio_mg', label: 'Ca' },
      { key: 'magnesio_mg', label: 'Mg' },
      { key: 'fosforo_mg', label: 'P' },
      { key: 'hierro_mg', label: 'Fe' },
      { key: 'zinc_mg', label: 'Zn' },
      { key: 'cobre_mg', label: 'Cu' },
      { key: 'manganeso_mg', label: 'Mn' },
      { key: 'selenio_mcg', label: 'Se' },
      { key: 'yodo_mcg', label: 'I' },
      { key: 'fluor_mcg', label: 'F' },
      { key: 'cloro_mg', label: 'Cl' },
      { key: 'azufre_mg', label: 'S' },
    ],
  },
  {
    id: 'vitaminas',
    label: '💊 Vitaminas',
    color: 'text-pink-700',
    columnas: [
      { key: 'vitamina_a_mcg', label: 'A' },
      { key: 'vitamina_c_mg', label: 'C' },
      { key: 'vitamina_d_mcg', label: 'D' },
      { key: 'vitamina_e_mg', label: 'E' },
      { key: 'vitamina_k_mcg', label: 'K' },
      { key: 'vitamina_b1_mg', label: 'B1' },
      { key: 'vitamina_b2_mg', label: 'B2' },
      { key: 'vitamina_b3_mg', label: 'B3' },
      { key: 'vitamina_b5_mg', label: 'B5' },
      { key: 'vitamina_b6_mg', label: 'B6' },
      { key: 'vitamina_b9_mcg', label: 'B9' },
      { key: 'vitamina_b12_mcg', label: 'B12' },
    ],
  },
  {
    id: 'indices',
    label: '📊 Índices',
    color: 'text-purple-700',
    columnas: [
      { key: 'indice_glucemico', label: '📊 IG', render: igBadge },
      { key: 'carga_glucemica', label: 'CG' },
      { key: 'valor_orac', label: 'ORAC' },
      { key: 'indice_pral', label: 'PRAL' },
      { key: 'ph', label: 'pH' },
    ],
  },
  {
    id: 'hildegarda',
    label: '🌿 Hildegarda',
    color: 'text-emerald-700',
    columnas: [
      { key: 'temperamento', label: '🌿 Temp.', render: tempBadge },
      { key: 'nivel_subtilitat', label: '✨ Subtilitas', render: subtilitasBadge },
      { key: 'viriditas_index', label: '💚 Viriditas' },
      { key: 'es_veneno_hildegardiano', label: '☠️ Veneno', render: (ing) => boolEmoji(ing.es_veneno_hildegardiano, '☠️', '✅') },
      { key: 'es_base_alegria', label: '😊 Alegría', render: (ing) => boolEmoji(ing.es_base_alegria, '😊', '—') },
      { key: 'requiere_coccion', label: '🔥 Cocción', render: (ing) => boolEmoji(ing.requiere_coccion, '🔥', '—') },
      { key: 'apto_para_enfermos', label: '🏥 Enfermos', render: (ing) => boolEmoji(ing.apto_para_enfermos, '✅', '❌') },
      { key: 'frecuencia_recomendada', label: '🔄 Frecuencia' },
      { key: 'impacto_livor', label: '💧 Livor' },
      { key: 'impacto_bilis_negra', label: '🖤 Bilis N.' },
      { key: 'humor_principal', label: '🧠 Humor', align: 'left', render: (ing) => textoLargo(ing.humor_principal) },
      { key: 'alergenos', label: '⚠️ Alérgenos', render: alergenosChips },
      { key: 'propiedades_hildegardianas', label: '📜 Propiedades', align: 'left', render: (ing) => textoLargo(ing.propiedades_hildegardianas) },
      { key: 'beneficios_hildegardianos', label: '💚 Beneficios', align: 'left', render: (ing) => textoLargo(ing.beneficios_hildegardianos) },
      { key: 'contraindicaciones', label: '🚫 Contraind.', align: 'left', render: (ing) => textoLargo(ing.contraindicaciones) },
      { key: 'alternativa_sana', label: '🔄 Alt. sana', align: 'left', render: (ing) => textoLargo(ing.alternativa_sana) },
    ],
  },
];

// Campos de identificación que siempre se incluyen en cualquier exportación.
const KEYS_IDENT = ['id', 'nombre', 'nombre_cientifico', 'categoria', 'activo'];

const keysDeGrupos = (ids: string[]) =>
  GRUPOS.filter((g) => ids.includes(g.id)).flatMap((g) => g.columnas.map((c) => c.key));

// Perfil científico: origen/unidad + macros, grasas, minerales, vitaminas, índices.
const KEYS_CIENTIFICO = [
  'origen',
  'unidad_base',
  'parte_util',
  'estacion_ideal',
  ...keysDeGrupos(['macros', 'grasas', 'minerales', 'vitaminas', 'indices']),
];

// Perfil hildegardiano: propiedades medievales/energéticas.
const KEYS_HILDEGARDIANO = [...keysDeGrupos(['hildegarda']), 'compatibilidad_temperamento'];

type Ambito = 'todo' | 'cientifico' | 'hildegardiano';

const AMBITOS: { id: Ambito; label: string }[] = [
  { id: 'todo', label: '🌐 Todo' },
  { id: 'cientifico', label: '🔬 Científico' },
  { id: 'hildegardiano', label: '🌿 Hildegardiano' },
];

export default function TablaIngredientes({
  ingredientes,
  categorias,
}: {
  ingredientes: any[];
  categorias: Categoria[];
}) {
  const [grupoActivo, setGrupoActivo] = useState<string>('todas');
  const [ambito, setAmbito] = useState<Ambito>('todo');

  const gruposVisibles =
    grupoActivo === 'todas' ? GRUPOS : GRUPOS.filter((g) => g.id === grupoActivo);

  const renderCelda = (ing: any, col: Col) => {
    if (col.render) return col.render(ing);
    return formatNum(ing[col.key]);
  };

  // Proyecta cada ingrediente a las columnas del ámbito seleccionado.
  const proyectar = (ing: any) => {
    if (ambito === 'todo') return ing;
    const keys =
      ambito === 'cientifico'
        ? [...KEYS_IDENT, ...KEYS_CIENTIFICO]
        : [...KEYS_IDENT, ...KEYS_HILDEGARDIANO];
    const out: Record<string, any> = {};
    keys.forEach((k) => {
      if (k in ing) out[k] = ing[k];
    });
    return out;
  };

  const datosExport = () => (ingredientes || []).map(proyectar);

  const sufijoAmbito = ambito === 'todo' ? '' : `-${ambito}`;

  const descargarArchivo = (contenido: string, tipo: string, extension: string) => {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const fecha = new Date().toISOString().slice(0, 10);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `ingredientes${sufijoAmbito}-${fecha}.${extension}`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  };

  const descargarJSON = () => {
    const contenido = JSON.stringify(datosExport(), null, 2);
    descargarArchivo(contenido, 'application/json', 'json');
  };

  const escaparCSV = (valor: any) => {
    if (valor === null || valor === undefined) return '';
    let texto = Array.isArray(valor) ? valor.join('; ') : String(valor);
    if (/[";\n]/.test(texto)) {
      texto = `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  };

  const descargarCSV = () => {
    if (!ingredientes || ingredientes.length === 0) return;
    const datos = datosExport();
    // Unión de todas las claves presentes en el dataset, en orden de aparición
    const columnas: string[] = [];
    datos.forEach((ing) => {
      Object.keys(ing).forEach((k) => {
        if (!columnas.includes(k)) columnas.push(k);
      });
    });
    const cabecera = columnas.join(';');
    const filas = datos.map((ing) =>
      columnas.map((c) => escaparCSV(ing[c])).join(';')
    );
    // BOM para que Excel abra bien los acentos (UTF-8)
    const contenido = '\uFEFF' + [cabecera, ...filas].join('\n');
    descargarArchivo(contenido, 'text/csv;charset=utf-8;', 'csv');
  };

  return (
    <>
      {/* Selector de grupos de columnas */}
      <div className="bg-white rounded-xl shadow-md mb-4 p-2 flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => setGrupoActivo('todas')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
            grupoActivo === 'todas'
              ? 'bg-green-600 text-white'
                : 'text-gray-800 hover:bg-gray-100'
          }`}
        >
          🗂️ Todas
        </button>
        {GRUPOS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGrupoActivo(g.id)}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              grupoActivo === g.id
                ? 'bg-green-600 text-white'
                : 'text-gray-800 hover:bg-gray-100'
            }`}
          >
            {g.label}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1" title="Qué campos incluir en la descarga">
            {AMBITOS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAmbito(a.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  ambito === a.id ? 'bg-white shadow text-gray-900' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={descargarJSON}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all"
            title="Descargar los ingredientes (según el ámbito elegido) en JSON"
          >
            ⬇️ JSON ({ingredientes?.length || 0})
          </button>
          <button
            type="button"
            onClick={descargarCSV}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-all"
            title="Descargar los ingredientes (según el ámbito elegido) en CSV (Excel)"
          >
            ⬇️ CSV ({ingredientes?.length || 0})
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="min-w-full w-max text-sm whitespace-nowrap text-gray-800">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 sticky left-0 top-0 bg-gray-50 z-30 min-w-[220px]">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 sticky top-0 bg-gray-50 z-20 min-w-[180px]">Categoría</th>
                {gruposVisibles.map((g) =>
                  g.columnas.map((col, idx) => (
                    <th
                      key={col.key}
                      className={`px-3 py-3 font-semibold sticky top-0 bg-gray-50 z-20 min-w-[96px] ${g.color} ${
                        col.align === 'left' ? 'text-left' : 'text-center'
                      } ${idx === 0 ? 'border-l-2 border-gray-200' : ''}`}
                      title={g.label}
                    >
                      {col.label}
                    </th>
                  ))
                )}
                <th className="text-center px-4 py-3 font-semibold text-gray-700 border-l-2 border-gray-200 sticky right-0 top-0 bg-gray-50 z-30 min-w-[110px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {ingredientes?.map((ing: any) => {
                const catInfo = categorias.find((c) => c.id === ing.categoria);
                return (
                  <tr key={ing.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-gray-800 sticky left-0 bg-white z-10">
                      {ing.nombre}
                    </td>
                    <td className="px-4 py-2.5 text-gray-800">
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-semibold">
                        {catInfo?.icono} {catInfo?.nombre || ing.categoria}
                      </span>
                    </td>
                    {gruposVisibles.map((g) =>
                      g.columnas.map((col, idx) => (
                        <td
                          key={col.key}
                          className={`px-3 py-2.5 text-xs leading-5 text-gray-700 ${
                            col.align === 'left' ? 'text-left' : 'text-center'
                          } ${idx === 0 ? 'border-l-2 border-gray-100' : ''}`}
                        >
                          {renderCelda(ing, col)}
                        </td>
                      ))
                    )}
                    <td className="px-4 py-2.5 text-center sticky right-0 bg-white z-10">
                      <Link
                        href={`/admin/ingredientes/${ing.id}`}
                        className="text-green-700 hover:text-green-900 font-semibold text-sm"
                      >
                        ✏️ Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(!ingredientes || ingredientes.length === 0) && (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">No se encontraron ingredientes</p>
          </div>
        )}
      </div>
    </>
  );
}

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { obtenerInformeDualPorReceta } from '@/lib/informe-dual-server';
import type { InformeDual } from '@/lib/informe-dual';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/recetas/[id]/informe?porciones=N&formato=json|html
 * Devuelve el Informe Dual (científico + hildegardiano) escalado a N porciones.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const formato = (searchParams.get('formato') || 'json').toLowerCase();
  const porciones = parseInt(searchParams.get('porciones') || '', 10) || null;

  const { informe, nombre, error, status } = await obtenerInformeDualPorReceta(
    supabase,
    params.id,
    porciones
  );

  if (!informe) {
    return NextResponse.json(
      { error: error || 'No se pudo generar el informe' },
      { status: status || 500 }
    );
  }

  if (formato === 'html') {
    const html = renderInformeHtml(nombre, informe);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="informe-${params.id}.html"`,
      },
    });
  }

  const res = NextResponse.json({ informe });
  if (searchParams.get('descargar') === '1') {
    res.headers.set(
      'Content-Disposition',
      `attachment; filename="informe-${params.id}.json"`
    );
  }
  return res;
}

// ---- Render HTML imprimible (export para cocina/nutrición) --------------

function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderInformeHtml(nombre: string, i: InformeDual): string {
  const filasIngredientes = i.detalleIngredientes
    .map(
      (d) => `<tr>
        <td>${esc(d.nombre)}</td>
        <td>${esc(d.cantidadEscalada)}</td>
        <td>${esc(d.temperamento)}</td>
        <td>${d.subtilitat}</td>
        <td>${esc(d.viriditas)}</td>
        <td>${d.esVeneno ? '⚠️ veneno' : d.esBaseAlegria ? '🌿 pilar' : '—'}</td>
      </tr>`
    )
    .join('');

  const filasFactores = i.hildegardiano.factores
    .map(
      (f) =>
        `<tr><td>${esc(f.etiqueta)}</td><td>${f.tipo === 'bonificacion' ? '+' : ''}${f.puntos}</td><td>${esc(f.motivo)}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Informe Dual · ${esc(nombre)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #1f2937; }
  h1 { font-size: 1.5rem; } h2 { font-size: 1.15rem; margin-top: 1.5rem; border-bottom: 2px solid #e5e7eb; padding-bottom: .25rem; }
  .badge { display: inline-block; padding: .2rem .6rem; border-radius: 999px; font-size: .8rem; font-weight: 600; }
  .alta { background:#dcfce7; color:#166534; } .media { background:#fef9c3; color:#854d0e; } .baja { background:#fee2e2; color:#991b1b; }
  table { width: 100%; border-collapse: collapse; margin-top: .5rem; font-size: .85rem; }
  th, td { border: 1px solid #e5e7eb; padding: .35rem .5rem; text-align: left; }
  th { background: #f9fafb; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: .5rem; margin-top: .5rem; }
  .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: .5rem; padding: .75rem; }
  @media print { button { display: none; } }
</style></head>
<body>
  <button onclick="window.print()">Imprimir / Guardar PDF</button>
  <h1>Informe Dual · ${esc(nombre)}</h1>
  <p>Porciones: <strong>${i.resumen.porcionesObjetivo}</strong> (base ${i.resumen.porcionesBase}) ·
     Confianza: <span class="badge ${i.confianza.nivel}">${i.confianza.nivel} (${i.confianza.score})</span></p>

  <h2>Resumen</h2>
  <div class="grid">
    <div class="card"><strong>${i.resumen.caloriasPorPorcion}</strong> kcal/porción</div>
    <div class="card"><strong>${i.resumen.proteinasPorPorcion}</strong> g proteínas/porción</div>
    <div class="card"><strong>${i.resumen.carbohidratosPorPorcion}</strong> g carbohidratos/porción</div>
    <div class="card"><strong>${i.resumen.grasasPorPorcion}</strong> g grasas/porción</div>
    <div class="card">Puntaje hildegardiano: <strong>${i.resumen.puntajeGlobal}/100</strong></div>
    <div class="card">Sello viriditas: <strong>${esc(i.resumen.selloViriditas)}</strong> · Apto enfermos: ${i.resumen.esAptoParaEnfermos ? 'sí' : 'no'}</div>
  </div>
  <p>Recomendación: <strong>${esc(i.resumen.recomendacion.replace(/_/g, ' '))}</strong></p>

  <h2>Científico</h2>
  <p>Peso crudo total: ${i.cientifico.pesoCrudoTotal_g} g · Peso cocido estimado: ${i.cientifico.pesoCocidoEstimado_g} g ·
     Rendimiento promedio: ${i.cientifico.factorRendimientoPromedio}</p>
  <p>Micronutrientes destacados: ${i.cientifico.micronutrientesDestacados.join(', ') || '—'}</p>

  <h2>Hildegardiano · factores</h2>
  <table><thead><tr><th>Factor</th><th>Puntos</th><th>Motivo</th></tr></thead>
    <tbody>${filasFactores || '<tr><td colspan="3">Sin factores</td></tr>'}</tbody></table>

  <h2>Ingredientes (escalados)</h2>
  <table><thead><tr><th>Ingrediente</th><th>Cantidad</th><th>Temperamento</th><th>Subtilitat</th><th>Viriditas</th><th>Rol</th></tr></thead>
    <tbody>${filasIngredientes}</tbody></table>

  <h2>Alérgenos</h2>
  <p>Nivel de riesgo: <strong>${esc(i.alergenos.nivelRiesgo)}</strong> · Presentes: ${i.alergenos.presentes.join(', ') || 'ninguno'}</p>

  ${i.advertenciasCoccion.length ? `<h2>Advertencias de cocción</h2><ul>${i.advertenciasCoccion.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}

  <h2>Recomendaciones</h2>
  <ul>
    ${[...i.recomendaciones.preparacion, ...i.recomendaciones.consumo, ...i.recomendaciones.maridaje]
      .map((r) => `<li>${esc(r)}</li>`)
      .join('')}
  </ul>
</body></html>`;
}

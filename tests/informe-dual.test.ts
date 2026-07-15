import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  construirInformeDual,
  viriditasANumero,
  selloDesdePromedio,
  impactoMetodoCoccion,
  type IngredienteInforme,
  type RecetaInforme,
} from '../src/lib/informe-dual';

// Fecha fija (invierno en hemisferio sur) para estabilizar la estacionalidad.
const FECHA_INVIERNO = new Date('2026-07-15T12:00:00');

function ing(nombre: string, extra: Partial<IngredienteInforme> = {}): IngredienteInforme {
  return {
    nombre,
    categoria: 'general',
    temperamento: 'calido',
    nivel_subtilitat: 6,
    viriditas_index: 'alto',
    apto_para_enfermos: true,
    calorias: 100,
    proteinas_g: 5,
    carbohidratos_g: 15,
    grasas_g: 3,
    fibra_g: 2,
    ...extra,
  };
}

function ri(cantidad: number, unidad: string, ingrediente: IngredienteInforme) {
  return { cantidad, unidad, ingrediente };
}

test('viriditasANumero mapea las categorías al valor esperado', () => {
  assert.equal(viriditasANumero('maximo'), 9);
  assert.equal(viriditasANumero('nulo'), 1);
  assert.equal(viriditasANumero(undefined), 5);
});

test('selloDesdePromedio mapea rangos correctamente', () => {
  assert.equal(selloDesdePromedio(9), 'maximo');
  assert.equal(selloDesdePromedio(7.5), 'alto');
  assert.equal(selloDesdePromedio(2), 'nulo');
});

test('impactoMetodoCoccion penaliza crudo cuando se requiere cocción', () => {
  assert.equal(impactoMetodoCoccion('hervido', false), 5);
  assert.equal(impactoMetodoCoccion('salteado', false), -10);
  assert.equal(impactoMetodoCoccion('crudo', true), -20);
  assert.equal(impactoMetodoCoccion('crudo', false), 0);
});

test('Receta 1: Tarta de Espinaca y Espelta -> muy recomendada', () => {
  const receta: RecetaInforme = {
    nombre: 'Tarta de Espinaca y Espelta',
    porciones_base: 4,
    metodo_coccion_principal: 'horneado',
    ingredientes: [
      ri(300, 'gramos', ing('Harina de espelta', {
        es_base_alegria: true,
        nivel_subtilitat: 9,
        viriditas_index: 'maximo',
        estacion_ideal: 'todas',
      })),
      ri(400, 'gramos', ing('Espinaca', {
        requiere_coccion: true,
        factor_rendimiento_coccion: 0.3,
        viriditas_index: 'alto',
        estacion_ideal: 'invierno',
        impacto_livor: 'limpia',
      })),
      ri(150, 'gramos', ing('Ricota', { viriditas_index: 'moderado', alergenos: ['lacteos'] })),
    ],
  };

  const informe = construirInformeDual(receta, 4, FECHA_INVIERNO);
  assert.ok(informe.resumen.puntajeGlobal >= 75, `puntaje ${informe.resumen.puntajeGlobal}`);
  assert.ok(['muy_recomendado', 'recomendado'].includes(informe.resumen.recomendacion));
  assert.equal(informe.alergenos.presentes.includes('lacteos'), true);
  assert.equal(informe.alergenos.nivelRiesgo, 'bajo');
});

test('Receta 2: con Cerdo (veneno) -> puntaje 0 y rechazada', () => {
  const receta: RecetaInforme = {
    nombre: 'Pasta con Tomate y Cerdo',
    porciones_base: 4,
    metodo_coccion_principal: 'hervido',
    ingredientes: [
      ri(300, 'gramos', ing('Pasta', { viriditas_index: 'moderado', alergenos: ['gluten'] })),
      ri(200, 'gramos', ing('Tomate', { impacto_bilis_negra: 'aumenta' })),
      ri(250, 'gramos', ing('Cerdo', {
        es_veneno_hildegardiano: true,
        propiedades_hildegardianas: 'Prohibida: alimenta enfermedades graves',
      })),
    ],
  };

  const informe = construirInformeDual(receta, 4, FECHA_INVIERNO);
  assert.equal(informe.resumen.puntajeGlobal, 0);
  assert.equal(informe.resumen.recomendacion, 'rechazado');
  assert.equal(informe.resumen.esAptoParaEnfermos, false);
  // gluten es alérgeno mayor -> riesgo alto
  assert.equal(informe.alergenos.nivelRiesgo, 'alto');
  assert.ok(informe.alternativasSanas.some((a) => a.ingredienteOriginal === 'Cerdo'));
});

test('Receta 3: Caldo de Huesos con Verduras (hervido) -> muy recomendada', () => {
  const receta: RecetaInforme = {
    nombre: 'Caldo de Huesos con Verduras',
    porciones_base: 4,
    metodo_coccion_principal: 'hervido',
    ingredientes: [
      ri(500, 'gramos', ing('Huesos de vaca', { viriditas_index: 'alto', nivel_subtilitat: 8 })),
      ri(200, 'gramos', ing('Hinojo', {
        es_base_alegria: true,
        viriditas_index: 'maximo',
        nivel_subtilitat: 9,
        impacto_livor: 'limpia',
        estacion_ideal: 'invierno',
      })),
      ri(150, 'gramos', ing('Zanahoria', {
        requiere_coccion: true,
        factor_rendimiento_coccion: 0.8,
        viriditas_index: 'alto',
        estacion_ideal: 'invierno',
      })),
    ],
  };

  const informe = construirInformeDual(receta, 4, FECHA_INVIERNO);
  assert.ok(informe.resumen.puntajeGlobal >= 80, `puntaje ${informe.resumen.puntajeGlobal}`);
  assert.equal(informe.resumen.recomendacion, 'muy_recomendado');
  assert.equal(informe.metodoCoccion.impactoPuntaje, 5);
  // todos con estación de invierno cargada están en temporada
  assert.equal(informe.estacionalidad.porcentajeTemporada, 100);
});

test('Escalado 4 -> 1 divide las cantidades escaladas del detalle', () => {
  const receta: RecetaInforme = {
    porciones_base: 4,
    metodo_coccion_principal: 'horneado',
    ingredientes: [ri(400, 'gramos', ing('Harina de espelta', { es_base_alegria: true }))],
  };
  const cuatro = construirInformeDual(receta, 4, FECHA_INVIERNO);
  const uno = construirInformeDual(receta, 1, FECHA_INVIERNO);
  assert.equal(cuatro.detalleIngredientes[0].cantidadEscalada, '400 gramos');
  assert.equal(uno.detalleIngredientes[0].cantidadEscalada, '100 gramos');
  // Las calorías por porción se mantienen estables al escalar.
  assert.equal(cuatro.resumen.caloriasPorPorcion, uno.resumen.caloriasPorPorcion);
});

test('Confianza baja cuando falta peso cocido y datos hildegardianos', () => {
  const receta: RecetaInforme = {
    porciones_base: 4,
    ingredientes: [ri(100, 'gramos', { nombre: 'Ingrediente X', temperamento: null } as IngredienteInforme)],
  };
  const informe = construirInformeDual(receta, 4, FECHA_INVIERNO);
  assert.ok(informe.confianza.score < 80);
  assert.ok(informe.confianza.motivos.length > 0);
});

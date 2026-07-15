import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  escalarIngrediente,
  factorEscala,
  redondearCulinario,
  validarEscalado,
} from '../src/lib/escalado';

test('factorEscala calcula la proporción objetivo/base', () => {
  assert.equal(factorEscala(1, 4), 0.25);
  assert.equal(factorEscala(8, 4), 2);
  assert.equal(factorEscala(4, 4), 1);
});

test('factorEscala usa base 4 cuando la base es inválida', () => {
  assert.equal(factorEscala(2, 0), 0.5);
});

test('escalado lineal 4 -> 1 divide entre 4', () => {
  const r = escalarIngrediente({
    cantidadBase: 400,
    unidad: 'gramos',
    porcionesObjetivo: 1,
    porcionesBase: 4,
    categoria: 'lineal',
  });
  assert.equal(r.cantidadCalculada, 100);
  assert.equal(r.cantidadMostrada, 100);
});

test('escalado sublineal usa raíz del factor (sal/especias)', () => {
  const r = escalarIngrediente({
    cantidadBase: 4,
    unidad: 'gramos',
    porcionesObjetivo: 16,
    porcionesBase: 4,
    categoria: 'sublineal',
  });
  // factor = 4, sqrt(4) = 2 -> 4 * 2 = 8
  assert.equal(r.cantidadCalculada, 8);
});

test('escalado constante_minima respeta el mínimo', () => {
  const r = escalarIngrediente({
    cantidadBase: 1,
    unidad: 'diente',
    porcionesObjetivo: 1,
    porcionesBase: 4,
    categoria: 'constante_minima',
  });
  // lineal daría 0.25 pero el mínimo (cantidadBase=1) manda
  assert.equal(r.cantidadCalculada, 1);
});

test('redondeo de piezas usa fracciones cómodas', () => {
  const r = redondearCulinario(0.24, 'unidad', 'pieza');
  assert.equal(r.cantidadMostrada, 0.25);
});

test('fracción extrema se detecta en piezas muy pequeñas', () => {
  const r = escalarIngrediente({
    cantidadBase: 0.2,
    unidad: 'unidad',
    porcionesObjetivo: 1,
    porcionesBase: 4,
    categoria: 'lineal',
  });
  // 0.2 * 0.25 = 0.05 -> extrema
  assert.equal(r.fraccionExtrema, true);
});

test('validarEscalado bloquea porciones objetivo 0', () => {
  const v = validarEscalado(0, 4);
  assert.equal(v.valido, false);
  assert.ok(v.advertencias.length > 0);
});

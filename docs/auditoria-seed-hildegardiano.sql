-- ==========================================
-- AUDITORIA: Verificar nombres del script vs tabla real
-- ==========================================

WITH nombres_script AS (
  SELECT unnest(ARRAY[
    'palitos de madera o metal',
    'jugo de manzana',
    'vino rosado',
    'carne de vaca (filetes finos)',
    'carne de vaca (lomo o roast beef)',
    'carne de vaca (palomita o roast beef)',
    'carne de vaca (tapa de asado, roast beef o vacio)',
    'carne de vaca con hueso (ossobuco o falda)',
    'carne de vaca picada',
    'carne de vaca picada (bola de lomo o nalga)',
    'carne de vaca picada magra (bola de lomo o nalga)',
    'lomo de vaca',
    'lomo de vaca (para croquetas)',
    'peceto de vaca',
    'riñones de vaca',
    'chorizos de vaca',
    'pata de vaca (o ternera)',
    'lomo de vaca o pechuga de pollo (opcional)',
    'cebada',
    'centeno',
    'fideos de trigo comun',
    'harina de trigo comun',
    'harina trigo 000',
    'pan de trigo comun',
    'pan rallado trigo',
    'pasta de trigo comun',
    'vainillas comunes',
    'creatina',
    'yerba mate',
    'ketchup',
    'mayonesa',
    'salame',
    'jamón cocido',
    'mejillones (carne sin valva)',
    'palta',
    'salsa césar',
    'salsa golf',
    'sal',
    'salvia',
    'oregano',
    'nueces de nogal',
    'nueces pecan',
    'levadura fresca',
    'aceite de girasol o mantequilla (para cocinar)',
    'mantequilla de vaca o aceite de girasol',
    'mantequilla (para masa)',
    'mantequilla de vaca',
    'apio (cocido)',
    'caldo de verduras',
    'zucchinis'
  ]) AS nombre_esperado
)
SELECT
  ns.nombre_esperado,
  CASE
    WHEN i.nombre IS NULL THEN 'NO EXISTE'
    ELSE 'EXISTE'
  END AS estado,
  i.nombre AS nombre_real,
  i.categoria
FROM nombres_script ns
LEFT JOIN ingredientes i ON i.nombre ILIKE ns.nombre_esperado
ORDER BY estado, ns.nombre_esperado;

-- ==========================================
-- AUDITORIA: Verificar que las categorias del script existan
-- ==========================================

SELECT DISTINCT categoria
FROM ingredientes
WHERE categoria IN (
  'granos', 'verduras', 'frutas', 'carnes', 'pescados',
  'lacteos', 'huevos', 'frutos_secos', 'especias', 'hierbas',
  'bebidas', 'aceites', 'endulzantes', 'condimentos', 'legumbres'
)
ORDER BY categoria;

-- ==========================================
-- AUDITORIA EXTRA: Patrones amplios que pueden dar falsos positivos
-- ==========================================

SELECT nombre, categoria
FROM ingredientes
WHERE nombre ILIKE '%pollo%'
ORDER BY nombre;

-- ==========================================
-- MIGRACION 0006: Seed de Campos Hildegardianos
-- ==========================================

BEGIN;

-- ==========================================
-- PARTE 1: Completar estacion_ideal y viriditas_index por categoria
-- (Cubre ~470 ingredientes automaticamente)
-- ==========================================

-- GRANOS
UPDATE ingredientes SET
  estacion_ideal = CASE
    WHEN nombre ILIKE '%espelta%' THEN 'todas'
    WHEN nombre ILIKE '%trigo comun%' OR nombre ILIKE '%harina trigo%' OR nombre ILIKE '%fideos%' OR nombre ILIKE '%pasta%' OR nombre ILIKE '%pan de trigo%' OR nombre ILIKE '%pan rallado%' OR nombre ILIKE '%vainilla%' THEN 'ninguna'
    WHEN nombre ILIKE '%mijo%' OR nombre ILIKE '%polenta%' OR nombre ILIKE '%trigo sarraceno%' THEN 'ninguna'
    ELSE 'invierno'
  END,
  viriditas_index = CASE
    WHEN es_veneno_hildegardiano = true THEN 'nulo'
    WHEN nombre ILIKE '%espelta%' THEN 'maximo'
    WHEN nivel_subtilitat >= 7 THEN 'alto'
    WHEN nivel_subtilitat >= 4 THEN 'moderado'
    ELSE 'bajo'
  END
WHERE categoria = 'granos' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- VERDURAS
UPDATE ingredientes SET
  estacion_ideal = CASE
    WHEN nombre ILIKE '%calabaza%' OR nombre ILIKE '%zapallo%' OR nombre ILIKE '%zapallito%' OR nombre ILIKE '%zucchini%' THEN 'otono'
    WHEN nombre ILIKE '%zanahoria%' OR nombre ILIKE '%nabo%' OR nombre ILIKE '%remolacha%' THEN 'invierno'
    WHEN nombre ILIKE '%tomate%' OR nombre ILIKE '%morr%' OR nombre ILIKE '%pepino%' THEN 'verano'
    WHEN nombre ILIKE '%lechuga%' OR nombre ILIKE '%espinaca%' OR nombre ILIKE '%acelga%' OR nombre ILIKE '%escarola%' THEN 'primavera'
    WHEN nombre ILIKE '%cebolla%' OR nombre ILIKE '%ajo%' OR nombre ILIKE '%puerro%' THEN 'invierno'
    WHEN nombre ILIKE '%choclo%' OR nombre ILIKE '%batata%' OR nombre ILIKE '%berenjena%' THEN 'ninguna'
    ELSE 'todas'
  END,
  viriditas_index = CASE
    WHEN es_veneno_hildegardiano = true THEN 'nulo'
    WHEN nivel_subtilitat >= 8 THEN 'alto'
    WHEN nivel_subtilitat >= 5 THEN 'moderado'
    ELSE 'bajo'
  END
WHERE categoria = 'verduras' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- FRUTAS
UPDATE ingredientes SET
  estacion_ideal = CASE
    WHEN nombre ILIKE '%limon%' OR nombre ILIKE '%naranja%' OR nombre ILIKE '%mandarina%' OR nombre ILIKE '%pomelo%' THEN 'invierno'
    WHEN nombre ILIKE '%cereza%' OR nombre ILIKE '%frambuesa%' OR nombre ILIKE '%mora%' THEN 'verano'
    WHEN nombre ILIKE '%manzana%' OR nombre ILIKE '%pera%' OR nombre ILIKE '%membrillo%' OR nombre ILIKE '%uva%' THEN 'otono'
    WHEN nombre ILIKE '%durazno%' OR nombre ILIKE '%damasco%' OR nombre ILIKE '%pelon%' OR nombre ILIKE '%ciruela%' THEN 'verano'
    WHEN nombre ILIKE '%higo%' THEN 'otono'
    WHEN nombre ILIKE '%melon%' OR nombre ILIKE '%sandia%' OR nombre ILIKE '%banana%' OR nombre ILIKE '%kiwi%' OR nombre ILIKE '%mango%' THEN 'ninguna'
    ELSE 'otono'
  END,
  viriditas_index = CASE
    WHEN es_veneno_hildegardiano = true THEN 'nulo'
    WHEN nivel_subtilitat >= 9 THEN 'maximo'
    WHEN nivel_subtilitat >= 7 THEN 'alto'
    WHEN nivel_subtilitat >= 4 THEN 'moderado'
    ELSE 'bajo'
  END
WHERE categoria = 'frutas' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- CARNES
UPDATE ingredientes SET
  estacion_ideal = CASE
    WHEN es_veneno_hildegardiano = true THEN 'ninguna'
    WHEN nombre ILIKE '%ciervo%' OR nombre ILIKE '%corzo%' THEN 'invierno'
    WHEN nombre ILIKE '%cordero%' THEN 'verano'
    WHEN nombre ILIKE '%pollo%' OR nombre ILIKE '%pechuga%' THEN 'todas'
    ELSE 'invierno'
  END,
  viriditas_index = CASE
    WHEN es_veneno_hildegardiano = true THEN 'nulo'
    WHEN nivel_subtilitat >= 9 THEN 'maximo'
    WHEN nivel_subtilitat >= 7 THEN 'alto'
    WHEN nivel_subtilitat >= 5 THEN 'moderado'
    ELSE 'bajo'
  END
WHERE categoria = 'carnes' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- PESCADOS
UPDATE ingredientes SET
  estacion_ideal = CASE
    WHEN es_veneno_hildegardiano = true THEN 'ninguna'
    ELSE 'invierno'
  END,
  viriditas_index = CASE
    WHEN es_veneno_hildegardiano = true THEN 'nulo'
    WHEN nivel_subtilitat >= 9 THEN 'maximo'
    WHEN nivel_subtilitat >= 7 THEN 'alto'
    WHEN nivel_subtilitat >= 5 THEN 'moderado'
    ELSE 'bajo'
  END
WHERE categoria = 'pescados' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- LACTEOS
UPDATE ingredientes SET
  estacion_ideal = 'todas',
  viriditas_index = CASE
    WHEN nivel_subtilitat >= 6 THEN 'moderado'
    ELSE 'bajo'
  END
WHERE categoria = 'lacteos' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- HUEVOS
UPDATE ingredientes SET
  estacion_ideal = 'primavera',
  viriditas_index = 'bajo'
WHERE categoria = 'huevos' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- FRUTOS SECOS
UPDATE ingredientes SET
  estacion_ideal = 'otono',
  viriditas_index = CASE
    WHEN nivel_subtilitat >= 8 THEN 'alto'
    WHEN nivel_subtilitat >= 5 THEN 'moderado'
    ELSE 'bajo'
  END
WHERE categoria = 'frutos_secos' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- ESPECIAS
UPDATE ingredientes SET
  estacion_ideal = 'invierno',
  viriditas_index = CASE
    WHEN nivel_subtilitat >= 8 THEN 'alto'
    WHEN nivel_subtilitat >= 5 THEN 'moderado'
    ELSE 'bajo'
  END
WHERE categoria = 'especias' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- HIERBAS
UPDATE ingredientes SET
  estacion_ideal = 'todas',
  viriditas_index = CASE
    WHEN nivel_subtilitat >= 8 THEN 'alto'
    WHEN nivel_subtilitat >= 5 THEN 'moderado'
    ELSE 'bajo'
  END
WHERE categoria = 'hierbas' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- BEBIDAS (incluye creatina, yerba mate, vino rosado)
UPDATE ingredientes SET
  estacion_ideal = CASE
    WHEN nombre ILIKE '%vino%' OR nombre ILIKE '%cerveza%' THEN 'invierno'
    WHEN nombre ILIKE '%agua%' THEN 'verano'
    WHEN nombre ILIKE '%infusion%' THEN 'invierno'
    WHEN nombre ILIKE '%jugo%' THEN 'todas'
    WHEN es_veneno_hildegardiano = true THEN 'ninguna'
    ELSE 'todas'
  END,
  viriditas_index = CASE
    WHEN es_veneno_hildegardiano = true THEN 'nulo'
    WHEN nivel_subtilitat >= 7 THEN 'alto'
    WHEN nivel_subtilitat >= 4 THEN 'moderado'
    ELSE 'bajo'
  END
WHERE categoria = 'bebidas' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- ACEITES
UPDATE ingredientes SET
  estacion_ideal = 'todas',
  viriditas_index = CASE
    WHEN es_veneno_hildegardiano = true THEN 'nulo'
    WHEN nivel_subtilitat >= 6 THEN 'moderado'
    ELSE 'bajo'
  END
WHERE categoria = 'aceites' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- ENDULZANTES
UPDATE ingredientes SET
  estacion_ideal = 'invierno',
  viriditas_index = CASE
    WHEN es_veneno_hildegardiano = true THEN 'nulo'
    WHEN nivel_subtilitat >= 5 THEN 'moderado'
    ELSE 'bajo'
  END
WHERE categoria = 'endulzantes' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- CONDIMENTOS
UPDATE ingredientes SET
  estacion_ideal = 'invierno',
  viriditas_index = CASE
    WHEN es_veneno_hildegardiano = true THEN 'nulo'
    WHEN nivel_subtilitat >= 4 THEN 'moderado'
    ELSE 'bajo'
  END
WHERE categoria = 'condimentos' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- LEGUMBRES
UPDATE ingredientes SET
  estacion_ideal = 'invierno',
  viriditas_index = CASE
    WHEN nivel_subtilitat >= 6 THEN 'moderado'
    ELSE 'bajo'
  END
WHERE categoria = 'legumbres' AND (estacion_ideal IS NULL OR viriditas_index IS NULL);

-- ==========================================
-- PARTE 2: Casos Especiales (6-10 campos faltantes)
-- ==========================================

-- PALITOS DE MADERA O METAL (10 campos faltantes)
UPDATE ingredientes SET
  temperamento = 'neutro',
  impacto_livor = 'neutro',
  estacion_ideal = 'ninguna',
  frecuencia_recomendada = 'prohibido',
  impacto_bilis_negra = 'neutro',
  viriditas_index = 'nulo',
  humor_principal = 'utensilio_no_alimento',
  beneficios_hildegardianos = 'N/A - Utensilio de cocina',
  propiedades_hildegardianas = 'No es un alimento, es un utensilio',
  contraindicaciones = 'N/A'
WHERE nombre = 'palitos de madera o metal';

-- JUGO DE MANZANA (4 campos faltantes)
UPDATE ingredientes SET
  temperamento = 'templado',
  beneficios_hildegardianos = 'Favorece la digestion, activa la salivacion y limpia el intestino. Fruto precocido por el rocio nocturno',
  propiedades_hildegardianas = 'Templado. Sutileza maxima. Proviene del rocio fuerte de la noche, posee una coccion natural que lo hace asimilable',
  contraindicaciones = 'Evitar tomarlo solo y en exceso si hay tendencia a flemas. Mezclar 1:1 con hinojo'
WHERE nombre = 'jugo de manzana';

-- VINO ROSADO (6 campos faltantes)
UPDATE ingredientes SET
  temperamento = 'calido',
  estacion_ideal = 'invierno',
  viriditas_index = 'moderado',
  beneficios_hildegardianos = 'Digestivo si se rebaja con agua. Sana y contenta al hombre',
  propiedades_hildegardianas = 'Calido. Sutileza media. No agita humores en exceso. Sana y contenta al hombre',
  contraindicaciones = 'En exceso seca la sangre. Siempre mezclar con agua'
WHERE nombre = 'vino rosado';

-- CARNES DE VACA (6 campos faltantes)
UPDATE ingredientes SET
  impacto_livor = 'genera',
  estacion_ideal = 'invierno',
  frecuencia_recomendada = 'ocasional',
  impacto_bilis_negra = 'aumenta',
  viriditas_index = 'moderado',
  humor_principal = 'carne_fria_que_enfria_organismo'
WHERE nombre IN (
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
  'lomo de vaca o pechuga de pollo (opcional)',
  'peceto de vaca',
  'riñones de vaca',
  'chorizos de vaca'
);

-- POLLO (carne calida aceptada)
UPDATE ingredientes SET
  impacto_livor = 'limpia',
  estacion_ideal = 'todas',
  frecuencia_recomendada = 'ocasional',
  impacto_bilis_negra = 'reduce',
  viriditas_index = 'alto',
  humor_principal = 'carne_calida_ligera'
WHERE nombre ILIKE '%pollo%';

-- GRANOS DE TRIGO REFINADO (veneno)
UPDATE ingredientes SET
  impacto_livor = 'genera',
  estacion_ideal = 'ninguna',
  frecuencia_recomendada = 'prohibido',
  impacto_bilis_negra = 'aumenta',
  viriditas_index = 'nulo',
  humor_principal = 'trigo_refinado_generador_de_moco'
WHERE nombre IN (
  'fideos de trigo comun',
  'harina de trigo comun',
  'harina trigo 000',
  'pan de trigo comun',
  'pan rallado trigo',
  'pasta de trigo comun',
  'vainillas comunes'
);

-- CEBADA Y CENTENO
UPDATE ingredientes SET
  impacto_livor = 'genera',
  estacion_ideal = 'invierno',
  frecuencia_recomendada = 'ocasional',
  impacto_bilis_negra = 'neutro',
  viriditas_index = 'bajo',
  humor_principal = 'cereal_debil_solo_para_decocciones'
WHERE nombre = 'cebada';

UPDATE ingredientes SET
  impacto_livor = 'neutro',
  estacion_ideal = 'invierno',
  frecuencia_recomendada = 'ocasional',
  impacto_bilis_negra = 'neutro',
  viriditas_index = 'moderado',
  humor_principal = 'reduce_exceso_de_grasa'
WHERE nombre = 'centeno';

-- VENENOS MODERNOS
UPDATE ingredientes SET
  impacto_livor = 'genera',
  estacion_ideal = 'ninguna',
  frecuencia_recomendada = 'prohibido',
  impacto_bilis_negra = 'aumenta',
  viriditas_index = 'nulo',
  humor_principal = 'veneno_moderno_sin_viriditas'
WHERE nombre IN (
  'creatina', 'yerba mate', 'ketchup', 'mayonesa', 'salame', 'jamón cocido',
  'mejillones (carne sin valva)', 'palta', 'salsa césar', 'salsa golf'
);

-- SAL (medicina)
UPDATE ingredientes SET
  impacto_livor = 'limpia',
  estacion_ideal = 'todas',
  frecuencia_recomendada = 'diario',
  impacto_bilis_negra = 'neutro',
  viriditas_index = 'alto',
  humor_principal = 'fortalece_interior_sin_sal_cuerpo_laxo'
WHERE nombre = 'sal' AND impacto_livor IS NULL;

-- SALVIA (planta maestra)
UPDATE ingredientes SET
  impacto_livor = 'limpia',
  estacion_ideal = 'todas',
  frecuencia_recomendada = 'medicinal',
  impacto_bilis_negra = 'reduce',
  viriditas_index = 'maximo',
  humor_principal = 'purifica_humores_y_aclara_la_mente'
WHERE nombre = 'salvia';

-- OREGANO (categoria: hierbas)
UPDATE ingredientes SET
  impacto_livor = 'limpia',
  estacion_ideal = 'invierno',
  frecuencia_recomendada = 'ocasional',
  impacto_bilis_negra = 'neutro',
  viriditas_index = 'bajo',
  humor_principal = 'toxico_si_se_consume_en_exceso'
WHERE nombre = 'oregano';

-- NUECES
UPDATE ingredientes SET
  impacto_livor = 'genera',
  estacion_ideal = 'otono',
  frecuencia_recomendada = 'ocasional',
  impacto_bilis_negra = 'reduce',
  viriditas_index = 'alto',
  humor_principal = 'engordan_y_alegran_pero_generan_moco'
WHERE nombre IN ('nueces de nogal', 'nueces pecan');

-- LEVADURA FRESCA (categoria: conservas)
UPDATE ingredientes SET
  impacto_livor = 'neutro',
  estacion_ideal = 'todas',
  frecuencia_recomendada = 'ocasional',
  impacto_bilis_negra = 'neutro',
  viriditas_index = 'alto',
  humor_principal = 'fermentacion_controlada_aceptada'
WHERE nombre = 'levadura fresca';

-- ACEITES Y MANTEQUILLAS
UPDATE ingredientes SET
  impacto_livor = 'limpia',
  estacion_ideal = 'todas',
  frecuencia_recomendada = 'ocasional',
  impacto_bilis_negra = 'neutro',
  viriditas_index = 'alto',
  humor_principal = 'grasa_nutre_cuerpo_y_nervios'
WHERE nombre IN (
  'aceite de girasol o mantequilla (para cocinar)',
  'mantequilla de vaca o aceite de girasol'
);

UPDATE ingredientes SET
  impacto_livor = 'limpia',
  estacion_ideal = 'todas',
  frecuencia_recomendada = 'ocasional',
  impacto_bilis_negra = 'reduce',
  viriditas_index = 'alto',
  humor_principal = 'base_alegria_y_confort'
WHERE nombre IN ('mantequilla (para masa)', 'mantequilla de vaca');

-- APIO COCIDO, CALDO DE VERDURAS, ZUCCHINIS
UPDATE ingredientes SET
  impacto_livor = 'limpia',
  estacion_ideal = 'invierno',
  frecuencia_recomendada = 'ocasional',
  impacto_bilis_negra = 'reduce',
  viriditas_index = 'alto',
  humor_principal = 'calma_nervios_y_drena_cuerpo'
WHERE nombre = 'apio (cocido)';

UPDATE ingredientes SET
  impacto_livor = 'limpia',
  estacion_ideal = 'todas',
  frecuencia_recomendada = 'diario',
  impacto_bilis_negra = 'reduce',
  viriditas_index = 'alto',
  humor_principal = 'base_de_curas_y_rehidratacion'
WHERE nombre = 'caldo de verduras';

UPDATE ingredientes SET
  impacto_livor = 'neutro',
  estacion_ideal = 'verano',
  frecuencia_recomendada = 'ocasional',
  impacto_bilis_negra = 'neutro',
  viriditas_index = 'moderado',
  humor_principal = 'hidrata_sin_danar_humores'
WHERE nombre = 'zucchinis';

COMMIT;

-- Verificacion final
SELECT
  COUNT(*) FILTER (WHERE estacion_ideal IS NULL) AS sin_estacion,
  COUNT(*) FILTER (WHERE viriditas_index IS NULL) AS sin_viriditas,
  COUNT(*) FILTER (WHERE temperamento IS NULL) AS sin_temperamento,
  COUNT(*) AS total_ingredientes
FROM ingredientes;

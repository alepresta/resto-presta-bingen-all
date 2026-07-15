-- ==========================================
-- PREFLIGHT: Conteo ANTES de ejecutar el seed
-- ==========================================
-- Ejecuta este bloque primero y anota los resultados

SELECT
  'PREFLIGHT' AS fase,
  COUNT(*) AS total_ingredientes,
  COUNT(*) FILTER (WHERE estacion_ideal IS NULL) AS sin_estacion,
  COUNT(*) FILTER (WHERE viriditas_index IS NULL) AS sin_viriditas,
  COUNT(*) FILTER (WHERE temperamento IS NULL) AS sin_temperamento,
  COUNT(*) FILTER (WHERE impacto_livor IS NULL) AS sin_livor,
  COUNT(*) FILTER (WHERE frecuencia_recomendada IS NULL) AS sin_frecuencia,
  COUNT(*) FILTER (WHERE impacto_bilis_negra IS NULL) AS sin_bilis,
  COUNT(*) FILTER (WHERE humor_principal IS NULL) AS sin_humor,
  COUNT(*) FILTER (WHERE beneficios_hildegardianos IS NULL) AS sin_beneficios,
  COUNT(*) FILTER (WHERE propiedades_hildegardianas IS NULL) AS sin_propiedades,
  COUNT(*) FILTER (WHERE contraindicaciones IS NULL) AS sin_contraindicaciones
FROM ingredientes;

-- ==========================================
-- [AQUI EJECUTAS EL 0006_seed_hildegardian_fields.sql]
-- ==========================================

-- ==========================================
-- POSTFLIGHT: Conteo DESPUES de ejecutar el seed
-- ==========================================
-- Ejecuta este bloque despues del 0006

SELECT
  'POSTFLIGHT' AS fase,
  COUNT(*) AS total_ingredientes,
  COUNT(*) FILTER (WHERE estacion_ideal IS NULL) AS sin_estacion,
  COUNT(*) FILTER (WHERE viriditas_index IS NULL) AS sin_viriditas,
  COUNT(*) FILTER (WHERE temperamento IS NULL) AS sin_temperamento,
  COUNT(*) FILTER (WHERE impacto_livor IS NULL) AS sin_livor,
  COUNT(*) FILTER (WHERE frecuencia_recomendada IS NULL) AS sin_frecuencia,
  COUNT(*) FILTER (WHERE impacto_bilis_negra IS NULL) AS sin_bilis,
  COUNT(*) FILTER (WHERE humor_principal IS NULL) AS sin_humor,
  COUNT(*) FILTER (WHERE beneficios_hildegardianos IS NULL) AS sin_beneficios,
  COUNT(*) FILTER (WHERE propiedades_hildegardianas IS NULL) AS sin_propiedades,
  COUNT(*) FILTER (WHERE contraindicaciones IS NULL) AS sin_contraindicaciones
FROM ingredientes;

-- ==========================================
-- AUDITORIA FINAL: Ingredientes aun incompletos
-- ==========================================
-- Si quedan NULLs, esta query te dice exactamente cuales

SELECT
  nombre,
  categoria,
  CASE
    WHEN estacion_ideal IS NULL THEN 'estacion_ideal, '
    ELSE ''
  END ||
  CASE
    WHEN viriditas_index IS NULL THEN 'viriditas_index, '
    ELSE ''
  END ||
  CASE
    WHEN impacto_livor IS NULL THEN 'impacto_livor, '
    ELSE ''
  END ||
  CASE
    WHEN frecuencia_recomendada IS NULL THEN 'frecuencia_recomendada, '
    ELSE ''
  END ||
  CASE
    WHEN impacto_bilis_negra IS NULL THEN 'impacto_bilis_negra, '
    ELSE ''
  END ||
  CASE
    WHEN humor_principal IS NULL THEN 'humor_principal, '
    ELSE ''
  END AS campos_faltantes
FROM ingredientes
WHERE
  estacion_ideal IS NULL OR
  viriditas_index IS NULL OR
  impacto_livor IS NULL OR
  frecuencia_recomendada IS NULL OR
  impacto_bilis_negra IS NULL OR
  humor_principal IS NULL
ORDER BY categoria, nombre;

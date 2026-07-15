BEGIN;

-- 1) Ingredientes: factor de rendimiento por coccion
ALTER TABLE ingredientes
ADD COLUMN IF NOT EXISTS factor_rendimiento_coccion DECIMAL(5,2) NOT NULL DEFAULT 1.0;

ALTER TABLE ingredientes
ADD CONSTRAINT ingredientes_factor_rendimiento_coccion_chk
CHECK (factor_rendimiento_coccion > 0)
NOT VALID;

-- 2) Ingredientes: categoria de escalado para porciones
ALTER TABLE ingredientes
ADD COLUMN IF NOT EXISTS categoria_escalado VARCHAR(20) NOT NULL DEFAULT 'lineal';

ALTER TABLE ingredientes
ADD CONSTRAINT ingredientes_categoria_escalado_chk
CHECK (categoria_escalado IN ('lineal', 'sublineal', 'constante_minima'))
NOT VALID;

-- 3) Recetas: campos base para porciones y coccion
ALTER TABLE recetas
ADD COLUMN IF NOT EXISTS porciones_base INTEGER NOT NULL DEFAULT 4,
ADD COLUMN IF NOT EXISTS peso_crudo_total_g DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS peso_cocido_total_g DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS metodo_coccion_principal VARCHAR(20) NOT NULL DEFAULT 'horneado';

ALTER TABLE recetas
ADD CONSTRAINT recetas_porciones_base_chk
CHECK (porciones_base >= 1)
NOT VALID;

ALTER TABLE recetas
ADD CONSTRAINT recetas_metodo_coccion_principal_chk
CHECK (metodo_coccion_principal IN ('hervido', 'horneado', 'salteado', 'crudo', 'vapor'))
NOT VALID;

-- 4) Backfill inicial orientativo para rendimiento/categoria
UPDATE ingredientes
SET factor_rendimiento_coccion = 0.30,
    categoria_escalado = 'lineal'
WHERE nombre ILIKE '%espinaca%'
   OR nombre ILIKE '%acelga%';

UPDATE ingredientes
SET factor_rendimiento_coccion = 0.75,
    categoria_escalado = 'lineal'
WHERE categoria = 'carnes'
  AND COALESCE(es_veneno_hildegardiano, false) = false;

UPDATE ingredientes
SET factor_rendimiento_coccion = 3.00,
    categoria_escalado = 'lineal'
WHERE nombre ILIKE '%arroz%';

UPDATE ingredientes
SET factor_rendimiento_coccion = 1.00,
    categoria_escalado = 'lineal'
WHERE nombre ILIKE '%espelta%';

UPDATE ingredientes
SET categoria_escalado = 'sublineal'
WHERE (categoria IN ('especias', 'condimentos') AND nombre ILIKE '%sal%')
   OR nombre ILIKE '%pimienta%';

UPDATE ingredientes
SET categoria_escalado = 'constante_minima'
WHERE nombre ILIKE '%pizca%'
   OR nombre ILIKE '%diente%';

-- 5) Validar constraints para datos existentes
ALTER TABLE ingredientes VALIDATE CONSTRAINT ingredientes_factor_rendimiento_coccion_chk;
ALTER TABLE ingredientes VALIDATE CONSTRAINT ingredientes_categoria_escalado_chk;
ALTER TABLE recetas VALIDATE CONSTRAINT recetas_porciones_base_chk;
ALTER TABLE recetas VALIDATE CONSTRAINT recetas_metodo_coccion_principal_chk;

COMMIT;

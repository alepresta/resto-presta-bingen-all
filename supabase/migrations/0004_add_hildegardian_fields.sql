-- ==========================================
-- MIGRACION: Campos Hildegardianos Completos
-- ==========================================

BEGIN;

-- 1. Agregar columnas si no existen
ALTER TABLE public.ingredientes
ADD COLUMN IF NOT EXISTS temperamento VARCHAR(50),
ADD COLUMN IF NOT EXISTS nivel_subtilitat INTEGER,
ADD COLUMN IF NOT EXISTS es_veneno_hildegardiano BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS es_base_alegria BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requiere_coccion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS impacto_livor VARCHAR(50),
ADD COLUMN IF NOT EXISTS estacion_ideal VARCHAR(50),
ADD COLUMN IF NOT EXISTS frecuencia_recomendada VARCHAR(50),
ADD COLUMN IF NOT EXISTS apto_para_enfermos BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS impacto_bilis_negra VARCHAR(50),
ADD COLUMN IF NOT EXISTS viriditas_index VARCHAR(50),
ADD COLUMN IF NOT EXISTS humor_principal VARCHAR(100),
ADD COLUMN IF NOT EXISTS beneficios_hildegardianos TEXT,
ADD COLUMN IF NOT EXISTS propiedades_hildegardianas TEXT,
ADD COLUMN IF NOT EXISTS contraindicaciones TEXT,
ADD COLUMN IF NOT EXISTS alergenos TEXT[] DEFAULT '{}';

-- 2. Establecer valores por defecto seguros para evitar NULLs futuros
ALTER TABLE public.ingredientes
ALTER COLUMN es_veneno_hildegardiano SET DEFAULT false,
ALTER COLUMN es_base_alegria SET DEFAULT false,
ALTER COLUMN requiere_coccion SET DEFAULT false,
ALTER COLUMN apto_para_enfermos SET DEFAULT true,
ALTER COLUMN alergenos SET DEFAULT '{}';

-- 3. Eliminar constraints antiguos si existen
ALTER TABLE public.ingredientes DROP CONSTRAINT IF EXISTS ingredientes_temperamento_check;
ALTER TABLE public.ingredientes DROP CONSTRAINT IF EXISTS ingredientes_nivel_subtilitat_check;
ALTER TABLE public.ingredientes DROP CONSTRAINT IF EXISTS ingredientes_impacto_livor_check;
ALTER TABLE public.ingredientes DROP CONSTRAINT IF EXISTS ingredientes_impacto_bilis_negra_check;
ALTER TABLE public.ingredientes DROP CONSTRAINT IF EXISTS ingredientes_frecuencia_check;
ALTER TABLE public.ingredientes DROP CONSTRAINT IF EXISTS ingredientes_viriditas_check;
ALTER TABLE public.ingredientes DROP CONSTRAINT IF EXISTS ingredientes_estacion_ideal_check;

-- 4. Agregar constraints nuevos y robustos
ALTER TABLE public.ingredientes
ADD CONSTRAINT ingredientes_temperamento_check
CHECK (
  temperamento IS NULL OR temperamento IN (
    'calido', 'frio', 'templado', 'neutro', 'frio_suave', 'calido_suave',
    'calido_seco', 'calido_humedo', 'frio_seco', 'frio_humedo'
  )
);

ALTER TABLE public.ingredientes
ADD CONSTRAINT ingredientes_nivel_subtilitat_check
CHECK (nivel_subtilitat IS NULL OR (nivel_subtilitat >= 0 AND nivel_subtilitat <= 10));

ALTER TABLE public.ingredientes
ADD CONSTRAINT ingredientes_impacto_livor_check
CHECK (impacto_livor IS NULL OR impacto_livor IN ('limpia', 'genera', 'neutro'));

ALTER TABLE public.ingredientes
ADD CONSTRAINT ingredientes_impacto_bilis_negra_check
CHECK (impacto_bilis_negra IS NULL OR impacto_bilis_negra IN ('reduce', 'aumenta', 'neutro'));

ALTER TABLE public.ingredientes
ADD CONSTRAINT ingredientes_frecuencia_check
CHECK (
  frecuencia_recomendada IS NULL OR frecuencia_recomendada IN (
    'diario', 'ocasional', 'medicinal', 'prohibido'
  )
);

ALTER TABLE public.ingredientes
ADD CONSTRAINT ingredientes_viriditas_check
CHECK (
  viriditas_index IS NULL OR viriditas_index IN (
    'maximo', 'alto', 'moderado', 'bajo', 'nulo'
  )
);

ALTER TABLE public.ingredientes
ADD CONSTRAINT ingredientes_estacion_ideal_check
CHECK (
  estacion_ideal IS NULL OR estacion_ideal IN (
    'invierno', 'otonio', 'primavera', 'verano', 'todas', 'ninguna'
  )
);

-- 5. Crear indices GIN para busquedas rapidas
CREATE INDEX IF NOT EXISTS idx_ingredientes_alergenos
ON public.ingredientes USING GIN (alergenos);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ingredientes'
      AND column_name = 'tags'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ingredientes_tags ON public.ingredientes USING GIN (tags)';
  END IF;
END $$;

COMMIT;

SELECT 'OK: migracion hildegardiana completada' AS status;

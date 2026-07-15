-- ==========================================
-- MIGRACION 0005: Funcion de Evaluacion Hildegardiana
-- ==========================================

-- 1. Crear la funcion que evalua un ingrediente segun el perfil del usuario
CREATE OR REPLACE FUNCTION public.evaluar_alimento_hildegardiano(
  p_ingrediente_id UUID,
  p_usuario_enfermo BOOLEAN DEFAULT false,
  p_estacion_actual TEXT DEFAULT 'todas',
  p_esta_cocido BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  v_alimento RECORD;
  v_puntaje INTEGER := 50;
  v_advertencias JSONB := '[]'::JSONB;
  v_instrucciones JSONB := '[]'::JSONB;
  v_recomendacion TEXT;
  v_mensaje TEXT;
BEGIN
  SELECT * INTO v_alimento
  FROM public.ingredientes
  WHERE id = p_ingrediente_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'recomendacion', 'error',
      'puntaje', 0,
      'advertencias', jsonb_build_array('Ingrediente no encontrado'),
      'instrucciones', '[]'::jsonb,
      'mensaje', 'ID de ingrediente invalido'
    );
  END IF;

  -- 1) Seguridad absoluta: venenos de la cocina
  IF v_alimento.es_veneno_hildegardiano = true THEN
    RETURN jsonb_build_object(
      'recomendacion', 'rechazado',
      'puntaje', 0,
      'advertencias', jsonb_build_array('Veneno de la cocina (Kuchengifte)'),
      'instrucciones', '[]'::jsonb,
      'mensaje', COALESCE(v_alimento.contraindicaciones, 'Totalmente rechazado por Santa Hildegarda')
    );
  END IF;

  -- 1.5) Frecuencia prohibida
  IF v_alimento.frecuencia_recomendada = 'prohibido' THEN
    RETURN jsonb_build_object(
      'recomendacion', 'rechazado',
      'puntaje', 0,
      'advertencias', jsonb_build_array('Uso prohibido por Discretio'),
      'instrucciones', '[]'::jsonb,
      'mensaje', COALESCE(v_alimento.contraindicaciones, 'No apto para consumo')
    );
  END IF;

  -- 2) Estado de salud del usuario
  IF p_usuario_enfermo = true AND v_alimento.apto_para_enfermos = false THEN
    v_puntaje := v_puntaje - 25;
    v_advertencias := v_advertencias || jsonb_build_array('No apto para estados de enfermedad');
  END IF;

  IF v_alimento.contraindicaciones IS NOT NULL AND trim(v_alimento.contraindicaciones) <> '' THEN
    v_puntaje := v_puntaje - 10;
    v_advertencias := v_advertencias || jsonb_build_array(v_alimento.contraindicaciones);
  END IF;

  -- 3) Preparacion y neutralizacion
  IF v_alimento.requiere_coccion = true THEN
    IF p_esta_cocido = false THEN
      v_puntaje := v_puntaje - 20;
      v_instrucciones := v_instrucciones || jsonb_build_array('Debe cocerse para neutralizar humores nocivos');
    ELSE
      v_puntaje := v_puntaje + 10;
    END IF;
  END IF;

  -- 4) Estacion y temperamento
  IF p_estacion_actual = 'invierno' AND v_alimento.temperamento IN ('frio', 'frio_humedo', 'frio_seco') THEN
    v_puntaje := v_puntaje - 15;
    v_instrucciones := v_instrucciones || jsonb_build_array('Anadir especias calidas como galanga, canela o nuez moscada');
  END IF;

  IF p_estacion_actual = 'verano' AND v_alimento.temperamento IN ('calido', 'calido_seco', 'calido_humedo') THEN
    v_puntaje := v_puntaje - 10;
    v_instrucciones := v_instrucciones || jsonb_build_array('Consumir con moderacion en verano para no sobrecalentar');
  END IF;

  IF v_alimento.estacion_ideal = p_estacion_actual OR v_alimento.estacion_ideal = 'todas' THEN
    v_puntaje := v_puntaje + 5;
  ELSIF v_alimento.estacion_ideal IS NOT NULL
    AND v_alimento.estacion_ideal <> 'ninguna'
    AND v_alimento.estacion_ideal <> p_estacion_actual THEN
    v_puntaje := v_puntaje - 5;
  END IF;

  -- 5) Vigor, alegria y subtilitat
  v_puntaje := v_puntaje + (COALESCE(v_alimento.nivel_subtilitat, 0) * 2);

  IF v_alimento.es_base_alegria = true THEN
    v_puntaje := v_puntaje + 15;
  END IF;

  IF v_alimento.impacto_bilis_negra = 'reduce' THEN
    v_puntaje := v_puntaje + 10;
  ELSIF v_alimento.impacto_bilis_negra = 'aumenta' THEN
    v_puntaje := v_puntaje - 10;
  END IF;

  IF v_alimento.impacto_livor = 'limpia' THEN
    v_puntaje := v_puntaje + 10;
  ELSIF v_alimento.impacto_livor = 'genera' THEN
    v_puntaje := v_puntaje - 10;
  END IF;

  IF v_alimento.viriditas_index = 'maximo' THEN
    v_puntaje := v_puntaje + 10;
  ELSIF v_alimento.viriditas_index = 'alto' THEN
    v_puntaje := v_puntaje + 5;
  ELSIF v_alimento.viriditas_index = 'nulo' THEN
    v_puntaje := v_puntaje - 15;
  END IF;

  -- 6) Discretio y frecuencia
  IF v_alimento.frecuencia_recomendada = 'medicinal' THEN
    v_puntaje := v_puntaje - 5;
    v_advertencias := v_advertencias || jsonb_build_array('Solo para uso medicinal, no diario');
  ELSIF v_alimento.frecuencia_recomendada = 'diario' THEN
    v_puntaje := v_puntaje + 5;
  END IF;

  v_puntaje := GREATEST(0, LEAST(100, v_puntaje));

  IF v_puntaje >= 80 THEN
    v_recomendacion := 'muy_recomendado';
  ELSIF v_puntaje >= 60 THEN
    v_recomendacion := 'recomendado';
  ELSIF v_puntaje >= 40 THEN
    v_recomendacion := 'con_precaucion';
  ELSE
    v_recomendacion := 'desaconsejado';
  END IF;

  v_mensaje := COALESCE(
    NULLIF(trim(v_alimento.beneficios_hildegardianos), ''),
    NULLIF(trim(v_alimento.propiedades_hildegardianas), ''),
    'Sin descripcion disponible'
  );

  RETURN jsonb_build_object(
    'recomendacion', v_recomendacion,
    'puntaje', v_puntaje,
    'advertencias', v_advertencias,
    'instrucciones', v_instrucciones,
    'mensaje', v_mensaje,
    'temperamento', v_alimento.temperamento,
    'viriditas_index', v_alimento.viriditas_index
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Wrapper para buscar por nombre (case-insensitive)
CREATE OR REPLACE FUNCTION public.evaluar_alimento_por_nombre(
  p_nombre_ingrediente TEXT,
  p_usuario_enfermo BOOLEAN DEFAULT false,
  p_estacion_actual TEXT DEFAULT 'todas',
  p_esta_cocido BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id
  FROM public.ingredientes
  WHERE nombre ILIKE p_nombre_ingrediente
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'recomendacion', 'error',
      'puntaje', 0,
      'advertencias', jsonb_build_array(format('Ingrediente "%s" no encontrado', p_nombre_ingrediente)),
      'instrucciones', '[]'::jsonb,
      'mensaje', 'Verifica el nombre del ingrediente'
    );
  END IF;

  RETURN public.evaluar_alimento_hildegardiano(v_id, p_usuario_enfermo, p_estacion_actual, p_esta_cocido);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

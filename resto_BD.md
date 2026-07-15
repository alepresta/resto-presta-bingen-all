## Table `dias_semana`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `nombre` | `text` |  |
| `tematica` | `text` |  |
| `descripcion` | `text` |  Nullable |

## Table `categorias_plato`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `nombre` | `text` |  |
| `descripcion` | `text` |  Nullable |
| `icono` | `text` |  Nullable |
| `orden` | `int4` |  Nullable |
| `disponible_todos_dias` | `bool` |  Nullable |
| `horario_inicio` | `time` |  Nullable |
| `horario_fin` | `time` |  Nullable |

## Table `restaurantes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `text` |  |
| `slug` | `text` |  Unique |
| `descripcion` | `text` |  Nullable |
| `logo` | `text` |  Nullable |
| `tagline` | `text` |  Nullable |
| `tema` | `jsonb` |  Nullable |
| `horario_apertura` | `time` |  Nullable |
| `horario_cierre` | `time` |  Nullable |
| `dias_operativos` | `_int4` |  Nullable |
| `telefono` | `text` |  Nullable |
| `direccion` | `text` |  Nullable |
| `instagram` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `filosofia` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `platos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `restaurante_id` | `uuid` |  Nullable |
| `categoria_id` | `int4` |  Nullable |
| `dia_semana_id` | `int4` |  Nullable |
| `nombre` | `text` |  |
| `descripcion` | `text` |  Nullable |
| `precio` | `numeric` |  |
| `imagen` | `text` |  Nullable |
| `alergenos` | `jsonb` |  Nullable |
| `tags` | `jsonb` |  Nullable |
| `disponible` | `bool` |  Nullable |
| `orden` | `int4` |  Nullable |
| `es_estrella` | `bool` |  Nullable |
| `disponible_todos_dias` | `bool` |  Nullable |
| `propiedades_hildegardianas` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `recetas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `plato_id` | `uuid` |  Nullable Unique |
| `ingredientes` | `jsonb` |  |
| `pasos` | `jsonb` |  |
| `tiempo_min` | `int4` |  Nullable |
| `porciones` | `int4` |  Nullable |
| `dificultad` | `text` |  Nullable |
| `notas_hildegardianas` | `text` |  Nullable |
| `interpretacion_hildegardiana` | `text` |  Nullable |
| `calorias_totales` | `numeric` |  Nullable |
| `proteinas_totales_g` | `numeric` |  Nullable |
| `carbohidratos_totales_g` | `numeric` |  Nullable |
| `grasas_totales_g` | `numeric` |  Nullable |
| `fibra_total_g` | `numeric` |  Nullable |
| `sodio_total_mg` | `numeric` |  Nullable |
| `calcio_total_mg` | `numeric` |  Nullable |
| `hierro_total_mg` | `numeric` |  Nullable |
| `porciones_base` | `int4` |  |
| `peso_crudo_total_g` | `numeric` |  Nullable |
| `peso_cocido_total_g` | `numeric` |  Nullable |
| `metodo_coccion_principal` | `varchar` |  |

## Table `configuracion`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `dias_minimos_anticipacion` | `int4` |  |
| `capacidad_maxima_diaria` | `int4` |  |
| `horario_pedidos_inicio` | `time` |  Nullable |
| `horario_pedidos_fin` | `time` |  Nullable |
| `dias_entrega` | `_int4` |  Nullable |
| `costo_envio` | `numeric` |  Nullable |
| `activo` | `bool` |  Nullable |

## Table `capacidad_diaria`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `fecha` | `date` |  Unique |
| `pedidos_confirmados` | `int4` |  Nullable |
| `pedidos_pendientes` | `int4` |  Nullable |
| `capacidad_maxima` | `int4` |  |
| `disponible` | `bool` |  Nullable |

## Table `clientes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `text` |  |
| `email` | `text` |  Unique |
| `telefono` | `text` |  Nullable |
| `direccion` | `text` |  Nullable |
| `notas` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `pedidos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `cliente_id` | `uuid` |  Nullable |
| `restaurante_id` | `uuid` |  Nullable |
| `fecha_inicio` | `date` |  |
| `fecha_fin` | `date` |  |
| `estado` | `text` |  |
| `total_general` | `numeric` |  Nullable |
| `notas` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `pedido_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pedido_id` | `uuid` |  Nullable |
| `plato_id` | `uuid` |  Nullable |
| `fecha` | `date` |  |
| `tipo_comida` | `text` |  |
| `cantidad` | `int4` |  |
| `precio_unitario` | `numeric` |  |
| `subtotal` | `numeric` |  |
| `notas` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `notificaciones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pedido_id` | `uuid` |  Nullable |
| `tipo` | `text` |  |
| `mensaje` | `text` |  |
| `leido` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `grupos_pedido`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `palabra_secreta` | `varchar` |  Unique |
| `restaurante_id` | `uuid` |  Nullable |
| `fecha_inicio` | `date` |  |
| `fecha_fin` | `date` |  |
| `estado` | `text` |  |
| `creado_por` | `uuid` |  Nullable |
| `pedido_final_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `grupo_miembros`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `grupo_id` | `uuid` |  Nullable |
| `cliente_id` | `uuid` |  Nullable |
| `rol` | `text` |  |
| `confirmado_general` | `bool` |  Nullable |
| `joined_at` | `timestamptz` |  Nullable |

## Table `grupo_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `grupo_id` | `uuid` |  Nullable |
| `fecha` | `date` |  |
| `tipo_comida` | `text` |  |
| `plato_id` | `uuid` |  Nullable |
| `cantidad` | `int4` |  |
| `seleccionado_por` | `uuid` |  Nullable |
| `modificado_por` | `uuid` |  Nullable |
| `votos` | `_uuid` |  Nullable |
| `notas` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `grupo_confirmaciones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `grupo_id` | `uuid` |  Nullable |
| `cliente_id` | `uuid` |  Nullable |
| `fecha` | `date` |  |
| `confirmado` | `bool` |  |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `grupo_votos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `grupo_id` | `uuid` |  Nullable |
| `cliente_id` | `uuid` |  Nullable |
| `fecha` | `date` |  |
| `tipo_comida` | `text` |  |
| `plato_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `grupo_notificaciones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `grupo_id` | `uuid` |  Nullable |
| `cliente_id` | `uuid` |  Nullable |
| `tipo` | `text` |  |
| `mensaje` | `text` |  |
| `leido` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `admin_users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  Unique |
| `password_hash` | `text` |  |
| `nombre` | `text` |  |
| `rol` | `text` |  Nullable |
| `activo` | `bool` |  Nullable |
| `ultimo_login` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `ingredientes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `text` |  |
| `nombre_cientifico` | `text` |  Nullable |
| `categoria` | `text` |  |
| `unidad_base` | `text` |  |
| `calorias` | `numeric` |  Nullable |
| `proteinas_g` | `numeric` |  Nullable |
| `carbohidratos_g` | `numeric` |  Nullable |
| `grasas_g` | `numeric` |  Nullable |
| `grasas_saturadas_g` | `numeric` |  Nullable |
| `fibra_g` | `numeric` |  Nullable |
| `azucar_g` | `numeric` |  Nullable |
| `sodio_mg` | `numeric` |  Nullable |
| `calcio_mg` | `numeric` |  Nullable |
| `hierro_mg` | `numeric` |  Nullable |
| `magnesio_mg` | `numeric` |  Nullable |
| `potasio_mg` | `numeric` |  Nullable |
| `zinc_mg` | `numeric` |  Nullable |
| `vitamina_a_mcg` | `numeric` |  Nullable |
| `vitamina_c_mg` | `numeric` |  Nullable |
| `vitamina_d_mcg` | `numeric` |  Nullable |
| `vitamina_b12_mcg` | `numeric` |  Nullable |
| `propiedades_hildegardianas` | `text` |  Nullable |
| `temperamento` | `text` |  Nullable |
| `activo` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `vitamina_b1_mg` | `numeric` |  Nullable |
| `vitamina_b2_mg` | `numeric` |  Nullable |
| `vitamina_b3_mg` | `numeric` |  Nullable |
| `vitamina_b5_mg` | `numeric` |  Nullable |
| `vitamina_b6_mg` | `numeric` |  Nullable |
| `vitamina_b9_mcg` | `numeric` |  Nullable |
| `vitamina_e_mg` | `numeric` |  Nullable |
| `vitamina_k_mcg` | `numeric` |  Nullable |
| `fosforo_mg` | `numeric` |  Nullable |
| `cobre_mg` | `numeric` |  Nullable |
| `manganeso_mg` | `numeric` |  Nullable |
| `selenio_mcg` | `numeric` |  Nullable |
| `yodo_mcg` | `numeric` |  Nullable |
| `fluor_mcg` | `numeric` |  Nullable |
| `cloro_mg` | `numeric` |  Nullable |
| `azufre_mg` | `numeric` |  Nullable |
| `omega3_mg` | `numeric` |  Nullable |
| `omega6_mg` | `numeric` |  Nullable |
| `grasas_monoinsaturadas_g` | `numeric` |  Nullable |
| `grasas_poliinsaturadas_g` | `numeric` |  Nullable |
| `colesterol_mg` | `numeric` |  Nullable |
| `agua_g` | `numeric` |  Nullable |
| `cenizas_g` | `numeric` |  Nullable |
| `alcohol_g` | `numeric` |  Nullable |
| `cafeina_mg` | `numeric` |  Nullable |
| `indice_glucemico` | `int4` |  Nullable |
| `carga_glucemica` | `numeric` |  Nullable |
| `valor_orac` | `int4` |  Nullable |
| `indice_pral` | `numeric` |  Nullable |
| `ph` | `numeric` |  Nullable |
| `origen` | `text` |  Nullable |
| `estacionalidad` | `text` |  Nullable |
| `parte_util` | `text` |  Nullable |
| `alergenos` | `_text` |  Nullable |
| `contraindicaciones` | `text` |  Nullable |
| `beneficios_hildegardianos` | `text` |  Nullable |
| `compatibilidad_temperamento` | `_text` |  Nullable |
| `es_veneno_hildegardiano` | `bool` |  Nullable |
| `es_base_alegria` | `bool` |  Nullable |
| `nivel_subtilitat` | `int4` |  Nullable |
| `requiere_coccion` | `bool` |  Nullable |
| `frecuencia_recomendada` | `text` |  Nullable |
| `apto_para_enfermos` | `bool` |  Nullable |
| `impacto_bilis_negra` | `text` |  Nullable |
| `impacto_livor` | `text` |  Nullable |
| `estacion_ideal` | `text` |  Nullable |
| `metodo_preparacion` | `text` |  Nullable |
| `viriditas_index` | `text` |  Nullable |
| `humor_principal` | `text` |  Nullable |
| `reacciones_cutaneas_humorales` | `text` |  Nullable |
| `peso_porcion_tipica_g` | `numeric` |  Nullable |
| `unidad_porcion` | `varchar` |  Nullable |
| `notas` | `text` |  Nullable |
| `tags` | `_text` |  Nullable |
| `densidad_g_por_ml` | `numeric` |  Nullable |
| `alternativa_sana` | `text` |  Nullable |
| `observacion_coccion` | `text` |  Nullable |
| `factor_rendimiento_coccion` | `numeric` |  |
| `categoria_escalado` | `varchar` |  |

## Table `receta_ingredientes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `receta_id` | `uuid` |  Nullable |
| `ingrediente_id` | `uuid` |  Nullable |
| `cantidad` | `numeric` |  |
| `unidad` | `text` |  |
| `notas` | `text` |  Nullable |
| `orden` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  Nullable |
| `nombre` | `text` |  Nullable |
| `rol` | `text` |  |
| `created_at` | `timestamptz` |  |
| `telefono` | `text` |  Nullable |
| `username` | `text` |  Nullable |
| `apellido` | `text` |  Nullable |

## Table `platos_nombres_backup`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` |  Nullable |
| `nombre` | `text` |  Nullable |
| `backup_at` | `timestamptz` |  Nullable |

## Table `unidad_conversion`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `unidad` | `text` | Primary |
| `gramos_equivalentes` | `numeric` |  |
| `descripcion` | `text` |  Nullable |



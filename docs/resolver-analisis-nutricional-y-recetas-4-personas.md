# Plan de Resolucion: Analisis Nutricional Completo y Recetas para 4 Personas

## Objetivo
Definir una implementacion clara para resolver 2 problemas del producto:

1. Mejorar el analisis nutricional para que sea mas completo, util y confiable.
2. Estandarizar recetas con porcion base de 4 personas y escalado automatico a cualquier cantidad.

---

## Problema 1: Analisis Nutricional Mas Completo y Util

## Diagnostico actual
- Hay buenos calculos base (kcal, macros, puntaje hildegardiano), pero falta explicabilidad para usuario final.
- Algunas salidas generan desconfianza cuando no esta claro si los valores son crudos, cocidos o aproximados.
- Falta una salida estandarizada tipo informe dual (cientifico + hildegardiano) para mostrar en UI y exportar.

## Objetivo funcional
Mostrar un informe dual por receta/plato con:
- Resumen rapido (kcal, macros, puntaje y recomendacion).
- Detalle cientifico (macro/micro, por receta y por porcion).
- Detalle hildegardiano explicable (factores que suman/restan).
- Nivel de confianza y advertencias de datos incompletos.
- Recomendaciones accionables de preparacion.

## Solucion propuesta

### 1) Estandarizar la salida del motor de analisis
Crear un DTO unico de salida para frontend/API:

```ts
type InformeDual = {
  resumen: {
    caloriasPorPorcion: number;
    proteinasPorPorcion: number;
    carbohidratosPorPorcion: number;
    grasasPorPorcion: number;
    porcionesBase: number;
    recomendacion: 'muy_recomendado' | 'recomendado' | 'neutral' | 'mejorar' | 'rechazado';
    puntajeGlobal: number;
    selloViriditas: 'maximo' | 'alto' | 'moderado' | 'bajo' | 'nulo';
    esAptoParaEnfermos: boolean;
  };
  cientifico: {
    totalesReceta: {
      calorias: number;
      proteinas_g: number;
      carbohidratos_g: number;
      grasas_g: number;
      fibra_g: number;
    };
    porcion: {
      calorias: number;
      proteinas_g: number;
      carbohidratos_g: number;
      grasas_g: number;
      fibra_g: number;
    };
    micronutrientesDestacados: string[];
    pesoCrudoTotal_g: number;
    pesoCocidoEstimado_g: number;
    factorRendimientoPromedio: number;
  };
  hildegardiano: {
    puntajeFinal: number;
    temperamentoDominante: string;
    impactoLivor: 'limpia' | 'neutro' | 'genera';
    impactoBilisNegra: 'reduce' | 'neutro' | 'aumenta';
    factores: Array<{
      codigo: string;
      etiqueta: string;
      tipo: 'bonificacion' | 'penalizacion';
      puntos: number;
      motivo: string;
    }>;
    ingredientesDestacados: Array<{
      nombre: string;
      rol: 'pilar' | 'medicina' | 'base_alegria' | 'precaucion';
      subtilitat: number;
      viriditas: string;
      mensaje: string;
    }>;
  };
  detalleIngredientes: Array<{
    nombre: string;
    cantidadEscalada: string;
    temperamento: string;
    subtilitat: number;
    viriditas: string;
    esVeneno: boolean;
    esBaseAlegria: boolean;
    requiereCoccion: boolean;
    estaCocido: boolean;
    aptoParaEnfermos: boolean;
    frecuenciaRecomendada: string;
    estacionIdeal: string;
    enTemporada: boolean;
    impactoLivor: string;
    impactoBilisNegra: string;
    humorPrincipal: string;
    beneficios: string;
    propiedades: string;
    contraindicaciones: string;
    alternativaSana: string | null;
  }>;
  confianza: {
    nivel: 'alta' | 'media' | 'baja';
    score: number;
    motivos: string[];
    usaPesoCocidoEstimado: boolean;
  };
  alergenos: {
    presentes: string[];
    porIngrediente: Record<string, string[]>;
    puedeTrazas: boolean;
    nivelRiesgo: 'ninguno' | 'bajo' | 'medio' | 'alto';
  };
  metodoCoccion: {
    principal: 'hervido' | 'horneado' | 'salteado' | 'crudo' | 'vapor';
    impactoPuntaje: number;
  };
  advertenciasCoccion: string[];
  maridajeHildegardiano: {
    bebidaRecomendada: string;
    especiasSugeridas: string[];
    postreIdeal: string;
  };
  alternativasSanas: Array<{
    ingredienteOriginal: string;
    problema: string;
    alternativa: string;
    motivo: string;
  }>;
  recomendaciones: {
    preparacion: string[];
    consumo: string[];
    maridaje: string[];
    contraindicaciones: string[];
  };
  estacionalidad: {
    estacionActual: 'primavera' | 'verano' | 'otono' | 'invierno';
    ingredientesEnTemporada: string[];
    ingredientesFueraTemporada: string[];
    porcentajeTemporada: number;
  };
};
```

### 2) Explicabilidad del puntaje hildegardiano
El motor debe devolver no solo `puntajeFinal`, sino tambien `factores` (ejemplo: +15 espelta, +10 galanga, -5 exceso lacteo).

Regla de oro:
- Cada cambio en puntaje debe incluir: codigo, puntos y motivo legible.

Adicional obligatorio para receta completa:
- El puntaje de receta se calcula ponderado por peso escalado de ingredientes.
- Si existe al menos un ingrediente con `es_veneno_hildegardiano = true`, la receta se marca como no recomendada y el puntaje final pasa a 0 (regla de seguridad).

Formula sugerida:

`puntaje_receta = sum(evaluar_alimento(i) * peso_escalado(i)) / sum(peso_escalado(i))`

### 3) Manejo de confianza
Definir score interno de calidad de datos y mapearlo a:
- Alta: receta completa con porciones y pesos coherentes.
- Media: faltan algunos campos menores o se usa una estimacion parcial.
- Baja: incoherencia porciones/peso o faltan datos clave de ingredientes.

Mostrar banner visible cuando la confianza no sea alta.

Reglas objetivas sugeridas:

```ts
function calcularConfianza(receta: any) {
  let score = 100;
  const motivos: string[] = [];

  if (!receta.peso_cocido_total_g) {
    score -= 20;
    motivos.push('Falta peso cocido total');
  }
  if (receta.ingredientes?.some((i: any) => !i.cantidad_base)) {
    score -= 30;
    motivos.push('Hay ingredientes sin cantidad base');
  }
  if (receta.ingredientes?.some((i: any) => !i.ingrediente?.temperamento)) {
    score -= 15;
    motivos.push('Hay ingredientes sin datos hildegardianos');
  }
  if (!receta.porciones_base || receta.porciones_base < 1) {
    score -= 40;
    motivos.push('Porciones base invalidas');
  }

  return {
    nivel: score >= 80 ? 'alta' : score >= 50 ? 'media' : 'baja',
    score: Math.max(score, 0),
    motivos,
  };
}
```

### 4) UI del informe dual
Estructura sugerida en pantalla:
- Tarjeta resumen (siempre visible).
- Acordeon Cientifico.
- Acordeon Hildegardiano (con tabla de factores).
- Acordeon Recomendaciones de preparacion.
- Badge de confianza (alta/media/baja).

### 5) Exportacion
Agregar endpoints/export para:
- JSON estructurado (para integraciones).
- PDF/HTML resumido (para cocina y equipo de nutricion).

### 6) Pruebas
- Unit tests del motor con recetas conocidas.
- Test de regresion para porciones y redondeos.
- Snapshot/UI tests de bloques del informe.

### 7) Aprovechamiento completo de la base de datos (100%)
Para no perder informacion ya disponible en `ingredientes`, el motor debe poblar estos bloques de forma explicita:

- `detalleIngredientes`: incluye `humor_principal`, `beneficios_hildegardianos`, `propiedades_hildegardianas`, `contraindicaciones`, `estacion_ideal`, `frecuencia_recomendada`, `apto_para_enfermos`, `viriditas_index`, `es_base_alegria`, `requiere_coccion`.
- `estacionalidad`: calcula estacion actual y porcentaje de ingredientes en temporada.
- `ingredientesDestacados`: top 3 por aporte ponderado (subtilitat, viriditas y seguridad).
- `advertenciasCoccion`: mensajes automaticos cuando `requiere_coccion = true` y el metodo no lo satisface.
- `recomendaciones` separadas por tipo para evitar mezcla de mensajes.

Reglas sugeridas:

1. `selloViriditas` global:
- `maximo`: promedio viriditas >= 9
- `alto`: promedio viriditas >= 7 y < 9
- `moderado`: promedio viriditas >= 5 y < 7
- `bajo`: promedio viriditas >= 3 y < 5
- `nulo`: promedio viriditas < 3

2. `esAptoParaEnfermos` global:
- `true` si al menos 80% del peso escalado de ingredientes es apto para enfermos y no hay venenos hildegardianos.

3. `nivelRiesgo` de alergenos:
- `ninguno`: sin alergenos presentes
- `bajo`: 1 alergeno leve
- `medio`: 2 alergenos o 1 alergeno mayor
- `alto`: >=3 alergenos o presencia de alergeno mayor en ingrediente principal

4. `advertenciasCoccion`:
- Generar advertencia por cada ingrediente con `requiere_coccion = true` cuando receta/metodo declarado no garantiza coccion.

5. `estacionalidad.porcentajeTemporada`:
- Formula: `ingredientes_en_temporada / ingredientes_con_estacion_ideal * 100`.

---

## Problema 2: Recetas para 4 Personas

## Diagnostico actual
- Las recetas no siempre dejan claro su base de porciones.
- El usuario pide escalar (ejemplo 4 -> 1 persona) y puede haber errores de interpretacion.

## Objetivo funcional
Toda receta debe tener una porcion base explicita y escalado automatico exacto.

## Solucion propuesta

### 1) Modelo de datos
Agregar/asegurar en receta:
- `porciones_base` (default: 4).
- `peso_crudo_total_g`.
- `peso_cocido_total_g` (real o estimado).
- `metodo_coccion_principal` (`hervido` | `horneado` | `salteado` | `crudo` | `vapor`).

En receta-ingrediente:
- `cantidad_base`.
- `unidad_base`.
- `categoria_escalado` (`lineal` | `sublineal` | `constante_minima`).

### 2) Formula unica de escalado
Para pasar de porciones base a porciones objetivo:

`cantidad_escalada = cantidad_base * (porciones_objetivo / porciones_base)`

Ejemplo 4 -> 1:

`cantidad_1p = cantidad_base * (1 / 4)`

Importante: no todos los ingredientes deben usar escala lineal.

Reglas por categoria de escalado:
- `lineal`: harinas, carnes, verduras, lacteos.
- `sublineal`: sal y especias intensas.
- `constante_minima`: ingredientes de presencia minima (ej: "1 pizca", "1 diente").

Formulas:
- Lineal: `cantidad_base * factor`
- Sublineal: `cantidad_base * sqrt(factor)`
- Constante minima: `max(cantidad_minima, cantidad_base * factor)`

Donde `factor = porciones_objetivo / porciones_base`.

### 3) Reglas de redondeo practico
Definir reglas por tipo de unidad:
- Gramos/ml: 1 decimal o entero segun valor.
- Unidades (huevo, zanahoria): fracciones permitidas (0.25, 0.5, 0.75).
- Pizca/cucharadita: redondeo culinario (pizca chica, 1/4 cdta, etc.).

Guardar 2 valores:
- `cantidad_calculada` (exacta, para analitica).
- `cantidad_mostrada` (amigable, para cocina).

### 4) UI de receta
En la ficha de receta mostrar:
- "Receta base: 4 porciones".
- Selector de porciones (1,2,4,6,8,10).
- Tabla de ingredientes recalculada en vivo.
- Bloque "equivalentes practicos" para fracciones incomodas.

### 5) Impacto en analisis nutricional
El informe dual debe recalcular automaticamente por porcion objetivo y dejar claro:
- Totales de receta completa.
- Totales por porcion seleccionada.

Adicional:
- Ajustar pesos por factor de rendimiento de coccion para mostrar porcion cocida realista.
- Incluir impacto del metodo de coccion en el puntaje hildegardiano.

### 6) Casos edge
- Porciones objetivo = 0: bloquear.
- Ingredientes sin unidad: marcar para correccion.
- Fracciones extremas (<0.1 unidad): sugerir "preparar minimo para 2 porciones".

---

## Plan de Implementacion por Fases

## Fase 0 (Preparacion de datos)
- Completar `factor_rendimiento_coccion` en ingredientes clave.
- Clasificar ingredientes por `categoria_escalado`.
- Verificar que recetas activas tengan `porciones_base` valido (default 4).
- Cargar/validar `metodo_coccion_principal` en recetas.
- Definir set inicial de alergenos normalizados (`gluten`, `lacteos`, `huevo`, `frutos_secos`, etc.).

## Fase 1 (Rapida, alto impacto)
- Exponer en API el informe dual con `confianza` y `factores`.
- Mostrar en UI resumen + badge de confianza + factores principales.
- Estandarizar porciones base = 4 para nuevas recetas.
- Exponer `alergenos` y `metodoCoccion` en salida del informe.

## Fase 2
- Selector de porciones con recalculo completo de ingredientes.
- Reglas de redondeo culinario y equivalencias amigables.
- Recalculo nutricional por porcion objetivo.
- Aplicar escalado por categoria (`lineal`, `sublineal`, `constante_minima`).
- Aplicar impacto por coccion en puntaje hildegardiano.

## Fase 3
- Exportes (JSON/PDF), mas validaciones y tablero de calidad de datos.
- Tests de regresion amplios y monitoreo de desvio entre estimado y real cocido.
- Modo de UI: "Cocina" vs "Nutricion" para no saturar al usuario.

---

## Criterios de Exito
- El usuario entiende de donde sale el puntaje y por que se recomienda/no recomienda.
- No hay contradicciones visibles entre porciones, pesos y kcal.
- Escalar 4 -> 1 persona devuelve ingredientes coherentes y cocinables.
- Disminuyen reclamos de "analisis no confiable".

---

## Checklist Tecnico Minimo
- Motor devuelve `factores` + `confianza`.
- Front muestra "base 4 porciones" y selector de porciones.
- Utilidad compartida de escalado y redondeo.
- Tests unitarios de formula de escalado y salida nutricional.
- Flags de baja confianza visibles en menu/admin/calendario.
- Manejo de alergenos en informe y UI.
- Regla de seguridad: veneno hildegardiano fuerza puntaje 0.
- Bloque `detalleIngredientes` completo con campos hildegardianos por ingrediente.
- Bloque `estacionalidad` con porcentaje en temporada en tiempo real.
- `ingredientesDestacados` (top 3) visible en el resumen hildegardiano.
- `selloViriditas` y `esAptoParaEnfermos` como señales globales del resumen.
- `advertenciasCoccion` automaticas por ingrediente/metodo.
- `recomendaciones` estructuradas por tipo (preparacion, consumo, maridaje, contraindicaciones).
- `alergenos.nivelRiesgo` calculado y visible.
- `pesoCocidoEstimado_g` y `factorRendimientoPromedio` visibles en bloque cientifico.

---

## Reglas de Coccion y Rendimiento (obligatorias)
- Agregar en ingredientes: `factor_rendimiento_coccion` (default 1.0).
- Formula base: `peso_cocido = peso_crudo * factor_rendimiento_coccion`.
- Mantener tabla inicial de referencia por ingrediente/tipo:
  - Espinaca cruda -> cocida: 0.3
  - Carne cruda -> cocida: 0.75
  - Arroz crudo -> cocido: 3.0
  - Queso/aceite/condimentos secos: 1.0

Regla de impacto por metodo de coccion (inicial):
- `hervido` o `vapor`: +5
- `horneado`: 0
- `salteado`: -10
- `crudo` con ingredientes que requieren coccion: -20

---

## Tests de Sanity con Recetas Reales
Definir al menos 3 recetas canonicas para evitar regresiones:

1. Tarta de Espinaca y Espelta:
- Esperado: puntaje aproximado 85.
- Estado: muy recomendado.

2. Pasta con Tomate y Cerdo:
- Esperado: puntaje 0 por regla de seguridad (si incluye ingrediente marcado como veneno hildegardiano).
- Estado: no recomendado.

3. Caldo de Huesos con Verduras:
- Esperado: puntaje aproximado 90.
- Estado: muy recomendado.

---

## Micro-ajustes Finales de Implementacion

### 1) Mapeo de alergenos: de datos crudos a DTO
El campo `ingrediente.alergenos` suele venir como arreglo de strings. Para poblar `InformeDual.alergenos`, agregar una funcion de agregacion:

```ts
function agregarAlergenos(receta: any) {
  const presentes = new Set<string>();
  const porIngrediente: Record<string, string[]> = {};

  (receta.ingredientes || []).forEach((ri: any) => {
    const alergenosIng: string[] = ri.ingrediente?.alergenos || [];
    if (alergenosIng.length > 0) {
      porIngrediente[ri.ingrediente?.nombre || ri.ingrediente_id] = alergenosIng;
      alergenosIng.forEach((a) => presentes.add(a));
    }
  });

  return {
    presentes: Array.from(presentes),
    porIngrediente,
    puedeTrazas: false,
  };
}
```

### 2) Maridaje hildegardiano: reglas automaticas iniciales
Para evitar hardcode manual por receta, definir reglas por temperamento dominante:

```ts
function calcularMaridaje(temperamentoDominante: 'frio' | 'calido' | 'templado') {
  if (temperamentoDominante === 'frio') {
    return {
      bebidaRecomendada: 'Vino tinto rebajado con agua tibia',
      especiasSugeridas: ['galanga', 'nuez moscada', 'canela'],
      postreIdeal: 'Membrillo cocido o manzana asada con canela',
    };
  }

  if (temperamentoDominante === 'calido') {
    return {
      bebidaRecomendada: 'Agua de hinojo tibia o cerveza de espelta',
      especiasSugeridas: ['hinojo', 'tomillo'],
      postreIdeal: 'Membrillo cocido o manzana asada con canela',
    };
  }

  return {
    bebidaRecomendada: 'Infusion tibia de hinojo',
    especiasSugeridas: ['hinojo', 'galanga suave'],
    postreIdeal: 'Manzana asada con canela',
  };
}
```

### 3) Alternativas sanas automaticas
Usar `ingrediente.alternativa_sana` y banderas hildegardianas para construir sugerencias:

```ts
function calcularAlternativasSanas(receta: any) {
  const alternativas: Array<{
    ingredienteOriginal: string;
    problema: string;
    alternativa: string;
    motivo: string;
  }> = [];

  (receta.ingredientes || []).forEach((ri: any) => {
    const ing = ri.ingrediente;
    if (!ing) return;

    if (ing.es_veneno_hildegardiano) {
      alternativas.push({
        ingredienteOriginal: ing.nombre,
        problema: 'Veneno de cocina (Kuchengifte)',
        alternativa: ing.alternativa_sana || 'Sustituir por opcion hildegardiana segura',
        motivo: ing.contraindicaciones || 'Rechazado por regla de seguridad',
      });
      return;
    }

    if (ing.impacto_livor === 'genera' && Number(ri.cantidad_base || 0) > 200) {
      alternativas.push({
        ingredienteOriginal: ing.nombre,
        problema: 'Exceso con tendencia a generar livor',
        alternativa: ing.alternativa_sana || 'Reducir cantidad o combinar con especias calidas',
        motivo: 'Cantidad alta con impacto humoral desfavorable',
      });
    }
  });

  return alternativas;
}
```

---

## Formulas Operativas Faltantes (cierre de ambiguedad)

### 1) Temperamento dominante (ponderado por peso)
Normalizar el temperamento a su familia base (`calido`, `frio`, `templado`, `neutro`) y ponderar por cantidad escalada:

```ts
function normalizarTemperamento(valor: string | null | undefined) {
  if (!valor) return 'neutro';
  const base = valor.toLowerCase().split('_')[0];
  if (base === 'calido' || base === 'frio' || base === 'templado') return base;
  return 'neutro';
}

function calcularTemperamentoDominante(receta: any) {
  const pesos: Record<string, number> = { calido: 0, frio: 0, templado: 0, neutro: 0 };

  (receta.ingredientes || []).forEach((ri: any) => {
    const t = normalizarTemperamento(ri.ingrediente?.temperamento);
    const peso = Number(ri.cantidad_escalada ?? ri.cantidad_base ?? 0);
    pesos[t] += Number.isFinite(peso) ? peso : 0;
  });

  return Object.entries(pesos).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutro';
}
```

### 2) Impacto global de livor y bilis negra
Resolver conflictos (`limpia` vs `genera`, `reduce` vs `aumenta`) con regla de peor caso ponderada por peso:

```ts
function calcularImpactoGlobal(receta: any, campo: 'impacto_livor' | 'impacto_bilis_negra') {
  let pesoGenera = 0;
  let pesoLimpia = 0;
  let pesoTotal = 0;

  (receta.ingredientes || []).forEach((ri: any) => {
    const valor = ri.ingrediente?.[campo] || 'neutro';
    const peso = Number(ri.cantidad_escalada ?? ri.cantidad_base ?? 0);
    if (!Number.isFinite(peso) || peso <= 0) return;

    pesoTotal += peso;
    if (valor === 'genera' || valor === 'aumenta') pesoGenera += peso;
    if (valor === 'limpia' || valor === 'reduce') pesoLimpia += peso;
  });

  if (pesoTotal === 0) return campo === 'impacto_livor' ? 'neutro' : 'neutro';

  const ratioGenera = pesoGenera / pesoTotal;
  const ratioLimpia = pesoLimpia / pesoTotal;

  if (ratioGenera > 0.5) return campo === 'impacto_livor' ? 'genera' : 'aumenta';
  if (ratioLimpia >= 0.5) return campo === 'impacto_livor' ? 'limpia' : 'reduce';
  return 'neutro';
}
```

### 3) Ingredientes destacados (top 3)
Seleccionar top 3 por score ponderado y excluir venenos de la lista positiva:

```ts
function seleccionarIngredientesDestacados(receta: any) {
  const candidatos = (receta.ingredientes || [])
    .filter((ri: any) => ri.ingrediente)
    .map((ri: any) => {
      const ing = ri.ingrediente;
      const peso = Number(ri.cantidad_escalada ?? ri.cantidad_base ?? 0);
      const subtilitat = Number(ing.nivel_subtilitat || 0);

      let score = subtilitat * Math.max(peso, 0);
      if (ing.es_base_alegria) score += 20 * Math.max(peso, 0);
      if (ing.es_veneno_hildegardiano) score = Number.NEGATIVE_INFINITY;

      let rol: 'pilar' | 'medicina' | 'base_alegria' | 'precaucion' = 'pilar';
      if (ing.es_base_alegria) rol = 'base_alegria';
      else if (subtilitat >= 8) rol = 'medicina';
      else if (ing.impacto_livor === 'genera') rol = 'precaucion';

      return {
        nombre: ing.nombre,
        rol,
        subtilitat,
        viriditas: ing.viriditas_index || 'moderado',
        mensaje: ing.beneficios_hildegardianos || ing.propiedades_hildegardianas || 'Ingrediente relevante en la receta',
        score,
      };
    })
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 3);

  return candidatos.map(({ score, ...item }: any) => item);
}
```

### 4) Estacionalidad por ingrediente y porcentaje
Interpretar `todas` como en temporada siempre y `ninguna` como no computable:

```ts
type Estacion = 'primavera' | 'verano' | 'otono' | 'invierno';

function calcularEstacionalidad(receta: any, estacionActual: Estacion) {
  const ingredientesEnTemporada: string[] = [];
  const ingredientesFueraTemporada: string[] = [];
  let computables = 0;

  (receta.ingredientes || []).forEach((ri: any) => {
    const nombre = ri.ingrediente?.nombre || 'ingrediente';
    const estacionIdeal = (ri.ingrediente?.estacion_ideal || '').toLowerCase();

    if (!estacionIdeal || estacionIdeal === 'ninguna') return;

    computables += 1;
    if (estacionIdeal === 'todas' || estacionIdeal === estacionActual) {
      ingredientesEnTemporada.push(nombre);
    } else {
      ingredientesFueraTemporada.push(nombre);
    }
  });

  const porcentajeTemporada =
    computables > 0 ? Math.round((ingredientesEnTemporada.length / computables) * 100) : 100;

  return {
    estacionActual,
    ingredientesEnTemporada,
    ingredientesFueraTemporada,
    porcentajeTemporada,
  };
}
```

### 5) Mapeo de estacion actual por fecha (hemisferio sur)
Usar calendario del hemisferio sur (Argentina):

```ts
function obtenerEstacionActual(fecha: Date = new Date()): 'primavera' | 'verano' | 'otono' | 'invierno' {
  const mes = fecha.getMonth() + 1;
  if (mes >= 3 && mes <= 5) return 'otono';
  if (mes >= 6 && mes <= 8) return 'invierno';
  if (mes >= 9 && mes <= 11) return 'primavera';
  return 'verano';
}
```

Nota de implementacion:
- Si en el futuro se habilita multirregion, mover esta regla a configuracion por grupo/tenant (`hemisferio: norte|sur`) y no dejarla fija en codigo.

---

## Formulas de Implementacion Final (100% production-ready)

### 1) Null-safety en campos hildegardianos
Definir defaults globales para evitar errores y sesgos por datos incompletos.

```ts
const DEFAULTS: Record<string, any> = {
  viriditas_index: 'bajo',
  impacto_livor: 'neutro',
  impacto_bilis_negra: 'neutro',
  frecuencia_recomendada: 'ocasional',
  estacion_ideal: 'ninguna',
  temperamento: 'neutro',
  nivel_subtilitat: 0,
  apto_para_enfermos: false,
  requiere_coccion: false,
};

function safeGet(ing: any, campo: string) {
  return ing?.[campo] ?? DEFAULTS[campo];
}
```

### 2) Peso cocido estimado y factor de rendimiento promedio

```ts
function calcularPesosCocidos(receta: any) {
  let pesoCrudoTotal = 0;
  let pesoCocidoTotal = 0;
  let sumaFactoresPonderados = 0;

  (receta.ingredientes || []).forEach((ri: any) => {
    const peso = Number(ri.cantidad_escalada ?? ri.cantidad_base ?? 0);
    if (!Number.isFinite(peso) || peso <= 0) return;

    const factor = Number(ri.ingrediente?.factor_rendimiento_coccion ?? 1.0);
    const factorSeguro = Number.isFinite(factor) && factor > 0 ? factor : 1.0;

    pesoCrudoTotal += peso;
    pesoCocidoTotal += peso * factorSeguro;
    sumaFactoresPonderados += factorSeguro * peso;
  });

  return {
    pesoCrudoTotal_g: Math.round(pesoCrudoTotal),
    pesoCocidoEstimado_g: Math.round(pesoCocidoTotal),
    factorRendimientoPromedio:
      pesoCrudoTotal > 0 ? Number((sumaFactoresPonderados / pesoCrudoTotal).toFixed(2)) : 1.0,
  };
}
```

### 3) Impacto en puntaje por metodo de coccion

```ts
function calcularImpactoMetodoCoccion(
  metodo: 'hervido' | 'horneado' | 'salteado' | 'crudo' | 'vapor',
  receta: any
): number {
  const impactoBase: Record<string, number> = {
    hervido: 5,
    vapor: 5,
    horneado: 0,
    salteado: -10,
    crudo: 0,
  };

  const base = impactoBase[metodo] ?? 0;
  if (metodo !== 'crudo') return base;

  const requiereCoccion = (receta.ingredientes || []).some(
    (ri: any) => ri.ingrediente?.requiere_coccion === true
  );

  return requiereCoccion ? -20 : base;
}
```

### 4) Advertencias de coccion

```ts
function generarAdvertenciasCoccion(receta: any, metodo: string) {
  const advertencias: string[] = [];

  (receta.ingredientes || []).forEach((ri: any) => {
    const ing = ri.ingrediente;
    if (!ing) return;

    if (ing.requiere_coccion && metodo === 'crudo') {
      advertencias.push(`⚠️ ${ing.nombre} debe cocerse; crudo puede ser riesgoso`);
    }

    const nombre = String(ing.nombre || '').toLowerCase();

    if (nombre.includes('espinaca') && metodo === 'crudo') {
      advertencias.push('⚠️ La espinaca debe cocerse bien y descartar agua de coccion');
    }

    if (nombre.includes('huevo') && metodo === 'crudo') {
      advertencias.push('⚠️ El huevo crudo no es recomendable en este enfoque');
    }
  });

  return Array.from(new Set(advertencias));
}
```

### 5) Recomendaciones estructuradas

```ts
function construirRecomendaciones(
  receta: any,
  estacionalidad: any,
  maridaje: any,
  alternativas: Array<{ ingredienteOriginal: string; motivo: string }>
) {
  return {
    preparacion: generarAdvertenciasCoccion(receta, receta.metodo_coccion_principal),
    consumo: [
      estacionalidad.porcentajeTemporada >= 70
        ? `✅ ${estacionalidad.porcentajeTemporada}% de ingredientes en temporada`
        : `⚠️ Solo ${estacionalidad.porcentajeTemporada}% de ingredientes en temporada`,
      estacionalidad.ingredientesFueraTemporada?.length
        ? `Fuera de temporada: ${estacionalidad.ingredientesFueraTemporada.slice(0, 3).join(', ')}`
        : null,
    ].filter(Boolean),
    maridaje: [
      `🍷 ${maridaje.bebidaRecomendada}`,
      `🌿 ${maridaje.especiasSugeridas.join(', ')}`,
      `🍎 ${maridaje.postreIdeal}`,
    ],
    contraindicaciones: alternativas.map((a) => `🚫 ${a.ingredienteOriginal}: ${a.motivo}`),
  };
}
```

### 6) Nivel de riesgo de alergenos

```ts
const ALERGENOS_MAYORES = ['gluten', 'lacteos', 'huevo', 'frutos_secos', 'pescado', 'mariscos', 'soja'];

function calcularNivelRiesgoAlergenos(
  presentes: string[],
  principalConAlergenoMayor: boolean
): 'ninguno' | 'bajo' | 'medio' | 'alto' {
  if (!presentes || presentes.length === 0) return 'ninguno';

  const tieneMayor = presentes.some((a) => ALERGENOS_MAYORES.includes(a));

  if (presentes.length >= 3 || (tieneMayor && principalConAlergenoMayor)) return 'alto';
  if (presentes.length === 2 || tieneMayor) return 'medio';
  return 'bajo';
}
```

### 7) Calculo de puedeTrazas

```ts
function calcularPuedeTrazas(receta: any): boolean {
  const marcadoresProcesados = [
    'ketchup',
    'mayonesa',
    'salame',
    'jamon cocido',
    'salsa caesar',
    'salsa golf',
    'proteina en polvo',
    'creatina',
    'salsa de soja',
  ];

  return (receta.ingredientes || []).some((ri: any) => {
    const nombre = String(ri.ingrediente?.nombre || '').toLowerCase();
    return marcadoresProcesados.some((m) => nombre.includes(m));
  });
}
```

### 8) Estado estaCocido por ingrediente

```ts
function determinarEstaCocido(ingrediente: any, metodoReceta: string): boolean {
  if (!ingrediente?.requiere_coccion) return true;
  if (metodoReceta === 'crudo') return false;
  return ['hervido', 'horneado', 'vapor', 'salteado'].includes(metodoReceta);
}
```

### 9) Puntaje ponderado de receta con regla de veneno

```ts
function calcularPuntajeReceta(receta: any) {
  const tieneVeneno = (receta.ingredientes || []).some(
    (ri: any) => ri.ingrediente?.es_veneno_hildegardiano === true
  );

  if (tieneVeneno) {
    return {
      puntaje: 0,
      recomendacion: 'rechazado' as const,
      motivo: 'Contiene ingrediente marcado como veneno hildegardiano',
    };
  }

  let sumaPuntajesPonderados = 0;
  let sumaPesos = 0;

  (receta.ingredientes || []).forEach((ri: any) => {
    const peso = Number(ri.cantidad_escalada ?? ri.cantidad_base ?? 0);
    if (!Number.isFinite(peso) || peso <= 0) return;

    const puntajeIng = evaluarAlimentoIndividual(ri.ingrediente);
    sumaPuntajesPonderados += puntajeIng * peso;
    sumaPesos += peso;
  });

  const puntaje = sumaPesos > 0 ? Math.round(sumaPuntajesPonderados / sumaPesos) : 50;
  const acotado = Math.max(0, Math.min(100, puntaje));

  return {
    puntaje: acotado,
    recomendacion:
      acotado >= 80
        ? 'muy_recomendado'
        : acotado >= 60
        ? 'recomendado'
        : acotado >= 40
        ? 'neutral'
        : 'mejorar',
  } as const;
}
```

### 10) Evaluacion base de alimento individual

```ts
function evaluarAlimentoIndividual(ing: any): number {
  if (!ing) return 0;
  if (ing.es_veneno_hildegardiano) return 0;

  let puntaje = 50;

  const subtilitat = Number(safeGet(ing, 'nivel_subtilitat')) || 0;
  puntaje += subtilitat * 2;

  if (safeGet(ing, 'es_base_alegria')) puntaje += 15;

  const impactoLivor = safeGet(ing, 'impacto_livor');
  if (impactoLivor === 'limpia') puntaje += 10;
  else if (impactoLivor === 'genera') puntaje -= 10;

  const impactoBilis = safeGet(ing, 'impacto_bilis_negra');
  if (impactoBilis === 'reduce') puntaje += 10;
  else if (impactoBilis === 'aumenta') puntaje -= 10;

  const viriditasBonus: Record<string, number> = {
    maximo: 10,
    alto: 5,
    moderado: 0,
    bajo: -5,
    nulo: -15,
  };
  puntaje += viriditasBonus[safeGet(ing, 'viriditas_index')] ?? -5;

  const frecuencia = safeGet(ing, 'frecuencia_recomendada');
  if (frecuencia === 'diario') puntaje += 5;
  else if (frecuencia === 'medicinal') puntaje -= 5;
  else if (frecuencia === 'prohibido') puntaje -= 30;

  return Math.max(0, Math.min(100, Math.round(puntaje)));
}
```

---

## Orden de Ejecucion Recomendado
1. Ejecutar Fase 0 de datos (migracion + backfill).
2. Implementar funciones de agregacion (`agregarAlergenos`, `calcularMaridaje`, `calcularAlternativasSanas`).
3. Implementar formulas operativas (`calcularTemperamentoDominante`, `calcularImpactoGlobal`, `seleccionarIngredientesDestacados`, `calcularEstacionalidad`, `obtenerEstacionActual`).
4. Implementar formulas finales (`safeGet`, `calcularPesosCocidos`, `calcularImpactoMetodoCoccion`, `generarAdvertenciasCoccion`, `construirRecomendaciones`, `calcularNivelRiesgoAlergenos`, `calcularPuedeTrazas`, `determinarEstaCocido`, `calcularPuntajeReceta`, `evaluarAlimentoIndividual`).
5. Exponer `InformeDual` completo en API.
6. Integrar UI por capas: resumen -> acordones -> modos Cocina/Nutricion.
7. Cerrar con tests de sanity y pruebas de regresion.

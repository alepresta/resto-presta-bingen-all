# Algoritmo Nutricional Hildegardiano

Un algoritmo nutricional basado en Santa Hildegarda no solo buscaría equilibrar calorías, sino restaurar la **Viriditas** (fuerza vital) y la **Discretio** (justa medida) en el organismo.

Para que este programa sea funcional, el algoritmo debería operar en **cinco categorías lógicas** basadas en los datos de las fuentes:

## 1. Esencia y Naturaleza del Alimento
Define la identidad energética del ingrediente.

- `temperamento`: clasifica el alimento en cualidades primarias como `calido`, `frio`, `calido_seco` o `frio_humedo`.
- `nivel_subtilitat`: mide la fuerza curativa intrínseca del alimento.
- `viriditas_index`: índice de fuerza vital o verdor. Si el dato no existe todavía, puede derivarse de `nivel_subtilitat` y de los pilares de alegría presentes.

## 2. Seguridad y Estado de Salud
Bloquea o permite alimentos según el perfil del usuario.

- `es_veneno_hildegardiano`: exclusión absoluta.
- `apto_para_enfermos`: si el alimento puede darse en estado delicado.
- `contraindicaciones`: texto con exclusiones específicas.

## 3. Impacto Humoral y Emocional
Evalúa cómo el alimento afecta al cuerpo y al ánimo.

- `impacto_livor`: si limpia, genera o neutraliza mucosidad y podredumbre humoral.
- `impacto_bilis_negra`: si reduce, aumenta o neutraliza la melancolía.
- `es_base_alegria`: marca alimentos que fortalecen el corazón y la alegría.
- `humor_principal`: resumen corto del efecto humoral principal.

## 4. Reglas de Uso y Preparación
Aplica la *Discretio* (justa medida) en preparación y frecuencia.

- `requiere_coccion`: muchos alimentos deben pasar por el fuego para volverse aptos.
- `frecuencia_recomendada`: `diario`, `ocasional`, `medicinal` o `prohibido`.
- `estacion_ideal`: estación en la que el alimento resulta más beneficioso.

## 5. Descripciones Textuales
Explican el motivo de la recomendación.

- `beneficios_hildegardianos`
- `propiedades_hildegardianas`

## Regla General de Decisión
Primero se filtran los venenos, luego se ajusta por estado de salud, después por preparación y estación, y al final se calcula una puntuación de vigor.

La puntuación final puede construirse con esta idea:

- sumar puntos por `es_base_alegria`, `nivel_subtilitat` y `viriditas_index`
- restar puntos por `es_veneno_hildegardiano`, `contraindicaciones` y mal ajuste estacional
- penalizar lo crudo cuando `requiere_coccion` es verdadero
- favorecer alimentos que reduzcan `impacto_bilis_negra` y `impacto_livor`

## Ejemplo de Lógica del Algoritmo (Pseudocódigo)

```python
def evaluar_alimento(usuario, alimento, estacion):
    # 1) Seguridad absoluta
    if alimento.es_veneno_hildegardiano:
        return {
            "recomendacion": "rechazado",
            "motivo": "Veneno de la cocina",
            "puntaje": 0,
        }

    puntaje = 50
    instrucciones = []
    advertencias = []

    # 2) Estado de salud del usuario
    if usuario.esta_enfermo and not alimento.apto_para_enfermos:
        puntaje -= 25
        advertencias.append("No apto para enfermos")

    if alimento.contraindicaciones:
        puntaje -= 10
        advertencias.append(alimento.contraindicaciones)

    # 3) Preparación y neutralización
    if alimento.requiere_coccion:
        if not alimento.esta_cocido:
            puntaje -= 20
            instrucciones.append("Debe cocerse para neutralizar humores nocivos")
        else:
            puntaje += 10

    # 4) Estación y temperamento
    if estacion == "invierno" and alimento.temperamento in ["frio", "frio_humedo"]:
        puntaje -= 15
        instrucciones.append("Añadir especias cálidas como galanga o nuez moscada")

    if estacion == "verano" and alimento.temperamento in ["calido", "calido_seco"]:
        puntaje -= 10

    # 5) Vigor, alegría y subtilitat
    puntaje += alimento.nivel_subtilitat * 2
    if alimento.es_base_alegria:
        puntaje += 15
    if alimento.impacto_bilis_negra == "reduce":
        puntaje += 10
    if alimento.impacto_livor == "limpia":
        puntaje += 10

    # 6) Discretio y frecuencia
    if alimento.frecuencia_recomendada == "prohibido":
        return {
            "recomendacion": "rechazado",
            "motivo": "Uso prohibido por Discretio",
            "puntaje": 0,
        }

    if alimento.frecuencia_recomendada == "medicinal":
        puntaje -= 5

    puntaje = max(0, min(100, puntaje))

    if puntaje >= 80:
        recomendacion = "muy_recomendado"
    elif puntaje >= 60:
        recomendacion = "recomendado"
    elif puntaje >= 40:
        recomendacion = "con_precaucion"
    else:
        recomendacion = "desaconsejado"

    return {
        "recomendacion": recomendacion,
        "puntaje": puntaje,
        "advertencias": advertencias,
        "instrucciones": instrucciones,
        "mensaje": alimento.beneficios_hildegardianos or alimento.propiedades_hildegardianas,
    }
```

Este algoritmo integraría la visión de Hildegarda de que el hombre es un **torno** lleno de materia que debe ser movido con sabiduría para evitar que los humores choquen entre sí y provoquen la destrucción del firmamento interno.

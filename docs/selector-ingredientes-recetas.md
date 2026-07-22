# Selector de ingredientes en la creación de recetas

Documenta las mejoras del componente
[`SelectorIngredientes`](../src/app/admin/recetas/SelectorIngredientes.tsx),
usado en `/admin/recetas/nueva` y en la edición de recetas.

## 1. Paginación del catálogo de ingredientes

Supabase devuelve como máximo **1000 filas** por consulta. Como el catálogo
supera ese número (1185+ ingredientes), tanto la página `/admin/ingredientes`
como la API del selector paginan en bloques de 1000 hasta traer todos los
registros.

- Página: [`src/app/admin/ingredientes/page.tsx`](../src/app/admin/ingredientes/page.tsx)
- API: [`src/app/api/admin/ingredientes/route.ts`](../src/app/api/admin/ingredientes/route.ts)

## 2. Unidades y equivalencias

Al seleccionar un ingrediente se muestra el equivalente en **gramos** o
**mililitros** junto al selector de unidad. Se usa `=` para las unidades base
(gramos/ml) y `≈` para las convertidas.

| Unidad | Equivale a |
|---|---|
| gramos | = g (base) |
| kg | ×1000 g |
| ml | = ml (base) |
| litros | ×1000 ml |
| unidades | ×100 g (genérico) |
| cucharadas | ×15 g |
| cucharadas líquida | ×15 ml |
| cucharadita | ×5 g |
| cucharadita líquida | ×5 ml |
| tazas líquido | ×240 ml |
| tazas peso | ×200 g |
| puñado | ×30 g |
| punta de cuchillo | ×0.5 g |
| pizca | ×0.5 g |
| diente | ×5 g |

Los factores viven en la constante `UNIDADES` del componente y son editables.
El factor de `unidades` (100 g) es genérico porque el peso real depende de cada
ingrediente.

## 3. Resumen hildegardiano por ingrediente

Cada ingrediente de la receta muestra un resumen hildegardiano construido a
partir de los campos de la base de datos (ver
[base-de-datos-hildegardiana.md](./base-de-datos-hildegardiana.md)) combinados
con la clasificación por nombre de
[`src/lib/hildegarda.ts`](../src/lib/hildegarda.ts).

La información se organiza en **cuatro grupos** con jerarquía visual clara:

### 3.1. Semáforo general (badge principal)

Indica de un vistazo si conviene usar el ingrediente. **El `nivel_subtilitat`
es el indicador principal**: cuando existe, determina el estado.

| Estado | Condición |
|---|---|
| ✅ Recomendado (verde) | Subtilitat `> 6` |
| ⚠️ Usar con precaución (amarillo) | Subtilitat `4-6` |
| 🚫 Evitar (rojo) | Subtilitat `< 4` |

Excepción de seguridad: los **venenos** (`es_veneno_hildegardiano`) y el uso
**prohibido** (`frecuencia_recomendada = 'prohibido'`) siempre son rojos.
Si el ingrediente no tiene `nivel_subtilitat`, se usa `viriditas_index` y las
alertas como respaldo.

### 3.2. Datos neutros (gris)

Información contextual que no compite visualmente con las alertas:

- 🌿 Viriditas (`viriditas_index`)
- ✨ Subtilitat N/10 (`nivel_subtilitat`) — coloreado según su nivel por ser el indicador clave
- 🌡️ Temperamento (`temperamento`)
- 📅 Frecuencia (`frecuencia_recomendada`)

### 3.3. Alertas (rojo/amarillo, solo si aplican)

- 🚫 Veneno de cocina (rojo)
- ⛔ Uso prohibido (rojo)
- ⚠️ Contraindicación (amarillo) — de `contraindicaciones` o de la clasificación por nombre
- 🔥 Requiere cocción (amarillo)
- 🤒 No apto para enfermos (amarillo)

### 3.4. Beneficios (verde, solo si aplican)

- 🏛️ Pilar de vigor
- 😊 Base de alegría (`es_base_alegria`)
- 🌶️ Especia cálida

## Notas de implementación

- La API del selector (`vista=selector`) trae los campos hildegardianos
  necesarios además de los nutricionales.
- La clave de caché del selector se subió a `v2` para descartar datos viejos
  guardados sin los campos hildegardianos.

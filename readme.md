📚 Documentación Completa - RESTO PRESTA BINGEN ALL
📋 Tabla de Contenidos

    Resumen del Proyecto
    Arquitectura de la Aplicación
    Estructura de Carpetas
    Base de Datos
    Vistas y Rutas
    Componentes Principales
    Flujos de Usuario
    Configuración

🎯 Resumen del Proyecto
RESTO PRESTA BINGEN ALL es una aplicación web para un restaurante de cocina hildegardiana que permite:

    Pedidos grupales anticipados (4 miembros por grupo)
    Planificación de 30 días con menú diario
    Análisis nutricional basado en la medicina de Hildegarda von Bingen
    Sistema de temperamentos (cálido, frío, etc.)
    Identificación de venenos hildegardianos (ingredientes prohibidos)
    Bases de alegría (ingredientes fundamentales: espelta, hinojo, galanga, castañas)

Stack tecnológico:

    Frontend: Next.js 14 (App Router) + React + TypeScript
    Backend: Next.js API Routes
    Base de datos: Supabase (PostgreSQL)
    Estilos: Tailwind CSS
    Deploy: Vercel

🏗️ Arquitectura de la Aplicación

1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34

📁 Estructura de Carpetas

1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30

🗄️ Base de Datos
Tabla: clientes
Propósito: Almacena los usuarios del sistema (los que hacen pedidos).

sql
1
2
3
4
5
6
7

Relaciones:

    Un cliente puede ser miembro de múltiples grupos
    Un cliente puede crear grupos de pedido

Tabla: restaurantes
Propósito: Datos del restaurante (actualmente solo hay 1).

sql
1
2
3
4
5
6
7

Tabla: platos
Propósito: Catálogo de 110 platos disponibles.

sql
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19

Categorías (categoria_id):

    1 = Desayuno
    2 = Plato Principal
    3 = Guarnición
    4 = Bebida
    5 = Postre

Días de la semana (dia_semana_id):

    1 = Lunes
    2 = Martes
    ...
    7 = Domingo

Ejemplo de datos:

json
1
2
3
4
5
6
7
8
9

Tabla: ingredientes
Propósito: Catálogo de 200+ ingredientes con propiedades hildegardianas.

sql
1
2
3
4
5
6
7
8
9

Temperamentos:

    calido - Cálido balanceado
    calido_seco - Cálido y seco
    calido_humedo - Cálido y húmedo
    frio - Frío balanceado
    frio_seco - Frío y seco
    frio_humedo - Frío y húmedo

Bases de alegría (es_base_alegria = true):

    Espelta
    Hinojo
    Galanga
    Castañas

Venenos hildegardianos (es_veneno_hildegardiano = true):

    Frutilla
    Papa
    Tomate
    Pepino
    Pimiento morrón
    Champiñones
    Durazno

Ejemplo:

json
1
2
3
4
5
6
7
8

Tabla: recetas
Propósito: Recetas completas con ingredientes y pasos.

sql
1
2
3
4
5
6
7
8
9
10

Estructura de ingredientes (JSONB):

json
1
2
3
4
5
6
7
8
9
10
11
12

Estructura de pasos (JSONB):

json
1
2
3
4
5

Tabla: grupos_pedido
Propósito: Grupos de 4 miembros que planifican pedidos juntos.

sql
1
2
3
4
5
6
7
8
9
10
11
12
13

Estados:

    planificacion - Los miembros están eligiendo platos
    confirmado - Todos confirmaron y el pedido está listo
    cancelado - El grupo fue cancelado

Tabla: grupo_miembros
Propósito: Miembros de cada grupo (máximo 4).

sql
1
2
3
4
5
6
7
8

Tabla: grupo_items
Propósito: Items del pedido (qué plato eligió cada miembro para cada día/tipo de comida).

sql
1
2
3
4
5
6
7
8
9
10
11
12
13
14

Tipos de comida:

    desayuno
    almuerzo
    guarnicion
    postre
    bebida

🌐 Vistas y Rutas
1. Landing Page (/)
Archivo: src/app/page.tsx
Propósito: Página de inicio del restaurante.
Funcionalidad:

    Presentación del restaurante
    Enlaces a las principales secciones
    Información sobre la cocina hildegardiana

2. Panel Admin (/admin)
Archivo: src/app/admin/page.tsx
Propósito: Dashboard principal del administrador.
Funcionalidad:

    Acceso rápido a todas las secciones administrativas
    Estadísticas generales
    Enlaces a:
        Gestión de platos
        Gestión de grupos
        Dashboard nutricional

3. Gestión de Platos (/admin/platos)
Archivos:

    src/app/admin/platos/page.tsx (Server Component)
    src/app/admin/platos/ListaPlatos.tsx (Client Component)

Propósito: Ver y gestionar los 110 platos del menú.
Funcionalidad:

    ✅ Buscador inteligente por nombre, descripción o ingrediente
    ✅ Filtros avanzados:
        Por categoría (desayuno, plato principal, guarnición, bebida, postre)
        Por temperamento hildegardiano
        Solo sin venenos
        Solo base de alegría
    ✅ Vista dual: Grid o lista
    ✅ Imágenes de cada plato
    ✅ Badges visuales:
        Temperamento dominante
        Indicador de veneno (🚫)
        Indicador de base de alegría (✨)
        Cantidad de ingredientes
    ✅ Modo oscuro con toggle

Datos que muestra:

    Nombre del plato
    Categoría
    Precio
    Descripción
    Imagen
    Temperamento dominante
    Ingredientes (preview de los primeros 5)
    Indicadores hildegardianos

Cómo se configura:

typescript
1
2
3
4
5
6
7
8
9
10
11
12

4. Gestión de Grupos (/admin/pedidos/grupos)
Archivo: src/app/admin/pedidos/grupos/page.tsx
Propósito: Ver y gestionar los grupos de pedido.
Funcionalidad:

    Lista de todos los grupos creados
    Estado de cada grupo (planificación, confirmado, cancelado)
    Fecha de inicio y fin
    Cantidad de miembros
    Total estimado
    Acciones:
        Ver detalle
        Confirmar grupo
        Cancelar grupo

5. Detalle de Grupo (/admin/pedidos/grupos/[id])
Archivo: src/app/admin/pedidos/grupos/[id]/page.tsx
Propósito: Ver el detalle completo de un grupo específico.
Funcionalidad:

    Información del grupo (fechas, estado, total)
    Lista de miembros con sus confirmaciones
    Calendario visual de 30 días
    Resumen de platos seleccionados por día
    Botón para ver como cliente

6. Vista Cliente - Calendario de Pedidos (/pedidos/grupo/[id])
Archivos:

    src/app/pedidos/grupo/[id]/page.tsx (Server Component)
    src/app/pedidos/grupo/[id]/CalendarioPedidos.tsx (Client Component)

Propósito: Vista del cliente para seleccionar platos para cada día.
Funcionalidad:

    ✅ Calendario visual de 30 días
    ✅ 5 tipos de comida por día:
        Desayuno ☕
        Almuerzo 🍽️
        Guarnición 🥗
        Postre 🍰
        Bebida 🥤
    ✅ Modal de selección con buscador integrado
    ✅ Buscador inteligente dentro del modal:
        Búsqueda por texto
        Filtro por categoría
        Filtro por temperamento
        Filtro "sin venenos"
    ✅ Vista de miembros con estado de confirmación
    ✅ Resumen del pedido con total estimado
    ✅ Botón de confirmación individual

Flujo de usuario:

    Cliente ve el calendario de 30 días
    Hace click en un día/tipo de comida (ej: Lunes - Almuerzo)
    Se abre un modal con los platos disponibles
    Usa el buscador para filtrar (ej: "sin venenos")
    Selecciona un plato
    El plato se guarda en la base de datos
    Repite para todos los días/tipos
    Cuando todos los miembros confirman, el pedido se envía

Cómo se configura:

typescript
1
2
3
4
5
6
7
8
9
10
11
12
13
14

7. Dashboard Nutricional (/admin/dashboard/nutricional)
Archivo: src/app/admin/dashboard/nutricional/page.tsx
Propósito: Análisis nutricional basado en la medicina hildegardiana.
Funcionalidad:

    Análisis de temperamentos de los platos seleccionados
    Identificación de venenos hildegardianos
    Estadísticas de bases de alegría
    Recomendaciones nutricionales
    Gráficos visuales

🧩 Componentes Principales
1. BuscadorPlatos
Archivo: src/components/BuscadorPlatos.tsx
Propósito: Componente reutilizable de búsqueda inteligente de platos.
Props:

typescript
1
2
3
4

Funcionalidad:

    Búsqueda por texto (nombre, descripción, ingrediente)
    Filtro por categoría
    Filtro por temperamento
    Filtro "sin venenos"
    Contador en tiempo real

Uso:

tsx
1
2
3
4

2. ThemeProvider
Archivo: src/components/ThemeProvider.tsx
Propósito: Contexto global para manejar el tema (claro/oscuro).
Funcionalidad:

    Detecta preferencia del sistema
    Guarda preferencia en localStorage
    Aplica clase dark al <html>
    Provee contexto a todos los componentes

Uso:

tsx
1
2
3
4
5
6
7

3. ToggleTema
Archivo: src/components/ToggleTema.tsx
Propósito: Botón para cambiar entre modo claro y oscuro.
Funcionalidad:

    Muestra icono 🌙 o ☀️ según el tema actual
    Llama a toggleTema() del contexto

Uso:

tsx
1

🔄 Flujos de Usuario
Flujo 1: Crear un Grupo de Pedido

1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22

Flujo 2: Selección de Platos con Buscador

1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19

Flujo 3: Búsqueda Inteligente en Admin

1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22

⚙️ Configuración
Variables de Entorno
Crear archivo .env.local:

env
1
2
3
4
5
6
7

Configuración de Tailwind
Archivo: tailwind.config.ts

typescript
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30

Configuración de Supabase
Cliente Server-Side: src/lib/supabase-server.ts

typescript
1
2
3
4
5
6
7
8
9

Cliente Client-Side: src/lib/supabase-client.ts

typescript
1
2
3
4
5
6
7

📊 Estadísticas del Sistema
Datos actuales:

    110 platos en el catálogo
    200+ ingredientes registrados
    23 recetas completadas
    5 categorías de platos
    6 temperamentos hildegardianos
    4 bases de alegría identificadas
    7 venenos hildegardianos marcados

Estructura de datos:

1
2
3
4
5
6
7
8
9
10
11
12

🚀 Próximos Pasos
Antes del Deploy:

    ✅ Documentación completa (este documento)
    ⏳ Probar todos los flujos de usuario
    ⏳ Verificar que todas las imágenes cargan
    ⏳ Revisar responsive en mobile

Deploy:

    Configurar Vercel
    Conectar con Supabase de producción
    Configurar variables de entorno
    Deploy final

📝 Notas Importantes
Modo Oscuro:

    Se implementó con darkMode: 'class' en Tailwind
    El toggle está en el header de /admin/platos
    La preferencia se guarda en localStorage
    Todos los componentes usan clases dark: para estilos oscuros

Buscador Inteligente:

    Usa useMemo para optimizar el filtrado
    Busca en nombre, descripción e ingredientes
    Los filtros son acumulativos (AND lógico)
    Se resetea automáticamente al cerrar el modal

Imágenes:

    Actualmente usan placeholders de placehold.co
    Para reemplazar con imágenes reales:

sql
1

Base de Datos:

    Todas las relaciones son UUID
    Los JSONB permiten flexibilidad en recetas
    Los triggers actualizan updated_at automáticamente
    Las cascadas eliminan datos relacionados

🎓 Conceptos Clave
Cocina Hildegardiana:
Temperamentos:

    Cálido: Equilibra el frío, energizante
    Frío: Refrescante, calmante
    Seco: Ligero, estimulante
    Húmedo: Reconfortante, hidratante

Bases de Alegría:
Ingredientes fundamentales que dan vitalidad:

    Espelta (grano ancestral)
    Hinojo (digestivo)
    Galanga (especia cálida)
    Castañas (energéticas)

Venenos Hildegardianos:
Ingredientes que Hildegarda consideraba dañinos:

    Frutilla
    Papa
    Tomate
    Pepino
    Pimiento morrón
    Champiñones
    Durazno

📞 Soporte
Para dudas o modificaciones:

    Revisar este documento
    Consultar el código fuente con comentarios
    Ver los logs de la terminal
    Revisar la consola del navegador (F12)

Documento generado el: 9 de julio de 2026
Versión: 1.0
Estado: Completo y listo para deploy

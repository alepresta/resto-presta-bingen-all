
    Comida es Medicina - Sistema de pedidos grupales para cocina hildegardiana





📋 Tabla de Contenidos

    🎯 Resumen del Proyecto
    ✨ Características Principales
    🏗️ Arquitectura
    🚀 Instalación
    📁 Estructura del Proyecto
    🗄️ Base de Datos
    🌐 Rutas y Vistas
    🧩 Componentes
    🔄 Flujos de Usuario
    ⚙️ Configuración
    🎓 Cocina Hildegardiana
    📊 Estadísticas
    🚧 Próximos Pasos
    📞 Soporte

🎯 Resumen del Proyecto
RESTO PRESTA BINGEN ALL es una aplicación web completa para un restaurante especializado en cocina hildegardiana, basada en las enseñanzas de Hildegarda von Bingen (1098-1179), médica y mística alemana.
¿Qué hace la aplicación?
✅ Pedidos grupales anticipados - Grupos de 4 personas planifican menús juntos
✅ Planificación de 30 días - Calendario visual con menú diario
✅ Análisis nutricional - Basado en la medicina hildegardiana
✅ Sistema de temperamentos - Clasificación de alimentos (cálido, frío, etc.)
✅ Identificación de venenos - Ingredientes prohibidos según Hildegarda
✅ Bases de alegría - Ingredientes fundamentales para la salud  
¿Para quién es?

    Restaurantes que ofrecen cocina natural/hildegardiana
    Grupos de personas que quieren planificar comidas saludables juntas
    Nutricionistas especializados en medicina tradicional

✨ Características Principales
🔍 Búsqueda Inteligente de Platos

    Búsqueda por nombre, descripción o ingrediente
    Filtros por categoría, temperamento y propiedades
    Filtro "sin venenos" para dietas estrictas
    Contador en tiempo real de resultados

🌙 Modo Oscuro

    Toggle entre tema claro y oscuro
    Preferencia guardada en localStorage
    Detección automática de preferencia del sistema
    Transiciones suaves entre temas

📸 Imágenes de Platos

    110 platos con imágenes representativas
    Fácil reemplazo con fotos reales
    Optimización automática

📊 Dashboard Nutricional

    Análisis de temperamentos
    Estadísticas de bases de alegría
    Identificación de venenos
    Recomendaciones personalizadas

📅 Calendario de Pedidos

    Vista visual de 30 días
    5 tipos de comida por día
    Confirmación individual de miembros
    Resumen en tiempo real

🏗️ Arquitectura

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

🚀 Instalación
Prerrequisitos

    Node.js 18+ instalado
    npm o yarn
    Cuenta en Supabase (gratuita)

Pasos de Instalación

    Clonar el repositorio

bash
1
2

    Instalar dependencias

bash
1

    Configurar variables de entorno

Crear archivo .env.local en la raíz del proyecto:

env
1
2
3
4
5
6
7

    Configurar Supabase

Ejecutar los scripts SQL en Supabase para crear las tablas:

bash
1
2
3
4
5

    Iniciar el servidor de desarrollo

bash
1

    Abrir en el navegador

1

📁 Estructura del Proyecto

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
35
36
37

🗄️ Base de Datos
Diagrama de Relaciones

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

Tablas Principales
clientes
Usuarios del sistema que hacen pedidos.

sql
1
2
3
4
5
6
7

platos
Catálogo de 110 platos del menú.

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

ingredientes
200+ ingredientes con propiedades hildegardianas.

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

    Frutilla, Papa, Tomate, Pepino, Pimiento morrón, Champiñones, Durazno

recetas
Recetas completas con ingredientes y pasos.

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

Estructura de pasos (JSONB):

json
1
2
3
4

grupos_pedido
Grupos de 4 miembros que planifican pedidos juntos.

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

grupo_miembros
Miembros de cada grupo (máximo 4).

sql
1
2
3
4
5
6
7
8

grupo_items
Items del pedido (qué plato eligió cada miembro para cada día/tipo).

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

🌐 Rutas y Vistas
1. Landing Page (/)
Archivo: src/app/page.tsx
Página de inicio del restaurante con presentación y enlaces principales.
2. Panel Admin (/admin)
Archivo: src/app/admin/page.tsx
Dashboard principal del administrador con acceso rápido a todas las secciones.
3. Gestión de Platos (/admin/platos)
Archivos:

    src/app/admin/platos/page.tsx (Server Component)
    src/app/admin/platos/ListaPlatos.tsx (Client Component)

Funcionalidades:

    ✅ Buscador inteligente por nombre, descripción o ingrediente
    ✅ Filtros por categoría, temperamento, venenos, base alegría
    ✅ Vista dual: Grid o lista
    ✅ Imágenes de cada plato
    ✅ Badges visuales (temperamento, veneno, alegría)
    ✅ Modo oscuro

4. Gestión de Grupos (/admin/pedidos/grupos)
Archivo: src/app/admin/pedidos/grupos/page.tsx
Lista de todos los grupos de pedido con estado, fechas y acciones.
5. Detalle de Grupo (/admin/pedidos/grupos/[id])
Archivo: src/app/admin/pedidos/grupos/[id]/page.tsx
Vista completa de un grupo específico con calendario y miembros.
6. Vista Cliente (/pedidos/grupo/[id])
Archivos:

    src/app/pedidos/grupo/[id]/page.tsx (Server Component)
    src/app/pedidos/grupo/[id]/CalendarioPedidos.tsx (Client Component)

Funcionalidades:

    ✅ Calendario visual de 30 días
    ✅ 5 tipos de comida por día
    ✅ Modal de selección con buscador integrado
    ✅ Vista de miembros con confirmaciones
    ✅ Resumen del pedido con total

7. Dashboard Nutricional (/admin/dashboard/nutricional)
Archivo: src/app/admin/dashboard/nutricional/page.tsx
Análisis nutricional basado en la medicina hildegardiana.
🧩 Componentes
BuscadorPlatos
Archivo: src/components/BuscadorPlatos.tsx
Componente reutilizable de búsqueda inteligente.
Props:

typescript
1
2
3
4

Uso:

tsx
1
2
3
4

ThemeProvider
Archivo: src/components/ThemeProvider.tsx
Contexto global para manejar el tema (claro/oscuro).
Uso:

tsx
1
2
3
4
5
6
7

ToggleTema
Archivo: src/components/ToggleTema.tsx
Botón para cambiar entre modo claro y oscuro.
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

Scripts Disponibles

bash
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

🎓 Cocina Hildegardiana
¿Qué es la Cocina Hildegardiana?
La cocina hildegardiana se basa en las enseñanzas de Hildegarda von Bingen (1098-1179), abadesa, médica, mística y compositora alemana. Su enfoque se centra en la alimentación como medicina preventiva y curativa.
Principios Fundamentales
1. Temperamentos
Los alimentos se clasifican según su efecto en el cuerpo:

    Cálido - Equilibra el frío, energizante
    Frío - Refrescante, calmante
    Seco - Ligero, estimulante
    Húmedo - Reconfortante, hidratante

2. Bases de Alegría
Ingredientes fundamentales que dan vitalidad y salud:

    Espelta - Grano ancestral, rico en nutrientes
    Hinojo - Digestivo, carminativo
    Galanga - Especia cálida, antiinflamatoria
    Castañas - Energéticas, nutritivas

3. Venenos Hildegardianos
Ingredientes que Hildegarda consideraba dañinos para la salud:

    Frutilla - Considerada "veneno del corazón"
    Papa - "Manzana del diablo"
    Tomate - "Manzana de oro" (prohibida)
    Pepino - "Veneno frío"
    Pimiento morrón - "Veneno caliente"
    Champiñones - "Hongos del diablo"
    Durazno - "Fruta del pecado"

Beneficios

    ✅ Mejora la digestión
    ✅ Aumenta la energía vital
    ✅ Fortalece el sistema inmunológico
    ✅ Equilibra el estado de ánimo
    ✅ Previene enfermedades

📊 Estadísticas
Datos Actuales

    110 platos en el catálogo
    200+ ingredientes registrados
    110 recetas completadas (100%)
    5 categorías de platos
    6 temperamentos hildegardianos
    4 bases de alegría identificadas
    7 venenos hildegardianos marcados

Distribución de Platos

1
2
3
4
5

🚧 Próximos Pasos
Antes del Deploy

    Documentación completa
    Probar todos los flujos de usuario
    Verificar que todas las imágenes cargan
    Revisar responsive en mobile
    Optimizar performance

Deploy a Producción

    Configurar Vercel

bash
1
2

    Conectar con Supabase de producción
        Crear proyecto en Supabase
        Ejecutar scripts SQL
        Copiar variables de entorno
    Configurar variables de entorno en Vercel
        Ir a Settings → Environment Variables
        Agregar todas las variables de .env.local
    Deploy final

bash
1

Mejoras Futuras

    Sistema de autenticación completo
    Notificaciones por email
    Exportar pedidos a PDF
    Integración con pasarela de pagos
    App móvil (React Native)
    Sistema de reseñas y calificaciones
    Chat en tiempo real entre miembros

📞 Soporte
Para Desarrolladores

    Revisar este documento
    Consultar el código fuente con comentarios
    Ver los logs de la terminal
    Revisar la consola del navegador (F12)

Para Usuarios

    Contactar al administrador del sistema
    Revisar la documentación de usuario
    Ver tutoriales en video (próximamente)

Recursos Útiles

    Documentación de Next.js
    Documentación de Supabase
    Documentación de Tailwind CSS
    Hildegarda von Bingen - Wikipedia

📄 Licencia
Este proyecto es propiedad privada. Todos los derechos reservados.
👥 Créditos
Desarrollado por: [Tu Nombre/Organización]
Fecha de creación: Julio 2026
Versión: 1.0.0  
Tecnologías utilizadas:

    Next.js 14
    React 18
    TypeScript 5
    Supabase (PostgreSQL)
    Tailwind CSS 3

Inspirado por: Las enseñanzas de Hildegarda von Bingen sobre alimentación saludable.
🙏 Agradecimientos

    A la comunidad de Next.js por el excelente framework
    A Supabase por la plataforma de base de datos
    A Tailwind CSS por el sistema de estilos
    A todos los que contribuyeron con ideas y feedback

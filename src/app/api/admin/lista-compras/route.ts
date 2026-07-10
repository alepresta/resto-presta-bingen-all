import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// Función para normalizar unidades a gramos/ml
function normalizarACantidadBase(cantidad: number, unidad: string): { cantidad: number; unidadBase: string } {
  const unidadLower = unidad.toLowerCase();
  
  // Peso -> gramos
  if (unidadLower === 'kg' || unidadLower === 'kilogramos') {
    return { cantidad: cantidad * 1000, unidadBase: 'gramos' };
  }
  if (unidadLower === 'gramos' || unidadLower === 'g') {
    return { cantidad, unidadBase: 'gramos' };
  }
  
  // Volumen -> ml
  if (unidadLower === 'litros' || unidadLower === 'l') {
    return { cantidad: cantidad * 1000, unidadBase: 'ml' };
  }
  if (unidadLower === 'ml' || unidadLower === 'mililitros') {
    return { cantidad, unidadBase: 'ml' };
  }
  if (unidadLower === 'tazas') {
    return { cantidad: cantidad * 240, unidadBase: 'ml' };
  }
  if (unidadLower === 'cucharadas') {
    return { cantidad: cantidad * 15, unidadBase: 'ml' };
  }
  if (unidadLower === 'cucharadita') {
    return { cantidad: cantidad * 5, unidadBase: 'ml' };
  }
  
  // Unidades (no convertir)
  if (unidadLower === 'unidades' || unidadLower === 'unidad') {
    return { cantidad, unidadBase: 'unidades' };
  }
  
  // Por defecto, mantener como está
  return { cantidad, unidadBase: unidadLower };
}

// Función para formatear cantidad a presentación comercial
function formatearPresentacion(cantidad: number, unidad: string): string {
  if (unidad === 'gramos') {
    if (cantidad >= 1000) {
      return `${(cantidad / 1000).toFixed(2)} kg`;
    }
    return `${Math.ceil(cantidad)} g`;
  }
  if (unidad === 'ml') {
    if (cantidad >= 1000) {
      return `${(cantidad / 1000).toFixed(2)} L`;
    }
    return `${Math.ceil(cantidad)} ml`;
  }
  if (unidad === 'unidades') {
    return `${Math.ceil(cantidad)} unidades`;
  }
  return `${cantidad.toFixed(2)} ${unidad}`;
}

// Platos a preparar de un ítem = personas que lo eligieron (votos), o la cantidad, o 1.
function platosDeItem(item: any): number {
  const votos = Array.isArray(item.votos) ? item.votos.length : 0;
  return Math.max(votos, item.cantidad || 0, 1);
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const fechaInicio = searchParams.get('inicio');
  const fechaFin = searchParams.get('fin');
  const gruposParam = searchParams.get('grupos');
  const gruposIds = gruposParam ? gruposParam.split(',').map((s) => s.trim()).filter(Boolean) : [];

  if (gruposIds.length === 0 && (!fechaInicio || !fechaFin)) {
    return NextResponse.json(
      { error: 'Seleccioná al menos un grupo' },
      { status: 400 }
    );
  }

  try {
    // 1. Obtener los grupos seleccionados (o los confirmados del rango de fechas)
    let query = supabase
      .from('grupos_pedido')
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        estado,
        palabra_secreta,
        items:grupo_items(
          id,
          fecha,
          tipo_comida,
          cantidad,
          votos,
          plato_id,
          platos:platos(id, nombre, precio)
        )
      `);

    if (gruposIds.length > 0) {
      query = query.in('id', gruposIds);
    } else {
      query = query.eq('estado', 'confirmado').lte('fecha_inicio', fechaFin).gte('fecha_fin', fechaInicio);
    }

    const { data: pedidos, error: errorPedidos } = await query;

    if (errorPedidos) throw errorPedidos;

    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json({
        lista: [],
        resumen: { totalIngredientes: 0, totalPlatos: 0, pedidos: 0 },
        mensaje: gruposIds.length > 0 ? 'Los grupos seleccionados no tienen platos' : 'No hay pedidos confirmados en este rango',
      });
    }

    // 2. Recopilar todos los platos únicos con sus cantidades totales
    const platosMap = new Map<string, { plato: any; cantidadTotal: number; fechas: string[] }>();
    const itemsTodos: any[] = [];

    pedidos.forEach((pedido) => {
      pedido.items?.forEach((item: any) => {
        if (!item.plato_id) return;
        
        itemsTodos.push(item);
        
        const key = item.plato_id;
        if (platosMap.has(key)) {
          const existente = platosMap.get(key)!;
          existente.cantidadTotal += platosDeItem(item);
          existente.fechas.push(item.fecha);
        } else {
          platosMap.set(key, {
            plato: item.platos,
            cantidadTotal: platosDeItem(item),
            fechas: [item.fecha],
          });
        }
      });
    });

    // 3. Obtener recetas de todos los platos
    const platoIds = Array.from(platosMap.keys());
    const { data: recetas } = await supabase
      .from('recetas')
      .select('id, plato_id, porciones')
      .in('plato_id', platoIds);

    const recetaPorPlato = new Map<string, { id: string; porciones: number }>();
    recetas?.forEach((r) => {
      recetaPorPlato.set(r.plato_id, { id: r.id, porciones: r.porciones || 1 });
    });

    // 4. Obtener ingredientes de todas las recetas
    const recetaIds = Array.from(recetaPorPlato.values()).map((r) => r.id);
    const { data: recetaIngredientes } = await supabase
      .from('receta_ingredientes')
      .select(`
        receta_id,
        cantidad,
        unidad,
        ingrediente:ingredientes(
          id, nombre, categoria, unidad_base,
          calorias, proteinas_g, carbohidratos_g, grasas_g
        )
      `)
      .in('receta_id', recetaIds);

    // 5. Calcular lista de compras agregada
    const ingredientesMap = new Map<string, {
      ingrediente: any;
      cantidadTotal: number;
      unidadBase: string;
      platosQueLoUsan: Set<string>;
      caloriasTotal: number;
      proteinasTotal: number;
      carbsTotal: number;
      grasasTotal: number;
    }>();

    platosMap.forEach((platoData, platoId) => {
      const receta = recetaPorPlato.get(platoId);
      if (!receta) return;

      const factorEscala = platoData.cantidadTotal / receta.porciones;

      recetaIngredientes
        ?.filter((ri) => ri.receta_id === receta.id)
        .forEach((ri: any) => {
          const ing = ri.ingrediente;
          if (!ing) return;

          const { cantidad: cantidadBase, unidadBase } = normalizarACantidadBase(
            ri.cantidad,
            ri.unidad
          );

          const cantidadEscalada = cantidadBase * factorEscala;
          const factorNutricional = cantidadEscalada / 100; // por cada 100g/ml

          if (ingredientesMap.has(ing.id)) {
            const existente = ingredientesMap.get(ing.id)!;
            existente.cantidadTotal += cantidadEscalada;
            existente.platosQueLoUsan.add(platoData.plato.nombre);
            existente.caloriasTotal += (ing.calorias || 0) * factorNutricional;
            existente.proteinasTotal += (ing.proteinas_g || 0) * factorNutricional;
            existente.carbsTotal += (ing.carbohidratos_g || 0) * factorNutricional;
            existente.grasasTotal += (ing.grasas_g || 0) * factorNutricional;
          } else {
            ingredientesMap.set(ing.id, {
              ingrediente: ing,
              cantidadTotal: cantidadEscalada,
              unidadBase,
              platosQueLoUsan: new Set([platoData.plato.nombre]),
              caloriasTotal: (ing.calorias || 0) * factorNutricional,
              proteinasTotal: (ing.proteinas_g || 0) * factorNutricional,
              carbsTotal: (ing.carbohidratos_g || 0) * factorNutricional,
              grasasTotal: (ing.grasas_g || 0) * factorNutricional,
            });
          }
        });
    });

    // 6. Convertir a array y agrupar por categoría
    const listaIngredientes = Array.from(ingredientesMap.values()).map((item) => ({
      id: item.ingrediente.id,
      nombre: item.ingrediente.nombre,
      categoria: item.ingrediente.categoria,
      cantidad: item.cantidadTotal,
      unidad: item.unidadBase,
      presentacion: formatearPresentacion(item.cantidadTotal, item.unidadBase),
      platosQueLoUsan: Array.from(item.platosQueLoUsan),
      nutricion: {
        calorias: item.caloriasTotal,
        proteinas: item.proteinasTotal,
        carbohidratos: item.carbsTotal,
        grasas: item.grasasTotal,
      },
    }));

    // 7. Agrupar por categoría
    const porCategoria = listaIngredientes.reduce((acc: any, ing) => {
      const cat = ing.categoria || 'otros';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(ing);
      return acc;
    }, {});

    // 8. Calcular totales nutricionales
    const nutricionTotal = listaIngredientes.reduce(
      (acc, ing) => ({
        calorias: acc.calorias + ing.nutricion.calorias,
        proteinas: acc.proteinas + ing.nutricion.proteinas,
        carbohidratos: acc.carbohidratos + ing.nutricion.carbohidratos,
        grasas: acc.grasas + ing.nutricion.grasas,
      }),
      { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
    );

    return NextResponse.json({
      lista: listaIngredientes,
      porCategoria,
      resumen: {
        totalIngredientes: listaIngredientes.length,
        totalPlatos: platosMap.size,
        totalPorciones: Array.from(platosMap.values()).reduce((sum, p) => sum + p.cantidadTotal, 0),
        pedidos: pedidos.length,
        rangoFechas: { inicio: fechaInicio, fin: fechaFin },
        nutricionTotal,
      },
    });
  } catch (error: any) {
    console.error('Error generando lista de compras:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

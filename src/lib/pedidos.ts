// src/lib/pedidos.ts

import { createClient } from '@supabase/supabase-js';

// ============================================
// TIPOS
// ============================================

export interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  notas?: string;
  created_at: string;
}

export interface Plato {
  id: string;
  restaurante_id: string;
  categoria_id: number;
  dia_semana_id: number | null;
  nombre: string;
  descripcion: string;
  precio: number;
  alergenos: string[];
  tags: string[];
  disponible: boolean;
  disponible_todos_dias: boolean;
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  plato_id: string;
  fecha: string;
  tipo_comida: 'desayuno' | 'almuerzo' | 'guarnicion' | 'postre' | 'bebida';
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  notas?: string;
  plato?: Plato;
}

export interface Pedido {
  id: string;
  cliente_id: string;
  restaurante_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'borrador' | 'confirmado' | 'en_preparacion' | 'entregado' | 'cancelado';
  total_general: number;
  notas?: string;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  items?: PedidoItem[];
}

export interface DiaSemana {
  id: number;
  nombre: string;
  tematica: string;
  icono: string;
}

export const DIAS_SEMANA: DiaSemana[] = [
  { id: 1, nombre: 'Lunes', tematica: 'Carne', icono: '🥩' },
  { id: 2, nombre: 'Martes', tematica: 'Verdura', icono: '🥗' },
  { id: 3, nombre: 'Miércoles', tematica: 'Pasta', icono: '🍝' },
  { id: 4, nombre: 'Jueves', tematica: 'Pollo', icono: '🍗' },
  { id: 5, nombre: 'Viernes', tematica: 'Pescado', icono: '🐟' },
  { id: 6, nombre: 'Sábado', tematica: 'Libre', icono: '🍕' },
  { id: 7, nombre: 'Domingo', tematica: 'Pastas', icono: '🍝' },
];

export const CATEGORIAS_COMIDA = {
  DESAYUNO: 1,
  PLATO_PRINCIPAL: 2,
  GUARNICION: 3,
  BEBIDA: 4,
  POSTRE: 5,
} as const;

export const TIPO_COMIDA_MAP: Record<number, string> = {
  1: 'desayuno',
  2: 'almuerzo',
  3: 'guarnicion',
  4: 'bebida',
  5: 'postre',
};

// ============================================
// VALIDACIONES
// ============================================

export function calcularFechaMinimaPedido(): Date {
  const hoy = new Date();
  const fechaMinima = new Date(hoy);
  fechaMinima.setDate(hoy.getDate() + 10);
  return fechaMinima;
}

export function validarFechaInicio(fechaInicio: Date): { valido: boolean; mensaje?: string } {
  const fechaMinima = calcularFechaMinimaPedido();
  if (fechaInicio < fechaMinima) {
    return {
      valido: false,
      mensaje: `La fecha de inicio debe ser al menos 10 días desde hoy (${fechaMinima.toLocaleDateString('es-AR')})`,
    };
  }
  return { valido: true };
}

export function validarFechaFin(fechaInicio: Date, fechaFin: Date): { valido: boolean; mensaje?: string } {
  if (fechaFin <= fechaInicio) {
    return { valido: false, mensaje: 'La fecha de fin debe ser posterior a la fecha de inicio' };
  }
  const diasDiferencia = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
  if (diasDiferencia > 30) {
    return { valido: false, mensaje: 'El plan no puede exceder los 30 días' };
  }
  return { valido: true };
}

export function validarPlatoParaDia(
  categoriaId: number,
  diaSemanaId: number | null,
  disponibleTodosDias: boolean,
  diaPedido: number
): { valido: boolean; mensaje?: string } {
  if ([CATEGORIAS_COMIDA.DESAYUNO, CATEGORIAS_COMIDA.GUARNICION, CATEGORIAS_COMIDA.POSTRE, CATEGORIAS_COMIDA.BEBIDA].includes(categoriaId)) {
    return { valido: true };
  }
  if (categoriaId === CATEGORIAS_COMIDA.PLATO_PRINCIPAL) {
    if (disponibleTodosDias || diaSemanaId === null) return { valido: true };
    if (diaSemanaId === diaPedido) return { valido: true };
    const diaNombre = DIAS_SEMANA.find(d => d.id === diaPedido)?.nombre || 'desconocido';
    const diaPlato = DIAS_SEMANA.find(d => d.id === diaSemanaId)?.nombre || 'desconocido';
    return { valido: false, mensaje: `Este plato es para ${diaPlato}, no para ${diaNombre}` };
  }
  return { valido: false, mensaje: 'Categoría de plato no válida' };
}

export function generarFechasEntre(inicio: Date, fin: Date): Date[] {
  const fechas: Date[] = [];
  const actual = new Date(inicio);
  while (actual <= fin) {
    fechas.push(new Date(actual));
    actual.setDate(actual.getDate() + 1);
  }
  return fechas;
}

export function obtenerDiaSemana(fecha: Date): number {
  const dia = fecha.getDay();
  return dia === 0 ? 7 : dia;
}

// ============================================
// CLIENTE SUPABASE
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function crearCliente(data: {
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  notas?: string;
}) {
  const { data: cliente, error } = await supabase
    .from('clientes')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return cliente;
}

export async function crearPedido(data: {
  cliente_id: string;
  restaurante_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  notas?: string;
}) {
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return pedido;
}

export async function agregarItemPedido(data: {
  pedido_id: string;
  plato_id: string;
  fecha: string;
  tipo_comida: string;
  cantidad: number;
  precio_unitario: number;
  notas?: string;
}) {
  const subtotal = data.cantidad * data.precio_unitario;
  const { data: item, error } = await supabase
    .from('pedido_items')
    .insert({ ...data, subtotal })
    .select()
    .single();
  if (error) throw error;
  return item;
}

export async function obtenerPedido(id: string) {
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      cliente:clientes(*),
      items:pedido_items(
        *,
        plato:platos(*)
      )
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return pedido;
}

export async function obtenerPedidosCliente(clienteId: string) {
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      items:pedido_items(
        *,
        plato:platos(*)
      )
    `)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return pedidos;
}

export async function actualizarEstadoPedido(id: string, estado: string) {
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .update({ estado })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return pedido;
}

export async function eliminarItemPedido(itemId: string) {
  const { error } = await supabase
    .from('pedido_items')
    .delete()
    .eq('id', itemId);
  if (error) throw error;
}

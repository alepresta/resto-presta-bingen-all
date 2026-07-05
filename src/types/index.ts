export interface Restaurante {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  logo?: string;
  tagline?: string;
  tema?: any;
  horario_apertura?: string;
  horario_cierre?: string;
  telefono?: string;
  direccion?: string;
  instagram?: string;
  email?: string;
}

export interface Plato {
  id: string;
  restaurante_id: string;
  categoria_id: number;
  dia_semana_id?: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen?: string;
  alergenos?: string[];
  tags?: string[];
  disponible: boolean;
  orden: number;
  es_estrella: boolean;
  disponible_todos_dias: boolean;
  propiedades_hildegardianas?: string;
  receta?: Receta;
}

export interface Receta {
  id: string;
  plato_id: string;
  ingredientes: { nombre: string; cantidad: number; unidad: string }[];
  pasos: string[];
  tiempo_min?: number;
  porciones?: number;
  dificultad?: 'fácil' | 'media' | 'difícil';
  notas_hildegardianas?: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  icono?: string;
  orden: number;
  disponible_todos_dias: boolean;
  horario_inicio?: string;
  horario_fin?: string;
}

export interface Cliente {
  id: string;
  user_id?: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  barrio?: string;
  ciudad?: string;
  notas?: string;
  es_vip: boolean;
  total_pedidos: number;
}

export type EstadoPedido = 
  | 'pendiente_pago'
  | 'confirmado'
  | 'en_preparacion'
  | 'listo'
  | 'entregado'
  | 'cancelado';

export interface Pedido {
  id: string;
  cliente_id: string;
  fecha_entrega: string;
  horario_entrega: string;
  tipo_entrega: 'domicilio' | 'retiro';
  direccion_entrega?: string;
  estado: EstadoPedido;
  subtotal: number;
  costo_envio: number;
  descuento: number;
  total: number;
  metodo_pago?: 'transferencia' | 'mercadopago' | 'efectivo';
  pago_confirmado: boolean;
  pago_referencia?: string;
  notas_cliente?: string;
  notas_admin?: string;
  modificado_admin: boolean;
  fecha_modificacion?: string;
  motivo_modificacion?: string;
  created_at: string;
  cliente?: Cliente;
  items?: PedidoItem[];
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  plato_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  notas?: string;
  plato?: Plato;
}

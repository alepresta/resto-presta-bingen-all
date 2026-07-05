import { differenceInDays, addDays, isBefore, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from './supabase';

export interface ValidacionFecha {
  valido: boolean;
  mensaje: string;
  diasFaltantes?: number;
}

export function validarFechaEntrega(fechaEntrega: string): ValidacionFecha {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const fecha = parseISO(fechaEntrega);
  const diasMinimos = 10;
  
  if (isBefore(fecha, hoy)) {
    return {
      valido: false,
      mensaje: 'La fecha de entrega no puede ser anterior a hoy'
    };
  }
  
  const diasDiferencia = differenceInDays(fecha, hoy);
  
  if (diasDiferencia < diasMinimos) {
    const diasFaltantes = diasMinimos - diasDiferencia;
    return {
      valido: false,
      mensaje: 'Se requieren al menos ' + diasMinimos + ' días de anticipación. Faltan ' + diasFaltantes + ' días.',
      diasFaltantes
    };
  }
  
  return {
    valido: true,
    mensaje: '✅ Fecha válida. Entrega en ' + diasDiferencia + ' días (' + format(fecha, "EEEE dd 'de' MMMM", { locale: es }) + ')',
    diasFaltantes: diasDiferencia
  };
}

export async function verificarCapacidad(fechaEntrega: string) {
  const supabase = createClient();
  
  let { data: capacidad } = await supabase
    .from('capacidad_diaria')
    .select('*')
    .eq('fecha', fechaEntrega)
    .single();
  
  if (!capacidad) {
    const { data: nueva } = await supabase
      .from('capacidad_diaria')
      .insert({ fecha: fechaEntrega, capacidad_maxima: 50 })
      .select()
      .single();
    capacidad = nueva;
  }
  
  const lugaresDisponibles = capacidad.capacidad_maxima - 
    (capacidad.pedidos_confirmados + capacidad.pedidos_pendientes);
  
  return {
    disponible: lugaresDisponibles > 0,
    pedidosActuales: capacidad.pedidos_confirmados + capacidad.pedidos_pendientes,
    capacidadMaxima: capacidad.capacidad_maxima,
    lugaresDisponibles
  };
}

export function getFechaMinimaEntrega(): string {
  const hoy = new Date();
  const fechaMinima = addDays(hoy, 10);
  return fechaMinima.toISOString().split('T')[0];
}

export function getFechaMaximaEntrega(): string {
  const hoy = new Date();
  const fechaMaxima = addDays(hoy, 60);
  return fechaMaxima.toISOString().split('T')[0];
}

import { DIAS_SEMANA } from './pedidos';

export type DiaSemanaId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const TODOS_LOS_DIAS: DiaSemanaId[] = [1, 2, 3, 4, 5, 6, 7];

function esDiaSemanaId(valor: number): valor is DiaSemanaId {
  return Number.isInteger(valor) && valor >= 1 && valor <= 7;
}

export function normalizarDiasSemana(valor: unknown): DiaSemanaId[] {
  const items = Array.isArray(valor)
    ? valor
    : valor === null || valor === undefined || valor === ''
      ? []
      : [valor];

  const dias = items
    .map((item) => Number(item))
    .filter(esDiaSemanaId);

  return Array.from(new Set(dias)).sort((a, b) => a - b) as DiaSemanaId[];
}

export function diasSemanaDesdeLegado(
  diaSemanaId?: number | null,
  disponibleTodosLosDias?: boolean | null
): DiaSemanaId[] {
  if (disponibleTodosLosDias) return [...TODOS_LOS_DIAS];
  return normalizarDiasSemana(diaSemanaId);
}

export function esTodosLosDias(diasSemana: number[]): boolean {
  return TODOS_LOS_DIAS.every((dia) => diasSemana.includes(dia)) && diasSemana.length === TODOS_LOS_DIAS.length;
}

export function legadoDesdeDias(diasSemana: number[]): {
  dia_semana_id: DiaSemanaId | null;
  disponible_todos_dias: boolean;
} {
  if (esTodosLosDias(diasSemana)) {
    return { dia_semana_id: null, disponible_todos_dias: true };
  }

  if (diasSemana.length === 1) {
    return { dia_semana_id: diasSemana[0] as DiaSemanaId, disponible_todos_dias: false };
  }

  return { dia_semana_id: null, disponible_todos_dias: false };
}

export function textoDiasSemana(diasSemana: number[]): string {
  if (esTodosLosDias(diasSemana)) return 'Todos los días';
  if (diasSemana.length === 0) return 'Sin días';

  const nombres = diasSemana
    .map((dia) => DIAS_SEMANA.find((item) => item.id === dia)?.nombre)
    .filter(Boolean);

  return nombres.join(', ');
}
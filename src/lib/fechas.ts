const TIME_ZONE = 'America/Argentina/Buenos_Aires';

export function formatFechaLocal(fecha: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(fecha);
}

export function esFechaAnterior(fecha: string, referencia: string): boolean {
  return fecha < referencia;
}
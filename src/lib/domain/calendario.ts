/**
 * Construye la matriz de un mes para un calendario (semana inicia lunes).
 * Devuelve 42 celdas (6 semanas): número de día o null para relleno.
 */
export function construirCalendario(year: number, month0: number): (number | null)[] {
  const primerDia = new Date(year, month0, 1).getDay(); // 0=Dom..6=Sáb
  const offset = (primerDia + 6) % 7; // lunes = 0
  const diasEnMes = new Date(year, month0 + 1, 0).getDate();

  const celdas: (number | null)[] = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);
  while (celdas.length < 42) celdas.push(null);
  return celdas;
}

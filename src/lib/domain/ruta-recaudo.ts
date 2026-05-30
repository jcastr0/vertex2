/**
 * Lógica pura de la ruta diaria de recaudo.
 */
export const DIAS_COBRO = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
] as const;

export const RESULTADOS_VISITA = [
  { value: "pago", label: "Pagó total" },
  { value: "abono", label: "Abonó" },
  { value: "no_estaba", label: "No estaba" },
  { value: "no_quiso", label: "No quiso pagar" },
] as const;

/** Día de la semana ISO: lunes=1 … domingo=7. */
export function diaSemana(fecha: Date): number {
  const d = fecha.getDay(); // 0=domingo … 6=sábado
  return d === 0 ? 7 : d;
}

export interface ParadaRuta {
  clienteId: number;
  diaCobro: number | null;
  saldo: number;
  diasVencido: number;
  grupo?: "hoy" | "otros";
}

/**
 * Ordena la ruta: los clientes cuyo día de cobro es hoy van primero; dentro de
 * cada grupo, más vencidos primero y luego mayor saldo.
 */
export function ordenarRuta<T extends ParadaRuta>(paradas: T[], hoy: number): T[] {
  return paradas
    .map((p) => ({ ...p, grupo: (p.diaCobro === hoy ? "hoy" : "otros") as "hoy" | "otros" }))
    .sort((a, b) => {
      if (a.grupo !== b.grupo) return a.grupo === "hoy" ? -1 : 1;
      if (b.diasVencido !== a.diasVencido) return b.diasVencido - a.diasVencido;
      return b.saldo - a.saldo;
    });
}

/**
 * Tipos de nota de inventario (ajustes manuales) y su efecto en existencias.
 * Lógica pura con pruebas de escritorio.
 */
export const TIPOS_NOTA = [
  { value: "diferencia_positiva", label: "Diferencia positiva (sobrante)", signo: 1 },
  { value: "ajuste_entrada", label: "Ajuste de entrada", signo: 1 },
  { value: "merma", label: "Merma", signo: -1 },
  { value: "dano", label: "Daño", signo: -1 },
  { value: "diferencia_negativa", label: "Diferencia negativa (faltante)", signo: -1 },
  { value: "ajuste_salida", label: "Ajuste de salida", signo: -1 },
] as const;

const SIGNO = new Map<string, number>(TIPOS_NOTA.map((t) => [t.value, t.signo]));

/** +1 si la nota suma existencias, -1 si las resta. Lanza si el tipo es desconocido. */
export function signoNota(tipo: string): number {
  const s = SIGNO.get(tipo);
  if (s === undefined) throw new Error(`Tipo de nota desconocido: ${tipo}`);
  return s;
}

export function esEntrada(tipo: string): boolean {
  return signoNota(tipo) === 1;
}

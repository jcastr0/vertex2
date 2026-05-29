/** Formatea un número consecutivo con prefijo (p. ej. PED-000001). */
export function formatearNumero(prefijo: string, n: number, ancho = 6): string {
  return `${prefijo}-${String(n).padStart(ancho, "0")}`;
}

import { notFound } from "next/navigation";

/**
 * Parsea el id numérico de un segmento de ruta dinámica. Si el segmento no es
 * un entero positivo (p. ej. `/pedidos/nuevo` → "nuevo", o una URL mal escrita),
 * responde 404 en lugar de pasar `NaN` a la consulta — que en Postgres revienta
 * con `invalid input syntax for type bigint: "NaN"` y produce un 500.
 */
export function parseId(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return n;
}

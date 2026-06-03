import type { SalidaItem } from "./schema";

export interface CatalogoItem { id: number; nombre: string; sku: string; precio: number; unidad: string; }
export type Historial = Record<number, number>;

export interface LineaPropuesta {
  productoId: number;
  nombre: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

/** ¿La unidad es "por unidad" (und)? Entonces no hace falta recalcarla. */
function esUnidad(u: string): boolean {
  return /^(und|unid|unidad|u)\b/i.test(u.trim());
}
/** "0.5 kg de Cebolla" / "12 Lechuga batavia" (omite la unidad si es 'und'). */
function lineaLegible(cantidad: number, unidad: string, nombre: string): string {
  return esUnidad(unidad) ? `${cantidad} ${nombre}` : `${cantidad} ${unidad} de ${nombre}`;
}
export interface Propuesta {
  lineas: LineaPropuesta[];
  noReconocidos: string[];
  resumen: string;
  total: number;
}

export const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

/** Texto "Entendí: • ... = $... \n\nTotal: $..." para una lista de renglones (con precio). */
export function resumenLineas(lineas: { nombre: string; unidad: string; cantidad: number; precioUnitario: number }[]): { texto: string; total: number } {
  const total = lineas.reduce((a, l) => a + l.cantidad * l.precioUnitario, 0);
  const detalle = lineas
    .map((l) => `• ${lineaLegible(l.cantidad, l.unidad, l.nombre)} (${money(l.precioUnitario)}) = ${money(l.cantidad * l.precioUnitario)}`)
    .join("\n");
  return { texto: `${detalle}\n\nTotal: ${money(total)}`, total };
}

/**
 * Convierte la salida de Claude en una propuesta lista para mostrar/crear.
 * - Empareja por `productoId` contra el catálogo (nunca inventa productos).
 * - Precio: último a ese cliente (historial) → precio de catálogo → 0.
 * - Items sin id válido → `noReconocidos` (texto "cantidad × nombre").
 */
export function mapearPropuesta(salida: { items: SalidaItem[] }, catalogo: CatalogoItem[], historial: Historial): Propuesta {
  const porId = new Map(catalogo.map((c) => [c.id, c]));
  const lineas: LineaPropuesta[] = [];
  const noReconocidos: string[] = [];

  for (const it of salida.items) {
    const cat = it.productoId != null ? porId.get(it.productoId) : undefined;
    if (!cat) {
      noReconocidos.push(`${it.cantidad} × ${it.nombre}`);
      continue;
    }
    const precioUnitario = historial[cat.id] ?? cat.precio ?? 0;
    lineas.push({
      productoId: cat.id,
      nombre: cat.nombre,
      unidad: cat.unidad,
      cantidad: it.cantidad,
      precioUnitario,
      subtotal: it.cantidad * precioUnitario,
    });
  }

  const total = lineas.reduce((a, l) => a + l.subtotal, 0);
  const partes: string[] = [];
  if (lineas.length) {
    partes.push("Entendí:\n" + lineas.map((l) => `• ${lineaLegible(l.cantidad, l.unidad, l.nombre)} (${money(l.precioUnitario)}) = ${money(l.subtotal)}`).join("\n"));
    partes.push(`Total: ${money(total)}`);
  }
  if (noReconocidos.length) {
    partes.push("No reconocí (los revisará el vendedor):\n" + noReconocidos.map((n) => `• ${n}`).join("\n"));
  }
  const resumen = partes.join("\n\n") || "No entendí ningún producto.";

  return { lineas, noReconocidos, resumen, total };
}

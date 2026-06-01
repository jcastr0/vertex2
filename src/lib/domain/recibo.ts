/** Codifica líneas de texto a bytes ESC/POS (init + texto + corte opcional). */
export function escposBytes(lineas: string[], opts: { cortar: boolean }): Uint8Array {
  const out: number[] = [0x1b, 0x40]; // ESC @  (init)
  const enc = (s: string) => { for (const ch of s) out.push(ch.charCodeAt(0) & 0xff); };
  for (const l of lineas) { enc(l); out.push(0x0a); } // LF
  out.push(0x0a, 0x0a);
  if (opts.cortar) out.push(0x1d, 0x56, 0x00); // GS V 0 (corte total)
  return new Uint8Array(out);
}

export interface LineaReciboVenta { producto: string; cantidad: number; precio: number; subtotal: number }
export interface DatosReciboVenta {
  empresa: string; nit: string; numero: string; fecha: string; cliente: string;
  lineas: LineaReciboVenta[]; total: number; formaPago: string;
  /** Si la factura está anulada, el recibo muestra una marca de agua "ANULADA". */
  anulada?: boolean;
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

/** Texto plano del recibo (para impresión térmica de ~32 cols). */
export function textoReciboVenta(d: DatosReciboVenta, cols = 32): string[] {
  const sep = "-".repeat(cols);
  const par = (izq: string, der: string) => (izq + der.padStart(Math.max(0, cols - izq.length))).slice(0, cols);
  const centrar = (s: string) => { const p = Math.max(0, Math.floor((cols - s.length) / 2)); return " ".repeat(p) + s; };
  const out: string[] = [d.empresa, `NIT ${d.nit}`, sep];
  if (d.anulada) out.push(centrar("*** ANULADA ***"), sep);
  out.push(`Factura ${d.numero}`, d.fecha, `Cliente: ${d.cliente}`, sep);
  for (const l of d.lineas) {
    out.push(l.producto.slice(0, cols));
    out.push(par(`  ${l.cantidad} x ${money(l.precio)}`, money(l.subtotal)));
  }
  out.push(sep, par("TOTAL", money(d.total)), `Pago: ${d.formaPago}`, sep, "¡Gracias por su compra!");
  return out;
}

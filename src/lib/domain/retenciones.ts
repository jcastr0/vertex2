/**
 * Cálculo de retenciones en pagos a proveedores (lógica pura, testeable).
 *
 * Una retención aplica cuando: el proveedor emite factura electrónica, la
 * retención está activa y marcada "aplica a todas", y la base supera (o iguala)
 * su base mínima. El valor se redondea al peso.
 */
export interface RetencionConfig {
  id: number;
  nombre: string;
  porcentaje: number;
  baseMinima: number;
  aplicaTodas: boolean;
  activa: boolean;
}

export interface RetencionAplicada {
  retencionId: number;
  nombre: string;
  base: number;
  porcentaje: number;
  valor: number;
}

export interface ResultadoRetenciones {
  detalle: RetencionAplicada[];
  total: number;
}

export function calcularRetenciones(
  base: number,
  retenciones: RetencionConfig[],
  tieneFacturaElectronica: boolean,
): ResultadoRetenciones {
  if (!tieneFacturaElectronica) return { detalle: [], total: 0 };

  const detalle: RetencionAplicada[] = [];
  for (const r of retenciones) {
    if (!r.activa || !r.aplicaTodas) continue;
    if (base < r.baseMinima) continue;
    const valor = Math.round((base * r.porcentaje) / 100);
    detalle.push({ retencionId: r.id, nombre: r.nombre, base, porcentaje: r.porcentaje, valor });
  }
  const total = detalle.reduce((a, d) => a + d.valor, 0);
  return { detalle, total };
}

import { z } from "zod";

export const lineaCotizacionSchema = z.object({
  productoId: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().positive(),
  precioUnitario: z.coerce.number().min(0),
});

export const cotizacionSchema = z.object({
  clienteId: z.coerce.number().int().positive("Selecciona el cliente"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  observaciones: z.string().optional(),
  lineas: z.array(lineaCotizacionSchema).min(1, "Agrega al menos un producto"),
});

export type CotizacionInput = z.infer<typeof cotizacionSchema>;

function lineasDe(form: FormData): unknown {
  try {
    return JSON.parse(String(form.get("lineasJson") ?? "[]"));
  } catch {
    return [];
  }
}

export function parseCotizacionForm(form: FormData) {
  return cotizacionSchema.safeParse({
    clienteId: form.get("clienteId"),
    fecha: form.get("fecha"),
    observaciones: form.get("observaciones") || undefined,
    lineas: lineasDe(form),
  });
}

// Conversión a factura: líneas (posiblemente ajustadas) + bodega + tipo de venta.
export const facturarSchema = z.object({
  bodegaId: z.coerce.number().int().positive("Selecciona la bodega"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  tipoVenta: z.enum(["contado", "credito"]).default("contado"),
  lineas: z.array(lineaCotizacionSchema).min(1, "La cotización no tiene líneas"),
});

export function parseFacturarForm(form: FormData) {
  return facturarSchema.safeParse({
    bodegaId: form.get("bodegaId"),
    fecha: form.get("fecha"),
    tipoVenta: form.get("tipoVenta") || "contado",
    lineas: lineasDe(form),
  });
}

import { z } from "zod";

export const lineaFacturaSchema = z.object({
  productoId: z.coerce.number().int().positive(),
  unidadId: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().positive(),
  precioUnitario: z.coerce.number().min(0),
});

export const facturaSchema = z.object({
  clienteId: z.coerce.number().int().positive("Selecciona el cliente"),
  bodegaId: z.coerce.number().int().positive("Selecciona la bodega"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  tipoVenta: z.enum(["contado", "credito"]).default("contado"),
  lineas: z.array(lineaFacturaSchema).min(1, "Agrega al menos un producto"),
});

export type FacturaInput = z.infer<typeof facturaSchema>;

export function parseFacturaForm(form: FormData) {
  let lineas: unknown = [];
  try {
    lineas = JSON.parse(String(form.get("lineasJson") ?? "[]"));
  } catch {
    /* ignore */
  }
  return facturaSchema.safeParse({
    clienteId: form.get("clienteId"),
    bodegaId: form.get("bodegaId"),
    fecha: form.get("fecha"),
    tipoVenta: form.get("tipoVenta") || "contado",
    lineas,
  });
}

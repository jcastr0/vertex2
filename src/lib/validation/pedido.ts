import { z } from "zod";

export const lineaSchema = z.object({
  productoId: z.coerce.number().int().positive(),
  unidadId: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().positive(),
  precioUnitario: z.coerce.number().min(0),
});

export const costoSchema = z.object({
  categoriaId: z.coerce.number().int().positive().optional(),
  tipo: z.string().trim().min(1),
  descripcion: z.string().trim().optional().or(z.literal("")),
  valor: z.coerce.number().min(0),
});

export const pedidoSchema = z.object({
  proveedorId: z.coerce.number().int().positive("Selecciona el proveedor"),
  bodegaId: z.coerce.number().int().positive("Selecciona la bodega destino"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  observaciones: z.string().trim().optional().or(z.literal("")),
  lineas: z.array(lineaSchema).min(1, "Agrega al menos un producto"),
  costos: z.array(costoSchema).default([]),
});

export type PedidoInput = z.infer<typeof pedidoSchema>;

export function parsePedidoForm(form: FormData) {
  let lineas: unknown = [];
  let costos: unknown = [];
  try {
    lineas = JSON.parse(String(form.get("lineasJson") ?? "[]"));
    costos = JSON.parse(String(form.get("costosJson") ?? "[]"));
  } catch {
    /* ignore */
  }
  return pedidoSchema.safeParse({
    proveedorId: form.get("proveedorId"),
    bodegaId: form.get("bodegaId"),
    fecha: form.get("fecha"),
    observaciones: form.get("observaciones") ?? "",
    lineas,
    costos,
  });
}

import { z } from "zod";

export const lineaDevolucionSchema = z.object({
  productoId: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().positive(),
  precioUnitario: z.coerce.number().min(0),
});

export const devolucionSchema = z.object({
  clienteId: z.coerce.number().int().positive("Selecciona el cliente"),
  bodegaId: z.coerce.number().int().positive("Selecciona la bodega de reingreso"),
  facturaId: z
    .union([z.coerce.number().int().positive(), z.null()])
    .optional()
    .transform((v) => v ?? null),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  motivo: z.string().trim().min(1, "El motivo es obligatorio").max(1000),
  lineas: z.array(lineaDevolucionSchema).min(1, "Agrega al menos un producto"),
});

export type DevolucionInput = z.infer<typeof devolucionSchema>;

export function parseDevolucionForm(form: FormData) {
  let lineas: unknown = [];
  try {
    lineas = JSON.parse(String(form.get("lineasJson") ?? "[]"));
  } catch {
    /* ignore */
  }
  const f = form.get("facturaId");
  return devolucionSchema.safeParse({
    clienteId: form.get("clienteId"),
    bodegaId: form.get("bodegaId"),
    facturaId: f && f !== "" && f !== "0" ? f : null,
    fecha: form.get("fecha"),
    motivo: form.get("motivo") ?? "",
    lineas,
  });
}

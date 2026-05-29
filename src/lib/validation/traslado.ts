import { z } from "zod";

export const lineaTrasladoSchema = z.object({
  productoId: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().positive(),
});

export const trasladoSchema = z
  .object({
    bodegaOrigenId: z.coerce.number().int().positive("Selecciona la bodega origen"),
    bodegaDestinoId: z.coerce.number().int().positive("Selecciona la bodega destino"),
    fecha: z.string().min(1, "La fecha es obligatoria"),
    observaciones: z.string().trim().optional().or(z.literal("")),
    lineas: z.array(lineaTrasladoSchema).min(1, "Agrega al menos un producto"),
  })
  .refine((d) => d.bodegaOrigenId !== d.bodegaDestinoId, {
    message: "La bodega origen y destino deben ser diferentes",
    path: ["bodegaDestinoId"],
  });

export type TrasladoInput = z.infer<typeof trasladoSchema>;

export function parseTrasladoForm(form: FormData) {
  let lineas: unknown = [];
  try {
    lineas = JSON.parse(String(form.get("lineasJson") ?? "[]"));
  } catch {
    /* ignore */
  }
  return trasladoSchema.safeParse({
    bodegaOrigenId: form.get("bodegaOrigenId"),
    bodegaDestinoId: form.get("bodegaDestinoId"),
    fecha: form.get("fecha"),
    observaciones: form.get("observaciones") ?? "",
    lineas,
  });
}

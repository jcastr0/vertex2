import { z } from "zod";

export const movimientoManualSchema = z
  .object({
    cuentaPropiaId: z.coerce.number().int().positive(),
    origen: z.enum(["traslado", "comision", "ajuste", "consignacion", "retiro"]),
    valor: z.coerce.number().positive("El valor debe ser mayor a 0"),
    fecha: z.string().min(1),
    descripcion: z.string().trim().max(500).optional(),
    contraCuentaId: z.coerce.number().int().positive().optional(),
  })
  .refine((d) => d.origen !== "traslado" || !!d.contraCuentaId, {
    message: "Un traslado requiere la cuenta destino",
    path: ["contraCuentaId"],
  })
  .refine((d) => d.origen !== "traslado" || d.contraCuentaId !== d.cuentaPropiaId, {
    message: "La cuenta destino debe ser distinta del origen",
    path: ["contraCuentaId"],
  });
export type MovimientoManualInput = z.infer<typeof movimientoManualSchema>;

export function parseMovimientoForm(form: FormData) {
  return movimientoManualSchema.safeParse({
    cuentaPropiaId: form.get("cuentaPropiaId"),
    origen: form.get("origen"),
    valor: form.get("valor"),
    fecha: form.get("fecha"),
    descripcion: form.get("descripcion") || undefined,
    contraCuentaId: form.get("contraCuentaId") || undefined,
  });
}

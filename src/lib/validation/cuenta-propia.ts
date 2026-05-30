import { z } from "zod";

export const cuentaPropiaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  tipo: z.enum(["ahorros", "corriente", "caja"]),
  banco: z.string().trim().max(100).optional(),
  numeroCuenta: z.string().trim().max(50).optional(),
  titularNit: z.string().trim().max(50).optional(),
  titularNombre: z.string().trim().max(200).optional(),
  saldoInicial: z.coerce.number().default(0),
  activa: z.boolean().default(true),
});
export type CuentaPropiaInput = z.infer<typeof cuentaPropiaSchema>;

export function parseCuentaPropiaForm(form: FormData) {
  return cuentaPropiaSchema.safeParse({
    nombre: form.get("nombre"),
    tipo: form.get("tipo"),
    banco: form.get("banco") || undefined,
    numeroCuenta: form.get("numeroCuenta") || undefined,
    titularNit: form.get("titularNit") || undefined,
    titularNombre: form.get("titularNombre") || undefined,
    saldoInicial: form.get("saldoInicial") || 0,
    activa: form.get("activa") !== "false",
  });
}

import { z } from "zod";

export const beneficiarioSchema = z.object({
  banco: z.string().trim().min(1, "El banco es obligatorio").max(100),
  tipo: z.enum(["ahorros", "corriente"]),
  numeroCuenta: z.string().trim().min(1, "El número de cuenta es obligatorio").max(50),
  titularNit: z.string().trim().min(1, "El NIT del titular es obligatorio").max(50),
  titularNombre: z.string().trim().min(1, "El nombre del titular es obligatorio").max(200),
  activa: z.boolean().default(true),
});
export type BeneficiarioInput = z.infer<typeof beneficiarioSchema>;

export function parseBeneficiarioForm(form: FormData) {
  return beneficiarioSchema.safeParse({
    banco: form.get("banco"),
    tipo: form.get("tipo"),
    numeroCuenta: form.get("numeroCuenta"),
    titularNit: form.get("titularNit"),
    titularNombre: form.get("titularNombre"),
    activa: form.get("activa") !== "false",
  });
}

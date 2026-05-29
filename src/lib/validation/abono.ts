import { z } from "zod";
import { METODOS_PAGO } from "@/lib/domain/cartera";

const metodos = METODOS_PAGO.map((m) => m.value) as [string, ...string[]];

export const abonoSchema = z.object({
  cuentaId: z.coerce.number().int().positive(),
  valor: z.coerce.number().positive("El valor debe ser mayor a 0"),
  metodoPago: z.enum(metodos),
  referencia: z.string().trim().max(100).optional().or(z.literal("")),
  fecha: z.string().min(1, "La fecha es obligatoria"),
});

export type AbonoInput = z.infer<typeof abonoSchema>;

export function parseAbonoForm(form: FormData) {
  return abonoSchema.safeParse({
    cuentaId: form.get("cuentaId"),
    valor: form.get("valor"),
    metodoPago: form.get("metodoPago"),
    referencia: form.get("referencia") ?? "",
    fecha: form.get("fecha"),
  });
}

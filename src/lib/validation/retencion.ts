import { z } from "zod";

export const retencionSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  porcentaje: z.coerce.number().positive("El porcentaje debe ser mayor a 0").max(100),
  baseMinima: z.coerce.number().min(0).default(0),
  aplicaTodas: z.boolean().default(true),
  activa: z.boolean().default(true),
});

export type RetencionInput = z.infer<typeof retencionSchema>;

export function parseRetencionForm(form: FormData) {
  return retencionSchema.safeParse({
    nombre: form.get("nombre"),
    porcentaje: form.get("porcentaje"),
    baseMinima: form.get("baseMinima") || 0,
    aplicaTodas: form.get("aplicaTodas") !== "false",
    activa: form.get("activa") !== "false",
  });
}

import { z } from "zod";

export const bodegaSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, "El código es obligatorio")
    .max(20, "Máximo 20 caracteres"),
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  direccion: z.string().trim().max(500).optional().or(z.literal("")),
  responsable: z.string().trim().max(100).optional().or(z.literal("")),
  telefono: z.string().trim().max(20).optional().or(z.literal("")),
  esPrincipal: z.boolean().default(false),
});

export type BodegaInput = z.infer<typeof bodegaSchema>;

/** Parsea FormData de un formulario de bodega. */
export function parseBodegaForm(form: FormData) {
  return bodegaSchema.safeParse({
    codigo: form.get("codigo"),
    nombre: form.get("nombre"),
    direccion: form.get("direccion") ?? "",
    responsable: form.get("responsable") ?? "",
    telefono: form.get("telefono") ?? "",
    esPrincipal: form.get("esPrincipal") === "on" || form.get("esPrincipal") === "true",
  });
}

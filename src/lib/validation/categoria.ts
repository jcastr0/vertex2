import { z } from "zod";

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  descripcion: z.string().trim().max(500).optional().or(z.literal("")),
  padreId: z
    .union([z.coerce.number().int().positive(), z.null()])
    .optional()
    .transform((v) => v ?? null),
});

export type CategoriaInput = z.infer<typeof categoriaSchema>;

export function parseCategoriaForm(form: FormData) {
  const padre = form.get("padreId");
  return categoriaSchema.safeParse({
    nombre: form.get("nombre"),
    descripcion: form.get("descripcion") ?? "",
    padreId: padre && padre !== "" && padre !== "0" ? padre : null,
  });
}

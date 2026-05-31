import { z } from "zod";

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  descripcion: z.string().trim().max(500).optional().or(z.literal("")),
  tipo: z.enum(["producto", "gasto"]).default("producto"),
  padreId: z
    .union([z.coerce.number().int().positive(), z.null()])
    .optional()
    .transform((v) => v ?? null),
});

export type CategoriaInput = z.infer<typeof categoriaSchema>;

export function parseCategoriaForm(form: FormData) {
  const padre = form.get("padreId");
  const tipo = form.get("tipo");
  return categoriaSchema.safeParse({
    nombre: form.get("nombre"),
    descripcion: form.get("descripcion") ?? "",
    tipo: tipo === "gasto" ? "gasto" : "producto",
    padreId: padre && padre !== "" && padre !== "0" ? padre : null,
  });
}

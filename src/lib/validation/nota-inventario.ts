import { z } from "zod";
import { TIPOS_NOTA } from "@/lib/domain/nota-inventario";

const valores = TIPOS_NOTA.map((t) => t.value) as [string, ...string[]];

export const notaInventarioSchema = z.object({
  bodegaId: z.coerce.number().int().positive("Selecciona la bodega"),
  productoId: z.coerce.number().int().positive("Selecciona el producto"),
  tipo: z.enum(valores),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  motivo: z.string().trim().min(1, "El motivo es obligatorio").max(1000),
});

export type NotaInventarioInput = z.infer<typeof notaInventarioSchema>;

export function parseNotaInventarioForm(form: FormData) {
  return notaInventarioSchema.safeParse({
    bodegaId: form.get("bodegaId"),
    productoId: form.get("productoId"),
    tipo: form.get("tipo"),
    cantidad: form.get("cantidad"),
    motivo: form.get("motivo") ?? "",
  });
}

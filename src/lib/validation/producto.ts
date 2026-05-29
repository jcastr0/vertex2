import { z } from "zod";

const opcionalNum = z
  .union([z.coerce.number().min(0), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : Number(v)));

export const productoSchema = z.object({
  sku: z.string().trim().min(1, "El SKU es obligatorio").max(50),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  descripcion: z.string().trim().max(1000).optional().or(z.literal("")),
  categoriaId: z
    .union([z.coerce.number().int().positive(), z.null()])
    .optional()
    .transform((v) => v ?? null),
  unidadBaseId: z.coerce.number({ message: "Selecciona la unidad base" }).int().positive(
    "Selecciona la unidad base",
  ),
  precioCompraSugerido: opcionalNum,
  stockMinimo: z.coerce.number().min(0).default(0),
  stockMaximo: opcionalNum,
  clasificacionAbc: z.enum(["A", "B", "C"]).optional().or(z.literal("")),
});

export type ProductoInput = z.infer<typeof productoSchema>;

export function parseProductoForm(form: FormData) {
  const cat = form.get("categoriaId");
  return productoSchema.safeParse({
    sku: form.get("sku"),
    nombre: form.get("nombre"),
    descripcion: form.get("descripcion") ?? "",
    categoriaId: cat && cat !== "" && cat !== "0" ? cat : null,
    unidadBaseId: form.get("unidadBaseId"),
    precioCompraSugerido: form.get("precioCompraSugerido") ?? "",
    stockMinimo: form.get("stockMinimo") || 0,
    stockMaximo: form.get("stockMaximo") ?? "",
    clasificacionAbc:
      form.get("clasificacionAbc") && form.get("clasificacionAbc") !== "none"
        ? form.get("clasificacionAbc")
        : "",
  });
}

// ── Unidad del producto (presentación) ──────────────────────────────────────
export const productoUnidadSchema = z.object({
  unidadId: z.coerce.number().int().positive("Selecciona la unidad"),
  factorConversion: z.coerce.number().positive("El factor debe ser mayor a 0"),
  precioVenta: opcionalNum,
  esPrecioCalculado: z.boolean().default(true),
  permiteCompra: z.boolean().default(true),
  permiteVenta: z.boolean().default(true),
});

export type ProductoUnidadInput = z.infer<typeof productoUnidadSchema>;

export function parseProductoUnidadForm(form: FormData) {
  return productoUnidadSchema.safeParse({
    unidadId: form.get("unidadId"),
    factorConversion: form.get("factorConversion"),
    precioVenta: form.get("precioVenta") ?? "",
    esPrecioCalculado: form.get("esPrecioCalculado") === "on" || form.get("esPrecioCalculado") === "true",
    permiteCompra: form.get("permiteCompra") !== "false",
    permiteVenta: form.get("permiteVenta") !== "false",
  });
}

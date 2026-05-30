import { z } from "zod";

export const TIPOS_TERCERO = ["proveedor", "cliente", "ambos"] as const;
export const TIPOS_IDENTIFICACION = ["NIT", "CC", "CE", "PASAPORTE", "OTRO"] as const;
export const TIPOS_PERSONA = ["natural", "juridica"] as const;

const opcional = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const terceroSchema = z.object({
  tipo: z.enum(TIPOS_TERCERO),
  codigo: z.string().trim().min(1, "El código es obligatorio").max(50),
  razonSocial: z.string().trim().min(1, "La razón social es obligatoria").max(200),
  nombreComercial: opcional(200),
  tipoIdentificacion: z.enum(TIPOS_IDENTIFICACION).default("NIT"),
  identificacion: z.string().trim().min(1, "La identificación es obligatoria").max(50),
  tipoPersona: z.enum(TIPOS_PERSONA).default("juridica"),
  email: z.string().trim().email("Correo inválido").max(100).optional().or(z.literal("")),
  telefono: opcional(20),
  celular: opcional(20),
  direccion: opcional(500),
  ciudad: opcional(100),
  departamento: opcional(100),
  condicionesPago: opcional(100),
  diasCreditoProveedor: z.coerce.number().int().min(0).default(0),
  cupoCredito: z.coerce.number().min(0).default(0),
  diasCreditoCliente: z.coerce.number().int().min(0).default(0),
  requiereFacturaElectronica: z.boolean().default(false),
  observaciones: opcional(1000),
  recaudadorId: z
    .union([z.coerce.number().int().positive(), z.null()])
    .optional()
    .transform((v) => v ?? null),
  diaCobro: z
    .union([z.coerce.number().int().min(1).max(6), z.null()])
    .optional()
    .transform((v) => v ?? null),
});

export type TerceroInput = z.infer<typeof terceroSchema>;

export function parseTerceroForm(form: FormData) {
  const v = (k: string) => form.get(k) ?? "";
  return terceroSchema.safeParse({
    tipo: form.get("tipo"),
    codigo: v("codigo"),
    razonSocial: v("razonSocial"),
    nombreComercial: v("nombreComercial"),
    tipoIdentificacion: form.get("tipoIdentificacion") || "NIT",
    identificacion: v("identificacion"),
    tipoPersona: form.get("tipoPersona") || "juridica",
    email: v("email"),
    telefono: v("telefono"),
    celular: v("celular"),
    direccion: v("direccion"),
    ciudad: v("ciudad"),
    departamento: v("departamento"),
    condicionesPago: v("condicionesPago"),
    diasCreditoProveedor: v("diasCreditoProveedor") || 0,
    cupoCredito: v("cupoCredito") || 0,
    diasCreditoCliente: v("diasCreditoCliente") || 0,
    requiereFacturaElectronica:
      form.get("requiereFacturaElectronica") === "on" ||
      form.get("requiereFacturaElectronica") === "true",
    observaciones: v("observaciones"),
    recaudadorId: form.get("recaudadorId") && form.get("recaudadorId") !== "0" ? form.get("recaudadorId") : null,
    diaCobro: form.get("diaCobro") && form.get("diaCobro") !== "0" ? form.get("diaCobro") : null,
  });
}

import { z } from "zod";
import { PALETAS } from "@/lib/temas/paletas";

const opc = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const PALETA_KEYS = PALETAS.map((p) => p.key) as [string, ...string[]];

export const empresaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  razonSocial: z.string().trim().min(1, "La razón social es obligatoria").max(200),
  nit: z.string().trim().min(1, "El NIT es obligatorio").max(50),
  email: z.string().trim().email("Correo inválido").max(150),
  telefono: opc(30),
  direccion: opc(255),
  ciudad: opc(100),
  pais: opc(100),
  paletaTema: z.enum(PALETA_KEYS).optional().or(z.literal("")),
});

export type EmpresaInput = z.infer<typeof empresaSchema>;

export function parseEmpresaForm(form: FormData) {
  return empresaSchema.safeParse({
    nombre: form.get("nombre"),
    razonSocial: form.get("razonSocial"),
    nit: form.get("nit"),
    email: form.get("email"),
    telefono: form.get("telefono") ?? "",
    direccion: form.get("direccion") ?? "",
    ciudad: form.get("ciudad") ?? "",
    pais: form.get("pais") ?? "",
    paletaTema: form.get("paletaTema") ?? "",
  });
}

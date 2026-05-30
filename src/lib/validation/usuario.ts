import { z } from "zod";

export const usuarioSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  email: z.string().trim().email("Correo inválido").max(150),
  rolId: z.coerce.number().int().positive("Selecciona el rol"),
  activo: z.boolean().default(true),
  // Opcional: requerida al crear (se valida en la acción).
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100)
    .optional()
    .or(z.literal("")),
});

export type UsuarioInput = z.infer<typeof usuarioSchema>;

export function parseUsuarioForm(form: FormData) {
  return usuarioSchema.safeParse({
    nombre: form.get("nombre"),
    email: form.get("email"),
    rolId: form.get("rolId"),
    activo: form.get("activo") !== "false",
    password: form.get("password") ?? "",
  });
}

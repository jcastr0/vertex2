import { z } from "zod";
import { MODULOS, ACCIONES } from "@/lib/auth/roles";

const VALIDOS = new Set(MODULOS.flatMap((m) => ACCIONES.map((a) => `${m}.${a}`)));

/**
 * Solo se aceptan permisos `modulo.accion` del catálogo. El comodín `"*"` NO es
 * un permiso asignable por la matriz: queda reservado exclusivamente para el rol
 * SuperAdmin sembrado en la BD, para que nadie pueda crear otro rol todopoderoso.
 */
export function permisosValidos(permisos: string[]): boolean {
  return permisos.every((p) => VALIDOS.has(p));
}

export const rolNombreSchema = z.string().trim().min(2, "Nombre muy corto").max(50);

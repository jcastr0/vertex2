import { z } from "zod";
import { MODULOS, ACCIONES } from "@/lib/auth/roles";

const VALIDOS = new Set(MODULOS.flatMap((m) => ACCIONES.map((a) => `${m}.${a}`)));

export function permisosValidos(permisos: string[]): boolean {
  return permisos.every((p) => p === "*" || VALIDOS.has(p));
}

export const rolNombreSchema = z.string().trim().min(2, "Nombre muy corto").max(50);

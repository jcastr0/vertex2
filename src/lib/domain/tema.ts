// src/lib/domain/tema.ts
import type { Paleta } from "@/lib/temas/paletas";

/** Texto legible (#111111 u #ffffff) sobre un color hex, por luminancia relativa. */
export function contraste(hex: string): "#111111" | "#ffffff" {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.35 ? "#111111" : "#ffffff";
}

/** CSS que sobreescribe los tokens de marca con la paleta. Vacío si no hay paleta. */
export function temaCss(paleta: Paleta | null): string {
  if (!paleta) return "";
  const { primario, acento, sidebar } = paleta;
  const vars: Record<string, string> = {
    "--primary": primario,
    "--primary-foreground": contraste(primario),
    "--accent": acento,
    "--accent-foreground": contraste(acento),
    "--ring": primario,
    "--sidebar": sidebar,
    "--sidebar-foreground": contraste(sidebar),
    "--sidebar-primary": primario,
    "--sidebar-primary-foreground": contraste(primario),
    "--sidebar-ring": primario,
  };
  const cuerpo = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";");
  return `:root{${cuerpo}}`;
}

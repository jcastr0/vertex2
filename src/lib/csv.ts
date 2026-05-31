/** Generación de CSV simple y segura (escapa comillas, comas y saltos de línea). */

function celda(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Arma un CSV a partir de encabezados y filas. Usa `;` como separador (Excel en
 * configuración regional ES) y antepone BOM para que Excel respete UTF-8.
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lineas = [headers.map(celda).join(";"), ...rows.map((r) => r.map(celda).join(";"))];
  return "﻿" + lineas.join("\r\n");
}

/** Respuesta HTTP de descarga de un CSV. */
export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

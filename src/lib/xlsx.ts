// src/lib/xlsx.ts
import "server-only";
import ExcelJS from "exceljs";
import type { ColumnaExport } from "@/lib/reportes/tipos";

const FMT: Record<ColumnaExport["tipo"], string | undefined> = {
  money: "$#,##0",
  num: "#,##0.####",
  fecha: "yyyy-mm-dd",
  texto: undefined,
};

/**
 * Construye un .xlsx con formato elegante: título + filtros + fecha, encabezado
 * con estilo, formato por tipo de columna, fila de totales, congelar encabezado,
 * autofiltro y anchos automáticos.
 */
export async function construirXlsx(
  titulo: string,
  filtrosTexto: string,
  columnas: ColumnaExport[],
  filas: (string | number | null)[][],
  generadoEn: string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Reporte");
  const nCols = columnas.length;

  // Título
  ws.mergeCells(1, 1, 1, nCols);
  const t = ws.getCell(1, 1);
  t.value = titulo;
  t.font = { bold: true, size: 14, color: { argb: "FF065F46" } };
  // Filtros + fecha
  ws.mergeCells(2, 1, 2, nCols);
  ws.getCell(2, 1).value = `${filtrosTexto}    ·    Generado: ${generadoEn}`;
  ws.getCell(2, 1).font = { size: 9, color: { argb: "FF6B7280" } };

  // Encabezado (fila 4)
  const headerRow = ws.getRow(4);
  columnas.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
    cell.alignment = { vertical: "middle" };
  });
  headerRow.commit();

  // Datos
  filas.forEach((fila) => {
    const row = ws.addRow(fila);
    columnas.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      if (FMT[c.tipo]) cell.numFmt = FMT[c.tipo]!;
    });
  });

  // Totales
  if (columnas.some((c) => c.total)) {
    const totals: (string | number | null)[] = columnas.map((c, i) => {
      if (i === 0) return "TOTAL";
      if (!c.total) return null;
      return filas.reduce((acc, f) => acc + (Number(f[i]) || 0), 0);
    });
    const row = ws.addRow(totals);
    row.font = { bold: true };
    columnas.forEach((c, i) => {
      if (c.total && FMT[c.tipo]) row.getCell(i + 1).numFmt = FMT[c.tipo]!;
    });
  }

  // Anchos
  columnas.forEach((c, i) => {
    const maxLen = Math.max(c.header.length, ...filas.map((f) => String(f[i] ?? "").length));
    ws.getColumn(i + 1).width = Math.min(40, Math.max(10, maxLen + 2));
  });

  // Congelar encabezado + autofiltro
  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: nCols } };

  const arr = await wb.xlsx.writeBuffer();
  return Buffer.from(arr);
}

export function xlsxResponse(filename: string, buf: Buffer): Response {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

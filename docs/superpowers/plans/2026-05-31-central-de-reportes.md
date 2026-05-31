# Central de Reportes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una central de reportes con dashboards (KPIs + gráficos + filtros) y export del detalle a CSV/Excel, sobre un motor reutilizable, con 4 reportes estrella.

**Architecture:** Dashboards en server components (`/reportes/[slug]`) que leen filtros de la URL, corren consultas agregadas vía un servicio por reporte que devuelve `{ kpis, series, detalle }`, y pasan los datos a componentes de gráfico cliente (Recharts) + tabla de detalle. Un registry mapea `slug → ReporteDef`. Los botones de export apuntan a `/reportes/[slug]/export?fmt=csv|xlsx&<filtros>` (route handler) que reusa el mismo servicio y construye CSV (helper existente) o XLSX (ExcelJS).

**Tech Stack:** Next.js 15 App Router (RSC), Drizzle, Recharts (gráficos cliente), ExcelJS (xlsx), Tailwind v4. Spec: `docs/superpowers/specs/2026-05-31-central-de-reportes-design.md`.

**Convenciones del repo:** servicios en `src/lib/services/**` empiezan con `import "server-only"`. Pruebas de dominio puro: `src/lib/domain/*.test.ts` (vitest, `npx vitest run <archivo>`). Pruebas de integración (tocan BD): en `src/test/**` (GITIGNORADO) con `npx vitest run -c src/test/vitest.integration.config.ts <archivo>`. Permiso de reportes: `reportes.ver`. Dinero/fechas se guardan como string; convertir con `Number(...)`.

---

## File Structure

- `src/lib/reportes/tipos.ts` — tipos comunes (`DatosReporte`, `ColumnaExport`, `ChartSpec`, `ReporteDef`, etc.). Sin `server-only` (lo importan cliente y servidor).
- `src/lib/domain/reportes.ts` (+ `.test.ts`) — helpers puros: `tramoAging`, `margenPorc`, `ticketPromedio`, `efectividadVisitas`, `formatearValor`.
- `src/lib/xlsx.ts` — `construirXlsx(...)` con ExcelJS (formato elegante).
- `src/lib/services/reportes/ventas.ts` · `cartera-cobrar.ts` · `inventario.ts` · `recaudo.ts` — un servicio por reporte (`server-only`).
- `src/lib/reportes/registry.ts` — `REPORTES: ReporteDef[]` + `getReporte(slug)` (`server-only`; importa los servicios).
- `src/components/reportes/kpi.tsx` (server) · `tabla-detalle.tsx` (server) · `dashboard.tsx` (server) — render del dashboard.
- `src/components/reportes/chart-linea.tsx` · `chart-barras.tsx` · `chart-torta.tsx` · `chart-dispersion.tsx` — `"use client"` (Recharts).
- `src/components/reportes/filtro-reporte.tsx` (`"use client"`) · `export-botones.tsx` (server, enlaces).
- `src/app/(app)/reportes/page.tsx` — portada con tarjetas (modificar: conservar el bloque resumen + ExportFE existente debajo).
- `src/app/(app)/reportes/[slug]/page.tsx` — dashboard dinámico.
- `src/app/(app)/reportes/[slug]/export/route.ts` — export CSV/XLSX.

---

## Task 1: Instalar dependencias (recharts, exceljs)

**Files:** Modify: `package.json`

- [ ] **Step 1: Instalar**

Run: `cd /Users/jhonatan/Docker/Vertex2/vertex2 && npm i recharts exceljs`
Expected: agrega `recharts` y `exceljs` a dependencies; sin errores de peer (recharts 2.15+ soporta React 19).

- [ ] **Step 2: Verificar build base sigue verde**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json pnpm-lock.yaml 2>/dev/null; git commit -m "chore: add recharts y exceljs para central de reportes"
```

---

## Task 2: Tipos comunes de reportes

**Files:** Create: `src/lib/reportes/tipos.ts`

- [ ] **Step 1: Crear el archivo de tipos**

```ts
// src/lib/reportes/tipos.ts
import type { LucideIcon } from "lucide-react";

export type FormatoNum = "money" | "num" | "pct";

export interface KpiDato {
  label: string;
  valor: number;
  formato: FormatoNum;
}

export interface SerieDato {
  x: string | number;
  y: number;
  etiqueta?: string;
}

export interface ColumnaExport {
  header: string;
  tipo: "texto" | "money" | "num" | "fecha";
  total?: boolean;
}

export interface DetalleReporte {
  columnas: ColumnaExport[];
  filas: (string | number | null)[][];
}

export interface DatosReporte {
  kpis: KpiDato[];
  series: Record<string, SerieDato[]>;
  detalle: DetalleReporte;
}

/** Filtros leídos de la URL. Siempre traen desde/hasta. */
export type Filtros = Record<string, string | undefined>;

export interface ChartSpec {
  tipo: "linea" | "barras" | "torta" | "dispersion";
  titulo: string;
  /** Clave dentro de DatosReporte.series. */
  serie: string;
  /** Formato del eje de valor / tooltips. */
  formato?: FormatoNum;
  ancho?: "full" | "half";
}

export interface FiltroSpec {
  key: string;
  label: string;
  tipo: "fecha" | "select";
  /** Solo select. */
  opciones?: { value: string; label: string }[];
}

export interface ReporteDef {
  slug: string;
  titulo: string;
  desc: string;
  grupo: string;
  icon: LucideIcon;
  charts: ChartSpec[];
  /** Opciones de filtros que dependen de la empresa (clientes, categorías…). */
  filtros: (empresaId: number) => Promise<FiltroSpec[]>;
  cargar: (empresaId: number, f: Filtros) => Promise<DatosReporte>;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/reportes/tipos.ts && git commit -m "feat(reportes): tipos comunes del motor"
```

---

## Task 3: Helpers de dominio (TDD)

**Files:** Create: `src/lib/domain/reportes.ts`, `src/lib/domain/reportes.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/lib/domain/reportes.test.ts
import { describe, it, expect } from "vitest";
import { tramoAging, margenPorc, ticketPromedio, efectividadVisitas } from "./reportes";

describe("tramoAging", () => {
  it("corriente cuando no está vencido (<=0 días)", () => {
    expect(tramoAging(0)).toBe("Corriente");
    expect(tramoAging(-5)).toBe("Corriente");
  });
  it("clasifica por tramos", () => {
    expect(tramoAging(1)).toBe("1-30");
    expect(tramoAging(30)).toBe("1-30");
    expect(tramoAging(31)).toBe("31-60");
    expect(tramoAging(60)).toBe("31-60");
    expect(tramoAging(61)).toBe("61-90");
    expect(tramoAging(91)).toBe("+90");
  });
});

describe("margenPorc", () => {
  it("margen sobre precio", () => {
    expect(margenPorc(1000, 600)).toBe(40); // (1000-600)/1000
  });
  it("0 si precio es 0", () => {
    expect(margenPorc(0, 600)).toBe(0);
  });
});

describe("ticketPromedio", () => {
  it("total / n", () => {
    expect(ticketPromedio(1000, 4)).toBe(250);
  });
  it("0 si no hay facturas", () => {
    expect(ticketPromedio(1000, 0)).toBe(0);
  });
});

describe("efectividadVisitas", () => {
  it("% de visitas con pago o abono", () => {
    expect(efectividadVisitas(7, 10)).toBe(70);
  });
  it("0 si no hubo visitas", () => {
    expect(efectividadVisitas(0, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `npx vitest run src/lib/domain/reportes.test.ts`
Expected: FAIL — "reportes" no exporta esas funciones.

- [ ] **Step 3: Implementar el mínimo**

```ts
// src/lib/domain/reportes.ts
/** Tramo de antigüedad de cartera según días vencido. */
export function tramoAging(diasVencido: number): "Corriente" | "1-30" | "31-60" | "61-90" | "+90" {
  if (diasVencido <= 0) return "Corriente";
  if (diasVencido <= 30) return "1-30";
  if (diasVencido <= 60) return "31-60";
  if (diasVencido <= 90) return "61-90";
  return "+90";
}

/** Margen porcentual sobre el precio de venta. */
export function margenPorc(precio: number, costo: number): number {
  if (precio <= 0) return 0;
  return ((precio - costo) / precio) * 100;
}

/** Ticket promedio = total / número de facturas. */
export function ticketPromedio(total: number, nFacturas: number): number {
  return nFacturas > 0 ? total / nFacturas : 0;
}

/** % de visitas que terminaron en pago o abono. */
export function efectividadVisitas(conPago: number, totalVisitas: number): number {
  return totalVisitas > 0 ? (conPago / totalVisitas) * 100 : 0;
}
```

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `npx vitest run src/lib/domain/reportes.test.ts`
Expected: PASS (todos verdes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/reportes.ts src/lib/domain/reportes.test.ts && git commit -m "feat(reportes): helpers de dominio (aging, margen, ticket, efectividad)"
```

---

## Task 4: Helper de Excel (ExcelJS)

**Files:** Create: `src/lib/xlsx.ts`

- [ ] **Step 1: Implementar el helper**

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/xlsx.ts && git commit -m "feat(reportes): helper de Excel con formato (ExcelJS)"
```

---

## Task 5: Componentes de gráfico (Recharts, cliente)

**Files:** Create: `src/components/reportes/chart-linea.tsx`, `chart-barras.tsx`, `chart-torta.tsx`, `chart-dispersion.tsx`

Nota: todos `"use client"`. Reciben `datos: SerieDato[]` y un `formato`. Usan colores del tema (emerald). Envolver en `ResponsiveContainer`.

- [ ] **Step 1: chart-linea.tsx**

```tsx
"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { SerieDato, FormatoNum } from "@/lib/reportes/tipos";
import { fmt } from "./fmt";

export function ChartLinea({ datos, formato = "num" }: { datos: SerieDato[]; formato?: FormatoNum }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={datos} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="x" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v, formato)} width={64} />
        <Tooltip formatter={(v: number) => fmt(v, formato)} />
        <Line type="monotone" dataKey="y" stroke="#059669" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: chart-barras.tsx**

```tsx
"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { SerieDato, FormatoNum } from "@/lib/reportes/tipos";
import { fmt } from "./fmt";

export function ChartBarras({ datos, formato = "num" }: { datos: SerieDato[]; formato?: FormatoNum }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={datos} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v, formato)} width={64} />
        <Tooltip formatter={(v: number) => fmt(v, formato)} />
        <Bar dataKey="y" fill="#059669" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: chart-torta.tsx**

```tsx
"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { SerieDato, FormatoNum } from "@/lib/reportes/tipos";
import { fmt } from "./fmt";

const COLORS = ["#059669", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#14b8a6"];

export function ChartTorta({ datos, formato = "num" }: { datos: SerieDato[]; formato?: FormatoNum }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={datos} dataKey="y" nameKey="etiqueta" cx="50%" cy="50%" outerRadius={90} label={(e) => e.etiqueta}>
          {datos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => fmt(v, formato)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: chart-dispersion.tsx**

```tsx
"use client";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { SerieDato, FormatoNum } from "@/lib/reportes/tipos";
import { fmt } from "./fmt";

export function ChartDispersion({ datos, formato = "num" }: { datos: SerieDato[]; formato?: FormatoNum }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" dataKey="x" name="x" tick={{ fontSize: 11 }} />
        <YAxis type="number" dataKey="y" name="y" tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v, formato)} width={64} />
        <Tooltip formatter={(v: number) => fmt(v, formato)} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter data={datos} fill="#059669" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 5: fmt.ts (formato compartido cliente)**

```ts
// src/components/reportes/fmt.ts
import type { FormatoNum } from "@/lib/reportes/tipos";
export function fmt(v: number, f: FormatoNum): string {
  if (f === "money") return "$" + Math.round(v).toLocaleString("es-CO");
  if (f === "pct") return v.toFixed(1) + "%";
  return v.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}
```

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit` (exit 0)
```bash
git add src/components/reportes/chart-*.tsx src/components/reportes/fmt.ts && git commit -m "feat(reportes): componentes de gráfico (Recharts)"
```

---

## Task 6: Kpi, tabla de detalle, filtros y botones de export

**Files:** Create: `src/components/reportes/kpi.tsx`, `tabla-detalle.tsx`, `filtro-reporte.tsx`, `export-botones.tsx`

- [ ] **Step 1: kpi.tsx (server)**

```tsx
import type { KpiDato } from "@/lib/reportes/tipos";

const fmt = (k: KpiDato) =>
  k.formato === "money" ? "$" + Math.round(k.valor).toLocaleString("es-CO")
  : k.formato === "pct" ? k.valor.toFixed(1) + "%"
  : k.valor.toLocaleString("es-CO");

export function KpiFila({ kpis }: { kpis: KpiDato[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <div key={k.label} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{k.label}</p>
          <p className="tabular text-2xl font-bold tracking-tight">{fmt(k)}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: tabla-detalle.tsx (server)**

```tsx
import type { DetalleReporte } from "@/lib/reportes/tipos";

const cel = (v: string | number | null, tipo: string) => {
  if (v == null || v === "") return "—";
  if (tipo === "money") return "$" + Number(v).toLocaleString("es-CO");
  if (tipo === "num") return Number(v).toLocaleString("es-CO", { maximumFractionDigits: 2 });
  return String(v);
};

export function TablaDetalle({ detalle }: { detalle: DetalleReporte }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>{detalle.columnas.map((c) => <th key={c.header} className={`px-3 py-2 font-medium ${c.tipo !== "texto" ? "text-right" : ""}`}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {detalle.filas.slice(0, 100).map((fila, i) => (
            <tr key={i} className="hover:bg-muted/20">
              {fila.map((v, j) => <td key={j} className={`px-3 py-2 ${detalle.columnas[j].tipo !== "texto" ? "tabular text-right" : ""}`}>{cel(v, detalle.columnas[j].tipo)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {detalle.filas.length > 100 && <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">Mostrando 100 de {detalle.filas.length}. Exporta para ver todo.</p>}
    </div>
  );
}
```

- [ ] **Step 3: filtro-reporte.tsx (cliente, escribe a la URL)**

```tsx
"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import type { FiltroSpec } from "@/lib/reportes/tipos";

export function FiltroReporte({ filtros }: { filtros: FiltroSpec[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  function set(key: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(key, value); else p.delete(key);
    router.push(`${pathname}?${p.toString()}`);
  }
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-3">
      {filtros.map((f) =>
        f.tipo === "fecha" ? (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <Input type="date" defaultValue={sp.get(f.key) ?? ""} onChange={(e) => set(f.key, e.target.value)} className="h-9 w-auto" />
          </div>
        ) : (
          <div key={f.key} className="space-y-1 min-w-44">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <SearchSelect value={sp.get(f.key) ?? "0"} onValueChange={(v) => set(f.key, v === "0" ? "" : v)} options={[{ value: "0", label: "Todos" }, ...(f.opciones ?? [])]} />
          </div>
        ),
      )}
    </div>
  );
}
```

- [ ] **Step 4: export-botones.tsx (server)**

```tsx
import { buttonVariants } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Download } from "lucide-react";

export function ExportBotones({ slug, query }: { slug: string; query: string }) {
  const base = `/reportes/${slug}/export`;
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`${base}?fmt=xlsx&${query}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <FileSpreadsheet className="size-4" /> Excel <Download className="size-3.5 opacity-60" />
      </a>
      <a href={`${base}?fmt=csv&${query}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <FileText className="size-4" /> CSV <Download className="size-3.5 opacity-60" />
      </a>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` (exit 0)
```bash
git add src/components/reportes/kpi.tsx src/components/reportes/tabla-detalle.tsx src/components/reportes/filtro-reporte.tsx src/components/reportes/export-botones.tsx && git commit -m "feat(reportes): KPI, tabla detalle, filtros y botones de export"
```

---

## Task 7: Dashboard (server) que arma KPIs + gráficos + tabla

**Files:** Create: `src/components/reportes/dashboard.tsx`

- [ ] **Step 1: Implementar**

```tsx
import type { DatosReporte, ChartSpec } from "@/lib/reportes/tipos";
import { KpiFila } from "./kpi";
import { TablaDetalle } from "./tabla-detalle";
import { ChartLinea } from "./chart-linea";
import { ChartBarras } from "./chart-barras";
import { ChartTorta } from "./chart-torta";
import { ChartDispersion } from "./chart-dispersion";

function Grafico({ spec, datos }: { spec: ChartSpec; datos: DatosReporte }) {
  const serie = datos.series[spec.serie] ?? [];
  const Comp = spec.tipo === "linea" ? ChartLinea : spec.tipo === "barras" ? ChartBarras : spec.tipo === "torta" ? ChartTorta : ChartDispersion;
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${spec.ancho === "full" ? "lg:col-span-2" : ""}`}>
      <h3 className="mb-2 text-sm font-semibold">{spec.titulo}</h3>
      <Comp datos={serie} formato={spec.formato} />
    </div>
  );
}

export function ReporteDashboard({ datos, charts }: { datos: DatosReporte; charts: ChartSpec[] }) {
  return (
    <div className="space-y-6">
      <KpiFila kpis={datos.kpis} />
      <div className="grid gap-4 lg:grid-cols-2">
        {charts.map((c, i) => <Grafico key={i} spec={c} datos={datos} />)}
      </div>
      <div>
        <h3 className="mb-2 text-base font-semibold">Detalle</h3>
        <TablaDetalle detalle={datos.detalle} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` (exit 0)
```bash
git add src/components/reportes/dashboard.tsx && git commit -m "feat(reportes): dashboard renderer (KPIs + gráficos + detalle)"
```

---

## Task 8: Servicio del reporte de Ventas

**Files:** Create: `src/lib/services/reportes/ventas.ts`

Origen: `facturas` vx21 (estado != 'cancelada') + `facturaDetalles` vx22 + `terceros` + `productos` + `categoriasProductos` + `bodegas`. Dinero como string → `Number`.

- [ ] **Step 1: Implementar el servicio**

```ts
// src/lib/services/reportes/ventas.ts
import "server-only";
import { and, eq, ne, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { facturas, facturaDetalles, terceros, productos } from "@/lib/db/schema";
import { ticketPromedio } from "@/lib/domain/reportes";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

export async function cargarVentas(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const cond = and(
    eq(facturas.empresaId, empresaId),
    ne(facturas.estado, "cancelada"),
    gte(facturas.fecha, f.desde!),
    lte(facturas.fecha, f.hasta!),
    f.cliente ? eq(facturas.clienteId, Number(f.cliente)) : undefined,
    f.bodega ? eq(facturas.bodegaId, Number(f.bodega)) : undefined,
    f.tipoVenta ? eq(facturas.tipoVenta, f.tipoVenta) : undefined,
  );

  // KPIs
  const [tot] = await db
    .select({
      ventas: sql<string>`coalesce(sum(${facturas.total}), 0)`,
      n: sql<number>`count(*)`,
      credito: sql<string>`coalesce(sum(case when ${facturas.tipoVenta} = 'credito' then ${facturas.total} else 0 end), 0)`,
    })
    .from(facturas)
    .where(cond);
  const ventas = Number(tot?.ventas ?? 0);
  const nFac = Number(tot?.n ?? 0);
  const credito = Number(tot?.credito ?? 0);

  // Serie: ventas por día
  const porDia = await db
    .select({ x: facturas.fecha, y: sql<string>`sum(${facturas.total})` })
    .from(facturas).where(cond).groupBy(facturas.fecha).orderBy(facturas.fecha);

  // Top clientes
  const topCli = await db
    .select({ etiqueta: terceros.razonSocial, y: sql<string>`sum(${facturas.total})` })
    .from(facturas).innerJoin(terceros, eq(facturas.clienteId, terceros.id))
    .where(cond).groupBy(terceros.razonSocial).orderBy(desc(sql`sum(${facturas.total})`)).limit(10);

  // Top productos (por líneas de las facturas del filtro)
  const condDet = and(eq(facturas.empresaId, empresaId), ne(facturas.estado, "cancelada"), gte(facturas.fecha, f.desde!), lte(facturas.fecha, f.hasta!),
    f.cliente ? eq(facturas.clienteId, Number(f.cliente)) : undefined,
    f.bodega ? eq(facturas.bodegaId, Number(f.bodega)) : undefined,
    f.tipoVenta ? eq(facturas.tipoVenta, f.tipoVenta) : undefined);
  const topProd = await db
    .select({ etiqueta: productos.nombre, y: sql<string>`sum(${facturaDetalles.subtotal})` })
    .from(facturaDetalles)
    .innerJoin(facturas, eq(facturaDetalles.facturaId, facturas.id))
    .innerJoin(productos, eq(facturaDetalles.productoId, productos.id))
    .where(condDet).groupBy(productos.nombre).orderBy(desc(sql`sum(${facturaDetalles.subtotal})`)).limit(10);

  // Detalle: líneas de venta
  const det = await db
    .select({
      fecha: facturas.fecha, numero: facturas.numero, cliente: terceros.razonSocial,
      producto: productos.nombre, cantidad: facturaDetalles.cantidad,
      precio: facturaDetalles.precioUnitario, total: facturaDetalles.subtotal,
    })
    .from(facturaDetalles)
    .innerJoin(facturas, eq(facturaDetalles.facturaId, facturas.id))
    .innerJoin(terceros, eq(facturas.clienteId, terceros.id))
    .innerJoin(productos, eq(facturaDetalles.productoId, productos.id))
    .where(condDet).orderBy(desc(facturas.fecha), facturas.numero);

  return {
    kpis: [
      { label: "Ventas totales", valor: ventas, formato: "money" },
      { label: "# Facturas", valor: nFac, formato: "num" },
      { label: "Ticket promedio", valor: ticketPromedio(ventas, nFac), formato: "money" },
      { label: "% a crédito", valor: ventas > 0 ? (credito / ventas) * 100 : 0, formato: "pct" },
    ],
    series: {
      porDia: porDia.map((r) => ({ x: r.x, y: Number(r.y) })),
      topProductos: topProd.map((r) => ({ x: r.etiqueta, y: Number(r.y), etiqueta: r.etiqueta })),
      topClientes: topCli.map((r) => ({ x: r.etiqueta, y: Number(r.y), etiqueta: r.etiqueta })),
      contadoCredito: [
        { x: "Contado", y: ventas - credito, etiqueta: "Contado" },
        { x: "Crédito", y: credito, etiqueta: "Crédito" },
      ],
    },
    detalle: {
      columnas: [
        { header: "Fecha", tipo: "fecha" }, { header: "Factura", tipo: "texto" },
        { header: "Cliente", tipo: "texto" }, { header: "Producto", tipo: "texto" },
        { header: "Cantidad", tipo: "num" }, { header: "Precio", tipo: "money" },
        { header: "Total", tipo: "money", total: true },
      ],
      filas: det.map((r) => [r.fecha, r.numero, r.cliente, r.producto, Number(r.cantidad), Number(r.precio), Number(r.total)]),
    },
  };
}

/** Opciones de filtros (clientes y bodegas activos). */
export async function filtrosVentas(empresaId: number) {
  const cli = await db.select({ value: terceros.id, label: terceros.razonSocial }).from(terceros)
    .where(and(eq(terceros.empresaId, empresaId), eq(terceros.activo, true))).orderBy(terceros.razonSocial);
  return cli.map((c) => ({ value: String(c.value), label: c.label }));
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` (exit 0)
```bash
git add src/lib/services/reportes/ventas.ts && git commit -m "feat(reportes): servicio de Ventas"
```

---

## Task 9: Registry + portada + dashboard dinámico + export (con Ventas)

**Files:** Create: `src/lib/reportes/registry.ts`, `src/app/(app)/reportes/[slug]/page.tsx`, `src/app/(app)/reportes/[slug]/export/route.ts`; Modify: `src/app/(app)/reportes/page.tsx`

- [ ] **Step 1: registry.ts (solo Ventas por ahora; los demás se agregan en sus tareas)**

```ts
// src/lib/reportes/registry.ts
import "server-only";
import { TrendingUp } from "lucide-react";
import type { ReporteDef, FiltroSpec } from "./tipos";
import { cargarVentas, filtrosVentas } from "@/lib/services/reportes/ventas";

export const REPORTES: ReporteDef[] = [
  {
    slug: "ventas",
    titulo: "Ventas",
    desc: "Evolución, top productos y clientes, contado vs crédito.",
    grupo: "Comercial",
    icon: TrendingUp,
    charts: [
      { tipo: "linea", titulo: "Ventas por día", serie: "porDia", formato: "money", ancho: "full" },
      { tipo: "barras", titulo: "Top productos", serie: "topProductos", formato: "money" },
      { tipo: "torta", titulo: "Contado vs crédito", serie: "contadoCredito", formato: "money" },
      { tipo: "barras", titulo: "Top clientes", serie: "topClientes", formato: "money" },
    ],
    filtros: async (empresaId): Promise<FiltroSpec[]> => [
      { key: "desde", label: "Desde", tipo: "fecha" },
      { key: "hasta", label: "Hasta", tipo: "fecha" },
      { key: "cliente", label: "Cliente", tipo: "select", opciones: await filtrosVentas(empresaId) },
      { key: "tipoVenta", label: "Tipo", tipo: "select", opciones: [{ value: "contado", label: "Contado" }, { value: "credito", label: "Crédito" }] },
    ],
    cargar: cargarVentas,
  },
];

export function getReporte(slug: string): ReporteDef | undefined {
  return REPORTES.find((r) => r.slug === slug);
}

/** Normaliza filtros: aplica rango por defecto (mes actual). */
export function filtrosConDefaults(sp: Record<string, string | undefined>, hoy: string): Record<string, string | undefined> {
  return { ...sp, desde: sp.desde || hoy.slice(0, 8) + "01", hasta: sp.hasta || hoy };
}
```

- [ ] **Step 2: [slug]/page.tsx**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getReporte, filtrosConDefaults } from "@/lib/reportes/registry";
import { PageHeader } from "@/components/page-header";
import { FiltroReporte } from "@/components/reportes/filtro-reporte";
import { ExportBotones } from "@/components/reportes/export-botones";
import { ReporteDashboard } from "@/components/reportes/dashboard";

export const metadata: Metadata = { title: "Reporte — Vertex" };

export default async function ReporteSlugPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermiso("reportes.ver");
  const { empresaId } = await requireEmpresa();
  const { slug } = await params;
  const rep = getReporte(slug);
  if (!rep) notFound();

  const hoy = new Date().toISOString().slice(0, 10);
  const sp = await searchParams;
  const filtros = filtrosConDefaults(sp, hoy);
  const [datos, filtrosSpec] = await Promise.all([rep.cargar(empresaId, filtros), rep.filtros(empresaId)]);
  const query = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title={rep.titulo} description={rep.desc}>
        <ExportBotones slug={rep.slug} query={query} />
      </PageHeader>
      <FiltroReporte filtros={filtrosSpec} />
      <ReporteDashboard datos={datos} charts={rep.charts} />
    </div>
  );
}
```

- [ ] **Step 3: [slug]/export/route.ts**

```ts
import { requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { getReporte, filtrosConDefaults } from "@/lib/reportes/registry";
import { toCsv, csvResponse } from "@/lib/csv";
import { construirXlsx, xlsxResponse } from "@/lib/xlsx";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { sesion, empresaId } = await requireEmpresa();
  if (!puede(sesion.rol, "reportes.ver")) return new Response("No autorizado", { status: 403 });
  const { slug } = await params;
  const rep = getReporte(slug);
  if (!rep) return new Response("Reporte no encontrado", { status: 404 });

  const url = new URL(req.url);
  const hoy = new Date().toISOString().slice(0, 10);
  const sp = Object.fromEntries(url.searchParams.entries());
  const filtros = filtrosConDefaults(sp, hoy);
  const { detalle } = await rep.cargar(empresaId, filtros);
  const fmt = url.searchParams.get("fmt") === "xlsx" ? "xlsx" : "csv";
  const nombre = `${rep.slug}_${filtros.desde}_a_${filtros.hasta}`;
  const filtrosTexto = `Periodo ${filtros.desde} a ${filtros.hasta}`;

  if (fmt === "csv") {
    const csv = toCsv(detalle.columnas.map((c) => c.header), detalle.filas);
    return csvResponse(`${nombre}.csv`, csv);
  }
  const buf = await construirXlsx(rep.titulo, filtrosTexto, detalle.columnas, detalle.filas, hoy);
  return xlsxResponse(`${nombre}.xlsx`, buf);
}
```

- [ ] **Step 4: Modificar la portada `reportes/page.tsx`**

Conservar el contenido actual (KPIs + stock + cartera vencida + novedades + `ExportFE`) MOVIÉNDOLO debajo, y agregar arriba las tarjetas de reportes desde `REPORTES`. Agregar al inicio del JSX (después del `<PageHeader>`), e importar `Link`, `REPORTES`, `buttonVariants`:

```tsx
// imports nuevos arriba del archivo:
import Link from "next/link";
import { REPORTES } from "@/lib/reportes/registry";

// dentro del return, como primer bloque tras <PageHeader>:
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {REPORTES.map((r) => (
    <Link key={r.slug} href={`/reportes/${r.slug}`} className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md">
      <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><r.icon className="size-5" /></span>
      <h3 className="font-semibold tracking-tight">{r.titulo}</h3>
      <p className="text-sm text-muted-foreground">{r.desc}</p>
    </Link>
  ))}
</div>
```
(El bloque "Factura electrónica (para el contador)" con `ExportFE` y las tablas de resumen quedan debajo, sin quitarse.)

- [ ] **Step 5: Verificar build + ruta**

Run: `npm run build`
Expected: aparece `/reportes/[slug]` y `/reportes/[slug]/export`. Sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/lib/reportes/registry.ts "src/app/(app)/reportes/[slug]/page.tsx" "src/app/(app)/reportes/[slug]/export/route.ts" "src/app/(app)/reportes/page.tsx" && git commit -m "feat(reportes): motor (registry + dashboard dinámico + export) con reporte de Ventas"
```

- [ ] **Step 7: Verificación de integración (gitignored)**

Crear `src/test/reportes.integration.test.ts`:
```ts
import { config } from "dotenv";
config({ path: ".env.local" });
if (!process.env.DATABASE_URL && process.env.DATABASE_URL_SESSION) process.env.DATABASE_URL = process.env.DATABASE_URL_SESSION;
import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { empresas } from "@/lib/db/schema";
import { cargarVentas } from "@/lib/services/reportes/ventas";

describe.skipIf(!process.env.DATABASE_URL)("Reporte Ventas", () => {
  it("devuelve kpis, series y detalle", async () => {
    const [e] = await db.select().from(empresas).where(eq(empresas.nombre, "Empresa Demo")).limit(1);
    const d = await cargarVentas(e.id, { desde: "2026-01-01", hasta: "2026-12-31" });
    console.log("KPIs:", d.kpis.map((k) => `${k.label}=${k.valor}`).join(" · "));
    console.log("Series porDia:", d.series.porDia.length, "Detalle filas:", d.detalle.filas.length);
    expect(d.kpis.length).toBe(4);
    expect(d.detalle.columnas.length).toBeGreaterThan(0);
  }, 30000);
});
```
Run: `npx vitest run -c src/test/vitest.integration.config.ts src/test/reportes.integration.test.ts --disableConsoleIntercept`
Expected: PASS; imprime KPIs y conteos coherentes con la demo.

---

## Task 10: Reporte Cartera por cobrar (aging)

**Files:** Create: `src/lib/services/reportes/cartera-cobrar.ts`; Modify: `src/lib/reportes/registry.ts`

Origen: `cuentasPorCobrar` vx28 (saldoPendiente > 0) + `facturas` (numero) + `terceros`. Días vencido = corte − fechaVencimiento. Usa `tramoAging`.

- [ ] **Step 1: Servicio**

```ts
// src/lib/services/reportes/cartera-cobrar.ts
import "server-only";
import { and, eq, gt, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { cuentasPorCobrar, facturas, terceros } from "@/lib/db/schema";
import { tramoAging } from "@/lib/domain/reportes";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

const dias = (venc: string, corte: string) => Math.floor((Date.parse(corte) - Date.parse(venc)) / 86400000);

export async function cargarCarteraCobrar(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const corte = f.hasta!;
  const cond = and(
    eq(cuentasPorCobrar.empresaId, empresaId),
    gt(cuentasPorCobrar.saldoPendiente, "0"),
    f.cliente ? eq(cuentasPorCobrar.clienteId, Number(f.cliente)) : undefined,
  );
  const rows = await db
    .select({
      id: cuentasPorCobrar.id, cliente: terceros.razonSocial, numero: facturas.numero,
      fecha: cuentasPorCobrar.fechaFactura, vence: cuentasPorCobrar.fechaVencimiento,
      saldo: cuentasPorCobrar.saldoPendiente,
    })
    .from(cuentasPorCobrar)
    .innerJoin(facturas, eq(cuentasPorCobrar.facturaId, facturas.id))
    .innerJoin(terceros, eq(cuentasPorCobrar.clienteId, terceros.id))
    .where(cond).orderBy(cuentasPorCobrar.fechaVencimiento);

  const enriq = rows.map((r) => { const dv = dias(r.vence, corte); return { ...r, saldo: Number(r.saldo), dv, tramo: tramoAging(dv) }; });
  const total = enriq.reduce((a, r) => a + r.saldo, 0);
  const vencido = enriq.filter((r) => r.dv > 0).reduce((a, r) => a + r.saldo, 0);
  const clientesUnicos = new Set(enriq.map((r) => r.cliente)).size;

  const tramos = ["Corriente", "1-30", "31-60", "61-90", "+90"];
  const porTramo = tramos.map((t) => ({ x: t, etiqueta: t, y: enriq.filter((r) => r.tramo === t).reduce((a, r) => a + r.saldo, 0) }));

  const porDeudor = Object.values(enriq.reduce<Record<string, { etiqueta: string; x: string; y: number }>>((acc, r) => {
    (acc[r.cliente] ??= { etiqueta: r.cliente, x: r.cliente, y: 0 }).y += r.saldo; return acc;
  }, {})).sort((a, b) => b.y - a.y).slice(0, 10);

  return {
    kpis: [
      { label: "Por cobrar total", valor: total, formato: "money" },
      { label: "Vencido", valor: vencido, formato: "money" },
      { label: "Por vencer", valor: total - vencido, formato: "money" },
      { label: "# Clientes", valor: clientesUnicos, formato: "num" },
    ],
    series: {
      porTramo,
      topDeudores: porDeudor,
      vencidoVsPorVencer: [
        { x: "Vencido", etiqueta: "Vencido", y: vencido },
        { x: "Por vencer", etiqueta: "Por vencer", y: total - vencido },
      ],
    },
    detalle: {
      columnas: [
        { header: "Cliente", tipo: "texto" }, { header: "Factura", tipo: "texto" },
        { header: "Fecha", tipo: "fecha" }, { header: "Vence", tipo: "fecha" },
        { header: "Días vencido", tipo: "num" }, { header: "Saldo", tipo: "money", total: true },
        { header: "Tramo", tipo: "texto" },
      ],
      filas: enriq.map((r) => [r.cliente, r.numero, r.fecha, r.vence, Math.max(0, r.dv), r.saldo, r.tramo]),
    },
  };
}

export async function filtrosCartera(empresaId: number) {
  const cli = await db.select({ value: terceros.id, label: terceros.razonSocial }).from(terceros)
    .where(and(eq(terceros.empresaId, empresaId), eq(terceros.activo, true))).orderBy(terceros.razonSocial);
  return cli.map((c) => ({ value: String(c.value), label: c.label }));
}
```

- [ ] **Step 2: Registrar en `registry.ts`** (agregar import y entrada al arreglo `REPORTES`)

```ts
import { HandCoins } from "lucide-react";
import { cargarCarteraCobrar, filtrosCartera } from "@/lib/services/reportes/cartera-cobrar";
// …dentro de REPORTES:
{
  slug: "cartera-cobrar", titulo: "Cartera por cobrar", desc: "Aging, vencimientos y top deudores.", grupo: "Cartera", icon: HandCoins,
  charts: [
    { tipo: "barras", titulo: "Saldo por tramo (aging)", serie: "porTramo", formato: "money", ancho: "full" },
    { tipo: "torta", titulo: "Vencido vs por vencer", serie: "vencidoVsPorVencer", formato: "money" },
    { tipo: "barras", titulo: "Top deudores", serie: "topDeudores", formato: "money" },
  ],
  filtros: async (empresaId) => [
    { key: "hasta", label: "Corte", tipo: "fecha" },
    { key: "cliente", label: "Cliente", tipo: "select", opciones: await filtrosCartera(empresaId) },
  ],
  cargar: cargarCarteraCobrar,
},
```

- [ ] **Step 3: Typecheck + build + commit**

Run: `npx tsc --noEmit` (exit 0); `npm run build` (OK)
```bash
git add src/lib/services/reportes/cartera-cobrar.ts src/lib/reportes/registry.ts && git commit -m "feat(reportes): Cartera por cobrar (aging)"
```

---

## Task 11: Reporte Inventario y rentabilidad

**Files:** Create: `src/lib/services/reportes/inventario.ts`; Modify: `src/lib/reportes/registry.ts`

Origen: `inventario` vx16 + `productos` + `categoriasProductos` (valor/existencia); `facturaDetalles` + `facturas` (vendido y margen del periodo). Margen $ línea = subtotal − costoUnitario·cantidad.

- [ ] **Step 1: Servicio**

```ts
// src/lib/services/reportes/inventario.ts
import "server-only";
import { and, eq, ne, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventario, productos, categoriasProductos, facturaDetalles, facturas } from "@/lib/db/schema";
import { margenPorc } from "@/lib/domain/reportes";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

export async function cargarInventario(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const condInv = and(
    eq(inventario.empresaId, empresaId),
    f.bodega ? eq(inventario.bodegaId, Number(f.bodega)) : undefined,
  );
  // Existencia/valor por producto
  const inv = await db
    .select({
      productoId: productos.id, producto: productos.nombre, categoria: categoriasProductos.nombre, categoriaId: productos.categoriaId,
      existencia: sql<string>`coalesce(sum(${inventario.cantidadActual}), 0)`,
      costoProm: sql<string>`coalesce(avg(${inventario.costoPromedio}), 0)`,
      valor: sql<string>`coalesce(sum(${inventario.valorTotal}), 0)`,
    })
    .from(inventario)
    .innerJoin(productos, eq(inventario.productoId, productos.id))
    .leftJoin(categoriasProductos, eq(productos.categoriaId, categoriasProductos.id))
    .where(and(condInv, f.categoria ? eq(productos.categoriaId, Number(f.categoria)) : undefined))
    .groupBy(productos.id, productos.nombre, categoriasProductos.nombre, productos.categoriaId);

  // Vendido + margen del periodo por producto
  const vend = await db
    .select({
      productoId: facturaDetalles.productoId,
      unidades: sql<string>`sum(${facturaDetalles.cantidadBase})`,
      ventas: sql<string>`sum(${facturaDetalles.subtotal})`,
      costo: sql<string>`sum(${facturaDetalles.costoUnitario} * ${facturaDetalles.cantidadBase})`,
    })
    .from(facturaDetalles)
    .innerJoin(facturas, eq(facturaDetalles.facturaId, facturas.id))
    .where(and(eq(facturas.empresaId, empresaId), ne(facturas.estado, "cancelada"), gte(facturas.fecha, f.desde!), lte(facturas.fecha, f.hasta!)))
    .groupBy(facturaDetalles.productoId);
  const vendPorProd = new Map(vend.map((v) => [v.productoId, v]));

  const filas = inv.map((p) => {
    const v = vendPorProd.get(p.productoId);
    const ventas = Number(v?.ventas ?? 0);
    const costo = Number(v?.costo ?? 0);
    const margen = ventas - costo;
    return {
      ...p, existencia: Number(p.existencia), costoProm: Number(p.costoProm), valor: Number(p.valor),
      vendido: Number(v?.unidades ?? 0), margen, margenPct: margenPorc(ventas, costo),
    };
  });

  const valorTotal = filas.reduce((a, r) => a + r.valor, 0);
  const margenProm = filas.length ? filas.reduce((a, r) => a + r.margenPct, 0) / filas.filter((r) => r.vendido > 0).length || 0 : 0;

  const porCategoria = Object.values(filas.reduce<Record<string, { etiqueta: string; x: string; y: number }>>((acc, r) => {
    const k = r.categoria ?? "Sin categoría";
    (acc[k] ??= { etiqueta: k, x: k, y: 0 }).y += r.valor; return acc;
  }, {})).sort((a, b) => b.y - a.y);

  const margenPorCat = Object.values(filas.reduce<Record<string, { etiqueta: string; x: string; y: number }>>((acc, r) => {
    const k = r.categoria ?? "Sin categoría";
    (acc[k] ??= { etiqueta: k, x: k, y: 0 }).y += r.margen; return acc;
  }, {})).sort((a, b) => b.y - a.y);

  return {
    kpis: [
      { label: "Inventario valorizado", valor: valorTotal, formato: "money" },
      { label: "# Productos", valor: filas.length, formato: "num" },
      { label: "Margen del periodo", valor: filas.reduce((a, r) => a + r.margen, 0), formato: "money" },
      { label: "Margen promedio", valor: isFinite(margenProm) ? margenProm : 0, formato: "pct" },
    ],
    series: {
      valorPorCategoria: porCategoria,
      margenPorCategoria: margenPorCat,
      // dispersión: unidades vendidas (x) vs margen% (y)
      margenVsRotacion: filas.filter((r) => r.vendido > 0).map((r) => ({ x: r.vendido, y: r.margenPct, etiqueta: r.producto })),
    },
    detalle: {
      columnas: [
        { header: "Producto", tipo: "texto" }, { header: "Categoría", tipo: "texto" },
        { header: "Existencia", tipo: "num" }, { header: "Costo prom.", tipo: "money" },
        { header: "Valor", tipo: "money", total: true }, { header: "Vendido", tipo: "num" },
        { header: "Margen $", tipo: "money", total: true }, { header: "Margen %", tipo: "num" },
      ],
      filas: filas.sort((a, b) => b.valor - a.valor).map((r) => [r.producto, r.categoria ?? "—", r.existencia, r.costoProm, r.valor, r.vendido, r.margen, Number(r.margenPct.toFixed(1))]),
    },
  };
}

export async function filtrosInventario(empresaId: number) {
  const cats = await db.select({ value: categoriasProductos.id, label: categoriasProductos.nombre }).from(categoriasProductos)
    .where(and(eq(categoriasProductos.empresaId, empresaId), eq(categoriasProductos.tipo, "producto"))).orderBy(categoriasProductos.nombre);
  return cats.map((c) => ({ value: String(c.value), label: c.label }));
}
```

- [ ] **Step 2: Registrar en `registry.ts`**

```ts
import { Boxes } from "lucide-react";
import { cargarInventario, filtrosInventario } from "@/lib/services/reportes/inventario";
// …dentro de REPORTES:
{
  slug: "inventario", titulo: "Inventario y rentabilidad", desc: "Valorizado, margen por categoría y dispersión margen/rotación.", grupo: "Operación", icon: Boxes,
  charts: [
    { tipo: "barras", titulo: "Valor por categoría", serie: "valorPorCategoria", formato: "money" },
    { tipo: "barras", titulo: "Margen por categoría", serie: "margenPorCategoria", formato: "money" },
    { tipo: "dispersion", titulo: "Margen % vs unidades vendidas", serie: "margenVsRotacion", formato: "pct", ancho: "full" },
  ],
  filtros: async (empresaId) => [
    { key: "desde", label: "Desde", tipo: "fecha" }, { key: "hasta", label: "Hasta", tipo: "fecha" },
    { key: "categoria", label: "Categoría", tipo: "select", opciones: await filtrosInventario(empresaId) },
  ],
  cargar: cargarInventario,
},
```

- [ ] **Step 3: Typecheck + build + commit**

Run: `npx tsc --noEmit` (exit 0); `npm run build` (OK)
```bash
git add src/lib/services/reportes/inventario.ts src/lib/reportes/registry.ts && git commit -m "feat(reportes): Inventario y rentabilidad"
```

---

## Task 12: Reporte Recaudo / Ruta

**Files:** Create: `src/lib/services/reportes/recaudo.ts`; Modify: `src/lib/reportes/registry.ts`

Origen: `recaudosClientes` vx29 (estado='activo') + `terceros` + `usuarios` (recaudador vía `visitasRecaudo`? El recaudo no guarda recaudador; se atribuye por `usuarioId`). Para "por recaudador" usar `recaudosClientes.usuarioId` → `usuarios.nombre`. Visitas vx30 para efectividad/resultados.

- [ ] **Step 1: Servicio**

```ts
// src/lib/services/reportes/recaudo.ts
import "server-only";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { recaudosClientes, visitasRecaudo, terceros, usuarios } from "@/lib/db/schema";
import { efectividadVisitas } from "@/lib/domain/reportes";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

const RESULTADOS: Record<string, string> = { pago: "Pagó", abono: "Abonó", no_estaba: "No estaba", no_quiso: "No quiso" };

export async function cargarRecaudo(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const cond = and(
    eq(recaudosClientes.empresaId, empresaId),
    eq(recaudosClientes.estado, "activo"),
    gte(recaudosClientes.fecha, f.desde!),
    lte(recaudosClientes.fecha, f.hasta!),
    f.recaudador ? eq(recaudosClientes.usuarioId, Number(f.recaudador)) : undefined,
  );
  const [tot] = await db.select({ recaudado: sql<string>`coalesce(sum(${recaudosClientes.valor}), 0)`, n: sql<number>`count(*)` }).from(recaudosClientes).where(cond);

  const porDia = await db.select({ x: recaudosClientes.fecha, y: sql<string>`sum(${recaudosClientes.valor})` })
    .from(recaudosClientes).where(cond).groupBy(recaudosClientes.fecha).orderBy(recaudosClientes.fecha);

  const porRec = await db.select({ etiqueta: usuarios.nombre, y: sql<string>`sum(${recaudosClientes.valor})` })
    .from(recaudosClientes).innerJoin(usuarios, eq(recaudosClientes.usuarioId, usuarios.id))
    .where(cond).groupBy(usuarios.nombre).orderBy(desc(sql`sum(${recaudosClientes.valor})`));

  // Visitas para efectividad y resultados
  const condV = and(eq(visitasRecaudo.empresaId, empresaId), gte(visitasRecaudo.fecha, f.desde!), lte(visitasRecaudo.fecha, f.hasta!),
    f.recaudador ? eq(visitasRecaudo.recaudadorId, Number(f.recaudador)) : undefined);
  const visitas = await db.select({ resultado: visitasRecaudo.resultado, n: sql<number>`count(*)` }).from(visitasRecaudo).where(condV).groupBy(visitasRecaudo.resultado);
  const totalVisitas = visitas.reduce((a, v) => a + Number(v.n), 0);
  const conPago = visitas.filter((v) => v.resultado === "pago" || v.resultado === "abono").reduce((a, v) => a + Number(v.n), 0);

  const det = await db.select({ fecha: recaudosClientes.fecha, numero: recaudosClientes.numero, cliente: terceros.razonSocial, recaudador: usuarios.nombre, valor: recaudosClientes.valor, metodo: recaudosClientes.metodoPago })
    .from(recaudosClientes)
    .innerJoin(terceros, eq(recaudosClientes.clienteId, terceros.id))
    .innerJoin(usuarios, eq(recaudosClientes.usuarioId, usuarios.id))
    .where(cond).orderBy(desc(recaudosClientes.fecha));

  return {
    kpis: [
      { label: "Recaudado", valor: Number(tot?.recaudado ?? 0), formato: "money" },
      { label: "# Recaudos", valor: Number(tot?.n ?? 0), formato: "num" },
      { label: "# Visitas", valor: totalVisitas, formato: "num" },
      { label: "Efectividad", valor: efectividadVisitas(conPago, totalVisitas), formato: "pct" },
    ],
    series: {
      porDia: porDia.map((r) => ({ x: r.x, y: Number(r.y) })),
      porRecaudador: porRec.map((r) => ({ x: r.etiqueta, etiqueta: r.etiqueta, y: Number(r.y) })),
      resultados: visitas.map((v) => ({ x: RESULTADOS[v.resultado] ?? v.resultado, etiqueta: RESULTADOS[v.resultado] ?? v.resultado, y: Number(v.n) })),
    },
    detalle: {
      columnas: [
        { header: "Fecha", tipo: "fecha" }, { header: "Recibo", tipo: "texto" }, { header: "Cliente", tipo: "texto" },
        { header: "Recaudador", tipo: "texto" }, { header: "Método", tipo: "texto" }, { header: "Valor", tipo: "money", total: true },
      ],
      filas: det.map((r) => [r.fecha, r.numero, r.cliente, r.recaudador, r.metodo, Number(r.valor)]),
    },
  };
}

export async function filtrosRecaudo(empresaId: number) {
  const recs = await db.select({ value: usuarios.id, label: usuarios.nombre }).from(usuarios)
    .where(and(eq(usuarios.empresaId, empresaId), eq(usuarios.esRecaudador, true))).orderBy(usuarios.nombre);
  return recs.map((r) => ({ value: String(r.value), label: r.label }));
}
```

- [ ] **Step 2: Registrar en `registry.ts`**

```ts
import { Route } from "lucide-react";
import { cargarRecaudo, filtrosRecaudo } from "@/lib/services/reportes/recaudo";
// …dentro de REPORTES:
{
  slug: "recaudo", titulo: "Recaudo / Ruta", desc: "Recaudado por día y recaudador, efectividad de visitas.", grupo: "Cartera", icon: Route,
  charts: [
    { tipo: "linea", titulo: "Recaudado por día", serie: "porDia", formato: "money", ancho: "full" },
    { tipo: "barras", titulo: "Recaudado por recaudador", serie: "porRecaudador", formato: "money" },
    { tipo: "torta", titulo: "Resultados de visita", serie: "resultados", formato: "num" },
  ],
  filtros: async (empresaId) => [
    { key: "desde", label: "Desde", tipo: "fecha" }, { key: "hasta", label: "Hasta", tipo: "fecha" },
    { key: "recaudador", label: "Recaudador", tipo: "select", opciones: await filtrosRecaudo(empresaId) },
  ],
  cargar: cargarRecaudo,
},
```

- [ ] **Step 3: Typecheck + build + commit**

Run: `npx tsc --noEmit` (exit 0); `npm run build` (OK)
```bash
git add src/lib/services/reportes/recaudo.ts src/lib/reportes/registry.ts && git commit -m "feat(reportes): Recaudo / Ruta"
```

---

## Task 13: Verificación end-to-end + export + deploy

**Files:** (verificación; sin código nuevo salvo el test de integración gitignored)

- [ ] **Step 1: Ampliar test de integración** `src/test/reportes.integration.test.ts` para cubrir los 4 servicios (cargarVentas, cargarCarteraCobrar, cargarInventario, cargarRecaudo): cada uno devuelve `kpis.length>0`, `detalle.columnas.length>0`, y las series referidas por sus `charts` existen y son arrays. Loguear KPIs.

Run: `npx vitest run -c src/test/vitest.integration.config.ts src/test/reportes.integration.test.ts --disableConsoleIntercept`
Expected: PASS para los 4.

- [ ] **Step 2: Verificar el export XLSX no está vacío** (agregar al test): llamar `construirXlsx("Ventas", "x", detalle.columnas, detalle.filas, "2026-05-31")` y `expect(buf.length).toBeGreaterThan(1000)`.

Run: igual que arriba. Expected: PASS.

- [ ] **Step 3: Suite unitaria + build limpios**

Run: `npx vitest run` (todo verde, incluye `domain/reportes.test.ts`)
Run: `npm run build` (OK; rutas `/reportes`, `/reportes/[slug]`, `/reportes/[slug]/export`)

- [ ] **Step 4: Commit final + push**

```bash
git add -A && git commit -m "test(reportes): verificación de integración de los 4 reportes + export" && git push origin main
```

- [ ] **Step 5: Verificación manual sugerida**

Abrir `/reportes` → tarjetas; entrar a cada reporte → KPIs + gráficos + tabla; cambiar filtros (fechas/select) y ver que el dashboard reacciona; descargar Excel y CSV.

---

## Self-Review (cobertura del spec)

- Motor (portada, [slug], export, piezas reutilizables): Tasks 2,5,6,7,9. ✔
- Recharts + ExcelJS: Tasks 1,4,5. ✔
- Filtros por URL que alimentan dashboard y export: Tasks 6 (filtro), 9 (page+route). ✔
- Reporte Ventas: Tasks 8,9. ✔  Cartera aging (tramoAging): Tasks 3,10. ✔  Inventario/rentabilidad (margen, dispersión): Tasks 3,11. ✔  Recaudo (efectividad, resultados): Tasks 3,12. ✔
- Export Excel elegante + CSV: Tasks 4,9. ✔
- Pruebas dominio + integración: Tasks 3,9,13. ✔
- Tipos consistentes (`DatosReporte`, `ColumnaExport`, `ChartSpec`, `ReporteDef`, `SerieDato`): definidos en Task 2, usados igual en 8–12. ✔
- Permiso `reportes.ver`: Tasks 9 (page + route). ✔
- No se removió la función de export F.E. ni el resumen actual: Task 9 Step 4 los conserva. ✔

# Ola 2 — Ticket POS híbrido + 4 reportes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans. Steps con checkbox (`- [ ]`).

**Goal:** Recibo POS imprimible (media carta / 80mm / 58mm) con preferencia recordada + impresión nativa universal + impresión directa Bluetooth (ESC/POS) en Android; y 4 reportes nuevos sobre el motor existente (Compras, CxP aging, Flujo de caja, Dashboard F.E.).

**Architecture:** Dominio puro para armar el recibo y los bytes ESC/POS. Componente `Recibo` (3 anchos, `@media print`) + botón imprimir (nativo) + botón Bluetooth (solo si `navigator.bluetooth`). Cada reporte = un servicio `{kpis, series, detalle}` + entrada en `src/lib/reportes/registry.ts` (dashboard y export ya genéricos).

**Tech Stack:** Next.js 15 RSC, Drizzle, Recharts/ExcelJS (ya instalados), Web Bluetooth API, vitest. Spec: `docs/superpowers/specs/2026-05-31-anular-cierre-ticket-reportes-design.md`. Requiere el motor de reportes (`src/lib/reportes/*`, `src/components/reportes/*`) ya existente.

**Convenciones:** ver Ola 1. La forma de datos de reporte está en `src/lib/reportes/tipos.ts` (`DatosReporte`, `ColumnaExport`, `ReporteDef`, `getPaleta` no aplica aquí). `tramoAging` está en `src/lib/domain/reportes.ts`.

---

## Task 1: Dominio — recibo + ESC/POS (TDD)

**Files:** Create: `src/lib/domain/recibo.ts`, `src/lib/domain/recibo.test.ts`

- [ ] **Step 1: Test que falla**

```ts
// src/lib/domain/recibo.test.ts
import { describe, it, expect } from "vitest";
import { escposBytes } from "./recibo";

describe("escposBytes", () => {
  it("empieza con init ESC @ y termina con corte GS V", () => {
    const b = escposBytes(["VERTEX", "Total: $1.000"], { cortar: true });
    expect(b[0]).toBe(0x1b); expect(b[1]).toBe(0x40); // ESC @
    // corte al final: GS V 0  -> 0x1d 0x56 0x00
    expect(b[b.length - 3]).toBe(0x1d);
    expect(b[b.length - 2]).toBe(0x56);
  });
  it("incluye el texto de las líneas", () => {
    const b = escposBytes(["AB"], { cortar: false });
    const txt = Buffer.from(b).toString("latin1");
    expect(txt).toContain("AB");
  });
});
```

- [ ] **Step 2: Correr → falla**

Run: `npx vitest run src/lib/domain/recibo.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```ts
// src/lib/domain/recibo.ts
/** Codifica líneas de texto a bytes ESC/POS (init + texto + corte opcional). */
export function escposBytes(lineas: string[], opts: { cortar: boolean }): Uint8Array {
  const out: number[] = [0x1b, 0x40]; // ESC @  (init)
  const enc = (s: string) => { for (const ch of s) out.push(ch.charCodeAt(0) & 0xff); };
  for (const l of lineas) { enc(l); out.push(0x0a); } // LF
  out.push(0x0a, 0x0a);
  if (opts.cortar) out.push(0x1d, 0x56, 0x00); // GS V 0 (corte total)
  return new Uint8Array(out);
}

export interface LineaReciboVenta { producto: string; cantidad: number; precio: number; subtotal: number }
export interface DatosReciboVenta {
  empresa: string; nit: string; numero: string; fecha: string; cliente: string;
  lineas: LineaReciboVenta[]; total: number; formaPago: string;
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

/** Texto plano del recibo (para impresión térmica de ~32 cols). */
export function textoReciboVenta(d: DatosReciboVenta, cols = 32): string[] {
  const sep = "-".repeat(cols);
  const par = (izq: string, der: string) => (izq + der.padStart(Math.max(0, cols - izq.length))).slice(0, cols);
  const out: string[] = [d.empresa, `NIT ${d.nit}`, sep, `Factura ${d.numero}`, d.fecha, `Cliente: ${d.cliente}`, sep];
  for (const l of d.lineas) {
    out.push(l.producto.slice(0, cols));
    out.push(par(`  ${l.cantidad} x ${money(l.precio)}`, money(l.subtotal)));
  }
  out.push(sep, par("TOTAL", money(d.total)), `Pago: ${d.formaPago}`, sep, "¡Gracias por su compra!");
  return out;
}
```

- [ ] **Step 4: Correr → pasa**

Run: `npx vitest run src/lib/domain/recibo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/recibo.ts src/lib/domain/recibo.test.ts && git commit -m "feat(ola2): dominio recibo + ESC/POS"
```

---

## Task 2: Componente Recibo + impresión (nativa + Bluetooth)

**Files:** Create: `src/components/recibo/recibo.tsx`, `src/components/recibo/recibo-print.tsx`

- [ ] **Step 1: `recibo.tsx` (presentación, server-safe)**

```tsx
import type { DatosReciboVenta } from "@/lib/domain/recibo";

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
const ANCHOS: Record<string, string> = { carta: "max-w-[148mm]", "80": "max-w-[80mm]", "58": "max-w-[58mm]" };

export function Recibo({ datos, formato }: { datos: DatosReciboVenta; formato: "carta" | "80" | "58" }) {
  return (
    <div className={`recibo mx-auto bg-white p-3 text-[12px] leading-tight text-black ${ANCHOS[formato]}`}>
      <div className="text-center font-bold">{datos.empresa}</div>
      <div className="text-center text-[10px]">NIT {datos.nit}</div>
      <hr className="my-1 border-dashed border-black/40" />
      <div>Factura {datos.numero}</div>
      <div>{datos.fecha}</div>
      <div className="truncate">Cliente: {datos.cliente}</div>
      <hr className="my-1 border-dashed border-black/40" />
      {datos.lineas.map((l, i) => (
        <div key={i} className="mb-0.5">
          <div className="truncate">{l.producto}</div>
          <div className="flex justify-between tabular"><span>{l.cantidad} × {money(l.precio)}</span><span>{money(l.subtotal)}</span></div>
        </div>
      ))}
      <hr className="my-1 border-dashed border-black/40" />
      <div className="flex justify-between font-bold tabular"><span>TOTAL</span><span>{money(datos.total)}</span></div>
      <div>Pago: {datos.formaPago}</div>
      <div className="mt-2 text-center text-[10px]">¡Gracias por su compra!</div>
    </div>
  );
}
```

- [ ] **Step 2: `recibo-print.tsx` (cliente: selector de formato + imprimir + bluetooth)**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Recibo } from "./recibo";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import { escposBytes, textoReciboVenta, type DatosReciboVenta } from "@/lib/domain/recibo";
import { Printer, Bluetooth } from "lucide-react";

type Formato = "carta" | "80" | "58";
const KEY = "vx_recibo_formato";

export function ReciboPrint({ datos }: { datos: DatosReciboVenta }) {
  const [formato, setFormato] = useState<Formato>("carta");
  const [btDisponible, setBtDisponible] = useState(false);
  useEffect(() => {
    const f = (localStorage.getItem(KEY) as Formato) || "carta";
    setFormato(f);
    setBtDisponible(typeof navigator !== "undefined" && "bluetooth" in navigator);
  }, []);
  function cambiarFormato(f: Formato) { setFormato(f); localStorage.setItem(KEY, f); }

  async function imprimirBluetooth() {
    try {
      // @ts-expect-error Web Bluetooth no está en los tipos por defecto
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [0xffe0, "000018f0-0000-1000-8000-00805f9b34fb"] });
      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      const cols = formato === "58" ? 32 : formato === "80" ? 42 : 42;
      const bytes = escposBytes(textoReciboVenta(datos, cols), { cortar: true });
      for (const s of services) {
        const chars = await s.getCharacteristics();
        const w = chars.find((c: { properties: { write: boolean; writeWithoutResponse: boolean } }) => c.properties.write || c.properties.writeWithoutResponse);
        if (w) {
          // enviar en bloques de 180 bytes
          for (let i = 0; i < bytes.length; i += 180) await w.writeValue(bytes.slice(i, i + 180));
          return;
        }
      }
      alert("No se encontró una característica de escritura en la impresora.");
    } catch (e) {
      console.error("[bluetooth]", e);
      alert("No se pudo imprimir por Bluetooth. Usa 'Imprimir'.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <SearchSelect value={formato} onValueChange={(v) => cambiarFormato(v as Formato)} searchThreshold={99}
          options={[{ value: "carta", label: "Media carta" }, { value: "80", label: "Térmica 80mm" }, { value: "58", label: "Térmica 58mm" }]} triggerClassName="w-40" />
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}><Printer className="size-4" /> Imprimir</Button>
        {btDisponible && <Button type="button" variant="outline" size="sm" onClick={imprimirBluetooth}><Bluetooth className="size-4" /> Imprimir directo</Button>}
      </div>
      <Recibo datos={datos} formato={formato} />
    </div>
  );
}
```

- [ ] **Step 3: CSS de impresión** — en `src/app/globals.css`, al final, agregar:

```css
@media print {
  body * { visibility: hidden; }
  .recibo, .recibo * { visibility: visible; }
  .recibo { position: absolute; left: 0; top: 0; }
}
```

- [ ] **Step 4: Typecheck + build + commit**

Run: `npx tsc --noEmit` (0); `npm run build` (OK)
```bash
git add src/components/recibo "src/app/globals.css" && git commit -m "feat(ola2): componente recibo + impresión nativa/bluetooth"
```

---

## Task 3: Recibo en el detalle de factura

**Files:** Modify: `src/app/(app)/facturas/[id]/page.tsx`

- [ ] **Step 1: Mostrar el recibo imprimible**

En la página de detalle (que ya carga `factura` con `detalles`, `cli`, `productos`), arma los datos y renderiza el componente. Importa `import { ReciboPrint } from "@/components/recibo/recibo-print";` y obtén la empresa (nombre/nit) — el layout ya conoce la empresa activa; aquí cárgala con `requireEmpresa()` (ya se usa) + un `select` de `empresas` por `empresaId` para `nombre`/`nit`. Construye:
```tsx
const datosRecibo = {
  empresa: emp?.nombre ?? "Vertex", nit: emp?.nit ?? "",
  numero: factura.numero, fecha: factura.fecha, cliente: cli?.razonSocial ?? "—",
  lineas: factura.detalles.map((d) => ({ producto: prodPorId.get(d.productoId) ?? `#${d.productoId}`, cantidad: Number(d.cantidad), precio: Number(d.precioUnitario), subtotal: Number(d.subtotal) })),
  total: Number(factura.total), formaPago: factura.tipoVenta === "contado" ? (factura.metodoPago ?? "contado") : "crédito",
};
```
Y al final del JSX, una sección:
```tsx
<div className="rounded-2xl border border-border bg-card p-4">
  <h3 className="mb-3 text-sm font-semibold print:hidden">Recibo</h3>
  <ReciboPrint datos={datosRecibo} />
</div>
```

- [ ] **Step 2: Typecheck + build + commit**

Run: `npx tsc --noEmit` (0); `npm run build` (OK)
```bash
git add "src/app/(app)/facturas/[id]/page.tsx" && git commit -m "feat(ola2): recibo imprimible en el detalle de factura"
```

---

## Task 4: Reporte Compras

**Files:** Create: `src/lib/services/reportes/compras.ts`; Modify: `src/lib/reportes/registry.ts`

- [ ] **Step 1: Servicio** (sigue la forma de `ventas.ts`)

```ts
// src/lib/services/reportes/compras.ts
import "server-only";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pedidos, pedidoDetalles, pedidoCostos, terceros, productos } from "@/lib/db/schema";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

const RECIBIDO = sql`${pedidos.estado} in ('recibido','parcial')`;

export async function cargarCompras(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const cond = and(eq(pedidos.empresaId, empresaId), RECIBIDO, gte(pedidos.fecha, f.desde!), lte(pedidos.fecha, f.hasta!),
    f.proveedor ? eq(pedidos.proveedorId, Number(f.proveedor)) : undefined);
  const [tot] = await db.select({ compras: sql<string>`coalesce(sum(${pedidos.total}),0)`, n: sql<number>`count(*)`, costos: sql<string>`coalesce(sum(${pedidos.costosAdicionales}),0)` }).from(pedidos).where(cond);
  const porDia = await db.select({ x: pedidos.fecha, y: sql<string>`sum(${pedidos.total})` }).from(pedidos).where(cond).groupBy(pedidos.fecha).orderBy(pedidos.fecha);
  const topProv = await db.select({ etiqueta: terceros.razonSocial, y: sql<string>`sum(${pedidos.total})` }).from(pedidos).innerJoin(terceros, eq(pedidos.proveedorId, terceros.id)).where(cond).groupBy(terceros.razonSocial).orderBy(desc(sql`sum(${pedidos.total})`)).limit(10);
  const costos = await db.select({ etiqueta: pedidoCostos.tipo, y: sql<string>`sum(${pedidoCostos.valor})` }).from(pedidoCostos).innerJoin(pedidos, eq(pedidoCostos.pedidoId, pedidos.id)).where(cond).groupBy(pedidoCostos.tipo).orderBy(desc(sql`sum(${pedidoCostos.valor})`));
  const det = await db.select({ fecha: pedidos.fecha, numero: pedidos.numero, proveedor: terceros.razonSocial, estado: pedidos.estado, total: pedidos.total }).from(pedidos).innerJoin(terceros, eq(pedidos.proveedorId, terceros.id)).where(cond).orderBy(desc(pedidos.fecha));

  return {
    kpis: [
      { label: "Compras", valor: Number(tot?.compras ?? 0), formato: "money" },
      { label: "# Pedidos", valor: Number(tot?.n ?? 0), formato: "num" },
      { label: "Costos adicionales", valor: Number(tot?.costos ?? 0), formato: "money" },
      { label: "Promedio por pedido", valor: Number(tot?.n ?? 0) > 0 ? Number(tot?.compras ?? 0) / Number(tot?.n ?? 0) : 0, formato: "money" },
    ],
    series: {
      porDia: porDia.map((r) => ({ x: r.x, y: Number(r.y) })),
      topProveedores: topProv.map((r) => ({ x: r.etiqueta, etiqueta: r.etiqueta, y: Number(r.y) })),
      costos: costos.map((r) => ({ x: r.etiqueta, etiqueta: r.etiqueta, y: Number(r.y) })),
    },
    detalle: {
      columnas: [{ header: "Fecha", tipo: "fecha" }, { header: "Pedido", tipo: "texto" }, { header: "Proveedor", tipo: "texto" }, { header: "Estado", tipo: "texto" }, { header: "Total", tipo: "money", total: true }],
      filas: det.map((r) => [r.fecha, r.numero, r.proveedor, r.estado, Number(r.total)]),
    },
  };
}

export async function filtrosCompras(empresaId: number) {
  const provs = await db.select({ value: terceros.id, label: terceros.razonSocial }).from(terceros).where(and(eq(terceros.empresaId, empresaId), eq(terceros.activo, true))).orderBy(terceros.razonSocial);
  return provs.map((p) => ({ value: String(p.value), label: p.label }));
}
```

- [ ] **Step 2: Registrar en `registry.ts`**

```ts
import { ShoppingBag } from "lucide-react";
import { cargarCompras, filtrosCompras } from "@/lib/services/reportes/compras";
// dentro de REPORTES:
{
  slug: "compras", titulo: "Compras", desc: "Compras por proveedor, evolución y costos.", grupo: "Comercial", icon: ShoppingBag,
  charts: [
    { tipo: "linea", titulo: "Compras por día", serie: "porDia", formato: "money", ancho: "full" },
    { tipo: "barras", titulo: "Top proveedores", serie: "topProveedores", formato: "money" },
    { tipo: "barras", titulo: "Costos adicionales", serie: "costos", formato: "money" },
  ],
  filtros: async (empresaId) => [
    { key: "desde", label: "Desde", tipo: "fecha" }, { key: "hasta", label: "Hasta", tipo: "fecha" },
    { key: "proveedor", label: "Proveedor", tipo: "select", opciones: await filtrosCompras(empresaId) },
  ],
  cargar: cargarCompras,
},
```

- [ ] **Step 3: Typecheck + build + commit**

Run: `npx tsc --noEmit` (0); `npm run build` (OK)
```bash
git add src/lib/services/reportes/compras.ts src/lib/reportes/registry.ts && git commit -m "feat(ola2): reporte Compras"
```

---

## Task 5: Reporte Cuentas por pagar (aging)

**Files:** Create: `src/lib/services/reportes/cartera-pagar.ts`; Modify: `src/lib/reportes/registry.ts`

- [ ] **Step 1: Servicio** (espejo de `cartera-cobrar.ts`, con `cuentasPorPagar` + `tramoAging`)

```ts
// src/lib/services/reportes/cartera-pagar.ts
import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { cuentasPorPagar, terceros } from "@/lib/db/schema";
import { tramoAging } from "@/lib/domain/reportes";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

const dias = (venc: string, corte: string) => Math.floor((Date.parse(corte) - Date.parse(venc)) / 86400000);

export async function cargarCarteraPagar(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const corte = f.hasta!;
  const cond = and(eq(cuentasPorPagar.empresaId, empresaId), gt(cuentasPorPagar.saldoPendiente, "0"),
    f.proveedor ? eq(cuentasPorPagar.proveedorId, Number(f.proveedor)) : undefined);
  const rows = await db.select({ proveedorId: cuentasPorPagar.proveedorId, proveedor: terceros.razonSocial, numero: cuentasPorPagar.numeroFactura, fecha: cuentasPorPagar.fechaFactura, vence: cuentasPorPagar.fechaVencimiento, saldo: cuentasPorPagar.saldoPendiente })
    .from(cuentasPorPagar).innerJoin(terceros, eq(cuentasPorPagar.proveedorId, terceros.id)).where(cond).orderBy(cuentasPorPagar.fechaVencimiento);
  const enriq = rows.map((r) => { const dv = dias(r.vence, corte); return { ...r, saldo: Number(r.saldo), dv, tramo: tramoAging(dv) }; });
  const total = enriq.reduce((a, r) => a + r.saldo, 0);
  const vencido = enriq.filter((r) => r.dv > 0).reduce((a, r) => a + r.saldo, 0);
  const tramos = ["Corriente", "1-30", "31-60", "61-90", "+90"];
  const porTramo = tramos.map((t) => ({ x: t, etiqueta: t, y: enriq.filter((r) => r.tramo === t).reduce((a, r) => a + r.saldo, 0) }));
  const porProv = Object.values(enriq.reduce<Record<number, { etiqueta: string; x: string; y: number }>>((acc, r) => { (acc[r.proveedorId] ??= { etiqueta: r.proveedor, x: r.proveedor, y: 0 }).y += r.saldo; return acc; }, {})).sort((a, b) => b.y - a.y).slice(0, 10);
  return {
    kpis: [
      { label: "Por pagar total", valor: total, formato: "money" },
      { label: "Vencido", valor: vencido, formato: "money" },
      { label: "Por vencer", valor: total - vencido, formato: "money" },
      { label: "# Proveedores", valor: new Set(enriq.map((r) => r.proveedorId)).size, formato: "num" },
    ],
    series: {
      porTramo, topProveedores: porProv,
      vencidoVsPorVencer: [{ x: "Vencido", etiqueta: "Vencido", y: vencido }, { x: "Por vencer", etiqueta: "Por vencer", y: total - vencido }],
    },
    detalle: {
      columnas: [{ header: "Proveedor", tipo: "texto" }, { header: "Factura", tipo: "texto" }, { header: "Fecha", tipo: "fecha" }, { header: "Vence", tipo: "fecha" }, { header: "Días vencido", tipo: "num" }, { header: "Saldo", tipo: "money", total: true }, { header: "Tramo", tipo: "texto" }],
      filas: enriq.map((r) => [r.proveedor, r.numero, r.fecha, r.vence, Math.max(0, r.dv), r.saldo, r.tramo]),
    },
  };
}
export async function filtrosCarteraPagar(empresaId: number) {
  const provs = await db.select({ value: terceros.id, label: terceros.razonSocial }).from(terceros).where(and(eq(terceros.empresaId, empresaId), eq(terceros.activo, true))).orderBy(terceros.razonSocial);
  return provs.map((p) => ({ value: String(p.value), label: p.label }));
}
```

- [ ] **Step 2: Registrar en `registry.ts`**

```ts
import { Wallet } from "lucide-react";
import { cargarCarteraPagar, filtrosCarteraPagar } from "@/lib/services/reportes/cartera-pagar";
// dentro de REPORTES:
{
  slug: "cartera-pagar", titulo: "Cuentas por pagar", desc: "Aging de lo que debes y top proveedores.", grupo: "Cartera", icon: Wallet,
  charts: [
    { tipo: "barras", titulo: "Saldo por tramo (aging)", serie: "porTramo", formato: "money", ancho: "full" },
    { tipo: "torta", titulo: "Vencido vs por vencer", serie: "vencidoVsPorVencer", formato: "money" },
    { tipo: "barras", titulo: "Top proveedores", serie: "topProveedores", formato: "money" },
  ],
  filtros: async (empresaId) => [
    { key: "hasta", label: "Corte", tipo: "fecha" },
    { key: "proveedor", label: "Proveedor", tipo: "select", opciones: await filtrosCarteraPagar(empresaId) },
  ],
  cargar: cargarCarteraPagar,
},
```

- [ ] **Step 3: Typecheck + build + commit**

Run: `npx tsc --noEmit` (0); `npm run build` (OK)
```bash
git add src/lib/services/reportes/cartera-pagar.ts src/lib/reportes/registry.ts && git commit -m "feat(ola2): reporte Cuentas por pagar (aging)"
```

---

## Task 6: Reporte Flujo de caja / Tesorería

**Files:** Create: `src/lib/services/reportes/flujo-caja.ts`; Modify: `src/lib/reportes/registry.ts`

- [ ] **Step 1: Servicio** (movimientos de tesorería)

```ts
// src/lib/services/reportes/flujo-caja.ts
import "server-only";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { movimientosTesoreria, cuentasPropias } from "@/lib/db/schema";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

export async function cargarFlujoCaja(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const cond = and(eq(movimientosTesoreria.empresaId, empresaId), gte(movimientosTesoreria.fecha, f.desde!), lte(movimientosTesoreria.fecha, f.hasta!),
    f.cuenta ? eq(movimientosTesoreria.cuentaPropiaId, Number(f.cuenta)) : undefined);
  const [tot] = await db.select({
    entradas: sql<string>`coalesce(sum(case when ${movimientosTesoreria.tipo}='entrada' then ${movimientosTesoreria.valor} else 0 end),0)`,
    salidas: sql<string>`coalesce(sum(case when ${movimientosTesoreria.tipo}='salida' then ${movimientosTesoreria.valor} else 0 end),0)`,
  }).from(movimientosTesoreria).where(cond);
  const entradas = Number(tot?.entradas ?? 0); const salidas = Number(tot?.salidas ?? 0);
  const porDia = await db.select({ x: movimientosTesoreria.fecha,
    y: sql<string>`sum(case when ${movimientosTesoreria.tipo}='entrada' then ${movimientosTesoreria.valor} else -${movimientosTesoreria.valor} end)` })
    .from(movimientosTesoreria).where(cond).groupBy(movimientosTesoreria.fecha).orderBy(movimientosTesoreria.fecha);
  const porCuenta = await db.select({ etiqueta: cuentasPropias.nombre,
    y: sql<string>`sum(case when ${movimientosTesoreria.tipo}='entrada' then ${movimientosTesoreria.valor} else -${movimientosTesoreria.valor} end)` })
    .from(movimientosTesoreria).innerJoin(cuentasPropias, eq(movimientosTesoreria.cuentaPropiaId, cuentasPropias.id)).where(cond).groupBy(cuentasPropias.nombre);
  const det = await db.select({ fecha: movimientosTesoreria.fecha, cuenta: cuentasPropias.nombre, tipo: movimientosTesoreria.tipo, origen: movimientosTesoreria.origen, valor: movimientosTesoreria.valor, descripcion: movimientosTesoreria.descripcion })
    .from(movimientosTesoreria).innerJoin(cuentasPropias, eq(movimientosTesoreria.cuentaPropiaId, cuentasPropias.id)).where(cond).orderBy(desc(movimientosTesoreria.fecha));
  return {
    kpis: [
      { label: "Entradas", valor: entradas, formato: "money" },
      { label: "Salidas", valor: salidas, formato: "money" },
      { label: "Neto", valor: entradas - salidas, formato: "money" },
      { label: "# Movimientos", valor: det.length, formato: "num" },
    ],
    series: {
      flujoDia: porDia.map((r) => ({ x: r.x, y: Number(r.y) })),
      netoPorCuenta: porCuenta.map((r) => ({ x: r.etiqueta, etiqueta: r.etiqueta, y: Number(r.y) })),
      entradasVsSalidas: [{ x: "Entradas", etiqueta: "Entradas", y: entradas }, { x: "Salidas", etiqueta: "Salidas", y: salidas }],
    },
    detalle: {
      columnas: [{ header: "Fecha", tipo: "fecha" }, { header: "Cuenta", tipo: "texto" }, { header: "Tipo", tipo: "texto" }, { header: "Origen", tipo: "texto" }, { header: "Descripción", tipo: "texto" }, { header: "Valor", tipo: "money", total: true }],
      filas: det.map((r) => [r.fecha, r.cuenta, r.tipo, r.origen, r.descripcion ?? "", Number(r.valor)]),
    },
  };
}
export async function filtrosFlujoCaja(empresaId: number) {
  const cuentas = await db.select({ value: cuentasPropias.id, label: cuentasPropias.nombre }).from(cuentasPropias).where(eq(cuentasPropias.empresaId, empresaId)).orderBy(cuentasPropias.nombre);
  return cuentas.map((c) => ({ value: String(c.value), label: c.label }));
}
```

- [ ] **Step 2: Registrar**

```ts
import { Landmark } from "lucide-react";
import { cargarFlujoCaja, filtrosFlujoCaja } from "@/lib/services/reportes/flujo-caja";
// dentro de REPORTES:
{
  slug: "flujo-caja", titulo: "Flujo de caja", desc: "Entradas vs salidas y neto por cuenta.", grupo: "Tesorería", icon: Landmark,
  charts: [
    { tipo: "linea", titulo: "Flujo neto por día", serie: "flujoDia", formato: "money", ancho: "full" },
    { tipo: "torta", titulo: "Entradas vs salidas", serie: "entradasVsSalidas", formato: "money" },
    { tipo: "barras", titulo: "Neto por cuenta", serie: "netoPorCuenta", formato: "money" },
  ],
  filtros: async (empresaId) => [
    { key: "desde", label: "Desde", tipo: "fecha" }, { key: "hasta", label: "Hasta", tipo: "fecha" },
    { key: "cuenta", label: "Cuenta", tipo: "select", opciones: await filtrosFlujoCaja(empresaId) },
  ],
  cargar: cargarFlujoCaja,
},
```

- [ ] **Step 3: Typecheck + build + commit**

Run: `npx tsc --noEmit` (0); `npm run build` (OK)
```bash
git add src/lib/services/reportes/flujo-caja.ts src/lib/reportes/registry.ts && git commit -m "feat(ola2): reporte Flujo de caja"
```

---

## Task 7: Reporte Dashboard Factura Electrónica

**Files:** Create: `src/lib/services/reportes/fe.ts`; Modify: `src/lib/reportes/registry.ts`

- [ ] **Step 1: Servicio** (ventas F.E. + compras F.E. con retenciones)

```ts
// src/lib/services/reportes/fe.ts
import "server-only";
import { and, eq, ne, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { facturas, terceros, pagosProveedor, pagoRetenciones, cuentasPorPagar } from "@/lib/db/schema";
import type { DatosReporte, Filtros } from "@/lib/reportes/tipos";

export async function cargarFE(empresaId: number, f: Filtros): Promise<DatosReporte> {
  const condV = and(eq(facturas.empresaId, empresaId), eq(facturas.esElectronica, true), ne(facturas.estado, "anulada"), gte(facturas.fecha, f.desde!), lte(facturas.fecha, f.hasta!));
  const [v] = await db.select({ total: sql<string>`coalesce(sum(${facturas.total}),0)`, n: sql<number>`count(*)` }).from(facturas).where(condV);
  const ventasDia = await db.select({ x: facturas.fecha, y: sql<string>`sum(${facturas.total})` }).from(facturas).where(condV).groupBy(facturas.fecha).orderBy(facturas.fecha);

  // Compras F.E. (pagos de CxP electrónicas) + retención total
  const condC = and(eq(pagosProveedor.empresaId, empresaId), eq(cuentasPorPagar.esElectronica, true), gte(pagosProveedor.fecha, f.desde!), lte(pagosProveedor.fecha, f.hasta!));
  const [c] = await db.select({ pagado: sql<string>`coalesce(sum(${pagosProveedor.valor}),0)`, ret: sql<string>`coalesce(sum(${pagosProveedor.retencionTotal}),0)` })
    .from(pagosProveedor).innerJoin(cuentasPorPagar, eq(pagosProveedor.cuentaPorPagarId, cuentasPorPagar.id)).where(condC);

  const detV = await db.select({ numero: facturas.numero, fecha: facturas.fecha, cliente: terceros.razonSocial, total: facturas.total })
    .from(facturas).innerJoin(terceros, eq(facturas.clienteId, terceros.id)).where(condV).orderBy(desc(facturas.fecha));

  const ventasFE = Number(v?.total ?? 0); const comprasFE = Number(c?.pagado ?? 0); const ret = Number(c?.ret ?? 0);
  return {
    kpis: [
      { label: "Ventas F.E.", valor: ventasFE, formato: "money" },
      { label: "# Facturas F.E.", valor: Number(v?.n ?? 0), formato: "num" },
      { label: "Compras F.E. pagadas", valor: comprasFE, formato: "money" },
      { label: "Retenciones", valor: ret, formato: "money" },
    ],
    series: {
      ventasDia: ventasDia.map((r) => ({ x: r.x, y: Number(r.y) })),
      ventasVsCompras: [{ x: "Ventas F.E.", etiqueta: "Ventas F.E.", y: ventasFE }, { x: "Compras F.E.", etiqueta: "Compras F.E.", y: comprasFE }],
    },
    detalle: {
      columnas: [{ header: "Factura", tipo: "texto" }, { header: "Fecha", tipo: "fecha" }, { header: "Cliente", tipo: "texto" }, { header: "Total", tipo: "money", total: true }],
      filas: detV.map((r) => [r.numero, r.fecha, r.cliente, Number(r.total)]),
    },
  };
}
```
(Sin filtros propios además del rango; `pagoRetenciones` se importa por si se amplía, pero no es necesario — quítalo del import si el linter se queja.)

- [ ] **Step 2: Registrar**

```ts
import { FileText } from "lucide-react";
import { cargarFE } from "@/lib/services/reportes/fe";
// dentro de REPORTES:
{
  slug: "factura-electronica", titulo: "Factura electrónica", desc: "Ventas F.E. y compras con retenciones.", grupo: "Análisis", icon: FileText,
  charts: [
    { tipo: "linea", titulo: "Ventas F.E. por día", serie: "ventasDia", formato: "money", ancho: "full" },
    { tipo: "torta", titulo: "Ventas vs compras F.E.", serie: "ventasVsCompras", formato: "money" },
  ],
  filtros: async () => [ { key: "desde", label: "Desde", tipo: "fecha" }, { key: "hasta", label: "Hasta", tipo: "fecha" } ],
  cargar: cargarFE,
},
```

- [ ] **Step 3: Typecheck + build + commit**

Run: `npx tsc --noEmit` (0); `npm run build` (OK)
```bash
git add src/lib/services/reportes/fe.ts src/lib/reportes/registry.ts && git commit -m "feat(ola2): reporte Dashboard Factura Electrónica"
```

---

## Task 8: Verificación Ola 2 + deploy

**Files:** Create (gitignored): `src/test/ola2.integration.test.ts`

- [ ] **Step 1: Test de integración** — los 4 servicios nuevos devuelven `kpis/series/detalle` coherentes (patrón de `src/test/reportes.integration.test.ts`): importar `cargarCompras`, `cargarCarteraPagar`, `cargarFlujoCaja`, `cargarFE` y verificar `kpis.length>0`, `detalle.columnas.length>0`, series son arrays. Y `escposBytes` produce un Uint8Array no vacío.

Run: `npx vitest run -c src/test/vitest.integration.config.ts src/test/ola2.integration.test.ts --disableConsoleIntercept`
Expected: PASS.

- [ ] **Step 2: Suite + build**

Run: `npx vitest run` (verde, incluye `recibo.test.ts`)
Run: `rm -rf .next/types && npm run build` (OK — aparecen los 4 reportes en `/reportes/[slug]`)

- [ ] **Step 3: Commit + push**

```bash
git add -A && git commit -m "test(ola2): verificación ticket + 4 reportes"; git push origin main
```

- [ ] **Step 4: Verificación manual** — detalle de factura → recibo (cambiar formato, imprimir); en Android, "Imprimir directo". Reportes: Compras, Cuentas por pagar, Flujo de caja, Factura electrónica con filtros + export.

---

## Self-Review (cobertura del spec — Ola 2)
- Ticket 3 formatos + preferencia recordada (localStorage): Task 2. ✔
- Impresión nativa universal (window.print + @media print): Tasks 2/3. ✔
- Bluetooth ESC/POS solo Android (navigator.bluetooth): Task 2. ✔
- Recibo en venta (detalle factura): Task 3. (Recibo de cobro reusa el mismo componente; el detalle de factura cubre el caso de venta; el de cobro se puede sumar igual si se desea — fuera del mínimo.) ✔
- Dominio testeado: escposBytes/textoReciboVenta (Task 1). ✔
- 4 reportes (Compras, CxP aging, Flujo de caja, FE) sobre el motor: Tasks 4-7. ✔
- Tipos consistentes: `DatosReciboVenta` (Task 1) usado en Recibo/ReciboPrint (Tasks 2/3); servicios devuelven `DatosReporte` (tipos.ts) y sus `series` coinciden con los `charts` del registry. ✔

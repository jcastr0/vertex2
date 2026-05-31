# Navegación Informativa (drill-down) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans. Steps con checkbox (`- [ ]`).

**Goal:** Fichas de detalle de **bodega** (`/bodegas/[id]`) y **producto** (`/productos/[id]`) que agregan ventas, compras, merma y existencias desde tablas existentes, para que navegar dé información del negocio.

**Architecture:** Un servicio de agregación `src/lib/services/fichas.ts` (server-only) con `fichaBodega()` y `fichaProducto()` que devuelven objetos tipados. Una función pura `resumenInventarioBodega()` (testeable sin BD) calcula los KPIs de inventario. Las páginas son server components que llaman al servicio y pintan con `KpiFila` + `ResponsiveTable`. El clic de fila en las listas se dirige al detalle vía `rowHref`. Sin tablas nuevas.

**Tech Stack:** Next.js 15 RSC, Drizzle (postgres-js), vitest, pnpm.

**Convenciones:** pnpm. Dominio puro en `src/lib/services/fichas.test.ts` (`npx vitest run`). Integración (BD) en `src/test/**` (GITIGNORADO) con `npx vitest run -c src/test/vitest.integration.config.ts <archivo> --disableConsoleIntercept`. Verificar `npx tsc --noEmit` y `npm run build`. Datos numéricos de postgres-js llegan como **string** → coerción con `Number(x ?? 0)`.

**Hechos verificados del esquema:**
- `inventario` (vx16): `bodegaId`, `productoId`, `cantidadActual`, `costoPromedio`, `valorTotal` (strings). Una fila por (bodega, producto).
- `facturas` (vx21): `empresaId`, `estado` (`borrador`|`emitida`|`anulada`), `fecha` (date). Venta válida = `estado = "emitida"`.
- `facturaDetalles` (vx22): `facturaId`, `productoId`, `cantidadBase`, `subtotal`. NO tiene empresaId (filtrar vía join a vx21).
- `pedidos` (vx13): `empresaId`, `fecha` (date). `pedidoDetalles` (vx14): `pedidoId`, `productoId`, `cantidad`, `cantidadRecibida`. Filtrar vía join a vx13.
- `notasInventario` (vx18): `empresaId`, `bodegaId`, `productoId`, `tipo` (`entrada`|`salida`|`ajuste`), `cantidad`, `motivo`, `fecha` (timestamptz). Merma = `tipo = "salida"`.
- `movimientosInventario` (vx17): `empresaId`, `bodegaId`, `productoId`, `tipo`, `cantidad`, `referencia`, `fecha`.
- Servicios existentes reutilizables: `obtenerBodega(empresaId,id) → Bodega|null`, `obtenerProducto(empresaId,id) → Producto|null` (de `@/lib/services/bodegas` y `@/lib/services/productos`). `productos.unidadBaseId → unidadesMedida`.
- Componentes: `KpiFila({ kpis: KpiDato[] })` de `@/components/reportes/kpi`; `KpiDato` (`{ label, valor:number, formato?: "money"|"pct" }`) de `@/lib/reportes/tipos`. `ResponsiveTable`/`Columna` y `rowHref` de `@/components/responsive-table`. `ListaFiltrable` reenvía `rowHref`. `PageHeader` (props `title`, `description`, children = acciones).
- "Últimos 30 días" en SQL = `>= now() - interval '30 days'` (Postgres castea date↔timestamptz).

---

## Task 1: Helper puro `resumenInventarioBodega` (TDD)

**Files:** Create `src/lib/services/fichas.ts`, `src/lib/services/fichas.test.ts`

- [ ] **Step 1: Test que falla** — `src/lib/services/fichas.test.ts`
```ts
import { describe, it, expect } from "vitest";
import { resumenInventarioBodega } from "./fichas";

describe("resumenInventarioBodega", () => {
  it("cuenta productos con y sin existencia y suma el valor", () => {
    const r = resumenInventarioBodega([
      { existencia: 10, valor: 1000 },
      { existencia: 0, valor: 0 },
      { existencia: -2, valor: 0 },
      { existencia: 5.5, valor: 250 },
    ]);
    expect(r.productosDistintos).toBe(2); // existencia > 0
    expect(r.sinExistencia).toBe(2); // existencia <= 0
    expect(r.valorInventario).toBe(1250);
  });
  it("lista vacía → ceros", () => {
    expect(resumenInventarioBodega([])).toEqual({ productosDistintos: 0, sinExistencia: 0, valorInventario: 0 });
  });
});
```

- [ ] **Step 2: Corre y falla** — `npx vitest run src/lib/services/fichas.test.ts` → FAIL (módulo/función no existe).

- [ ] **Step 3: Implementar el helper** en `src/lib/services/fichas.ts`
```ts
import "server-only";

/** Resumen de inventario de una bodega a partir de las existencias de sus productos. Puro. */
export function resumenInventarioBodega(
  filas: { existencia: number; valor: number }[],
): { productosDistintos: number; sinExistencia: number; valorInventario: number } {
  let productosDistintos = 0;
  let sinExistencia = 0;
  let valorInventario = 0;
  for (const f of filas) {
    if (f.existencia > 0) productosDistintos++;
    else sinExistencia++;
    valorInventario += f.valor;
  }
  return { productosDistintos, sinExistencia, valorInventario };
}
```

- [ ] **Step 4: Pasa** — `npx vitest run src/lib/services/fichas.test.ts` → PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add src/lib/services/fichas.ts src/lib/services/fichas.test.ts && git commit -m "feat(fichas): helper puro resumenInventarioBodega (TDD)"
```

---

## Task 2: Servicio `fichaBodega`

**Files:** Modify `src/lib/services/fichas.ts`; Test `src/test/fichas.integration.test.ts` (gitignored)

- [ ] **Step 1: Implementar `fichaBodega`** — añade a `src/lib/services/fichas.ts` (mantén el helper y su import "server-only"; agrega los imports nuevos arriba)
```ts
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventario, productos, bodegas, unidadesMedida, movimientosInventario } from "@/lib/db/schema";
import { obtenerBodega, type Bodega } from "./bodegas";

export interface FichaBodegaProducto {
  productoId: number; nombre: string; sku: string; unidad: string;
  existencia: number; costoPromedio: number; valor: number;
}
export interface FichaBodegaMovimiento {
  id: number; fecha: Date; tipo: string; productoNombre: string; cantidad: number; referencia: string | null;
}
export interface FichaBodega {
  bodega: Bodega;
  productosDistintos: number; sinExistencia: number; valorInventario: number;
  productos: FichaBodegaProducto[];
  ultimosMovimientos: FichaBodegaMovimiento[];
}

export async function fichaBodega(empresaId: number, bodegaId: number): Promise<FichaBodega | null> {
  const bodega = await obtenerBodega(empresaId, bodegaId);
  if (!bodega) return null;

  const filas = await db
    .select({
      productoId: inventario.productoId,
      nombre: productos.nombre,
      sku: productos.sku,
      unidad: unidadesMedida.abreviatura,
      existencia: inventario.cantidadActual,
      costoPromedio: inventario.costoPromedio,
      valor: inventario.valorTotal,
    })
    .from(inventario)
    .innerJoin(productos, eq(inventario.productoId, productos.id))
    .innerJoin(unidadesMedida, eq(productos.unidadBaseId, unidadesMedida.id))
    .where(and(eq(inventario.empresaId, empresaId), eq(inventario.bodegaId, bodegaId)))
    .orderBy(desc(inventario.valorTotal));

  const productosFicha: FichaBodegaProducto[] = filas.map((f) => ({
    productoId: f.productoId, nombre: f.nombre, sku: f.sku, unidad: f.unidad,
    existencia: Number(f.existencia ?? 0), costoPromedio: Number(f.costoPromedio ?? 0), valor: Number(f.valor ?? 0),
  }));

  const resumen = resumenInventarioBodega(productosFicha.map((p) => ({ existencia: p.existencia, valor: p.valor })));

  const movs = await db
    .select({
      id: movimientosInventario.id,
      fecha: movimientosInventario.fecha,
      tipo: movimientosInventario.tipo,
      productoNombre: productos.nombre,
      cantidad: movimientosInventario.cantidad,
      referencia: movimientosInventario.referencia,
    })
    .from(movimientosInventario)
    .innerJoin(productos, eq(movimientosInventario.productoId, productos.id))
    .where(and(eq(movimientosInventario.empresaId, empresaId), eq(movimientosInventario.bodegaId, bodegaId)))
    .orderBy(desc(movimientosInventario.fecha))
    .limit(10);

  return {
    bodega,
    productosDistintos: resumen.productosDistintos,
    sinExistencia: resumen.sinExistencia,
    valorInventario: resumen.valorInventario,
    productos: productosFicha,
    ultimosMovimientos: movs.map((m) => ({
      id: m.id, fecha: m.fecha, tipo: m.tipo, productoNombre: m.productoNombre,
      cantidad: Number(m.cantidad ?? 0), referencia: m.referencia,
    })),
  };
}
```
VERIFICA que `obtenerBodega` exporte el tipo `Bodega` (si no, usa `type Bodega = Awaited<ReturnType<typeof obtenerBodega>>` con `NonNullable`, o `typeof bodegas.$inferSelect`). Ajusta el import en consecuencia.

- [ ] **Step 2: Test de integración** — `src/test/fichas.integration.test.ts`
```ts
import { config } from "dotenv";
config({ path: ".env.local" });
if (!process.env.DATABASE_URL && process.env.DATABASE_URL_SESSION) process.env.DATABASE_URL = process.env.DATABASE_URL_SESSION;

import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { empresas, bodegas, productos } from "@/lib/db/schema";
import { fichaBodega, fichaProducto } from "@/lib/services/fichas";

describe.skipIf(!process.env.DATABASE_URL)("Fichas — bodega y producto", () => {
  it("fichaBodega devuelve KPIs y productos coherentes", async () => {
    const [e] = await db.select().from(empresas).where(eq(empresas.nombre, "Empresa Demo")).limit(1);
    const [b] = await db.select().from(bodegas).where(eq(bodegas.empresaId, e.id)).limit(1);
    if (!b) return;
    const f = await fichaBodega(e.id, b.id);
    expect(f).not.toBeNull();
    console.log(`[fichaBodega ${b.nombre}] productos=${f!.productosDistintos} sinExist=${f!.sinExistencia} valor=${Math.round(f!.valorInventario)} movs=${f!.ultimosMovimientos.length}`);
    expect(f!.productosDistintos).toBeGreaterThanOrEqual(0);
    expect(f!.valorInventario).toBeGreaterThanOrEqual(0);
    expect(f!.productos.length).toBe(f!.productosDistintos + f!.sinExistencia);
    expect(f!.ultimosMovimientos.length).toBeLessThanOrEqual(10);
  }, 30000);

  it("fichaBodega de id inexistente → null", async () => {
    const [e] = await db.select().from(empresas).where(eq(empresas.nombre, "Empresa Demo")).limit(1);
    expect(await fichaBodega(e.id, 99999999)).toBeNull();
  }, 30000);
});
```

- [ ] **Step 3: Corre integración** — `npx vitest run -c src/test/vitest.integration.config.ts src/test/fichas.integration.test.ts --disableConsoleIntercept` → 2 PASS, imprime los KPIs.

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit** (el test está gitignored; se commitea solo el servicio)
```bash
git add src/lib/services/fichas.ts && git commit -m "feat(fichas): fichaBodega (existencias, valor, últimos movimientos)"
```

---

## Task 3: Servicio `fichaProducto`

**Files:** Modify `src/lib/services/fichas.ts`, `src/test/fichas.integration.test.ts`

- [ ] **Step 1: Implementar `fichaProducto`** — añade a `src/lib/services/fichas.ts` (agrega los imports de tablas que falten: `facturas, facturaDetalles, pedidos, pedidoDetalles, notasInventario`; y `obtenerProducto, type Producto` de `./productos`)
```ts
import { facturas, facturaDetalles, pedidos, pedidoDetalles, notasInventario } from "@/lib/db/schema";
import { obtenerProducto, type Producto } from "./productos";

export interface KpiPeriodo { total: number; ultimos30: number }
export interface FichaProductoExistencia { bodegaId: number; bodegaNombre: string; existencia: number; valor: number }
export interface FichaProductoMerma { id: number; fecha: Date; bodegaNombre: string; cantidad: number; motivo: string }
export interface FichaProducto {
  producto: Producto;
  vendidoCantidad: KpiPeriodo; vendidoMonto: KpiPeriodo; compradoCantidad: KpiPeriodo; mermaCantidad: KpiPeriodo;
  stockTotal: number;
  existencias: FichaProductoExistencia[];
  pedidosDistintos: number; cantidadRecibida: number;
  mermas: FichaProductoMerma[];
}

const u30 = sql`now() - interval '30 days'`;

export async function fichaProducto(empresaId: number, productoId: number): Promise<FichaProducto | null> {
  const producto = await obtenerProducto(empresaId, productoId);
  if (!producto) return null;

  // Ventas (factura emitida): cantidad en unidad base + monto, total y últimos 30d.
  const [venta] = await db
    .select({
      cantTotal: sql<string>`coalesce(sum(${facturaDetalles.cantidadBase}), 0)`,
      cant30: sql<string>`coalesce(sum(case when ${facturas.fecha} >= ${u30} then ${facturaDetalles.cantidadBase} else 0 end), 0)`,
      montoTotal: sql<string>`coalesce(sum(${facturaDetalles.subtotal}), 0)`,
      monto30: sql<string>`coalesce(sum(case when ${facturas.fecha} >= ${u30} then ${facturaDetalles.subtotal} else 0 end), 0)`,
    })
    .from(facturaDetalles)
    .innerJoin(facturas, eq(facturaDetalles.facturaId, facturas.id))
    .where(and(eq(facturas.empresaId, empresaId), eq(facturaDetalles.productoId, productoId), eq(facturas.estado, "emitida")));

  // Compras (pedidos): cantidad, recibida, nº de pedidos distintos.
  const [compra] = await db
    .select({
      cantTotal: sql<string>`coalesce(sum(${pedidoDetalles.cantidad}), 0)`,
      cant30: sql<string>`coalesce(sum(case when ${pedidos.fecha} >= ${u30} then ${pedidoDetalles.cantidad} else 0 end), 0)`,
      recibida: sql<string>`coalesce(sum(${pedidoDetalles.cantidadRecibida}), 0)`,
      pedidos: sql<string>`count(distinct ${pedidoDetalles.pedidoId})`,
    })
    .from(pedidoDetalles)
    .innerJoin(pedidos, eq(pedidoDetalles.pedidoId, pedidos.id))
    .where(and(eq(pedidos.empresaId, empresaId), eq(pedidoDetalles.productoId, productoId)));

  // Merma (notas de salida): total + últimos 30d.
  const [merma] = await db
    .select({
      total: sql<string>`coalesce(sum(${notasInventario.cantidad}), 0)`,
      u30: sql<string>`coalesce(sum(case when ${notasInventario.fecha} >= ${u30} then ${notasInventario.cantidad} else 0 end), 0)`,
    })
    .from(notasInventario)
    .where(and(eq(notasInventario.empresaId, empresaId), eq(notasInventario.productoId, productoId), eq(notasInventario.tipo, "salida")));

  // Existencias por bodega.
  const exist = await db
    .select({
      bodegaId: inventario.bodegaId,
      bodegaNombre: bodegas.nombre,
      existencia: inventario.cantidadActual,
      valor: inventario.valorTotal,
    })
    .from(inventario)
    .innerJoin(bodegas, eq(inventario.bodegaId, bodegas.id))
    .where(and(eq(inventario.empresaId, empresaId), eq(inventario.productoId, productoId)))
    .orderBy(desc(inventario.cantidadActual));

  // Últimas mermas (detalle).
  const mermasDet = await db
    .select({
      id: notasInventario.id,
      fecha: notasInventario.fecha,
      bodegaNombre: bodegas.nombre,
      cantidad: notasInventario.cantidad,
      motivo: notasInventario.motivo,
    })
    .from(notasInventario)
    .innerJoin(bodegas, eq(notasInventario.bodegaId, bodegas.id))
    .where(and(eq(notasInventario.empresaId, empresaId), eq(notasInventario.productoId, productoId), eq(notasInventario.tipo, "salida")))
    .orderBy(desc(notasInventario.fecha))
    .limit(5);

  const existencias = exist.map((x) => ({
    bodegaId: x.bodegaId, bodegaNombre: x.bodegaNombre,
    existencia: Number(x.existencia ?? 0), valor: Number(x.valor ?? 0),
  }));

  return {
    producto,
    vendidoCantidad: { total: Number(venta.cantTotal), ultimos30: Number(venta.cant30) },
    vendidoMonto: { total: Number(venta.montoTotal), ultimos30: Number(venta.monto30) },
    compradoCantidad: { total: Number(compra.cantTotal), ultimos30: Number(compra.cant30) },
    mermaCantidad: { total: Number(merma.total), ultimos30: Number(merma.u30) },
    stockTotal: existencias.reduce((s, x) => s + x.existencia, 0),
    existencias,
    pedidosDistintos: Number(compra.pedidos),
    cantidadRecibida: Number(compra.recibida),
    mermas: mermasDet.map((m) => ({
      id: m.id, fecha: m.fecha, bodegaNombre: m.bodegaNombre, cantidad: Number(m.cantidad ?? 0), motivo: m.motivo,
    })),
  };
}
```
VERIFICA que `obtenerProducto` exporte `Producto` (si no, usa `NonNullable<Awaited<ReturnType<typeof obtenerProducto>>>` o `typeof productos.$inferSelect`).

- [ ] **Step 2: Ampliar el test de integración** — añade dentro del `describe` de `src/test/fichas.integration.test.ts`:
```ts
  it("fichaProducto: KPIs no negativos, 30d ≤ total, Σ existencias = stockTotal", async () => {
    const [e] = await db.select().from(empresas).where(eq(empresas.nombre, "Empresa Demo")).limit(1);
    const [p] = await db.select().from(productos).where(eq(productos.empresaId, e.id)).limit(1);
    if (!p) return;
    const f = await fichaProducto(e.id, p.id);
    expect(f).not.toBeNull();
    console.log(`[fichaProducto ${p.nombre}] vendido=${f!.vendidoCantidad.total}(30d ${f!.vendidoCantidad.ultimos30}) $${Math.round(f!.vendidoMonto.total)} comprado=${f!.compradoCantidad.total} pedidos=${f!.pedidosDistintos} merma=${f!.mermaCantidad.total} stock=${f!.stockTotal}`);
    for (const k of [f!.vendidoCantidad, f!.vendidoMonto, f!.compradoCantidad, f!.mermaCantidad]) {
      expect(k.total).toBeGreaterThanOrEqual(0);
      expect(k.ultimos30).toBeLessThanOrEqual(k.total + 1e-6);
    }
    const suma = f!.existencias.reduce((s, x) => s + x.existencia, 0);
    expect(Math.abs(suma - f!.stockTotal)).toBeLessThan(1e-6);
    expect(f!.pedidosDistintos).toBeGreaterThanOrEqual(0);
  }, 30000);

  it("fichaProducto de id inexistente → null", async () => {
    const [e] = await db.select().from(empresas).where(eq(empresas.nombre, "Empresa Demo")).limit(1);
    expect(await fichaProducto(e.id, 99999999)).toBeNull();
  }, 30000);
```

- [ ] **Step 3: Corre integración** — `npx vitest run -c src/test/vitest.integration.config.ts src/test/fichas.integration.test.ts --disableConsoleIntercept` → 4 PASS, imprime los números.

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**
```bash
git add src/lib/services/fichas.ts && git commit -m "feat(fichas): fichaProducto (ventas, compras, merma, existencias)"
```

---

## Task 4: Página detalle de Bodega + clic de fila

**Files:** Create `src/app/(app)/bodegas/[id]/page.tsx`; Modify `src/app/(app)/bodegas/page.tsx`

- [ ] **Step 1: Página de detalle** `src/app/(app)/bodegas/[id]/page.tsx`
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { fichaBodega } from "@/lib/services/fichas";
import { PageHeader } from "@/components/page-header";
import { KpiFila } from "@/components/reportes/kpi";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { FichaBodegaProducto, FichaBodegaMovimiento } from "@/lib/services/fichas";

export const metadata: Metadata = { title: "Bodega — Vertex" };
const num = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

export default async function BodegaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("bodegas.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const f = await fichaBodega(empresaId, Number(id));
  if (!f) notFound();
  const permisos = await getPermisos();
  const puedeEditar = puede(permisos, "bodegas.editar");

  const colsProductos: Columna<FichaBodegaProducto>[] = [
    { header: "Producto", primary: true, cell: (p) => <span className="font-medium">{p.nombre}</span> },
    { header: "SKU", cell: (p) => <span className="tabular text-muted-foreground">{p.sku}</span> },
    { header: "Existencia", className: "text-right", cell: (p) => <span className="tabular">{num(p.existencia)} {p.unidad}</span> },
    { header: "Costo prom.", className: "text-right", cell: (p) => <span className="tabular">{money(p.costoPromedio)}</span> },
    { header: "Valor", className: "text-right", cell: (p) => <span className="tabular">{money(p.valor)}</span> },
  ];
  const colsMovs: Columna<FichaBodegaMovimiento>[] = [
    { header: "Fecha", primary: true, cell: (m) => <span className="tabular">{new Date(m.fecha).toLocaleDateString("es-CO")}</span> },
    { header: "Tipo", cell: (m) => <Badge variant="secondary" className="font-normal capitalize">{m.tipo.replace("_", " ")}</Badge> },
    { header: "Producto", cell: (m) => m.productoNombre },
    { header: "Cantidad", className: "text-right", cell: (m) => <span className="tabular">{num(m.cantidad)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={f.bodega.nombre} description={`Código ${f.bodega.codigo}${f.bodega.responsable ? " · " + f.bodega.responsable : ""}`}>
        {puedeEditar && (
          <Link href={`/bodegas/${f.bodega.id}/editar`} className={buttonVariants({ variant: "outline" })}>Editar bodega</Link>
        )}
      </PageHeader>

      <KpiFila kpis={[
        { label: "Productos en stock", valor: f.productosDistintos },
        { label: "Valor del inventario", valor: f.valorInventario, formato: "money" },
        { label: "Sin existencia", valor: f.sinExistencia },
      ]} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Productos en la bodega</h2>
        {f.productos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">Esta bodega no tiene productos con inventario.</div>
        ) : (
          <ResponsiveTable items={f.productos} getKey={(p) => p.productoId} columns={colsProductos} rowHref={(p) => `/productos/${p.productoId}`} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Últimos movimientos</h2>
        {f.ultimosMovimientos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">Sin movimientos recientes.</div>
        ) : (
          <ResponsiveTable items={f.ultimosMovimientos} getKey={(m) => m.id} columns={colsMovs} />
        )}
      </section>
    </div>
  );
}
```
VERIFICA los nombres de campo de `f.bodega` (`codigo`, `nombre`, `responsable`, `id`) contra el tipo `Bodega`. Ajusta `description` si `responsable` es opcional/null (ya contemplado).

- [ ] **Step 2: Clic de fila → detalle** en `src/app/(app)/bodegas/page.tsx`: al `<ListaFiltrable ...>` agrégale la prop `rowHref={(b) => \`/bodegas/${b.id}\`}`. No quites nada más (el dropdown de acciones con "Editar" sigue igual).

- [ ] **Step 3: Build** — `npx tsc --noEmit && npm run build` → OK; `/bodegas/[id]` aparece en la lista de rutas.

- [ ] **Step 4: Commit**
```bash
git add "src/app/(app)/bodegas" && git commit -m "feat(bodegas): ficha de detalle (KPIs, productos, movimientos) + clic de fila"
```

---

## Task 5: Página detalle de Producto + clic de fila

**Files:** Create `src/app/(app)/productos/[id]/page.tsx`; Modify `src/app/(app)/productos/page.tsx`

- [ ] **Step 1: Página de detalle** `src/app/(app)/productos/[id]/page.tsx`
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { fichaProducto } from "@/lib/services/fichas";
import { PageHeader } from "@/components/page-header";
import { KpiFila } from "@/components/reportes/kpi";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import type { FichaProductoExistencia, FichaProductoMerma } from "@/lib/services/fichas";

export const metadata: Metadata = { title: "Producto — Vertex" };
const num = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

export default async function ProductoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("productos.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const f = await fichaProducto(empresaId, Number(id));
  if (!f) notFound();
  const permisos = await getPermisos();
  const puedeEditar = puede(permisos, "productos.editar");

  const colsExist: Columna<FichaProductoExistencia>[] = [
    { header: "Bodega", primary: true, cell: (x) => <span className="font-medium">{x.bodegaNombre}</span> },
    { header: "Existencia", className: "text-right", cell: (x) => <span className="tabular">{num(x.existencia)}</span> },
    { header: "Valor", className: "text-right", cell: (x) => <span className="tabular">{money(x.valor)}</span> },
  ];
  const colsMerma: Columna<FichaProductoMerma>[] = [
    { header: "Fecha", primary: true, cell: (m) => <span className="tabular">{new Date(m.fecha).toLocaleDateString("es-CO")}</span> },
    { header: "Bodega", cell: (m) => m.bodegaNombre },
    { header: "Cantidad", className: "text-right", cell: (m) => <span className="tabular">{num(m.cantidad)}</span> },
    { header: "Motivo", cell: (m) => m.motivo },
  ];
  const periodo = (k: { total: number; ultimos30: number }, fmt = false) =>
    `${fmt ? money(k.total) : num(k.total)} · 30d: ${fmt ? money(k.ultimos30) : num(k.ultimos30)}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={f.producto.nombre} description={`SKU ${f.producto.sku}`}>
        <div className="flex gap-2">
          <Link href={`/inventario/${f.producto.id}`} className={buttonVariants({ variant: "outline" })}>Ver kardex</Link>
          {puedeEditar && <Link href={`/productos/${f.producto.id}/editar`} className={buttonVariants({ variant: "outline" })}>Editar</Link>}
        </div>
      </PageHeader>

      <KpiFila kpis={[
        { label: "Stock total", valor: f.stockTotal },
        { label: "Vendido (total)", valor: f.vendidoCantidad.total },
        { label: "Vendido $", valor: f.vendidoMonto.total, formato: "money" },
        { label: "Merma (total)", valor: f.mermaCantidad.total },
      ]} />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Vendido</p>
          <p className="tabular text-lg font-semibold">{periodo(f.vendidoCantidad)}</p>
          <p className="text-xs text-muted-foreground">{money(f.vendidoMonto.total)} histórico</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Comprado</p>
          <p className="tabular text-lg font-semibold">{periodo(f.compradoCantidad)}</p>
          <p className="text-xs text-muted-foreground">Traído en {f.pedidosDistintos} pedido(s) · recibido {num(f.cantidadRecibida)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Merma</p>
          <p className="tabular text-lg font-semibold">{periodo(f.mermaCantidad)}</p>
          <p className="text-xs text-muted-foreground">Salidas por notas de inventario</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Existencias por bodega</h2>
        {f.existencias.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">Sin existencias registradas.</div>
        ) : (
          <ResponsiveTable items={f.existencias} getKey={(x) => x.bodegaId} columns={colsExist} rowHref={(x) => `/bodegas/${x.bodegaId}`} />
        )}
      </section>

      {f.mermas.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Últimas mermas / ajustes</h2>
          <ResponsiveTable items={f.mermas} getKey={(m) => m.id} columns={colsMerma} />
        </section>
      )}
    </div>
  );
}
```
VERIFICA los campos de `f.producto` (`nombre`, `sku`, `id`) contra el tipo `Producto`.

- [ ] **Step 2: Clic de fila → detalle** en `src/app/(app)/productos/page.tsx`: al `<ListaFiltrable ...>` agrégale `rowHref={(p) => \`/productos/${p.id}\`}`. (Si la lista usa un tipo de fila distinto a `Producto`, usa el id que esté disponible en esa fila.)

- [ ] **Step 3: Build** — `npx tsc --noEmit && npm run build` → OK; `/productos/[id]` aparece.

- [ ] **Step 4: Commit**
```bash
git add "src/app/(app)/productos" && git commit -m "feat(productos): ficha de detalle (ventas, compras, merma, existencias) + clic de fila"
```

---

## Task 6: Verificación final + deploy

- [ ] **Step 1: Suite completa** — `npx vitest run` → todo verde (incluye `fichas.test.ts`).
- [ ] **Step 2: Integración** — `npx vitest run -c src/test/vitest.integration.config.ts src/test/fichas.integration.test.ts --disableConsoleIntercept` → 4 PASS.
- [ ] **Step 3: Build** — `rm -rf .next/types && npm run build` → OK.
- [ ] **Step 4: Push**
```bash
git push origin main
```
- [ ] **Step 5: Verificación manual** — entrar a Bodegas → clic en una bodega → ver KPIs, productos, movimientos; clic en un producto → ver ventas/compras/merma/existencias; "Ver kardex" y "Editar" funcionan.

---

## Self-Review (cobertura del spec)
- Navegación: clic de fila → detalle, Editar como botón: Tasks 4-5 (rowHref + botón). ✔
- Ficha bodega (KPIs: productos, valor, sin existencia; productos; últimos movimientos; editar): Tasks 2, 4. ✔
- Ficha producto (vendido cant+$, comprado, merma con total+30d; existencias por bodega; pedidos distintos + recibido; lista de mermas; kardex; editar): Tasks 3, 5. ✔
- Servicio `fichas.ts` con tipos exportados + helper puro: Tasks 1-3. ✔
- Reglas: venta = `emitida`, merma = `salida`, números parseados, 30d = `now() - interval '30 days'`: Tasks 2-3. ✔
- Pruebas: dominio puro (Task 1) + integración bodega y producto incl. invariantes Σexistencias=stock y 30d≤total (Tasks 2-3). ✔
- Permisos `bodegas.ver`/`productos.ver` en las páginas: Tasks 4-5. ✔
- Sin tablas nuevas / reuso de KpiFila, ResponsiveTable, obtenerBodega/Producto, kardex: en todo el plan. ✔

## Notas de orden
- Tasks 1-3 dejan el servicio listo y probado antes de tocar UI. Tasks 4-5 son independientes entre sí (bodega vs producto) pero ambas dependen del servicio. El `rowHref` de cada lista se agrega en su tarea de UI respectiva.

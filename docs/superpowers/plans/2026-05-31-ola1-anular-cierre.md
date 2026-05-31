# Ola 1 — Anular ventas + Cierre de caja — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir anular una venta (revirtiendo stock + cartera/caja, sin cobros) y hacer el cierre de caja diario (arqueo de todas las cuentas; conteo físico en efectivo).

**Architecture:** Lógica pura testeada (`puedeAnular`, `diferenciaArqueo`) + servicios transaccionales en `facturas.ts` y un nuevo `cierre.ts`. Dos tablas nuevas para el cierre. UI: botón Anular en el detalle de factura; página de Cierre en Tesorería.

**Tech Stack:** Next.js 15 RSC, Drizzle, vitest. Spec: `docs/superpowers/specs/2026-05-31-anular-cierre-ticket-reportes-design.md`.

**Convenciones:** dominio puro en `src/lib/domain/*.ts` (`npx vitest run <archivo>`). Integración (BD) en `src/test/**` (GITIGNORADO) con `npx vitest run -c src/test/vitest.integration.config.ts <archivo>`. pnpm. Migraciones: `npm run db:generate && npm run db:migrate`. Verificar con `npx tsc --noEmit` y `npm run build`. Dinero/fechas como string → `Number(...)`. Reusar `origen: "ajuste"` del enum `movOrigenEnum` (no agregar valores). Efectivo = cuentas `tipo: "caja"`.

---

## Task 1: Esquema — anulación de factura + tablas de cierre

**Files:** Modify: `src/lib/db/schema.ts`, `src/lib/db/nomenclatura.ts`

- [ ] **Step 1: Agregar columnas de anulación a `facturas` (vx21)**

Dentro de `pgTable("vx21", {...})`, junto a `observaciones`:
```ts
    motivoAnulacion: text("motivo_anulacion"),
    anuladaEn: timestamp("anulada_en", { withTimezone: true }),
```

- [ ] **Step 2: Agregar las tablas de cierre al final de `schema.ts`**

```ts
// ──────────────────────────────────────────────────────────────────────────
// vx37 — Cierres de caja (arqueo diario)
// ──────────────────────────────────────────────────────────────────────────
export const cierres = pgTable(
  "vx37",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" }).notNull().references(() => empresas.id),
    fecha: date("fecha").notNull(),
    usuarioId: bigint("usuario_id", { mode: "number" }).notNull().references(() => usuarios.id),
    observaciones: text("observaciones"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("vx37_empresa_fecha_uq").on(t.empresaId, t.fecha)],
);

// ──────────────────────────────────────────────────────────────────────────
// vx38 — Detalle de cierre por cuenta
// ──────────────────────────────────────────────────────────────────────────
export const cierreCuentas = pgTable(
  "vx38",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    cierreId: bigint("cierre_id", { mode: "number" }).notNull().references(() => cierres.id, { onDelete: "cascade" }),
    cuentaPropiaId: bigint("cuenta_propia_id", { mode: "number" }).notNull().references(() => cuentasPropias.id),
    tipo: varchar("tipo", { length: 10 }).notNull(), // caja | banco
    saldoEsperado: money("saldo_esperado").notNull(),
    montoContado: money("monto_contado"),
    diferencia: money("diferencia").notNull().default("0"),
  },
  (t) => [index("vx38_cierre_idx").on(t.cierreId)],
);
```
(Usa los helpers `money`, `date`, etc. ya definidos en el archivo. Si `unique`/`date` no están importados arriba, ya lo están — el resto del schema los usa.)

- [ ] **Step 3: Registrar en nomenclatura**

En `src/lib/db/nomenclatura.ts`, antes del `];` final:
```ts
  { codigo: "vx37", nombreModelo: "Cierre", descripcion: "Cierres de caja (arqueo)", modulo: "Cartera", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx38", nombreModelo: "CierreCuenta", descripcion: "Detalle de cierre por cuenta", modulo: "Cartera", tieneEmpresaId: false, esCatalogo: false },
```

- [ ] **Step 4: Generar y aplicar migración**

Run: `npm run db:generate && npm run db:migrate`
Expected: crea vx37, vx38 y agrega columnas a vx21. Aplicada.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/nomenclatura.ts supabase/migrations && git commit -m "feat(ola1): esquema anulación de factura + tablas de cierre (vx37/vx38)"
```

---

## Task 2: Dominio — puedeAnular + diferenciaArqueo (TDD)

**Files:** Create: `src/lib/domain/anulacion.ts`, `src/lib/domain/anulacion.test.ts`

- [ ] **Step 1: Test que falla**

```ts
// src/lib/domain/anulacion.test.ts
import { describe, it, expect } from "vitest";
import { puedeAnular, diferenciaArqueo } from "./anulacion";

describe("puedeAnular", () => {
  it("bloquea si no está emitida", () => {
    expect(puedeAnular("anulada", 100, 100, "contado").ok).toBe(false);
    expect(puedeAnular("borrador", 100, 100, "credito").ok).toBe(false);
  });
  it("crédito sin abonos (saldo == total) se puede", () => {
    expect(puedeAnular("emitida", 100, 100, "credito").ok).toBe(true);
  });
  it("crédito con abonos (saldo < total) se bloquea", () => {
    const r = puedeAnular("emitida", 40, 100, "credito");
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/cobros|recaudos/i);
  });
  it("contado siempre se puede si está emitida", () => {
    expect(puedeAnular("emitida", 0, 100, "contado").ok).toBe(true);
  });
});

describe("diferenciaArqueo", () => {
  it("contado menos esperado", () => {
    expect(diferenciaArqueo(100000, 98000)).toBe(-2000);
    expect(diferenciaArqueo(100000, 100000)).toBe(0);
    expect(diferenciaArqueo(100000, 105000)).toBe(5000);
  });
});
```

- [ ] **Step 2: Correr → falla**

Run: `npx vitest run src/lib/domain/anulacion.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```ts
// src/lib/domain/anulacion.ts
export function puedeAnular(
  estado: string,
  saldoPendiente: number,
  total: number,
  tipoVenta: string,
): { ok: boolean; motivo?: string } {
  if (estado !== "emitida") return { ok: false, motivo: "Solo se pueden anular facturas emitidas." };
  if (tipoVenta === "credito" && saldoPendiente < total) {
    return { ok: false, motivo: "La factura tiene cobros aplicados; revierte los recaudos primero." };
  }
  return { ok: true };
}

/** Diferencia de arqueo = lo contado menos lo esperado (negativo = faltante). */
export function diferenciaArqueo(esperado: number, contado: number): number {
  return contado - esperado;
}
```

- [ ] **Step 4: Correr → pasa**

Run: `npx vitest run src/lib/domain/anulacion.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/anulacion.ts src/lib/domain/anulacion.test.ts && git commit -m "feat(ola1): dominio puedeAnular + diferenciaArqueo"
```

---

## Task 3: Servicio anularFactura + excluir anuladas de consultas

**Files:** Modify: `src/lib/services/facturas.ts`, `src/lib/services/reportes/ventas.ts` (si ya existe), `src/lib/services/relacion.ts`

- [ ] **Step 1: Implementar `anularFactura` en `facturas.ts`**

Agregar imports que falten (`movimientosTesoreria` ya se importa; `puedeAnular` nuevo):
```ts
import { puedeAnular } from "@/lib/domain/anulacion";
```
Agregar la función (al final del archivo, antes de cierres de módulo):
```ts
export class AnulacionInvalida extends Error {}

/** Anula una factura emitida sin cobros: devuelve stock y revierte cartera/caja. */
export async function anularFactura(facturaId: number, motivo: string, ctx: Contexto): Promise<void> {
  const [f] = await db.select().from(facturas).where(and(eq(facturas.empresaId, ctx.empresaId), eq(facturas.id, facturaId))).limit(1);
  if (!f) throw new AnulacionInvalida("Factura no encontrada.");

  // Saldo pendiente (crédito): de la CxC; contado no tiene CxC.
  let saldoPend = Number(f.total);
  let cxcId: number | null = null;
  if (f.tipoVenta === "credito") {
    const [cxc] = await db.select().from(cuentasPorCobrar).where(eq(cuentasPorCobrar.facturaId, facturaId)).limit(1);
    if (cxc) { saldoPend = Number(cxc.saldoPendiente); cxcId = cxc.id; }
  }
  const chk = puedeAnular(f.estado, saldoPend, Number(f.total), f.tipoVenta);
  if (!chk.ok) throw new AnulacionInvalida(chk.motivo!);

  const detalles = await db.select().from(facturaDetalles).where(eq(facturaDetalles.facturaId, facturaId));

  await db.transaction(async (tx) => {
    // 1) Devolver stock
    for (const d of detalles) {
      const [inv] = await tx.select().from(inventario)
        .where(and(eq(inventario.empresaId, ctx.empresaId), eq(inventario.bodegaId, f.bodegaId), eq(inventario.productoId, d.productoId))).limit(1);
      if (inv) {
        const nueva = Number(inv.cantidadActual) + Number(d.cantidadBase);
        const costo = Number(inv.costoPromedio);
        await tx.update(inventario).set({ cantidadActual: String(nueva), valorTotal: String(nueva * costo), ultimaActualizacion: new Date(), updatedAt: new Date() }).where(eq(inventario.id, inv.id));
        await tx.insert(movimientosInventario).values({
          empresaId: ctx.empresaId, bodegaId: f.bodegaId, productoId: d.productoId,
          tipo: "entrada", cantidad: String(d.cantidadBase), costoUnitario: String(d.costoUnitario),
          referencia: `ANULA ${f.numero}`, usuarioId: ctx.usuarioId,
        });
      }
    }
    // 2) Revertir cartera / caja
    if (f.tipoVenta === "credito" && cxcId) {
      await tx.update(cuentasPorCobrar).set({ saldoPendiente: "0", updatedAt: new Date() }).where(eq(cuentasPorCobrar.id, cxcId));
    } else if (f.tipoVenta === "contado" && f.cuentaDestinoId) {
      await tx.insert(movimientosTesoreria).values({
        empresaId: ctx.empresaId, cuentaPropiaId: f.cuentaDestinoId, fecha: f.fecha,
        tipo: "salida", origen: "ajuste", valor: String(f.total),
        descripcion: `Anulación venta ${f.numero}`, facturaId: f.id, usuarioId: ctx.usuarioId,
      });
    }
    // 3) Marcar la factura
    await tx.update(facturas).set({ estado: "anulada", motivoAnulacion: motivo, anuladaEn: new Date(), updatedAt: new Date() }).where(eq(facturas.id, f.id));

    await registrarAuditoria(
      { empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx21", modelId: f.id, accion: "ANULAR", registroNuevo: { motivo }, ipOrigen: ctx.ip },
      tx,
    );
  });
}
```
Nota: verifica que `movimientosInventario` acepte `referencia` (lo usa `crearFactura`). Si el campo se llama distinto, usa el mismo nombre que en `crearFactura`.

- [ ] **Step 2: Verificar columnas reales de `movimientosInventario`**

Run: `grep -n "referencia\|costoUnitario\|export const movimientosInventario" src/lib/db/schema.ts`
Si `referencia`/`costoUnitario` no existen con ese nombre, ajusta el `insert` del Step 1 a los nombres reales (mira cómo lo hace `crearFactura` en `facturas.ts`).

- [ ] **Step 3: Excluir anuladas de las consultas de ventas/cartera**

En `src/lib/services/facturas.ts` → `facturasDeCliente`: cambia `ne(facturas.estado, "cancelada")` por `ne(facturas.estado, "anulada")`.
En `src/lib/services/relacion.ts` → `resumenCliente` (la consulta de ventas): cambia `ne(facturas.estado, "cancelada")` por `ne(facturas.estado, "anulada")`.
Si existe `src/lib/services/reportes/ventas.ts` (de la central de reportes): cambia ambas condiciones `ne(facturas.estado, "cancelada")` por `ne(facturas.estado, "anulada")`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/facturas.ts src/lib/services/relacion.ts src/lib/services/reportes/ventas.ts 2>/dev/null; git commit -m "feat(ola1): servicio anularFactura + excluir anuladas"
```

---

## Task 4: UI Anular en el detalle de factura

**Files:** Create: `src/app/(app)/facturas/anular-button.tsx`; Modify: `src/app/(app)/facturas/actions.ts`, `src/app/(app)/facturas/[id]/page.tsx`

- [ ] **Step 1: Action `anularFacturaAction` en `facturas/actions.ts`**

```ts
// imports: agregar anularFactura, AnulacionInvalida
import { crearFactura, ultimoPrecioPorCliente, ultimaUnidadVentaPorCliente, VentaInvalida, anularFactura, AnulacionInvalida } from "@/lib/services/facturas";

export interface AnularState { error?: string; ok?: boolean }
export async function anularFacturaAction(facturaId: number, _prev: AnularState, form: FormData): Promise<AnularState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "facturas.eliminar")) return { error: "No tienes permiso para anular." };
  const motivo = String(form.get("motivo") || "").trim();
  if (motivo.length < 3) return { error: "Escribe el motivo de la anulación." };
  try {
    await anularFactura(facturaId, motivo, c.ctx);
  } catch (e) {
    if (e instanceof AnulacionInvalida) return { error: e.message };
    console.error("[facturas] anular:", e);
    return { error: "No se pudo anular la factura." };
  }
  revalidatePath(`/facturas/${facturaId}`);
  revalidatePath("/facturas"); revalidatePath("/cuentas-cobrar"); revalidatePath("/inventario");
  return { ok: true };
}
```
(Asegura que `puede` esté importado en el archivo; ya se usa en otras acciones.)

- [ ] **Step 2: Componente `anular-button.tsx` (cliente)**

```tsx
"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { anularFacturaAction, type AnularState } from "./actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { AlertCircle, Loader2, Ban } from "lucide-react";

function Confirmar() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="destructive" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null} Anular factura</Button>;
}

export function AnularButton({ facturaId }: { facturaId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action = anularFacturaAction.bind(null, facturaId);
  const [state, formAction] = useActionState<AnularState, FormData>(action, {});
  useEffect(() => { if (state.ok) { setOpen(false); router.refresh(); } }, [state.ok, router]);
  return (
    <>
      <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => setOpen(true)}><Ban className="size-4" /> Anular</Button>
      <Modal open={open} onOpenChange={setOpen} title="Anular factura" description="Devuelve el inventario y revierte la cartera o el ingreso de caja. No se puede deshacer.">
        <form action={formAction} className="space-y-4">
          {state.error && <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertCircle className="size-4 shrink-0" /> {state.error}</div>}
          <Field label="Motivo" required><Textarea name="motivo" rows={2} required placeholder="Ej. error en el precio / cliente equivocado" autoFocus /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Confirmar /></div>
        </form>
      </Modal>
    </>
  );
}
```

- [ ] **Step 3: Mostrar el botón en `facturas/[id]/page.tsx`**

Importar: `import { puede } from "@/lib/auth/roles";` (si no está) y `import { AnularButton } from "../anular-button";`. La página ya hace `const sesion = await requirePermiso("facturas.ver")`. En el header (junto a PrintButton/AbonoButton), agregar:
```tsx
{factura.estado === "emitida" && puede(sesion.rol, "facturas.eliminar") && <AnularButton facturaId={factura.id} />}
```
Y mostrar el estado anulada: donde se muestra el estado, si `factura.estado === "anulada"`, un badge destructivo "Anulada" + (si hay) `factura.motivoAnulacion`.

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit` (0); `npm run build` (OK)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/facturas/anular-button.tsx" "src/app/(app)/facturas/actions.ts" "src/app/(app)/facturas/[id]/page.tsx" && git commit -m "feat(ola1): UI anular factura"
```

---

## Task 5: Servicio de cierre de caja

**Files:** Create: `src/lib/services/cierre.ts`

- [ ] **Step 1: Implementar**

```ts
// src/lib/services/cierre.ts
import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { cierres, cierreCuentas, cuentasPropias } from "@/lib/db/schema";
import { listarCuentasPropias } from "./tesoreria";
import { diferenciaArqueo } from "@/lib/domain/anulacion";
import { registrarAuditoria } from "@/lib/audit";
import type { Contexto } from "./bodegas";

export class CierreInvalido extends Error {}

export interface CuentaCierre { id: number; nombre: string; tipo: string; esEfectivo: boolean; esperado: number }

/** Cuentas activas con su saldo esperado (saldo corrido actual) para el arqueo. */
export async function cuentasParaCierre(empresaId: number): Promise<CuentaCierre[]> {
  const cuentas = await listarCuentasPropias(empresaId);
  return cuentas
    .filter((c) => c.activa)
    .map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, esEfectivo: c.tipo === "caja", esperado: c.saldo }));
}

export interface ConteoCuenta { cuentaId: number; montoContado?: number }

/** Registra el cierre del día con su detalle por cuenta (diferencia solo en efectivo). */
export async function registrarCierre(empresaId: number, fecha: string, conteos: ConteoCuenta[], observaciones: string | null, ctx: Contexto): Promise<number> {
  const [existe] = await db.select({ id: cierres.id }).from(cierres).where(and(eq(cierres.empresaId, empresaId), eq(cierres.fecha, fecha))).limit(1);
  if (existe) throw new CierreInvalido("Ya existe un cierre para ese día.");

  const cuentas = await cuentasParaCierre(empresaId);
  const porId = new Map(conteos.map((c) => [c.cuentaId, c.montoContado]));

  return db.transaction(async (tx) => {
    const [cierre] = await tx.insert(cierres).values({ empresaId, fecha, usuarioId: ctx.usuarioId, observaciones }).returning();
    for (const c of cuentas) {
      const contado = c.esEfectivo ? porId.get(c.id) : undefined;
      const dif = c.esEfectivo && contado != null ? diferenciaArqueo(c.esperado, contado) : 0;
      await tx.insert(cierreCuentas).values({
        cierreId: cierre.id, cuentaPropiaId: c.id, tipo: c.esEfectivo ? "caja" : "banco",
        saldoEsperado: String(c.esperado), montoContado: contado != null ? String(contado) : null, diferencia: String(dif),
      });
    }
    await registrarAuditoria({ empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx37", modelId: cierre.id, accion: "CREAR", registroNuevo: { fecha }, ipOrigen: ctx.ip }, tx);
    return cierre.id;
  });
}

export async function listarCierres(empresaId: number) {
  return db.select().from(cierres).where(eq(cierres.empresaId, empresaId)).orderBy(desc(cierres.fecha));
}

export async function obtenerCierre(empresaId: number, id: number) {
  const [c] = await db.select().from(cierres).where(and(eq(cierres.empresaId, empresaId), eq(cierres.id, id))).limit(1);
  if (!c) return null;
  const detalle = await db.select({ d: cierreCuentas, cuenta: cuentasPropias.nombre }).from(cierreCuentas).innerJoin(cuentasPropias, eq(cierreCuentas.cuentaPropiaId, cuentasPropias.id)).where(eq(cierreCuentas.cierreId, id));
  return { ...c, detalle };
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` (0)
```bash
git add src/lib/services/cierre.ts && git commit -m "feat(ola1): servicio de cierre de caja"
```

---

## Task 6: UI Cierre de caja

**Files:** Create: `src/app/(app)/tesoreria/cierre/page.tsx`, `src/app/(app)/tesoreria/cierre/cierre-form.tsx`, `src/app/(app)/tesoreria/cierre/actions.ts`; Modify: `src/app/(app)/tesoreria/page.tsx` (botón)

- [ ] **Step 1: Action**

```ts
// src/app/(app)/tesoreria/cierre/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { registrarCierre, CierreInvalido } from "@/lib/services/cierre";

export interface CierreState { error?: string }
export async function registrarCierreAction(_prev: CierreState, form: FormData): Promise<CierreState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "tesoreria.crear")) return { error: "No tienes permiso." };
  const fecha = String(form.get("fecha") || new Date().toISOString().slice(0, 10));
  const observaciones = String(form.get("observaciones") || "") || null;
  let conteos: { cuentaId: number; montoContado?: number }[] = [];
  try { conteos = JSON.parse(String(form.get("conteosJson") ?? "[]")); } catch { /* ignore */ }
  let id: number;
  try { id = await registrarCierre(c.ctx.empresaId, fecha, conteos, observaciones, c.ctx); }
  catch (e) { if (e instanceof CierreInvalido) return { error: e.message }; console.error("[cierre]", e); return { error: "No se pudo registrar el cierre." }; }
  revalidatePath("/tesoreria/cierre");
  redirect(`/tesoreria/cierre?ok=${id}`);
}
```

- [ ] **Step 2: Form (cliente)**

```tsx
// src/app/(app)/tesoreria/cierre/cierre-form.tsx
"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { registrarCierreAction, type CierreState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

interface Cuenta { id: number; nombre: string; tipo: string; esEfectivo: boolean; esperado: number }
const money = (n: number) => "$" + n.toLocaleString("es-CO");

function Cerrar() { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null} Cerrar día</Button>; }

export function CierreForm({ cuentas, hoy }: { cuentas: Cuenta[]; hoy: string }) {
  const [state, action] = useActionState<CierreState, FormData>(registrarCierreAction, {});
  const [conteos, setConteos] = useState<Record<number, string>>({});
  const conteosJson = JSON.stringify(cuentas.filter((c) => c.esEfectivo && conteos[c.id]).map((c) => ({ cuentaId: c.id, montoContado: Number(conteos[c.id]) })));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="fecha" value={hoy} />
      <input type="hidden" name="conteosJson" value={conteosJson} />
      {state.error && <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertCircle className="size-4 shrink-0" /> {state.error}</div>}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {cuentas.map((c) => {
          const contado = Number(conteos[c.id]);
          const dif = c.esEfectivo && conteos[c.id] ? contado - c.esperado : null;
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="min-w-0 flex-1"><span className="font-medium">{c.nombre}</span> <span className="text-xs text-muted-foreground">· {c.tipo}</span></span>
              <span className="text-sm text-muted-foreground">esperado <span className="tabular font-medium text-foreground">{money(c.esperado)}</span></span>
              {c.esEfectivo ? (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">contado</Label>
                  <Input type="number" step="0.01" className="h-9 w-32 tabular" value={conteos[c.id] ?? ""} onChange={(e) => setConteos((s) => ({ ...s, [c.id]: e.target.value }))} placeholder="0" />
                  {dif != null && <span className={`tabular text-sm font-medium ${dif === 0 ? "text-primary" : "text-destructive"}`}>{dif > 0 ? "+" : ""}{money(dif)}</span>}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">conciliación (banco)</span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="space-y-1.5"><Label htmlFor="obs">Observaciones</Label><Textarea id="obs" name="observaciones" rows={2} placeholder="Notas del cierre (opcional)" /></div>
      <Cerrar />
    </form>
  );
}
```

- [ ] **Step 3: Página**

```tsx
// src/app/(app)/tesoreria/cierre/page.tsx
import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { cuentasParaCierre, listarCierres } from "@/lib/services/cierre";
import { PageHeader } from "@/components/page-header";
import { CierreForm } from "./cierre-form";

export const metadata: Metadata = { title: "Cierre de caja — Vertex" };
const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");

export default async function CierrePage() {
  await requirePermiso("tesoreria.ver");
  const { empresaId } = await requireEmpresa();
  const hoy = new Date().toISOString().slice(0, 10);
  const [cuentas, cierres] = await Promise.all([cuentasParaCierre(empresaId), listarCierres(empresaId)]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Cierre de caja" description="Arqueo del día: cuenta el efectivo y cuadra contra lo esperado." />
      <CierreForm cuentas={cuentas} hoy={hoy} />
      {cierres.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Cierres anteriores</h3>
          <ul className="divide-y divide-border rounded-2xl border border-border text-sm">
            {cierres.map((c) => (
              <li key={c.id} className="flex justify-between px-4 py-2.5"><span className="tabular">{c.fecha}</span><span className="text-muted-foreground">{c.observaciones || "—"}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Botón "Cierre de caja" en `tesoreria/page.tsx`**

En el `PageHeader` de `src/app/(app)/tesoreria/page.tsx`, junto al botón "Nueva cuenta", agrega un `Link` (importa `Calculator` de lucide-react):
```tsx
<Link href="/tesoreria/cierre" className={buttonVariants({ variant: "outline" })}><Calculator className="size-4" /> Cierre de caja</Link>
```

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit` (0); `npm run build` (OK — aparece `/tesoreria/cierre`)

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/tesoreria/cierre" "src/app/(app)/tesoreria/page.tsx" && git commit -m "feat(ola1): UI cierre de caja (arqueo)"
```

---

## Task 7: Verificación Ola 1

**Files:** Create (gitignored): `src/test/ola1.integration.test.ts`

- [ ] **Step 1: Test de integración**

Crea un test que, contra la BD demo: (a) cree una factura de contado, la anule, y verifique que el stock vuelve a subir y la factura queda `anulada`; (b) llame `cuentasParaCierre` y `registrarCierre` con un conteo y verifique la diferencia. Usa el patrón de `src/test/ciclo-completo.integration.test.ts` (dotenv + db + Empresa Demo). Importa `crearFactura, anularFactura` de `@/lib/services/facturas`, `cuentasParaCierre, registrarCierre` de `@/lib/services/cierre`. Borra el cierre creado al final si quieres re-ejecutar (o usa una fecha fija de prueba distinta a hoy).

Run: `npx vitest run -c src/test/vitest.integration.config.ts src/test/ola1.integration.test.ts --disableConsoleIntercept`
Expected: PASS.

- [ ] **Step 2: Suite + build**

Run: `npx vitest run` (todo verde, incluye `anulacion.test.ts`)
Run: `rm -rf .next/types && npm run build` (OK)

- [ ] **Step 3: Commit + push**

```bash
git add -A && git commit -m "test(ola1): verificación anular + cierre"; git push origin main
```

---

## Self-Review (cobertura del spec — Ola 1)
- Anular: regla sin cobros (puedeAnular, Task 2), reversa stock+cartera/caja + estado anulada (Task 3), UI (Task 4). ✔
- Excluir anuladas de ventas/cartera (Task 3 Step 3). ✔
- Cierre: tablas vx37/vx38 (Task 1), servicio con esperado/contado/diferencia y bloqueo de doble cierre (Task 5), UI con conteo solo en efectivo + banco conciliación (Task 6). ✔
- Dominio testeado: puedeAnular, diferenciaArqueo (Task 2). ✔
- Tipos consistentes: `puedeAnular`/`diferenciaArqueo` (Task 2) usados en Tasks 3/5; `CuentaCierre`/`ConteoCuenta` (Task 5) usados en Task 6. ✔
- Reusa `origen:"ajuste"` (sin migrar enum) y `tipo:"caja"` = efectivo. ✔

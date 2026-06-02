# Cotizaciones (pedidos de cliente) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar a Vertex un módulo de **cotizaciones / pedidos de cliente**: el cliente pide productos con precios (sugeridos del historial de ese cliente), queda pendiente sin tocar inventario, y se convierte en factura permitiendo ajustes.

**Architecture:** Entidad propia `cotizaciones` (vx39) + `cotizacionDetalles` (vx40), espejo del patrón facturas. El servicio reusa lo existente: `formatearNumero` para numerar, `ultimoPrecioPorCliente` para sugerir precios, y `crearFactura` para la conversión (no se duplica lógica de stock/cartera). UI con los componentes ya establecidos (ListaFiltrable, SearchSelect, FormSection, Modal). Lógica pura (total + guardia de estado) en `src/lib/domain/cotizacion.ts` con pruebas.

**Tech Stack:** Next.js 15 (App Router, RSC, Server Actions), Drizzle + postgres-js (Supabase), Zod, Tailwind, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-02-cotizaciones-pedido-cliente-design.md`

---

## File Structure

**Crear:**
- `src/lib/domain/cotizacion.ts` — lógica pura: `totalCotizacion(lineas)`, `puedeFacturar(estado)`, `puedeAnular(estado)`.
- `src/lib/domain/cotizacion.test.ts` — pruebas de la lógica pura.
- `src/lib/validation/cotizacion.ts` — esquemas Zod + `parseCotizacionForm` y `parseFacturarForm`.
- `src/lib/validation/cotizacion.test.ts` — pruebas de parseo.
- `src/lib/services/cotizaciones.ts` — `listarCotizaciones`, `obtenerCotizacion`, `crearCotizacion`, `anularCotizacion`, `facturarCotizacion`.
- `src/app/(app)/cotizaciones/page.tsx` — lista.
- `src/app/(app)/cotizaciones/actions.ts` — `crearCotizacionAction`, `preciosClienteAction`, `anularCotizacionAction`, `facturarCotizacionAction`.
- `src/app/(app)/cotizaciones/cotizacion-form.tsx` — formulario nueva (cliente + líneas + precio sugerido).
- `src/app/(app)/cotizaciones/nueva/page.tsx` — página nueva.
- `src/app/(app)/cotizaciones/[id]/page.tsx` — detalle/comprobante.
- `src/app/(app)/cotizaciones/anular-cotizacion-button.tsx` — botón anular (Modal + motivo).
- `src/app/(app)/cotizaciones/[id]/facturar/page.tsx` — página facturar.
- `src/app/(app)/cotizaciones/facturar-cotizacion-form.tsx` — formulario de conversión (líneas editables + bodega + contado/crédito).

**Modificar:**
- `src/lib/db/schema.ts` — tablas vx39/vx40 + tipos.
- `src/lib/db/nomenclatura.ts` — registrar vx39/vx40 en CATALOGO.
- `src/lib/auth/roles.ts` — módulo `cotizaciones` (MODULOS, MODULO_LABEL, roles).
- `src/lib/modules.ts` — ítem "Cotizaciones" en el grupo "Ventas".

**Convención de datos:** cantidades en **unidad base** del producto. La cotización NO guarda `bodegaId` ni `unidadId`; al facturar se elige bodega y se usa la unidad base (factor 1).

---

## Task 1: Esquema de base de datos (vx39/vx40) + nomenclatura

**Files:**
- Modify: `src/lib/db/schema.ts` (agregar tras la definición de `facturaDetalles`/vx22)
- Modify: `src/lib/db/nomenclatura.ts` (array `CATALOGO`)

- [ ] **Step 1: Agregar las tablas a `schema.ts`**

Pega este bloque después de la definición de `facturaDetalles` (vx22). Usa los helpers ya existentes (`money`, `qty`, `price`) y los imports ya presentes en el archivo:

```typescript
// ──────────────────────────────────────────────────────────────────────────
// vx39 — Cotizaciones (pedidos de cliente)
// ──────────────────────────────────────────────────────────────────────────
export const cotizaciones = pgTable("vx39",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    clienteId: bigint("cliente_id", { mode: "number" })
      .notNull()
      .references(() => terceros.id),
    numero: varchar("numero", { length: 20 }).notNull(),
    fecha: date("fecha").notNull(),
    estado: varchar("estado", { length: 20 }).notNull().default("pendiente"),
    total: money("total").notNull().default("0"),
    observaciones: text("observaciones"),
    motivoAnulacion: text("motivo_anulacion"),
    // Se llena al convertir la cotización en factura.
    facturaId: bigint("factura_id", { mode: "number" }).references((): AnyPgColumn => facturas.id),
    usuarioId: bigint("usuario_id", { mode: "number" })
      .notNull()
      .references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx39_empresa_numero_uq").on(t.empresaId, t.numero),
    index("vx39_cliente_idx").on(t.clienteId),
    index("vx39_empresa_estado_idx").on(t.empresaId, t.estado),
  ],
);

export const cotizacionDetalles = pgTable("vx40",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    cotizacionId: bigint("cotizacion_id", { mode: "number" })
      .notNull()
      .references(() => cotizaciones.id, { onDelete: "cascade" }),
    productoId: bigint("producto_id", { mode: "number" })
      .notNull()
      .references(() => productos.id),
    cantidad: qty("cantidad").notNull(),
    precioUnitario: price("precio_unitario").notNull(),
    subtotal: money("subtotal").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vx40_cotizacion_idx").on(t.cotizacionId)],
);

export type Cotizacion = typeof cotizaciones.$inferSelect;
export type CotizacionDetalle = typeof cotizacionDetalles.$inferSelect;
```

- [ ] **Step 2: Registrar en nomenclatura (`src/lib/db/nomenclatura.ts`)**

Agrega estas dos filas al final del array `CATALOGO` (antes del cierre `]`):

```typescript
  { codigo: "vx39", nombreModelo: "Cotizacion", descripcion: "Cotizaciones (pedidos de cliente)", modulo: "Ventas", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx40", nombreModelo: "CotizacionDetalle", descripcion: "Detalle de cotizaciones", modulo: "Ventas", tieneEmpresaId: false, esCatalogo: false },
```

- [ ] **Step 3: Generar y aplicar la migración**

Run:
```bash
cd /Users/jhonatan/Docker/Vertex2/vertex2
npx drizzle-kit push
```
Expected: crea las tablas `vx39` y `vx40` sin errores. (Si el proyecto usa `generate` + `migrate` en vez de `push`, sigue ese flujo — revisa `package.json` scripts `db:*`.)

- [ ] **Step 4: Reseed de nomenclatura (data demo desechable)**

Run:
```bash
npx tsx src/lib/db/seed-base.ts 2>/dev/null || pnpm run db:seed:base 2>/dev/null || echo "Ejecuta el seed base segun package.json para registrar vx39/vx40"
```
Expected: las filas vx39/vx40 quedan en `vx00`. Verifica:
```bash
psql "$DATABASE_URL" -c "select codigo, nombre_modelo from vx00 where codigo in ('vx39','vx40');"
```
Expected: dos filas.

- [ ] **Step 5: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/nomenclatura.ts
git commit -m "feat(cotizaciones): tablas vx39/vx40 + registro en nomenclatura"
```

---

## Task 2: Lógica pura del dominio (total + guardia de estado)

**Files:**
- Create: `src/lib/domain/cotizacion.ts`
- Test: `src/lib/domain/cotizacion.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

```typescript
// src/lib/domain/cotizacion.test.ts
import { describe, it, expect } from "vitest";
import { totalCotizacion, puedeFacturar, puedeAnular } from "./cotizacion";

describe("totalCotizacion", () => {
  it("suma cantidad × precio de cada línea", () => {
    expect(totalCotizacion([{ cantidad: 2, precioUnitario: 1500 }, { cantidad: 3, precioUnitario: 1000 }])).toBe(6000);
  });
  it("ignora líneas sin cantidad o precio", () => {
    expect(totalCotizacion([{ cantidad: 0, precioUnitario: 1000 }, { cantidad: 5, precioUnitario: 0 }])).toBe(0);
  });
});

describe("guardias de estado", () => {
  it("solo se factura/anula una cotización pendiente", () => {
    expect(puedeFacturar("pendiente")).toBe(true);
    expect(puedeFacturar("facturada")).toBe(false);
    expect(puedeFacturar("anulada")).toBe(false);
    expect(puedeAnular("pendiente")).toBe(true);
    expect(puedeAnular("facturada")).toBe(false);
  });
});
```

- [ ] **Step 2: Correr la prueba para verla fallar**

Run: `npx vitest run src/lib/domain/cotizacion.test.ts`
Expected: FAIL — "Cannot find module './cotizacion'".

- [ ] **Step 3: Implementar el dominio**

```typescript
// src/lib/domain/cotizacion.ts
/** Lógica pura de cotizaciones (pedidos de cliente). Con prueba de escritorio. */

export interface LineaCotizacion {
  cantidad: number;
  precioUnitario: number;
}

/** Total = suma de cantidad × precio de cada línea. */
export function totalCotizacion(lineas: LineaCotizacion[]): number {
  return lineas.reduce((a, l) => a + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0);
}

/** Solo una cotización pendiente puede facturarse o anularse. */
export function puedeFacturar(estado: string): boolean {
  return estado === "pendiente";
}
export function puedeAnular(estado: string): boolean {
  return estado === "pendiente";
}
```

- [ ] **Step 4: Correr la prueba para verla pasar**

Run: `npx vitest run src/lib/domain/cotizacion.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/cotizacion.ts src/lib/domain/cotizacion.test.ts
git commit -m "feat(cotizaciones): dominio puro (total + guardias de estado) con pruebas"
```

---

## Task 3: Validación Zod (formularios)

**Files:**
- Create: `src/lib/validation/cotizacion.ts`
- Test: `src/lib/validation/cotizacion.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

```typescript
// src/lib/validation/cotizacion.test.ts
import { describe, it, expect } from "vitest";
import { parseCotizacionForm } from "./cotizacion";

function form(data: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.set(k, v);
  return f;
}

describe("parseCotizacionForm", () => {
  it("acepta cliente + fecha + líneas válidas", () => {
    const r = parseCotizacionForm(form({
      clienteId: "5",
      fecha: "2026-06-02",
      lineasJson: JSON.stringify([{ productoId: 1, cantidad: 2, precioUnitario: 1500 }]),
    }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.clienteId).toBe(5);
      expect(r.data.lineas).toHaveLength(1);
    }
  });
  it("rechaza si no hay líneas", () => {
    const r = parseCotizacionForm(form({ clienteId: "5", fecha: "2026-06-02", lineasJson: "[]" }));
    expect(r.success).toBe(false);
  });
  it("rechaza sin cliente", () => {
    const r = parseCotizacionForm(form({ clienteId: "0", fecha: "2026-06-02", lineasJson: JSON.stringify([{ productoId: 1, cantidad: 1, precioUnitario: 100 }]) }));
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Correr para ver fallar**

Run: `npx vitest run src/lib/validation/cotizacion.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar la validación**

```typescript
// src/lib/validation/cotizacion.ts
import { z } from "zod";

export const lineaCotizacionSchema = z.object({
  productoId: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().positive(),
  precioUnitario: z.coerce.number().min(0),
});

export const cotizacionSchema = z.object({
  clienteId: z.coerce.number().int().positive("Selecciona el cliente"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  observaciones: z.string().optional(),
  lineas: z.array(lineaCotizacionSchema).min(1, "Agrega al menos un producto"),
});

export type CotizacionInput = z.infer<typeof cotizacionSchema>;

function lineasDe(form: FormData): unknown {
  try {
    return JSON.parse(String(form.get("lineasJson") ?? "[]"));
  } catch {
    return [];
  }
}

export function parseCotizacionForm(form: FormData) {
  return cotizacionSchema.safeParse({
    clienteId: form.get("clienteId"),
    fecha: form.get("fecha"),
    observaciones: form.get("observaciones") || undefined,
    lineas: lineasDe(form),
  });
}

// Conversión a factura: líneas (posiblemente ajustadas) + bodega + tipo de venta.
export const facturarSchema = z.object({
  bodegaId: z.coerce.number().int().positive("Selecciona la bodega"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  tipoVenta: z.enum(["contado", "credito"]).default("contado"),
  lineas: z.array(lineaCotizacionSchema).min(1, "La cotización no tiene líneas"),
});

export function parseFacturarForm(form: FormData) {
  return facturarSchema.safeParse({
    bodegaId: form.get("bodegaId"),
    fecha: form.get("fecha"),
    tipoVenta: form.get("tipoVenta") || "contado",
    lineas: lineasDe(form),
  });
}
```

- [ ] **Step 4: Correr para ver pasar**

Run: `npx vitest run src/lib/validation/cotizacion.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/cotizacion.ts src/lib/validation/cotizacion.test.ts
git commit -m "feat(cotizaciones): validación zod de formularios con pruebas"
```

---

## Task 4: Servicio de cotizaciones

**Files:**
- Create: `src/lib/services/cotizaciones.ts`

Reusa `formatearNumero`, `crearFactura` y los tipos `Contexto`. NO toca inventario al crear. Al facturar, delega en `crearFactura` (que valida stock/cartera) y luego marca la cotización.

- [ ] **Step 1: Implementar el servicio**

```typescript
// src/lib/services/cotizaciones.ts
import "server-only";
import { and, eq, desc, count, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { cotizaciones, cotizacionDetalles, productos, terceros } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { formatearNumero } from "@/lib/domain/numeracion";
import { totalCotizacion, puedeFacturar, puedeAnular } from "@/lib/domain/cotizacion";
import { crearFactura } from "@/lib/services/facturas";
import type { Contexto } from "./bodegas";

export class CotizacionInvalida extends Error {}

export interface LineaNuevaCotizacion {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
}
export interface NuevaCotizacion {
  clienteId: number;
  fecha: string;
  observaciones?: string;
  lineas: LineaNuevaCotizacion[];
}

export async function listarCotizaciones(empresaId: number) {
  return db
    .select({ cotizacion: cotizaciones, cliente: terceros.razonSocial })
    .from(cotizaciones)
    .innerJoin(terceros, eq(cotizaciones.clienteId, terceros.id))
    .where(eq(cotizaciones.empresaId, empresaId))
    .orderBy(desc(cotizaciones.createdAt));
}

export async function obtenerCotizacion(empresaId: number, id: number) {
  const [c] = await db
    .select()
    .from(cotizaciones)
    .where(and(eq(cotizaciones.empresaId, empresaId), eq(cotizaciones.id, id)))
    .limit(1);
  if (!c) return null;
  const detalles = await db.select().from(cotizacionDetalles).where(eq(cotizacionDetalles.cotizacionId, id));
  return { ...c, detalles };
}

async function siguienteNumero(empresaId: number): Promise<string> {
  const [{ c }] = await db.select({ c: count() }).from(cotizaciones).where(eq(cotizaciones.empresaId, empresaId));
  return formatearNumero("COT", Number(c) + 1);
}

/** Crea una cotización (estado pendiente). NO toca inventario. */
export async function crearCotizacion(data: NuevaCotizacion, ctx: Contexto): Promise<number> {
  if (data.lineas.length === 0) throw new CotizacionInvalida("Agrega al menos un producto.");
  const numero = await siguienteNumero(ctx.empresaId);
  const total = totalCotizacion(data.lineas);

  return db.transaction(async (tx) => {
    const [cot] = await tx
      .insert(cotizaciones)
      .values({
        empresaId: ctx.empresaId,
        clienteId: data.clienteId,
        numero,
        fecha: data.fecha,
        estado: "pendiente",
        total: String(total),
        observaciones: data.observaciones ?? null,
        usuarioId: ctx.usuarioId,
      })
      .returning();

    for (const l of data.lineas) {
      await tx.insert(cotizacionDetalles).values({
        cotizacionId: cot.id,
        productoId: l.productoId,
        cantidad: String(l.cantidad),
        precioUnitario: String(l.precioUnitario),
        subtotal: String(l.cantidad * l.precioUnitario),
      });
    }

    await registrarAuditoria(
      { empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx39", modelId: cot.id, accion: "CREAR", registroNuevo: cot, ipOrigen: ctx.ip },
      tx,
    );
    return cot.id;
  });
}

/** Anula una cotización pendiente (no afecta nada más). */
export async function anularCotizacion(empresaId: number, id: number, motivo: string, ctx: Contexto): Promise<void> {
  const [c] = await db.select().from(cotizaciones).where(and(eq(cotizaciones.empresaId, empresaId), eq(cotizaciones.id, id))).limit(1);
  if (!c) throw new CotizacionInvalida("Cotización no encontrada.");
  if (!puedeAnular(c.estado)) throw new CotizacionInvalida("Solo se puede anular una cotización pendiente.");
  await db.transaction(async (tx) => {
    await tx.update(cotizaciones).set({ estado: "anulada", motivoAnulacion: motivo, updatedAt: new Date() }).where(eq(cotizaciones.id, id));
    await registrarAuditoria(
      { empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx39", modelId: id, accion: "ACTUALIZAR", registroAnterior: c, registroNuevo: { ...c, estado: "anulada", motivoAnulacion: motivo }, ipOrigen: ctx.ip },
      tx,
    );
  });
}

export interface DatosFacturarCotizacion {
  bodegaId: number;
  fecha: string;
  tipoVenta: "contado" | "credito";
  lineas: LineaNuevaCotizacion[]; // posiblemente ajustadas en el formulario
  metodoPago?: string;
  cuentaDestinoId?: number;
}

/**
 * Convierte una cotización pendiente en factura. Reusa `crearFactura` (valida
 * stock, descuenta inventario, crea cartera si es crédito) y luego marca la
 * cotización como `facturada` con el `facturaId`. Las cantidades van en unidad
 * base (unidadId = unidad base del producto).
 */
export async function facturarCotizacion(empresaId: number, id: number, datos: DatosFacturarCotizacion, ctx: Contexto): Promise<number> {
  const [c] = await db.select().from(cotizaciones).where(and(eq(cotizaciones.empresaId, empresaId), eq(cotizaciones.id, id))).limit(1);
  if (!c) throw new CotizacionInvalida("Cotización no encontrada.");
  if (!puedeFacturar(c.estado)) throw new CotizacionInvalida("Esta cotización ya fue facturada o anulada.");

  // Unidad base de cada producto (la cotización maneja cantidades en base).
  const ids = [...new Set(datos.lineas.map((l) => l.productoId))];
  const prods = await db.select({ id: productos.id, unidadBaseId: productos.unidadBaseId }).from(productos).where(inArray(productos.id, ids));
  const baseDe = new Map(prods.map((p) => [p.id, p.unidadBaseId]));

  const factura = await crearFactura(
    {
      clienteId: c.clienteId,
      bodegaId: datos.bodegaId,
      fecha: datos.fecha,
      tipoVenta: datos.tipoVenta,
      lineas: datos.lineas.map((l) => ({
        productoId: l.productoId,
        unidadId: baseDe.get(l.productoId)!,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
      })),
      metodoPago: datos.metodoPago,
      cuentaDestinoId: datos.cuentaDestinoId,
    },
    ctx,
  );

  await db.update(cotizaciones).set({ estado: "facturada", facturaId: factura.id, updatedAt: new Date() }).where(eq(cotizaciones.id, id));
  await registrarAuditoria({ empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx39", modelId: id, accion: "ACTUALIZAR", registroAnterior: c, registroNuevo: { ...c, estado: "facturada", facturaId: factura.id }, ipOrigen: ctx.ip });
  return factura.id;
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores. (Si `crearFactura` no está exportada con esa firma, revisar Task de patrones — sí lo está: `export async function crearFactura(data: NuevaFactura, ctx: Contexto): Promise<Factura>`.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/cotizaciones.ts
git commit -m "feat(cotizaciones): servicio (listar/obtener/crear/anular/facturar) reusando crearFactura"
```

---

## Task 5: Permisos (módulo cotizaciones)

**Files:**
- Modify: `src/lib/auth/roles.ts`

- [ ] **Step 1: Agregar el módulo a `MODULOS`**

En el array `MODULOS`, agrega `"cotizaciones",` justo después de `"facturas",`:

```typescript
  "facturas",
  "cotizaciones",
  "devoluciones",
```

- [ ] **Step 2: Etiqueta legible en `MODULO_LABEL`**

Agrega la entrada (junto a las demás de Ventas):

```typescript
  facturas: "Ventas / Facturas", cotizaciones: "Cotizaciones", devoluciones: "Devoluciones", notas_credito: "Notas crédito",
```

- [ ] **Step 3: Dar permisos a los roles**

- En `Admin`, junto a `...p("facturas", CRUD),` agrega:
```typescript
    ...p("cotizaciones", CRUD),
```
- En `Operador`, junto a `...p("facturas", VER_CREAR_EDITAR),` agrega:
```typescript
    ...p("cotizaciones", VER_CREAR_EDITAR),
```
- En `Vendedor`, junto a `...p("facturas", VER_CREAR_EDITAR),` agrega:
```typescript
    ...p("cotizaciones", VER_CREAR_EDITAR),
```
(Contador hereda `cotizaciones.ver` automáticamente vía `SOLO_LECTURA = MODULOS.flatMap(VER)`. SuperAdmin con `"*"` ya lo tiene.)

- [ ] **Step 4: Verificar typecheck + tests existentes**

Run: `npx tsc --noEmit && npx vitest run`
Expected: TSC sin errores; todos los tests pasan (los de roles, si existen, siguen verdes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/roles.ts
git commit -m "feat(cotizaciones): permisos del módulo (Admin/Operador/Vendedor/Contador)"
```

---

## Task 6: Ítem en el menú (Ventas → Cotizaciones)

**Files:**
- Modify: `src/lib/modules.ts`

- [ ] **Step 1: Importar el icono**

En el import de `lucide-react` al inicio del archivo, agrega `FileText` si no está:

```typescript
import { /* …iconos existentes…, */ FileText } from "lucide-react";
```

- [ ] **Step 2: Agregar el ítem al grupo "Ventas"**

Dentro del grupo `titulo: "Ventas"`, en `items`, agrega después de Facturas:

```typescript
    { modulo: "cotizaciones", label: "Cotizaciones", href: "/cotizaciones", icon: FileText, listo: true, desc: "Pedidos de clientes / cotizaciones." },
```

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores (el `modulo: "cotizaciones"` debe coincidir con el tipo `Modulo` de roles.ts; por eso Task 5 va antes).

- [ ] **Step 4: Commit**

```bash
git add src/lib/modules.ts
git commit -m "feat(cotizaciones): ítem en el menú de Ventas"
```

---

## Task 7: Página de lista

**Files:**
- Create: `src/app/(app)/cotizaciones/page.tsx`

- [ ] **Step 1: Implementar la lista**

```tsx
// src/app/(app)/cotizaciones/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { listarCotizaciones } from "@/lib/services/cotizaciones";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";

export const metadata: Metadata = { title: "Cotizaciones — Vertex" };
const PAGE_SIZE = 10;
type Fila = Awaited<ReturnType<typeof listarCotizaciones>>[number];
const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");
const VARIANTE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendiente: "secondary",
  facturada: "default",
  anulada: "destructive",
};

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermiso("cotizaciones.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { q = "", page: pageRaw } = await searchParams;
  const todos = await listarCotizaciones(empresaId);
  const puedeCrear = puede(permisos, "cotizaciones.crear");

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (f) => `${f.cotizacion.numero} ${f.cliente} ${f.cotizacion.estado}`,
  });

  const columnas: Columna<Fila>[] = [
    { header: "Número", primary: true, cell: (f) => <span className="tabular font-medium">{f.cotizacion.numero}</span> },
    { header: "Cliente", cell: (f) => f.cliente },
    { header: "Fecha", cell: (f) => <span className="tabular">{f.cotizacion.fecha}</span> },
    { header: "Estado", cell: (f) => <Badge variant={VARIANTE[f.cotizacion.estado] ?? "outline"} className="font-normal capitalize">{f.cotizacion.estado}</Badge> },
    { header: "Total", className: "text-right", cell: (f) => <span className="tabular">{money(f.cotizacion.total)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Cotizaciones" description="Pedidos de clientes: arma una cotización y conviértela en factura.">
        {puedeCrear && (
          <Link href="/cotizaciones/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nueva cotización
          </Link>
        )}
      </PageHeader>

      <ListaFiltrable
        base="/cotizaciones"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(f) => f.cotizacion.id}
        rowHref={(f) => `/cotizaciones/${f.cotizacion.id}`}
        columns={columnas}
        searchPlaceholder="Buscar por número, cliente o estado…"
        hayDatos={todos.length > 0}
        vacio={{ icon: FileText, titulo: "Aún no hay cotizaciones", texto: "Crea una cotización con lo que pidió un cliente." }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/cotizaciones/page.tsx"
git commit -m "feat(cotizaciones): página de lista"
```

---

## Task 8: Formulario "nueva" + server actions (con precio sugerido por cliente)

**Files:**
- Create: `src/app/(app)/cotizaciones/actions.ts`
- Create: `src/app/(app)/cotizaciones/cotizacion-form.tsx`
- Create: `src/app/(app)/cotizaciones/nueva/page.tsx`

- [ ] **Step 1: Server actions**

`preciosClienteAction` reusa `ultimoPrecioPorCliente` (ya existe en facturas.ts) para sugerir precios al elegir cliente.

```typescript
// src/app/(app)/cotizaciones/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseCotizacionForm, parseFacturarForm } from "@/lib/validation/cotizacion";
import { crearCotizacion, anularCotizacion, facturarCotizacion, CotizacionInvalida } from "@/lib/services/cotizaciones";
import { ultimoPrecioPorCliente } from "@/lib/services/facturas";

export interface CotizacionState {
  error?: string;
}

export async function crearCotizacionAction(_prev: CotizacionState, form: FormData): Promise<CotizacionState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "cotizaciones.crear")) return { error: "No tienes permiso para crear cotizaciones." };

  const parsed = parseCotizacionForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  let nuevoId: number;
  try {
    nuevoId = await crearCotizacion(
      { clienteId: parsed.data.clienteId, fecha: parsed.data.fecha, observaciones: parsed.data.observaciones, lineas: parsed.data.lineas },
      c.ctx,
    );
  } catch (e) {
    if (e instanceof CotizacionInvalida) return { error: e.message };
    console.error("[cotizaciones] error al crear:", e);
    return { error: "Ocurrió un error al crear la cotización." };
  }
  revalidatePath("/cotizaciones");
  redirect(`/cotizaciones/${nuevoId}`);
}

/** Precios sugeridos: último precio vendido a ESE cliente por producto. */
export async function preciosClienteAction(clienteId: number): Promise<Record<number, number>> {
  const c = await contexto();
  if (!c || !clienteId) return {};
  return ultimoPrecioPorCliente(c.ctx.empresaId, clienteId);
}

export interface AnularCotState {
  ok?: boolean;
  error?: string;
}
export async function anularCotizacionAction(id: number, _prev: AnularCotState, form: FormData): Promise<AnularCotState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "cotizaciones.editar")) return { error: "No tienes permiso." };
  const motivo = String(form.get("motivo") || "").trim();
  if (!motivo) return { error: "Indica el motivo." };
  try {
    await anularCotizacion(c.ctx.empresaId, id, motivo, c.ctx);
  } catch (e) {
    if (e instanceof CotizacionInvalida) return { error: e.message };
    console.error("[cotizaciones] error al anular:", e);
    return { error: "No se pudo anular." };
  }
  revalidatePath(`/cotizaciones/${id}`);
  return { ok: true };
}

export interface FacturarState {
  error?: string;
}
export async function facturarCotizacionAction(id: number, _prev: FacturarState, form: FormData): Promise<FacturarState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "facturas.crear")) return { error: "No tienes permiso para facturar." };

  const parsed = parseFacturarForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  let metodoPago: string | undefined;
  let cuentaDestinoId: number | undefined;
  if (parsed.data.tipoVenta === "contado") {
    metodoPago = String(form.get("metodoPago") || "efectivo");
    cuentaDestinoId = Number(form.get("cuentaDestinoId")) || undefined;
    if (!cuentaDestinoId) return { error: "Elige a dónde entró el dinero." };
  }

  let facturaId: number;
  try {
    facturaId = await facturarCotizacion(
      c.ctx.empresaId,
      id,
      { bodegaId: parsed.data.bodegaId, fecha: parsed.data.fecha, tipoVenta: parsed.data.tipoVenta, lineas: parsed.data.lineas, metodoPago, cuentaDestinoId },
      c.ctx,
    );
  } catch (e) {
    if (e instanceof CotizacionInvalida) return { error: e.message };
    // VentaInvalida (stock insuficiente) viene del crearFactura; mostrar su mensaje.
    if (e instanceof Error && e.name === "VentaInvalida") return { error: e.message };
    console.error("[cotizaciones] error al facturar:", e);
    return { error: "No se pudo facturar la cotización." };
  }
  revalidatePath("/cotizaciones");
  revalidatePath("/inventario");
  redirect(`/facturas/${facturaId}`);
}
```

- [ ] **Step 2: Formulario de nueva cotización**

Cliente + líneas; al elegir cliente, trae precios sugeridos y precarga el precio de cada producto seleccionado, mostrando el recordatorio.

```tsx
// src/app/(app)/cotizaciones/cotizacion-form.tsx
"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { crearCotizacionAction, preciosClienteAction, type CotizacionState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { DatePicker } from "@/components/ui/date-picker";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";

interface Opt { id: number; nombre: string }
interface Prod { id: number; nombre: string; sku: string; precio: number }
interface Linea { productoId: string; cantidad: string; precioUnitario: string }

const money = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null} Guardar cotización
    </Button>
  );
}

export function CotizacionForm({ clientes, productos, hoy }: { clientes: Opt[]; productos: Prod[]; hoy: string }) {
  const [state, action] = useActionState<CotizacionState, FormData>(crearCotizacionAction, {});
  const [clienteId, setClienteId] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ productoId: "", cantidad: "", precioUnitario: "" }]);
  // Último precio vendido a ESTE cliente por producto (recordatorio + sugerencia).
  const [preciosCliente, setPreciosCliente] = useState<Record<number, number>>({});
  const [, startPrecios] = useTransition();

  const prodPorId = useMemo(() => new Map(productos.map((p) => [String(p.id), p])), [productos]);

  function elegirCliente(v: string) {
    setClienteId(v);
    startPrecios(async () => setPreciosCliente(await preciosClienteAction(Number(v))));
  }

  /** Precio sugerido: último a ese cliente; si no, precio de catálogo del producto. */
  function precioSugerido(productoId: string): number {
    const pid = Number(productoId);
    return preciosCliente[pid] ?? prodPorId.get(productoId)?.precio ?? 0;
  }

  function elegirProducto(i: number, productoId: string) {
    setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, productoId, precioUnitario: String(precioSugerido(productoId)) } : l)));
  }

  const set = (i: number, patch: Partial<Linea>) => setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const total = useMemo(() => lineas.reduce((a, l) => a + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0), [lineas]);

  const lineasJson = JSON.stringify(
    lineas
      .filter((l) => l.productoId && Number(l.cantidad) > 0)
      .map((l) => ({ productoId: Number(l.productoId), cantidad: Number(l.cantidad), precioUnitario: Number(l.precioUnitario) || 0 })),
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="lineasJson" value={lineasJson} />
      <input type="hidden" name="clienteId" value={clienteId} />

      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <FormSection title="Datos de la cotización" description="Cliente y fecha.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Cliente" required>
            <SearchSelect value={clienteId} onValueChange={elegirCliente} placeholder="Elegir cliente…" options={clientes.map((c) => ({ value: String(c.id), label: c.nombre }))} />
          </Field>
          <Field label="Fecha">
            <DatePicker name="fecha" defaultValue={hoy} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Productos" description="Lo que pidió el cliente. El precio se sugiere de la última venta a este cliente." bodyClassName="space-y-3">
        {lineas.map((l, i) => {
          const pid = Number(l.productoId);
          const ultimo = preciosCliente[pid];
          const sub = (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0);
          return (
            <div key={i} className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Producto</Label>
                <SearchSelect value={l.productoId} onValueChange={(v) => elegirProducto(i, v)} placeholder="Producto…" searchPlaceholder="Nombre o SKU…" options={productos.map((p) => ({ value: String(p.id), label: p.nombre, hint: `(${p.sku})` }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cantidad</Label>
                <Input type="number" min="0" step="0.0001" value={l.cantidad} onChange={(e) => set(i, { cantidad: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Precio c/u</Label>
                <Input type="number" min="0" step="0.01" value={l.precioUnitario} onChange={(e) => set(i, { precioUnitario: e.target.value })} />
                {l.productoId && ultimo != null && (
                  <p className="text-[11px] text-muted-foreground">Última venta a este cliente: {money(ultimo)}</p>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                <span className="tabular text-sm font-medium">{money(sub)}</span>
                <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setLineas((ls) => ls.filter((_, idx) => idx !== i))} disabled={lineas.length === 1}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" onClick={() => setLineas((ls) => [...ls, { productoId: "", cantidad: "", precioUnitario: "" }])}>
          <Plus className="size-4" /> Agregar producto
        </Button>
      </FormSection>

      <Field label="Observaciones">
        <Textarea name="observaciones" rows={2} placeholder="Opcional" />
      </Field>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <Guardar />
          <Link href="/cotizaciones" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-4 sm:max-w-xs">
          <div className="flex justify-between font-semibold"><span>Total</span><span className="tabular">{money(total)}</span></div>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Página nueva**

```tsx
// src/app/(app)/cotizaciones/nueva/page.tsx
import type { Metadata } from "next";
import { hoyColombia } from "@/lib/fecha";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarTerceros } from "@/lib/services/terceros";
import { listarProductosVenta } from "@/lib/services/productos";
import { PageHeader } from "@/components/page-header";
import { CotizacionForm } from "../cotizacion-form";

export const metadata: Metadata = { title: "Nueva cotización — Vertex" };

export default async function NuevaCotizacionPage() {
  await requirePermiso("cotizaciones.crear");
  const { empresaId } = await requireEmpresa();
  const [terceros, productos] = await Promise.all([
    listarTerceros(empresaId),
    listarProductosVenta(empresaId),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nueva cotización" description="Arma lo que pidió el cliente; la facturas cuando la apruebe." />
      <CotizacionForm
        hoy={hoyColombia()}
        clientes={terceros.filter((t) => t.activo && (t.tipo === "cliente" || t.tipo === "ambos")).map((t) => ({ id: t.id, nombre: t.razonSocial }))}
        productos={productos.map((p) => ({ id: p.id, nombre: p.nombre, sku: p.sku, precio: p.precio }))}
      />
    </div>
  );
}
```

(`listarProductosVenta` ya devuelve `{ id, nombre, sku, precio }` — es la fuente del precio de catálogo.)

- [ ] **Step 4: Verificar typecheck + build**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/cotizaciones/actions.ts" "src/app/(app)/cotizaciones/cotizacion-form.tsx" "src/app/(app)/cotizaciones/nueva/page.tsx"
git commit -m "feat(cotizaciones): formulario nueva + actions con precio sugerido por cliente"
```

---

## Task 9: Detalle + botón Anular

**Files:**
- Create: `src/app/(app)/cotizaciones/[id]/page.tsx`
- Create: `src/app/(app)/cotizaciones/anular-cotizacion-button.tsx`

- [ ] **Step 1: Botón Anular**

```tsx
// src/app/(app)/cotizaciones/anular-cotizacion-button.tsx
"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { anularCotizacionAction, type AnularCotState } from "./actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { AlertCircle, Loader2, Ban } from "lucide-react";

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null} Anular cotización
    </Button>
  );
}

export function AnularCotizacionButton({ cotizacionId }: { cotizacionId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action = anularCotizacionAction.bind(null, cotizacionId);
  const [state, formAction] = useActionState<AnularCotState, FormData>(action, {});
  useEffect(() => { if (state.ok) { setOpen(false); router.refresh(); } }, [state.ok, router]);
  return (
    <>
      <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        <Ban className="size-4" /> Anular
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="Anular cotización" description="La cotización queda anulada. No se puede deshacer.">
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {state.error}
            </div>
          )}
          <Field label="Motivo" required>
            <Textarea name="motivo" rows={2} required placeholder="Ej. el cliente ya no la quiere" autoFocus />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Confirmar />
          </div>
        </form>
      </Modal>
    </>
  );
}
```

- [ ] **Step 2: Página de detalle (comprobante)**

```tsx
// src/app/(app)/cotizaciones/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { obtenerCotizacion } from "@/lib/services/cotizaciones";
import { obtenerTercero } from "@/lib/services/terceros";
import { listarProductos } from "@/lib/services/productos";
import { nombreUsuario } from "@/lib/services/usuarios";
import { CreadoPor } from "@/components/creado-por";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { AnularCotizacionButton } from "../anular-cotizacion-button";
import { ArrowUpRight, FileText } from "lucide-react";

export const metadata: Metadata = { title: "Cotización — Vertex" };
const money = (s: string | number) => "$" + Number(s).toLocaleString("es-CO");
const num = (s: string | number) => Number(s).toLocaleString("es-CO", { maximumFractionDigits: 4 });

export default async function CotizacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("cotizaciones.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { id } = await params;
  const cot = await obtenerCotizacion(empresaId, parseId(id));
  if (!cot) notFound();

  const [cli, productos, creadoPor] = await Promise.all([
    obtenerTercero(empresaId, cot.clienteId),
    listarProductos(empresaId),
    nombreUsuario(cot.usuarioId),
  ]);
  const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));
  const puedeFacturarUI = puede(permisos, "facturas.crear") && cot.estado === "pendiente";
  const puedeAnularUI = puede(permisos, "cotizaciones.editar") && cot.estado === "pendiente";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Cotización ${cot.numero}`} description={cli?.razonSocial ?? ""}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={cot.estado === "facturada" ? "default" : cot.estado === "anulada" ? "destructive" : "secondary"} className="font-normal capitalize">{cot.estado}</Badge>
          {puedeFacturarUI && (
            <Link href={`/cotizaciones/${cot.id}/facturar`} className={buttonVariants({ size: "sm" })}>Facturar</Link>
          )}
          {puedeAnularUI && <AnularCotizacionButton cotizacionId={cot.id} />}
        </div>
      </PageHeader>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
          <div><div className="text-xs text-muted-foreground">Cliente</div><div className="font-medium">{cli?.razonSocial ?? "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Fecha</div><div className="font-medium tabular">{cot.fecha}</div></div>
          <div><div className="text-xs text-muted-foreground">Total</div><div className="font-semibold tabular">{money(cot.total)}</div></div>
          <div>
            <div className="text-xs text-muted-foreground">Factura</div>
            {cot.facturaId ? (
              <Link href={`/facturas/${cot.facturaId}`} className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">ver <ArrowUpRight className="size-3" /></Link>
            ) : (
              <div className="text-muted-foreground">—</div>
            )}
          </div>
        </CardContent>
      </Card>

      {cot.estado === "anulada" && cot.motivoAnulacion && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span className="font-semibold">Motivo de anulación:</span> {cot.motivoAnulacion}
        </div>
      )}

      <div className="space-y-2">
        {cot.detalles.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="font-medium">{prodPorId.get(d.productoId) ?? `#${d.productoId}`}</div>
              <div className="tabular text-muted-foreground">{num(d.cantidad)} × {money(d.precioUnitario)}</div>
            </div>
            <div className="tabular font-medium">{money(d.subtotal)}</div>
          </div>
        ))}
        {cot.detalles.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            <FileText className="size-4" /> Esta cotización no tiene líneas.
          </div>
        )}
      </div>

      <CreadoPor nombre={creadoPor} fecha={cot.createdAt} />
    </div>
  );
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/cotizaciones/[id]/page.tsx" "src/app/(app)/cotizaciones/anular-cotizacion-button.tsx"
git commit -m "feat(cotizaciones): detalle (comprobante) + botón anular + enlace a factura"
```

---

## Task 10: Conversión a factura (página + formulario con ajustes)

**Files:**
- Create: `src/app/(app)/cotizaciones/[id]/facturar/page.tsx`
- Create: `src/app/(app)/cotizaciones/facturar-cotizacion-form.tsx`

- [ ] **Step 1: Formulario de facturación (líneas editables + bodega + contado/crédito)**

```tsx
// src/app/(app)/cotizaciones/facturar-cotizacion-form.tsx
"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { facturarCotizacionAction, type FacturarState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { DatePicker } from "@/components/ui/date-picker";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";

interface Opt { id: number; nombre: string }
interface Cuenta { id: number; nombre: string }
interface LineaInicial { productoId: number; nombre: string; cantidad: number; precioUnitario: number }
interface Linea { productoId: number; nombre: string; cantidad: string; precioUnitario: string }

const money = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 2 });
const METODOS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
];

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null} Crear factura
    </Button>
  );
}

export function FacturarCotizacionForm({
  cotizacionId,
  numero,
  bodegas,
  cuentas,
  lineasIniciales,
  hoy,
}: {
  cotizacionId: number;
  numero: string;
  bodegas: Opt[];
  cuentas: Cuenta[];
  lineasIniciales: LineaInicial[];
  hoy: string;
}) {
  const action = facturarCotizacionAction.bind(null, cotizacionId);
  const [state, formAction] = useActionState<FacturarState, FormData>(action, {});
  const [tipoVenta, setTipoVenta] = useState("contado");
  const [lineas, setLineas] = useState<Linea[]>(
    lineasIniciales.map((l) => ({ productoId: l.productoId, nombre: l.nombre, cantidad: String(l.cantidad), precioUnitario: String(l.precioUnitario) })),
  );

  const set = (i: number, patch: Partial<Linea>) => setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const total = useMemo(() => lineas.reduce((a, l) => a + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0), [lineas]);
  const lineasJson = JSON.stringify(
    lineas.filter((l) => Number(l.cantidad) > 0).map((l) => ({ productoId: l.productoId, cantidad: Number(l.cantidad), precioUnitario: Number(l.precioUnitario) || 0 })),
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="lineasJson" value={lineasJson} />
      <input type="hidden" name="tipoVenta" value={tipoVenta} />

      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <FormSection title={`Facturar ${numero}`} description="Ajusta cantidades/precios si hace falta, elige bodega y forma de pago.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Bodega (de dónde sale el stock)" required>
            <SearchSelect name="bodegaId" placeholder="Selecciona…" options={bodegas.map((b) => ({ value: String(b.id), label: b.nombre }))} />
          </Field>
          <Field label="Fecha">
            <DatePicker name="fecha" defaultValue={hoy} />
          </Field>
          <Field label="Tipo de venta">
            <SearchSelect value={tipoVenta} onValueChange={setTipoVenta} options={[{ value: "contado", label: "Contado" }, { value: "credito", label: "Crédito" }]} />
          </Field>
          {tipoVenta === "contado" && (
            <>
              <Field label="Método de pago">
                <SearchSelect name="metodoPago" defaultValue="efectivo" options={METODOS} />
              </Field>
              <Field label="Entra a la cuenta" required>
                <SearchSelect name="cuentaDestinoId" placeholder="Elige la cuenta" options={cuentas.map((c) => ({ value: String(c.id), label: c.nombre }))} />
              </Field>
            </>
          )}
        </div>
      </FormSection>

      <FormSection title="Productos" bodyClassName="space-y-3">
        {lineas.map((l, i) => {
          const sub = (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0);
          return (
            <div key={i} className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
              <div className="text-sm font-medium">{l.nombre}</div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cantidad</Label>
                <Input type="number" min="0" step="0.0001" value={l.cantidad} onChange={(e) => set(i, { cantidad: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Precio c/u</Label>
                <Input type="number" min="0" step="0.01" value={l.precioUnitario} onChange={(e) => set(i, { precioUnitario: e.target.value })} />
              </div>
              <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                <span className="tabular text-sm font-medium">{money(sub)}</span>
                <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setLineas((ls) => ls.filter((_, idx) => idx !== i))} disabled={lineas.length === 1}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </FormSection>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <Confirmar />
          <Link href={`/cotizaciones/${cotizacionId}`} className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-4 sm:max-w-xs">
          <div className="flex justify-between font-semibold"><span>Total</span><span className="tabular">{money(total)}</span></div>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Página facturar**

```tsx
// src/app/(app)/cotizaciones/[id]/facturar/page.tsx
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { hoyColombia } from "@/lib/fecha";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerCotizacion } from "@/lib/services/cotizaciones";
import { listarBodegas } from "@/lib/services/bodegas";
import { cuentasPropiasActivas } from "@/lib/services/tesoreria";
import { listarProductos } from "@/lib/services/productos";
import { PageHeader } from "@/components/page-header";
import { FacturarCotizacionForm } from "../../facturar-cotizacion-form";

export const metadata: Metadata = { title: "Facturar cotización — Vertex" };

export default async function FacturarCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("facturas.crear");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const cot = await obtenerCotizacion(empresaId, parseId(id));
  if (!cot) notFound();
  if (cot.estado !== "pendiente") redirect(`/cotizaciones/${cot.id}`);

  const [bodegas, cuentas, productos] = await Promise.all([
    listarBodegas(empresaId),
    cuentasPropiasActivas(empresaId),
    listarProductos(empresaId),
  ]);
  const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Facturar ${cot.numero}`} description="Revisa y ajusta antes de crear la factura." />
      <FacturarCotizacionForm
        cotizacionId={cot.id}
        numero={cot.numero}
        hoy={hoyColombia()}
        bodegas={bodegas.filter((b) => b.activo).map((b) => ({ id: b.id, nombre: b.nombre }))}
        cuentas={cuentas.map((c) => ({ id: c.id, nombre: c.nombre }))}
        lineasIniciales={cot.detalles.map((d) => ({ productoId: d.productoId, nombre: prodPorId.get(d.productoId) ?? `#${d.productoId}`, cantidad: Number(d.cantidad), precioUnitario: Number(d.precioUnitario) }))}
      />
    </div>
  );
}
```

(`cuentasPropiasActivas` y `listarBodegas` ya existen — confirmadas en el detalle de factura y en otras páginas.)

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/cotizaciones/[id]/facturar/page.tsx" "src/app/(app)/cotizaciones/facturar-cotizacion-form.tsx"
git commit -m "feat(cotizaciones): facturar con ajustes (reusa crearFactura)"
```

---

## Task 11: Verificación integral

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Typecheck + suite de pruebas**

Run: `npx tsc --noEmit && npx vitest run`
Expected: TSC limpio; todas las pruebas pasan (las nuevas de cotizacion + las existentes).

- [ ] **Step 2: Build de producción**

Run: `npm run build`
Expected: `Compiled successfully`.

- [ ] **Step 3: Verificación funcional (Playwright, server local)**

Arranca `pnpm exec next start -p 3000`, login admin@demo.co / Vertex2026!, y verifica el ciclo: crear una cotización (cliente + 1 producto), ver que aparece en `/cotizaciones` con estado **pendiente**, abrir el detalle, **Facturar** (elige bodega + contado + cuenta) → redirige a la factura creada; volver a la cotización y confirmar estado **facturada** con enlace a la factura. Comprobar que el inventario del producto bajó.

```bash
# Patrón de verificación (ajusta selectores):
NODE_PATH=/Users/jhonatan/.npm/_npx/705bc6b22212b352/node_modules node verificar.cjs
```
Expected: la cotización pasa de pendiente → facturada; la factura existe; el stock bajó una sola vez.

- [ ] **Step 4: Commit final (si hubo ajustes de verificación)**

```bash
git add -A && git commit -m "test(cotizaciones): verificación del ciclo crear→facturar" || true
git push origin main
```

---

## Self-Review (hecha al escribir el plan)

1. **Cobertura del spec:** datos (Task 1), estados/guardia (Task 2), validación (Task 3), servicio crear/anular/facturar + precio por cliente reusando `ultimoPrecioPorCliente` (Task 4/8), permisos (Task 5), menú (Task 6), pantallas lista/nueva/detalle/facturar (Task 7-10), pruebas puras (Task 2/3) + verificación de ciclo (Task 11). Bot: fuera de alcance (no hay tareas de bot). ✔️
2. **Sin placeholders:** todo el código está completo; comandos con salida esperada. ✔️
3. **Consistencia de tipos:** `NuevaCotizacion`/`LineaNuevaCotizacion`/`DatosFacturarCotizacion` usadas igual en servicio y actions; estados `pendiente|facturada|anulada` consistentes; `facturarCotizacion` mapea a `LineaVenta` con `unidadId` = unidad base. ✔️

**Notas de implementación:**
- `crearFactura` corre en su propia transacción; el `update` de la cotización a `facturada` va inmediatamente después (no en la misma transacción). Aceptable: si el update fallara, la factura ya existe y la cotización quedaría pendiente — se puede reintentar/anular manualmente. Si se quiere atomicidad estricta, una iteración futura podría exponer una variante de `crearFactura` que acepte `tx`.
- Reusa `ultimoPrecioPorCliente` (ya existe) en vez de crear `ultimoPrecioCliente`: cubre el requisito del spec sin duplicar.

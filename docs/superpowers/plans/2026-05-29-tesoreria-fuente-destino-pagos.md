# Tesorería: fuente y destino del dinero — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar de qué cuenta propia sale cada pago y a qué beneficiario/cuenta llega (incluso con NIT distinto al proveedor), con un libro de movimientos que da saldo en vivo y extracto por cuenta; conectar pagos (salida por el neto) y recaudos (entrada).

**Architecture:** Tres tablas nuevas en numeración pura `vxNN` registradas en `vx00`: `vx33` cuentas propias, `vx34` cuentas de beneficiario por proveedor, `vx35` libro de movimientos (única fuente del saldo). El saldo se deriva del libro (`saldo_inicial + Σ entradas − Σ salidas`), nunca se cachea. La lógica de cálculo vive en funciones puras testeadas (`src/lib/domain/tesoreria.ts`); los servicios la orquestan transaccionalmente.

**Tech Stack:** Next.js 15 App Router (Server Actions, RSC), Drizzle ORM + postgres-js (Supabase), Vitest (TDD de dominio), Tailwind v4 + shadcn/base-ui, Zod.

---

## Convenciones del repo (leer antes de empezar)

- **Toda tabla física usa nombre puro `vxNN`** (ej. `pgTable("vx33", …)`); la descripción va SOLO en `vx00` (catálogo `src/lib/db/nomenclatura.ts`). La siguiente numeración libre es **vx33**.
- Helper de columna monetaria en `schema.ts`: `const money = (name) => numeric(name, { precision: 15, scale: 2 })`. Devuelve string en queries → convertir con `Number(...)`, escribir con `String(...)`.
- `Contexto` (de `src/lib/services/bodegas.ts`): `{ empresaId, usuarioId, ip?: string|null }`.
- Auditoría: `registrarAuditoria({ empresaId, usuarioId, tablaAfectada:"vxNN", modelId, accion, registroNuevo, ipOrigen }, tx?)` — pasar `tx` cuando se llama dentro de `db.transaction`.
- Permisos: `MODULOS` en `src/lib/auth/roles.ts`; helpers `puede(rol, "modulo.accion")`. Guard de páginas: `requirePermiso("modulo.ver")`, `requireEmpresa()`.
- Migraciones: editar `schema.ts`, luego `npm run db:generate` (escribe en `supabase/migrations/`) y aplicar con `npm run db:push` (usa `DATABASE_URL_SESSION`, pooler 5432).
- Tests de dominio: `npx vitest run src/lib/domain/<archivo>`.
- Money en UI: `const money = (s) => "$" + Number(s).toLocaleString("es-CO")`.

---

## Estructura de archivos

**Crear:**
- `src/lib/domain/tesoreria.ts` — funciones puras (saldo, saldo corrido, movimiento desde pago, resolver beneficiario).
- `src/lib/domain/tesoreria.test.ts` — pruebas de escritorio.
- `src/lib/validation/cuenta-propia.ts`, `src/lib/validation/beneficiario.ts`, `src/lib/validation/movimiento-tesoreria.ts` — esquemas Zod.
- `src/lib/services/tesoreria.ts` — CRUD cuentas propias, movimientos, saldos, extracto.
- `src/lib/services/beneficiarios.ts` — CRUD cuentas de beneficiario por proveedor.
- `src/app/(app)/tesoreria/{page.tsx,loading.tsx,actions.ts,cuenta-form.tsx,cuenta-row-actions.tsx,movimiento-button.tsx}`
- `src/app/(app)/tesoreria/[id]/page.tsx` — extracto de una cuenta.
- `src/app/(app)/tesoreria/nueva/page.tsx`, `src/app/(app)/tesoreria/[id]/editar/page.tsx`

**Modificar:**
- `src/lib/db/schema.ts` — añadir vx33/vx34/vx35 + enums; columnas en vx27 y vx29.
- `src/lib/db/nomenclatura.ts` — entradas vx33/vx34/vx35.
- `src/lib/auth/roles.ts` — módulo `tesoreria`.
- `src/lib/modules.ts` — ítem de navegación.
- `src/lib/services/cartera.ts` — wiring de pagos y recaudos a movimientos.
- `src/app/(app)/cuentas-pagar/page.tsx` + `src/components/pago-proveedor-button.tsx` — origen + beneficiario.
- `src/app/(app)/cuentas-cobrar/` (botón de recaudo) — cuenta destino.
- Ficha de tercero (`src/app/(app)/terceros/[id]/editar`) — sección "Cuentas de pago".

---

## Task 1: Schema — enums y tablas vx33/vx34/vx35 + columnas en vx27/vx29

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Añadir enums** cerca de los enums existentes (tras `tipoPersonaEnum`, ~línea 44)

```typescript
export const cuentaTipoEnum = pgEnum("vx_cuenta_tipo", ["ahorros", "corriente", "caja"]);
export const movTipoEnum = pgEnum("vx_mov_tipo", ["entrada", "salida"]);
export const movOrigenEnum = pgEnum("vx_mov_origen", [
  "saldo_inicial",
  "pago_proveedor",
  "recaudo_cliente",
  "traslado",
  "comision",
  "ajuste",
  "consignacion",
  "retiro",
]);
```

- [ ] **Step 2: Añadir tablas** al final de `schema.ts` (después de vx32)

```typescript
// ──────────────────────────────────────────────────────────────────────────
// vx33 — Cuentas propias (tesorería)
// ──────────────────────────────────────────────────────────────────────────
export const cuentasPropias = pgTable(
  "vx33",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" }).notNull().references(() => empresas.id),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    tipo: cuentaTipoEnum("tipo").notNull(),
    banco: varchar("banco", { length: 100 }),
    numeroCuenta: varchar("numero_cuenta", { length: 50 }),
    titularNit: varchar("titular_nit", { length: 50 }),
    titularNombre: varchar("titular_nombre", { length: 200 }),
    saldoInicial: money("saldo_inicial").notNull().default("0"),
    activa: boolean("activa").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vx33_empresa_idx").on(t.empresaId)],
);

// ──────────────────────────────────────────────────────────────────────────
// vx34 — Cuentas de beneficiario (por proveedor)
// ──────────────────────────────────────────────────────────────────────────
export const cuentasBeneficiario = pgTable(
  "vx34",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" }).notNull().references(() => empresas.id),
    terceroId: bigint("tercero_id", { mode: "number" }).notNull().references(() => terceros.id),
    banco: varchar("banco", { length: 100 }).notNull(),
    tipo: cuentaTipoEnum("tipo").notNull(),
    numeroCuenta: varchar("numero_cuenta", { length: 50 }).notNull(),
    titularNit: varchar("titular_nit", { length: 50 }).notNull(),
    titularNombre: varchar("titular_nombre", { length: 200 }).notNull(),
    activa: boolean("activa").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vx34_empresa_tercero_idx").on(t.empresaId, t.terceroId)],
);

// ──────────────────────────────────────────────────────────────────────────
// vx35 — Movimientos de tesorería (libro mayor)
// ──────────────────────────────────────────────────────────────────────────
export const movimientosTesoreria = pgTable(
  "vx35",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" }).notNull().references(() => empresas.id),
    cuentaPropiaId: bigint("cuenta_propia_id", { mode: "number" }).notNull().references(() => cuentasPropias.id),
    fecha: date("fecha").notNull(),
    tipo: movTipoEnum("tipo").notNull(),
    origen: movOrigenEnum("origen").notNull(),
    valor: money("valor").notNull(),
    descripcion: text("descripcion"),
    pagoId: bigint("pago_id", { mode: "number" }).references(() => pagosProveedor.id),
    recaudoId: bigint("recaudo_id", { mode: "number" }).references(() => recaudosClientes.id),
    contraCuentaId: bigint("contra_cuenta_id", { mode: "number" }).references((): AnyPgColumn => cuentasPropias.id),
    usuarioId: bigint("usuario_id", { mode: "number" }).notNull().references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vx35_cuenta_fecha_idx").on(t.empresaId, t.cuentaPropiaId, t.fecha)],
);
```

- [ ] **Step 3: Añadir columnas a vx27** (pagosProveedor) — dentro del objeto de columnas, tras `retencionTotal`

```typescript
    cuentaOrigenId: bigint("cuenta_origen_id", { mode: "number" }).references(() => cuentasPropias.id),
    beneficiarioCuentaId: bigint("beneficiario_cuenta_id", { mode: "number" }).references(() => cuentasBeneficiario.id),
    beneficiarioBanco: varchar("beneficiario_banco", { length: 100 }),
    beneficiarioCuenta: varchar("beneficiario_cuenta", { length: 50 }),
    beneficiarioNit: varchar("beneficiario_nit", { length: 50 }),
    beneficiarioNombre: varchar("beneficiario_nombre", { length: 200 }),
```

> Nota: estas referencias a `cuentasPropias`/`cuentasBeneficiario` requieren que vx33/vx34 estén declaradas antes que vx27, o usar el callback de `references(() => …)` (lazy). El callback `() =>` ya es lazy, así que el orden de declaración no importa. Mantener vx27 donde está.

- [ ] **Step 4: Añadir columna a vx29** (recaudosClientes) — tras `referencia`

```typescript
    cuentaDestinoId: bigint("cuenta_destino_id", { mode: "number" }).references(() => cuentasPropias.id),
```

- [ ] **Step 5: Generar migración**

Run: `npm run db:generate`
Expected: nuevo archivo `supabase/migrations/0002_*.sql` con CREATE TABLE vx33/vx34/vx35, los enums y los ALTER TABLE de vx27/vx29.

- [ ] **Step 6: Aplicar a la BD**

Run: `npm run db:push`
Expected: "Changes applied". Sin prompts destructivos (todo es additivo).

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema.ts supabase/migrations
git commit -m "feat(tesoreria): schema vx33/vx34/vx35 + columnas origen/beneficiario/destino"
```

---

## Task 2: Registrar vx33/vx34/vx35 en el catálogo vx00

**Files:**
- Modify: `src/lib/db/nomenclatura.ts`

- [ ] **Step 1: Añadir entradas** al final del array `CATALOGO` (tras vx32)

```typescript
  { codigo: "vx33", nombreModelo: "CuentaPropia", descripcion: "Cuentas propias (tesorería)", modulo: "Cartera", tieneEmpresaId: true, esCatalogo: true },
  { codigo: "vx34", nombreModelo: "CuentaBeneficiario", descripcion: "Cuentas de beneficiario por proveedor", modulo: "Cartera", tieneEmpresaId: true, esCatalogo: true },
  { codigo: "vx35", nombreModelo: "MovimientoTesoreria", descripcion: "Movimientos de tesorería", modulo: "Cartera", tieneEmpresaId: true, esCatalogo: false },
```

- [ ] **Step 2: Actualizar el comentario de cabecera** del archivo: cambiar "la siguiente es vx33" por "la siguiente es vx36".

- [ ] **Step 3: Re-sembrar el catálogo**

Run: `npm run db:seed`
Expected: el upsert de nomenclatura inserta vx33/vx34/vx35 en `vx00` sin error.

- [ ] **Step 4: Verificar**

Run: `node --env-file=.env.local -e "const p=require('postgres');const sql=p(process.env.DATABASE_URL_SESSION,{prepare:false,max:1});sql\`select codigo from vx00 where codigo in ('vx33','vx34','vx35') order by codigo\`.then(r=>{console.log(r.map(x=>x.codigo).join(','));return sql.end()})"`
Expected: `vx33,vx34,vx35`

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/nomenclatura.ts
git commit -m "feat(tesoreria): registrar vx33/vx34/vx35 en vx00"
```

---

## Task 3: Dominio puro — `calcularSaldo` (TDD)

**Files:**
- Create: `src/lib/domain/tesoreria.ts`
- Test: `src/lib/domain/tesoreria.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
import { describe, it, expect } from "vitest";
import { calcularSaldo, type MovimientoSaldo } from "./tesoreria";

const mov = (tipo: "entrada" | "salida", valor: number): MovimientoSaldo => ({ tipo, valor });

describe("calcularSaldo", () => {
  it("suma entradas y resta salidas al saldo inicial", () => {
    expect(calcularSaldo(100_000, [mov("entrada", 50_000), mov("salida", 30_000)])).toBe(120_000);
  });

  it("sin movimientos devuelve el saldo inicial", () => {
    expect(calcularSaldo(100_000, [])).toBe(100_000);
  });

  it("puede quedar negativo (sobregiro)", () => {
    expect(calcularSaldo(0, [mov("salida", 10_000)])).toBe(-10_000);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/lib/domain/tesoreria`
Expected: FAIL — "Cannot find module './tesoreria'".

- [ ] **Step 3: Implementación mínima**

```typescript
/**
 * Tesorería: cálculo de saldos y movimientos (lógica pura, testeable).
 * El saldo de una cuenta = saldo inicial + Σ entradas − Σ salidas.
 */
export interface MovimientoSaldo {
  tipo: "entrada" | "salida";
  valor: number;
}

export function calcularSaldo(saldoInicial: number, movimientos: MovimientoSaldo[]): number {
  return movimientos.reduce(
    (acc, m) => (m.tipo === "entrada" ? acc + m.valor : acc - m.valor),
    saldoInicial,
  );
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/lib/domain/tesoreria`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/tesoreria.ts src/lib/domain/tesoreria.test.ts
git commit -m "feat(tesoreria): calcularSaldo (TDD)"
```

---

## Task 4: Dominio puro — `saldoCorrido` para extracto (TDD)

**Files:**
- Modify: `src/lib/domain/tesoreria.ts`, `src/lib/domain/tesoreria.test.ts`

- [ ] **Step 1: Añadir test que falla**

```typescript
import { calcularSaldo, saldoCorrido, type MovimientoSaldo } from "./tesoreria";

describe("saldoCorrido", () => {
  it("acumula el saldo movimiento a movimiento", () => {
    const movs = [
      { tipo: "entrada" as const, valor: 100 },
      { tipo: "salida" as const, valor: 40 },
      { tipo: "entrada" as const, valor: 10 },
    ];
    const r = saldoCorrido(0, movs);
    expect(r.map((m) => m.saldo)).toEqual([100, 60, 70]);
  });

  it("arranca desde el saldo inicial", () => {
    const r = saldoCorrido(500, [{ tipo: "salida" as const, valor: 200 }]);
    expect(r[0].saldo).toBe(300);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/lib/domain/tesoreria`
Expected: FAIL — "saldoCorrido is not a function".

- [ ] **Step 3: Implementar**

```typescript
export function saldoCorrido<T extends MovimientoSaldo>(
  saldoInicial: number,
  movimientos: T[],
): Array<T & { saldo: number }> {
  let saldo = saldoInicial;
  return movimientos.map((m) => {
    saldo = m.tipo === "entrada" ? saldo + m.valor : saldo - m.valor;
    return { ...m, saldo };
  });
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/lib/domain/tesoreria`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/tesoreria.ts src/lib/domain/tesoreria.test.ts
git commit -m "feat(tesoreria): saldoCorrido para extracto (TDD)"
```

---

## Task 5: Dominio puro — `movimientoDesdePago` (TDD)

**Files:**
- Modify: `src/lib/domain/tesoreria.ts`, `src/lib/domain/tesoreria.test.ts`

- [ ] **Step 1: Añadir test que falla**

```typescript
import { movimientoDesdePago } from "./tesoreria";

describe("movimientoDesdePago", () => {
  it("genera una salida por el neto (valor − retención)", () => {
    expect(movimientoDesdePago({ valor: 1_000_000, retencionTotal: 25_000 })).toEqual({
      tipo: "salida",
      valor: 975_000,
    });
  });

  it("sin retención la salida es el valor completo", () => {
    expect(movimientoDesdePago({ valor: 500_000, retencionTotal: 0 })).toEqual({
      tipo: "salida",
      valor: 500_000,
    });
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/lib/domain/tesoreria`
Expected: FAIL — "movimientoDesdePago is not a function".

- [ ] **Step 3: Implementar**

```typescript
export function movimientoDesdePago(pago: { valor: number; retencionTotal: number }): MovimientoSaldo {
  return { tipo: "salida", valor: pago.valor - pago.retencionTotal };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/lib/domain/tesoreria`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/tesoreria.ts src/lib/domain/tesoreria.test.ts
git commit -m "feat(tesoreria): movimientoDesdePago neto (TDD)"
```

---

## Task 6: Dominio puro — `resolverBeneficiario` (TDD)

**Files:**
- Modify: `src/lib/domain/tesoreria.ts`, `src/lib/domain/tesoreria.test.ts`

Define el snapshot del beneficiario a guardar en el pago según la opción elegida en el formulario: `"proveedor"` (null), `"guardada"` (datos de una cuenta vx34), o `"adhoc"` (datos capturados).

- [ ] **Step 1: Añadir test que falla**

```typescript
import { resolverBeneficiario, type BeneficiarioSnapshot } from "./tesoreria";

const cuenta = { id: 7, banco: "Bancolombia", numeroCuenta: "123", titularNit: "900", titularNombre: "Factor SAS" };

describe("resolverBeneficiario", () => {
  it("opción proveedor → sin beneficiario (null)", () => {
    expect(resolverBeneficiario({ opcion: "proveedor" })).toBeNull();
  });

  it("opción guardada → snapshot con id de catálogo", () => {
    expect(resolverBeneficiario({ opcion: "guardada", cuenta })).toEqual({
      beneficiarioCuentaId: 7,
      banco: "Bancolombia",
      numeroCuenta: "123",
      nit: "900",
      nombre: "Factor SAS",
    } satisfies BeneficiarioSnapshot);
  });

  it("opción adhoc → snapshot sin id de catálogo", () => {
    expect(
      resolverBeneficiario({ opcion: "adhoc", adhoc: { banco: "Davivienda", numeroCuenta: "999", nit: "800", nombre: "Pepe" } }),
    ).toEqual({ beneficiarioCuentaId: null, banco: "Davivienda", numeroCuenta: "999", nit: "800", nombre: "Pepe" });
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/lib/domain/tesoreria`
Expected: FAIL — "resolverBeneficiario is not a function".

- [ ] **Step 3: Implementar**

```typescript
export interface BeneficiarioSnapshot {
  beneficiarioCuentaId: number | null;
  banco: string;
  numeroCuenta: string;
  nit: string;
  nombre: string;
}

interface CuentaGuardada {
  id: number;
  banco: string;
  numeroCuenta: string;
  titularNit: string;
  titularNombre: string;
}
interface DatosAdhoc {
  banco: string;
  numeroCuenta: string;
  nit: string;
  nombre: string;
}
type OpcionBeneficiario =
  | { opcion: "proveedor" }
  | { opcion: "guardada"; cuenta: CuentaGuardada }
  | { opcion: "adhoc"; adhoc: DatosAdhoc };

export function resolverBeneficiario(sel: OpcionBeneficiario): BeneficiarioSnapshot | null {
  if (sel.opcion === "proveedor") return null;
  if (sel.opcion === "guardada") {
    return {
      beneficiarioCuentaId: sel.cuenta.id,
      banco: sel.cuenta.banco,
      numeroCuenta: sel.cuenta.numeroCuenta,
      nit: sel.cuenta.titularNit,
      nombre: sel.cuenta.titularNombre,
    };
  }
  return { beneficiarioCuentaId: null, ...sel.adhoc };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/lib/domain/tesoreria`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/tesoreria.ts src/lib/domain/tesoreria.test.ts
git commit -m "feat(tesoreria): resolverBeneficiario (TDD)"
```

---

## Task 7: Validaciones Zod

**Files:**
- Create: `src/lib/validation/cuenta-propia.ts`, `src/lib/validation/beneficiario.ts`, `src/lib/validation/movimiento-tesoreria.ts`

- [ ] **Step 1: `cuenta-propia.ts`**

```typescript
import { z } from "zod";

export const cuentaPropiaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  tipo: z.enum(["ahorros", "corriente", "caja"]),
  banco: z.string().trim().max(100).optional(),
  numeroCuenta: z.string().trim().max(50).optional(),
  titularNit: z.string().trim().max(50).optional(),
  titularNombre: z.string().trim().max(200).optional(),
  saldoInicial: z.coerce.number().default(0),
  activa: z.boolean().default(true),
});
export type CuentaPropiaInput = z.infer<typeof cuentaPropiaSchema>;

export function parseCuentaPropiaForm(form: FormData) {
  return cuentaPropiaSchema.safeParse({
    nombre: form.get("nombre"),
    tipo: form.get("tipo"),
    banco: form.get("banco") || undefined,
    numeroCuenta: form.get("numeroCuenta") || undefined,
    titularNit: form.get("titularNit") || undefined,
    titularNombre: form.get("titularNombre") || undefined,
    saldoInicial: form.get("saldoInicial") || 0,
    activa: form.get("activa") !== "false",
  });
}
```

- [ ] **Step 2: `beneficiario.ts`**

```typescript
import { z } from "zod";

export const beneficiarioSchema = z.object({
  banco: z.string().trim().min(1, "El banco es obligatorio").max(100),
  tipo: z.enum(["ahorros", "corriente"]),
  numeroCuenta: z.string().trim().min(1, "El número de cuenta es obligatorio").max(50),
  titularNit: z.string().trim().min(1, "El NIT del titular es obligatorio").max(50),
  titularNombre: z.string().trim().min(1, "El nombre del titular es obligatorio").max(200),
  activa: z.boolean().default(true),
});
export type BeneficiarioInput = z.infer<typeof beneficiarioSchema>;

export function parseBeneficiarioForm(form: FormData) {
  return beneficiarioSchema.safeParse({
    banco: form.get("banco"),
    tipo: form.get("tipo"),
    numeroCuenta: form.get("numeroCuenta"),
    titularNit: form.get("titularNit"),
    titularNombre: form.get("titularNombre"),
    activa: form.get("activa") !== "false",
  });
}
```

- [ ] **Step 3: `movimiento-tesoreria.ts`**

```typescript
import { z } from "zod";

export const movimientoManualSchema = z
  .object({
    cuentaPropiaId: z.coerce.number().int().positive(),
    origen: z.enum(["traslado", "comision", "ajuste", "consignacion", "retiro"]),
    valor: z.coerce.number().positive("El valor debe ser mayor a 0"),
    fecha: z.string().min(1),
    descripcion: z.string().trim().max(500).optional(),
    contraCuentaId: z.coerce.number().int().positive().optional(),
  })
  .refine((d) => d.origen !== "traslado" || !!d.contraCuentaId, {
    message: "Un traslado requiere la cuenta destino",
    path: ["contraCuentaId"],
  })
  .refine((d) => d.origen !== "traslado" || d.contraCuentaId !== d.cuentaPropiaId, {
    message: "La cuenta destino debe ser distinta del origen",
    path: ["contraCuentaId"],
  });
export type MovimientoManualInput = z.infer<typeof movimientoManualSchema>;

export function parseMovimientoForm(form: FormData) {
  return movimientoManualSchema.safeParse({
    cuentaPropiaId: form.get("cuentaPropiaId"),
    origen: form.get("origen"),
    valor: form.get("valor"),
    fecha: form.get("fecha"),
    descripcion: form.get("descripcion") || undefined,
    contraCuentaId: form.get("contraCuentaId") || undefined,
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/validation/cuenta-propia.ts src/lib/validation/beneficiario.ts src/lib/validation/movimiento-tesoreria.ts
git commit -m "feat(tesoreria): validaciones Zod (cuenta propia, beneficiario, movimiento)"
```

---

## Task 8: Servicio de tesorería (cuentas propias, saldos, extracto, movimientos)

**Files:**
- Create: `src/lib/services/tesoreria.ts`

Mapea el origen del movimiento manual a su tipo: `consignacion` → entrada; `comision`/`retiro` → salida; `ajuste`/`traslado` → según el formulario (para ajuste se manda `tipo`; para traslado se generan los dos lados).

- [ ] **Step 1: Crear el servicio**

```typescript
import "server-only";
import { and, eq, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cuentasPropias, movimientosTesoreria } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { calcularSaldo, saldoCorrido } from "@/lib/domain/tesoreria";
import type { CuentaPropiaInput } from "@/lib/validation/cuenta-propia";
import type { MovimientoManualInput } from "@/lib/validation/movimiento-tesoreria";
import type { Contexto } from "./bodegas";

export type CuentaPropia = typeof cuentasPropias.$inferSelect;
export type MovimientoTesoreria = typeof movimientosTesoreria.$inferSelect;

/** Lista cuentas propias con su saldo actual derivado del libro. */
export async function listarCuentasPropias(empresaId: number) {
  const cuentas = await db
    .select()
    .from(cuentasPropias)
    .where(eq(cuentasPropias.empresaId, empresaId))
    .orderBy(cuentasPropias.nombre);

  const sumas = await db
    .select({
      cuentaId: movimientosTesoreria.cuentaPropiaId,
      entradas: sql<string>`coalesce(sum(case when ${movimientosTesoreria.tipo} = 'entrada' then ${movimientosTesoreria.valor} else 0 end), 0)`,
      salidas: sql<string>`coalesce(sum(case when ${movimientosTesoreria.tipo} = 'salida' then ${movimientosTesoreria.valor} else 0 end), 0)`,
    })
    .from(movimientosTesoreria)
    .where(eq(movimientosTesoreria.empresaId, empresaId))
    .groupBy(movimientosTesoreria.cuentaPropiaId);
  const porCuenta = new Map(sumas.map((s) => [s.cuentaId, Number(s.entradas) - Number(s.salidas)]));

  // El saldo inicial ya está materializado como movimiento, así que el saldo
  // es solo la suma del libro; saldoInicial de la fila es informativo.
  return cuentas.map((c) => ({ ...c, saldo: porCuenta.get(c.id) ?? 0 }));
}

export async function obtenerCuentaPropia(empresaId: number, id: number): Promise<CuentaPropia | null> {
  const [c] = await db
    .select()
    .from(cuentasPropias)
    .where(and(eq(cuentasPropias.empresaId, empresaId), eq(cuentasPropias.id, id)))
    .limit(1);
  return c ?? null;
}

/** Movimientos de una cuenta con saldo corrido (más antiguos primero). */
export async function extractoCuenta(empresaId: number, cuentaId: number) {
  const movs = await db
    .select()
    .from(movimientosTesoreria)
    .where(and(eq(movimientosTesoreria.empresaId, empresaId), eq(movimientosTesoreria.cuentaPropiaId, cuentaId)))
    .orderBy(asc(movimientosTesoreria.fecha), asc(movimientosTesoreria.id));
  const conValor = movs.map((m) => ({ ...m, tipo: m.tipo, valor: Number(m.valor) }));
  // El saldo inicial es el primer movimiento, así que arrancamos el corrido en 0.
  return saldoCorrido(0, conValor);
}

export async function crearCuentaPropia(data: CuentaPropiaInput, ctx: Contexto): Promise<void> {
  await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(cuentasPropias)
      .values({
        empresaId: ctx.empresaId,
        nombre: data.nombre,
        tipo: data.tipo,
        banco: data.banco || null,
        numeroCuenta: data.numeroCuenta || null,
        titularNit: data.titularNit || null,
        titularNombre: data.titularNombre || null,
        saldoInicial: String(data.saldoInicial),
        activa: data.activa,
      })
      .returning();

    if (data.saldoInicial !== 0) {
      await tx.insert(movimientosTesoreria).values({
        empresaId: ctx.empresaId,
        cuentaPropiaId: c.id,
        fecha: new Date().toISOString().slice(0, 10),
        tipo: data.saldoInicial >= 0 ? "entrada" : "salida",
        origen: "saldo_inicial",
        valor: String(Math.abs(data.saldoInicial)),
        descripcion: "Saldo inicial",
        usuarioId: ctx.usuarioId,
      });
    }

    await registrarAuditoria(
      { empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx33", modelId: c.id, accion: "CREAR", registroNuevo: c, ipOrigen: ctx.ip },
      tx,
    );
  });
}

export async function actualizarCuentaPropia(id: number, data: CuentaPropiaInput, ctx: Contexto): Promise<void> {
  const anterior = await obtenerCuentaPropia(ctx.empresaId, id);
  if (!anterior) throw new Error("Cuenta no encontrada.");
  // No se reescribe el saldo inicial materializado: solo datos descriptivos.
  const [c] = await db
    .update(cuentasPropias)
    .set({
      nombre: data.nombre,
      tipo: data.tipo,
      banco: data.banco || null,
      numeroCuenta: data.numeroCuenta || null,
      titularNit: data.titularNit || null,
      titularNombre: data.titularNombre || null,
      activa: data.activa,
      updatedAt: new Date(),
    })
    .where(and(eq(cuentasPropias.empresaId, ctx.empresaId), eq(cuentasPropias.id, id)))
    .returning();
  await registrarAuditoria({ empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx33", modelId: id, accion: "ACTUALIZAR", registroAnterior: anterior, registroNuevo: c, ipOrigen: ctx.ip });
}

const TIPO_POR_ORIGEN: Record<string, "entrada" | "salida"> = {
  consignacion: "entrada",
  comision: "salida",
  retiro: "salida",
};

/** Registra un movimiento manual. Traslado = salida en origen + entrada en contracuenta. */
export async function registrarMovimientoManual(data: MovimientoManualInput, ctx: Contexto): Promise<void> {
  await db.transaction(async (tx) => {
    if (data.origen === "traslado") {
      await tx.insert(movimientosTesoreria).values([
        { empresaId: ctx.empresaId, cuentaPropiaId: data.cuentaPropiaId, fecha: data.fecha, tipo: "salida", origen: "traslado", valor: String(data.valor), descripcion: data.descripcion || "Traslado", contraCuentaId: data.contraCuentaId, usuarioId: ctx.usuarioId },
        { empresaId: ctx.empresaId, cuentaPropiaId: data.contraCuentaId!, fecha: data.fecha, tipo: "entrada", origen: "traslado", valor: String(data.valor), descripcion: data.descripcion || "Traslado", contraCuentaId: data.cuentaPropiaId, usuarioId: ctx.usuarioId },
      ]);
    } else {
      const tipo = data.origen === "ajuste" ? "entrada" : TIPO_POR_ORIGEN[data.origen];
      await tx.insert(movimientosTesoreria).values({
        empresaId: ctx.empresaId,
        cuentaPropiaId: data.cuentaPropiaId,
        fecha: data.fecha,
        tipo,
        origen: data.origen,
        valor: String(data.valor),
        descripcion: data.descripcion || null,
        usuarioId: ctx.usuarioId,
      });
    }
    await registrarAuditoria(
      { empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx35", modelId: data.cuentaPropiaId, accion: "CREAR", registroNuevo: data, ipOrigen: ctx.ip },
      tx,
    );
  });
}

/** Opciones para selects (solo activas). */
export async function cuentasPropiasActivas(empresaId: number) {
  return db
    .select({ id: cuentasPropias.id, nombre: cuentasPropias.nombre, tipo: cuentasPropias.tipo, banco: cuentasPropias.banco })
    .from(cuentasPropias)
    .where(and(eq(cuentasPropias.empresaId, empresaId), eq(cuentasPropias.activa, true)))
    .orderBy(cuentasPropias.nombre);
}
```

> `calcularSaldo` se importa para uso futuro/consistencia; si el linter marca import sin usar, elimínalo — `listarCuentasPropias` usa la suma SQL directamente. (Mantener `saldoCorrido`, sí se usa.)

- [ ] **Step 2: Verificar typecheck vía build parcial**

Run: `npx tsc --noEmit`
Expected: sin errores en `tesoreria.ts`. (Si marca `calcularSaldo` sin usar y el repo trata warnings como error, quita ese import.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/tesoreria.ts
git commit -m "feat(tesoreria): servicio de cuentas propias, saldos, extracto y movimientos"
```

---

## Task 9: Servicio de beneficiarios (cuentas de pago por proveedor)

**Files:**
- Create: `src/lib/services/beneficiarios.ts`

- [ ] **Step 1: Crear el servicio**

```typescript
import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { cuentasBeneficiario } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import type { BeneficiarioInput } from "@/lib/validation/beneficiario";
import type { Contexto } from "./bodegas";

export type Beneficiario = typeof cuentasBeneficiario.$inferSelect;

export async function listarBeneficiarios(empresaId: number, terceroId: number): Promise<Beneficiario[]> {
  return db
    .select()
    .from(cuentasBeneficiario)
    .where(and(eq(cuentasBeneficiario.empresaId, empresaId), eq(cuentasBeneficiario.terceroId, terceroId)))
    .orderBy(desc(cuentasBeneficiario.activa), cuentasBeneficiario.titularNombre);
}

/** Solo activas, para el select del modal de pago. */
export async function beneficiariosActivos(empresaId: number, terceroId: number): Promise<Beneficiario[]> {
  return db
    .select()
    .from(cuentasBeneficiario)
    .where(and(eq(cuentasBeneficiario.empresaId, empresaId), eq(cuentasBeneficiario.terceroId, terceroId), eq(cuentasBeneficiario.activa, true)))
    .orderBy(cuentasBeneficiario.titularNombre);
}

export async function crearBeneficiario(terceroId: number, data: BeneficiarioInput, ctx: Contexto): Promise<Beneficiario> {
  const [b] = await db
    .insert(cuentasBeneficiario)
    .values({ empresaId: ctx.empresaId, terceroId, banco: data.banco, tipo: data.tipo, numeroCuenta: data.numeroCuenta, titularNit: data.titularNit, titularNombre: data.titularNombre, activa: data.activa })
    .returning();
  await registrarAuditoria({ empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx34", modelId: b.id, accion: "CREAR", registroNuevo: b, ipOrigen: ctx.ip });
  return b;
}

export async function cambiarEstadoBeneficiario(id: number, activa: boolean, ctx: Contexto): Promise<void> {
  await db
    .update(cuentasBeneficiario)
    .set({ activa, updatedAt: new Date() })
    .where(and(eq(cuentasBeneficiario.empresaId, ctx.empresaId), eq(cuentasBeneficiario.id, id)));
  await registrarAuditoria({ empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx34", modelId: id, accion: "ACTUALIZAR", registroNuevo: { activa }, ipOrigen: ctx.ip });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/beneficiarios.ts
git commit -m "feat(tesoreria): servicio de beneficiarios por proveedor"
```

---

## Task 10: Wiring de pagos — origen + beneficiario + movimiento salida

**Files:**
- Modify: `src/lib/services/cartera.ts`

`DatosAbono` se extiende con campos opcionales para pagos. `registrarPago` inserta el movimiento de salida por el neto y, si el beneficiario fue ad-hoc con "guardar", crea la cuenta vx34.

- [ ] **Step 1: Importar lo necesario** (añadir a los imports existentes)

```typescript
import { movimientosTesoreria, cuentasBeneficiario } from "@/lib/db/schema";
import { movimientoDesdePago, resolverBeneficiario, type BeneficiarioSnapshot } from "@/lib/domain/tesoreria";
```

- [ ] **Step 2: Extender `DatosAbono`** (campos opcionales; recaudo ignora los de beneficiario)

```typescript
export interface DatosAbono {
  valor: number;
  metodoPago: string;
  referencia?: string;
  fecha: string;
  cuentaOrigenId?: number;       // pagos
  cuentaDestinoId?: number;      // recaudos
  beneficiario?: BeneficiarioSnapshot | null; // resuelto en la action
  guardarBeneficiario?: boolean;  // si el ad-hoc se guarda en catálogo
}
```

- [ ] **Step 3: En `registrarPago`**, dentro de la transacción, **después** de insertar el pago y **antes** de actualizar el saldo, añadir el snapshot al insert del pago y crear el movimiento. Reemplazar el bloque del insert de `pago` para incluir las nuevas columnas:

```typescript
    const [pago] = await tx
      .insert(pagosProveedor)
      .values({
        empresaId: ctx.empresaId,
        proveedorId: cxp.proveedorId,
        cuentaPorPagarId: cxp.id,
        numero,
        fecha: datos.fecha,
        valor: String(datos.valor),
        retencionTotal: String(ret.total),
        metodoPago: datos.metodoPago,
        referencia: datos.referencia || null,
        cuentaOrigenId: datos.cuentaOrigenId ?? null,
        beneficiarioCuentaId: datos.beneficiario?.beneficiarioCuentaId ?? null,
        beneficiarioBanco: datos.beneficiario?.banco ?? null,
        beneficiarioCuenta: datos.beneficiario?.numeroCuenta ?? null,
        beneficiarioNit: datos.beneficiario?.nit ?? null,
        beneficiarioNombre: datos.beneficiario?.nombre ?? null,
        estado: "activo",
        usuarioId: ctx.usuarioId,
      })
      .returning();
```

- [ ] **Step 4:** Tras insertar las filas `pagoRetenciones`, añadir el movimiento de salida y el guardado de beneficiario ad-hoc:

```typescript
    if (datos.cuentaOrigenId) {
      const movPago = movimientoDesdePago({ valor: datos.valor, retencionTotal: ret.total });
      await tx.insert(movimientosTesoreria).values({
        empresaId: ctx.empresaId,
        cuentaPropiaId: datos.cuentaOrigenId,
        fecha: datos.fecha,
        tipo: movPago.tipo,
        origen: "pago_proveedor",
        valor: String(movPago.valor),
        descripcion: `Pago ${numero} a ${datos.beneficiario?.nombre ?? "proveedor"}`,
        pagoId: pago.id,
        usuarioId: ctx.usuarioId,
      });
    }

    if (datos.guardarBeneficiario && datos.beneficiario && datos.beneficiario.beneficiarioCuentaId === null) {
      await tx.insert(cuentasBeneficiario).values({
        empresaId: ctx.empresaId,
        terceroId: cxp.proveedorId,
        banco: datos.beneficiario.banco,
        tipo: "ahorros",
        numeroCuenta: datos.beneficiario.numeroCuenta,
        titularNit: datos.beneficiario.nit,
        titularNombre: datos.beneficiario.nombre,
        activa: true,
      });
    }
```

- [ ] **Step 5: En `registrarRecaudo`**, añadir `cuentaDestinoId` al insert del recaudo y crear el movimiento entrada tras insertarlo:

```typescript
    // en el .values del recaudo, añadir:
        cuentaDestinoId: datos.cuentaDestinoId ?? null,
```

Y tras el insert del recaudo (antes de actualizar la CxC):

```typescript
    if (datos.cuentaDestinoId) {
      await tx.insert(movimientosTesoreria).values({
        empresaId: ctx.empresaId,
        cuentaPropiaId: datos.cuentaDestinoId,
        fecha: datos.fecha,
        tipo: "entrada",
        origen: "recaudo_cliente",
        valor: String(datos.valor),
        descripcion: `Recaudo ${numero}`,
        recaudoId: recaudo.id,
        usuarioId: ctx.usuarioId,
      });
    }
```

- [ ] **Step 6: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/lib/services/cartera.ts
git commit -m "feat(tesoreria): pagos y recaudos generan movimientos de tesorería"
```

---

## Task 11: Permiso `tesoreria` + navegación

**Files:**
- Modify: `src/lib/auth/roles.ts`, `src/lib/modules.ts`

- [ ] **Step 1: Añadir `"tesoreria"`** al array `MODULOS` (tras `"retenciones"`).

```typescript
  "retenciones",
  "tesoreria",
  "reportes",
```

- [ ] **Step 2: Dar CRUD a Admin** en roles.ts (junto a `...p("retenciones", CRUD)`)

```typescript
    ...p("retenciones", CRUD),
    ...p("tesoreria", CRUD),
```

- [ ] **Step 3: Añadir el ícono** a los imports de `modules.ts`

```typescript
  Percent,
  Landmark,
} from "lucide-react";
```

- [ ] **Step 4: Añadir el ítem de nav** en el grupo "Cartera" (tras "Retenciones")

```typescript
      { modulo: "retenciones", label: "Retenciones", href: "/retenciones", icon: Percent, listo: true },
      { modulo: "tesoreria", label: "Tesorería", href: "/tesoreria", icon: Landmark, listo: true },
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/roles.ts src/lib/modules.ts
git commit -m "feat(tesoreria): permiso tesoreria + ítem de navegación"
```

---

## Task 12: UI — módulo Tesorería (lista de cuentas con saldo + acciones)

**Files:**
- Create: `src/app/(app)/tesoreria/actions.ts`, `page.tsx`, `loading.tsx`, `cuenta-form.tsx`, `cuenta-row-actions.tsx`
- Create: `src/app/(app)/tesoreria/nueva/page.tsx`, `src/app/(app)/tesoreria/[id]/editar/page.tsx`

Sigue el patrón EXACTO de `src/app/(app)/categorias` (page/actions/form/row-actions) y `retenciones`.

- [ ] **Step 1: `actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede, type Permiso } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseCuentaPropiaForm } from "@/lib/validation/cuenta-propia";
import { parseMovimientoForm } from "@/lib/validation/movimiento-tesoreria";
import { crearCuentaPropia, actualizarCuentaPropia, registrarMovimientoManual } from "@/lib/services/tesoreria";

export interface TesoreriaState {
  error?: string;
}

export async function guardarCuentaAction(_prev: TesoreriaState, form: FormData): Promise<TesoreriaState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  const idRaw = form.get("id");
  const editando = idRaw ? Number(idRaw) : null;
  const permiso: Permiso = editando ? "tesoreria.editar" : "tesoreria.crear";
  if (!puede(c.rol, permiso)) return { error: "No tienes permiso para esta acción." };
  const parsed = parseCuentaPropiaForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  try {
    if (editando) await actualizarCuentaPropia(editando, parsed.data, c.ctx);
    else await crearCuentaPropia(parsed.data, c.ctx);
  } catch (e) {
    console.error("[tesoreria] error al guardar cuenta:", e);
    return { error: "Ocurrió un error al guardar la cuenta." };
  }
  revalidatePath("/tesoreria");
  redirect("/tesoreria");
}

export interface MovimientoState {
  error?: string;
  ok?: boolean;
}

export async function registrarMovimientoAction(_prev: MovimientoState, form: FormData): Promise<MovimientoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "tesoreria.crear")) return { error: "No tienes permiso para esta acción." };
  const parsed = parseMovimientoForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  try {
    await registrarMovimientoManual(parsed.data, c.ctx);
  } catch (e) {
    console.error("[tesoreria] error al registrar movimiento:", e);
    return { error: "Ocurrió un error al registrar el movimiento." };
  }
  revalidatePath("/tesoreria");
  revalidatePath(`/tesoreria/${parsed.data.cuentaPropiaId}`);
  return { ok: true };
}
```

- [ ] **Step 2: `cuenta-form.tsx`** (cliente; patrón de `categoria-form.tsx`, con Select de tipo)

```typescript
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { guardarCuentaAction, type TesoreriaState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";

interface Props {
  cuenta?: { id: number; nombre: string; tipo: string; banco: string | null; numeroCuenta: string | null; titularNit: string | null; titularNombre: string | null; saldoInicial: string };
}

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Guardar
    </Button>
  );
}

export function CuentaForm({ cuenta }: Props) {
  const [state, action] = useActionState<TesoreriaState, FormData>(guardarCuentaAction, {});
  return (
    <form action={action} className="max-w-xl space-y-6">
      {cuenta && <input type="hidden" name="id" value={cuenta.id} />}
      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre / alias</Label>
        <Input id="nombre" name="nombre" defaultValue={cuenta?.nombre} required maxLength={100} placeholder="Ej. Bancolombia ahorros" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select name="tipo" defaultValue={cuenta?.tipo ?? "ahorros"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ahorros">Ahorros</SelectItem>
              <SelectItem value="corriente">Corriente</SelectItem>
              <SelectItem value="caja">Caja / efectivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="banco">Banco</Label>
          <Input id="banco" name="banco" defaultValue={cuenta?.banco ?? ""} maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="numeroCuenta">N° de cuenta</Label>
          <Input id="numeroCuenta" name="numeroCuenta" defaultValue={cuenta?.numeroCuenta ?? ""} maxLength={50} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="titularNit">NIT titular</Label>
          <Input id="titularNit" name="titularNit" defaultValue={cuenta?.titularNit ?? ""} maxLength={50} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="titularNombre">Nombre del titular</Label>
          <Input id="titularNombre" name="titularNombre" defaultValue={cuenta?.titularNombre ?? ""} maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="saldoInicial">Saldo inicial</Label>
          <Input id="saldoInicial" name="saldoInicial" type="number" step="0.01" defaultValue={cuenta?.saldoInicial ?? "0"} disabled={!!cuenta} />
          {cuenta && <p className="text-xs text-muted-foreground">El saldo inicial no se edita; usa un ajuste.</p>}
        </div>
      </div>
      <div className="flex gap-3">
        <Guardar />
        <Link href="/tesoreria" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: `cuenta-row-actions.tsx`** — copia EXACTA de `retenciones/retencion-row-actions.tsx` pero importando `cambiarEstado` no aplica aquí (las cuentas se desactivan vía editar). Crear acciones mínimas: solo "Editar" y "Ver extracto".

```typescript
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, ListTree } from "lucide-react";

export function CuentaRowActions({ id, puedeEditar }: { id: number; puedeEditar: boolean }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/tesoreria/${id}`)}>
          <ListTree className="size-4" /> Ver extracto
        </DropdownMenuItem>
        {puedeEditar && (
          <DropdownMenuItem onClick={() => router.push(`/tesoreria/${id}/editar`)}>
            <Pencil className="size-4" /> Editar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: `page.tsx`** (lista de cuentas con saldo; patrón `retenciones/page.tsx`)

```typescript
import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarCuentasPropias } from "@/lib/services/tesoreria";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CuentaRowActions } from "./cuenta-row-actions";
import { Plus, Landmark } from "lucide-react";

export const metadata: Metadata = { title: "Tesorería — Vertex" };
const PAGE_SIZE = 10;
const money = (n: number) => "$" + n.toLocaleString("es-CO");
type Fila = Awaited<ReturnType<typeof listarCuentasPropias>>[number];
const TIPO_LABEL: Record<string, string> = { ahorros: "Ahorros", corriente: "Corriente", caja: "Caja" };

export default async function TesoreriaPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sesion = await requirePermiso("tesoreria.ver");
  const { empresaId } = await requireEmpresa();
  const { q = "", page: pageRaw } = await searchParams;
  const todas = await listarCuentasPropias(empresaId);
  const { items, total, page } = filtrarPaginar(todas, { q, page: parsePage(pageRaw), pageSize: PAGE_SIZE, texto: (c) => `${c.nombre} ${c.banco ?? ""}` });
  const puedeCrear = puede(sesion.rol, "tesoreria.crear");
  const puedeEditar = puede(sesion.rol, "tesoreria.editar");

  const columnas: Columna<Fila>[] = [
    { header: "Cuenta", primary: true, cell: (c) => c.nombre },
    { header: "Tipo", cell: (c) => TIPO_LABEL[c.tipo] ?? c.tipo },
    { header: "Banco", cell: (c) => c.banco ?? "—" },
    { header: "Saldo", className: "text-right", cell: (c) => <span className="tabular font-medium">{money(c.saldo)}</span> },
    { header: "Estado", cell: (c) => <Badge variant={c.activa ? "default" : "outline"} className="font-normal">{c.activa ? "Activa" : "Inactiva"}</Badge> },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Tesorería" description="Cuentas propias y su saldo en vivo.">
        {puedeCrear && (
          <Link href="/tesoreria/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nueva cuenta
          </Link>
        )}
      </PageHeader>
      <ListaFiltrable
        base="/tesoreria"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(c) => c.id}
        rowClassName={(c) => (c.activa ? "" : "opacity-60")}
        columns={columnas}
        searchPlaceholder="Buscar cuenta…"
        hayDatos={todas.length > 0}
        vacio={{ icon: Landmark, titulo: "Aún no hay cuentas", texto: "Registra las cuentas bancarias y cajas de la empresa." }}
        actions={(c) => <CuentaRowActions id={c.id} puedeEditar={puedeEditar} />}
      />
    </div>
  );
}
```

- [ ] **Step 5: `loading.tsx`**

```typescript
import { TableSkeleton } from "@/components/skeletons";
export default function Loading() {
  return <TableSkeleton cols={5} maxWidth="max-w-4xl" />;
}
```

- [ ] **Step 6: `nueva/page.tsx`**

```typescript
import type { Metadata } from "next";
import { requirePermiso } from "@/lib/auth/guard";
import { PageHeader } from "@/components/page-header";
import { CuentaForm } from "../cuenta-form";

export const metadata: Metadata = { title: "Nueva cuenta — Vertex" };

export default async function NuevaCuentaPage() {
  await requirePermiso("tesoreria.crear");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Nueva cuenta" description="Registra una cuenta propia de la empresa." />
      <CuentaForm />
    </div>
  );
}
```

- [ ] **Step 7: `[id]/editar/page.tsx`**

```typescript
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerCuentaPropia } from "@/lib/services/tesoreria";
import { PageHeader } from "@/components/page-header";
import { CuentaForm } from "../../cuenta-form";

export const metadata: Metadata = { title: "Editar cuenta — Vertex" };

export default async function EditarCuentaPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("tesoreria.editar");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const cuenta = await obtenerCuentaPropia(empresaId, Number(id));
  if (!cuenta) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Editar cuenta" description={cuenta.nombre} />
      <CuentaForm cuenta={{ id: cuenta.id, nombre: cuenta.nombre, tipo: cuenta.tipo, banco: cuenta.banco, numeroCuenta: cuenta.numeroCuenta, titularNit: cuenta.titularNit, titularNombre: cuenta.titularNombre, saldoInicial: cuenta.saldoInicial }} />
    </div>
  );
}
```

- [ ] **Step 8: Verificar build**

Run: `npm run build`
Expected: compila; aparece la ruta `/tesoreria`, `/tesoreria/nueva`, `/tesoreria/[id]/editar`.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(app)/tesoreria"
git commit -m "feat(tesoreria): UI módulo de cuentas propias (lista/form/acciones)"
```

---

## Task 13: UI — extracto de cuenta + movimiento manual

**Files:**
- Create: `src/app/(app)/tesoreria/[id]/page.tsx`, `src/app/(app)/tesoreria/movimiento-button.tsx`

- [ ] **Step 1: `movimiento-button.tsx`** (modal con SearchSelect de origen, patrón `pago-proveedor-button.tsx`)

```typescript
"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { DatePicker } from "@/components/ui/date-picker";
import { registrarMovimientoAction, type MovimientoState } from "./actions";
import { AlertCircle, Loader2 } from "lucide-react";

interface Opcion { id: number; nombre: string }
interface Props { cuentaId: number; hoy: string; otrasCuentas: Opcion[] }

const ORIGENES = [
  { value: "consignacion", label: "Consignación (entrada)" },
  { value: "retiro", label: "Retiro (salida)" },
  { value: "comision", label: "Comisión bancaria (salida)" },
  { value: "traslado", label: "Traslado a otra cuenta (salida)" },
  { value: "ajuste", label: "Ajuste (entrada)" },
];

function Confirmar() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Registrar</Button>;
}

export function MovimientoButton({ cuentaId, hoy, otrasCuentas }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [origen, setOrigen] = useState("consignacion");
  const [state, action] = useActionState<MovimientoState, FormData>(registrarMovimientoAction, {});

  useEffect(() => {
    if (state.ok) { setOpen(false); router.refresh(); }
  }, [state.ok, router]);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Nuevo movimiento</Button>
      <Modal open={open} onOpenChange={setOpen} title="Nuevo movimiento" description="Registra una entrada, salida o traslado.">
        <form action={action} className="space-y-4">
          <input type="hidden" name="cuentaPropiaId" value={cuentaId} />
          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {state.error}
            </div>
          )}
          <Field label="Tipo de movimiento" required>
            <SearchSelect name="origen" defaultValue="consignacion" options={ORIGENES} onValueChange={setOrigen} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor" required>
              <Input name="valor" type="number" min="0" step="0.01" required />
            </Field>
            <Field label="Fecha">
              <DatePicker name="fecha" defaultValue={hoy} />
            </Field>
          </div>
          {origen === "traslado" && (
            <Field label="Cuenta destino" required>
              <SearchSelect name="contraCuentaId" placeholder="Elige la cuenta destino" options={otrasCuentas.map((c) => ({ value: String(c.id), label: c.nombre }))} />
            </Field>
          )}
          <Field label="Descripción">
            <Input name="descripcion" maxLength={500} />
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

> Verifica que `SearchSelect` acepte `onValueChange` y `placeholder`. Si la prop se llama distinto (revisa `src/components/ui/search-select.tsx`), ajusta el nombre. Si no expone cambio de valor, usa un `<select>` nativo controlado para `origen`.

- [ ] **Step 2: `[id]/page.tsx`** (extracto)

```typescript
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { obtenerCuentaPropia, extractoCuenta, cuentasPropiasActivas } from "@/lib/services/tesoreria";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MovimientoButton } from "../movimiento-button";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Extracto — Vertex" };
const money = (n: number) => "$" + n.toLocaleString("es-CO");
const ORIGEN_LABEL: Record<string, string> = {
  saldo_inicial: "Saldo inicial", pago_proveedor: "Pago a proveedor", recaudo_cliente: "Recaudo",
  traslado: "Traslado", comision: "Comisión", ajuste: "Ajuste", consignacion: "Consignación", retiro: "Retiro",
};

export default async function ExtractoPage({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requirePermiso("tesoreria.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const cuentaId = Number(id);
  const cuenta = await obtenerCuentaPropia(empresaId, cuentaId);
  if (!cuenta) notFound();
  const movimientos = await extractoCuenta(empresaId, cuentaId);
  const saldoActual = movimientos.length ? movimientos[movimientos.length - 1].saldo : 0;
  const otras = (await cuentasPropiasActivas(empresaId)).filter((c) => c.id !== cuentaId).map((c) => ({ id: c.id, nombre: c.nombre }));
  const hoy = new Date().toISOString().slice(0, 10);
  const puedeCrear = puede(sesion.rol, "tesoreria.crear");

  type Mov = (typeof movimientos)[number];
  const columnas: Columna<Mov>[] = [
    { header: "Fecha", primary: true, cell: (m) => <span className="tabular">{m.fecha}</span> },
    { header: "Concepto", cell: (m) => ORIGEN_LABEL[m.origen] ?? m.origen },
    { header: "Detalle", cell: (m) => m.descripcion ?? "—" },
    { header: "Entrada", className: "text-right", cell: (m) => (m.tipo === "entrada" ? <span className="tabular text-green-600">{money(m.valor)}</span> : "—") },
    { header: "Salida", className: "text-right", cell: (m) => (m.tipo === "salida" ? <span className="tabular text-destructive">{money(m.valor)}</span> : "—") },
    { header: "Saldo", className: "text-right", cell: (m) => <span className="tabular font-medium">{money(m.saldo)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/tesoreria" className={buttonVariants({ variant: "ghost", size: "sm" }) + " mb-2"}>
        <ArrowLeft className="size-4" /> Tesorería
      </Link>
      <PageHeader title={cuenta.nombre} description={`${cuenta.banco ?? "Caja"} · Saldo actual: ${money(saldoActual)}`}>
        {puedeCrear && <MovimientoButton cuentaId={cuentaId} hoy={hoy} otrasCuentas={otras} />}
      </PageHeader>
      {movimientos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin movimientos todavía.</p>
      ) : (
        <ResponsiveTable items={[...movimientos].reverse()} getKey={(m) => m.id} columns={columnas} />
      )}
    </div>
  );
}
```

> Verifica la firma real de `ResponsiveTable` en `src/components/responsive-table.tsx` (props `items`, `getKey`, `columns`). Si difiere, ajusta. La lista se invierte para mostrar lo más reciente arriba conservando el saldo corrido calculado en orden cronológico.

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: compila; ruta `/tesoreria/[id]`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/tesoreria"
git commit -m "feat(tesoreria): extracto por cuenta + movimientos manuales"
```

---

## Task 14: Modal de pago — cuenta de origen + beneficiario

**Files:**
- Modify: `src/components/pago-proveedor-button.tsx`, `src/app/(app)/cuentas-pagar/page.tsx`, `src/app/(app)/cuentas-pagar/actions.ts`

- [ ] **Step 1: `cuentas-pagar/page.tsx`** — cargar cuentas propias y beneficiarios por proveedor, pasarlos al botón. Añadir imports y datos:

```typescript
import { cuentasPropiasActivas } from "@/lib/services/tesoreria";
import { beneficiariosActivos } from "@/lib/services/beneficiarios";
```

Tras `const retenciones = await retencionesActivas(empresaId);`:

```typescript
  const cuentasOrigen = await cuentasPropiasActivas(empresaId);
```

Y en el render del `PagoProveedorButton`, pasar `cuentasOrigen` y cargar beneficiarios del proveedor de esa fila. Como `beneficiariosActivos` depende del proveedor, cárgalos por fila con `Promise.all` antes del map. Reemplazar la sección de `actions`:

```typescript
  // Beneficiarios por proveedor (solo para las filas con saldo)
  const proveedorIds = [...new Set(items.filter((f) => Number(f.cuenta.saldoPendiente) > 0).map((f) => f.cuenta.proveedorId))];
  const benefPorProveedor = new Map<number, Awaited<ReturnType<typeof beneficiariosActivos>>>();
  await Promise.all(proveedorIds.map(async (pid) => { benefPorProveedor.set(pid, await beneficiariosActivos(empresaId, pid)); }));
```

> Nota: la fila de `listarCuentasPorPagar` ya incluye `f.cuenta.proveedorId` (columna de vx26) y `f.proveedor` (razón social). Verifícalo en `cartera.ts:listarCuentasPorPagar`.

En el `actions` del `ListaFiltrable`, reemplazar el `<PagoProveedorButton .../>` por:

```typescript
                  <PagoProveedorButton
                    cuentaId={f.cuenta.id}
                    saldo={Number(f.cuenta.saldoPendiente)}
                    hoy={hoy}
                    proveedor={f.proveedor}
                    facturaElectronica={f.facturaElectronica ?? false}
                    retenciones={retenciones}
                    cuentasOrigen={cuentasOrigen}
                    beneficiarios={benefPorProveedor.get(f.cuenta.proveedorId) ?? []}
                    action={registrarPagoAction}
                  />
```

- [ ] **Step 2: `pago-proveedor-button.tsx`** — añadir props y campos de UI. Añadir a `Props`:

```typescript
  cuentasOrigen: { id: number; nombre: string }[];
  beneficiarios: { id: number; banco: string; numeroCuenta: string; titularNit: string; titularNombre: string }[];
```

Importar `SearchSelect` ya está. Añadir estado para el beneficiario:

```typescript
  const [destino, setDestino] = useState<string>("proveedor");
```

Dentro del `<form>`, antes del bloque de retenciones, añadir:

```tsx
          <Field label="Cuenta de origen (de dónde sale)" required>
            <SearchSelect
              name="cuentaOrigenId"
              placeholder="Elige la cuenta"
              options={cuentasOrigen.map((c) => ({ value: String(c.id), label: c.nombre }))}
            />
          </Field>

          <Field label="Beneficiario (a quién se paga)" required>
            <SearchSelect
              name="destino"
              defaultValue="proveedor"
              onValueChange={setDestino}
              options={[
                { value: "proveedor", label: `Al proveedor (${proveedor})` },
                ...beneficiarios.map((b) => ({ value: `cuenta:${b.id}`, label: `${b.titularNombre} · ${b.banco} ${b.numeroCuenta}` })),
                { value: "adhoc", label: "+ Otro beneficiario…" },
              ]}
            />
          </Field>

          {destino === "adhoc" && (
            <div className="grid gap-4 sm:grid-cols-2 rounded-lg border p-3">
              <Field label="Banco" required><Input name="adhocBanco" maxLength={100} /></Field>
              <Field label="N° de cuenta" required><Input name="adhocCuenta" maxLength={50} /></Field>
              <Field label="NIT titular" required><Input name="adhocNit" maxLength={50} /></Field>
              <Field label="Nombre titular" required><Input name="adhocNombre" maxLength={200} /></Field>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="guardarBeneficiario" value="true" /> Guardar este beneficiario para futuros pagos
              </label>
            </div>
          )}
```

Serializar los beneficiarios al form para que la action resuelva el snapshot: agregar un hidden con el JSON de las cuentas guardadas:

```tsx
          <input type="hidden" name="beneficiariosJson" value={JSON.stringify(beneficiarios)} />
```

- [ ] **Step 3: `cuentas-pagar/actions.ts`** — `registrarPagoAction` debe resolver el beneficiario y origen desde el form y pasarlos a `registrarPago`. Reemplazar el cuerpo que arma `datos`:

```typescript
import { resolverBeneficiario } from "@/lib/domain/tesoreria";

// ...dentro de registrarPagoAction, tras validar la sesión y permiso:
  const cuentaOrigenId = Number(form.get("cuentaOrigenId"));
  if (!cuentaOrigenId) return { error: "Elige la cuenta de origen." };

  const destino = String(form.get("destino") ?? "proveedor");
  const beneficiarios = JSON.parse(String(form.get("beneficiariosJson") ?? "[]")) as Array<{ id: number; banco: string; numeroCuenta: string; titularNit: string; titularNombre: string }>;
  let beneficiario = null;
  let guardarBeneficiario = false;
  if (destino.startsWith("cuenta:")) {
    const bid = Number(destino.slice(7));
    const cuenta = beneficiarios.find((b) => b.id === bid);
    if (cuenta) beneficiario = resolverBeneficiario({ opcion: "guardada", cuenta });
  } else if (destino === "adhoc") {
    const adhoc = {
      banco: String(form.get("adhocBanco") ?? ""),
      numeroCuenta: String(form.get("adhocCuenta") ?? ""),
      nit: String(form.get("adhocNit") ?? ""),
      nombre: String(form.get("adhocNombre") ?? ""),
    };
    if (!adhoc.banco || !adhoc.numeroCuenta || !adhoc.nit || !adhoc.nombre) return { error: "Completa los datos del beneficiario." };
    beneficiario = resolverBeneficiario({ opcion: "adhoc", adhoc });
    guardarBeneficiario = form.get("guardarBeneficiario") === "true";
  }
```

Y al construir `datos` para `registrarPago`, añadir: `cuentaOrigenId, beneficiario, guardarBeneficiario`.

> Lee primero `cuentas-pagar/actions.ts` para ver cómo arma `datos` hoy (valor, metodoPago, referencia, fecha) y la firma de retorno `{ ok?: boolean; error?: string }`. Inserta el bloque sin romper esa forma.

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: compila sin errores.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/cuentas-pagar" src/components/pago-proveedor-button.tsx
git commit -m "feat(tesoreria): modal de pago con cuenta de origen y beneficiario"
```

---

## Task 15: Modal de recaudo — cuenta destino

**Files:**
- Modify: el botón de recaudo y su action. Primero localiza dónde se registra el recaudo en la UI.

- [ ] **Step 1: Localizar el botón de recaudo**

Run: `grep -rln "registrarRecaudoAction\|AbonoButton" "src/app/(app)/cuentas-cobrar" "src/app/(app)/recaudos" "src/app/(app)/ruta-recaudo"`
Expected: identifica el/los archivos que disparan `registrarRecaudoAction`.

- [ ] **Step 2:** En la página que lista cuentas por cobrar (la que usa `AbonoButton` con `registrarRecaudoAction`), cargar cuentas destino:

```typescript
import { cuentasPropiasActivas } from "@/lib/services/tesoreria";
// ...
const cuentasDestino = await cuentasPropiasActivas(empresaId);
```

- [ ] **Step 3:** El `AbonoButton` actual no tiene campo de cuenta. Para recaudos, añadir una prop opcional `cuentasDestino` al `AbonoButton` y, si viene, renderizar un `SearchSelect name="cuentaDestinoId"` obligatorio dentro del form (junto a Valor/Método). Editar `src/components/abono-button.tsx`:

```tsx
// en Props:
  cuentasDestino?: { id: number; nombre: string }[];
// dentro del grid de campos, si cuentasDestino:
  {cuentasDestino && (
    <Field label="Cuenta destino (a dónde entra)" required>
      <SearchSelect name="cuentaDestinoId" placeholder="Elige la cuenta" options={cuentasDestino.map((c) => ({ value: String(c.id), label: c.nombre }))} />
    </Field>
  )}
```

Añadir el import `SearchSelect` a `abono-button.tsx` si no está.

- [ ] **Step 4:** En `registrarRecaudoAction`, leer `cuentaDestinoId` del form y pasarlo a `registrarRecaudo` dentro de `datos`:

```typescript
  const cuentaDestinoId = Number(form.get("cuentaDestinoId")) || undefined;
  if (!cuentaDestinoId) return { error: "Elige la cuenta destino." };
  // añadir cuentaDestinoId a datos
```

- [ ] **Step 5:** Pasar `cuentasDestino` al `AbonoButton` de recaudos en la página correspondiente.

- [ ] **Step 6: Verificar build**

Run: `npm run build`
Expected: compila. (La ruta de recaudo / cuentas por cobrar siguen funcionando.)

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)" src/components/abono-button.tsx
git commit -m "feat(tesoreria): recaudo registra cuenta destino y movimiento entrada"
```

---

## Task 16: UI — cuentas de pago en la ficha del tercero

**Files:**
- Modify: ficha de edición del tercero (`src/app/(app)/terceros/[id]/editar/page.tsx` o equivalente) + nueva action.
- Create: componente cliente para listar/agregar beneficiarios.

- [ ] **Step 1: Localizar la página de edición de tercero**

Run: `ls "src/app/(app)/terceros/[id]/editar" "src/app/(app)/terceros/[id]" 2>/dev/null; grep -rln "obtenerTercero\|terceroForm\|TerceroForm" "src/app/(app)/terceros"`
Expected: identifica el page de edición y el form.

- [ ] **Step 2: Crear `src/app/(app)/terceros/beneficiarios-actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { parseBeneficiarioForm } from "@/lib/validation/beneficiario";
import { crearBeneficiario, cambiarEstadoBeneficiario } from "@/lib/services/beneficiarios";

export interface BeneficiarioState { error?: string; ok?: boolean }

export async function agregarBeneficiarioAction(terceroId: number, _prev: BeneficiarioState, form: FormData): Promise<BeneficiarioState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "terceros.editar")) return { error: "No tienes permiso." };
  const parsed = parseBeneficiarioForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  try {
    await crearBeneficiario(terceroId, parsed.data, c.ctx);
  } catch (e) {
    console.error("[beneficiarios] error:", e);
    return { error: "No se pudo guardar la cuenta." };
  }
  revalidatePath(`/terceros/${terceroId}/editar`);
  return { ok: true };
}

export async function quitarBeneficiarioAction(terceroId: number, id: number): Promise<void> {
  const c = await contexto();
  if (!c) return;
  if (!puede(c.rol, "terceros.editar")) return;
  await cambiarEstadoBeneficiario(id, false, c.ctx);
  revalidatePath(`/terceros/${terceroId}/editar`);
}
```

- [ ] **Step 3: Crear `src/app/(app)/terceros/beneficiarios-panel.tsx`** (cliente: lista + form inline)

```tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { agregarBeneficiarioAction, quitarBeneficiarioAction, type BeneficiarioState } from "./beneficiarios-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { Trash2 } from "lucide-react";

interface Cuenta { id: number; banco: string; tipo: string; numeroCuenta: string; titularNit: string; titularNombre: string }
interface Props { terceroId: number; cuentas: Cuenta[] }

export function BeneficiariosPanel({ terceroId, cuentas }: Props) {
  const router = useRouter();
  const action = agregarBeneficiarioAction.bind(null, terceroId);
  const [state, formAction] = useActionState<BeneficiarioState, FormData>(action, {});

  useEffect(() => { if (state.ok) router.refresh(); }, [state.ok, router]);

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <h3 className="font-medium">Cuentas de pago</h3>
      <p className="text-sm text-muted-foreground">Cuentas a las que se le paga a este proveedor (pueden tener NIT distinto).</p>
      {cuentas.length > 0 && (
        <ul className="divide-y text-sm">
          {cuentas.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <span>{c.titularNombre} · {c.banco} {c.numeroCuenta} · NIT {c.titularNit}</span>
              <Button type="button" variant="ghost" size="icon" className="size-8" onClick={async () => { await quitarBeneficiarioAction(terceroId, c.id); router.refresh(); }}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form action={formAction} className="grid gap-3 sm:grid-cols-2">
        {state.error && <p className="text-sm text-destructive sm:col-span-2">{state.error}</p>}
        <Field label="Banco" required><Input name="banco" maxLength={100} required /></Field>
        <Field label="Tipo" required>
          <SearchSelect name="tipo" defaultValue="ahorros" options={[{ value: "ahorros", label: "Ahorros" }, { value: "corriente", label: "Corriente" }]} />
        </Field>
        <Field label="N° de cuenta" required><Input name="numeroCuenta" maxLength={50} required /></Field>
        <Field label="NIT titular" required><Input name="titularNit" maxLength={50} required /></Field>
        <Field label="Nombre titular" required><Input name="titularNombre" maxLength={200} required /></Field>
        <div className="sm:col-span-2"><Button type="submit" variant="outline">Agregar cuenta</Button></div>
      </form>
    </section>
  );
}
```

- [ ] **Step 4:** En el page de edición del tercero, cargar y renderizar el panel **solo si el tercero es proveedor** (`tipo` ∈ {proveedor, ambos}). Añadir:

```tsx
import { listarBeneficiarios } from "@/lib/services/beneficiarios";
import { BeneficiariosPanel } from "../../beneficiarios-panel";
// ...obtener el tercero y, si es proveedor:
const beneficiarios = await listarBeneficiarios(empresaId, tercero.id);
// en el JSX, bajo el formulario principal:
{(tercero.tipo === "proveedor" || tercero.tipo === "ambos") && (
  <div className="mt-8">
    <BeneficiariosPanel terceroId={tercero.id} cuentas={beneficiarios.filter((b) => b.activa)} />
  </div>
)}
```

> Ajusta la ruta de import (`../../beneficiarios-panel`) según la profundidad real del page. Verifica el nombre del campo `tipo` del tercero.

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: compila.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/terceros"
git commit -m "feat(tesoreria): cuentas de pago por proveedor en la ficha del tercero"
```

---

## Task 17: Lista de pagos muestra origen → beneficiario

**Files:**
- Modify: `src/app/(app)/pagos-proveedor/page.tsx` y `src/lib/services/cartera.ts:listarPagos`

- [ ] **Step 1:** En `listarPagos` (cartera.ts), incluir el nombre de la cuenta origen y el beneficiario. Hacer LEFT JOIN a `cuentasPropias` y seleccionar el snapshot:

```typescript
import { cuentasPropias } from "@/lib/db/schema";
// en listarPagos:
  return db
    .select({
      pago: pagosProveedor,
      proveedor: terceros.razonSocial,
      cuentaOrigen: cuentasPropias.nombre,
    })
    .from(pagosProveedor)
    .innerJoin(terceros, eq(pagosProveedor.proveedorId, terceros.id))
    .leftJoin(cuentasPropias, eq(pagosProveedor.cuentaOrigenId, cuentasPropias.id))
    .where(eq(pagosProveedor.empresaId, empresaId))
    .orderBy(desc(pagosProveedor.createdAt));
```

- [ ] **Step 2:** En `pagos-proveedor/page.tsx`, añadir columnas "Origen" (`f.cuentaOrigen ?? "—"`) y "Beneficiario" (`f.pago.beneficiarioNombre ?? f.proveedor`).

> Lee `pagos-proveedor/page.tsx` para ubicar el array `columnas` y el tipo `Fila`; inserta las dos columnas siguiendo el estilo existente.

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: compila.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/pagos-proveedor" src/lib/services/cartera.ts
git commit -m "feat(tesoreria): lista de pagos muestra origen y beneficiario"
```

---

## Task 18: Verificación final, suite completa y despliegue

**Files:** ninguno (verificación)

- [ ] **Step 1: Suite completa**

Run: `npx vitest run`
Expected: todas las pruebas verdes (las 102 previas + las nuevas de tesorería).

- [ ] **Step 2: Build limpio**

Run: `npm run build`
Expected: compila sin errores ni warnings de tipo.

- [ ] **Step 3: Push (deploy a Vercel)**

```bash
git push origin main
```

- [ ] **Step 4: Verificar deploy vivo**

Run: `until curl -s -o /dev/null -w "%{http_code}" https://vertexsm.vercel.app/login | grep -q 200; do sleep 5; done; curl -s -o /dev/null -w "tesoreria: %{http_code}\n" https://vertexsm.vercel.app/tesoreria`
Expected: `tesoreria: 307` (existe y está protegida por sesión).

- [ ] **Step 5: E2E manual en producción** (lista de verificación)
  1. Crear cuenta propia "Bancolombia ahorros" con saldo inicial 1.000.000 → aparece con saldo $1.000.000 y un movimiento "Saldo inicial".
  2. Pagar una CxP de un proveedor con factura electrónica eligiendo esa cuenta de origen y "+ Otro beneficiario" (NIT distinto, marcar "guardar") → el extracto muestra una salida por el **neto** (valor − retención) y el saldo baja; el beneficiario queda guardado en la ficha del proveedor.
  3. Recaudar una CxC a esa cuenta → el extracto muestra una entrada y el saldo sube.
  4. Registrar un traslado a otra cuenta → salida en una y entrada en la otra por igual valor.
  5. La lista de pagos muestra Origen y Beneficiario.

---

## Notas de cierre
- Si algún componente UI (`SearchSelect`, `ResponsiveTable`, `Field`, `Modal`) expone props con nombres distintos a los usados aquí, ajusta al contrato real del componente (revisar `src/components/ui/`). El plan asume los nombres vistos en `pago-proveedor-button.tsx` y `categorias`.
- No se cachea el saldo: si en el futuro el extracto crece mucho, paginar el libro y calcular el saldo de apertura con una suma agregada previa.

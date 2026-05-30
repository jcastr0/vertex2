# Venta POS (autocomplete + precio por cliente) y filtros avanzados — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la pantalla de venta como punto de venta (autocomplete de cliente/producto, agregar-al-carrito, precio editable cuyo punto de partida es el último precio cobrado a ese cliente) y crear una barra de filtros avanzada reutilizable para los listados.

**Architecture:** Lógica pura testeada en `src/lib/domain/venta.ts` y `src/lib/domain/filtros.ts`. Un componente `Autocomplete` reutilizable y un `FiltroBar` que reemplaza al `SearchFilter` dentro de `ListaFiltrable` (compatible hacia atrás). El precio por cliente se deriva de las facturas (sin tabla nueva); se agrega una columna `ultimoPrecioVenta` global en vx11. El filtrado real ocurre en cada página vía `filtrarPaginar` extendido con un predicado; `FiltroBar` solo gestiona los params en la URL y la UI.

**Tech Stack:** Next.js 15 App Router (Server Components, Server Actions, useActionState/useTransition), Drizzle ORM + postgres-js (Supabase), Vitest (TDD), Tailwind v4 + base-ui, lucide-react.

---

## Convenciones del repo (leer antes de empezar)
- Estamos en **desarrollo**: la data de Supabase es desechable; `npm run db:generate`, `db:migrate`/`db:push` y `db:seed` se pueden correr sin miedo. Migraciones: editar `schema.ts` → `npm run db:generate` → `npm run db:migrate` (no interactivo; usa `DATABASE_URL_SESSION`).
- `price` = `numeric(12,2)`, `qty` = `numeric(12,4)`. Columnas `numeric` devuelven string → `Number()` al leer, `String()` al escribir.
- Tests de dominio: `npx vitest run src/lib/domain/<archivo>`. Estilo: `import { describe, it, expect } from "vitest"`.
- `Contexto` = `{ empresaId, usuarioId, ip? }` (de `src/lib/services/bodegas.ts`). Acciones: `contextoAccion as contexto` de `@/lib/auth/contexto` → `{ ctx, rol }`.
- Componentes UI existentes: `SearchSelect`, `Input`, `Label`, `Button`, `Field`, `Modal`, `Popover` (base-ui), `Badge`. El `SearchSelect` se mantiene; el nuevo `Autocomplete` es aparte.
- `ListaFiltrable` (server) renderiza `SearchFilter` (client). `filtrarPaginar(items, {q, page, pageSize, texto})` filtra en memoria en el server component.

---

## FRENTE A — Venta estilo POS

## Task 1: Dominio `buscarProductos` (TDD)

**Files:** Create `src/lib/domain/venta.ts`, `src/lib/domain/venta.test.ts`

- [ ] **Step 1: Test que falla**
```typescript
import { describe, it, expect } from "vitest";
import { buscarProductos, type ProductoBuscable } from "./venta";

const P = (id: number, nombre: string, sku: string): ProductoBuscable => ({ id, nombre, sku });
const lista = [P(1, "Tomate chonto", "VEG-01"), P(2, "Tomate larga vida", "VEG-02"), P(3, "Cebolla cabezona", "VEG-03"), P(4, "Papa criolla", "VEG-04")];

describe("buscarProductos", () => {
  it("filtra por nombre (case-insensitive)", () => {
    const r = buscarProductos(lista, "tomate", 10);
    expect(r.map((p) => p.id)).toEqual([1, 2]);
  });
  it("filtra por SKU", () => {
    expect(buscarProductos(lista, "veg-03", 10).map((p) => p.id)).toEqual([3]);
  });
  it("rankea prefijo antes que substring", () => {
    const r = buscarProductos([P(1, "Verde cebolla", "X1"), P(2, "Cebolla larga", "X2")], "cebolla", 10);
    expect(r[0].id).toBe(2); // empieza por 'cebolla'
  });
  it("corta al límite", () => {
    expect(buscarProductos(lista, "a", 2).length).toBeLessThanOrEqual(2);
  });
  it("query vacía devuelve los primeros hasta el límite", () => {
    expect(buscarProductos(lista, "", 3).length).toBe(3);
  });
});
```
- [ ] **Step 2: Verificar que falla** — `npx vitest run src/lib/domain/venta` → FAIL ("Cannot find module './venta'").
- [ ] **Step 3: Implementar**
```typescript
/** Búsqueda y carrito de la venta (lógica pura, testeable). */
export interface ProductoBuscable {
  id: number;
  nombre: string;
  sku: string;
}

export function buscarProductos<T extends ProductoBuscable>(items: T[], q: string, limite: number): T[] {
  const t = q.trim().toLowerCase();
  if (!t) return items.slice(0, limite);
  const conRango = items
    .map((p) => {
      const nombre = p.nombre.toLowerCase();
      const sku = p.sku.toLowerCase();
      let rango = -1;
      if (nombre.startsWith(t) || sku.startsWith(t)) rango = 0;
      else if (nombre.includes(t) || sku.includes(t)) rango = 1;
      return { p, rango };
    })
    .filter((x) => x.rango >= 0)
    .sort((a, b) => a.rango - b.rango);
  return conRango.slice(0, limite).map((x) => x.p);
}
```
- [ ] **Step 4: Verificar que pasa** — `npx vitest run src/lib/domain/venta` → PASS (5).
- [ ] **Step 5: Commit**
```bash
git add src/lib/domain/venta.ts src/lib/domain/venta.test.ts
git commit -m "feat(venta): buscarProductos (TDD)"
```

---

## Task 2: Dominio `agregarOIncrementar` (TDD)

**Files:** Modify `src/lib/domain/venta.ts`, `src/lib/domain/venta.test.ts`

- [ ] **Step 1: Test que falla**
```typescript
import { agregarOIncrementar, type LineaCarrito } from "./venta";

describe("agregarOIncrementar", () => {
  it("agrega una línea nueva con cantidad 1 y el precio sugerido", () => {
    const r = agregarOIncrementar([], 5, 1200);
    expect(r).toEqual([{ productoId: 5, cantidad: 1, precioUnitario: 1200 }] satisfies LineaCarrito[]);
  });
  it("si el producto ya está, suma 1 a la cantidad (no duplica ni cambia el precio)", () => {
    const carrito: LineaCarrito[] = [{ productoId: 5, cantidad: 2, precioUnitario: 1200 }];
    const r = agregarOIncrementar(carrito, 5, 9999);
    expect(r).toEqual([{ productoId: 5, cantidad: 3, precioUnitario: 1200 }]);
  });
  it("no muta el carrito original", () => {
    const carrito: LineaCarrito[] = [{ productoId: 5, cantidad: 1, precioUnitario: 100 }];
    agregarOIncrementar(carrito, 5, 100);
    expect(carrito[0].cantidad).toBe(1);
  });
});
```
- [ ] **Step 2: Verificar que falla** → FAIL ("agregarOIncrementar is not a function").
- [ ] **Step 3: Implementar** (añadir a venta.ts)
```typescript
export interface LineaCarrito {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
}

export function agregarOIncrementar(carrito: LineaCarrito[], productoId: number, precioSugerido: number): LineaCarrito[] {
  const existe = carrito.some((l) => l.productoId === productoId);
  if (existe) {
    return carrito.map((l) => (l.productoId === productoId ? { ...l, cantidad: l.cantidad + 1 } : l));
  }
  return [...carrito, { productoId, cantidad: 1, precioUnitario: precioSugerido }];
}
```
- [ ] **Step 4: Verificar que pasa** → PASS (8 totales).
- [ ] **Step 5: Commit**
```bash
git commit -am "feat(venta): agregarOIncrementar (TDD)"
```

---

## Task 3: Dominio `precioSugerido` (TDD)

**Files:** Modify `src/lib/domain/venta.ts`, `src/lib/domain/venta.test.ts`

- [ ] **Step 1: Test que falla**
```typescript
import { precioSugerido } from "./venta";

describe("precioSugerido", () => {
  const base = { 1: 1000, 2: 2000 }; // global ?? configurado, ya resuelto
  it("usa el precio del cliente cuando existe", () => {
    expect(precioSugerido(1, { porCliente: { 1: 850 }, base })).toBe(850);
  });
  it("cae al base cuando el cliente no tiene precio para ese producto", () => {
    expect(precioSugerido(2, { porCliente: { 1: 850 }, base })).toBe(2000);
  });
  it("devuelve 0 si no hay ni cliente ni base", () => {
    expect(precioSugerido(9, { porCliente: {}, base })).toBe(0);
  });
});
```
- [ ] **Step 2: Verificar que falla** → FAIL.
- [ ] **Step 3: Implementar**
```typescript
export function precioSugerido(
  productoId: number,
  fuentes: { porCliente: Record<number, number>; base: Record<number, number> },
): number {
  return fuentes.porCliente[productoId] ?? fuentes.base[productoId] ?? 0;
}
```
- [ ] **Step 4: Verificar que pasa** → PASS (11 totales).
- [ ] **Step 5: Commit**
```bash
git commit -am "feat(venta): precioSugerido cliente→global→configurado (TDD)"
```

---

## Task 4: Componente `Autocomplete`

**Files:** Create `src/components/ui/autocomplete.tsx`

Input con type-ahead, navegación por teclado y popover de resultados. No depende del dominio (recibe ya los resultados filtrados o filtra con una prop).

- [ ] **Step 1: Crear el componente**
```tsx
"use client";

import { useState, useRef, useMemo, useId, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface OpcionAuto {
  value: string;
  label: string;
  hint?: string;
  derecha?: ReactNode;
}

interface Props {
  opciones: OpcionAuto[];
  onSelect: (value: string) => void;
  filtrar: (opciones: OpcionAuto[], q: string) => OpcionAuto[];
  placeholder?: string;
  limpiarAlSeleccionar?: boolean;
  inputClassName?: string;
  autoFocus?: boolean;
}

export function Autocomplete({ opciones, onSelect, filtrar, placeholder = "Buscar…", limpiarAlSeleccionar = false, inputClassName, autoFocus }: Props) {
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resultados = useMemo(() => (q.trim() ? filtrar(opciones, q).slice(0, 8) : []), [q, opciones, filtrar]);

  function elegir(value: string) {
    onSelect(value);
    if (limpiarAlSeleccionar) setQ("");
    setAbierto(false);
    setActivo(0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!abierto && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setAbierto(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActivo((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { if (resultados[activo]) { e.preventDefault(); elegir(resultados[activo].value); } }
    else if (e.key === "Escape") { setAbierto(false); }
  }

  return (
    <div className="relative">
      <Input
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listId}
        autoFocus={autoFocus}
        value={q}
        placeholder={placeholder}
        className={inputClassName}
        onChange={(e) => { setQ(e.target.value); setAbierto(true); setActivo(0); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => { blurTimer.current = setTimeout(() => setAbierto(false), 120); }}
        onKeyDown={onKeyDown}
      />
      {abierto && resultados.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[60] mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-md"
          onMouseDown={() => { if (blurTimer.current) clearTimeout(blurTimer.current); }}
        >
          {resultados.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={i === activo}
              onMouseEnter={() => setActivo(i)}
              onClick={() => elegir(o.value)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm",
                i === activo ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
              )}
            >
              <span className="min-w-0 truncate">
                {o.label}
                {o.hint && <span className="ml-1 text-xs text-muted-foreground">{o.hint}</span>}
              </span>
              {o.derecha && <span className="shrink-0 tabular text-sm font-medium">{o.derecha}</span>}
            </li>
          ))}
        </ul>
      )}
      {abierto && q.trim() && resultados.length === 0 && (
        <div className="absolute z-[60] mt-1 w-full rounded-lg border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          Sin resultados
        </div>
      )}
    </div>
  );
}
```
- [ ] **Step 2: Verificar typecheck** — `npx tsc --noEmit` → sin errores nuevos. (Confirma que `cn` existe en `@/lib/utils` y que `bg-popover`/`bg-accent` son clases válidas del tema, usadas ya por `search-select.tsx`.)
- [ ] **Step 3: Commit**
```bash
git add src/components/ui/autocomplete.tsx
git commit -m "feat(ui): componente Autocomplete con teclado y popover"
```

---

## Task 5: Precio por cliente (schema vx11 + servicios)

**Files:** Modify `src/lib/db/schema.ts`, `src/lib/services/facturas.ts`, `src/lib/services/productos.ts`

- [ ] **Step 1: Añadir columna a vx11 (`productoUnidades`)** — dentro del objeto de columnas, tras `precioVenta`:
```typescript
    ultimoPrecioVenta: price("ultimo_precio_venta"),
```
- [ ] **Step 2: Generar y aplicar migración**
Run: `npm run db:generate` (genera `supabase/migrations/0003_*.sql` con `ALTER TABLE "vx11" ADD COLUMN "ultimo_precio_venta" numeric(12,2);`)
Run: `npm run db:migrate` (aplica; no interactivo)
- [ ] **Step 3: Actualizar `ultimoPrecioVenta` global al facturar** — en `src/lib/services/facturas.ts`, dentro de la transacción `crearFactura`, en el `for (const p of preparadas)` (después del `tx.insert(facturaDetalles)`), añadir:
```typescript
      await tx
        .update(productoUnidades)
        .set({ ultimoPrecioVenta: String(p.l.precioUnitario), updatedAt: new Date() })
        .where(and(eq(productoUnidades.productoId, p.l.productoId), eq(productoUnidades.unidadId, p.l.unidadId)));
```
Asegúrate de que `productoUnidades` esté importado de `@/lib/db/schema` en ese archivo (añádelo al import si falta). `and`, `eq` ya están importados.
- [ ] **Step 4: `listarProductosVenta` usa el global** — en `src/lib/services/productos.ts`, en el `.select({...})` de `listarProductosVenta` añade `ultimoPrecioVenta: productoUnidades.ultimoPrecioVenta,` y en el `.map(...)` cambia la línea del precio a:
```typescript
    precio: r.ultimoPrecioVenta ? Number(r.ultimoPrecioVenta) : (r.precioVenta ? Number(r.precioVenta) : 0),
```
- [ ] **Step 5: Servicio `ultimoPrecioPorCliente`** — añadir a `src/lib/services/facturas.ts` (export):
```typescript
/** Último precio cobrado de cada producto a un cliente (DISTINCT ON por producto, factura más reciente). */
export async function ultimoPrecioPorCliente(empresaId: number, clienteId: number): Promise<Record<number, number>> {
  const rows = await db
    .selectDistinctOn([facturaDetalles.productoId], {
      productoId: facturaDetalles.productoId,
      precio: facturaDetalles.precioUnitario,
    })
    .from(facturaDetalles)
    .innerJoin(facturas, eq(facturaDetalles.facturaId, facturas.id))
    .where(and(eq(facturas.empresaId, empresaId), eq(facturas.clienteId, clienteId)))
    .orderBy(facturaDetalles.productoId, desc(facturas.fecha), desc(facturas.id));
  return Object.fromEntries(rows.map((r) => [r.productoId, Number(r.precio)]));
}
```
Confirma que `desc` está importado de `drizzle-orm` en facturas.ts (si no, añádelo). `facturas` y `facturaDetalles` ya se usan en el archivo.
- [ ] **Step 6: Verificar** — `npx tsc --noEmit` sin errores; `npx vitest run` verde.
- [ ] **Step 7: Commit**
```bash
git add src/lib/db/schema.ts supabase/migrations src/lib/services/facturas.ts src/lib/services/productos.ts
git commit -m "feat(venta): ultimoPrecioVenta global (vx11) + ultimoPrecioPorCliente"
```

---

## Task 6: Rediseño de la pantalla de venta (POS)

**Files:** Modify `src/app/(app)/facturas/factura-form.tsx`, `src/app/(app)/facturas/actions.ts`

Lee primero ambos archivos. La `crearFacturaAction` actual recibe `lineasJson`, `clienteId`, `bodegaId`, `tipoVenta`, `fecha` del form y llama `crearFactura`. Mantén ese contrato (sigue enviando `lineasJson` con `{productoId, unidadId, cantidad, precioUnitario}`).

- [ ] **Step 1: Server action para precios por cliente** — en `src/app/(app)/facturas/actions.ts` añade:
```typescript
import { ultimoPrecioPorCliente } from "@/lib/services/facturas";

export async function preciosClienteAction(clienteId: number): Promise<Record<number, number>> {
  const c = await contexto();
  if (!c || !clienteId) return {};
  return ultimoPrecioPorCliente(c.ctx.empresaId, clienteId);
}
```
(Usa el mismo `contexto`/`contextoAccion` que ya importa el archivo. Si no lo importa, añádelo igual que en otras actions: `import { contextoAccion as contexto } from "@/lib/auth/contexto";`.)

- [ ] **Step 2: Reescribir `factura-form.tsx`** con el flujo POS. Reemplaza TODO el archivo por:
```tsx
"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { crearFacturaAction, preciosClienteAction, type FacturaState } from "./actions";
import { Autocomplete } from "@/components/ui/autocomplete";
import { buscarProductos, agregarOIncrementar, precioSugerido, type LineaCarrito } from "@/lib/domain/venta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, ShoppingBag, Trash2 } from "lucide-react";

interface Cliente { id: number; nombre: string }
interface Bodega { id: number; nombre: string }
interface Prod { id: number; nombre: string; sku: string; unidadBaseId: number; unidadAbrev: string; precio: number }

const money = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

function Vender() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-14 w-full text-base" disabled={pending}>
      {pending ? <Loader2 className="size-5 animate-spin" /> : <ShoppingBag className="size-5" />}
      Registrar venta
    </Button>
  );
}

export function FacturaForm({ clientes, bodegas, productos, hoy }: { clientes: Cliente[]; bodegas: Bodega[]; productos: Prod[]; hoy: string }) {
  const [state, action] = useActionState<FacturaState, FormData>(crearFacturaAction, {});
  const [clienteId, setClienteId] = useState("");
  const [bodegaId, setBodegaId] = useState(bodegas[0] ? String(bodegas[0].id) : "");
  const [tipo, setTipo] = useState<"contado" | "credito">("contado");
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [preciosCliente, setPreciosCliente] = useState<Record<number, number>>({});
  const [, startTransition] = useTransition();

  const prodPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const base = useMemo(() => Object.fromEntries(productos.map((p) => [p.id, p.precio])), [productos]);
  const clienteNombre = useMemo(() => clientes.find((c) => String(c.id) === clienteId)?.nombre ?? "", [clientes, clienteId]);

  const opcionesCliente = useMemo(() => clientes.map((c) => ({ value: String(c.id), label: c.nombre })), [clientes]);
  const opcionesProducto = useMemo(
    () => productos.map((p) => ({ value: String(p.id), label: p.nombre, hint: `(${p.sku})`, derecha: money(precioSugerido(p.id, { porCliente: preciosCliente, base })) })),
    [productos, preciosCliente, base],
  );

  function elegirCliente(value: string) {
    setClienteId(value);
    startTransition(async () => setPreciosCliente(await preciosClienteAction(Number(value))));
  }
  function agregarProducto(value: string) {
    const id = Number(value);
    setCarrito((c) => agregarOIncrementar(c, id, precioSugerido(id, { porCliente: preciosCliente, base })));
  }
  function setLinea(id: number, patch: Partial<LineaCarrito>) {
    setCarrito((c) => c.map((l) => (l.productoId === id ? { ...l, ...patch } : l)));
  }
  function quitar(id: number) {
    setCarrito((c) => c.filter((l) => l.productoId !== id));
  }

  const total = useMemo(() => carrito.reduce((a, l) => a + l.cantidad * l.precioUnitario, 0), [carrito]);
  const lineasJson = JSON.stringify(
    carrito
      .filter((l) => l.cantidad > 0)
      .map((l) => {
        const p = prodPorId.get(l.productoId)!;
        return { productoId: l.productoId, unidadId: p.unidadBaseId, cantidad: l.cantidad, precioUnitario: l.precioUnitario };
      }),
  );

  return (
    <form action={action} className="space-y-6 pb-28">
      <input type="hidden" name="lineasJson" value={lineasJson} />
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="bodegaId" value={bodegaId} />
      <input type="hidden" name="tipoVenta" value={tipo} />
      <input type="hidden" name="fecha" value={hoy} />

      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="space-y-2">
          <Label className="text-base">¿A quién le vendes?</Label>
          <Autocomplete opciones={opcionesCliente} onSelect={elegirCliente} filtrar={(o, q) => buscarProductos(o.map((x) => ({ id: 0, nombre: x.label, sku: "", ...x })), q, 8)} placeholder={clienteNombre || "Elegir cliente…"} inputClassName="h-12" />
        </div>
        <div className="space-y-2">
          <Label className="text-base">¿Cómo paga?</Label>
          <div className="grid grid-cols-2 gap-3">
            {(["contado", "credito"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)} className={cn("h-12 rounded-lg border text-sm font-medium capitalize transition-colors", tipo === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-muted")}>
                {t === "contado" ? "Contado" : "Crédito"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Bodega</Label>
          <select value={bodegaId} onChange={(e) => setBodegaId(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm">
            {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base">¿Qué vendes?</Label>
        <Autocomplete
          opciones={opcionesProducto}
          onSelect={agregarProducto}
          filtrar={(o, q) => buscarProductos(o.map((x) => ({ id: Number(x.value), nombre: x.label, sku: x.hint ?? "" })), q, 8).map((m) => o.find((x) => x.value === String(m.id))!)}
          placeholder="Buscar producto…"
          limpiarAlSeleccionar
          inputClassName="h-12"
        />

        {carrito.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">Busca un producto arriba para agregarlo.</p>
        ) : (
          carrito.map((l) => {
            const p = prodPorId.get(l.productoId)!;
            const sub = l.cantidad * l.precioUnitario;
            return (
              <div key={l.productoId} className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{p.nombre}</span>
                  <Button type="button" variant="ghost" size="icon" className="size-9 text-destructive" onClick={() => quitar(l.productoId)}><Trash2 className="size-5" /></Button>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Cantidad ({p.unidadAbrev})</Label>
                    <Input type="number" min="0" step="0.001" inputMode="decimal" className="h-12 text-center text-lg" value={l.cantidad} onChange={(e) => setLinea(l.productoId, { cantidad: e.target.valueAsNumber || 0 })} />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Precio c/u</Label>
                    <Input type="number" min="0" step="0.01" inputMode="decimal" className="h-12 text-lg" value={l.precioUnitario} onChange={(e) => setLinea(l.productoId, { precioUnitario: e.target.valueAsNumber || 0 })} />
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">Subtotal: <span className="tabular font-medium text-foreground">{money(sub)}</span></div>
              </div>
            );
          })
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Total a {tipo === "contado" ? "cobrar" : "crédito"}</div>
            <div className="tabular text-2xl font-bold">{money(total)}</div>
          </div>
          <div className="w-44"><Vender /></div>
        </div>
      </div>
    </form>
  );
}
```
NOTA sobre el `filtrar` del cliente: reusa `buscarProductos` adaptando `{label}`→`{nombre}`. Si te resulta más limpio, crea un helper local `filtrarOpciones(opciones, q)` que use `buscarProductos` sobre `{id:Number(value), nombre:label, sku:hint}`; mantén el comportamiento (prefijo>substring, límite 8). Lo importante: el `Autocomplete` recibe `opciones` y un `filtrar` que devuelve `OpcionAuto[]`.

- [ ] **Step 3: Verificar build** — `npm run build` → compila; ruta `/facturas/nueva` ok.
- [ ] **Step 4: Commit**
```bash
git add "src/app/(app)/facturas/factura-form.tsx" "src/app/(app)/facturas/actions.ts"
git commit -m "feat(venta): pantalla POS con autocomplete y precio por cliente"
```

---

## FRENTE B — Filtros avanzados

## Task 7: Dominio `filtros` (TDD)

**Files:** Create `src/lib/domain/filtros.ts`, `src/lib/domain/filtros.test.ts`

- [ ] **Step 1: Test que falla**
```typescript
import { describe, it, expect } from "vitest";
import { aplicarFiltro, limpiarFiltros, filtrosActivos, type FiltroDef } from "./filtros";

const defs: FiltroDef[] = [
  { key: "estado", label: "Estado", tipo: "select", opciones: [{ value: "activo", label: "Activo" }, { value: "inactivo", label: "Inactivo" }] },
  { key: "desde", label: "Desde", tipo: "fecha" },
];
const sp = (s: string) => new URLSearchParams(s);

describe("aplicarFiltro", () => {
  it("pone el valor y resetea page", () => {
    const r = aplicarFiltro(sp("page=3"), "estado", "activo");
    expect(r.get("estado")).toBe("activo");
    expect(r.has("page")).toBe(false);
  });
  it("valor vacío borra el filtro", () => {
    expect(aplicarFiltro(sp("estado=activo"), "estado", "").has("estado")).toBe(false);
  });
});
describe("limpiarFiltros", () => {
  it("borra q y todas las keys", () => {
    const r = limpiarFiltros(sp("q=x&estado=activo&desde=2026-01-01&page=2"), ["estado", "desde"]);
    expect(r.toString()).toBe("");
  });
});
describe("filtrosActivos", () => {
  it("devuelve chips legibles (usa label de opción en selects)", () => {
    const r = filtrosActivos(sp("estado=activo&desde=2026-01-01"), defs);
    expect(r).toEqual([
      { key: "estado", label: "Estado", valor: "Activo" },
      { key: "desde", label: "Desde", valor: "2026-01-01" },
    ]);
  });
  it("ignora params que no son filtros declarados", () => {
    expect(filtrosActivos(sp("q=hola&page=2"), defs)).toEqual([]);
  });
});
```
- [ ] **Step 2: Verificar que falla** → FAIL.
- [ ] **Step 3: Implementar**
```typescript
export interface FiltroDef {
  key: string;
  label: string;
  tipo: "select" | "fecha" | "rango-fecha";
  opciones?: { value: string; label: string }[];
}

export function aplicarFiltro(params: URLSearchParams, key: string, value: string): URLSearchParams {
  const sp = new URLSearchParams(params.toString());
  if (value) sp.set(key, value);
  else sp.delete(key);
  sp.delete("page");
  return sp;
}

export function limpiarFiltros(params: URLSearchParams, keys: string[]): URLSearchParams {
  const sp = new URLSearchParams(params.toString());
  sp.delete("q");
  sp.delete("page");
  for (const k of keys) sp.delete(k);
  return sp;
}

export function filtrosActivos(
  params: URLSearchParams,
  defs: FiltroDef[],
): { key: string; label: string; valor: string }[] {
  const out: { key: string; label: string; valor: string }[] = [];
  for (const d of defs) {
    const v = params.get(d.key);
    if (!v) continue;
    const legible = d.opciones?.find((o) => o.value === v)?.label ?? v;
    out.push({ key: d.key, label: d.label, valor: legible });
  }
  return out;
}
```
- [ ] **Step 4: Verificar que pasa** → PASS.
- [ ] **Step 5: Commit**
```bash
git add src/lib/domain/filtros.ts src/lib/domain/filtros.test.ts
git commit -m "feat(filtros): aplicarFiltro/limpiarFiltros/filtrosActivos (TDD)"
```

---

## Task 8: Extender `filtrarPaginar` con predicado (TDD)

**Files:** Modify `src/lib/domain/listado.ts`, `src/lib/domain/listado.test.ts`

- [ ] **Step 1: Test que falla** (añadir a listado.test.ts; revisa el nombre del archivo de test existente — si no existe, créalo importando `filtrarPaginar`)
```typescript
import { filtrarPaginar } from "./listado";

describe("filtrarPaginar con filtro extra", () => {
  const items = [{ n: "a", activo: true }, { n: "b", activo: false }, { n: "c", activo: true }];
  it("aplica el predicado además del texto", () => {
    const r = filtrarPaginar(items, { q: "", page: 1, pageSize: 10, texto: (i) => i.n, filtro: (i) => i.activo });
    expect(r.items.map((i) => i.n)).toEqual(["a", "c"]);
    expect(r.total).toBe(2);
  });
  it("sin filtro se comporta como antes", () => {
    const r = filtrarPaginar(items, { q: "b", page: 1, pageSize: 10, texto: (i) => i.n });
    expect(r.items.map((i) => i.n)).toEqual(["b"]);
  });
});
```
- [ ] **Step 2: Verificar que falla** → FAIL (la prop `filtro` no existe en el tipo / no se aplica).
- [ ] **Step 3: Implementar** — en `listado.ts`, añade `filtro?: (item: T) => boolean` a `OpcionesListado<T>` y aplícalo:
```typescript
// en la interfaz OpcionesListado<T>: añade
  filtro?: (item: T) => boolean;

// en filtrarPaginar, cambia el cálculo de `filtrados`:
  const porTexto = t ? items.filter((i) => texto(i).toLowerCase().includes(t)) : items;
  const filtrados = filtro ? porTexto.filter(filtro) : porTexto;
```
(Destructura `filtro` junto a `q, page, pageSize, texto`.)
- [ ] **Step 4: Verificar que pasa** → PASS; corre toda la suite `npx vitest run`.
- [ ] **Step 5: Commit**
```bash
git add src/lib/domain/listado.ts src/lib/domain/listado.test.ts
git commit -m "feat(filtros): filtrarPaginar admite predicado de filtro (TDD)"
```

---

## Task 9: Componente `FiltroBar`

**Files:** Create `src/components/ui/filtro-bar.tsx`

Usa `Popover` de base-ui (revisa `src/components/ui/popover.tsx` y cómo lo usa otro componente, p. ej. `search-select` usa Popover). Sincroniza `?q=` + filtros en la URL.

- [ ] **Step 1: Crear el componente**
```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { aplicarFiltro, limpiarFiltros, filtrosActivos, type FiltroDef } from "@/lib/domain/filtros";
import { Search, SlidersHorizontal, X } from "lucide-react";

export function FiltroBar({ placeholder = "Buscar…", filtros = [] }: { placeholder?: string; filtros?: FiltroDef[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const primera = useRef(true);

  // Debounce de la búsqueda → ?q=
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    const t = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (q.trim()) sp.set("q", q.trim()); else sp.delete("q");
      sp.delete("page");
      router.replace(`${pathname}?${sp.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activos = filtrosActivos(params, filtros);
  const tieneAlgo = !!params.get("q") || activos.length > 0;

  function cambiar(key: string, value: string) {
    router.replace(`${pathname}?${aplicarFiltro(params, key, value).toString()}`);
  }
  function limpiarTodo() {
    setQ("");
    router.replace(`${pathname}?${limpiarFiltros(params, filtros.map((f) => f.key)).toString()}`);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pl-9" />
        </div>
        {filtros.length > 0 && (
          <Popover>
            <PopoverTrigger render={<Button variant="outline" className="shrink-0" />}>
              <SlidersHorizontal className="size-4" /> Filtros
              {activos.length > 0 && <Badge className="ml-1 size-5 justify-center p-0">{activos.length}</Badge>}
            </PopoverTrigger>
            <PopoverContent align="end" className="z-[100] w-72 space-y-3">
              {filtros.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  {f.tipo === "select" ? (
                    <select value={params.get(f.key) ?? ""} onChange={(e) => cambiar(f.key, e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm">
                      <option value="">Todos</option>
                      {f.opciones?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <Input type="date" value={params.get(f.key) ?? ""} onChange={(e) => cambiar(f.key, e.target.value)} className="h-10" />
                  )}
                </div>
              ))}
            </PopoverContent>
          </Popover>
        )}
        {tieneAlgo && (
          <Button variant="ghost" className="shrink-0" onClick={limpiarTodo}>Limpiar</Button>
        )}
      </div>
      {activos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activos.map((a) => (
            <button key={a.key} type="button" onClick={() => cambiar(a.key, "")} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs">
              <span className="text-muted-foreground">{a.label}:</span> {a.valor}
              <X className="size-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```
- [ ] **Step 2: Verificar contratos** — abre `src/components/ui/popover.tsx`: confirma exports `Popover`, `PopoverTrigger`, `PopoverContent` y que `PopoverTrigger` usa `render={<Button/>}` (patrón base-ui, igual que `DropdownMenuTrigger`). Si difiere, adapta. Confirma `Badge` acepta `className`. Run `npx tsc --noEmit`.
- [ ] **Step 3: Commit**
```bash
git add src/components/ui/filtro-bar.tsx
git commit -m "feat(ui): FiltroBar (búsqueda + filtros + chips + limpiar)"
```

---

## Task 10: Integrar `FiltroBar` en `ListaFiltrable` (compatible hacia atrás)

**Files:** Modify `src/components/lista-filtrable.tsx`

- [ ] **Step 1: Añadir prop `filtros` y usar FiltroBar**
- Añade el import: `import { FiltroBar } from "@/components/ui/filtro-bar";` y `import type { FiltroDef } from "@/lib/domain/filtros";`
- En `Props<T>` añade: `filtros?: FiltroDef[];`
- Destructura `filtros` en la firma.
- Reemplaza el bloque `<div className="mb-4"><SearchFilter placeholder={searchPlaceholder} /></div>` por:
```tsx
      <div className="mb-4">
        <FiltroBar placeholder={searchPlaceholder} filtros={filtros} />
      </div>
```
- Quita el import de `SearchFilter` si queda sin uso (déjalo si otro archivo lo usa; aquí ya no). Mantén todo lo demás igual.
- [ ] **Step 2: Verificar build** — `npm run build`. Todas las páginas que ya usan `ListaFiltrable` sin `filtros` siguen funcionando (FiltroBar sin filtros = solo búsqueda, igual que antes).
- [ ] **Step 3: Commit**
```bash
git add src/components/lista-filtrable.tsx
git commit -m "feat(filtros): ListaFiltrable usa FiltroBar (compatible)"
```

---

## Task 11: Filtros en Productos

**Files:** Modify `src/app/(app)/productos/page.tsx`

- [ ] **Step 1: Leer params, declarar filtros y predicado** — Lee el archivo. Cambia la firma de `searchParams` a incluir los filtros y construye el predicado:
```typescript
}: {
  searchParams: Promise<{ q?: string; page?: string; categoria?: string; estado?: string; stock?: string }>;
}) {
  // ...
  const { q = "", page: pageRaw, categoria, estado, stock } = await searchParams;
  // ...después de cargar `todos` y `categorias`:
  const filtros = [
    { key: "categoria", label: "Categoría", tipo: "select" as const, opciones: categorias.map((c) => ({ value: String(c.id), label: c.nombre })) },
    { key: "estado", label: "Estado", tipo: "select" as const, opciones: [{ value: "activo", label: "Activos" }, { value: "inactivo", label: "Inactivos" }] },
    { key: "stock", label: "Stock", tipo: "select" as const, opciones: [{ value: "con", label: "Con existencias" }, { value: "sin", label: "Sin existencias" }] },
  ];
  const filtro = (p: Producto) => {
    if (categoria && String(p.categoriaId ?? "") !== categoria) return false;
    if (estado === "activo" && !p.activo) return false;
    if (estado === "inactivo" && p.activo) return false;
    // 'stock' depende de existencias; si el listado de productos no trae stock, omite este filtro o cárgalo. Ver nota.
    return true;
  };
```
NOTA: si `listarProductos` NO incluye existencias por producto, **elimina la opción `stock`** de `filtros` y su rama del predicado en esta tarea (no inventes un campo inexistente). Verifica el tipo `Producto`. Mantén categoría y estado, que sí existen.
- [ ] **Step 2: Pasar `filtro` y `filtros`** — en la llamada a `filtrarPaginar(todos, { q, page, pageSize, texto, filtro })` añade `filtro`, y al `<ListaFiltrable ... />` añade `filtros={filtros}`.
- [ ] **Step 3: Build** — `npm run build`.
- [ ] **Step 4: Commit**
```bash
git add "src/app/(app)/productos/page.tsx"
git commit -m "feat(filtros): productos (categoría, estado, stock)"
```

---

## Task 12: Filtros en Facturas

**Files:** Modify `src/app/(app)/facturas/page.tsx`

- [ ] **Step 1: Leer el archivo** y confirmar el tipo de fila y campos disponibles (`tipoVenta`, `estado`, `fecha`).
- [ ] **Step 2: Declarar filtros + predicado**
```typescript
  const { q = "", page: pageRaw, tipoVenta, estado, desde, hasta } = await searchParams; // amplía el tipo de searchParams
  const filtros = [
    { key: "tipoVenta", label: "Tipo", tipo: "select" as const, opciones: [{ value: "contado", label: "Contado" }, { value: "credito", label: "Crédito" }] },
    { key: "estado", label: "Estado", tipo: "select" as const, opciones: [{ value: "emitida", label: "Emitida" }, { value: "anulada", label: "Anulada" }] },
    { key: "desde", label: "Desde", tipo: "fecha" as const },
    { key: "hasta", label: "Hasta", tipo: "fecha" as const },
  ];
  const filtro = (f: Fila) => {
    if (tipoVenta && f.factura.tipoVenta !== tipoVenta) return false;
    if (estado && f.factura.estado !== estado) return false;
    if (desde && f.factura.fecha < desde) return false;
    if (hasta && f.factura.fecha > hasta) return false;
    return true;
  };
```
ADAPTA los nombres reales (la fila puede ser `f.factura` o `f` directo; los valores de `estado` reales pueden diferir — léelos del schema/servicio). Usa los valores de enum reales.
- [ ] **Step 3: Pasar `filtro` a `filtrarPaginar` y `filtros` a `ListaFiltrable`.**
- [ ] **Step 4: Build + Commit**
```bash
git add "src/app/(app)/facturas/page.tsx"
git commit -m "feat(filtros): facturas (tipo, estado, fechas)"
```

---

## Task 13: Filtros en Cuentas por pagar y por cobrar

**Files:** Modify `src/app/(app)/cuentas-pagar/page.tsx`, `src/app/(app)/cuentas-cobrar/page.tsx`

Ambas calculan el estado con `estadoCartera(saldo, vencimiento, hoy)` → `"pendiente" | "vencida" | "pagada"`.

- [ ] **Step 1: cuentas-pagar** — añade filtros + predicado:
```typescript
  const { q = "", page: pageRaw, estado, desde, hasta } = await searchParams; // amplía el tipo
  const filtros = [
    { key: "estado", label: "Estado", tipo: "select" as const, opciones: [{ value: "pendiente", label: "Pendiente" }, { value: "vencida", label: "Vencida" }, { value: "pagada", label: "Pagada" }] },
    { key: "desde", label: "Vence desde", tipo: "fecha" as const },
    { key: "hasta", label: "Vence hasta", tipo: "fecha" as const },
  ];
  const filtro = (f: Fila) => {
    const est = estadoCartera(Number(f.cuenta.saldoPendiente), f.cuenta.fechaVencimiento, hoy);
    if (estado && est !== estado) return false;
    if (desde && f.cuenta.fechaVencimiento < desde) return false;
    if (hasta && f.cuenta.fechaVencimiento > hasta) return false;
    return true;
  };
```
Pasa `filtro` a `filtrarPaginar` y `filtros` a `ListaFiltrable`.
- [ ] **Step 2: cuentas-cobrar** — réplica análoga. Lee el archivo; usa el campo de fila real (probablemente `f.cuenta` con `saldoPendiente`/`fechaVencimiento`, o el nombre que tenga). Mismos filtros (estado, desde, hasta).
- [ ] **Step 3: Build** — `npm run build`.
- [ ] **Step 4: Commit**
```bash
git add "src/app/(app)/cuentas-pagar/page.tsx" "src/app/(app)/cuentas-cobrar/page.tsx"
git commit -m "feat(filtros): cuentas por pagar y por cobrar (estado, vencimiento)"
```

---

## Task 14: Filtros en Terceros

**Files:** Modify `src/app/(app)/terceros/page.tsx`

- [ ] **Step 1: Leer el archivo**, confirmar campos (`tipo`: proveedor/cliente/ambos; `activo`).
- [ ] **Step 2: Filtros + predicado**
```typescript
  const { q = "", page: pageRaw, tipo, activo } = await searchParams; // amplía el tipo
  const filtros = [
    { key: "tipo", label: "Tipo", tipo: "select" as const, opciones: [{ value: "cliente", label: "Cliente" }, { value: "proveedor", label: "Proveedor" }, { value: "ambos", label: "Ambos" }] },
    { key: "activo", label: "Estado", tipo: "select" as const, opciones: [{ value: "1", label: "Activos" }, { value: "0", label: "Inactivos" }] },
  ];
  const filtro = (t: Tercero) => {
    if (tipo && t.tipo !== tipo) return false;
    if (activo === "1" && !t.activo) return false;
    if (activo === "0" && t.activo) return false;
    return true;
  };
```
ADAPTA el tipo de fila real (`Tercero`) y nombres. Pasa `filtro`/`filtros`.
- [ ] **Step 3: Build + Commit**
```bash
git add "src/app/(app)/terceros/page.tsx"
git commit -m "feat(filtros): terceros (tipo, activo)"
```

---

## Task 15: Verificación final + deploy + E2E

- [ ] **Step 1: Suite completa** — `npx vitest run` → todo verde (incluye venta.test, filtros.test, listado.test).
- [ ] **Step 2: Build limpio** — `npm run build`.
- [ ] **Step 3: Push (deploy)** — `git push origin main`.
- [ ] **Step 4: Deploy vivo** — `until curl -s -o /dev/null -w "%{http_code}" https://vertexsm.vercel.app/login | grep -q 200; do sleep 5; done; curl -s -o /dev/null -w "venta: %{http_code}\n" https://vertexsm.vercel.app/facturas/nueva` → `307`.
- [ ] **Step 5: E2E manual**
  1. Vender a Cliente A: buscar producto (autocomplete), agregar, repetir mismo producto (suma cantidad), ajustar precio al peso, registrar.
  2. Nueva venta a Cliente A: el mismo producto parte del precio que le cobraste antes (editable).
  3. Nueva venta a Cliente B: el mismo producto parte del precio global/configurado, no del de A.
  4. En Productos/Facturas: aplicar un filtro → aparece chip + badge en "Filtros" + "Limpiar"; recargar la página conserva el filtro (está en la URL); "Limpiar" lo borra.

---

## Notas de cierre
- Si `Popover` (base-ui) expone props distintas a las asumidas en `FiltroBar`, ajústalo al contrato real de `src/components/ui/popover.tsx`.
- El filtro de `stock` en Productos solo se incluye si el listado ya trae existencias; si no, se omite (no añadir queries nuevas en este plan).
- `Autocomplete` filtra en memoria sobre la lista ya cargada (productos/clientes de la empresa). Si en el futuro hay miles de productos, mover el filtrado al server con debounce.

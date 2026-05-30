# Comprar y pagar (pedir/recibir/vender por unidad/cuadre/calidad) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Que comprar/recibir/vender respete las unidades genéricas configurables (bulto, arroba, caja… por producto): recibir todo o ajustar lo que llegó, vender eligiendo la unidad (default = última usada) con la unidad resaltada, cuadrar con notas (faltante/merma/sobrante) ligadas al proveedor sugerido, y un reporte de calidad por proveedor.

**Architecture:** Lógica pura testeada en `src/lib/domain` (`nota-inventario.ts`, `venta.ts`, `conversion.ts` ya existente). Servicios en `src/lib/services` (pedidos, facturas, notas-inventario, productos, reportes). UI en `src/app/(app)`. NINGUNA unidad está horneada: todo sale de `unidadesMedida` + `productoUnidades` (factor de conversión por producto). `crearFactura` y `recibirPedido` ya convierten `unidadId`→base con `cantidadEnBase`.

**Tech Stack:** Next.js 15 (RSC, Server Actions), Drizzle + postgres-js (Supabase), Vitest (TDD), Tailwind v4 + base-ui.

---

## Convenciones (leer)
- Dev: data desechable; `npm run db:generate` + `npm run db:migrate` libres.
- Tests dominio: `npx vitest run src/lib/domain/<archivo>`. Estilo `import { describe, it, expect } from "vitest"`.
- `Contexto` = `{ empresaId, usuarioId, ip? }`. `money`/`qty` columnas numéricas → string (`Number()`/`String()`).
- Componentes: `Modal`, `Field`, `SearchSelect` (con `onValueChange`), `DatePicker`, `Button`, `Input`, `Switch`, `Tabs`, `FormSection`.
- DISTINCT ON soportado por Drizzle: `db.selectDistinctOn([col], {...})`.
- `crearFactura(data, ctx)` recibe `lineas: {productoId, unidadId, cantidad, precioUnitario}[]` y ya convierte por `factorDe`/`baseDe`.
- `recibirPedido(id, ctx)` HOY recibe todo (pone `cantidadRecibida = cantidad`) y crea CxP por `pedido.total`.
- `TIPOS_NOTA` (domain/nota-inventario.ts) ya tiene: `diferencia_positiva`(+1), `ajuste_entrada`(+1), `merma`(-1), `dano`(-1), `diferencia_negativa`(-1), `ajuste_salida`(-1). "Faltante"=`diferencia_negativa`, "Sobrante"=`diferencia_positiva`.
- `notasInventario` (vx18) ya tiene columnas `proveedorId`, `pedidoId`, `tipo`, `cantidad`, `motivo`.

---

## Task 1: Dominio — `esNovedadProveedor` (TDD)

**Files:** Modify `src/lib/domain/nota-inventario.ts`, `src/lib/domain/nota-inventario.test.ts`

- [ ] **Step 1: Test que falla** (añadir al test existente; si no existe, crearlo con `import { signoNota, esNovedadProveedor } from "./nota-inventario"`)
```typescript
import { esNovedadProveedor } from "./nota-inventario";

describe("esNovedadProveedor", () => {
  it("faltante, merma y daño son novedad del proveedor (calidad)", () => {
    expect(esNovedadProveedor("diferencia_negativa")).toBe(true);
    expect(esNovedadProveedor("merma")).toBe(true);
    expect(esNovedadProveedor("dano")).toBe(true);
  });
  it("sobrante y ajustes internos NO son novedad del proveedor", () => {
    expect(esNovedadProveedor("diferencia_positiva")).toBe(false);
    expect(esNovedadProveedor("ajuste_entrada")).toBe(false);
    expect(esNovedadProveedor("ajuste_salida")).toBe(false);
  });
});
```
- [ ] **Step 2: Verificar que falla** — `npx vitest run src/lib/domain/nota-inventario` → FAIL ("esNovedadProveedor is not a function").
- [ ] **Step 3: Implementar** (añadir a nota-inventario.ts)
```typescript
/** Novedades atribuibles a la calidad del proveedor (para alertas/reporte). */
const NOVEDAD_PROVEEDOR = new Set(["diferencia_negativa", "merma", "dano"]);
export function esNovedadProveedor(tipo: string): boolean {
  return NOVEDAD_PROVEEDOR.has(tipo);
}
```
- [ ] **Step 4: Verificar que pasa** — PASS.
- [ ] **Step 5: Commit**
```bash
git add src/lib/domain/nota-inventario.ts src/lib/domain/nota-inventario.test.ts
git commit -m "feat(compras): esNovedadProveedor (TDD)"
```

---

## Task 2: Dominio — `sugerirUnidadVenta` (TDD)

**Files:** Modify `src/lib/domain/venta.ts`, `src/lib/domain/venta.test.ts`

Elige la unidad por defecto al agregar un producto al carrito: la última usada para venderlo; si no hay, la unidad base.

- [ ] **Step 1: Test que falla**
```typescript
import { sugerirUnidadVenta } from "./venta";

describe("sugerirUnidadVenta", () => {
  it("usa la última unidad vendida si existe", () => {
    expect(sugerirUnidadVenta(7, { 7: 3 }, 1)).toBe(3);
  });
  it("cae a la unidad base si no hay última", () => {
    expect(sugerirUnidadVenta(7, {}, 1)).toBe(1);
  });
});
```
- [ ] **Step 2: Verificar que falla** → FAIL.
- [ ] **Step 3: Implementar** (añadir a venta.ts)
```typescript
/** Unidad sugerida al vender: la última usada para ese producto, o la base. */
export function sugerirUnidadVenta(
  productoId: number,
  ultimaUnidadPorProducto: Record<number, number>,
  unidadBaseId: number,
): number {
  return ultimaUnidadPorProducto[productoId] ?? unidadBaseId;
}
```
- [ ] **Step 4: Verificar que pasa** → PASS.
- [ ] **Step 5: Commit**
```bash
git commit -am "feat(venta): sugerirUnidadVenta (TDD)"
```

---

## Task 3: Servicio — recepción parcial (`recibirPedido` con recepciones)

**Files:** Modify `src/lib/services/pedidos.ts`

Permite recibir todo (igual que hoy) o pasar las cantidades realmente recibidas por línea.

- [ ] **Step 1: Cambiar la firma y la cantidad usada** — en `recibirPedido`:
  - Cambia la firma a:
    ```typescript
    export async function recibirPedido(
      id: number,
      ctx: Contexto,
      recepciones?: Record<number, number>, // detalleId -> cantidad recibida (en la unidad de la línea)
    ): Promise<void> {
    ```
  - Dentro del `for`, reemplaza `const cantidad = Number(d.cantidad);` por:
    ```typescript
    const cantidad = recepciones ? (recepciones[d.id] ?? 0) : Number(d.cantidad);
    ```
  - Salta líneas con `cantidad <= 0` (no recibidas): justo después, añade `if (cantidad <= 0) { continue; }` (antes de calcular `cantidadBase`). Mueve el `update(pedidoDetalles).set({cantidadRecibida})` para que solo corra cuando `cantidad > 0` (queda dentro del bloque, ok porque el `continue` salta).
- [ ] **Step 2: CxP por el valor recibido + estado parcial** — reemplaza el bloque de Cuenta por pagar + estado por:
  ```typescript
    // Valor realmente recibido (suma de líneas recibidas a su precio).
    const totalRecibido = pedido.detalles.reduce((acc, d) => {
      const cant = recepciones ? (recepciones[d.id] ?? 0) : Number(d.cantidad);
      return acc + cant * Number(d.precioUnitario);
    }, 0) + (recepciones ? 0 : Number(pedido.costosAdicionales));
    const valorCxP = recepciones ? totalRecibido : Number(pedido.total);

    const venc = new Date(pedido.fecha);
    venc.setDate(venc.getDate() + diasCredito);
    await tx.insert(cuentasPorPagar).values({
      empresaId: ctx.empresaId,
      proveedorId: pedido.proveedorId,
      pedidoId: pedido.id,
      numeroFactura: pedido.numero,
      fechaFactura: pedido.fecha,
      fechaVencimiento: venc.toISOString().slice(0, 10),
      valorTotal: String(valorCxP),
      saldoPendiente: String(valorCxP),
    });

    const completo = !recepciones || pedido.detalles.every((d) => (recepciones[d.id] ?? 0) >= Number(d.cantidad));
    await tx
      .update(pedidos)
      .set({
        estado: completo ? "recibido" : "parcial",
        fechaRecepcion: new Date(),
        usuarioRecibeId: ctx.usuarioId,
        updatedAt: new Date(),
      })
      .where(eq(pedidos.id, pedido.id));
  ```
  (El `registrarAuditoria` que sigue queda igual; cambia `registroNuevo: { estado: completo ? "recibido" : "parcial" }`.)
- [ ] **Step 3: Verificar typecheck** — `npx tsc --noEmit` sin errores.
- [ ] **Step 4: Commit**
```bash
git add src/lib/services/pedidos.ts
git commit -m "feat(compras): recibirPedido admite cantidades recibidas (parcial) y CxP por lo recibido"
```

---

## Task 4: Servicio — `ultimoProveedorDeProducto`

**Files:** Modify `src/lib/services/pedidos.ts`

- [ ] **Step 1: Implementar** (export nuevo; usa pedidos recibidos del producto, más reciente)
```typescript
import { pedidoDetalles, pedidos as pedidosT } from "@/lib/db/schema"; // si no están ya importados (pedidos ya está como `pedidos`)
import { desc, sql } from "drizzle-orm"; // añade lo que falte a los imports existentes

/** Proveedor del último pedido (recibido/parcial) que incluyó este producto. */
export async function ultimoProveedorDeProducto(empresaId: number, productoId: number): Promise<number | null> {
  const [row] = await db
    .select({ proveedorId: pedidos.proveedorId })
    .from(pedidoDetalles)
    .innerJoin(pedidos, eq(pedidoDetalles.pedidoId, pedidos.id))
    .where(and(eq(pedidos.empresaId, empresaId), eq(pedidoDetalles.productoId, productoId)))
    .orderBy(desc(pedidos.fechaRecepcion), desc(pedidos.id))
    .limit(1);
  return row?.proveedorId ?? null;
}
```
(Confirma que `pedidos`, `pedidoDetalles`, `and`, `eq`, `desc` estén importados en el archivo; añade los que falten. Borra el import de ejemplo `pedidosT` si no lo usas.)
- [ ] **Step 2: tsc** sin errores.
- [ ] **Step 3: Commit**
```bash
git commit -am "feat(compras): ultimoProveedorDeProducto"
```

---

## Task 5: Servicio — unidades vendibles + última unidad usada

**Files:** Modify `src/lib/services/productos.ts`, `src/lib/services/facturas.ts`

- [ ] **Step 1: `listarProductosVenta` incluye las presentaciones vendibles** — Lee la función. Tras obtener `rows` (productos con su precio base), carga las presentaciones vendibles y adjúntalas:
```typescript
import { productoUnidades, unidadesMedida } from "@/lib/db/schema"; // unidadesMedida ya está

// dentro de listarProductosVenta, tras armar `rows`:
const ids = rows.map((r) => r.id);
const presRaw = ids.length
  ? await db
      .select({
        productoId: productoUnidades.productoId,
        unidadId: productoUnidades.unidadId,
        abrev: unidadesMedida.abreviatura,
        nombre: unidadesMedida.nombre,
        factor: productoUnidades.factorConversion,
        precio: productoUnidades.precioVenta,
      })
      .from(productoUnidades)
      .innerJoin(unidadesMedida, eq(productoUnidades.unidadId, unidadesMedida.id))
      .where(and(inArray(productoUnidades.productoId, ids), eq(productoUnidades.permiteVenta, true)))
  : [];
const presPorProd = new Map<number, { unidadId: number; abrev: string; factor: number; precio: number | null }[]>();
for (const p of presRaw) {
  const arr = presPorProd.get(p.productoId) ?? [];
  arr.push({ unidadId: p.unidadId, abrev: p.abrev, factor: Number(p.factor), precio: p.precio ? Number(p.precio) : null });
  presPorProd.set(p.productoId, arr);
}
```
Y en el `return rows.map(...)`, añade a cada producto:
```typescript
    unidades: (() => {
      const base = { unidadId: r.unidadBaseId, abrev: r.unidadAbrev, factor: 1, precio: r.precioVenta ? Number(r.precioVenta) : 0 };
      const otras = (presPorProd.get(r.id) ?? []).filter((u) => u.unidadId !== r.unidadBaseId);
      return [base, ...otras]; // base primero
    })(),
```
Asegura `inArray` importado de drizzle-orm. (El tipo `ProductoVenta` gana `unidades: {unidadId,abrev,factor,precio}[]`.)
- [ ] **Step 2: `ultimaVentaProducto`** en `src/lib/services/facturas.ts` (export):
```typescript
/** Última venta de un producto (preferir al cliente dado): unidad y precio usados. */
export async function ultimaUnidadVentaPorCliente(empresaId: number, clienteId: number): Promise<Record<number, { unidadId: number; precio: number }>> {
  const rows = await db
    .selectDistinctOn([facturaDetalles.productoId], {
      productoId: facturaDetalles.productoId,
      unidadId: facturaDetalles.unidadId,
      precio: facturaDetalles.precioUnitario,
    })
    .from(facturaDetalles)
    .innerJoin(facturas, eq(facturaDetalles.facturaId, facturas.id))
    .where(and(eq(facturas.empresaId, empresaId), eq(facturas.clienteId, clienteId)))
    .orderBy(facturaDetalles.productoId, desc(facturas.fecha), desc(facturas.id));
  return Object.fromEntries(rows.map((r) => [r.productoId, { unidadId: r.unidadId, precio: Number(r.precio) }]));
}
```
- [ ] **Step 3: tsc** sin errores; `npx vitest run` verde.
- [ ] **Step 4: Commit**
```bash
git add src/lib/services/productos.ts src/lib/services/facturas.ts
git commit -m "feat(venta): productos con presentaciones vendibles + última unidad/precio por cliente"
```

---

## Task 6: Servicio + validación — nota con tipo y proveedor

**Files:** Modify `src/lib/validation/nota-inventario.ts`, `src/lib/services/notas-inventario.ts`

- [ ] **Step 1: validación** — añade `proveedorId` opcional al schema:
```typescript
export const notaInventarioSchema = z.object({
  bodegaId: z.coerce.number().int().positive("Selecciona la bodega"),
  productoId: z.coerce.number().int().positive("Selecciona el producto"),
  proveedorId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(valores),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  motivo: z.string().trim().min(1, "El motivo es obligatorio").max(1000),
});
```
y en `parseNotaInventarioForm` añade `proveedorId: form.get("proveedorId") || undefined,`.
- [ ] **Step 2: servicio** — en `crearNotaInventario`, en el `tx.insert(notasInventario).values({...})` (línea ~106), añade `proveedorId: data.proveedorId ?? null,` (la columna ya existe). Verifica que el insert ya pone `tipo: data.tipo` (no "ajuste"); si pusiera "ajuste" fijo, cámbialo a `tipo: data.tipo` para conservar faltante/merma/sobrante. Lee el insert y ajústalo.
- [ ] **Step 3: tsc** ok.
- [ ] **Step 4: Commit**
```bash
git add src/lib/validation/nota-inventario.ts src/lib/services/notas-inventario.ts
git commit -m "feat(compras): nota guarda tipo real + proveedor"
```

---

## Task 7: Servicio — reporte de calidad por proveedor

**Files:** Modify `src/lib/services/reportes.ts`

- [ ] **Step 1: Implementar** `novedadesPorProveedor`:
```typescript
import { notasInventario } from "@/lib/db/schema"; // si falta
import { inArray } from "drizzle-orm"; // si falta

/** Novedades (faltante/merma/daño) agrupadas por proveedor: cuántas y cuánta cantidad. */
export async function novedadesPorProveedor(empresaId: number) {
  const rows = await db
    .select({
      proveedorId: notasInventario.proveedorId,
      proveedor: terceros.razonSocial,
      tipo: notasInventario.tipo,
      novedades: sql<string>`count(*)`,
      cantidad: sql<string>`sum(${notasInventario.cantidad})`,
    })
    .from(notasInventario)
    .innerJoin(terceros, eq(notasInventario.proveedorId, terceros.id))
    .where(and(eq(notasInventario.empresaId, empresaId), inArray(notasInventario.tipo, ["diferencia_negativa", "merma", "dano"])))
    .groupBy(notasInventario.proveedorId, terceros.razonSocial, notasInventario.tipo)
    .orderBy(desc(sql`count(*)`));
  return rows.map((r) => ({ proveedorId: r.proveedorId, proveedor: r.proveedor, tipo: r.tipo, novedades: Number(r.novedades), cantidad: Number(r.cantidad) }));
}
```
(Confirma imports `terceros`, `and`, `eq`, `desc`, `sql` en el archivo.)
- [ ] **Step 2: tsc** ok.
- [ ] **Step 3: Commit**
```bash
git add src/lib/services/reportes.ts
git commit -m "feat(compras): reporte de novedades (calidad) por proveedor"
```

---

## Task 8: UI — Recepción "Recibí todo / Vino diferente"

**Files:** Modify `src/app/(app)/pedidos/[id]/pedido-acciones.tsx`, `src/app/(app)/pedidos/actions.ts`

- [ ] **Step 1: action de recepción con cantidades** — en `pedidos/actions.ts`, junto a `recibirPedidoAction`, añade:
```typescript
export async function recibirParcialAction(id: number, recepciones: Record<number, number>): Promise<{ error?: string }> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "pedidos.editar")) return { error: "No tienes permiso." };
  try {
    await recibirPedido(id, c.ctx, recepciones);
  } catch (e) {
    if (e instanceof PedidoNoRecibible) return { error: e.message };
    console.error("[pedidos] recibir parcial:", e);
    return { error: "No se pudo recibir el pedido." };
  }
  revalidatePath(`/pedidos/${id}`);
  revalidatePath("/inventario");
  return {};
}
```
(Confirma imports: `contexto`, `puede`, `recibirPedido`, `PedidoNoRecibible`, `revalidatePath`. El `recibirPedidoAction` existente debe seguir llamando `recibirPedido(id, c.ctx)` sin recepciones = recibir todo.)
- [ ] **Step 2: UI** — en `pedido-acciones.tsx`, junto al botón "Recibir e ingresar a inventario" (recibir todo), añade un botón "Vino diferente" que abre un `Modal` listando las líneas del pedido con un `Input` numérico por línea (default = cantidad pedida), y al confirmar llama `recibirParcialAction(id, recepciones)`. El componente necesita las líneas: pásalas como prop desde el server (`pedido.detalles` con `{id, productoNombre, cantidad, unidadAbrev}`). Usa `useTransition`, `toast`, `router.refresh()`. Mantén el botón "Recibí todo" como acción primaria.
  - Recibe una nueva prop `lineas: { id: number; producto: string; cantidad: number; unidad: string }[]` y renderiza el modal. Construye `recepciones` como `Record<detalleId, number>` desde el estado local de inputs.
  - El server (página del pedido) ya tiene `pedido.detalles`; mapea productoId→nombre con los productos (o incluye el nombre en `obtenerPedido`). Si `obtenerPedido` no trae nombre de producto, resuélvelo en la página con un `Map`.
- [ ] **Step 3: Build** — `npm run build` compila.
- [ ] **Step 4: Commit**
```bash
git add "src/app/(app)/pedidos"
git commit -m "feat(compras): recibir todo o 'vino diferente' (ajustar cantidades recibidas)"
```

---

## Task 9: UI — POS con unidad elegible por línea (default última usada, resaltada)

**Files:** Modify `src/app/(app)/facturas/factura-form.tsx`, `src/app/(app)/facturas/nueva/page.tsx`, `src/app/(app)/facturas/actions.ts`

- [ ] **Step 1: page pasa última unidad por cliente** — la action `preciosClienteAction` ya devuelve precios; crea `unidadClienteAction(clienteId)` en `actions.ts` que devuelve `ultimaUnidadVentaPorCliente(empresaId, clienteId)` (mapa productoId→{unidadId,precio}); o amplía `preciosClienteAction` para devolver ambos. Recomendado: una sola action `datosClienteAction(clienteId)` → `{ precios: Record<number,number>, unidades: Record<number,{unidadId,precio}> }`.
- [ ] **Step 2: `Prod` gana `unidades`** — en `factura-form.tsx` la interfaz `Prod` añade `unidades: { unidadId: number; abrev: string; factor: number; precio: number }[]`. La página ya las trae de `listarProductosVenta` (Task 5); pásalas.
- [ ] **Step 3: línea del carrito con unidad** — `LineaCarrito` gana `unidadId: number`. Al agregar (`agregarProducto`), fija `unidadId = sugerirUnidadVenta(id, unidadesUltimaCliente, prod.unidades[0].unidadId)` y el precio según esa unidad (precio de esa presentación o el de la última venta). El `Autocomplete` de producto sigue agregando; cada línea del ticket muestra un `SearchSelect` chico con las `p.unidades` (label = abrev) y **resalta** la unidad elegida (chip). Al cambiar la unidad, recalcula el precio sugerido (precio de esa presentación).
- [ ] **Step 4: `lineasJson` usa `unidadId` de la línea** (no `unidadBaseId`):
```typescript
return { productoId: l.productoId, unidadId: l.unidadId, cantidad: l.cantidad, precioUnitario: l.precioUnitario };
```
- [ ] **Step 5: Build** compila; vender sigue funcionando (crearFactura ya convierte por unidad).
- [ ] **Step 6: Commit**
```bash
git add "src/app/(app)/facturas"
git commit -m "feat(venta): elegir unidad por línea (default última usada) y resaltarla en el ticket"
```

---

## Task 10: UI — Nota faltante/merma/sobrante con proveedor sugerido

**Files:** Modify `src/app/(app)/notas-inventario/nota-form.tsx`, `src/app/(app)/notas-inventario/actions.ts`, `src/app/(app)/notas-inventario/nueva/page.tsx`

- [ ] **Step 1: action sugiere proveedor** — añade `proveedorSugeridoAction(productoId)` → `ultimoProveedorDeProducto(empresaId, productoId)` (devuelve id|null). Y en `guardarNotaAction`, lee `proveedorId` del form y pásalo (la validación ya lo admite).
- [ ] **Step 2: nota-form** — al elegir el producto, llama `proveedorSugeridoAction` y preselecciona el proveedor (SearchSelect de proveedores, editable). Tipo en lenguaje claro: agrupa `TIPOS_NOTA` en Faltante (`diferencia_negativa`), Merma (`merma`), Daño (`dano`), Sobrante (`diferencia_positiva`), Ajuste±. Añade hidden/SearchSelect `proveedorId`. La página debe pasar la lista de proveedores (terceros tipo proveedor/ambos).
- [ ] **Step 3: Build** compila.
- [ ] **Step 4: Commit**
```bash
git add "src/app/(app)/notas-inventario"
git commit -m "feat(compras): nota con tipo claro + proveedor sugerido (último que lo vendió)"
```

---

## Task 11: UI — Reporte de calidad por proveedor + aviso en Inicio

**Files:** Modify `src/app/(app)/reportes/page.tsx`, `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Reportes** — en la página de reportes, añade una sección "Novedades por proveedor" que llama `novedadesPorProveedor(empresaId)` y muestra una tabla/lista: proveedor · tipo (Faltante/Merma/Daño) · # novedades · cantidad. Ordenado por más novedades.
- [ ] **Step 2: Inicio** — opcional: si hay novedades recientes, un aviso pequeño en el Inicio ("Novedades de proveedores: N") enlazando a Reportes. (Reusa el patrón de avisos del dashboard.)
- [ ] **Step 3: Build** compila.
- [ ] **Step 4: Commit**
```bash
git add "src/app/(app)/reportes" "src/app/(app)/dashboard"
git commit -m "feat(compras): reporte de calidad por proveedor + aviso en inicio"
```

---

## Task 12: Verificación final + deploy + E2E

- [ ] **Step 1: Suite** — `npx vitest run` (incluye dominio nuevo) → todo verde.
- [ ] **Step 2: Build** — `npm run build` limpio.
- [ ] **Step 3: Push** — `git push origin main`.
- [ ] **Step 4: Deploy vivo** — `until curl -s -o /dev/null -w "%{http_code}" https://vertexsm.vercel.app/login | grep -q 200; do sleep 5; done; curl -s -o /dev/null -w "%{http_code}\n" https://vertexsm.vercel.app/pedidos`.
- [ ] **Step 5: E2E manual**
  1. Producto con presentación (ej. "Bulto = 50 kg"); pedir 2 bultos.
  2. Recibir → "Vino diferente": recibí 1.5 → inventario suma 75 kg, CxP por lo recibido, pedido "parcial".
  3. Vender: agregar ese producto → unidad sugerida = última usada (o base), elegible (kg/bulto), unidad resaltada; vender 3 kg.
  4. Nota → Merma 2 kg → el sistema sugiere el proveedor del pedido; inventario baja; queda ligada al proveedor.
  5. Reportes → "Novedades por proveedor" muestra la merma de ese proveedor.

---

## Notas
- Ninguna unidad horneada: todo desde `unidadesMedida`/`productoUnidades`.
- Si `obtenerPedido` no incluye el nombre del producto por línea, resolverlo en la página del pedido con un `Map` (no inventar campos).
- Si un componente UI expone props distintas a las asumidas, ajustar al contrato real (revisar el componente).

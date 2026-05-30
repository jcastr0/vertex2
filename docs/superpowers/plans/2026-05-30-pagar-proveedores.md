# Pagar a proveedores (¿a quién le debes? FIFO) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Pantalla "Pagar" estilo "¿A quién le debes?" (espejo de Cobrar): proveedores agrupados con su saldo; registrar "cuánto le pagaste" repartido FIFO a sus facturas, saliendo de una cuenta propia, con retenciones parametrizadas (solo factura electrónica) y beneficiario opcional.

**Architecture:** Reusa `distribuirFIFO` y `calcularRetenciones` (dominio, ya testeados). Servicios en `src/lib/services/cartera.ts`. UI espejo de `cuentas-cobrar` (página + componente `CobrarCliente`). Las retenciones salen de la config (`retencionesActivas`), nada horneado.

**Tech Stack:** Next.js 15 (RSC, Server Actions), Drizzle + postgres-js, Vitest, Tailwind + base-ui.

---

## Convenciones
- Dev: data desechable. `money`/`qty` → string.
- Patrón Cobrar a espejar: `deudoresPorCliente` (group) + `cobrarACliente` (FIFO) + `src/app/(app)/cuentas-cobrar/page.tsx` ("¿Quién te debe?") + `cobrar-cliente.tsx` (tarjeta tappable + modal "¿Cuánto te pagó?").
- `distribuirFIFO(deudas:{id,saldo}[], monto)` reparte a la más antigua primero (orden dado por el caller).
- `calcularRetenciones(base, config, esFE)` → `{ detalle:[{retencionId,base,porcentaje,valor}], total }`. `retencionesActivas(empresaId)` da la config.
- `movimientoDesdePago({valor, retencionTotal})` → `{ tipo:"salida", valor: neto }`.
- `aplicarAbono(saldo, valor)` → `{ nuevoSaldo }`.
- Imports en cartera.ts ya presentes: `cuentasPorPagar, pagosProveedor, pagoRetenciones, terceros, movimientosTesoreria, cuentasPropias`, `and, eq, asc, gt, sql, count, desc`, `formatearNumero`, `calcularRetenciones`, `retencionesActivas`, `movimientoDesdePago`, `distribuirFIFO`, `aplicarAbono`, tipo `BeneficiarioSnapshot`, clase `AbonoInvalido`.

---

## Task 1: Servicio `acreedoresPorProveedor` (agrupado)

**Files:** Modify `src/lib/services/cartera.ts`

- [ ] **Step 1: Implementar** (espejo de `deudoresPorCliente`, + facturaElectronica):
```typescript
/** Proveedores con saldo por pagar, agrupados; más antiguo primero. */
export async function acreedoresPorProveedor(empresaId: number) {
  const rows = await db
    .select({
      proveedorId: cuentasPorPagar.proveedorId,
      proveedor: terceros.razonSocial,
      facturaElectronica: terceros.requiereFacturaElectronica,
      total: sql<string>`sum(${cuentasPorPagar.saldoPendiente})`,
      venceMin: sql<string>`min(${cuentasPorPagar.fechaVencimiento})`,
      docs: count(),
    })
    .from(cuentasPorPagar)
    .innerJoin(terceros, eq(cuentasPorPagar.proveedorId, terceros.id))
    .where(and(eq(cuentasPorPagar.empresaId, empresaId), gt(cuentasPorPagar.saldoPendiente, "0")))
    .groupBy(cuentasPorPagar.proveedorId, terceros.razonSocial, terceros.requiereFacturaElectronica)
    .orderBy(asc(sql`min(${cuentasPorPagar.fechaVencimiento})`));
  return rows.map((r) => ({
    proveedorId: r.proveedorId,
    proveedor: r.proveedor,
    facturaElectronica: r.facturaElectronica,
    total: Number(r.total),
    venceMin: r.venceMin,
    docs: Number(r.docs),
  }));
}
```
- [ ] **Step 2: tsc** sin errores; `npx vitest run` verde.
- [ ] **Step 3: Commit**
```bash
git add src/lib/services/cartera.ts
git commit -m "feat(pagar): acreedoresPorProveedor (agrupado)"
```

---

## Task 2: Servicio `pagarAProveedor` (FIFO + retención sobre el total + neto a tesorería)

**Files:** Modify `src/lib/services/cartera.ts`

- [ ] **Step 1: Implementar** (orquesta en una transacción; reusa funciones puras ya testeadas):
```typescript
/** Paga a un proveedor un monto total: reparte FIFO a sus CxP, retención (FE) sobre el total, una salida de tesorería por el neto. */
export async function pagarAProveedor(
  proveedorId: number,
  datos: { monto: number; metodoPago: string; fecha: string; cuentaOrigenId?: number; beneficiario?: BeneficiarioSnapshot | null; referencia?: string },
  ctx: Contexto,
): Promise<number> {
  if (datos.monto <= 0) throw new AbonoInvalido("El valor debe ser mayor a 0.");

  const [prov] = await db
    .select({ fe: terceros.requiereFacturaElectronica })
    .from(terceros)
    .where(eq(terceros.id, proveedorId))
    .limit(1);
  const config = await retencionesActivas(ctx.empresaId);
  const ret = calcularRetenciones(datos.monto, config, prov?.fe ?? false);

  const abiertas = await db
    .select({ id: cuentasPorPagar.id, saldo: cuentasPorPagar.saldoPendiente })
    .from(cuentasPorPagar)
    .where(and(eq(cuentasPorPagar.empresaId, ctx.empresaId), eq(cuentasPorPagar.proveedorId, proveedorId), gt(cuentasPorPagar.saldoPendiente, "0")))
    .orderBy(asc(cuentasPorPagar.fechaVencimiento), asc(cuentasPorPagar.id));
  const aplic = distribuirFIFO(abiertas.map((a) => ({ id: a.id, saldo: Number(a.saldo) })), datos.monto);
  if (aplic.length === 0) throw new AbonoInvalido("Este proveedor no tiene deudas pendientes.");

  const [{ c }] = await db.select({ c: count() }).from(pagosProveedor).where(eq(pagosProveedor.empresaId, ctx.empresaId));

  let aplicado = 0;
  await db.transaction(async (tx) => {
    for (let i = 0; i < aplic.length; i++) {
      const a = aplic[i];
      const numero = formatearNumero("PAG", Number(c) + 1 + i);
      const esPrimero = i === 0;
      const [pago] = await tx
        .insert(pagosProveedor)
        .values({
          empresaId: ctx.empresaId,
          proveedorId,
          cuentaPorPagarId: a.id,
          numero,
          fecha: datos.fecha,
          valor: String(a.abono),
          // La retención (sobre el total) se registra una vez, en el primer pago.
          retencionTotal: esPrimero ? String(ret.total) : "0",
          cuentaOrigenId: datos.cuentaOrigenId ?? null,
          beneficiarioCuentaId: datos.beneficiario?.beneficiarioCuentaId ?? null,
          beneficiarioBanco: datos.beneficiario?.banco ?? null,
          beneficiarioCuenta: datos.beneficiario?.numeroCuenta ?? null,
          beneficiarioNit: datos.beneficiario?.nit ?? null,
          beneficiarioNombre: datos.beneficiario?.nombre ?? null,
          metodoPago: datos.metodoPago,
          referencia: datos.referencia || null,
          estado: "activo",
          usuarioId: ctx.usuarioId,
        })
        .returning();

      if (esPrimero && ret.detalle.length) {
        await tx.insert(pagoRetenciones).values(
          ret.detalle.map((d) => ({
            empresaId: ctx.empresaId,
            pagoId: pago.id,
            retencionId: d.retencionId,
            base: String(d.base),
            porcentaje: String(d.porcentaje),
            valor: String(d.valor),
          })),
        );
      }

      const [cxp] = await tx.select().from(cuentasPorPagar).where(eq(cuentasPorPagar.id, a.id)).limit(1);
      const nuevo = aplicarAbono(Number(cxp.saldoPendiente), a.abono);
      await tx.update(cuentasPorPagar).set({ saldoPendiente: String(nuevo.nuevoSaldo), updatedAt: new Date() }).where(eq(cuentasPorPagar.id, a.id));

      aplicado += a.abono;
    }

    // Una sola salida de tesorería por el NETO (total − retención).
    if (datos.cuentaOrigenId) {
      const mov = movimientoDesdePago({ valor: datos.monto, retencionTotal: ret.total });
      await tx.insert(movimientosTesoreria).values({
        empresaId: ctx.empresaId,
        cuentaPropiaId: datos.cuentaOrigenId,
        fecha: datos.fecha,
        tipo: mov.tipo,
        origen: "pago_proveedor",
        valor: String(mov.valor),
        descripcion: `Pago a proveedor`,
        usuarioId: ctx.usuarioId,
      });
    }

    await registrarAuditoria(
      { empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx27", modelId: proveedorId, accion: "CREAR", registroNuevo: { proveedorId, monto: datos.monto, retencion: ret.total }, ipOrigen: ctx.ip },
      tx,
    );
  });
  return aplicado;
}
```
Confirma que `aplicarAbono` devuelve `{ nuevoSaldo }` (revisa `src/lib/domain/cartera.ts`); si el campo se llama distinto, ajusta. `registrarAuditoria` ya está importado.
- [ ] **Step 2: tsc** sin errores; `npx vitest run` verde.
- [ ] **Step 3: Commit**
```bash
git add src/lib/services/cartera.ts
git commit -m "feat(pagar): pagarAProveedor (FIFO + retención sobre total + salida por neto)"
```

---

## Task 3: Actions — datos del pago + registrar

**Files:** Modify `src/app/(app)/cuentas-pagar/actions.ts`

- [ ] **Step 1: Implementar** (lee el archivo; reusa `contextoAccion as contexto`, `puede`, `revalidatePath`):
```typescript
import { pagarAProveedor, AbonoInvalido } from "@/lib/services/cartera";
import { beneficiariosActivos } from "@/lib/services/beneficiarios";
import { resolverBeneficiario } from "@/lib/domain/tesoreria";

export interface PagoState { error?: string; ok?: boolean }

/** Datos para el modal: beneficiarios guardados del proveedor (para "a dónde va"). */
export async function beneficiariosProveedorAction(proveedorId: number) {
  const c = await contexto();
  if (!c || !proveedorId) return [];
  return beneficiariosActivos(c.ctx.empresaId, proveedorId);
}

/** Registra cuánto le pagaste a un proveedor (FIFO). */
export async function pagarProveedorAction(proveedorId: number, _prev: PagoState, form: FormData): Promise<PagoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.rol, "pagos_proveedor.crear")) return { error: "No tienes permiso." };

  const monto = Number(form.get("monto"));
  if (!monto || monto <= 0) return { error: "Escribe cuánto le pagaste." };
  const metodoPago = String(form.get("metodoPago") || "efectivo");
  const fecha = String(form.get("fecha") || new Date().toISOString().slice(0, 10));
  const cuentaOrigenId = Number(form.get("cuentaOrigenId")) || undefined;
  if (!cuentaOrigenId) return { error: "Elige de qué cuenta sale el dinero." };

  // Beneficiario (a dónde va): por defecto al proveedor; o una cuenta guardada.
  const destino = String(form.get("destino") ?? "proveedor");
  let beneficiario = null;
  if (destino.startsWith("cuenta:")) {
    const bid = Number(destino.slice(7));
    const bens = JSON.parse(String(form.get("beneficiariosJson") ?? "[]")) as Array<{ id: number; banco: string; numeroCuenta: string; titularNit: string; titularNombre: string }>;
    const cuenta = bens.find((b) => b.id === bid);
    if (cuenta) beneficiario = resolverBeneficiario({ opcion: "guardada", cuenta });
  }

  try {
    await pagarAProveedor(proveedorId, { monto, metodoPago, fecha, cuentaOrigenId, beneficiario }, c.ctx);
  } catch (e) {
    if (e instanceof AbonoInvalido) return { error: e.message };
    console.error("[pagar] error:", e);
    return { error: "No se pudo registrar el pago." };
  }
  revalidatePath("/cuentas-pagar");
  revalidatePath("/pagos-proveedor");
  revalidatePath("/dashboard");
  return { ok: true };
}
```
(Confirma que `resolverBeneficiario({opcion:"guardada", cuenta})` existe en `src/lib/domain/tesoreria.ts` — se usó en el modal de pago por factura. Mantén las actions existentes del archivo.)
- [ ] **Step 2: tsc** ok. **Commit**
```bash
git add "src/app/(app)/cuentas-pagar/actions.ts"
git commit -m "feat(pagar): actions pagarProveedor + beneficiarios del proveedor"
```

---

## Task 4: UI — pantalla "Pagar" + componente PagarProveedor

**Files:** Create `src/app/(app)/cuentas-pagar/pagar-proveedor.tsx`; rewrite `src/app/(app)/cuentas-pagar/page.tsx`

LEE primero `src/app/(app)/cuentas-cobrar/page.tsx` y `src/app/(app)/cuentas-cobrar/cobrar-cliente.tsx` (los espejas), y `src/components/pago-proveedor-button.tsx` (de ahí tomas la previsualización de retención con `calcularRetenciones` cliente + el selector de beneficiario "destino").

- [ ] **Step 1: `pagar-proveedor.tsx`** — espejo de `cobrar-cliente.tsx`: una tarjeta tappable (proveedor, "Le debes", total, punto rojo/verde por `vencido`, chevron) que abre un `Modal` "¿Cuánto le pagaste a {proveedor}?". Campos: **Monto** (default total), **¿De qué cuenta sale?** (`SearchSelect` cuentas propias, name `cuentaOrigenId`, requerido), **¿Cómo pagaste?** (`SearchSelect` `METODOS_PAGO`, name `metodoPago`), **Fecha** (`DatePicker`).
  - Props: `{ proveedorId, proveedor, total, vencido, facturaElectronica, hoy, cuentasOrigen, retenciones }`. (`retenciones` = `RetencionConfig[]` activas; `cuentasOrigen` = `{id,nombre}[]`.)
  - Si `facturaElectronica`: estado local `monto`; calcula `calcularRetenciones(monto, retenciones, true)` para mostrar el **desglose** y el **neto a desembolsar** (igual que `pago-proveedor-button.tsx`). Más un selector **beneficiario** ("Al proveedor" por defecto, o cuentas guardadas) — carga las cuentas con `beneficiariosProveedorAction(proveedorId)` al abrir el modal (useEffect) y serialízalas en `beneficiariosJson` (hidden) + `destino` (SearchSelect) como en `pago-proveedor-button.tsx`.
  - Submit con `useActionState(pagarProveedorAction.bind(null, proveedorId))`; al `ok` cierra y `router.refresh()`. Botón "Listo" con `useFormStatus` pending (evita doble clic).
- [ ] **Step 2: `page.tsx`** — espejo de cuentas-cobrar "¿Quién te debe?" pero "Pagar / ¿A quién le debes?": `acreedoresPorProveedor(empresaId)` + `cuentasPropiasActivas` + `retencionesActivas`. Encabezado "Debes en total $X · N proveedores". Lista de `PagarProveedor` por proveedor (pasando `facturaElectronica`, `cuentasOrigen`, `retenciones`, `vencido = venceMin < hoy`). Vacío: "No le debes a nadie". Permiso `requirePermiso("cuentas_pagar.ver")`; `puede(rol, "pagos_proveedor.crear")` para habilitar pagar. `metadata.title = "Pagar — Vertex"`.
- [ ] **Step 3: Build** — `npm run build` compila.
- [ ] **Step 4: Commit**
```bash
git add "src/app/(app)/cuentas-pagar"
git commit -m "feat(pagar): pantalla '¿a quién le debes?' + pago FIFO con retención/beneficiario"
```

---

## Task 5: Verificación + deploy + E2E

- [ ] **Step 1:** `npx vitest run` verde. `npm run build` limpio.
- [ ] **Step 2:** `git push origin main`.
- [ ] **Step 3:** deploy vivo: `until curl -s -o /dev/null -w "%{http_code}" https://vertexsm.vercel.app/login | grep -q 200; do sleep 5; done; curl -s -o /dev/null -w "%{http_code}\n" https://vertexsm.vercel.app/cuentas-pagar` → 307.
- [ ] **Step 4: E2E** (datos demo): crear/recibir un pedido a un proveedor para generar CxP; ir a Pagar → "¿A quién le debes?" muestra el proveedor con su total; pagar un monto que cruce 2 facturas → FIFO reduce saldos, sale de la cuenta elegida (movimiento de tesorería por el neto). Para un proveedor marcado factura electrónica → la retención parametrizada aparece y el neto baja.

---

## Notas
- La pantalla principal de cuentas por pagar pasa a la vista por proveedor; el **historial de pagos** (`/pagos-proveedor`) se mantiene intacto.
- Retención: parametrizada (`retencionesActivas`), nada horneado; se registra una vez por pago (suma = total).
- Si `aplicarAbono`/`resolverBeneficiario`/props de componentes difieren del contrato asumido, ajustar al real (revisar el archivo).

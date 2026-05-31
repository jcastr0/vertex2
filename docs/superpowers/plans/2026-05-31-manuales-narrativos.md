# Manuales narrativos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development o superpowers:executing-plans. Steps con checkbox (`- [ ]`).

**Goal:** Agregar 4 manuales narrativos (ciclo del negocio, recaudo dual desktop/móvil, pagar a proveedor, retenciones) + sección de F.E. en "vender", fieles a los flujos reales del código.

**Architecture:** Solo se edita `src/lib/manuales.ts` (el arreglo `MANUALES` de markdown) y `src/lib/manuales.test.ts`. Render existente (`/manuales/[slug]` con ReactMarkdown). Sin deps ni tablas nuevas.

**Tech Stack:** TS, vitest, ReactMarkdown + remarkGfm.

**Fuente de verdad del contenido:** la sección "Flujos reales" del spec `docs/superpowers/specs/2026-05-31-manuales-narrativos-design.md`. Cada afirmación de los manuales debe corresponder a un flujo verificado ahí.

---

## Task 1: Pruebas de manuales (TDD)

**Files:** Modify `src/lib/manuales.test.ts`

- [ ] **Step 1: Escribir las pruebas nuevas (reemplaza el archivo)**
```ts
import { describe, it, expect } from "vitest";
import { MANUALES, getManual } from "./manuales";
import { MODULOS } from "./auth/roles";

describe("getManual", () => {
  it("devuelve el manual por slug", () => {
    expect(getManual("vender")?.titulo).toBe("Cómo vender");
  });
  it("devuelve null si no existe", () => {
    expect(getManual("inexistente")).toBeNull();
  });
});

describe("catálogo de manuales", () => {
  it("slugs únicos", () => {
    const slugs = MANUALES.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("cada manual tiene módulo válido, metadatos y contenido con encabezado", () => {
    for (const m of MANUALES) {
      expect(MODULOS).toContain(m.modulo);
      expect(m.titulo.length).toBeGreaterThan(0);
      expect(m.descripcion.length).toBeGreaterThan(0);
      expect(m.contenido.trimStart().startsWith("# ")).toBe(true);
      expect(m.contenido.length).toBeGreaterThan(50);
    }
  });
  it("existen los manuales narrativos nuevos", () => {
    for (const slug of ["ciclo-negocio", "recaudo", "pagar-proveedor", "retenciones"]) {
      expect(getManual(slug), `falta el manual ${slug}`).not.toBeNull();
    }
  });
  it("el manual de recaudo documenta las DOS formas (computador y celular)", () => {
    const c = getManual("recaudo")!.contenido.toLowerCase();
    expect(c).toMatch(/computador|escritorio/);
    expect(c).toMatch(/celular|m[oó]vil/);
  });
  it("'vender' incluye la sección de factura electrónica", () => {
    expect(getManual("vender")!.contenido.toLowerCase()).toContain("electrónica");
  });
  it("no hay enlaces internos a manuales inexistentes", () => {
    const slugs = new Set(MANUALES.map((m) => m.slug));
    for (const m of MANUALES) {
      const refs = [...m.contenido.matchAll(/\]\(\/manuales\/([a-z0-9-]+)\)/g)].map((x) => x[1]);
      for (const ref of refs) {
        expect(slugs.has(ref), `${m.slug} enlaza a /manuales/${ref} que no existe`).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Correr → falla**
Run: `npx vitest run src/lib/manuales.test.ts`
Expected: FAIL (faltan los 4 slugs nuevos; recaudo/vender no existen con esas secciones).

- [ ] **Step 3: Commit de las pruebas**
```bash
git add src/lib/manuales.test.ts && git commit -m "test(manuales): pruebas de manuales narrativos (dos-formas recaudo, enlaces, F.E.)"
```

---

## Task 2: Contenido de los manuales

**Files:** Modify `src/lib/manuales.ts`

- [ ] **Step 1: Imports de iconos** — en la línea de import de lucide-react, agregar `Workflow, Route, Banknote, Percent`:
```ts
import { Rocket, ShoppingBag, ShoppingCart, Boxes, Wallet, Package, Workflow, Route, Banknote, Percent } from "lucide-react";
```

- [ ] **Step 2: Insertar `ciclo-negocio` justo después de `primeros-pasos`** (antes de `vender`):
```ts
  {
    slug: "ciclo-negocio",
    titulo: "El ciclo del negocio",
    descripcion: "De la compra al cobro, paso a paso.",
    icon: Workflow,
    modulo: "dashboard",
    contenido: `# El ciclo del negocio

Así se mueve la plata y la mercancía en Vertex, de principio a fin. Cada paso tiene su manual detallado.

## 1. Compras a tu proveedor
Creas un **pedido** (qué le compras y a qué bodega entra) y, cuando llega, lo **recibes**: el inventario sube, se recalcula el **costo promedio** y nace una **cuenta por pagar**.
→ Ver [Compras y pedidos](/manuales/compras).

## 2. Le pagas al proveedor
Registras la **factura del proveedor** y luego le **pagas**: eliges de qué cuenta sale la plata, a qué **cuenta bancaria del proveedor** va, y se aplican las **retenciones** que tengas configuradas.
→ Ver [Pagar a un proveedor](/manuales/pagar-proveedor) y [Retenciones](/manuales/retenciones).

## 3. Vendes
En **Vender** facturas en segundos: de **contado** (entra a una de tus cuentas) o a **crédito** (queda en cartera). Si el cliente lo necesita, marcas **factura electrónica**.
→ Ver [Cómo vender](/manuales/vender).

## 4. Le cobras al cliente
Las ventas a crédito quedan en **Cuentas por cobrar**. Con la **Ruta de recaudo** organizas el cobro: en el computador programas a quién cobra cada recaudador y qué día; en el celular el recaudador cobra en la calle.
→ Ver [Cobrar en ruta](/manuales/recaudo) y [Cartera](/manuales/cartera).

> Todo queda conectado: una compra alimenta el inventario y la cuenta por pagar; una venta baja el inventario y, si es a crédito, alimenta la cartera. El **Dashboard** te muestra el resumen del mes.
`,
  },
```

- [ ] **Step 3: Agregar `recaudo`, `pagar-proveedor`, `retenciones` al final del arreglo** (antes del cierre `];`):
```ts
  {
    slug: "recaudo",
    titulo: "Cobrar en ruta",
    descripcion: "Programar el cobro (computador) y cobrar en la calle (celular).",
    icon: Route,
    modulo: "ruta_recaudo",
    contenido: `# Cobrar en ruta

La **ruta de recaudo** te ayuda a cobrarle a tus clientes a crédito de forma ordenada. Se usa de dos maneras: en el **computador** para organizar, y en el **celular** para cobrar en la calle.

## En el computador — programar la ruta
Necesitas el permiso para programar (rol Admin o superior).

1. Entra a **Ruta de recaudo** y toca **Programar ruta**.
2. Elige los **clientes** y asígnales un **recaudador** y un **día de cobro** (lunes a domingo).
3. Guarda. Desde ese momento, a cada recaudador le aparecen sus clientes el día que les toca.

> ¿Quién ve qué? Si tienes permiso de usuarios, puedes elegir de qué recaudador ver la ruta. Si eres recaudador, ves solo la tuya.

## En el celular — cobrar en la calle
El recaudador abre **Ruta de recaudo** en su celular. Arriba ve **cuánto lleva recaudado hoy**, cuántos clientes tiene con saldo y cuántos ya visitó.

En **"Hoy te toca"** aparece cada cliente como una tarjeta. En cada una puede:

- **Recaudar** — registrar el pago: **valor**, **cómo pagó** (efectivo, transferencia…) y una **referencia** si aplica. Al guardar, baja la deuda del cliente y suma a lo recaudado del día.
- **Marcar visita** — cuando no cobró: elige **"No estaba"** o **"No quiso pagar"**, puede tomar una **foto de evidencia** y dejar una **observación**. Así queda registro de que sí pasó por el cliente.

> Necesita el permiso de recaudar. El pago queda en el historial de **Recaudos** y la foto se guarda como evidencia de la visita.
`,
  },
  {
    slug: "pagar-proveedor",
    titulo: "Pagar a un proveedor",
    descripcion: "Cuentas bancarias del proveedor, factura y pago con retención.",
    icon: Banknote,
    modulo: "cuentas_pagar",
    contenido: `# Pagar a un proveedor

Cuando recibes un pedido, Vertex crea una **cuenta por pagar** al proveedor. Aquí está todo lo necesario para pagarle bien.

## 1. Guarda las cuentas bancarias del proveedor
Para no escribir el número de cuenta cada vez, guárdalo una vez:

1. Entra a **Terceros**, abre el proveedor.
2. En el panel de **Beneficiarios** toca **Agregar cuenta**.
3. Elige el **banco** (de la lista), el **tipo** y el **N° de cuenta**.
4. Por defecto la cuenta es **del mismo proveedor**. Si la cuenta está a nombre de otro (factoring o cesión), pon el **NIT y nombre del titular**.

Esas cuentas aparecerán al momento de pagar.

## 2. Registra la factura del proveedor
En **Cuentas por pagar**, sobre el documento, registra el **número de factura** del proveedor (y marca si es **electrónica**). Esto deja la compra lista para pagar y para que el contador la cruce.

## 3. Paga
En **Cuentas por pagar** toca **Pagar**:

1. Escribe el **monto** a pagar.
2. Elige **de qué cuenta sale** la plata (tus cuentas de tesorería).
3. Para proveedores con **factura electrónica**, elige la **cuenta beneficiaria** (a dónde va el dinero) — una guardada o una nueva.
4. Si tienes **retenciones** configuradas, se calculan solas sobre las compras electrónicas y verás el **neto a pagar** (monto − retención).
5. Confirma. El pago baja la cuenta por pagar y queda en **Pagos a proveedor**.

→ Para configurar retenciones, ver [Retenciones](/manuales/retenciones).
`,
  },
  {
    slug: "retenciones",
    titulo: "Retenciones",
    descripcion: "Cómo se crean y cómo se aplican al pagar.",
    icon: Percent,
    modulo: "retenciones",
    contenido: `# Retenciones

Las retenciones se descuentan del pago a un proveedor según la ley. En Vertex se configuran una vez y se aplican solas.

## Crear una retención
1. Entra a **Retenciones → Nueva**.
2. Define:
   - **Nombre** (p. ej. "Retefuente compras").
   - **Porcentaje** a retener.
   - **Base mínima** — si la compra es menor a este valor, no se retiene.
   - **Aplica a todas** — si la retención aplica a todos los proveedores/compras o no.
3. Guarda. Puedes activarla o desactivarla cuando quieras.

## Cómo se aplican
Las retenciones se calculan **automáticamente al pagar a un proveedor**, sobre las compras marcadas como **factura electrónica**, y solo cuando la base supera la **base mínima**.

- El sistema calcula la retención por documento y la resta del pago.
- Verás el **neto a pagar** = monto − retención.
- Cada retención aplicada queda registrada en el pago, para el contador.

→ Ver el flujo completo en [Pagar a un proveedor](/manuales/pagar-proveedor).
`,
  },
```

- [ ] **Step 4: Extender el manual `vender`** — dentro de su `contenido`, antes de la sección final `### Notas`, agregar la sección de F.E.:
```md

## Factura electrónica
Al elegir el cliente, si está marcado como que **requiere factura electrónica**, el interruptor **"Factura electrónica"** se enciende solo (también puedes activarlo a mano). Cuando está encendido, la venta se marca como electrónica y **se exportará para el contador** desde **Reportes → exportar F.E.** No es un envío automático a la DIAN: es la marca y el archivo para que el contador la presente.
```
(Inserta este bloque dentro del template string de `vender`, justo antes de la línea `### Notas`.)

- [ ] **Step 5: Correr pruebas → pasan**
Run: `npx vitest run src/lib/manuales.test.ts`
Expected: PASS (todas).

- [ ] **Step 6: Typecheck**
Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 7: Commit**
```bash
git add src/lib/manuales.ts && git commit -m "feat(manuales): ciclo del negocio, recaudo (dual), pagar proveedor, retenciones + F.E. en vender"
```

---

## Task 3: Verificación final + deploy

- [ ] **Step 1: Suite completa** — `npx vitest run` → todo verde.
- [ ] **Step 2: Build** — `npm run build` → OK (sin errores de render markdown).
- [ ] **Step 3: Push** — `git push origin main`.
- [ ] **Step 4: Verificación manual** — abrir `/manuales`: aparecen las nuevas tarjetas (según permisos del rol); abrir `/manuales/ciclo-negocio` y seguir los enlaces a recaudo, pagar-proveedor, retenciones; confirmar que el de recaudo muestra las dos secciones (computador y celular).

---

## Self-Review (cobertura del spec)
- 4 manuales nuevos (ciclo-negocio, recaudo, pagar-proveedor, retenciones): Task 2. ✔
- Recaudo en dos formas (computador + celular): Task 2 Step 3 + prueba en Task 1. ✔
- F.E. en vender: Task 2 Step 4 + prueba. ✔
- Asignar cuentas a proveedores (beneficiarios), retenciones crear/aplicar, ciclo narrativo, ruta de cobro: cubiertos en el contenido, fieles a los flujos verificados del spec. ✔
- Pruebas: slugs/modulo/encabezado, dual-mode recaudo, enlaces internos válidos, F.E.: Task 1. ✔
- Sin deps/tablas nuevas; markdown existente: toda la arquitectura. ✔

## Nota de fidelidad
Cada afirmación de contenido corresponde a un flujo verificado (sección "Flujos reales" del spec): pedido→recibir→CxP, registrar factura proveedor, pagar (cuenta origen + beneficiario solo F.E. + retención sobre documentos F.E. con base mínima), beneficiarios en Terceros, retenciones (nombre/%/base mínima/aplica a todas), vender contado/crédito + switch F.E. ("se exporta para el contador"), ruta desktop (programar recaudador+día) y móvil (recaudar / marcar visita con foto).

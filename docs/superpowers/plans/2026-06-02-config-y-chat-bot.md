# Configuración (KV) + interruptor del bot + chat de prueba — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer el bot configurable y probable desde la app: tabla de configuración key-value, interruptor del bot por empresa, y un chat de prueba conversacional (cercanía + "lo mismo de la vez pasada" + memoria-JSON si el pedido queda incompleto + solo clientes registrados).

**Architecture:** Tabla `configuracion` (vx41) KV con `empresaId` nullable (null=global) y `valor` jsonb; servicio con precedencia empresa→global→default. El cerebro (`src/lib/bot/`) se extiende para devolver `mensajeAsistente` + `completo` y recibir contexto del cliente (nombre, último pedido, borrador previo). La pantalla Asistente pasa de formulario a chat de burbujas (estado en el cliente). Secretos siguen en env.

**Tech Stack:** Next.js 15 (RSC, Server Actions), Drizzle + postgres-js, Vercel AI SDK, Zod, Tailwind, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-02-config-y-chat-bot-design.md`

---

## File Structure

**Crear:**
- `src/lib/domain/configuracion.ts` — `resolverConfig` (precedencia pura) + test.
- `src/lib/services/configuracion.ts` — `obtenerConfig`, `guardarConfig`, `botActivo`, `mensajeNoRegistrado`.
- `src/app/(app)/configuracion/page.tsx` + `config-form.tsx` + `actions.ts` — UI de ajustes.
- `src/app/(app)/cotizaciones/chat-asistente.tsx` — chat de burbujas (reemplaza el form).

**Modificar:**
- `src/lib/db/schema.ts` — tabla `configuracion` (vx41) + tipo.
- `src/lib/db/nomenclatura.ts` — registrar vx41.
- `src/lib/auth/roles.ts` — módulo `configuracion`.
- `src/lib/modules.ts` — ítem "Configuración" en Administración.
- `src/lib/services/facturas.ts` — `ultimoPedidoCliente`.
- `src/lib/bot/schema.ts` (+ `schema.test.ts`) — `mensajeAsistente`, `completo`.
- `src/lib/bot/interpretar.ts` — contexto del cliente + retorno `ResultadoTurno`.
- `src/app/(app)/cotizaciones/asistente-actions.ts` — `enviarMensajeAction` (turno de chat); `confirmarPedidoAction` se conserva.
- `src/app/(app)/cotizaciones/asistente/page.tsx` — gating `botActivo` + render del chat.

**Tipos compartidos (definidos en sus tasks):**
```typescript
// schema.ts (Task 5)
interface SalidaPedido { items: SalidaItem[]; mensajeAsistente: string; completo: boolean; notas?: string; }
// interpretar.ts (Task 6)
interface ContextoCliente { clienteNombre?: string; ultimoPedido?: { nombre: string; cantidad: number }[]; borradorPrevio?: { nombre: string; cantidad: number }[]; }
interface ResultadoTurno { mensajeAsistente: string; propuesta: Propuesta; completo: boolean; }
```

---

## Task 1: Tabla `configuracion` (vx41) + nomenclatura + migración

**Files:**
- Modify: `src/lib/db/schema.ts`, `src/lib/db/nomenclatura.ts`

- [ ] **Step 1: Agregar la tabla al final de `schema.ts`**

```typescript
// ──────────────────────────────────────────────────────────────────────────
// vx41 — Configuración (key-value; empresaId null = global por defecto)
// ──────────────────────────────────────────────────────────────────────────
export const configuracion = pgTable("vx41",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" }).references(() => empresas.id),
    clave: varchar("clave", { length: 80 }).notNull(),
    valor: jsonb("valor"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("vx41_empresa_clave_uq").on(t.empresaId, t.clave).where(sql`${t.empresaId} is not null`),
    uniqueIndex("vx41_global_clave_uq").on(t.clave).where(sql`${t.empresaId} is null`),
  ],
);

export type Configuracion = typeof configuracion.$inferSelect;
```

Asegúrate de que `uniqueIndex` y `sql` estén importados en `schema.ts` (de `drizzle-orm/pg-core` y `drizzle-orm` respectivamente). Si `uniqueIndex` no está importado, agrégalo al import de `drizzle-orm/pg-core`; importa `sql` con `import { sql } from "drizzle-orm";` si no existe.

- [ ] **Step 2: Registrar en nomenclatura**

En `src/lib/db/nomenclatura.ts`, al final del array `CATALOGO`:
```typescript
  { codigo: "vx41", nombreModelo: "Configuracion", descripcion: "Configuración (key-value)", modulo: "Administración", tieneEmpresaId: true, esCatalogo: false },
```

- [ ] **Step 3: Generar y aplicar la migración**

Run:
```bash
cd /Users/jhonatan/Docker/Vertex2/vertex2
npm run db:generate
NEW=$(ls -t supabase/migrations/*.sql | head -1); echo "$NEW"; cat "$NEW"
```
Expected: un `CREATE TABLE "vx41" ...` con los dos índices únicos parciales. Aplícalo con el script tsx (igual que migraciones previas):
```bash
cat > _apply_mig.mts <<'EOF'
import { config } from "dotenv"; config({ path: ".env.local" }); config({ path: ".env" });
import postgres from "postgres"; import { readFileSync } from "node:fs"; import { execSync } from "node:child_process";
const url = process.env.DATABASE_URL_SESSION ?? process.env.DATABASE_URL; if (!url) process.exit(1);
const file = execSync("ls -t supabase/migrations/*.sql | head -1").toString().trim();
const sql = postgres(url, { prepare: false, max: 1 });
try { for (const s of readFileSync(file,"utf8").split("--> statement-breakpoint").map(x=>x.trim()).filter(Boolean)) { await sql.unsafe(s); console.log("ok"); } console.log("APLICADA", file); }
catch (e) { console.error("ERROR:", (e as Error).message); process.exitCode = 1; } finally { await sql.end(); }
EOF
npx tsx _apply_mig.mts && rm -f _apply_mig.mts
```
Expected: `APLICADA`.

- [ ] **Step 4: Reseed nomenclatura + typecheck**

Run: `npm run db:seed:base && npx tsc --noEmit`
Expected: nomenclatura con vx41; TSC sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/nomenclatura.ts supabase/migrations/
git commit -m "feat(config): tabla configuracion (vx41) KV + nomenclatura + migración"
```

---

## Task 2: Precedencia de config (lógica pura) + servicio

**Files:**
- Create: `src/lib/domain/configuracion.ts`, `src/lib/domain/configuracion.test.ts`
- Create: `src/lib/services/configuracion.ts`

- [ ] **Step 1: Prueba de la precedencia (pura)**

```typescript
// src/lib/domain/configuracion.test.ts
import { describe, it, expect } from "vitest";
import { resolverConfig } from "./configuracion";

describe("resolverConfig", () => {
  it("usa el valor de la empresa si existe", () => {
    expect(resolverConfig(true, false, false)).toBe(true);
  });
  it("cae al global si la empresa no tiene valor", () => {
    expect(resolverConfig(undefined, true, false)).toBe(true);
  });
  it("cae al default si no hay empresa ni global", () => {
    expect(resolverConfig(undefined, undefined, "x")).toBe("x");
  });
  it("respeta un valor falsy de la empresa (no lo trata como ausente)", () => {
    expect(resolverConfig(false, true, true)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr para ver fallar**

Run: `npx vitest run src/lib/domain/configuracion.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar la precedencia**

```typescript
// src/lib/domain/configuracion.ts
/** Precedencia: valor de empresa → valor global → default. `undefined` = ausente. */
export function resolverConfig<T>(deEmpresa: T | undefined, global: T | undefined, porDefecto: T): T {
  if (deEmpresa !== undefined) return deEmpresa;
  if (global !== undefined) return global;
  return porDefecto;
}
```

- [ ] **Step 4: Correr para ver pasar**

Run: `npx vitest run src/lib/domain/configuracion.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Servicio de configuración**

```typescript
// src/lib/services/configuracion.ts
import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { configuracion } from "@/lib/db/schema";
import { resolverConfig } from "@/lib/domain/configuracion";
import { registrarAuditoria } from "@/lib/audit";
import type { Contexto } from "./bodegas";

async function leer(clave: string, empresaId: number): Promise<{ emp?: unknown; glob?: unknown }> {
  const rows = await db
    .select({ empresaId: configuracion.empresaId, valor: configuracion.valor })
    .from(configuracion)
    .where(eq(configuracion.clave, clave));
  let emp: unknown, glob: unknown;
  for (const r of rows) {
    if (r.empresaId === empresaId) emp = r.valor ?? undefined;
    else if (r.empresaId === null) glob = r.valor ?? undefined;
  }
  return { emp, glob };
}

/** Valor de la clave para la empresa (empresa → global → default). */
export async function obtenerConfig<T>(clave: string, empresaId: number, porDefecto: T): Promise<T> {
  const { emp, glob } = await leer(clave, empresaId);
  return resolverConfig(emp as T | undefined, glob as T | undefined, porDefecto);
}

/** Upsert del valor para la empresa (auditado). */
export async function guardarConfig(clave: string, valor: unknown, empresaId: number, ctx: Contexto): Promise<void> {
  const [existente] = await db
    .select({ id: configuracion.id })
    .from(configuracion)
    .where(and(eq(configuracion.clave, clave), eq(configuracion.empresaId, empresaId)))
    .limit(1);
  if (existente) {
    await db.update(configuracion).set({ valor, updatedAt: new Date() }).where(eq(configuracion.id, existente.id));
  } else {
    await db.insert(configuracion).values({ empresaId, clave, valor });
  }
  await registrarAuditoria({ empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx41", accion: "ACTUALIZAR", registroNuevo: { clave, valor }, ipOrigen: ctx.ip });
}

export const MENSAJE_NO_REGISTRADO_DEFAULT =
  "Para tomar tu pedido primero debemos registrarte. Al ser tu primera compra, hacemos un proceso de registro de 24 horas; recibirás una confirmación cuando sea autorizado. ¡Gracias!";

export function botActivo(empresaId: number): Promise<boolean> {
  return obtenerConfig<boolean>("bot.activo", empresaId, false);
}
export function mensajeNoRegistrado(empresaId: number): Promise<string> {
  return obtenerConfig<string>("bot.mensajeNoRegistrado", empresaId, MENSAJE_NO_REGISTRADO_DEFAULT);
}
```

- [ ] **Step 6: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/lib/domain/configuracion.ts src/lib/domain/configuracion.test.ts src/lib/services/configuracion.ts
git commit -m "feat(config): precedencia pura (con prueba) + servicio obtener/guardar/botActivo"
```

---

## Task 3: Permisos (módulo configuracion) + menú

**Files:**
- Modify: `src/lib/auth/roles.ts`, `src/lib/modules.ts`

- [ ] **Step 1: Módulo en `roles.ts`**

- En `MODULOS`, agrega `"configuracion",` después de `"roles",`.
- En `MODULO_LABEL`, agrega `configuracion: "Configuración",` (junto a `roles`).
- En el rol `Admin`, agrega `...p("configuracion", CRUD),`. (Contador hereda `.ver` por `SOLO_LECTURA`; SuperAdmin por `"*"`.)

- [ ] **Step 2: Ítem de menú en `modules.ts`**

En el grupo **Administración** (`titulo: "Administración"`), en `items`, agrega (importa el icono `Settings2` de lucide si no está):
```typescript
    { modulo: "configuracion", label: "Configuración", href: "/configuracion", icon: Settings2, listo: true, desc: "Ajustes y activación del asistente." },
```

- [ ] **Step 3: Verificar typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: TSC limpio; tests verdes.

- [ ] **Step 4: Re-seed roles + commit**

```bash
npm run db:seed:base
git add src/lib/auth/roles.ts src/lib/modules.ts
git commit -m "feat(config): módulo de permisos configuracion + ítem de menú"
```

---

## Task 4: Página de Configuración (interruptor del bot + mensaje)

**Files:**
- Create: `src/app/(app)/configuracion/actions.ts`, `config-form.tsx`, `page.tsx`

- [ ] **Step 1: Server action**

```typescript
// src/app/(app)/configuracion/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { guardarConfig } from "@/lib/services/configuracion";

export interface ConfigState { ok?: boolean; error?: string }

export async function guardarConfigBotAction(_prev: ConfigState, form: FormData): Promise<ConfigState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "configuracion.editar")) return { error: "No tienes permiso." };
  const activo = String(form.get("botActivo") || "") === "1";
  const mensaje = String(form.get("mensajeNoRegistrado") || "").trim();
  try {
    await guardarConfig("bot.activo", activo, c.ctx.empresaId, c.ctx);
    if (mensaje) await guardarConfig("bot.mensajeNoRegistrado", mensaje, c.ctx.empresaId, c.ctx);
  } catch (e) {
    console.error("[config] error:", e);
    return { error: "No se pudo guardar." };
  }
  revalidatePath("/configuracion");
  revalidatePath("/cotizaciones/asistente");
  return { ok: true };
}
```

- [ ] **Step 2: Formulario (Switch + mensaje)**

```tsx
// src/app/(app)/configuracion/config-form.tsx
"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { guardarConfigBotAction, type ConfigState } from "./actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

function Guardar() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null} Guardar</Button>;
}

export function ConfigForm({ botActivo, mensaje }: { botActivo: boolean; mensaje: string }) {
  const [state, action] = useActionState<ConfigState, FormData>(guardarConfigBotAction, {});
  const [activo, setActivo] = useState(botActivo);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="botActivo" value={activo ? "1" : "0"} />
      {state.error && <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertCircle className="size-4" /> {state.error}</div>}
      {state.ok && <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"><CheckCircle2 className="size-4" /> Guardado.</div>}
      <FormSection title="Asistente de pedidos (bot)" description="Activa o desactiva el asistente para esta empresa.">
        <div className="space-y-5">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <span className="text-sm font-medium">Asistente activo</span>
            <Switch checked={activo} onCheckedChange={setActivo} />
          </label>
          <Field label="Mensaje para quien no está registrado" hint="Lo recibe quien escriba sin ser cliente registrado.">
            <Textarea name="mensajeNoRegistrado" rows={3} defaultValue={mensaje} />
          </Field>
        </div>
      </FormSection>
      <Guardar />
    </form>
  );
}
```

> Verifica la API del `Switch` (`src/components/ui/switch.tsx`): si usa `checked`/`onCheckedChange` (Base UI suele usar `checked`/`onCheckedChange`). Ajusta los nombres de props si difiere.

- [ ] **Step 3: Página**

```tsx
// src/app/(app)/configuracion/page.tsx
import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { botActivo, mensajeNoRegistrado } from "@/lib/services/configuracion";
import { PageHeader } from "@/components/page-header";
import { ConfigForm } from "./config-form";

export const metadata: Metadata = { title: "Configuración — Vertex" };

export default async function ConfiguracionPage() {
  await requirePermiso("configuracion.ver");
  const { empresaId } = await requireEmpresa();
  const [activo, mensaje] = await Promise.all([botActivo(empresaId), mensajeNoRegistrado(empresaId)]);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Configuración" description="Ajustes del asistente de pedidos para esta empresa." />
      <ConfigForm botActivo={activo} mensaje={mensaje} />
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add "src/app/(app)/configuracion/"
git commit -m "feat(config): página de Configuración con interruptor del bot"
```

---

## Task 5: Extender el esquema de Claude (mensaje + completo)

**Files:**
- Modify: `src/lib/bot/schema.ts`, `src/lib/bot/schema.test.ts`

- [ ] **Step 1: Actualizar el test (nuevos campos requeridos)**

Reemplaza el contenido de `src/lib/bot/schema.test.ts` por:
```typescript
import { describe, it, expect } from "vitest";
import { salidaPedidoSchema } from "./schema";

describe("salidaPedidoSchema", () => {
  it("parsea items + mensajeAsistente + completo", () => {
    const r = salidaPedidoSchema.safeParse({
      items: [{ productoId: 1, nombre: "Tomate", cantidad: 10 }],
      mensajeAsistente: "¡Hola! Entendí tu pedido.",
      completo: true,
    });
    expect(r.success).toBe(true);
  });
  it("rechaza si falta mensajeAsistente", () => {
    const r = salidaPedidoSchema.safeParse({ items: [], completo: false });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Correr para ver fallar**

Run: `npx vitest run src/lib/bot/schema.test.ts`
Expected: FAIL (el esquema actual no exige `mensajeAsistente`/`completo`).

- [ ] **Step 3: Extender el esquema**

En `src/lib/bot/schema.ts`, reemplaza `salidaPedidoSchema` por:
```typescript
export const salidaPedidoSchema = z.object({
  items: z.array(salidaItemSchema),
  mensajeAsistente: z.string(),
  completo: z.boolean(),
  notas: z.string().optional(),
});
```

- [ ] **Step 4: Correr para ver pasar**

Run: `npx vitest run src/lib/bot/schema.test.ts`
Expected: PASS (2 tests). `mapear.test.ts` sigue verde (solo usa `items`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bot/schema.ts src/lib/bot/schema.test.ts
git commit -m "feat(bot): esquema con mensajeAsistente + completo (turno de chat)"
```

---

## Task 6: Contexto del cliente en el cerebro (cercanía + "lo mismo de la vez pasada")

**Files:**
- Modify: `src/lib/services/facturas.ts` (agregar `ultimoPedidoCliente`)
- Modify: `src/lib/bot/interpretar.ts`

- [ ] **Step 1: `ultimoPedidoCliente` en `facturas.ts`**

Agrega (usa los imports ya presentes: `and, eq, ne, desc`, `facturas`, `facturaDetalles`):
```typescript
/** Líneas de la última factura no anulada del cliente (para "lo mismo de la vez pasada"). */
export async function ultimoPedidoCliente(empresaId: number, clienteId: number): Promise<{ productoId: number; cantidad: number }[]> {
  const [f] = await db
    .select({ id: facturas.id })
    .from(facturas)
    .where(and(eq(facturas.empresaId, empresaId), eq(facturas.clienteId, clienteId), ne(facturas.estado, "anulada")))
    .orderBy(desc(facturas.fecha), desc(facturas.id))
    .limit(1);
  if (!f) return [];
  const det = await db.select({ productoId: facturaDetalles.productoId, cantidad: facturaDetalles.cantidad }).from(facturaDetalles).where(eq(facturaDetalles.facturaId, f.id));
  return det.map((d) => ({ productoId: d.productoId, cantidad: Number(d.cantidad) }));
}
```

- [ ] **Step 2: Extender `interpretarPedido` (contexto + ResultadoTurno)**

Reemplaza `src/lib/bot/interpretar.ts` por:
```typescript
import "server-only";
import { listarProductosVenta } from "@/lib/services/productos";
import { ultimoPrecioPorCliente } from "@/lib/services/facturas";
import { mapearPropuesta, type CatalogoItem, type Propuesta } from "./mapear";
import { pedirPedido, type ImagenEntrada } from "./cliente-claude";
import type { SalidaPedido } from "./schema";

export interface EntradaPedido { texto?: string; imagenes?: ImagenEntrada[]; }
export interface ContextoCliente {
  clienteNombre?: string;
  ultimoPedido?: { nombre: string; cantidad: number }[];
  borradorPrevio?: { nombre: string; cantidad: number }[];
}
export interface ResultadoTurno { mensajeAsistente: string; propuesta: Propuesta; completo: boolean; }

function construirPrompt(catalogo: CatalogoItem[], texto: string, ctx: ContextoCliente): string {
  const lista = catalogo.map((c) => `- id:${c.id} | ${c.nombre} (SKU ${c.sku})`).join("\n");
  const lineas = (arr?: { nombre: string; cantidad: number }[]) => (arr && arr.length ? arr.map((l) => `${l.cantidad} × ${l.nombre}`).join(", ") : "");
  return [
    "Eres el asistente de pedidos de una distribuidora, cálido y breve. Atiendes a un cliente conocido.",
    ctx.clienteNombre ? `El cliente se llama ${ctx.clienteNombre}; salúdalo por su nombre de forma natural.` : "",
    ctx.ultimoPedido?.length ? `Su último pedido fue: ${lineas(ctx.ultimoPedido)}. Si pide "lo mismo", "lo de siempre" o "la vez pasada", usa ese pedido.` : "",
    ctx.borradorPrevio?.length ? `Pedido en progreso de esta conversación: ${lineas(ctx.borradorPrevio)}. Complétalo o ajústalo con el nuevo mensaje.` : "",
    "",
    "Tarea: extraer productos y cantidades y EMPAREJAR cada uno con el catálogo por su `id`.",
    "Reglas: usa SOLO ids del catálogo; si un ítem no calza, productoId: null. NO inventes productos ni precios. No devuelvas precios.",
    "`mensajeAsistente`: tu respuesta al cliente (saludo + lo que entendiste o lo que falta).",
    "`completo`: true si el pedido está claro y listo; false si falta información (entonces pide lo que falta en mensajeAsistente).",
    "",
    "Catálogo:",
    lista,
    "",
    texto ? `Mensaje del cliente: ${texto}` : "El cliente envió una imagen con su pedido.",
  ].filter(Boolean).join("\n");
}

export async function interpretarPedido(
  empresaId: number,
  clienteId: number,
  entrada: EntradaPedido,
  ctx: ContextoCliente = {},
  pedir: (prompt: string, imagenes: ImagenEntrada[]) => Promise<SalidaPedido> = pedirPedido,
): Promise<ResultadoTurno> {
  const [productos, historial] = await Promise.all([
    listarProductosVenta(empresaId),
    ultimoPrecioPorCliente(empresaId, clienteId),
  ]);
  const catalogo: CatalogoItem[] = productos.map((p) => ({ id: p.id, nombre: p.nombre, sku: p.sku, precio: p.precio }));
  const salida = await pedir(construirPrompt(catalogo, entrada.texto ?? "", ctx), entrada.imagenes ?? []);
  const propuesta = mapearPropuesta(salida, catalogo, historial);
  return { mensajeAsistente: salida.mensajeAsistente, propuesta, completo: salida.completo };
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores (el `pedirPedido` ya devuelve `SalidaPedido` con los nuevos campos requeridos por el esquema).

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/facturas.ts src/lib/bot/interpretar.ts
git commit -m "feat(bot): contexto del cliente (nombre + último pedido + borrador) y ResultadoTurno"
```

---

## Task 7: Chat de prueba + gating + política solo-registrados

**Files:**
- Modify: `src/app/(app)/cotizaciones/asistente-actions.ts`
- Create: `src/app/(app)/cotizaciones/chat-asistente.tsx`
- Modify: `src/app/(app)/cotizaciones/asistente/page.tsx`

- [ ] **Step 1: Actions del chat**

Reemplaza `interpretarPedidoAction` por `enviarMensajeAction` (turno de chat); conserva `confirmarPedidoAction` tal cual. Agrega arriba los imports de `botActivo` y los servicios de contexto.

```typescript
// añadir imports
import { obtenerTercero, listarTerceros } from "@/lib/services/terceros";
import { listarProductos } from "@/lib/services/productos";
import { ultimoPedidoCliente } from "@/lib/services/facturas";
import { botActivo } from "@/lib/services/configuracion";
import type { Propuesta } from "@/lib/bot/mapear";
import type { ResultadoTurno } from "@/lib/bot/interpretar";

export interface TurnoState {
  mensajeAsistente?: string;
  propuesta?: Propuesta;
  completo?: boolean;
  clienteId?: number;
  error?: string;
}

export async function enviarMensajeAction(_prev: TurnoState, form: FormData): Promise<TurnoState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "cotizaciones.crear")) return { error: "No tienes permiso." };
  if (!(await botActivo(c.ctx.empresaId))) return { error: "El asistente está desactivado para esta empresa." };

  const clienteId = Number(form.get("clienteId")) || 0;
  if (!clienteId) return { error: "Elige el cliente." };
  const texto = String(form.get("texto") || "").trim();
  const imagenDataUrl = String(form.get("imagenDataUrl") || "").trim();
  if (!texto && !imagenDataUrl) return { error: "Escribe un mensaje o sube una foto." };

  let borradorPrevio: { nombre: string; cantidad: number }[] = [];
  try { borradorPrevio = JSON.parse(String(form.get("borradorJson") || "[]")); } catch { /* ignore */ }

  const { interpretarPedido } = await import("@/lib/bot/interpretar");
  try {
    const [cli, productos, ultimo] = await Promise.all([
      obtenerTercero(c.ctx.empresaId, clienteId),
      listarProductos(c.ctx.empresaId),
      ultimoPedidoCliente(c.ctx.empresaId, clienteId),
    ]);
    const prodPorId = new Map(productos.map((p) => [p.id, p.nombre]));
    const ultimoPedido = ultimo.map((u) => ({ nombre: prodPorId.get(u.productoId) ?? `#${u.productoId}`, cantidad: u.cantidad }));
    const r: ResultadoTurno = await interpretarPedido(
      c.ctx.empresaId,
      clienteId,
      { texto: texto || undefined, imagenes: imagenDataUrl ? [{ dataUrl: imagenDataUrl }] : [] },
      { clienteNombre: cli?.razonSocial, ultimoPedido, borradorPrevio: borradorPrevio.length ? borradorPrevio : undefined },
    );
    return { mensajeAsistente: r.mensajeAsistente, propuesta: r.propuesta, completo: r.completo, clienteId };
  } catch (e) {
    console.error("[bot] error en turno:", e);
    return { error: "No se pudo procesar. ¿Está configurada la API key?" };
  }
}
```

(El `confirmarPedidoAction` existente se mantiene igual — ya crea la cotización con `origen:"bot"`, `requiereRevision:true`.)

- [ ] **Step 2: Chat de burbujas**

```tsx
// src/app/(app)/cotizaciones/chat-asistente.tsx
"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { enviarMensajeAction, confirmarPedidoAction, type TurnoState, type ConfirmarState } from "./asistente-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { Field } from "@/components/ui/field";
import { AlertCircle, Loader2, Send, ShieldQuestion, Sparkles } from "lucide-react";

interface Opt { id: number; nombre: string }
type Burbuja = { de: "cliente" | "bot"; texto: string };
const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

function Enviar() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="icon" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</Button>;
}

export function ChatAsistente({ clientes, mensajeNoRegistrado }: { clientes: Opt[]; mensajeNoRegistrado: string }) {
  const [state, action] = useActionState<TurnoState, FormData>(enviarMensajeAction, {});
  const [, confAction] = useActionState<ConfirmarState, FormData>(confirmarPedidoAction, {});
  const [clienteId, setClienteId] = useState("");
  const [imagenDataUrl, setImagenDataUrl] = useState("");
  const [burbujas, setBurbujas] = useState<Burbuja[]>([]);
  const [borrador, setBorrador] = useState<{ nombre: string; cantidad: number }[]>([]);
  const [propuesta, setPropuesta] = useState<TurnoState["propuesta"]>();
  const [completo, setCompleto] = useState(false);
  const fin = useRef<HTMLDivElement>(null);

  // Al recibir respuesta del bot, agrega burbuja y actualiza borrador/propuesta.
  useEffect(() => {
    if (state.mensajeAsistente) {
      setBurbujas((b) => [...b, { de: "bot", texto: state.mensajeAsistente! }]);
      setPropuesta(state.propuesta);
      setCompleto(!!state.completo);
      // Si quedó incompleto, conserva lo entendido como borrador para el próximo mensaje.
      setBorrador(!state.completo && state.propuesta ? state.propuesta.lineas.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad })) : []);
    }
  }, [state]);
  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth" }); }, [burbujas]);

  function onSubmitTexto(form: FormData) {
    const t = String(form.get("texto") || "").trim();
    if (t) setBurbujas((b) => [...b, { de: "cliente", texto: t }]);
    return action(form);
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return setImagenDataUrl("");
    const r = new FileReader(); r.onload = () => setImagenDataUrl(String(r.result || "")); r.readAsDataURL(f);
  }
  function simularNoRegistrado() {
    setBurbujas((b) => [...b, { de: "cliente", texto: "(número no registrado)" }, { de: "bot", texto: mensajeNoRegistrado }]);
    setPropuesta(undefined); setCompleto(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Cliente (registrado)" required><div className="w-64"><SearchSelect value={clienteId} onValueChange={setClienteId} placeholder="Elegir cliente…" options={clientes.map((c) => ({ value: String(c.id), label: c.nombre }))} /></div></Field>
        <Button type="button" variant="outline" size="sm" onClick={simularNoRegistrado}><ShieldQuestion className="size-4" /> Simular no registrado</Button>
      </div>

      <div className="h-96 space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/20 p-4">
        {burbujas.length === 0 && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="size-4" /> Escribe como si fueras el cliente: "mándame 10 de tomate" o "lo mismo de la vez pasada".</p>}
        {burbujas.map((b, i) => (
          <div key={i} className={b.de === "cliente" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${b.de === "cliente" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>{b.texto}</div>
          </div>
        ))}
        <div ref={fin} />
      </div>

      {state.error && <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertCircle className="size-4" /> {state.error}</div>}

      {completo && propuesta && propuesta.lineas.length > 0 && (
        <form action={confAction} className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <input type="hidden" name="clienteId" value={state.clienteId ?? ""} />
          <input type="hidden" name="texto" value="" />
          <input type="hidden" name="propuestaJson" value={JSON.stringify(propuesta)} />
          <span className="text-sm">Pedido listo · <span className="font-semibold tabular">{money(propuesta.total)}</span></span>
          <Button type="submit">Confirmar y crear cotización</Button>
        </form>
      )}

      <form action={onSubmitTexto} className="flex items-end gap-2">
        <input type="hidden" name="clienteId" value={clienteId} />
        <input type="hidden" name="imagenDataUrl" value={imagenDataUrl} />
        <input type="hidden" name="borradorJson" value={JSON.stringify(borrador)} />
        <div className="flex-1"><Input name="texto" placeholder="Escribe el pedido del cliente…" autoComplete="off" /></div>
        <Input type="file" accept="image/*" onChange={onFile} className="w-40" />
        <Enviar />
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Página con gating**

```tsx
// src/app/(app)/cotizaciones/asistente/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarTerceros } from "@/lib/services/terceros";
import { botActivo, mensajeNoRegistrado } from "@/lib/services/configuracion";
import { PageHeader } from "@/components/page-header";
import { ChatAsistente } from "../chat-asistente";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Asistente de pedidos — Vertex" };

export default async function AsistentePage() {
  await requirePermiso("cotizaciones.crear");
  const { empresaId } = await requireEmpresa();
  const [activo, terceros, mensaje] = await Promise.all([
    botActivo(empresaId),
    listarTerceros(empresaId),
    mensajeNoRegistrado(empresaId),
  ]);

  if (!activo) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Asistente de pedidos" description="Chatbot de pedidos de clientes." />
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="font-medium">El asistente está desactivado para esta empresa.</p>
          <p className="text-sm text-muted-foreground">Actívalo en Configuración.</p>
          <Link href="/configuracion" className={buttonVariants({ variant: "outline", size: "sm" })}>Ir a Configuración</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Asistente de pedidos" description="Chat de prueba: escribe como el cliente; el bot arma la cotización." />
      <ChatAsistente
        clientes={terceros.filter((t) => t.activo && (t.tipo === "cliente" || t.tipo === "ambos")).map((t) => ({ id: t.id, nombre: t.razonSocial }))}
        mensajeNoRegistrado={mensaje}
      />
    </div>
  );
}
```

- [ ] **Step 4: Eliminar el formulario viejo**

Run: `git rm "src/app/(app)/cotizaciones/asistente-form.tsx"`
(El chat lo reemplaza. La acción vieja `interpretarPedidoAction` ya fue sustituida por `enviarMensajeAction`.)

- [ ] **Step 5: Typecheck + build + commit**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: TSC limpio; tests verdes; build OK; ruta `/configuracion` y `/cotizaciones/asistente` presentes.
```bash
git add -A
git commit -m "feat(bot): chat de prueba conversacional + gating por botActivo + política no-registrado"
```

---

## Task 8: Verificación + prueba en vivo

**Files:** ninguno.

- [ ] **Step 1: tsc + tests + build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: todo verde.

- [ ] **Step 2: Prueba en vivo (con la API key del usuario)**

Arranca `pnpm exec next start -p 3000`, login admin@demo.co. Verifica:
1. **Configuración** (`/configuracion`): activa el **Switch** del asistente → Guardar.
2. **Asistente** (`/cotizaciones/asistente`): elige un cliente; escribe "mándame 10 de tomate y 5 de cebolla" → el bot saluda por su nombre y muestra el pedido; con "lo mismo de la vez pasada" repite su última factura; un pedido incompleto ("quiero tomate") pide la cantidad y al responder se completa; al estar completo → **Confirmar** crea la cotización (origen bot, "revisar").
3. **"Simular no registrado"** → muestra el mensaje configurado.
4. Apaga el Switch en Configuración → el Asistente muestra "desactivado".

- [ ] **Step 3: Commit (si hubo ajustes) + push**

```bash
git add -A && git commit -m "test(bot): verificación de configuración + chat" || true
git push origin main
```

---

## Self-Review (hecha al escribir el plan)

1. **Cobertura del spec:** tabla KV vx41 (Task 1), precedencia pura + servicio + botActivo/mensajeNoRegistrado (Task 2), permisos+menú (Task 3), UI interruptor (Task 4), esquema mensajeAsistente+completo (Task 5), contexto del cliente + último pedido + ResultadoTurno (Task 6), chat + gating + política no-registrado + "simular" (Task 7), verificación + vivo (Task 8). Secretos en env (no en tabla) ✔. WhatsApp/audio/autorización-24h: fuera de alcance (sin tareas). ✔️
2. **Sin placeholders:** código completo; comandos con salida esperada. Notas de verificación: API exacta del `Switch` (Task 4 Step 2) y nombre del icono `Settings2` — se confirman al ejecutar. ✔️
3. **Consistencia de tipos:** `SalidaPedido` (con mensajeAsistente/completo) → `interpretarPedido` retorna `ResultadoTurno {mensajeAsistente, propuesta, completo}` → `enviarMensajeAction` → `TurnoState` → chat. `mapearPropuesta` intacto (solo usa items). `confirmarPedidoAction` y `crearCotizacion(origen,requiereRevision)` ya existen de la base anterior. ✔️

**Notas:**
- El chat mantiene el estado (mensajes + borrador) en el cliente; sin persistencia en servidor (fuera de alcance).
- La política "solo registrados" real (por número) es del canal; aquí el chat siempre usa un cliente registrado elegido, y "simular no registrado" valida el mensaje.
- Cada turno = 1 llamada a Claude (incluye imagen si se adjunta).

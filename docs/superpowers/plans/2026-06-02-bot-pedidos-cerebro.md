# Bot de pedidos — el cerebro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el cerebro (agnóstico al canal) del bot de pedidos: interpreta texto/imagen con Claude contra el catálogo y el historial del cliente, propone, el cliente confirma, y crea una cotización pendiente (vx39) marcada como del bot.

**Architecture:** Núcleo en `src/lib/bot/` con lógica pura (`mapear`) testeable sin API y un orquestador (`interpretar`) que llama a Claude vía Vercel AI SDK (`generateObject` + Zod, modelo Haiku 4.5 con visión). Claude solo mapea producto+cantidad a IDs reales; el sistema pone el precio (`ultimoPrecioPorCliente`→catálogo). Una pantalla interna "Asistente de pedidos" prueba el flujo dos-pasos (interpretar→confirmar) sin depender de WhatsApp.

**Tech Stack:** Next.js 15 (RSC, Server Actions), Vercel AI SDK (`ai` + `@ai-sdk/anthropic`), Zod, Drizzle, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-02-bot-pedidos-cerebro-design.md`

---

## File Structure

**Crear:**
- `src/lib/bot/schema.ts` — esquema Zod de la salida de Claude (`SalidaPedido`).
- `src/lib/bot/schema.test.ts` — parseo de una muestra.
- `src/lib/bot/mapear.ts` — **puro**: `mapearPropuesta(salida, catalogo, historial)` → `Propuesta`.
- `src/lib/bot/mapear.test.ts` — pruebas con fixtures (sin API).
- `src/lib/bot/cliente-claude.ts` — wrapper del modelo + `pedirPedido(prompt, imagenes)`.
- `src/lib/bot/interpretar.ts` — `interpretarPedido(empresaId, clienteId, entrada)` (orquesta).
- `src/app/(app)/cotizaciones/asistente/page.tsx` — pantalla de prueba.
- `src/app/(app)/cotizaciones/asistente-form.tsx` — formulario cliente (texto/imagen → propuesta → confirmar).
- `src/app/(app)/cotizaciones/asistente-actions.ts` — `interpretarPedidoAction`, `confirmarPedidoAction`.

**Modificar:**
- `src/lib/db/schema.ts` — `cotizaciones` (vx39): `origen`, `requiereRevision`.
- `src/lib/services/cotizaciones.ts` — `NuevaCotizacion` + `crearCotizacion` aceptan `origen`/`requiereRevision`.
- `src/app/(app)/cotizaciones/page.tsx` — badge "revisar" cuando `requiereRevision`.

**Tipos compartidos (definidos en Task 2/3, usados después):**
```typescript
// SalidaPedido (schema.ts) — lo que devuelve Claude
interface SalidaItem { productoId: number | null; nombre: string; cantidad: number; }
interface SalidaPedido { items: SalidaItem[]; notas?: string; }

// Propuesta (mapear.ts) — lista para mostrar y crear
interface LineaPropuesta { productoId: number; nombre: string; cantidad: number; precioUnitario: number; subtotal: number; }
interface Propuesta { lineas: LineaPropuesta[]; noReconocidos: string[]; resumen: string; total: number; }

// CatalogoItem / Historial — entradas de mapear
interface CatalogoItem { id: number; nombre: string; sku: string; precio: number; }
type Historial = Record<number, number>; // productoId -> último precio a ese cliente
```

---

## Task 1: Dependencias, API key y esquema vx39

**Files:**
- Modify: `package.json` (vía npm install)
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/services/cotizaciones.ts`

- [ ] **Step 1: Instalar el SDK de IA**

Run:
```bash
cd /Users/jhonatan/Docker/Vertex2/vertex2
npm install ai @ai-sdk/anthropic
```
Expected: agrega `ai` y `@ai-sdk/anthropic` a dependencies sin errores. (Zod ya está instalado.)

- [ ] **Step 2: Confirmar que `ANTHROPIC_API_KEY` está en `.env.local`**

Run: `grep -c '^ANTHROPIC_API_KEY=' .env.local`
Expected: `1` (la línea ya fue creada; el usuario pega su key cuando llegue la prueba en vivo de Task 7).

- [ ] **Step 3: Agregar columnas a `cotizaciones` (vx39)**

En `src/lib/db/schema.ts`, dentro del objeto de columnas de `cotizaciones` (vx39), después de `motivoAnulacion`, agrega:

```typescript
    origen: varchar("origen", { length: 10 }).notNull().default("manual"),
    requiereRevision: boolean("requiere_revision").notNull().default(false),
```

- [ ] **Step 4: Generar y aplicar la migración 0011**

Run:
```bash
npm run db:generate
ls -t supabase/migrations/*.sql | head -1
```
Expected: nuevo archivo `00XX_*.sql` con `ALTER TABLE "vx39" ADD COLUMN "origen" ...` y `"requiere_revision" ...`. Aplícalo con el cliente del proyecto (igual que la migración de cotizaciones):

```bash
cat > _apply_mig.mts <<'EOF'
import { config } from "dotenv";
config({ path: ".env.local" }); config({ path: ".env" });
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
const url = process.env.DATABASE_URL_SESSION ?? process.env.DATABASE_URL;
if (!url) { console.error("Sin DATABASE_URL"); process.exit(1); }
const file = execSync("ls -t supabase/migrations/*.sql | head -1").toString().trim();
const sql = postgres(url, { prepare: false, max: 1 });
const stmts = readFileSync(file, "utf8").split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
try { for (const s of stmts) { await sql.unsafe(s); console.log("ok:", s.split("\n")[0].slice(0, 60)); } console.log("APLICADA", file); }
catch (e) { console.error("ERROR:", (e as Error).message); process.exitCode = 1; }
finally { await sql.end(); }
EOF
npx tsx _apply_mig.mts && rm -f _apply_mig.mts
```
Expected: `ok: ALTER TABLE "vx39" ...` y `APLICADA`.

- [ ] **Step 5: Extender `crearCotizacion` para aceptar origen/requiereRevision**

En `src/lib/services/cotizaciones.ts`, en la interfaz `NuevaCotizacion` agrega dos campos opcionales:

```typescript
export interface NuevaCotizacion {
  clienteId: number;
  fecha: string;
  observaciones?: string;
  lineas: LineaNuevaCotizacion[];
  origen?: "manual" | "bot";
  requiereRevision?: boolean;
}
```

Y en el `.insert(cotizaciones).values({...})` dentro de `crearCotizacion`, agrega tras `observaciones: data.observaciones ?? null,`:

```typescript
        origen: data.origen ?? "manual",
        requiereRevision: data.requiereRevision ?? false,
```

- [ ] **Step 6: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json pnpm-lock.yaml src/lib/db/schema.ts src/lib/services/cotizaciones.ts supabase/migrations/
git commit -m "feat(bot): deps AI SDK + vx39 origen/requiereRevision (migración) + crearCotizacion extendido"
```

---

## Task 2: Esquema Zod de la salida de Claude

**Files:**
- Create: `src/lib/bot/schema.ts`
- Test: `src/lib/bot/schema.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

```typescript
// src/lib/bot/schema.test.ts
import { describe, it, expect } from "vitest";
import { salidaPedidoSchema } from "./schema";

describe("salidaPedidoSchema", () => {
  it("parsea items con productoId, nombre y cantidad", () => {
    const r = salidaPedidoSchema.safeParse({
      items: [
        { productoId: 1, nombre: "Tomate", cantidad: 10 },
        { productoId: null, nombre: "algo raro", cantidad: 2 },
      ],
      notas: "cliente con afán",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.items).toHaveLength(2);
  });
  it("rechaza cantidad no positiva", () => {
    const r = salidaPedidoSchema.safeParse({ items: [{ productoId: 1, nombre: "x", cantidad: 0 }] });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Correr para ver fallar**

Run: `npx vitest run src/lib/bot/schema.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar el esquema**

```typescript
// src/lib/bot/schema.ts
import { z } from "zod";

/**
 * Salida estructurada que se le pide a Claude. `productoId` es el id del catálogo
 * que se le pasó en el prompt; `null` si no encontró un producto que calce.
 * `nombre` es lo que el cliente pidió (sirve para el resumen y los no reconocidos).
 */
export const salidaItemSchema = z.object({
  productoId: z.number().int().nullable(),
  nombre: z.string(),
  cantidad: z.number().positive(),
});

export const salidaPedidoSchema = z.object({
  items: z.array(salidaItemSchema),
  notas: z.string().optional(),
});

export type SalidaItem = z.infer<typeof salidaItemSchema>;
export type SalidaPedido = z.infer<typeof salidaPedidoSchema>;
```

- [ ] **Step 4: Correr para ver pasar**

Run: `npx vitest run src/lib/bot/schema.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bot/schema.ts src/lib/bot/schema.test.ts
git commit -m "feat(bot): esquema zod de la salida de Claude"
```

---

## Task 3: Lógica pura de mapeo (salida Claude → propuesta)

**Files:**
- Create: `src/lib/bot/mapear.ts`
- Test: `src/lib/bot/mapear.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

```typescript
// src/lib/bot/mapear.test.ts
import { describe, it, expect } from "vitest";
import { mapearPropuesta } from "./mapear";

const catalogo = [
  { id: 1, nombre: "Tomate chonto", sku: "VRD-001", precio: 3000 },
  { id: 2, nombre: "Cebolla", sku: "VRD-002", precio: 2000 },
];

describe("mapearPropuesta", () => {
  it("empareja por productoId y usa el precio del historial del cliente (cae a catálogo)", () => {
    const salida = { items: [
      { productoId: 1, nombre: "tomate", cantidad: 10 }, // historial $3500
      { productoId: 2, nombre: "cebolla", cantidad: 5 },  // sin historial → catálogo $2000
    ] };
    const p = mapearPropuesta(salida, catalogo, { 1: 3500 });
    expect(p.lineas).toEqual([
      { productoId: 1, nombre: "Tomate chonto", cantidad: 10, precioUnitario: 3500, subtotal: 35000 },
      { productoId: 2, nombre: "Cebolla", cantidad: 5, precioUnitario: 2000, subtotal: 10000 },
    ]);
    expect(p.total).toBe(45000);
    expect(p.noReconocidos).toEqual([]);
  });

  it("manda a noReconocidos los items sin productoId o con id inexistente (nunca inventa)", () => {
    const salida = { items: [
      { productoId: null, nombre: "ajonjolí morado", cantidad: 2 },
      { productoId: 999, nombre: "fantasma", cantidad: 1 },
    ] };
    const p = mapearPropuesta(salida, catalogo, {});
    expect(p.lineas).toEqual([]);
    expect(p.noReconocidos).toEqual(["2 × ajonjolí morado", "1 × fantasma"]);
  });

  it("el resumen menciona las líneas y lo no reconocido", () => {
    const salida = { items: [
      { productoId: 1, nombre: "tomate", cantidad: 10 },
      { productoId: null, nombre: "perejil", cantidad: 1 },
    ] };
    const p = mapearPropuesta(salida, catalogo, {});
    expect(p.resumen).toContain("Tomate chonto");
    expect(p.resumen).toContain("perejil");
  });
});
```

- [ ] **Step 2: Correr para ver fallar**

Run: `npx vitest run src/lib/bot/mapear.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar el mapeo puro**

```typescript
// src/lib/bot/mapear.ts
import type { SalidaPedido } from "./schema";

export interface CatalogoItem { id: number; nombre: string; sku: string; precio: number; }
export type Historial = Record<number, number>;

export interface LineaPropuesta {
  productoId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}
export interface Propuesta {
  lineas: LineaPropuesta[];
  noReconocidos: string[];
  resumen: string;
  total: number;
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

/**
 * Convierte la salida de Claude en una propuesta lista para mostrar/crear.
 * - Empareja por `productoId` contra el catálogo (nunca inventa productos).
 * - Precio: último a ese cliente (historial) → precio de catálogo → 0.
 * - Items sin id válido → `noReconocidos` (texto "cantidad × nombre").
 */
export function mapearPropuesta(salida: SalidaPedido, catalogo: CatalogoItem[], historial: Historial): Propuesta {
  const porId = new Map(catalogo.map((c) => [c.id, c]));
  const lineas: LineaPropuesta[] = [];
  const noReconocidos: string[] = [];

  for (const it of salida.items) {
    const cat = it.productoId != null ? porId.get(it.productoId) : undefined;
    if (!cat) {
      noReconocidos.push(`${it.cantidad} × ${it.nombre}`);
      continue;
    }
    const precioUnitario = historial[cat.id] ?? cat.precio ?? 0;
    lineas.push({
      productoId: cat.id,
      nombre: cat.nombre,
      cantidad: it.cantidad,
      precioUnitario,
      subtotal: it.cantidad * precioUnitario,
    });
  }

  const total = lineas.reduce((a, l) => a + l.subtotal, 0);
  const partes: string[] = [];
  if (lineas.length) partes.push("Entendí:\n" + lineas.map((l) => `• ${l.cantidad} × ${l.nombre} (${money(l.precioUnitario)}) = ${money(l.subtotal)}`).join("\n"));
  if (lineas.length) partes.push(`Total: ${money(total)}`);
  if (noReconocidos.length) partes.push("No reconocí (los revisará el vendedor):\n" + noReconocidos.map((n) => `• ${n}`).join("\n"));
  const resumen = partes.join("\n\n") || "No entendí ningún producto.";

  return { lineas, noReconocidos, resumen, total };
}
```

- [ ] **Step 4: Correr para ver pasar**

Run: `npx vitest run src/lib/bot/mapear.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bot/mapear.ts src/lib/bot/mapear.test.ts
git commit -m "feat(bot): mapeo puro salida→propuesta (precio del sistema, no reconocidos) con pruebas"
```

---

## Task 4: Llamada a Claude + orquestador `interpretarPedido`

**Files:**
- Create: `src/lib/bot/cliente-claude.ts`
- Create: `src/lib/bot/interpretar.ts`

- [ ] **Step 1: Wrapper del modelo (aislado para poder simularlo)**

```typescript
// src/lib/bot/cliente-claude.ts
import "server-only";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { salidaPedidoSchema, type SalidaPedido } from "./schema";

export interface ImagenEntrada {
  /** data URL (p. ej. "data:image/jpeg;base64,...") o URL http(s). */
  dataUrl: string;
}

/**
 * Pide a Claude (Haiku 4.5, con visión) que estructure el pedido. La key se lee
 * de ANTHROPIC_API_KEY (env). Devuelve la salida ya validada por el esquema Zod.
 */
export async function pedirPedido(prompt: string, imagenes: ImagenEntrada[]): Promise<SalidaPedido> {
  const content: ({ type: "text"; text: string } | { type: "image"; image: string })[] = [{ type: "text", text: prompt }];
  for (const img of imagenes) content.push({ type: "image", image: img.dataUrl });

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: salidaPedidoSchema,
    messages: [{ role: "user", content }],
  });
  return object;
}
```

> Nota de implementación: si el provider exige el id con fecha, usar `anthropic("claude-haiku-4-5-20251001")`. Verificar el nombre exacto del export `anthropic` contra la versión instalada de `@ai-sdk/anthropic` al ejecutar.

- [ ] **Step 2: Orquestador**

`interpretarPedido` carga catálogo + historial, arma el prompt con instrucciones claras (mapear contra los IDs dados, no inventar), llama a Claude y mapea. Recibe `pedir` inyectable (default el real) para poder probarlo sin API en el futuro.

```typescript
// src/lib/bot/interpretar.ts
import "server-only";
import { listarProductosVenta } from "@/lib/services/productos";
import { ultimoPrecioPorCliente } from "@/lib/services/facturas";
import { mapearPropuesta, type CatalogoItem, type Propuesta } from "./mapear";
import { pedirPedido, type ImagenEntrada } from "./cliente-claude";
import type { SalidaPedido } from "./schema";

export interface EntradaPedido {
  texto?: string;
  imagenes?: ImagenEntrada[];
}

function construirPrompt(catalogo: CatalogoItem[], texto: string): string {
  const lista = catalogo.map((c) => `- id:${c.id} | ${c.nombre} (SKU ${c.sku})`).join("\n");
  return [
    "Eres el asistente de pedidos de una distribuidora. El cliente envía un pedido (texto y/o foto de una lista).",
    "Tu tarea: extraer los productos y cantidades, y EMPAREJAR cada uno con el catálogo de abajo usando su `id`.",
    "Reglas estrictas:",
    "- Usa SOLO los `id` del catálogo. Si un ítem no calza con ningún producto del catálogo, devuélvelo con productoId: null.",
    "- NO inventes productos ni precios. No devuelvas precios.",
    "- `cantidad` es un número (interpreta unidades como kg/libras/bultos según el texto, pero devuelve solo el número pedido).",
    "- `nombre` = lo que el cliente dijo para ese ítem.",
    "",
    "Catálogo (empareja contra estos id):",
    lista,
    "",
    texto ? `Pedido del cliente (texto): ${texto}` : "El pedido viene en la(s) imagen(es) adjunta(s).",
  ].join("\n");
}

/**
 * Interpreta un pedido (texto/imagen) contra el catálogo de la empresa y el
 * historial de precios del cliente. NO escribe en la base: devuelve una propuesta.
 */
export async function interpretarPedido(
  empresaId: number,
  clienteId: number,
  entrada: EntradaPedido,
  pedir: (prompt: string, imagenes: ImagenEntrada[]) => Promise<SalidaPedido> = pedirPedido,
): Promise<Propuesta> {
  const [productos, historial] = await Promise.all([
    listarProductosVenta(empresaId),
    ultimoPrecioPorCliente(empresaId, clienteId),
  ]);
  const catalogo: CatalogoItem[] = productos.map((p) => ({ id: p.id, nombre: p.nombre, sku: p.sku, precio: p.precio }));
  const prompt = construirPrompt(catalogo, entrada.texto ?? "");
  const salida = await pedir(prompt, entrada.imagenes ?? []);
  return mapearPropuesta(salida, catalogo, historial);
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores. (No corre la API; solo compila.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/bot/cliente-claude.ts src/lib/bot/interpretar.ts
git commit -m "feat(bot): cliente Claude (Haiku visión) + orquestador interpretarPedido"
```

---

## Task 5: Pantalla "Asistente de pedidos" (interpretar → confirmar → crear)

**Files:**
- Create: `src/app/(app)/cotizaciones/asistente-actions.ts`
- Create: `src/app/(app)/cotizaciones/asistente-form.tsx`
- Create: `src/app/(app)/cotizaciones/asistente/page.tsx`

- [ ] **Step 1: Server actions (interpretar y confirmar)**

`interpretarPedidoAction` devuelve la propuesta (no escribe). `confirmarPedidoAction` recibe la propuesta (JSON) que el usuario confirmó y crea la cotización con `crearCotizacion` (origen "bot", requiereRevision true). No re-llama a Claude (lo que se confirma = lo que se crea).

```typescript
// src/app/(app)/cotizaciones/asistente-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hoyColombia } from "@/lib/fecha";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { interpretarPedido } from "@/lib/bot/interpretar";
import { crearCotizacion } from "@/lib/services/cotizaciones";
import type { Propuesta } from "@/lib/bot/mapear";

export interface InterpretarState {
  propuesta?: Propuesta;
  clienteId?: number;
  texto?: string;
  error?: string;
}

export async function interpretarPedidoAction(_prev: InterpretarState, form: FormData): Promise<InterpretarState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "cotizaciones.crear")) return { error: "No tienes permiso." };

  const clienteId = Number(form.get("clienteId")) || 0;
  if (!clienteId) return { error: "Elige el cliente." };
  const texto = String(form.get("texto") || "").trim();
  const imagenDataUrl = String(form.get("imagenDataUrl") || "").trim();
  if (!texto && !imagenDataUrl) return { error: "Escribe el pedido o sube una foto." };

  try {
    const propuesta = await interpretarPedido(c.ctx.empresaId, clienteId, {
      texto: texto || undefined,
      imagenes: imagenDataUrl ? [{ dataUrl: imagenDataUrl }] : [],
    });
    return { propuesta, clienteId, texto };
  } catch (e) {
    console.error("[bot] error al interpretar:", e);
    return { error: "No se pudo interpretar el pedido. ¿Está configurada la API key?" };
  }
}

export interface ConfirmarState {
  error?: string;
}
export async function confirmarPedidoAction(_prev: ConfirmarState, form: FormData): Promise<ConfirmarState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa activa." };
  if (!puede(c.permisos, "cotizaciones.crear")) return { error: "No tienes permiso." };

  const clienteId = Number(form.get("clienteId")) || 0;
  let propuesta: Propuesta;
  try {
    propuesta = JSON.parse(String(form.get("propuestaJson") || "")) as Propuesta;
  } catch {
    return { error: "Propuesta inválida." };
  }
  if (!clienteId || propuesta.lineas.length === 0) return { error: "No hay líneas para crear." };

  const texto = String(form.get("texto") || "").trim();
  const obs = [
    "Pedido recibido por el asistente (bot).",
    texto ? `Mensaje del cliente: "${texto}"` : null,
    propuesta.noReconocidos.length ? `No reconocido: ${propuesta.noReconocidos.join(", ")}` : null,
  ].filter(Boolean).join("\n");

  let nuevoId: number;
  try {
    nuevoId = await crearCotizacion(
      {
        clienteId,
        fecha: hoyColombia(),
        observaciones: obs,
        lineas: propuesta.lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad, precioUnitario: l.precioUnitario })),
        origen: "bot",
        requiereRevision: true,
      },
      c.ctx,
    );
  } catch (e) {
    console.error("[bot] error al crear cotización:", e);
    return { error: "No se pudo crear la cotización." };
  }
  revalidatePath("/cotizaciones");
  redirect(`/cotizaciones/${nuevoId}`);
}
```

- [ ] **Step 2: Formulario cliente (texto/imagen → propuesta → confirmar)**

```tsx
// src/app/(app)/cotizaciones/asistente-form.tsx
"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { interpretarPedidoAction, confirmarPedidoAction, type InterpretarState, type ConfirmarState } from "./asistente-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

interface Opt { id: number; nombre: string }
const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

function Btn({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {children}</Button>;
}

export function AsistenteForm({ clientes }: { clientes: Opt[] }) {
  const [state, action] = useActionState<InterpretarState, FormData>(interpretarPedidoAction, {});
  const [confState, confAction] = useActionState<ConfirmarState, FormData>(confirmarPedidoAction, {});
  const [clienteId, setClienteId] = useState("");
  const [imagenDataUrl, setImagenDataUrl] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) { setImagenDataUrl(""); return; }
    const reader = new FileReader();
    reader.onload = () => setImagenDataUrl(String(reader.result || ""));
    reader.readAsDataURL(f);
  }

  const p = state.propuesta;

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-5">
        <input type="hidden" name="clienteId" value={clienteId} />
        <input type="hidden" name="imagenDataUrl" value={imagenDataUrl} />
        {state.error && (
          <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" /> {state.error}
          </div>
        )}
        <FormSection title="Pedido del cliente" description="Elige el cliente y pega el texto o sube una foto de la lista.">
          <div className="space-y-5">
            <Field label="Cliente" required>
              <SearchSelect value={clienteId} onValueChange={setClienteId} placeholder="Elegir cliente…" options={clientes.map((c) => ({ value: String(c.id), label: c.nombre }))} />
            </Field>
            <Field label="Texto del pedido">
              <Textarea name="texto" rows={3} placeholder="Ej. mándame 10 de tomate y 5 de cebolla" />
            </Field>
            <Field label="O una foto de la lista">
              <Input type="file" accept="image/*" onChange={onFile} />
            </Field>
          </div>
        </FormSection>
        <Btn>Interpretar pedido</Btn>
      </form>

      {p && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold">Esto entendí</h3>
          <pre className="whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm">{p.resumen}</pre>
          {confState.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {confState.error}
            </div>
          )}
          {p.lineas.length > 0 ? (
            <form action={confAction}>
              <input type="hidden" name="clienteId" value={state.clienteId ?? ""} />
              <input type="hidden" name="texto" value={state.texto ?? ""} />
              <input type="hidden" name="propuestaJson" value={JSON.stringify(p)} />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total {money(p.total)}</span>
                <Button type="submit">Confirmar y crear cotización</Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">No se reconoció ningún producto del catálogo; ajusta el pedido.</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Página**

```tsx
// src/app/(app)/cotizaciones/asistente/page.tsx
import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarTerceros } from "@/lib/services/terceros";
import { PageHeader } from "@/components/page-header";
import { AsistenteForm } from "../asistente-form";

export const metadata: Metadata = { title: "Asistente de pedidos — Vertex" };

export default async function AsistentePage() {
  await requirePermiso("cotizaciones.crear");
  const { empresaId } = await requireEmpresa();
  const terceros = await listarTerceros(empresaId);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Asistente de pedidos" description="Pega el pedido del cliente (texto o foto); el asistente arma la cotización para confirmar." />
      <AsistenteForm clientes={terceros.filter((t) => t.activo && (t.tipo === "cliente" || t.tipo === "ambos")).map((t) => ({ id: t.id, nombre: t.razonSocial }))} />
    </div>
  );
}
```

- [ ] **Step 4: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/cotizaciones/asistente-actions.ts" "src/app/(app)/cotizaciones/asistente-form.tsx" "src/app/(app)/cotizaciones/asistente/page.tsx"
git commit -m "feat(bot): pantalla Asistente de pedidos (interpretar→confirmar→crear)"
```

---

## Task 6: Badge "revisar" en la lista de cotizaciones

**Files:**
- Modify: `src/app/(app)/cotizaciones/page.tsx`

- [ ] **Step 1: Resaltar las cotizaciones que requieren revisión**

En la columna "Estado" de `columnas`, reemplaza la celda para mostrar un aviso cuando `requiereRevision`:

```tsx
    { header: "Estado", cell: (f) => (
      <span className="flex items-center gap-1.5">
        <Badge variant={VARIANTE[f.cotizacion.estado] ?? "outline"} className="font-normal capitalize">{f.cotizacion.estado}</Badge>
        {f.cotizacion.requiereRevision && <Badge variant="outline" className="border-amber-500/40 font-normal text-amber-600">revisar</Badge>}
      </span>
    ) },
```

- [ ] **Step 2: Verificar typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: TSC limpio; todos los tests pasan (incluye los nuevos de bot).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/cotizaciones/page.tsx"
git commit -m "feat(bot): badge 'revisar' en cotizaciones creadas por el asistente"
```

---

## Task 7: Verificación integral + prueba en vivo

**Files:** ninguno (verificación)

- [ ] **Step 1: Typecheck + pruebas + build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: TSC limpio; todos los tests verdes (schema + mapear nuevos); `Compiled successfully`. La ruta `/cotizaciones/asistente` aparece en el build.

- [ ] **Step 2: Prueba en vivo (requiere la API key del usuario)**

Pre-requisito: el usuario pegó `ANTHROPIC_API_KEY=...` en `.env.local`. Arranca `pnpm exec next start -p 3000`, entra como admin@demo.co, ve a **Ventas → Cotizaciones → Asistente de pedidos** (o `/cotizaciones/asistente`), elige un cliente, escribe "mándame 10 de tomate y 5 de cebolla", **Interpretar** → revisa el resumen → **Confirmar y crear** → debe abrir el detalle de la cotización (pendiente, `origen=bot`, badge "revisar"). Repite subiendo una **foto** de una lista escrita.

Expected: la propuesta refleja los productos del catálogo con precios del cliente; la cotización se crea pendiente y aparece en la lista con el badge "revisar".

- [ ] **Step 3: Commit (si hubo ajustes) + push**

```bash
git add -A && git commit -m "test(bot): verificación del asistente de pedidos" || true
git push origin main
```

---

## Self-Review (hecha al escribir el plan)

1. **Cobertura del spec:** deps + key + vx39 origen/requiereRevision (Task 1), esquema Zod (Task 2), mapeo puro con precio del sistema + no reconocidos (Task 3, con pruebas), Claude Haiku visión + interpretarPedido (Task 4), confirmar→crear con origen=bot/requiereRevision + observaciones (Task 5), pantalla asistente dos-pasos (Task 5), badge revisar (Task 6), pruebas puras con salida simulada + prueba en vivo (Task 3/7). WhatsApp/audio/multi-turno/push: fuera de alcance (sin tareas). ✔️
2. **Sin placeholders:** todo el código completo; comandos con salida esperada. La única nota abierta es verificar el id exacto del modelo / export `anthropic` contra la versión instalada (Task 4 Step 1) — se resuelve al ejecutar. ✔️
3. **Consistencia de tipos:** `SalidaPedido`/`SalidaItem` (schema) → `mapearPropuesta(salida, catalogo, historial)` → `Propuesta`/`LineaPropuesta` usados igual en interpretar y en las actions; `crearCotizacion` recibe `{productoId, cantidad, precioUnitario}` (coincide con `LineaNuevaCotizacion`); `origen`/`requiereRevision` consistentes entre schema, servicio y actions. ✔️

**Notas:**
- El precio NUNCA lo decide Claude: el esquema no incluye precio; lo pone `mapearPropuesta` desde historial→catálogo.
- `interpretarPedido` acepta `pedir` inyectable → permite, en el futuro, un test de orquestación sin API (no requerido en este plan; la cobertura pura está en `mapear`).
- `confirmarPedidoAction` no re-llama a Claude: crea exactamente lo que el usuario confirmó (más barato y predecible).

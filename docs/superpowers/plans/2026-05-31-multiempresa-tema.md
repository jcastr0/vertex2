# Tema/diseño por empresa (multiempresa) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada empresa elige una paleta predefinida (de ~24 curadas) y la app aplica esos colores dinámicamente según la empresa activa (logo Vertex, botones, acentos, sidebar).

**Architecture:** Catálogo de paletas en código. La empresa guarda solo la `key` de su paleta (`paleta_tema` en vx04). El layout `(app)` (server) lee la paleta de la empresa activa e inyecta variables CSS que sobreescriben los tokens de marca (SSR, sin parpadeo). El `VertexMark` ya usa `var(--primary)`, así que se recolorea solo. Editor "Apariencia" en el form de empresa con galería + preview en vivo. Sin dependencias nuevas, sin cambios de auth/usuarios.

**Tech Stack:** Next.js 15 RSC, Drizzle, Tailwind v4 (tokens CSS), vitest. Spec: `docs/superpowers/specs/2026-05-31-multiempresa-tema-design.md`.

**Convenciones:** dominio puro testeable en `src/lib/domain/*.ts` (`npx vitest run <archivo>`). Integración (toca BD) en `src/test/**` (GITIGNORADO) con `npx vitest run -c src/test/vitest.integration.config.ts <archivo>`. Gestor: **pnpm**. Migraciones: `npm run db:generate` + `npm run db:migrate` (dev, data desechable). Verificar siempre con `npx tsc --noEmit` y `npm run build`.

---

## File Structure
- `src/lib/temas/paletas.ts` — catálogo `PALETAS` (24) + `getPaleta(key)`. Sin `server-only` (lo usa el form cliente y el layout server).
- `src/lib/domain/tema.ts` (+ `.test.ts`) — `contraste(hex)` y `temaCss(paleta)` (puros).
- `src/lib/db/schema.ts` — agregar `paletaTema` a vx04.
- `src/lib/validation/empresa.ts` — agregar `paletaTema` al schema + parse.
- `src/lib/services/empresas.ts` — incluir `paletaTema` en `aColumnas`.
- `src/app/(app)/layout.tsx` — leer paleta de empresa activa + inyectar `<style>`.
- `src/app/(app)/empresas/paleta-picker.tsx` — `"use client"` galería + preview.
- `src/app/(app)/empresas/empresa-form.tsx` — sección "Apariencia" con `PaletaPicker`.
- `src/app/(app)/empresas/[id]/editar/page.tsx` — pasar `paletaTema` al form.
- `src/lib/db/seed-empresas.ts` — 3 empresas con paletas distintas. `package.json` script.

---

## Task 1: Migración — columna `paleta_tema` en vx04

**Files:** Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Agregar la columna a la tabla `empresas` (vx04)**

Localiza `export const empresas = pgTable("vx04", {` y agrega, junto a `temaColor`:
```ts
    paletaTema: varchar("paleta_tema", { length: 40 }),
```

- [ ] **Step 2: Generar y aplicar migración**

Run: `npm run db:generate && npm run db:migrate`
Expected: nueva migración `ALTER TABLE "vx04" ADD COLUMN "paleta_tema" varchar(40);` aplicada.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts supabase/migrations && git commit -m "feat(tema): columna paleta_tema en empresas (vx04)"
```

---

## Task 2: Catálogo de paletas

**Files:** Create: `src/lib/temas/paletas.ts`, `src/lib/temas/paletas.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/lib/temas/paletas.test.ts
import { describe, it, expect } from "vitest";
import { PALETAS, getPaleta } from "./paletas";

const HEX = /^#[0-9a-fA-F]{6}$/;

describe("PALETAS", () => {
  it("tiene 24 paletas con keys únicas", () => {
    expect(PALETAS.length).toBe(24);
    expect(new Set(PALETAS.map((p) => p.key)).size).toBe(24);
  });
  it("cada paleta tiene 3 colores hex válidos", () => {
    for (const p of PALETAS) {
      expect(p.primario).toMatch(HEX);
      expect(p.acento).toMatch(HEX);
      expect(p.sidebar).toMatch(HEX);
      expect(p.nombre.length).toBeGreaterThan(0);
      expect(p.familia.length).toBeGreaterThan(0);
    }
  });
  it("incluye la paleta por defecto 'esmeralda'", () => {
    expect(getPaleta("esmeralda")?.primario).toBe("#059669");
  });
});

describe("getPaleta", () => {
  it("devuelve null para key desconocida o null", () => {
    expect(getPaleta("noexiste")).toBeNull();
    expect(getPaleta(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test → falla**

Run: `npx vitest run src/lib/temas/paletas.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar el catálogo (24 paletas curadas)**

```ts
// src/lib/temas/paletas.ts
export interface Paleta {
  key: string;
  nombre: string;
  familia: string;
  primario: string;
  acento: string;
  sidebar: string;
}

export const PALETAS: Paleta[] = [
  // Verdes
  { key: "esmeralda", nombre: "Esmeralda", familia: "Verdes", primario: "#059669", acento: "#f59e0b", sidebar: "#0b3b2e" },
  { key: "bosque", nombre: "Bosque", familia: "Verdes", primario: "#15803d", acento: "#84cc16", sidebar: "#14271b" },
  { key: "teal", nombre: "Teal", familia: "Verdes", primario: "#0d9488", acento: "#f59e0b", sidebar: "#0c2f2b" },
  // Azules
  { key: "oceano", nombre: "Océano", familia: "Azules", primario: "#0284c7", acento: "#f59e0b", sidebar: "#0b2a3f" },
  { key: "indigo", nombre: "Índigo", familia: "Azules", primario: "#4f46e5", acento: "#f59e0b", sidebar: "#1e1b4b" },
  { key: "cielo", nombre: "Cielo", familia: "Azules", primario: "#0ea5e9", acento: "#f43f5e", sidebar: "#0c2233" },
  // Naranjas / Ámbar
  { key: "mandarina", nombre: "Mandarina", familia: "Naranjas", primario: "#ea580c", acento: "#0d9488", sidebar: "#3a1c0b" },
  { key: "ambar", nombre: "Ámbar", familia: "Naranjas", primario: "#d97706", acento: "#1d4ed8", sidebar: "#3a2a0b" },
  { key: "dorado", nombre: "Dorado", familia: "Naranjas", primario: "#ca8a04", acento: "#0f766e", sidebar: "#2e2407" },
  // Rojos / Vino
  { key: "carmesi", nombre: "Carmesí", familia: "Rojos", primario: "#dc2626", acento: "#f59e0b", sidebar: "#3a1212" },
  { key: "vino", nombre: "Vino", familia: "Rojos", primario: "#9f1239", acento: "#f59e0b", sidebar: "#2e0e1a" },
  { key: "ladrillo", nombre: "Ladrillo", familia: "Rojos", primario: "#b91c1c", acento: "#0d9488", sidebar: "#311111" },
  // Morados
  { key: "violeta", nombre: "Violeta", familia: "Morados", primario: "#7c3aed", acento: "#f59e0b", sidebar: "#241452" },
  { key: "ciruela", nombre: "Ciruela", familia: "Morados", primario: "#9333ea", acento: "#14b8a6", sidebar: "#2a1140" },
  { key: "lavanda", nombre: "Lavanda", familia: "Morados", primario: "#6d28d9", acento: "#ec4899", sidebar: "#221049" },
  // Rosas
  { key: "fucsia", nombre: "Fucsia", familia: "Rosas", primario: "#c026d3", acento: "#f59e0b", sidebar: "#3a1043" },
  { key: "rosa", nombre: "Rosa", familia: "Rosas", primario: "#db2777", acento: "#0d9488", sidebar: "#3a1124" },
  { key: "coral", nombre: "Coral", familia: "Rosas", primario: "#f43f5e", acento: "#0ea5e9", sidebar: "#3a121e" },
  // Neutros
  { key: "grafito", nombre: "Grafito", familia: "Neutros", primario: "#475569", acento: "#f59e0b", sidebar: "#1e293b" },
  { key: "pizarra", nombre: "Pizarra", familia: "Neutros", primario: "#334155", acento: "#10b981", sidebar: "#0f172a" },
  { key: "acero", nombre: "Acero", familia: "Neutros", primario: "#57534e", acento: "#f59e0b", sidebar: "#1c1917" },
  // Tierra
  { key: "cafe", nombre: "Café", familia: "Tierra", primario: "#92400e", acento: "#16a34a", sidebar: "#2a1a0c" },
  { key: "oliva", nombre: "Oliva", familia: "Tierra", primario: "#4d7c0f", acento: "#ea580c", sidebar: "#1f2a0c" },
  { key: "terracota", nombre: "Terracota", familia: "Tierra", primario: "#c2410c", acento: "#0f766e", sidebar: "#2e1a0e" },
];

export function getPaleta(key: string | null | undefined): Paleta | null {
  if (!key) return null;
  return PALETAS.find((p) => p.key === key) ?? null;
}
```
Nota: estas paletas se curaron con criterio de **frontend-design** (combinaciones armónicas por familia: primario de marca, acento que combina, sidebar oscuro del mismo matiz). Si se ajustan, mantener esa coherencia y la cantidad (24).

- [ ] **Step 4: Correr el test → pasa**

Run: `npx vitest run src/lib/temas/paletas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/temas/paletas.ts src/lib/temas/paletas.test.ts && git commit -m "feat(tema): catálogo de 24 paletas curadas"
```

---

## Task 3: Dominio — contraste + temaCss (TDD)

**Files:** Create: `src/lib/domain/tema.ts`, `src/lib/domain/tema.test.ts`

- [ ] **Step 1: Test que falla**

```ts
// src/lib/domain/tema.test.ts
import { describe, it, expect } from "vitest";
import { contraste, temaCss } from "./tema";
import { getPaleta } from "@/lib/temas/paletas";

describe("contraste", () => {
  it("texto oscuro sobre color claro", () => {
    expect(contraste("#f59e0b")).toBe("#111111");
    expect(contraste("#ffffff")).toBe("#111111");
  });
  it("texto claro sobre color oscuro", () => {
    expect(contraste("#0b3b2e")).toBe("#ffffff");
    expect(contraste("#059669")).toBe("#ffffff");
  });
});

describe("temaCss", () => {
  it("cadena vacía si no hay paleta", () => {
    expect(temaCss(null)).toBe("");
  });
  it("inyecta las variables de marca", () => {
    const css = temaCss(getPaleta("oceano"));
    expect(css).toContain("--primary:#0284c7");
    expect(css).toContain("--accent:#f59e0b");
    expect(css).toContain("--sidebar:#0b2a3f");
    expect(css).toContain("--sidebar-primary:#0284c7");
    expect(css.startsWith(":root{")).toBe(true);
  });
});
```

- [ ] **Step 2: Correr → falla**

Run: `npx vitest run src/lib/domain/tema.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```ts
// src/lib/domain/tema.ts
import type { Paleta } from "@/lib/temas/paletas";

/** Texto legible (#111111 u #ffffff) sobre un color hex, por luminancia relativa. */
export function contraste(hex: string): "#111111" | "#ffffff" {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.45 ? "#111111" : "#ffffff";
}

/** CSS que sobreescribe los tokens de marca con la paleta. Vacío si no hay paleta. */
export function temaCss(paleta: Paleta | null): string {
  if (!paleta) return "";
  const { primario, acento, sidebar } = paleta;
  const vars: Record<string, string> = {
    "--primary": primario,
    "--primary-foreground": contraste(primario),
    "--accent": acento,
    "--accent-foreground": contraste(acento),
    "--ring": primario,
    "--sidebar": sidebar,
    "--sidebar-foreground": contraste(sidebar),
    "--sidebar-primary": primario,
    "--sidebar-primary-foreground": contraste(primario),
    "--sidebar-ring": primario,
  };
  const cuerpo = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";");
  return `:root{${cuerpo}}`;
}
```

- [ ] **Step 4: Correr → pasa**

Run: `npx vitest run src/lib/domain/tema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/tema.ts src/lib/domain/tema.test.ts && git commit -m "feat(tema): contraste + temaCss (dominio puro)"
```

---

## Task 4: Validación + servicio empresas (persistir paletaTema)

**Files:** Modify: `src/lib/validation/empresa.ts`, `src/lib/services/empresas.ts`

- [ ] **Step 1: Validación — agregar `paletaTema` al schema**

En `src/lib/validation/empresa.ts`, agrega al objeto `empresaSchema` (tras `pais`):
```ts
  paletaTema: z.string().trim().max(40).optional().or(z.literal("")),
```
y en `parseEmpresaForm`, dentro del objeto:
```ts
    paletaTema: form.get("paletaTema") ?? "",
```

- [ ] **Step 2: Servicio — incluir en `aColumnas`**

En `src/lib/services/empresas.ts`, dentro de `function aColumnas(data: EmpresaInput)`, agrega al objeto retornado:
```ts
    paletaTema: data.paletaTema || null,
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/validation/empresa.ts src/lib/services/empresas.ts && git commit -m "feat(tema): persistir paletaTema en empresa"
```

---

## Task 5: Inyección del tema en el layout (app)

**Files:** Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Leer la paleta de la empresa activa e inyectar `<style>`**

En `src/app/(app)/layout.tsx`:
1. Agrega imports:
```ts
import { getPaleta } from "@/lib/temas/paletas";
import { temaCss } from "@/lib/domain/tema";
```
2. Cambia el `select` de la empresa activa para traer también `paletaTema`:
```ts
  let empresaNombre: string | null = null;
  let paletaKey: string | null = null;
  if (empresaIdActiva) {
    try {
      const [e] = await db
        .select({ nombre: empresas.nombre, paletaTema: empresas.paletaTema })
        .from(empresas)
        .where(eq(empresas.id, empresaIdActiva))
        .limit(1);
      empresaNombre = e?.nombre ?? null;
      paletaKey = e?.paletaTema ?? null;
    } catch {
      empresaNombre = null;
    }
  }
  const css = temaCss(getPaleta(paletaKey));
```
3. Dentro del `return`, como primer hijo del `<div className="flex h-svh overflow-hidden">`, inyecta el estilo (solo si hay css):
```tsx
      {css && <style id="tema-empresa" dangerouslySetInnerHTML={{ __html: css }} />}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/layout.tsx" && git commit -m "feat(tema): inyectar paleta de la empresa activa en el layout"
```

---

## Task 6: Editor "Apariencia" (galería + preview) — usar frontend-design

**Files:** Create: `src/app/(app)/empresas/paleta-picker.tsx`; Modify: `src/app/(app)/empresas/empresa-form.tsx`, `src/app/(app)/empresas/[id]/editar/page.tsx`

> Esta tarea construye UI visual. **Usar el skill superpowers:frontend-design** para que la galería de swatches y el preview se vean pulidos y distintivos (no genéricos): swatches con los 3 colores, agrupados por familia, estado seleccionado claro; preview = mini-mockup de la app (logo Vertex teñido + barra de sidebar + botón primario + chip de acento + tarjeta) reaccionando a la paleta elegida.

- [ ] **Step 1: Crear `paleta-picker.tsx` (cliente)**

```tsx
"use client";
import { useState } from "react";
import { PALETAS, getPaleta } from "@/lib/temas/paletas";
import { contraste } from "@/lib/domain/tema";
import { cn } from "@/lib/utils";
import { Check, Triangle } from "lucide-react";

export function PaletaPicker({ defaultKey }: { defaultKey?: string | null }) {
  const [sel, setSel] = useState<string>(defaultKey ?? "");
  const paleta = getPaleta(sel);
  const familias = [...new Set(PALETAS.map((p) => p.familia))];

  return (
    <div className="space-y-5">
      <input type="hidden" name="paletaTema" value={sel} />

      {/* Preview en vivo */}
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="flex">
          <div className="flex w-28 flex-col gap-2 p-3" style={{ background: paleta?.sidebar ?? "var(--sidebar)", color: paleta ? contraste(paleta.sidebar) : "var(--sidebar-foreground)" }}>
            <span className="flex items-center gap-1.5 font-bold">
              <Triangle className="size-4 fill-current" style={{ color: paleta?.primario ?? "var(--primary)" }} /> Vertex
            </span>
            <span className="mt-2 rounded-md px-2 py-1 text-xs" style={{ background: paleta?.primario ?? "var(--primary)", color: paleta ? contraste(paleta.primario) : "#fff" }}>Vender</span>
            <span className="rounded-md px-2 py-1 text-xs opacity-70">Cobrar</span>
          </div>
          <div className="flex-1 space-y-2 bg-card p-4">
            <div className="h-2 w-24 rounded bg-muted" />
            <div className="flex gap-2">
              <span className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: paleta?.primario ?? "var(--primary)", color: paleta ? contraste(paleta.primario) : "#fff" }}>Botón primario</span>
              <span className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: paleta?.acento ?? "var(--accent)", color: paleta ? contraste(paleta.acento) : "#111" }}>Acento</span>
            </div>
            <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">Tarjeta de ejemplo</div>
          </div>
        </div>
      </div>

      {/* Galería por familia */}
      <div className="space-y-4">
        <button type="button" onClick={() => setSel("")} className={cn("text-sm font-medium", sel === "" ? "text-primary underline" : "text-muted-foreground hover:underline")}>
          Usar tema por defecto
        </button>
        {familias.map((fam) => (
          <div key={fam}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{fam}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {PALETAS.filter((p) => p.familia === fam).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSel(p.key)}
                  aria-pressed={sel === p.key}
                  className={cn("group relative flex flex-col gap-1 rounded-xl border p-2 text-left transition-all", sel === p.key ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/40")}
                >
                  <span className="flex h-8 overflow-hidden rounded-md">
                    <span className="flex-1" style={{ background: p.primario }} />
                    <span className="w-1/4" style={{ background: p.acento }} />
                    <span className="w-1/4" style={{ background: p.sidebar }} />
                  </span>
                  <span className="flex items-center justify-between text-xs font-medium">
                    {p.nombre}
                    {sel === p.key && <Check className="size-3.5 text-primary" />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Agregar la sección al `empresa-form.tsx`**

1. Importar: `import { PaletaPicker } from "./paleta-picker";`
2. Extender `Props.empresa` para incluir `paletaTema?: string | null` (en la interfaz `Props`).
3. Tras la última `FormSection` (Contacto y ubicación) y antes del bloque de botones, agregar:
```tsx
      <FormSection title="Apariencia" description="Elige la paleta de color de la empresa. El logo y los colores de la app se ajustan a esta selección.">
        <PaletaPicker defaultKey={empresa?.paletaTema} />
      </FormSection>
```

- [ ] **Step 3: Pasar `paletaTema` desde la página de editar**

En `src/app/(app)/empresas/[id]/editar/page.tsx`, donde se arma el objeto `empresa={{...}}` para `<EmpresaForm>`, agregar el campo:
```tsx
        paletaTema: empresa.paletaTema,
```
(El objeto que carga `obtenerEmpresa` ya trae todas las columnas, incluida `paletaTema`.)

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit` (exit 0); `npm run build` (OK)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/empresas/paleta-picker.tsx" "src/app/(app)/empresas/empresa-form.tsx" "src/app/(app)/empresas/[id]/editar/page.tsx" && git commit -m "feat(tema): editor Apariencia (galería de paletas + preview en vivo)"
```

---

## Task 7: Seed de 3 empresas con paletas distintas

**Files:** Create: `src/lib/db/seed-empresas.ts`; Modify: `package.json`

- [ ] **Step 1: Crear el seed**

```ts
// src/lib/db/seed-empresas.ts
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { hashPassword } from "@/lib/auth/password";

const url = process.env.DATABASE_URL_SESSION ?? process.env.DATABASE_URL;
if (!url) { console.error("✗ DATABASE_URL no definida."); process.exit(1); }
const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

const EMPRESAS = [
  { nombre: "Verdulería El Campo", razonSocial: "Verdulería El Campo S.A.S.", nit: "901111111", email: "campo@demo.co", paletaTema: "bosque", admin: "campo@demo.co" },
  { nombre: "Frutas del Valle", razonSocial: "Frutas del Valle S.A.S.", nit: "902222222", email: "valle@demo.co", paletaTema: "mandarina", admin: "valle@demo.co" },
  { nombre: "Mercado Central", razonSocial: "Mercado Central S.A.S.", nit: "903333333", email: "central@demo.co", paletaTema: "oceano", admin: "central@demo.co" },
];

async function main() {
  const roles = await db.select().from(schema.roles);
  const rolAdmin = roles.find((r) => r.nombre === "Admin") ?? roles[0];
  const hash = await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? "Vertex2026!");

  for (const e of EMPRESAS) {
    let [emp] = await db.select().from(schema.empresas).where(eq(schema.empresas.nombre, e.nombre)).limit(1);
    if (!emp) {
      [emp] = await db.insert(schema.empresas).values({ nombre: e.nombre, razonSocial: e.razonSocial, nit: e.nit, email: e.email, pais: "Colombia", paletaTema: e.paletaTema }).returning();
    } else {
      await db.update(schema.empresas).set({ paletaTema: e.paletaTema }).where(eq(schema.empresas.id, emp.id));
    }
    // admin de la empresa
    let [u] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.email, e.admin)).limit(1);
    if (!u) {
      [u] = await db.insert(schema.usuarios).values({ empresaId: emp.id, nombre: `Admin ${e.nombre}`, email: e.admin, password: hash, activo: true }).returning();
    }
    await db.insert(schema.usuariosEmpresas).values({ usuarioId: u.id, empresaId: emp.id, rolId: rolAdmin.id }).onConflictDoNothing();
    console.log(`  ✓ ${e.nombre} (paleta ${e.paletaTema}) — admin ${e.admin}`);
  }
  console.log("Listo. Entra como superadmin (admin@vertex.co) y cambia de empresa para ver los temas.");
  process.exit(0);
}
main().catch((err) => { console.error("✗", err); process.exit(1); });
```

- [ ] **Step 2: Agregar script a `package.json`**

En `"scripts"`, junto a `db:seed:ruta`:
```json
    "db:seed:empresas": "tsx src/lib/db/seed-empresas.ts",
```

- [ ] **Step 3: Ejecutar el seed**

Run: `npx tsx src/lib/db/seed-empresas.ts`
Expected: imprime las 3 empresas con su paleta y admin.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/seed-empresas.ts package.json && git commit -m "chore(demo): seed de 3 empresas con paletas distintas"
```

---

## Task 8: Verificación end-to-end + deploy

**Files:** Create (gitignored): `src/test/tema.integration.test.ts`

- [ ] **Step 1: Test de integración (gitignored)**

```ts
// src/test/tema.integration.test.ts
import { config } from "dotenv";
config({ path: ".env.local" });
if (!process.env.DATABASE_URL && process.env.DATABASE_URL_SESSION) process.env.DATABASE_URL = process.env.DATABASE_URL_SESSION;
import { describe, it, expect } from "vitest";
import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { empresas } from "@/lib/db/schema";
import { getPaleta } from "@/lib/temas/paletas";
import { temaCss } from "@/lib/domain/tema";

describe.skipIf(!process.env.DATABASE_URL)("Tema por empresa", () => {
  it("las empresas sembradas tienen paleta válida y generan CSS", async () => {
    const rows = await db.select({ nombre: empresas.nombre, paleta: empresas.paletaTema }).from(empresas).where(isNotNull(empresas.paletaTema));
    console.log("Empresas con paleta:", rows.map((r) => `${r.nombre}=${r.paleta}`).join(" · "));
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      const p = getPaleta(r.paleta);
      expect(p, `paleta ${r.paleta} de ${r.nombre} debe existir`).not.toBeNull();
      expect(temaCss(p)).toContain("--primary:");
    }
  }, 30000);
});
```

Run: `npx vitest run -c src/test/vitest.integration.config.ts src/test/tema.integration.test.ts --disableConsoleIntercept`
Expected: PASS; imprime las empresas con su paleta.

- [ ] **Step 2: Suite + build limpios**

Run: `npx vitest run` (todo verde, incluye `paletas.test.ts` y `tema.test.ts`)
Run: `rm -rf .next/types && npm run build` (OK)

- [ ] **Step 3: Commit final + push**

```bash
git add -A && git commit -m "test(tema): verificación de integración del tema por empresa" && git push origin main
```

- [ ] **Step 4: Verificación manual**

Entrar como superadmin (`admin@vertex.co`), cambiar de empresa con el selector del topbar y ver cambiar logo/colores/sidebar; editar una empresa → sección Apariencia → elegir paleta → preview → guardar → ver el cambio.

---

## Self-Review (cobertura del spec)
- Paletas predefinidas (~24) en código: Task 2. ✔
- Modelo `paleta_tema` en vx04: Task 1. ✔
- Inyección dinámica de CSS por empresa activa (SSR): Task 5 (+ temaCss Task 3). ✔
- Logo Vertex teñido (usa --primary): cubierto por Task 5 (sin cambios al logo). ✔
- Editor "Apariencia" galería + preview (frontend-design): Task 6. ✔
- Nombre de empresa en topbar: ya existe (el layout pasa `empresa`); sin tarea nueva. ✔
- contraste + temaCss + getPaleta con tests: Tasks 2, 3. ✔
- Seed 3 empresas con paletas: Task 7. ✔
- Permiso `empresas.editar` (editor): el form ya vive bajo páginas con ese permiso. ✔
- Sin colores libres / sin Blob / sin cambios de auth: respetado (Tasks 2/6 solo paletas; nada de upload/JWT). ✔
- Tipos consistentes: `Paleta` (Task 2) usado en `temaCss`/`getPaleta` (Tasks 3) y `PaletaPicker` (Task 6); `paletaTema` (string|null) consistente en schema/validación/servicio/form. ✔

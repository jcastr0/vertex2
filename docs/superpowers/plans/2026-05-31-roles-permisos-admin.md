# Administración de Roles y Permisos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans. Steps con checkbox (`- [ ]`).

**Goal:** Mover la fuente de verdad de los permisos del código a la BD (`vx01.permisos`), evaluarlos al instante por request, y dar una pantalla (solo SuperAdmin) para editar la matriz módulo×acción por rol y crear roles.

**Architecture:** `puede(permisos[], permiso)` chequea una lista. `getPermisos()` (server-only, React `cache()` por request) devuelve los permisos del usuario actual desde la BD (`["*"]` si superadmin; fallback al mapa de código). El guard, `contextoAccion`, el sidebar y los call-sites se migran de `puede(rol,…)` a `puede(permisos,…)`. UI de roles con matriz editable.

**Tech Stack:** Next.js 15 RSC, Drizzle, vitest. Spec: `docs/superpowers/specs/2026-05-31-roles-permisos-admin-design.md`.

**Convenciones:** pnpm. Dominio puro testeable en `src/lib/domain` o `src/lib/auth` (`npx vitest run <archivo>`). Integración (BD) en `src/test/**` (GITIGNORADO). Verificar con `npx tsc --noEmit` y `npm run build`. `getPermisos` es `server-only` (NUNCA importarla en componentes cliente; el sidebar recibe `permisos` por prop). El mapa `ROLES` del código se conserva como semilla + fallback.

---

## Task 1: `puede` por lista + módulo `roles` + etiquetas (TDD)

**Files:** Modify: `src/lib/auth/roles.ts`, `src/lib/auth/roles.test.ts`

- [ ] **Step 1: Reescribir el test (refleja la nueva firma por lista)**

Reemplaza el contenido de `src/lib/auth/roles.test.ts` por:
```ts
import { describe, it, expect } from "vitest";
import { ROLES, puede, MODULOS, MODULO_LABEL, type Permiso } from "./roles";

describe("puede (por lista de permisos)", () => {
  it("true si la lista incluye el permiso exacto", () => {
    expect(puede(["facturas.crear", "facturas.ver"], "facturas.crear")).toBe(true);
  });
  it("false si no lo incluye", () => {
    expect(puede(["facturas.ver"], "facturas.crear")).toBe(false);
  });
  it("el comodín * concede todo", () => {
    expect(puede(["*"], "ruta_recaudo.editar")).toBe(true);
  });
  it("lista vacía o nula = sin permiso", () => {
    expect(puede([], "facturas.ver")).toBe(false);
    expect(puede(null, "facturas.ver")).toBe(false);
  });
});

describe("catálogo", () => {
  it("incluye el módulo 'roles'", () => {
    expect(MODULOS).toContain("roles");
  });
  it("cada módulo tiene etiqueta legible", () => {
    for (const m of MODULOS) expect(MODULO_LABEL[m]?.length).toBeGreaterThan(0);
  });
  it("SuperAdmin tiene acceso total", () => {
    expect(ROLES.SuperAdmin).toEqual(["*"]);
  });
});
```

- [ ] **Step 2: Correr → falla**

Run: `npx vitest run src/lib/auth/roles.test.ts`
Expected: FAIL (firma de `puede` distinta, `MODULO_LABEL`/`roles` no existen).

- [ ] **Step 3: Implementar en `roles.ts`**

1. Agregar `"roles"` al arreglo `MODULOS` (al final, antes del cierre `] as const;`).
2. Cambiar la firma de `puede`:
```ts
/** ¿La lista de permisos concede `permiso`? `"*"` concede todo. */
export function puede(permisos: readonly string[] | null | undefined, permiso: Permiso): boolean {
  if (!permisos || permisos.length === 0) return false;
  return permisos.includes("*") || permisos.includes(permiso);
}
```
3. Agregar el mapa de etiquetas legibles (después de `ACCIONES`):
```ts
export const MODULO_LABEL: Record<Modulo, string> = {
  empresas: "Empresas", usuarios: "Usuarios", bodegas: "Bodegas", terceros: "Terceros",
  categorias: "Categorías", productos: "Productos", pedidos: "Pedidos",
  inventario: "Inventario", traslados: "Traslados", notas_inventario: "Notas de inventario",
  facturas: "Ventas / Facturas", devoluciones: "Devoluciones", notas_credito: "Notas crédito",
  cuentas_cobrar: "Cuentas por cobrar", ruta_recaudo: "Ruta de recaudo", recaudos: "Recaudos",
  cuentas_pagar: "Cuentas por pagar", pagos_proveedor: "Pagos a proveedor", retenciones: "Retenciones",
  tesoreria: "Tesorería", reportes: "Reportes", auditoria: "Auditoría", manuales: "Manuales",
  dashboard: "Inicio", roles: "Roles y permisos",
};
```
4. El mapa `ROLES` se conserva igual (semilla/fallback). SuperAdmin sigue `["*"]`.

- [ ] **Step 4: Correr → pasa**

Run: `npx vitest run src/lib/auth/roles.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck (verás errores en call-sites — se migran en Tasks 4-6; aún NO comitees si tsc falla por eso)**

Run: `npx vitest run src/lib/auth/roles.test.ts` (verde). El `tsc` global fallará por los call-sites con string; es esperado y se arregla en las próximas tareas. Commit igual de esta unidad:

```bash
git add src/lib/auth/roles.ts src/lib/auth/roles.test.ts && git commit -m "feat(roles): puede() por lista de permisos + módulo roles + etiquetas (TDD)"
```

---

## Task 2: `getPermisos()` — permisos del usuario desde BD (cacheado)

**Files:** Create: `src/lib/auth/permisos.ts`

- [ ] **Step 1: Implementar**

```ts
// src/lib/auth/permisos.ts
import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { roles as rolesTabla } from "@/lib/db/schema";
import { getSesion } from "./cookies";
import { ROLES } from "./roles";

/**
 * Permisos efectivos del usuario actual, leídos de la BD (fuente de verdad).
 * - Superadmin → ["*"].
 * - Resto → vx01.permisos del rol (por nombre); si falta, cae al mapa de código.
 * Cacheado por request (React cache) → una sola consulta aunque se llame varias veces.
 */
export const getPermisos = cache(async (): Promise<string[]> => {
  const sesion = await getSesion();
  if (!sesion) return [];
  if (sesion.esSuperadmin) return ["*"];
  if (!sesion.rol) return [];
  const [r] = await db.select({ permisos: rolesTabla.permisos }).from(rolesTabla).where(eq(rolesTabla.nombre, sesion.rol)).limit(1);
  if (r?.permisos && r.permisos.length) return r.permisos;
  // Fallback al mapa de código si la fila no tiene permisos.
  const fallback = ROLES[sesion.rol];
  return fallback ? [...fallback] : [];
});
```

- [ ] **Step 2: Typecheck del archivo (aislado)**

Run: `npx tsc --noEmit 2>&1 | grep -c "permisos.ts"` → Expected: `0` (este archivo no debe tener errores propios).

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/permisos.ts && git commit -m "feat(roles): getPermisos() leídos de BD, cacheado por request"
```

---

## Task 3: Migrar guard + contexto

**Files:** Modify: `src/lib/auth/guard.ts`, `src/lib/auth/contexto.ts`

- [ ] **Step 1: guard.ts → `requirePermiso` usa permisos de BD**

En `src/lib/auth/guard.ts`: cambiar el import `import { puede, type Permiso } from "./roles";` y agregar `import { getPermisos } from "./permisos";`. Reescribir `requirePermiso`:
```ts
export async function requirePermiso(permiso: Permiso): Promise<SessionPayload> {
  const sesion = await requireSesion();
  const permisos = await getPermisos();
  if (!puede(permisos, permiso)) redirect("/dashboard");
  return sesion;
}
```

- [ ] **Step 2: contexto.ts → devuelve `permisos`**

En `src/lib/auth/contexto.ts`: importar `import { getPermisos } from "./permisos";`. Cambiar el tipo de retorno y el objeto:
```ts
export async function contextoAccion(): Promise<{ ctx: Contexto; permisos: string[] } | null> {
  const sesion = await getSesion();
  if (!sesion) return null;
  const empresaId = await empresaActivaId(sesion);
  if (empresaId == null) return null;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const permisos = await getPermisos();
  return { permisos, ctx: { empresaId, usuarioId: sesion.uid, ip } };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/guard.ts src/lib/auth/contexto.ts && git commit -m "feat(roles): guard y contextoAccion usan permisos de BD"
```

---

## Task 4: Migrar call-sites en SERVER ACTIONS (`c.rol` → `c.permisos`)

**Files (modify):** todos los `actions.ts` que usan `puede(c.rol, …)`:
`src/app/(app)/{devoluciones,ruta-recaudo,cuentas-pagar,pedidos,bodegas,tesoreria,tesoreria/cierre,cuentas-cobrar,usuarios,categorias,traslados,notas-inventario,terceros,productos,facturas,retenciones,notas-credito}/actions.ts` y `src/app/(app)/terceros/beneficiarios-actions.ts`.

- [ ] **Step 1: Reemplazo mecánico en cada archivo**

En CADA archivo de la lista, reemplazar **todas** las ocurrencias de `puede(c.rol,` por `puede(c.permisos,`. (El objeto `c` viene de `await contextoAccion()`, que ahora trae `permisos`.) No hay otros usos de `c.rol` (verificado: `c.rol` solo aparece dentro de `puede(...)`).

Comando para hacerlo de una (revisa el diff después):
```bash
grep -rl "puede(c.rol," src/app/\(app\) | xargs perl -pi -e 's/puede\(c\.rol,/puede(c.permisos,/g'
```

- [ ] **Step 2: Verificar que no quedan `c.rol`**

Run: `grep -rn "c\.rol\b" src/app/\(app\)` → Expected: sin resultados.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)" && git commit -m "feat(roles): acciones usan c.permisos (permisos de BD)"
```

---

## Task 5: Migrar call-sites en PÁGINAS y ROUTE HANDLERS

**Files (modify):** páginas/rutas con `puede(sesion.rol, …)` o `puede(rol, …)`:
`src/app/(app)/ruta-recaudo/page.tsx`, `cuentas-pagar/page.tsx`, `pedidos/[id]/page.tsx`, `inventario/page.tsx`, `traslados/[id]/page.tsx`, `notas-credito/page.tsx`, `facturas/[id]/page.tsx` (ya usa `puede(sesion.rol,…)` para anular), `g/[slug]/page.tsx`, `manuales/page.tsx`, `manuales/[slug]/page.tsx`, y los route handlers `reportes/exportar/fe-ventas/route.ts`, `fe-compras/route.ts`, `reportes/[slug]/export/route.ts`.

- [ ] **Step 1: En cada página/route, obtener permisos y reemplazar**

Patrón por archivo:
1. Agregar import: `import { getPermisos } from "@/lib/auth/permisos";`
2. Tras obtener la sesión (`requirePermiso`/`requireSesion`/`requireEmpresa`), agregar: `const permisos = await getPermisos();`
3. Reemplazar `puede(sesion.rol,` → `puede(permisos,` y `puede(rol,` → `puede(permisos,` en ese archivo.

Para `g/[slug]/page.tsx` y `manuales/*`: la variable puede llamarse `rol` proveniente de la sesión; igual, añadir `const permisos = await getPermisos();` y usar `puede(permisos, ...)`.

- [ ] **Step 2: Verificar**

Run: `grep -rn "puede(sesion.rol\|puede(rol," src/app/\(app\)` → Expected: sin resultados.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)" && git commit -m "feat(roles): páginas y rutas usan permisos de BD (getPermisos)"
```

---

## Task 6: Migrar el sidebar (prop `permisos`) + layout

**Files:** Modify: `src/components/app-sidebar.tsx`, `src/app/(app)/layout.tsx`

- [ ] **Step 1: Sidebar recibe `permisos` en vez de `rol`**

En `src/components/app-sidebar.tsx`:
- `SidebarNav`: cambiar prop `rol: string | null` → `permisos: string[]`; cambiar `puede(rol, ...)` → `puede(permisos, ...)`.
- `AppSidebar`: cambiar `{ rol }: { rol: string | null }` → `{ permisos }: { permisos: string[] }` y pasar `<SidebarNav permisos={permisos} ... />`.

- [ ] **Step 2: Layout computa permisos y los pasa**

En `src/app/(app)/layout.tsx`: importar `import { getPermisos } from "@/lib/auth/permisos";`; tras obtener `sesion`, `const permisos = await getPermisos();`; cambiar `<AppSidebar rol={sesion.rol} />` → `<AppSidebar permisos={permisos} />`. (El topbar mantiene su prop `rol` si la usa solo para mostrar; no se toca salvo que llame `puede`.)

- [ ] **Step 3: Typecheck global ahora SÍ debe pasar**

Run: `npx tsc --noEmit` → Expected: exit 0 (todos los call-sites migrados).
Run: `npm run build` → Expected: OK.

- [ ] **Step 4: Commit**

```bash
git add src/components/app-sidebar.tsx "src/app/(app)/layout.tsx" && git commit -m "feat(roles): sidebar usa permisos de BD"
```

---

## Task 7: Servicio de roles

**Files:** Create: `src/lib/services/roles.ts`, `src/lib/validation/rol.ts`

- [ ] **Step 1: Validación**

```ts
// src/lib/validation/rol.ts
import { z } from "zod";
import { MODULOS, ACCIONES } from "@/lib/auth/roles";
const VALIDOS = new Set(MODULOS.flatMap((m) => ACCIONES.map((a) => `${m}.${a}`)));
export function permisosValidos(permisos: string[]): boolean {
  return permisos.every((p) => p === "*" || VALIDOS.has(p));
}
export const rolNombreSchema = z.string().trim().min(2, "Nombre muy corto").max(50);
```

- [ ] **Step 2: Servicio**

```ts
// src/lib/services/roles.ts
import "server-only";
import { eq, sql, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { roles, usuariosEmpresas } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { permisosValidos } from "@/lib/validation/rol";
import type { Contexto } from "./bodegas";

export class RolInvalido extends Error {}
export type Rol = typeof roles.$inferSelect;

export async function listarRoles(): Promise<(Rol & { usuarios: number })[]> {
  const rows = await db
    .select({ rol: roles, usuarios: sql<number>`count(${usuariosEmpresas.id})` })
    .from(roles)
    .leftJoin(usuariosEmpresas, eq(usuariosEmpresas.rolId, roles.id))
    .groupBy(roles.id)
    .orderBy(asc(roles.nombre));
  return rows.map((r) => ({ ...r.rol, usuarios: Number(r.usuarios) }));
}

export async function obtenerRol(id: number): Promise<Rol | null> {
  const [r] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  return r ?? null;
}

export async function crearRol(nombre: string, permisos: string[], ctx: Contexto): Promise<number> {
  if (!permisosValidos(permisos)) throw new RolInvalido("Hay permisos inválidos.");
  const [creado] = await db.insert(roles).values({ nombre, descripcion: `Rol ${nombre}`, permisos }).returning();
  await registrarAuditoria({ empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx01", modelId: creado.id, accion: "CREAR", registroNuevo: { nombre }, ipOrigen: ctx.ip });
  return creado.id;
}

export async function guardarPermisosRol(id: number, permisos: string[], ctx: Contexto): Promise<void> {
  const rol = await obtenerRol(id);
  if (!rol) throw new RolInvalido("Rol no encontrado.");
  if (rol.nombre === "SuperAdmin") throw new RolInvalido("SuperAdmin no es editable.");
  if (!permisosValidos(permisos)) throw new RolInvalido("Hay permisos inválidos.");
  await db.update(roles).set({ permisos, updatedAt: new Date() }).where(eq(roles.id, id));
  await registrarAuditoria({ empresaId: ctx.empresaId, usuarioId: ctx.usuarioId, tablaAfectada: "vx01", modelId: id, accion: "ACTUALIZAR", registroNuevo: { permisos: permisos.length }, ipOrigen: ctx.ip });
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit` (0)
```bash
git add src/lib/services/roles.ts src/lib/validation/rol.ts && git commit -m "feat(roles): servicio y validación de roles"
```

---

## Task 8: UI — Administración → Roles (matriz)

**Files:** Create: `src/app/(app)/roles/page.tsx`, `roles/actions.ts`, `roles/[id]/page.tsx`, `roles/matriz-permisos.tsx`, `roles/nuevo/page.tsx`; Modify: `src/lib/modules.ts` (item de menú)

- [ ] **Step 1: Item de menú** — en `src/lib/modules.ts`, en el grupo "Administración" (donde están Usuarios/Auditoría/Manuales), agregar:
```ts
{ modulo: "roles", label: "Roles", href: "/roles", icon: ShieldCheck, listo: true, desc: "Permisos por rol." },
```
(importa `ShieldCheck` de lucide-react en ese archivo).

- [ ] **Step 2: Actions** `src/app/(app)/roles/actions.ts`
```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puede } from "@/lib/auth/roles";
import { contextoAccion as contexto } from "@/lib/auth/contexto";
import { crearRol, guardarPermisosRol, RolInvalido } from "@/lib/services/roles";
import { rolNombreSchema } from "@/lib/validation/rol";

export interface RolState { error?: string; ok?: boolean }

export async function guardarPermisosAction(rolId: number, _prev: RolState, form: FormData): Promise<RolState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa." };
  if (!puede(c.permisos, "roles.editar")) return { error: "No tienes permiso." };
  let permisos: string[] = [];
  try { permisos = JSON.parse(String(form.get("permisosJson") ?? "[]")); } catch { /* ignore */ }
  try { await guardarPermisosRol(rolId, permisos, c.ctx); }
  catch (e) { if (e instanceof RolInvalido) return { error: e.message }; console.error("[roles]", e); return { error: "No se pudo guardar." }; }
  revalidatePath("/roles"); revalidatePath(`/roles/${rolId}`);
  return { ok: true };
}

export async function crearRolAction(_prev: RolState, form: FormData): Promise<RolState> {
  const c = await contexto();
  if (!c) return { error: "Sesión sin empresa." };
  if (!puede(c.permisos, "roles.crear")) return { error: "No tienes permiso." };
  const parsed = rolNombreSchema.safeParse(form.get("nombre"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let permisos: string[] = [];
  try { permisos = JSON.parse(String(form.get("permisosJson") ?? "[]")); } catch { /* ignore */ }
  let id: number;
  try { id = await crearRol(parsed.data, permisos, c.ctx); }
  catch (e) { if (e instanceof RolInvalido) return { error: e.message }; console.error("[roles]", e); return { error: "No se pudo crear el rol." }; }
  revalidatePath("/roles");
  redirect(`/roles/${id}`);
}
```

- [ ] **Step 3: Componente matriz** `src/app/(app)/roles/matriz-permisos.tsx` (cliente)
```tsx
"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { MODULOS, ACCIONES, MODULO_LABEL } from "@/lib/auth/roles";
import { guardarPermisosAction, crearRolAction, type RolState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, Check } from "lucide-react";

const ACC_LABEL: Record<string, string> = { ver: "Ver", crear: "Crear", editar: "Editar", eliminar: "Eliminar" };

function Guardar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {label}</Button>;
}

export function MatrizPermisos({ rolId, nombre, permisosIniciales, modoCrear }: { rolId?: number; nombre?: string; permisosIniciales: string[]; modoCrear?: boolean }) {
  const router = useRouter();
  const action = modoCrear ? crearRolAction : guardarPermisosAction.bind(null, rolId!);
  const [state, formAction] = useActionState<RolState, FormData>(action, {});
  const [sel, setSel] = useState<Set<string>>(new Set(permisosIniciales));
  useEffect(() => { if (state.ok) router.refresh(); }, [state.ok, router]);

  const tiene = (p: string) => sel.has(p);
  const toggle = (p: string) => setSel((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });
  const toggleFila = (m: string) => setSel((s) => { const n = new Set(s); const todos = ACCIONES.every((a) => n.has(`${m}.${a}`)); ACCIONES.forEach((a) => (todos ? n.delete(`${m}.${a}`) : n.add(`${m}.${a}`))); return n; });
  const toggleCol = (a: string) => setSel((s) => { const n = new Set(s); const todos = MODULOS.every((m) => n.has(`${m}.${a}`)); MODULOS.forEach((m) => (todos ? n.delete(`${m}.${a}`) : n.add(`${m}.${a}`))); return n; });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="permisosJson" value={JSON.stringify([...sel])} />
      {state.error && <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertCircle className="size-4 shrink-0" /> {state.error}</div>}
      {modoCrear && <div className="space-y-1"><label className="text-sm font-medium">Nombre del rol</label><Input name="nombre" required maxLength={50} placeholder="Ej. Cajero" /></div>}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Módulo</th>
              {ACCIONES.map((a) => <th key={a} className="px-2 py-2 text-center font-medium"><button type="button" className="hover:text-primary" onClick={() => toggleCol(a)}>{ACC_LABEL[a]}</button></th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MODULOS.map((m) => (
              <tr key={m} className="hover:bg-muted/20">
                <td className="px-3 py-2"><button type="button" className="text-left font-medium hover:text-primary" onClick={() => toggleFila(m)}>{MODULO_LABEL[m]}</button></td>
                {ACCIONES.map((a) => {
                  const perm = `${m}.${a}`;
                  return <td key={a} className="px-2 py-2 text-center">
                    <button type="button" aria-pressed={tiene(perm)} onClick={() => toggle(perm)} className={cn("inline-flex size-6 items-center justify-center rounded-md border", tiene(perm) ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                      {tiene(perm) && <Check className="size-3.5" />}
                    </button>
                  </td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Guardar label={modoCrear ? "Crear rol" : "Guardar permisos"} />
    </form>
  );
}
```

- [ ] **Step 4: Lista** `src/app/(app)/roles/page.tsx`
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso } from "@/lib/auth/guard";
import { listarRoles } from "@/lib/services/roles";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Plus, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Roles — Vertex" };

export default async function RolesPage() {
  await requirePermiso("roles.ver");
  const roles = await listarRoles();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Roles y permisos" description="Define qué puede hacer cada rol.">
        <Link href="/roles/nuevo" className={buttonVariants()}><Plus className="size-4" /> Nuevo rol</Link>
      </PageHeader>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {roles.map((r) => (
          <li key={r.id}>
            <Link href={`/roles/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-medium">{r.nombre}</span><span className="text-xs text-muted-foreground">{r.permisos?.includes("*") ? "Acceso total" : `${r.permisos?.length ?? 0} permisos`} · {r.usuarios} usuario(s)</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Editor** `src/app/(app)/roles/[id]/page.tsx`
```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermiso } from "@/lib/auth/guard";
import { obtenerRol } from "@/lib/services/roles";
import { PageHeader } from "@/components/page-header";
import { MatrizPermisos } from "../matriz-permisos";

export const metadata: Metadata = { title: "Rol — Vertex" };

export default async function RolPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("roles.editar");
  const { id } = await params;
  const rol = await obtenerRol(Number(id));
  if (!rol) notFound();
  const esSuper = rol.nombre === "SuperAdmin";
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={rol.nombre} description={esSuper ? "Acceso total — no editable." : "Marca lo que puede hacer este rol."} />
      {esSuper ? (
        <p className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">El rol SuperAdmin tiene acceso total a todo el sistema y no se edita.</p>
      ) : (
        <MatrizPermisos rolId={rol.id} nombre={rol.nombre} permisosIniciales={rol.permisos ?? []} />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Crear** `src/app/(app)/roles/nuevo/page.tsx`
```tsx
import type { Metadata } from "next";
import { requirePermiso } from "@/lib/auth/guard";
import { PageHeader } from "@/components/page-header";
import { MatrizPermisos } from "../matriz-permisos";

export const metadata: Metadata = { title: "Nuevo rol — Vertex" };

export default async function NuevoRolPage() {
  await requirePermiso("roles.crear");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Nuevo rol" description="Ponle nombre y marca sus permisos." />
      <MatrizPermisos permisosIniciales={[]} modoCrear />
    </div>
  );
}
```

- [ ] **Step 7: Typecheck + build + commit**

Run: `npx tsc --noEmit` (0); `npm run build` (OK — aparece `/roles`, `/roles/[id]`, `/roles/nuevo`)
```bash
git add "src/app/(app)/roles" src/lib/modules.ts && git commit -m "feat(roles): UI administración de roles (matriz de permisos)"
```

---

## Task 9: Re-seed de permisos + verificación + deploy

**Files:** Create (gitignored): `src/test/roles.integration.test.ts`

- [ ] **Step 1: Re-sembrar roles (persistir permisos en BD)**

El seed ya inserta `permisos` desde el código, pero con `onConflictDoNothing` no actualiza filas existentes. Forzar la actualización una vez:
Run: `npm run db:seed` (revisa que no truene). Si el seed no actualiza permisos de roles existentes, correr este ajuste puntual:
```bash
npx tsx -e "1" 2>/dev/null # placeholder; ver Step 2
```
(En la práctica: confirmar en Step 2 que `getPermisos` lee permisos no vacíos; si están vacíos, actualizar `seed.ts` para `onConflictDoUpdate` en roles y re-correr `npm run db:seed`.)

- [ ] **Step 2: Test de integración**

```ts
// src/test/roles.integration.test.ts
import { config } from "dotenv";
config({ path: ".env.local" });
if (!process.env.DATABASE_URL && process.env.DATABASE_URL_SESSION) process.env.DATABASE_URL = process.env.DATABASE_URL_SESSION;
import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { listarRoles, guardarPermisosRol, obtenerRol } from "@/lib/services/roles";
import { puede } from "@/lib/auth/roles";

describe.skipIf(!process.env.DATABASE_URL)("Roles", () => {
  it("lista roles con permisos y edita la matriz (refleja al instante)", async () => {
    const lista = await listarRoles();
    console.log("Roles:", lista.map((r) => `${r.nombre}(${r.permisos?.includes("*") ? "*" : r.permisos?.length})`).join(" · "));
    expect(lista.length).toBeGreaterThan(0);

    const operador = lista.find((r) => r.nombre === "Operador");
    if (operador) {
      const original = (await obtenerRol(operador.id))!.permisos ?? [];
      const ctx = { empresaId: 1, usuarioId: 1, ip: "test" };
      // agrega un permiso de prueba y verifica
      const nuevo = [...new Set([...original, "ruta_recaudo.editar"])];
      await guardarPermisosRol(operador.id, nuevo, ctx);
      const rel = (await obtenerRol(operador.id))!.permisos ?? [];
      expect(puede(rel, "ruta_recaudo.editar")).toBe(true);
      // restaurar
      await guardarPermisosRol(operador.id, original, ctx);
    }
  }, 30000);
});
```
Run: `npx vitest run -c src/test/vitest.integration.config.ts src/test/roles.integration.test.ts --disableConsoleIntercept`
Expected: PASS; imprime los roles con su nº de permisos.

- [ ] **Step 3: Suite + build**

Run: `npx vitest run` (verde, incluye `roles.test.ts`)
Run: `rm -rf .next/types && npm run build` (OK)

- [ ] **Step 4: Commit + push**

```bash
git add -A && git commit -m "test(roles): verificación de roles y permisos"; git push origin main
```

- [ ] **Step 5: Verificación manual** — entrar como superadmin (`admin@vertex.co`) → Administración → Roles → editar un rol (p. ej. quitar "Ruta de recaudo · Editar" a Admin) → ver que aplica; crear un rol nuevo.

---

## Self-Review (cobertura del spec)
- Permisos a BD (vx01.permisos) como verdad + fallback código: Tasks 2, 9. ✔
- `getPermisos()` cacheado por request, instantáneo: Task 2; usado en guard/contexto/páginas/sidebar: Tasks 3-6. ✔
- `puede(permisos, permiso)` (lista) + módulo `roles` + etiquetas (TDD): Task 1. ✔
- Migración de los 64 call-sites (acciones, páginas, rutas, sidebar): Tasks 4-6. ✔
- UI matriz módulo×acción (lista/editor/crear, marcar fila/columna, SuperAdmin bloqueado): Task 8. ✔
- Servicio + validación (permiso ⊆ catálogo, no editar SuperAdmin): Task 7. ✔
- Solo SuperAdmin administra (permiso `roles.*`, que solo `*` tiene): Tasks 1, 8. ✔
- Pruebas: dominio (Task 1) + integración (Task 9). ✔
- Tipos consistentes: `puede(string[]…)` (T1) usado igual en T3-T6; `contextoAccion` retorna `permisos` (T3) usado como `c.permisos` (T4); `MatrizPermisos`/acciones (T8) coherentes. ✔

## Nota de orden de ejecución
Tasks 1-3 dejan el `tsc` global en rojo temporalmente (call-sites aún con `rol`). Recién al terminar **Task 6** el `tsc`/`build` vuelven a verde. El ejecutor NO debe alarmarse por errores de tipos en T1-T5; son los call-sites pendientes de migrar. (Cada unidad sí corre su propia prueba.)

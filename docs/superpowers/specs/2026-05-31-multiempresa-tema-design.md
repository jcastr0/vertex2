# Multiempresa: tema/diseño por empresa — Diseño

**Fecha:** 2026-05-31
**Proyecto:** Vertex 2 (Next.js 15 RSC + Drizzle + Supabase, deploy en Vercel)

## Objetivo
Que cada empresa tenga su **identidad visual** (paleta de color + logo) y que la app
la **aplique dinámicamente** según la empresa activa. La base multiempresa ya existe
(vx04 empresas, vx05 usuario-empresa-rol, aislamiento por `empresaId`, selector de
empresa para superadmin); este trabajo agrega el **tema por empresa** y lo demuestra
con varias empresas sembradas.

## Decisiones aprobadas
- **Todo en un entregable.**
- **Paleta completa** por empresa: colores de marca configurables (no los ~30 tokens
  internos, sino los que definen la identidad: **primario, acento, sidebar**).
- **Usuarios sin cambios**: cada usuario sigue atado a una empresa (vx05). NO se toca
  sesión/JWT ni roles (el único que cambia de empresa es el superadmin, cuyo rol es
  `*`, así que no hay descalibración de permisos). Cero riesgo de auth.
- **Logo por subida a Vercel Blob (privado).** Las credenciales (`BLOB_READ_WRITE_TOKEN`,
  `BLOB_STORE_ID`) viven en variables de entorno (Vercel + `.env.local` local,
  gitignored). Nunca en código.

## Modelo de datos
`vx04 empresas` agrega:
- `tema jsonb` (nullable) — paleta de marca:
  `{ primario: string, acento: string, sidebar: string }` (hex, ej. `"#059669"`).
  `null` = usa el tema base actual.
- Se reutiliza `logoUrl varchar(500)` existente para guardar la **ruta (pathname)**
  del blob del logo (no la URL pública, porque el blob es privado).
- `temaColor` (varchar existente, sin uso) queda obsoleto; no se elimina para no
  romper datos, simplemente no se usa.

Migración: agregar columna `tema jsonb`.

## Subida y servido del logo (Vercel Blob privado)
- **Subir** (`@vercel/blob` `put`): en una server action, `put(\`empresas/<id>/logo-<ts>.<ext>\`, file, { access: "public" /* o private según el store */, token: BLOB_READ_WRITE_TOKEN })`. Se guarda el `pathname` devuelto en `empresas.logoUrl`.
  - Validación: tipo imagen (png/jpg/webp/svg), tamaño máx (p. ej. 1 MB).
- **Servir** (blob privado → no se puede `<img src=blobUrl>` directo): route handler
  `GET /empresas/[id]/logo` que, con permiso, descarga el blob por su pathname usando
  el token (server-side, `@vercel/blob`) y lo transmite con `Cache-Control`. El topbar
  usa `<img src="/empresas/<id>/logo">`. Devuelve 404 si la empresa no tiene logo.
- **Dependencia nueva:** `@vercel/blob`.

## Aplicación dinámica del tema
- En `src/app/(app)/layout.tsx` (server; ya resuelve `empresaActivaId`) se carga el
  `tema` y `logoUrl` de la empresa activa.
- Helper puro `temaCss(tema)` → string de CSS con las variables sobreescritas, p. ej.:
  ```
  :root{--primary:#059669;--primary-foreground:#fff;--accent:#f59e0b;
        --sidebar:#0b3b2e;--sidebar-foreground:#eafff5;--sidebar-accent:...}
  ```
  Los **foreground** (texto sobre cada color) se derivan por **contraste** con un
  helper puro `contraste(hex)` → `"#fff" | "#111"` (luminancia relativa). Así un
  primario claro lleva texto oscuro y viceversa.
- El layout inyecta `<style id="tema-empresa">{temaCss(tema)}</style>`. Como es SSR,
  el color correcto llega en el primer render (sin parpadeo). Si `tema` es `null`, no
  se inyecta nada → tema base por defecto.
- El **logo** de la empresa activa se muestra en el topbar (y/o sidebar) vía la ruta
  `/empresas/<id>/logo`; si no hay logo, se muestra el nombre como hoy.

## Editor de tema (form de empresa)
- Nueva sección **"Marca"** en `EmpresaForm`: tres selectores de color (input
  `type="color"` + hex) para **primario, acento, sidebar**, con **vista previa en
  vivo** (un botón primario, un chip de acento y una barra de sidebar de muestra).
- **Logo**: input de archivo; al guardar, server action sube a Blob y guarda pathname.
  Muestra el logo actual si existe, con opción de reemplazar/quitar.
- Botón **"Restaurar tema por defecto"** (pone `tema = null`).
- Validación (`src/lib/validation/empresa.ts`): los 3 colores como hex válido opcional;
  si se ponen los tres se guarda el objeto `tema`, si no, `null`.

## Multiempresa visible (demo)
- Seed (`seed-demo` o nuevo `seed-empresas`): **2-3 empresas** con temas distintos
  (p. ej. "Verdulería El Campo" verde, "Frutas del Valle" naranja, "Mercado Central"
  azul). El superadmin (admin@vertex.co) cambia de empresa con el selector y ve
  **cambiar colores + logo** al instante. Demuestra la multiempresa de punta a punta.

## Permisos
- Editar tema/logo: `empresas.editar`. Ver el logo (route): cualquier sesión con la
  empresa activa correspondiente (o superadmin).

## Pruebas
- Unit (dominio puro): `temaCss(tema)` genera las variables correctas; `contraste(hex)`
  elige fg claro/oscuro por luminancia (casos: color claro→texto oscuro, oscuro→claro).
- Integración (gitignored): guardar `tema` en una empresa y leerlo; aislamiento (cada
  empresa su tema); la ruta de logo responde imagen/404 según corresponda.

## No-objetivos
- No se cambia el modelo de usuarios (siguen 1 empresa), ni la sesión/JWT, ni roles.
- No se exponen los ~30 tokens de color internos, solo la paleta de marca.
- Sin modo de “tema por usuario”; el tema es por empresa.

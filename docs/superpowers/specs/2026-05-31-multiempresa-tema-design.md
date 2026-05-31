# Multiempresa: tema/diseño por empresa — Diseño

**Fecha:** 2026-05-31
**Proyecto:** Vertex 2 (Next.js 15 RSC + Drizzle + Supabase, deploy en Vercel)

## Objetivo
Que cada empresa tenga su **identidad de color** (paleta de marca) y que la app la
**aplique dinámicamente** según la empresa activa. La base multiempresa ya existe
(vx04 empresas, vx05 usuario-empresa-rol, aislamiento por `empresaId`, selector de
empresa para superadmin). Este trabajo agrega el **tema por empresa** y lo demuestra
con varias empresas sembradas.

## Decisiones aprobadas
- **Todo en un entregable.**
- **Paleta completa** por empresa: colores de marca configurables — **primario,
  acento, sidebar** (no los ~30 tokens internos).
- **Logo = el logo estándar de Vertex, teñido con el color primario de la empresa.**
  No hay subida de logo ni almacenamiento de imágenes (se descarta Vercel Blob para
  esta función). El `VertexMark` ya usa `var(--primary)` (`stroke-primary`/
  `fill-primary`), así que al inyectar la paleta de la empresa **se recolorea solo**.
- **El nombre de la empresa** se muestra en el topbar (ya se muestra la empresa activa;
  se asegura que sea el nombre real de la empresa activa).
- **Usuarios sin cambios**: cada usuario sigue atado a una empresa (vx05). NO se toca
  sesión/JWT ni roles (el único que cambia de empresa es el superadmin, rol `*`). Cero
  riesgo de auth.

## Modelo de datos
`vx04 empresas` agrega:
- `tema jsonb` (nullable) — paleta de marca:
  `{ primario: string, acento: string, sidebar: string }` con colores hex
  (ej. `"#059669"`). `null` = usa el tema base actual.
- `logoUrl` y `temaColor` (columnas existentes sin uso) quedan obsoletas; no se eliminan
  para no romper datos, simplemente no se usan.

Migración: agregar columna `tema jsonb`. (Sin dependencias nuevas.)

## Aplicación dinámica del tema
- En `src/app/(app)/layout.tsx` (server; ya resuelve `empresaActivaId`) se carga el
  `tema` de la empresa activa.
- Helper puro `temaCss(tema)` → string de CSS que sobreescribe las variables de marca:
  ```
  :root{--primary:#059669;--primary-foreground:#fff;
        --accent:#f59e0b;--accent-foreground:#111;
        --sidebar:#0b3b2e;--sidebar-foreground:#eafff5;--sidebar-primary:#059669}
  ```
  Los **foreground** (texto sobre cada color) se derivan por **contraste** con un
  helper puro `contraste(hex)` → `"#ffffff" | "#111111"` (luminancia relativa): color
  claro → texto oscuro y viceversa.
- El layout inyecta `<style id="tema-empresa">{temaCss(tema)}</style>` antes del
  contenido. Como es SSR, el color correcto llega en el primer render (sin parpadeo).
- Efecto: el **logo Vertex** (usa `--primary`), los **botones primarios**, los
  **acentos** y el **sidebar** toman los colores de la empresa activa automáticamente.
  Si `tema` es `null`, no se inyecta nada → tema base por defecto.

## Editor de tema (form de empresa)
- Nueva sección **"Marca"** en `EmpresaForm`: tres selectores de color (input
  `type="color"` + campo hex) para **primario, acento, sidebar**, con **vista previa
  en vivo**: el logo Vertex teñido + un botón primario + un chip de acento + una barra
  de sidebar, todo reaccionando al color elegido.
- Botón **"Restaurar tema por defecto"** (pone `tema = null`).
- Validación (`src/lib/validation/empresa.ts`): los 3 colores como hex válido
  (`/^#[0-9a-fA-F]{6}$/`); si están los tres se guarda `tema`, si no, `null`.

## Nombre de empresa en el topbar
- Asegurar que el topbar muestre el **nombre de la empresa activa** (no un texto fijo).
  Si ya lo hace, se confirma; si muestra algo estático, se conecta a la empresa activa.

## Multiempresa visible (demo)
- Seed (`seed-empresas`, nuevo, idempotente): **3 empresas** con paletas distintas
  (ej. "Verdulería El Campo" verde, "Frutas del Valle" naranja, "Mercado Central"
  azul), cada una con su admin. El superadmin (admin@vertex.co) cambia de empresa con
  el selector y ve **cambiar la paleta (logo, botones, sidebar) y el nombre** al
  instante. Demuestra la multiempresa de punta a punta.

## Permisos
- Editar el tema: `empresas.editar`.

## Pruebas
- Unit (dominio puro):
  - `temaCss(tema)` genera las variables esperadas y omite todo si `tema` es `null`.
  - `contraste(hex)` elige fg claro/oscuro por luminancia (claro→#111, oscuro→#fff).
- Integración (gitignored): guardar `tema` en una empresa y leerlo; aislamiento (cada
  empresa conserva su tema).
- Verificación visual: cambiar de empresa como superadmin y ver la paleta cambiar.

## No-objetivos
- Sin subida de logos ni Vercel Blob (el logo es el de Vertex, teñido).
- No se cambia el modelo de usuarios (siguen 1 empresa), ni sesión/JWT, ni roles.
- No se exponen los ~30 tokens internos, solo la paleta de marca (3 colores).
- Sin “tema por usuario”; el tema es por empresa.

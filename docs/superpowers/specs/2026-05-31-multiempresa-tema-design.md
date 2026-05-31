# Multiempresa: tema/diseño por empresa — Diseño

**Fecha:** 2026-05-31
**Proyecto:** Vertex 2 (Next.js 15 RSC + Drizzle + Supabase, deploy en Vercel)

## Objetivo
Que cada empresa tenga su **identidad de color** eligiendo una **paleta predefinida**
(curada para que combine), y que la app la **aplique dinámicamente** según la empresa
activa. La base multiempresa ya existe (vx04 empresas, vx05 usuario-empresa-rol,
aislamiento por `empresaId`, selector de empresa para superadmin).

## Decisiones aprobadas
- **Paletas predefinidas, NO colores libres.** El usuario elige una de ~**24 paletas
  curadas**; no puede editar colores sueltos. Esto evita que se dañe la estética y
  hace la elección trivial. Cada paleta define **primario, acento y sidebar** que ya
  combinan entre sí.
- **El usuario elige la paleta y ve un PREVIEW** de la app (logo, sidebar, botón,
  acento, tarjetas) con esos colores antes de guardar.
- **Logo = el logo estándar de Vertex, teñido con el primario de la paleta.** Sin
  subida de logos ni Vercel Blob (el `VertexMark` ya usa `var(--primary)`, se recolorea
  solo al inyectar la paleta).
- **Nombre de la empresa** en el topbar (empresa activa).
- **Usuarios sin cambios** (1 empresa); NO se toca sesión/JWT ni roles. Cero riesgo
  de auth. **Sin dependencias nuevas.**

## Catálogo de paletas (en código)
`src/lib/temas/paletas.ts`:
```ts
export interface Paleta { key: string; nombre: string; familia: string;
  primario: string; acento: string; sidebar: string } // hex
export const PALETAS: Paleta[]   // ~24, agrupadas por familia
export function getPaleta(key: string | null): Paleta | null
```
~24 paletas curadas por **familia** (verdes, azules/teal, naranjas/ámbar, rojos/vino,
morados, rosas, neutros/grafito, tierra). Cada una con `primario` (marca), `acento`
(secundario que combina) y `sidebar` (fondo oscuro del menú en el mismo matiz). La
paleta por defecto del sistema (esmeralda actual) es una de ellas (`key: "esmeralda"`).
Catálogo en código (no en BD) → fácil de versionar y garantiza que solo existan
combinaciones válidas.

## Modelo de datos
`vx04 empresas` agrega:
- `paletaTema varchar(40)` (nullable) — la **key** de la paleta elegida (ej.
  `"esmeralda"`, `"oceano"`). `null` = tema base por defecto.
- `logoUrl` y `temaColor` (columnas existentes sin uso) quedan obsoletas; no se eliminan.

Migración: agregar columna `paleta_tema varchar(40)`. (Sin dependencias nuevas.)

## Aplicación dinámica del tema
- `src/app/(app)/layout.tsx` (server; ya resuelve `empresaActivaId`) lee `paletaTema`
  de la empresa activa → `getPaleta(key)`.
- Helper puro `temaCss(paleta)` → string de CSS que sobreescribe las variables de marca:
  ```
  :root{--primary:<primario>;--primary-foreground:<fg>;
        --accent:<acento>;--accent-foreground:<fg>;
        --sidebar:<sidebar>;--sidebar-foreground:<fg>;--sidebar-primary:<primario>}
  ```
  Los **foreground** se derivan por **contraste** con `contraste(hex) → "#ffffff"|"#111111"`
  (luminancia relativa). Si `paleta` es `null`, no se inyecta nada → tema base.
- El layout inyecta `<style id="tema-empresa">{temaCss(paleta)}</style>` (SSR, sin
  parpadeo). Efecto: logo Vertex, botones primarios, acentos y sidebar toman los colores
  de la empresa activa automáticamente.

## Editor de tema (form de empresa)
- Nueva sección **"Apariencia"** en `EmpresaForm`:
  - **Galería de paletas**: grid de muestras (swatch con los 3 colores + nombre),
    agrupadas por familia; clic selecciona (radio). Guarda la `key`.
  - **Vista previa en vivo**: un mini-mockup de la app (logo Vertex teñido + barra de
    sidebar + un botón primario + un chip de acento + una tarjeta) que reacciona a la
    paleta seleccionada, para verla antes de guardar.
  - Opción **"Tema por defecto"** (paleta = null).
- Validación (`src/lib/validation/empresa.ts`): `paletaTema` debe ser una key conocida
  de `PALETAS` o vacío → null.

## Nombre de empresa en el topbar
- Asegurar que el topbar muestre el **nombre de la empresa activa** (conectado a la
  empresa activa, no estático).

## Multiempresa visible (demo)
- Seed (`seed-empresas`, nuevo, idempotente): **3 empresas** con paletas distintas
  (ej. "Verdulería El Campo" → verde, "Frutas del Valle" → naranja, "Mercado Central"
  → azul), cada una con su admin. El superadmin (admin@vertex.co) cambia de empresa y
  ve cambiar **paleta (logo, botones, sidebar) + nombre** al instante.

## Permisos
- Editar la paleta: `empresas.editar`.

## Pruebas
- Unit (dominio puro):
  - `temaCss(paleta)` genera las variables esperadas; sin paleta → cadena vacía.
  - `contraste(hex)` elige fg claro/oscuro por luminancia (claro→#111111, oscuro→#ffffff).
  - `getPaleta(key)` devuelve la paleta o null; todas las paletas tienen los 3 colores
    en formato hex válido.
- Integración (gitignored): guardar `paletaTema` en una empresa y leerlo; aislamiento.
- Verificación visual: cambiar de empresa como superadmin y ver la paleta cambiar.

## No-objetivos
- Sin colores libres (solo paletas curadas) ni subida de logos ni Vercel Blob.
- No se cambia el modelo de usuarios (1 empresa), ni sesión/JWT, ni roles.
- No se exponen los ~30 tokens internos; la paleta define 3 colores de marca.
- Sin “tema por usuario”; el tema es por empresa.

# Administración de Roles y Permisos — Diseño

**Fecha:** 2026-05-31
**Proyecto:** Vertex 2 (Next.js 15 RSC + Drizzle + Supabase)

## Objetivo
Que la **matriz de permisos** (módulo × acción) sea **editable desde la app** (no en
código), con la BD como fuente de verdad, sembrada con los roles actuales como base.
Granular: "quién puede asignar rutas" = `ruta_recaudo.editar`, etc. Incluye editar
permisos de roles existentes y **crear roles nuevos**.

## Decisiones aprobadas
- **Aplicación instantánea**: los permisos se leen desde la BD en cada request (con
  caché por request). Editar un rol surte efecto de inmediato.
- **Editar + crear** roles personalizados.
- **Solo SuperAdmin** administra roles (los roles son globales, afectan a todas las
  empresas).
- **Migrar los call-sites de `puede`** a permisos de BD (consistencia total; la
  seguridad real vive en el guard y en las server actions).

## Fuente de verdad
- **`vx01 roles.permisos`** (jsonb `string[]`) es la verdad. Cada permiso es
  `modulo.accion` (ej. `"ruta_recaudo.editar"`) o `"*"` (SuperAdmin).
- Se **siembra desde el mapa `ROLES` del código** (los 6 roles actuales) como base.
- El mapa `ROLES` en `src/lib/auth/roles.ts` se conserva como **semilla + fallback**
  (si un rol no tiene fila/permos en BD, se usa el del código).

## Evaluación de permisos (instantánea)
- `getPermisos()` (en `src/lib/auth/permisos.ts`, envuelto en **React `cache()`** →
  una sola consulta por request): lee la sesión; si `esSuperadmin` devuelve `["*"]`;
  si no, consulta `vx01.permisos WHERE nombre = sesion.rol` (fallback al código si
  null/ausente).
- `puede(permisos: readonly string[] | null, permiso: Permiso): boolean` → `*` o exacto.
- **Migración de call-sites**:
  - `requirePermiso(permiso)` (guard): carga `getPermisos()` y verifica → **seguridad
    en páginas**.
  - `contextoAccion()` devuelve `permisos` además de (o en vez de) `rol` → las **server
    actions** verifican con `puede(c.permisos, ...)` → **seguridad en mutaciones**.
  - `(app)/layout.tsx` pasa `permisos` al **sidebar** (filtra el NAV por `modulo.ver`).
  - Componentes/páginas que hoy hacen `puede(sesion.rol, X)` para mostrar/ocultar →
    reciben/usan `permisos`. (Cosmético; la seguridad ya está garantizada arriba.)

## Catálogo de la matriz
- Se arma de `MODULOS × ACCIONES` (ya existen en `roles.ts`).
- Se agrega **`roles`** a `MODULOS` (módulo nuevo, para su propio permiso
  `roles.ver`/`roles.editar`). Como solo SuperAdmin (`*`) lo tendrá, solo él ve la
  pantalla.
- **Etiquetas legibles** por módulo (mapa `MODULO_LABEL`): ej. `ruta_recaudo` → "Ruta
  de recaudo", `cuentas_cobrar` → "Cuentas por cobrar", `facturas` → "Ventas/Facturas".

## UI — Administración → Roles (solo SuperAdmin)
- Item de menú nuevo en el grupo **Administración**: "Roles" (`/roles`,
  permiso `roles.ver`).
- **Lista** (`/roles`): roles con nº de permisos y nº de usuarios asignados; botón
  "Nuevo rol".
- **Editor** (`/roles/[id]`): matriz **módulos (filas) × ver/crear/editar/eliminar
  (columnas)** con checkboxes; marcar/desmarcar por celda, por fila (todo el módulo)
  y por columna (toda la acción). Guardar. El rol **SuperAdmin** muestra "Acceso total"
  y está **bloqueado** (no editable, `["*"]`).
- **Crear** (`/roles/nuevo`): nombre + matriz (parte vacía).
- No se permite **eliminar** un rol con usuarios asignados (aviso); sí desactivar/borrar
  si no tiene usuarios.

## Servicios (`src/lib/services/roles.ts`)
- `listarRoles()` → roles + conteo de usuarios.
- `obtenerRol(id)` → rol con permisos.
- `crearRol({ nombre, permisos }, ctx)`.
- `guardarPermisosRol(id, permisos[], ctx)` — valida que cada permiso ∈ catálogo
  (`modulo.accion`) y que no se edite SuperAdmin.
- (auditoría en cada cambio).

## Permisos para administrar roles
- `roles.ver` / `roles.crear` / `roles.editar` / `roles.eliminar`. Solo SuperAdmin
  (`*`) los tendrá; el guard de las páginas usa `requirePermiso("roles.ver"/"roles.editar")`.

## Pruebas
- Unit: `puede(array, permiso)` (incluye `*`); el catálogo de matriz cubre `MODULOS×ACCIONES`.
- Integración (gitignored): sembrar roles desde código; editar permisos de un rol y que
  `getPermisos()` (o la consulta equivalente) lo refleje; un rol sin `x.crear` no pasa
  `requirePermiso`/acción.

## No-objetivos
- Roles **por empresa** (siguen globales). Si se necesitara aislamiento por empresa,
  es un rediseño mayor (fuera de alcance).
- No se tocan los **roles asignados a usuarios** (eso ya se hace en Usuarios); aquí solo
  se define qué puede cada rol.
- No se cambia el modelo de sesión a multi-empresa.

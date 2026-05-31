# Navegación informativa (drill-down) — Diseño

**Fecha:** 2026-05-31
**Objetivo:** Que navegar dé información útil del negocio. Entrar a una **bodega** muestra qué productos tiene y cuánto valen; entrar a un **producto** muestra su historia (ventas, compras/pedidos, merma) y dónde está su existencia.

**Principio:** Cero tablas nuevas, cero migración. Se lee y agrega lo que ya existe. Mobile-first (tarjetas KPI + `ResponsiveTable`). Reuso máximo de servicios y componentes.

---

## 1. Navegación

Hoy el clic en la fila de bodega/producto va directo a *Editar*. Cambia a abrir el **detalle** (vista informativa), con *Editar* demovido a un botón dentro del detalle.

- Fila de **bodega** → `/bodegas/[id]` (detalle nuevo). Botón "Editar bodega" → `/bodegas/[id]/editar` (ya existe, no se toca).
- Fila de **producto** → `/productos/[id]` (detalle nuevo). Botón "Editar producto" → `/productos/[id]/editar` (ya existe, no se toca).
- Se redirigen los enlaces de fila en `bodegas/page.tsx` / `productos/page.tsx` y sus `*-row-actions.tsx` de `/.../editar` a `/...`. Nada se elimina.

Permisos: detalle de bodega exige `bodegas.ver`; detalle de producto exige `productos.ver`.

---

## 2. Ficha de Bodega — `/bodegas/[id]`

**KPIs (tarjetas arriba):**
- Nº de productos distintos con existencia en la bodega.
- Valor total del inventario de la bodega = Σ `vx16.valorTotal` (existencias × costo promedio).
- Nº de productos **sin existencia** (cantidadActual ≤ 0) — alerta de faltantes. (No hay campo de stock mínimo en `productos`, así que NO se inventa umbral de "bajo stock"; se reporta solo "sin existencia".)

**Productos en la bodega:** `ResponsiveTable` desde `vx16` filtrado por `bodegaId`: columnas Producto (SKU), Existencia, Costo prom., Valor. Clic en la fila → ficha del producto (`/productos/[id]`). Orden por valor desc.

**Últimos movimientos:** ~10 últimos de `vx17` de esa bodega (fecha, tipo, producto, cantidad, ref.). Es un mini-kardex de la bodega.

**Acción:** botón "Editar bodega".

---

## 3. Ficha de Producto — `/productos/[id]`

**KPIs (tarjetas arriba), cada uno con histórico total y últimos 30 días:**
- **Vendido:** cantidad (en unidad base) y $ (Σ subtotal). Fuente: `vx22` × `vx21` excluyendo facturas en estado `borrador` y `anulada`.
- **Comprado:** cantidad. Fuente: `vx14` × `vx13`.
- **Merma:** cantidad de salidas por notas. Fuente: `vx18` con `tipo` de salida.

El "últimos 30 días" = filtro por fecha del documento `>= now() - interval '30 days'`.

**Existencias por bodega:** desde `vx16` filtrado por `productoId`: bodega, existencia, valor. Σ existencias = stock total (mostrado como total). Es el "dónde está mi mercancía".

**Compras / pedidos:** "Traído en N pedidos" (count distinct `pedidoId` en `vx14` para el producto), cantidad total pedida y recibida (Σ `cantidad`, Σ `cantidadRecibida`).

**Merma / ajustes:** total de salidas + lista corta (últimas ~5) con motivo, fecha, bodega, cantidad.

**Accesos:** "Ver kardex completo" → `/inventario/[productoId]` (ya existe). Botón "Editar producto".

---

## 4. Arquitectura de código

Nuevo módulo de agregación **`src/lib/services/fichas.ts`** (server-only). Funciones puras de lectura, una responsabilidad clara cada una, con tipos de retorno explícitos:

- `fichaBodega(empresaId, bodegaId): Promise<FichaBodega | null>` — KPIs + filas de productos + últimos movimientos. `null` si la bodega no es de la empresa.
- `fichaProducto(empresaId, productoId): Promise<FichaProducto | null>` — KPIs (histórico + 30d) + existencias por bodega + resumen de compras + lista de merma. `null` si el producto no es de la empresa.

Tipos de retorno (`FichaBodega`, `FichaProducto`, y sub-tipos como `KpiPeriodo { total: number; ultimos30: number }`) exportados desde el mismo módulo. Las páginas son server components que llaman a estas funciones y pintan; toda la lógica SQL vive en `fichas.ts`.

Reglas de negocio explícitas (para que la prueba las fije):
- Ventas válidas = factura con estado distinto de `borrador` y `anulada`.
- Merma = `vx18` con `tipo` de salida (el valor exacto se confirma contra el enum/datos al implementar; la regla es "salida").
- Montos y cantidades se devuelven como `number` ya parseados (las columnas numéricas vienen como string de postgres-js).

Componentes UI reutilizados: `PageHeader`, `ResponsiveTable`, `Badge`, tarjetas de KPI (mismo estilo que el dashboard/reportes). Si no existe un componente de tarjeta KPI reutilizable, se usa el patrón ya presente en el dashboard.

---

## 5. Pruebas (cada cosa lleva prueba de escritorio)

- **Integración** (en `src/test/**`, gitignored) contra la empresa demo:
  - `fichaBodega`: KPIs coherentes (nº productos ≥ 0, valor total ≥ 0, sin-existencia ≥ 0); filas de productos no negativas; imprime los números.
  - `fichaProducto`: vendido/comprado/merma ≥ 0; `ultimos30 ≤ total` para cada KPI; Σ existencias por bodega = stock total reportado; nº de pedidos ≥ 0. Imprime los números para inspección.
- **Dominio/puro:** si se extrae lógica de clasificación (p. ej. marcar "sin existencia", o el armado del `KpiPeriodo`), test puro de esa función con datos de ejemplo.
- Verificación de build/typecheck y suite completa antes de desplegar.

---

## Fuera de alcance (YAGNI)
- Gráficas/tendencias en las fichas (los reportes ya cubren eso).
- Selector de rango de fechas en las fichas (se fijó histórico + 30 días).
- Umbral configurable de "bajo stock" (no hay campo de stock mínimo; solo "sin existencia").
- Margen/utilidad por producto en la ficha (se puede sumar luego; no se pidió como obligatorio).

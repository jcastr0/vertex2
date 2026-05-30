# Venta estilo POS (autocomplete + precio pegajoso) y barra de filtros avanzada

**Fecha:** 2026-05-29
**Estado:** Diseño aprobado (pendiente revisión del spec)

## Contexto del negocio

El sistema se usará en un **puesto de mercado que vende verduras**: se vende **al peso** (cantidades decimales en kg), el vendedor **ajusta el precio sobre la marcha** y el precio **depende del cliente** (mayorista vs. minorista vs. ocasional). La operación debe ser veloz y sin fricción.

## Problema

1. La pantalla de venta usa un selector estilo "select2" para elegir producto, lento e incómodo en móvil.
2. El precio de partida siempre es el configurado; debe recordar **lo que se le cobra a cada cliente** y servir de punto de partida (editable) en la siguiente venta.
3. La sección de filtros de los listados es muy básica (solo un buscador). Se quiere una barra de búsqueda con un botón "Filtros" que abra filtros específicos, chips de filtros activos y un "Limpiar".

## Objetivo

- **Frente A — Venta estilo punto de venta:** autocomplete de productos/cliente, agregar-al-carrito, precio editable con punto de partida pegajoso, sin exponer costo ni margen.
- **Frente B — Barra de filtros avanzada reutilizable** para los listados, sincronizada con la URL y compatible con la paginación existente.

## Decisiones tomadas

- **Utilidad en la venta:** NO se muestra costo, margen ni alerta. El vendedor solo ve precio. El costo (`costoUnitario`) y la bandera `esPrecioBajoCosto` se siguen **congelando en silencio** en la factura para reportes de gerencia.
- **Autocomplete:** una **barra de búsqueda arriba** que, al elegir un resultado, **agrega la línea al carrito**; si el producto ya está, **suma 1 a la cantidad**.
- **Precio de partida:** **por cliente**. Resolución: último precio que se le puso a ESE cliente para ese producto → si no hay, último precio global del producto → si no, `precioVenta` configurado. Siempre editable.
- **Filtros:** búsqueda + botón "Filtros" (con badge de conteo) → popover con filtros del módulo; chips removibles de filtros activos; "Limpiar" cuando hay algo activo; todo en la URL.

## Frente A — Pantalla de venta

### Componente nuevo: `Autocomplete` (`src/components/ui/autocomplete.tsx`)
Input con type-ahead reutilizable. Props: `items` (con `value`, `label`, `hint?`, `keywords?`), `onSelect(value)`, `placeholder`, `renderItem?`. Comportamiento:
- Filtra en memoria por coincidencia en `label` + `keywords` (nombre, SKU).
- Navegación por teclado: ↑/↓ mueve, Enter selecciona, Esc cierra.
- Resalta la coincidencia; muestra hasta N resultados; estado "sin resultados".
- Accesible (role=combobox/listbox/option, aria-activedescendant).
Se usa para el **cliente** (reemplaza el SearchSelect) y para el **buscador de producto**.

### Lógica de dominio (pura, TDD — `src/lib/domain/venta.ts`)
- `buscarProductos(items, q, limite)` → filtra por nombre/SKU, rankea (prefijo > substring), corta a `limite`.
- `agregarOIncrementar(carrito, productoId, precioSugerido)` → si el producto ya está, +1 cantidad; si no, agrega línea nueva con `cantidad: 1` y `precioUnitario: precioSugerido`. Devuelve nuevo carrito (inmutable).
- `precioSugerido(productoId, { porCliente, base })` → `porCliente[productoId] ?? base[productoId]`. Aplica la cadena cliente → global → configurado (el `base` ya trae global ?? configurado).

### Flujo de la pantalla
1. Cliente (autocomplete) · tipo de pago (contado/crédito) · bodega — como hoy. **Al elegir cliente** se carga su mapa `{producto → último precio a ese cliente}`.
2. Barra "Buscar producto…" (autocomplete). Resultados: `nombre · SKU · stock · $precio sugerido`. Al elegir → `agregarOIncrementar` con el precio resuelto.
3. Carrito: cada línea = nombre, cantidad **decimal** (kg, `step` fino), **precio editable** (prellenado con el sugerido), subtotal, quitar. Sin costo/margen.
4. Barra fija de total + "Registrar venta" (como hoy).

### Precio por cliente (datos)
- **vx11 (`productoUnidades`)**: nueva columna `ultimoPrecioVenta` (price, nullable) — último precio **global** del producto (fallback). Se actualiza en `crearFactura` por cada línea (`producto+unidad`).
- **Por cliente:** se **deriva de las facturas** (sin tabla nueva). Servicio `ultimoPrecioPorCliente(empresaId, clienteId)` → `Map<productoId, precio>` con el precio de la línea más reciente de cada producto vendido a ese cliente. Se invoca al seleccionar cliente (server action o carga inicial si el cliente viene preseleccionado).
- `listarProductosVenta` devuelve `base.precio = ultimoPrecioVenta ?? precioVenta` (sin cliente).
- Resolución final (cliente, en el form): `porCliente[productoId] ?? base.precio`.
- Cambio de columna en vx11 (tabla ya registrada en vx00).

## Frente B — Barra de filtros avanzada

### Componente nuevo: `FiltroBar` (`src/components/ui/filtro-bar.tsx`), client
Reemplaza a `SearchFilter` dentro de `ListaFiltrable`. Props:
```
filtros?: FiltroDef[]   // definición declarativa por módulo
searchPlaceholder: string
```
`FiltroDef` = `{ key: string; label: string; tipo: "select" | "fecha" | "rango-fecha"; opciones?: {value,label}[] }`.
Comportamiento:
- Lee/escribe los filtros en `searchParams` (cada filtro = un query param) además de `?q=`, con debounce en la búsqueda; al cambiar cualquier filtro resetea `?page`.
- Botón **"Filtros"** con badge = número de filtros activos; abre un **popover** (z-index sobre la tabla) con los controles de `filtros`.
- **Chips** removibles bajo la barra por cada filtro activo (clic en la X borra ese param).
- **"Limpiar"** visible cuando hay búsqueda o algún filtro; borra `q` + todos los filtros.
- La búsqueda cede ancho cuando hay chips (responsive).

### Lógica de dominio (pura, TDD — `src/lib/domain/filtros.ts`)
- `aplicarFiltro(params, key, value)` → nuevo `URLSearchParams` con el filtro puesto/quitado y `page` reseteada.
- `limpiarFiltros(params, keys)` → quita `q` + `keys`.
- `filtrosActivos(params, defs)` → lista de `{key,label,valorLegible}` para los chips.

### Filtrado en el servidor
`ListaFiltrable` ya recibe `items` ya filtrados desde la página (server). Cada página leerá sus nuevos `searchParams` y los pasará a su servicio de listado. Se extiende `filtrarPaginar`/los servicios para aceptar los filtros específicos. Roll-out inicial:
- **Productos**: categoría, estado (activo), stock (con/sin existencias).
- **Facturas**: tipo de venta (contado/crédito), estado, rango de fechas.
- **Cuentas por pagar / por cobrar**: estado (pendiente/vencida/pagada), vencimiento (rango).
- **Terceros**: tipo (cliente/proveedor/ambos), activo.
Los demás listados adoptan el mismo patrón después (no en este spec).

## Pruebas y verificación
- TDD de las funciones puras (`buscarProductos`, `agregarOIncrementar`, `precioSugerido`, `aplicarFiltro`, `limpiarFiltros`, `filtrosActivos`): RED → GREEN.
- `npm run build` limpio; suite completa verde.
- E2E: vender con autocomplete (agregar, sumar cantidad, editar precio al peso) a un cliente A → en la siguiente venta a A ese producto parte del precio que le cobraste; a un cliente B distinto parte del global/configurado; filtrar un listado (aplicar filtro → chip + badge + Limpiar; recargar conserva el filtro por URL).

## Fuera de alcance (YAGNI)
- Columna de utilidad por producto en Reportes (se hará aparte si se pide).
- Lector de código de barras.
- Filtros guardados/favoritos.

## Implementación por etapas
1. Componente `Autocomplete` + dominio `venta.ts` (TDD).
2. Schema `ultimoPrecioVenta` en vx11 + migración + update en `crearFactura` + `listarProductosVenta` + servicio `ultimoPrecioPorCliente`.
3. Rediseño de `factura-form.tsx` (POS: cliente autocomplete + buscador→carrito + precio editable).
4. Dominio `filtros.ts` (TDD) + componente `FiltroBar`.
5. Integrar `FiltroBar` en `ListaFiltrable` (compatibilidad hacia atrás: sin `filtros` se comporta como hoy).
6. Declarar filtros y filtrado servidor en Productos, Facturas, Cuentas por pagar/cobrar, Terceros.
7. Build + E2E + deploy.

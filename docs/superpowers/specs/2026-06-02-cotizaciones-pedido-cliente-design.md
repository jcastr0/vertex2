# Cotizaciones (pedidos de cliente) — Diseño

**Fecha:** 2026-06-02
**Estado:** Aprobado por el usuario, pendiente de plan de implementación.

## Objetivo

Dar a Vertex un lugar para almacenar **pedidos de clientes** modelados como **cotizaciones**: lo que un cliente pide (productos y cantidades) con precios, que el cliente aprueba y luego se **factura permitiendo ajustes**. Es la base para, más adelante (FUERA DE ALCANCE aquí), exponerlo como un bot de pedidos con contexto.

## Contexto actual (lo que ya existe)

- **"Pedidos" (vx13)** es exclusivamente **a proveedor** (compras): `proveedorId`, estados `borrador/enviado/recibido`, con costos. No sirve para clientes.
- **Facturas (vx21)** se crean directo desde `crearFactura(NuevaFactura)`: cliente + líneas + `tipoVenta` (contado/crédito); valida stock, **descuenta inventario**, y crea cuenta por cobrar si es crédito.
- **No existe** ningún concepto de pedido de cliente / orden de venta / cotización.

## Decisiones (del brainstorming)

1. **Naturaleza:** una **cotización** (con precios) que el cliente aprueba y luego se factura **permitiendo ajustes**.
2. **Precio por línea:** autollenado **editable**. El valor sugerido por defecto es el **último precio vendido a ESE cliente de ESE producto**; si no hay historial, el precio de venta del catálogo. Siempre se muestra el recordatorio de la última venta.
3. **Inventario:** la cotización **no toca stock**; el inventario se descuenta recién al facturar.
4. **Modelo (enfoque A):** **entidad propia** `cotizaciones` + `cotizacionDetalles` (no se reusa facturas ni se generaliza pedidos), para aislar del core de ventas y dejar un recurso limpio para el bot.

## Modelo de datos

Dos tablas nuevas. **Regla del proyecto:** ambas se registran en `vx00_nomenclatura`. Códigos propuestos `vx39`/`vx40` (confirmar el siguiente libre al implementar; vx00–vx38 ocupados).

### `cotizaciones` (vx39) — encabezado
| Campo | Tipo | Notas |
|---|---|---|
| `id` | bigserial PK | |
| `empresaId` | bigint → vx04 | not null |
| `clienteId` | bigint → vx07 (terceros) | not null |
| `numero` | varchar(20) | `COT-000001`, único por empresa |
| `fecha` | date (string YYYY-MM-DD) | calendario, hora Colombia |
| `estado` | varchar(20) | `pendiente` \| `facturada` \| `anulada` (default `pendiente`) |
| `total` | money | suma de líneas |
| `observaciones` | text nullable | |
| `motivoAnulacion` | text nullable | al anular |
| `facturaId` | bigint → vx21 nullable | se llena al facturar |
| `usuarioId` | bigint → vx02 | quién la creó |
| `createdAt` / `updatedAt` | timestamptz | |

Índices: `(empresaId, estado)`, único `(empresaId, numero)`, `(clienteId)`.

### `cotizacionDetalles` (vx40) — líneas
| Campo | Tipo | Notas |
|---|---|---|
| `id` | bigserial PK | |
| `cotizacionId` | bigint → vx39 | not null |
| `productoId` | bigint → vx10 | not null |
| `cantidad` | numeric | en unidad base |
| `precioUnitario` | money | editable, sugerido del historial/cliente |
| `subtotal` | money | cantidad × precio |
| `createdAt` | timestamptz | |

## Ciclo de vida y guardia de transición

```
              ┌─ Facturar ──► facturada (enlaza facturaId)
pendiente ────┤
              └─ Anular ────► anulada (con motivo)
```

- **Crear** → estado `pendiente`. No afecta inventario.
- **Facturar** → solo desde `pendiente`. Abre el formulario de venta **precargado y editable**; al confirmar, `crearFactura(...)` (flujo actual: valida stock, descuenta inventario, cartera si crédito); luego la cotización pasa a `facturada` y guarda `facturaId`. Una cotización → una factura (completa pero ajustable).
- **Anular** → solo desde `pendiente`; estado `anulada` + `motivoAnulacion`.
- **Guardia (lógica pura, testeable):** una cotización `facturada` o `anulada` no se puede volver a facturar ni anular.

## Precio inteligente

`ultimoPrecioCliente(empresaId, clienteId, productoId)` → `{ precio, fecha } | null`: último `facturaDetalles.precioUnitario` de una factura **no anulada** de ese cliente con ese producto (orden por fecha desc).

- En el formulario de cotización, al elegir producto (con cliente ya seleccionado): la línea sugiere ese precio; si no hay, el precio de venta del catálogo; muestra "Última venta: $X · dd mmm".
- (El bot futuro reutilizará este servicio para saber a qué precio venderle a cada cliente.)

## Pantallas (siguiendo patrones existentes)

- **Menú:** Ventas → **Cotizaciones** (etiqueta alterna posible: "Pedidos de clientes").
- **Lista** (`/cotizaciones`): `ListaFiltrable` con buscador + filtro por estado; filas clicables (`rowHref`) al detalle; badge de estado; estados vacíos.
- **Nueva** (`/cotizaciones/nueva`): elegir cliente → líneas (SearchSelect de producto, cantidad, precio con recordatorio de última venta); total en vivo; "Guardar cotización".
- **Detalle** (`/cotizaciones/[id]`): comprobante (encabezado + líneas + total), trazabilidad `<CreadoPor>`, botones **Facturar** y **Anular**, y enlace a la factura si ya se facturó (drill-down en ambos sentidos: factura → cotización origen).

## Conversión a factura

Reusa `crearFactura(NuevaFactura, ctx)` sin duplicar lógica. El botón **Facturar** lleva al formulario de venta precargado desde las líneas de la cotización (cliente, productos, cantidades, precios), **editable** (ajustar/agregar/quitar, elegir contado/crédito y método/cuenta). Al confirmar: se crea la factura y, acto seguido, se marca la cotización `facturada` + `facturaId`.

## Permisos

Nuevo módulo `cotizaciones` en el catálogo (`src/lib/auth/roles.ts` MODULOS) con acciones ver/crear/editar/eliminar. El rol **Vendedor** podrá crear y ver cotizaciones; Admin/Operador CRUD; Contador solo ver.

## Pruebas

- **Puras (vitest):** numeración `COT-…`; cálculo de total; guardia de transición (solo `pendiente` factura/anula).
- **Integración (gitignored, tocan BD):** `ultimoPrecioCliente` devuelve el último precio correcto; flujo crear→facturar enlaza factura y descuenta inventario una sola vez.

## Fuera de alcance (v1 — YAGNI)

- El **bot** de pedidos (se diseñará aparte una vez exista este almacén).
- Reserva/apartado de stock en estado pendiente.
- Vencimiento automático de la cotización (fecha de validez).
- Facturación parcial (una cotización en varias facturas).
- PDF dedicado (basta imprimir desde el navegador, como los otros comprobantes).

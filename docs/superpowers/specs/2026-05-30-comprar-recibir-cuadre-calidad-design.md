# Comprar y pagar: pedir por bulto, recibir, cuadrar y calidad por proveedor

**Fecha:** 2026-05-30
**Estado:** Diseño (pendiente revisión)

## Contexto (puesto de verduras)

Compran por **bulto** o **½ bulto**. Al recibir, normalmente entra todo, pero a veces viene de menos. El inventario se guarda en **kg** (unidad base); luego venden bultos completos y los **puchitos por kg** (u otra unidad). Después **cuadran contra el inventario**: si físicamente falta, **nota de inventario** (alerta); si sobra, nota que suma. Importa saber **qué proveedores** mandan producto con novedades (faltantes/mermas) porque habla de su **calidad**.

## Lo que ya existe (no rehacer)

- `pedidoDetalles.cantidadRecibida` (hoy sin usar en el flujo de recepción).
- `recibirPedido` recibe TODO (pone recibida = pedida) y convierte a kg vía `cantidadEnBase(factor)`.
- `notasInventario` (vx18) ya tiene `proveedorId`, `pedidoId`, `tipo`, `cantidad`, `motivo`.
- `productoUnidades` con `factorConversion`, `precioVenta`, `permiteVenta`, `permiteCompra` (presentaciones por producto).
- `facturaDetalles` con `unidadId` + `cantidadBase` (la venta ya convierte a base).
- Precio pegajoso por cliente (`ultimoPrecioPorCliente`) y global (`ultimoPrecioVenta`).

## A · Pedir (por bulto / ½ bulto)

- Línea de pedido = **producto + presentación + cantidad** (decimales; `0.5` bulto). Ya hay tabla compacta.
- Las presentaciones vendibles/comprables salen de `productoUnidades` (p. ej. "Bulto = 50 kg"). Si el producto no tiene presentación de bulto, se compra en su unidad base.
- Sin cambios de modelo; sí asegurar que el selector de unidad de la línea muestre las presentaciones del producto (no todas las unidades del sistema).

## B · Recibir (todo o confirmar)

- En el detalle del pedido, **"Recibí todo"** (un toque) recibe lo pedido (comportamiento actual).
- **"Vino diferente"** abre las líneas con **cantidad recibida editable** (default = pedida). Se recibe lo realmente llegado.
- `recibirPedido(id, ctx, recepciones?)`:
  - sin `recepciones` → recibe todo (igual que hoy).
  - con `recepciones` (mapa líneaId→cantidadRecibida) → usa esas cantidades para inventario (costo promedio sobre lo recibido) y CxP por el **valor recibido**; `cantidadRecibida` se guarda por línea.
  - estado: `recibido` si todas completas; `parcial` si alguna recibió menos (se puede recibir el resto luego — fuera de alcance v1: por ahora cierra como recibido/parcial sin segunda recepción).
- La conversión presentación→base (kg) se mantiene (`cantidadEnBase`).

## C · Vender con unidad dinámica

- Cada línea del carrito (POS) gana un **selector de unidad** = presentaciones vendibles del producto (`permiteVenta`) + unidad base.
- **Default = última unidad usada para vender ese producto** (no una "preferida" fija). Se deriva de la última `facturaDetalle` del producto (preferir la del cliente elegido; si no, la global). Junto con la unidad viene su **precio** coherente (última venta) → si no hay, el `precioVenta` de esa presentación.
- Al **cambiar la unidad** en la línea, el precio sugerido se ajusta a esa presentación (`precioVenta` de la unidad, o última venta en esa unidad).
- En el ticket (columna derecha) se **resalta la unidad** de cada línea (chip junto a la cantidad: `2 bultos`, `3.5 kg`).
- `crearFactura` ya convierte `unidadId`→base; el descuento de inventario y el costo siguen en base. Sin cambio de modelo (la venta ya guarda `unidadId`).
- Dato auxiliar: servicio `ultimaVentaProducto(empresaId, clienteId?, productoId)` → `{ unidadId, precioUnitario }` de la línea más reciente (DISTINCT ON), preferir cliente.

## D · Cuadrar con notas (faltante / merma / sobrante)

- Nota sencilla: **producto** → el sistema **sugiere el último proveedor** que lo vendió (de su último pedido recibido; editable) → **tipo**:
  - **Faltante** (vino/queda menos) → salida (resta), **novedad del proveedor**, alerta.
  - **Merma** (dañado/calidad) → salida (resta), **novedad del proveedor**, alerta.
  - **Sobrante** (quedó de más) → entrada (suma), informativo.
  - (se conserva **Ajuste** genérico existente.)
- La nota guarda `proveedorId` (sugerido) + `tipo` + `cantidad` + `motivo`; genera el movimiento de inventario con el signo correcto.
- Servicio `ultimoProveedorDeProducto(empresaId, productoId)` → proveedor del último pedido recibido de ese producto.
- Alerta: faltantes/mermas recientes visibles (en Inicio, junto a "se está acabando", o un aviso "novedades").

## E · Calidad por proveedor

- Reporte que agrupa **novedades** (faltante + merma) por proveedor: número de novedades, cantidad y **valor** afectado (a costo). Permite ver qué proveedor manda producto con problemas.
- Vive en Reportes; consulta `notasInventario` con `tipo in (faltante, merma)` agrupado por `proveedorId`.

## Lógica de dominio (pura, TDD)

- `signoNota(tipo)` extendido: `faltante|merma → -1` (salida), `sobrante → +1` (entrada), `ajuste` según subtipo actual.
- `esNovedadProveedor(tipo)` → true para faltante/merma (para el reporte/alerta).
- `cantidadEnBase` (ya existe y testeado) — reutilizado en recepción y venta.
- Resolución de unidad/precio sugeridos en venta (combinar última venta + presentación) como función pura.

## Validación / pruebas

- TDD de las funciones puras nuevas (signo/novedad, resolución unidad+precio).
- `npm run build` limpio; suite completa verde.
- E2E: pedir 2 bultos → "vino diferente" recibe 1.5 → inventario en kg correcto y CxP por lo recibido; vender puchitos por kg (unidad sugerida = última usada, resaltada); nota de merma → resta + queda ligada al último proveedor; reporte muestra la novedad de ese proveedor.

## Fuera de alcance (YAGNI v1)

- Segunda recepción del saldo parcial (recibir el resto en otra fecha).
- Unidad "preferida" fija por producto (se usa la última usada, no una preferida).
- Costeo de merma con prorrateo avanzado.

## Etapas de implementación

1. Dominio: `signoNota`/`esNovedadProveedor` + resolución unidad/precio venta (TDD).
2. Servicios: `recibirPedido` con recepciones; `ultimoProveedorDeProducto`; `ultimaVentaProducto`; nota con tipo+proveedor.
3. Recepción UI: "Recibí todo" / "Vino diferente".
4. Venta UI: selector de unidad por línea + default última usada + resaltar unidad.
5. Nota UI: tipo (faltante/merma/sobrante) + proveedor sugerido + alerta.
6. Reporte de calidad por proveedor.
7. Build + E2E + deploy.

# Categorías de gasto + Factura Electrónica en la venta — Diseño

**Fecha:** 2026-05-30
**Contexto:** Vertex 2 (ERP mercado de verduras). Surge tras simular el ciclo completo
(pedido → recibir → inventario → vender → cobrar → pagar), que reveló tres huecos.

## Hallazgos de la simulación

El ciclo funciona end-to-end. Huecos detectados:

1. **No hay maestro de categorías de gasto.** Los costos del pedido (flete, gasolina…)
   se guardan como texto libre en `vx15_pedidoCostos.tipo` → inconsistencias.
2. **El check F.E. no está cableado en la venta.** `crearFactura` no hereda
   `esElectronica` del cliente ni permite marcarlo por factura; siempre queda `false`.
3. **No hay export de lo marcado F.E.** (queda para el siguiente entregable).

## Alcance de este diseño

Resolver (1) y (2). El **export F.E.** (3) se construye después, pero el modelo de
datos debe dejar todo lo F.E. correctamente etiquetado para que el export sea posible.

## 1. Categorías de gasto

**Decisión:** conviven en la misma tabla de categorías (`vx08`), distinguidas por un
campo `tipo` (`producto` | `gasto`). Los costos del pedido referencian una categoría
de gasto por FK.

- `vx08_categoriasProductos`: nuevo campo `tipo varchar(20) NOT NULL DEFAULT 'producto'`.
  Las categorías existentes quedan como `producto`.
- `vx15_pedidoCostos`: nuevo campo `categoriaId bigint NULL` → FK a `vx08`.
  Se conserva `tipo` (texto) como etiqueta denormalizada = nombre de la categoría
  elegida; `descripcion` sigue siendo la nota libre opcional.
- Catálogo de gasto sembrado para la empresa demo: Flete, Gasolina/Combustible,
  Transporte, Descargue, Empaque, Hielo, Peajes, Otros gastos.
- Servicios: `listarCategorias(empresaId, tipo?)`; `crearCategoria` acepta `tipo`.
- UI categorías: filtro/creación por tipo (Productos | Gastos).
- UI pedido (form de costos): cada renglón de costo elige la **categoría de gasto**
  de una lista (SearchSelect) + nota opcional + valor.

## 2. Factura Electrónica en la venta

**Decisión:** la factura **hereda** el flag del cliente y se puede **anular/forzar**
por factura puntual.

- `NuevaFactura`: nuevo campo opcional `esElectronica?: boolean`.
- `crearFactura`: carga `cliente.requiereFacturaElectronica` (ya carga el cliente para
  días de crédito) y resuelve:
  `esElectronica = data.esElectronica ?? cliente.requiereFacturaElectronica`.
  Guarda el resultado en `facturas.esElectronica` (campo ya existente).
- Lógica pura testeable: `resolverFacturaElectronica(override, clienteRequiere)`.
- POS (`factura-form`): check "Factura electrónica" que se **prende solo** cuando el
  cliente elegido requiere F.E., y queda editable. El concepto va implícito (ícono +
  etiqueta corta), coherente con la regla UIX del proyecto.

## Preparación para el export (siguiente entregable)

Tras esto, lo exportable quedará identificado por:
- **Ventas F.E.**: `facturas.esElectronica = true` → para que el contador las emita.
- **Compras F.E.**: `terceros.requiereFacturaElectronica = true` + retenciones
  aplicadas (`vx32`) → para las retenciones legales.
Lo no marcado **no** entra al export.

## Pruebas

- Unit (vitest): `resolverFacturaElectronica` (override gana; sin override hereda).
- Integración (gitignored): re-correr `ciclo-completo` y verificar que los huecos 1 y 2
  quedan cerrados (costo con categoría; factura de cliente F.E. nace `esElectronica=true`).

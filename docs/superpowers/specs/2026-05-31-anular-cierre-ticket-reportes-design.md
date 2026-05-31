# Anular ventas · Cierre de caja · Ticket POS · Reportes — Diseño

**Fecha:** 2026-05-31
**Proyecto:** Vertex 2 (Next.js 15 RSC + Drizzle + Supabase, deploy en Vercel)

Cuatro features, construidas en **2 olas**:
- **Ola 1 (dominio/plata):** Anular venta · Cierre de caja (arqueo).
- **Ola 2 (aditivas):** Ticket/recibo POS (híbrido) · 4 reportes nuevos sobre el motor.

---

## 1. Anular venta (Ola 1)
**Objetivo:** poder anular una factura mal hecha, revirtiendo sus efectos.

**Regla:** solo si `estado = "emitida"` y **sin cobros aplicados**:
- Crédito: el saldo de su cuenta por cobrar debe ser igual al total (sin abonos). Si
  tiene abonos → se bloquea con mensaje "Tiene cobros; revierte los recaudos primero".
- Contado: no tiene recaudos; se permite (se revierte la entrada de caja).

**Servicio** `anularFactura(facturaId, motivo, ctx)` (en `facturas.ts`), transaccional:
1. Carga factura + detalles; valida estado y ausencia de cobros.
2. Por cada línea: **devuelve stock** al inventario (suma `cantidadBase`, recalcula
   `valorTotal`) y registra `movimientosInventario` tipo `"entrada"` (referencia
   "ANULA <numero>").
3. Si crédito: pone `saldoPendiente = 0` en la CxC (sale de deudores).
   Si contado: inserta `movimientosTesoreria` tipo `"salida"` por el total desde
   `cuentaDestinoId` (origen `"anulacion_venta"`, append-only; no se borra el original).
4. Marca la factura `estado = "anulada"`, guarda `motivoAnulacion` y `anuladaEn`.
5. Auditoría.

**Modelo:** `vx21 facturas` agrega `motivoAnulacion text` y `anuladaEn timestamp` (nullable).

**UI:** botón **"Anular"** en `facturas/[id]` (solo si emitida y sin cobros), abre modal
con motivo (obligatorio) y confirma. Permiso `facturas.eliminar`.

**Consistencia:** las consultas de ventas/cartera que hoy filtran `ne(estado,"cancelada")`
pasan a excluir `"anulada"` también (servicios: `facturas.facturasDeCliente`,
`reportes/ventas`, `relacion.resumenCliente`). Se estandariza el estado de anulación en
`"anulada"`.

**Dominio puro testeable:** `puedeAnular(estado, saldoPendiente, total, tipoVenta)` →
`{ ok: boolean, motivo?: string }`.

---

## 2. Cierre de caja / arqueo (Ola 1)
**Objetivo:** al cerrar el día, cuadrar lo que hay en cada cuenta.

**Alcance:** un cierre por **día** que abarca **todas las cuentas** de la empresa. Para
las de **efectivo/caja** se ingresa el **conteo físico** → **diferencia**; las de
**banco** se muestran como **conciliación** (saldo esperado informativo, sin conteo, sin
diferencia obligatoria).

**Modelo (tablas nuevas, registradas en vx00):**
- `vx37 cierres`: `id, empresaId, fecha (date), usuarioId, observaciones, createdAt`.
  Único por (empresaId, fecha) — un cierre por día.
- `vx38 cierreCuentas`: `id, cierreId, cuentaPropiaId, tipo (varchar: caja|banco),
  saldoEsperado (money), montoContado (money, nullable para banco), diferencia (money)`.

**Servicios** (`src/lib/services/cierre.ts`):
- `cuentasParaCierre(empresaId)` → cada cuenta activa con su `saldoEsperado`
  (saldo corrido actual, reusando la lógica existente de tesorería) y su `tipo`.
- `registrarCierre(empresaId, fecha, conteos: {cuentaId, montoContado?}[], obs, ctx)` →
  calcula diferencias (solo efectivo) e inserta cierre + detalle. Idempotente por día
  (si existe, lo reemplaza o avisa). Bloquea doble cierre del mismo día.
- `listarCierres(empresaId)` y `obtenerCierre(empresaId, id)` para el histórico.

**Dominio puro:** `diferenciaArqueo(esperado, contado) → contado - esperado`.

**UI:** en **Tesorería** un botón/sección **"Cierre de caja"** → página `/tesoreria/cierre`:
lista de cuentas con su esperado; input de conteo para las de efectivo; muestra
diferencia (verde/rojo); observaciones; "Cerrar día". Más histórico de cierres
(`/tesoreria/cierre` lista + detalle). Permiso `tesoreria.crear` (registrar),
`tesoreria.ver` (consultar).

---

## 3. Ticket / recibo POS — híbrido (Ola 2)
**Objetivo:** imprimir el recibo de venta y de cobro, tipo POS, desde PC o celular.

**Formatos:** **media carta (A5-ish)**, **térmica 80mm**, **térmica 58mm**. El usuario
elige y la **preferencia se recuerda** (localStorage `vx_recibo_formato`).

**Enfoque híbrido:**
- **Base universal:** un componente `Recibo` (HTML/CSS) que renderiza al ancho del
  formato elegido, con `@media print` / `@page`, y un botón **"Imprimir"** que usa
  `window.print()` → diálogo del sistema (funciona en **iPhone y Android** con cualquier
  impresora emparejada por el SO, incluida Bluetooth/AirPrint).
- **Plus Android (Web Bluetooth + ESC/POS):** un botón **"Imprimir directo"** que aparece
  **solo si `navigator.bluetooth` existe**; conecta a la impresora térmica BLE y envía
  comandos **ESC/POS** (init, texto, corte) — impresión de un toque. Best-effort
  (depende del modelo; característica de escritura común). En iPhone no se muestra.

**Contenido del recibo:** logo Vertex (teñido) + nombre/NIT empresa, número, fecha,
cliente, líneas (cant × precio = subtotal), total, forma de pago / saldo. Para **recibo
de cobro**: cliente, valor recibido, método, fecha, saldo restante.

**Dónde:** detalle de factura `facturas/[id]` (recibo de venta) y tras cobrar
(`cuentas-cobrar` / ruta de recaudo → recibo de pago).

**Dominio puro:** `lineasRecibo(...)`/`escpos(texto)` — construcción del texto del recibo
y de la secuencia de bytes ESC/POS (testeable sin hardware).

---

## 4. Reportes nuevos sobre el motor (Ola 2)
Cada uno = un servicio `{ kpis, series, detalle }` + filtros + entrada en
`src/lib/reportes/registry.ts`. Dashboard y export (CSV/Excel) ya son genéricos.
- **Compras** — por proveedor/producto, evolución por día, costos (flete/gasolina), top.
  Origen: pedidos vx13/vx14 + pedidoCostos vx15 + terceros + productos.
- **Cuentas por pagar (aging)** — espejo del de CxC: tramos de vencimiento, top
  proveedores. Origen: cuentasPorPagar vx26 + terceros. Reusa `tramoAging`.
- **Flujo de caja / Tesorería** — entradas vs salidas por día, saldo por cuenta.
  Origen: movimientosTesoreria vx35 + cuentasPropias vx33.
- **Dashboard Factura electrónica** — ventas F.E. (facturas esElectronica) y compras
  F.E. con retenciones; complementa el export ya existente. Origen: facturas vx21 +
  pagos/retenciones vx27/vx32.

---

## Pruebas
- Unit (dominio): `puedeAnular`, `diferenciaArqueo`, `escpos`/`lineasRecibo`, y los
  nuevos servicios de reporte (helpers de tramos/series donde haya lógica pura).
- Integración (gitignored): anular una factura demo revierte stock/cartera; cierre de
  caja calcula diferencias; cada servicio de reporte devuelve datos coherentes.
- Verificación manual: anular en el POS, cerrar caja, imprimir recibo (PC), y los 4
  reportes con sus filtros + export.

## No-objetivos
- Sin anulación parcial de factura (es total) ni edición de factura emitida.
- Cierre no "bloquea" operaciones del día siguiente (no es un cierre contable duro).
- Bluetooth directo solo Android (limitación del navegador en iPhone); iPhone usa la
  impresión nativa del sistema.
- Migración de dominio (appvertex.shop) es config de Vercel/DNS, fuera de este código.

# Registrar la factura del proveedor (paso faltante) — Diseño

**Fecha:** 2026-05-30

## Problema
Tras recibir un pedido se crea la cuenta por pagar usando MI número de pedido y
asumiendo "es electrónica" desde un flag fijo del proveedor. Falta el paso real:
**el proveedor me factura**, y ahí me entero del número real y de si me cobra por
**factura electrónica o normal** — lo que decide retenciones y el export de compras.

## Decisiones (aprobadas)
- La marca **electrónica es por compra** (por cuenta por pagar), capturada al
  registrar la factura del proveedor. El flag del proveedor solo sugiere el valor.
- **Obligatorio antes de pagar**: no se puede registrar el pago de una CxP sin antes
  registrar su factura (número + electrónica sí/no).

## Modelo de datos
`vx26 cuentasPorPagar` agrega:
- `esElectronica boolean not null default false` — F.E. de esa compra.
- `facturaRegistrada boolean not null default false` — si ya se capturó la factura.
`numeroFactura` pasa a guardar el número REAL del proveedor (al recibir queda el
número del pedido como provisional hasta registrar).

## Flujo
1. Recibir pedido → CxP con `facturaRegistrada=false`.
2. **Registrar factura del proveedor** (acción nueva, en el detalle del pedido y en
   Cuentas por pagar): número del proveedor, fecha, vencimiento, **electrónica sí/no**
   (default = flag del proveedor). Marca `facturaRegistrada=true`.
3. Pagar: por documento (exacto) o total FIFO. **Bloqueado** mientras haya documentos
   sin factura registrada.

## Lógica
- `registrarPago(cxpId)`: la retención se calcula con `cxp.esElectronica` (no el flag
  del proveedor) y **exige** `facturaRegistrada` (si no, error claro).
- `pagarAProveedor` (FIFO): solo reparte sobre documentos con factura registrada;
  retención **por documento** (cada slice según su `esElectronica`); la salida de
  tesorería es el neto (monto − retenciones).
- `acreedoresPorProveedor`: reporta `docsSinFactura` para avisar y bloquear el pago
  total. Los documentos (`DocAbierto`) llevan `esElectronica` y `facturaRegistrada`.

## UI
- `RegistrarFacturaProveedor` (modal): número, fecha, vencimiento, switch "Electrónica".
- Detalle del pedido: junto a la deuda, botón "Registrar factura del proveedor".
- Cuentas por pagar: por documento, si no está registrada → botón "Registrar factura";
  si está → muestra nº/electrónica y permite "Pagar". El botón "Pagar" total se
  deshabilita con aviso si hay documentos sin factura.

## Pruebas
- Integración: recibir → registrar factura (electrónica) → pagar el documento aplica
  retención; intentar pagar sin registrar → error.

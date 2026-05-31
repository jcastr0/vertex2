# Bancos en Tesorería + Relación comercial del tercero + Detalle de CxC — Diseño

**Fecha:** 2026-05-30
**Regla rectora:** diseñar por la tarea del dueño (puesto de verduras), no por los
campos del ingeniero. Tres ajustes UX detectados al usar la app.

## 1. Maestro de bancos dentro de Tesorería

La página `/tesoreria` pasa a tener **pestañas: "Cuentas" | "Bancos"**.
- **Cuentas**: lo actual (cuentas propias con saldo).
- **Bancos**: lista del catálogo `vx36` (45 sembrados) con su estado; permite
  **agregar** un banco (nombre + tipo) y **activar/desactivar**. El `codigo` se
  genera por slug del nombre (único; si choca, se sufija `-2`, `-3`…).
- Permisos: `tesoreria.ver` (ver), `tesoreria.crear` (agregar), `tesoreria.editar`
  (activar/desactivar). Bancos es catálogo global; la auditoría se registra con la
  empresa activa.
- Servicios nuevos en `bancos.ts`: `listarBancosAdmin()`, `crearBanco(input, ctx)`,
  `cambiarEstadoBanco(id, activo, ctx)`. Helper puro `slugBanco(nombre)` (TDD).

## 2. Relación comercial en el show del tercero

Hoy el show solo muestra identificación/contacto/condiciones. Se agrega:
- **Tarjetas de resumen** arriba (antes de los Tabs):
  - Cliente: **Te debe** (rojo si vencido) · **Te ha comprado** (histórico) ·
    **Este mes** · **Última compra**.
  - Proveedor: **Le debes** (rojo si vencido) · **Le has comprado** · **Este mes** ·
    **Última compra**. (Si es "ambos", se muestran las dos).
- **Pestaña "Movimiento"**:
  - Cliente: sus **facturas** (nº, fecha, total, saldo, F.E.); arriba las que tienen
    saldo.
  - Proveedor: sus **pedidos/compras** (nº, fecha, total, estado).

Servicios nuevos:
- `relacion.ts`: `resumenCliente(empresaId, clienteId)` y
  `resumenProveedor(empresaId, proveedorId)` → `{ debe/leDebes, vencido,
  haComprado/leHasComprado, mes, ultima, docsAbiertos }`.
- `cartera.ts`: `cuentasPorCobrarDe(empresaId, clienteId)` y
  `cuentasPorPagarDe(empresaId, proveedorId)` → documentos abiertos (saldo > 0).
- `facturas.ts`: `facturasDeCliente(empresaId, clienteId)` (con saldo desde CxC).
- `pedidos.ts`: `pedidosDeProveedor(empresaId, proveedorId)`.

## 3. Cuentas por cobrar: detalle expandible

Cada cliente en `/cuentas-cobrar` se **expande** (acordeón) y muestra las facturas
que componen su deuda (nº, fecha, vence, saldo, aviso vencido). El botón de cobrar
sigue disponible. Se alimenta de una sola consulta de documentos abiertos agrupada
por cliente (sin N+1).

## Pruebas
- Unit: `slugBanco` (slug correcto, longitud, colisión por sufijo).
- Integración (gitignored): el ciclo ya cubre creación de CxC; se añade verificación
  de `cuentasPorCobrarDe` y `resumenCliente`.

## No-objetivos
- El export F.E. (entregable aparte) no entra aquí.
- No se reescribe el cálculo de saldos (se reusa `saldoPendiente` de vx28/vx26).

# Pagar a proveedores: "¿A quién le debes?" (FIFO, espejo de Cobrar)

**Fecha:** 2026-05-30
**Estado:** Diseño aprobado

## Objetivo

Completar el pilar "Comprar y pagar" con un pago a proveedores en lenguaje del dueño, espejo de **Cobrar**: ver a quién le debes y registrar **cuánto le pagaste**, repartido a sus facturas (más antigua primero), saliendo de una cuenta propia, con **retenciones parametrizadas** y beneficiario cuando aplica.

## Contexto / lo que ya existe (reusar)

- **Cobrar** (referencia): `deudoresPorCliente` + `cobrarACliente` (FIFO) + pantalla `/cuentas-cobrar` "¿Quién te debe?" con tarjetas tappables y modal "¿Cuánto te pagó?".
- `distribuirFIFO(deudas, monto)` (domain, testeado): reparte a la más antigua primero.
- **Retenciones parametrizables** (módulo `vx31`): nombre, **porcentaje**, **base mínima**, aplicaTodas, activa. `retencionesActivas(empresaId)` + `calcularRetenciones(base, config, esFE)` (domain, testeado). Solo aplican a proveedores con **factura electrónica** (`terceros.requiereFacturaElectronica`).
- `registrarPago` (por factura, hoy): retención sobre el valor, `cuentaOrigenId`, beneficiario (snapshot), movimiento de tesorería **salida por el neto**, `pagoRetenciones` (vx32).
- Cuentas de pago del proveedor (`vx34`) + cuentas propias (`vx33`) + movimientos (`vx35`).

## Pantalla "Pagar" — `/cuentas-pagar` reencauzada

- Título **"Pagar" · "¿A quién le debes?"**. Encabezado **"Debes en total $X · N proveedores"**.
- Lista de proveedores con saldo > 0: tarjeta tappable con nombre, **total adeudado**, punto **rojo/verde** (vencido/al día por el vencimiento más antiguo). Buscador por proveedor.
- Vacío: "No le debes a nadie".

## Modal "¿Cuánto le pagaste a {proveedor}?"

- **Monto** (default = total adeudado) · **¿De qué cuenta sale?** (cuenta propia, obligatoria) · **¿Cómo pagaste?** (método) · fecha.
- Si el proveedor es de **factura electrónica**: muestra el **desglose de retenciones** (las activas que apliquen sobre el monto) y el **neto a desembolsar**; y un **beneficiario** (a dónde va: "al proveedor" por defecto o una cuenta guardada del proveedor). Si no es FE, no aparece nada de retención/beneficiario.
- Acción: registra el pago (ver servicio).

## Servicio y lógica

- `acreedoresPorProveedor(empresaId)` → `{ proveedorId, proveedor, total, venceMin, docs, facturaElectronica }[]` (espejo de `deudoresPorCliente`; agrupa CxP con saldo > 0).
- `pagarAProveedor(proveedorId, datos, ctx)` con `datos = { monto, metodoPago, fecha, cuentaOrigenId, beneficiario? }`:
  1. Carga FE del proveedor + `retencionesActivas`; `ret = calcularRetenciones(monto, config, fe)`.
  2. `neto = monto − ret.total`.
  3. `distribuirFIFO(CxP abiertas del proveedor [más antigua primero], monto)` → por cada porción: reduce `saldoPendiente` y crea un `pagosProveedor` (valor = porción).
  4. La **retención** se registra una vez (detalle `pagoRetenciones` + `retencionTotal` en el primer pago; suma de `retencionTotal` entre pagos = `ret.total`).
  5. **Una** salida de tesorería (`vx35`) por el **neto** desde `cuentaOrigenId` (origen `pago_proveedor`), si hay cuenta.
  6. Beneficiario (snapshot) en los pagos cuando se eligió.
  7. Auditoría.
- Reusa `distribuirFIFO` y `calcularRetenciones`. Prueba de escritorio para el orquestador: neto correcto, reparto FIFO suma el bruto, retención total = suma de detalle.

## UX

- Concepto implícito (íconos), lenguaje del dueño. Para proveedores de verdura (sin FE) es idéntico a Cobrar: monto + de qué cuenta sale. Retención/beneficiario solo aparecen si el proveedor es de factura electrónica.
- No se quita la función actual de pago por factura del módulo de cuentas por pagar si existiera en otra vista (la pantalla principal pasa a la vista por proveedor; el historial de pagos sigue).

## Pruebas / verificación

- TDD del orquestador de pago (neto, reparto, retención total) con datos simulados.
- `npm run build` limpio; suite verde.
- E2E: proveedor con 2 facturas; pagar un monto que cruce ambas → FIFO correcto, saldo baja, salida de tesorería por el neto; proveedor FE → retención parametrizada aplicada y neto correcto; el reporte de pagos/tesorería refleja el movimiento.

## Fuera de alcance (YAGNI)
- Pago factura-por-factura desde esta pantalla (se eligió FIFO). El historial de pagos se mantiene.
- Reparto de la retención prorrateado por factura (se registra a nivel de pago; suma correcta).

## Etapas
1. Servicio `acreedoresPorProveedor`.
2. Servicio `pagarAProveedor` (FIFO + retención + tesorería) + prueba de escritorio del orquestador puro si se extrae lógica.
3. Action `pagarProveedorAction` + `datosPagoProveedorAction` (FE, cuentas propias, beneficiarios).
4. UI pantalla "Pagar" + componente `PagarProveedor` (tarjeta + modal con retención/beneficiario condicionales).
5. Build + E2E + deploy.

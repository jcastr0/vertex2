# Tesorería: fuente y destino del dinero en pagos y recaudos

**Fecha:** 2026-05-29
**Estado:** Diseño aprobado (pendiente revisión del spec)

## Problema

Las cuentas por pagar se liquidan desde distintas cuentas de la empresa y, a veces,
hacia cuentas/NIT distintos del proveedor principal (factoring, cesiones de pago,
terceros que cobran). Hoy `vx27` (pagos) solo guarda `metodoPago` (texto) y
`referencia`; no hay forma de saber **de qué cuenta salió el dinero** ni **a qué
beneficiario/cuenta llegó**. Tampoco existe un saldo de tesorería.

## Objetivo

1. Registrar y catalogar las **cuentas propias** de la empresa (tesorería) con saldo en vivo.
2. Registrar el **beneficiario destino** de cada pago, permitiendo cuentas con NIT distinto al del proveedor, desde un catálogo por proveedor o capturado ad-hoc.
3. Mantener un **libro de movimientos** que sea la única fuente de verdad del saldo y sirva como extracto ("de dónde salió y a dónde fue").
4. Conectar pagos (salida por el **neto** = valor − retención) y recaudos (entrada) a las cuentas propias.

## Decisiones tomadas

- **Destino/beneficiario:** catálogo por proveedor **+** captura ad-hoc (opcionalmente guardable).
- **Fuente/origen:** catálogo de cuentas propias **con saldos en vivo**.
- **Movimientos que afectan el saldo:** saldo inicial, pagos a proveedor (salida), recaudos de clientes (entrada) y movimientos manuales (traslados, comisiones, consignaciones/retiros, ajustes).
- **Obligatoriedad:** elegir cuenta de origen (pagos) y destino (recaudos) es **obligatorio**. Los pagos históricos sin cuenta quedan "sin asignar" y no afectan saldos.
- **Cálculo del saldo:** **derivado** del libro (`saldo_inicial + Σ entradas − Σ salidas`). Sin columna cache; imposible que se desincronice.

## Modelo de datos (nuevas tablas vxNN, registradas en `vx00`)

### vx33 — Cuentas propias (tesorería)
- `id`, `empresaId`
- `nombre` (alias), `tipo` (`ahorros` | `corriente` | `caja`)
- `banco` (nullable para caja/efectivo), `numeroCuenta` (nullable)
- `titularNit`, `titularNombre`
- `saldoInicial` (money) — se materializa como el primer movimiento `saldo_inicial`
- `activa` (bool), timestamps
- Índice por `empresaId`.

### vx34 — Cuentas de beneficiario (por proveedor)
- `id`, `empresaId`, `terceroId` → vx07
- `banco`, `tipo` (`ahorros` | `corriente`), `numeroCuenta`
- `titularNit`, `titularNombre` (pueden diferir del proveedor)
- `activa` (bool), timestamps
- Índice por `(empresaId, terceroId)`.

### vx35 — Movimientos de tesorería (libro mayor)
- `id`, `empresaId`, `cuentaPropiaId` → vx33
- `fecha` (date)
- `tipo` (`entrada` | `salida`)
- `origen` (`saldo_inicial` | `pago_proveedor` | `recaudo_cliente` | `traslado` | `comision` | `ajuste` | `consignacion` | `retiro`)
- `valor` (money, siempre positivo)
- `descripcion` (text, nullable)
- `pagoId` → vx27 (nullable), `recaudoId` → vx29 (nullable), `contraCuentaId` → vx33 (nullable, para traslados)
- `usuarioId` → vx02
- `createdAt`
- Índice por `(empresaId, cuentaPropiaId, fecha)`.

### Cambios a tablas existentes
- **vx27 (pagos a proveedor):**
  - `cuentaOrigenId` → vx33 (nullable en columna por compatibilidad; **obligatorio en la lógica** de creación nueva).
  - `beneficiarioCuentaId` → vx34 (nullable; null = al proveedor principal).
  - Snapshot del beneficiario: `beneficiarioBanco`, `beneficiarioCuenta`, `beneficiarioNit`, `beneficiarioNombre` (nullable). Conserva el historial aunque el catálogo cambie.
- **vx29 (recaudos):**
  - `cuentaDestinoId` → vx33 (nullable en columna; obligatorio en lógica nueva).

## Flujos

- **Crear cuenta propia:** inserta vx33 y un movimiento `saldo_inicial` (tipo `entrada`) por el saldo inicial.
- **Registrar pago** (`registrarPago`, ya transaccional): calcula retenciones (existente) → inserta pago con origen + beneficiario (snapshot) → inserta movimiento `salida` (`origen=pago_proveedor`, `valor = neto = valor − retención`) en `cuentaOrigenId` → si el beneficiario fue ad-hoc con "guardar", inserta vx34 → audita.
- **Registrar recaudo** (`registrarRecaudo`): inserta recaudo con `cuentaDestinoId` → inserta movimiento `entrada` (`origen=recaudo_cliente`, `valor`) → audita.
- **Movimiento manual:** traslado = dos movimientos enlazados por `contraCuentaId` (salida en origen, entrada en destino); comisión/retiro = salida; consignación = entrada; ajuste = entrada o salida.

## Lógica de dominio (pura, TDD — `src/lib/domain/tesoreria.ts`)
- `calcularSaldo(saldoInicial: number, movimientos: {tipo, valor}[]): number`
- `saldoCorrido(saldoInicial: number, movimientos): {…, saldo}[]` — para el extracto.
- `movimientoDesdePago({valor, retencionTotal}): {tipo:'salida', valor:number}` — valor = neto.
- `resolverBeneficiario(opcion, proveedor, adhoc): {beneficiarioCuentaId, snapshot} | null` — null = al proveedor.

Validaciones Zod: `cuenta-propia.ts`, `beneficiario.ts`, `movimiento-tesoreria.ts`.

## UI
- **`/tesoreria`** (permiso `tesoreria`, sección "Tesorería" del menú): lista de cuentas con saldo actual; crear/editar; extracto por cuenta (saldo corrido, responsive); "Nuevo movimiento" (traslado/comisión/consignación/retiro/ajuste).
- **Edición de tercero:** sección "Cuentas de pago" para administrar vx34.
- **Modal de pago** (extiende `PagoProveedorButton`): Cuenta de origen (obligatoria) + selector de destino (al proveedor / cuenta guardada / "+ Otro beneficiario" con campos y casilla "guardar"). Mantiene el neto a desembolsar.
- **Modal de recaudo:** Cuenta destino (obligatoria).
- **Lista de pagos:** columnas origen → beneficiario.

## Permisos y nomenclatura
- Nuevo módulo `tesoreria` en `MODULOS` (roles.ts); Admin con CRUD.
- vx33, vx34, vx35 agregados a `CATALOGO` (nomenclatura.ts) y sembrados en vx00.

## Pruebas y verificación
- Pruebas de escritorio (Vitest) para cada función de dominio: RED → GREEN.
- `npm run build` limpio; suite completa verde.
- E2E en producción: crear cuenta propia → pagar una CxP eligiendo origen + beneficiario ad-hoc → ver salida en extracto y saldo reducido por el neto → recaudar a una cuenta → ver entrada.

## Implementación por etapas
1. Schema vx33/34/35 + cambios vx27/vx29 + nomenclatura + migración.
2. Dominio + pruebas.
3. Servicios (tesorería, beneficiarios) + wiring en `cartera.ts`.
4. UI módulo tesorería + cuentas de pago en tercero.
5. Modales de pago y recaudo.
6. Permiso + navegación.
7. Build + E2E + commit/push/deploy.

## Fuera de alcance (YAGNI por ahora)
- Conciliación bancaria automática contra extracto importado.
- Multimoneda.
- Proyección de flujo de caja.

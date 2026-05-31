# Manuales narrativos — Diseño

**Fecha:** 2026-05-31
**Modo:** autónomo (el usuario delegó todas las decisiones; sin interacción). Las decisiones tomadas se documentan aquí.

**Objetivo:** Ampliar los manuales de Vertex con guías **narrativas** del ciclo del negocio, fieles a los flujos reales del código: comprar → recibir → pagar al proveedor (asignando cuentas y aplicando retenciones) → vender (con facturación electrónica) → cobrar al cliente. El **recaudo** se documenta en **dos formas: computador (programar) y celular (cobrar en la calle)**, porque se usa más en móvil.

---

## Arquitectura (sin cambios estructurales)

Se conserva el sistema actual: `src/lib/manuales.ts` exporta `MANUALES: Manual[]` con `{ slug, titulo, descripcion, icon, modulo, contenido }`, donde `contenido` es **markdown** renderizado en `/manuales/[slug]` con `ReactMarkdown + remarkGfm` dentro de un `<article class="prose max-w-3xl">` (lectura en escritorio). El listado `/manuales` muestra tarjetas filtradas por `puede(permisos, ${modulo}.ver)`.

**Decisión (recaudo en dos formas):** el manual se lee en escritorio, así que el recaudo NO necesita un renderizado distinto en móvil; en su lugar, su markdown contiene **dos secciones explícitas**: `## En el computador — programar la ruta` y `## En el celular — cobrar en la calle`. Así un mismo manual documenta ambas experiencias.

No se agregan dependencias ni tablas. Solo se edita `src/lib/manuales.ts` (contenido) y `src/lib/manuales.test.ts` (pruebas).

---

## Manuales a agregar / modificar

**Nuevos (4):**

1. `ciclo-negocio` — **"El ciclo del negocio"** (modulo `dashboard`). La narrativa columna vertebral: de la compra al cobro, en orden, enlazando a los manuales detallados (`/manuales/<slug>`). Va justo después de "Primeros pasos".
2. `recaudo` — **"Cobrar en ruta"** (modulo `ruta_recaudo`). **Dos formas:** computador (programar recaudador + día) y celular (cobrar / marcar visita con foto).
3. `pagar-proveedor` — **"Pagar a un proveedor"** (modulo `cuentas_pagar`). Asignar cuentas bancarias al proveedor (beneficiarios), registrar la factura del proveedor, y pagar aplicando retenciones y eligiendo la cuenta beneficiaria.
4. `retenciones` — **"Retenciones"** (modulo `retenciones`). Dónde se crean y cómo se aplican.

**Modificado (1):**

5. `vender` — se agrega una sección **"Factura electrónica"** (cómo se asigna la F.E. en la venta).

Total: 6 existentes + 4 nuevos = 10 manuales.

---

## Flujos reales (fuente de verdad para el contenido — verificado en el código)

**Compra → pago (ciclo + pagar-proveedor):**
- Pedido: `Pedidos → Nuevo pedido` (proveedor, bodega destino, productos con unidad/cantidad/precio, costos adicionales que se reparten). `vx13`/`vx14`/`vx15`.
- Recibir: en el detalle del pedido, "Recibir e ingresar a inventario" → sube inventario, recalcula **costo promedio ponderado**, y crea la **cuenta por pagar** (`vx26`).
- Registrar la factura del proveedor: en Cuentas por pagar, acción `registrarFacturaProveedorAction` (número de factura del proveedor; marca si es F.E.).
- Pagar: en Cuentas por pagar → "Pagar". Form (`pagar-proveedor.tsx`): elige **¿de qué cuenta sale?** (cuentas propias de tesorería), y para proveedores con **F.E.** elige la **cuenta beneficiaria** (a dónde va el dinero). Las **retenciones se calculan por documento sobre las compras con F.E.** (`calcularRetenciones(abono, retenciones, fe)`), respetando la **base mínima**; **neto = monto − retención**. Se guardan en `vx32` (`pagoRetenciones`).

**Asignar cuentas bancarias a un proveedor (beneficiarios):**
- `Terceros → [proveedor] → panel Beneficiarios → "Agregar cuenta"`: **banco** (del catálogo vx36), **tipo**, **N° de cuenta**. Por defecto el **titular es el mismo proveedor** (NIT + nombre); se puede poner otro titular (factoring/cesión). Servicio `beneficiarios.ts` (`vx34`/`vx35`). Estas cuentas aparecen al pagar a proveedores con F.E.

**Retenciones (vx31 / vx32):**
- Crear: `Retenciones → Nueva`: **nombre**, **porcentaje**, **base mínima**, **aplica a todas** (sí/no), **activa**.
- Aplicar: automáticamente al **pagar al proveedor**, sobre el valor de los documentos con **F.E.**, si la base supera la **base mínima**. Reducen el neto a pagar y quedan registradas en el pago.

**Vender + F.E. (vender):**
- `Facturas → Vender`: cliente, **contado** o **crédito**, productos (precio sugerido, editable), total, "Registrar venta". En contado se elige **método de pago** y **a qué cuenta propia** entra el dinero (`metodoPago`, `cuentaDestinoId`).
- **F.E.:** hay un switch **"Factura electrónica"** (`esElectronica`) que **se prende solo** si el cliente `requiereFacturaElectronica`. Cuando está activa, "se exportará para el contador" (no es integración DIAN: es una marca + exportación). La exportación está en **Reportes → exportar F.E.** (ventas/compras).
- Al registrar: baja inventario; si es crédito crea cuenta por cobrar (`vx28`).

**Cobrar al cliente — ruta de recaudo (recaudo, dos formas):**
- **Computador (programar):** `Ruta de recaudo → "Programar ruta"` (`/ruta-recaudo/asignar`, requiere `ruta_recaudo.editar`): asigna **recaudador** y **día de cobro** a varios clientes a la vez. Quien tenga `usuarios.ver` puede elegir de qué recaudador ver la ruta (RecaudadorPicker).
- **Celular (cobrar en la calle):** el recaudador abre **Ruta de recaudo** en el celular y ve **"Hoy te toca"** (clientes con saldo cuyo día es hoy), más KPIs (recaudado hoy, clientes con saldo, visitados). En cada parada puede:
  - **Recaudar**: registrar un pago (valor, método, referencia) → baja la cartera del cliente (`vx29`).
  - **Marcar visita** cuando no cobró: resultado **"no estaba"** o **"no quiso"**, con **foto de evidencia** (se sube) y observaciones (`vx30`).
  - Requiere permiso `recaudos.crear`.

---

## Pruebas (prueba de escritorio)

Extender `src/lib/manuales.test.ts` (dominio puro, sin BD):
1. Slugs únicos; cada `modulo` ∈ `MODULOS`; `titulo`/`descripcion`/`contenido` no vacíos; cada `contenido` empieza con un encabezado `# `.
2. Existen los slugs nuevos: `ciclo-negocio`, `recaudo`, `pagar-proveedor`, `retenciones`.
3. **Recaudo en dos formas:** el contenido de `recaudo` contiene una sección de **computador** y otra de **celular** (regex sobre los encabezados).
4. **Sin enlaces rotos:** todo enlace markdown interno a otro manual (`](/manuales/<slug>)`) apunta a un slug que existe en `MANUALES`. (El manual `ciclo-negocio` enlaza a los demás; el test garantiza que esos enlaces resuelven.)
5. `vender` menciona "electrónica" (la sección de F.E.).

---

## Fuera de alcance (YAGNI)
- Integración real con la DIAN para F.E. (hoy es marca + exportación; el manual lo dice así).
- Capturas de pantalla / imágenes (markdown de texto; el sistema no aloja imágenes de manual).
- Renderizado responsive distinto del manual en móvil (se lee en escritorio; el recaudo cubre ambos flujos con dos secciones de texto).
- Buscador dentro de manuales, versionado, o export a PDF.

---

## Nota de modo autónomo
El usuario no puede revisar el spec antes de implementar. Se procede directo a `writing-plans` con estas decisiones. Si alguna interpretación resultara equivocada, es reversible (solo es contenido de manuales).

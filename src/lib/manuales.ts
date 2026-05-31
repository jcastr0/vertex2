import type { LucideIcon } from "lucide-react";
import { Rocket, ShoppingBag, ShoppingCart, Boxes, Wallet, Package, Workflow, Route, Banknote, Percent } from "lucide-react";
import type { Modulo } from "./auth/roles";

export interface Manual {
  slug: string;
  titulo: string;
  descripcion: string;
  icon: LucideIcon;
  /** Módulo cuyo permiso `.ver` habilita el acceso a este manual. */
  modulo: Modulo;
  contenido: string;
}

export const MANUALES: Manual[] = [
  {
    slug: "primeros-pasos",
    titulo: "Primeros pasos",
    descripcion: "Conoce Vertex y el flujo general de trabajo.",
    icon: Rocket,
    modulo: "dashboard",
    contenido: `# Primeros pasos en Vertex

Vertex te ayuda a administrar **compras, inventario, ventas y cartera** de tu empresa.

## El flujo en 4 pasos

1. **Maestros** — registra tus **bodegas**, **terceros** (proveedores y clientes), **categorías** y **productos**.
2. **Compras** — crea un **pedido** a un proveedor y, al recibirlo, el inventario se actualiza solo.
3. **Ventas** — usa la pantalla **Vender** para facturar en segundos.
4. **Cartera** — registra **recaudos** de clientes y **pagos** a proveedores.

## Consejos

- El **Dashboard** muestra tus indicadores del mes y alertas (stock bajo, cartera vencida).
- Casi todas las listas tienen **buscador** y **paginación**.
- Si eres **superadmin**, elige la empresa activa en la parte superior.
`,
  },
  {
    slug: "ciclo-negocio",
    titulo: "El ciclo del negocio",
    descripcion: "De la compra al cobro, paso a paso.",
    icon: Workflow,
    modulo: "dashboard",
    contenido: `# El ciclo del negocio

Así se mueve la plata y la mercancía en Vertex, de principio a fin. Cada paso tiene su manual detallado.

## 1. Compras a tu proveedor
Creas un **pedido** (qué le compras y a qué bodega entra) y, cuando llega, lo **recibes**: el inventario sube, se recalcula el **costo promedio** y nace una **cuenta por pagar**.
→ Ver [Compras y pedidos](/manuales/compras).

## 2. Le pagas al proveedor
Registras la **factura del proveedor** y luego le **pagas**: eliges de qué cuenta sale la plata, a qué **cuenta bancaria del proveedor** va, y se aplican las **retenciones** que tengas configuradas.
→ Ver [Pagar a un proveedor](/manuales/pagar-proveedor) y [Retenciones](/manuales/retenciones).

## 3. Vendes
En **Vender** facturas en segundos: de **contado** (entra a una de tus cuentas) o a **crédito** (queda en cartera). Si el cliente lo necesita, marcas **factura electrónica**.
→ Ver [Cómo vender](/manuales/vender).

## 4. Le cobras al cliente
Las ventas a crédito quedan en **Cuentas por cobrar**. Con la **Ruta de recaudo** organizas el cobro: en el computador programas a quién cobra cada recaudador y qué día; en el celular el recaudador cobra en la calle.
→ Ver [Cobrar en ruta](/manuales/recaudo) y [Cartera](/manuales/cartera).

> Todo queda conectado: una compra alimenta el inventario y la cuenta por pagar; una venta baja el inventario y, si es a crédito, alimenta la cartera. El **Dashboard** te muestra el resumen del mes.
`,
  },
  {
    slug: "vender",
    titulo: "Cómo vender",
    descripcion: "Registra una venta en pocos toques.",
    icon: ShoppingBag,
    modulo: "facturas",
    contenido: `# Cómo vender

Vender es muy simple. Entra a **Facturas → Vender**.

1. **¿A quién le vendes?** Elige el cliente (puedes buscar por nombre).
2. **¿Cómo paga?** Toca **Contado** o **Crédito**.
3. **¿Qué vendes?** Busca el producto; el precio se completa solo (puedes ajustarlo) y escribe la cantidad.
4. Agrega más productos si necesitas con **Agregar otro producto**.
5. Revisa el **Total** y toca **Registrar venta**.

> Al registrar, el inventario baja automáticamente y, si es a **crédito**, se crea la cuenta por cobrar.

## Factura electrónica
Al elegir el cliente, si está marcado como que **requiere factura electrónica**, el interruptor **"Factura electrónica"** se enciende solo (también puedes activarlo a mano). Cuando está encendido, la venta se marca como electrónica y **se exportará para el contador** desde **Reportes → exportar F.E.** No es un envío automático a la DIAN: es la marca y el archivo para que el contador la presente.

### Notas
- Si el precio queda por debajo del costo, la factura lo marca para que lo revises.
- No puedes vender más de lo que hay en la bodega seleccionada.
`,
  },
  {
    slug: "compras",
    titulo: "Compras y pedidos",
    descripcion: "Pedidos a proveedores y recepción a inventario.",
    icon: ShoppingCart,
    modulo: "pedidos",
    contenido: `# Compras y pedidos

## Crear un pedido
1. **Pedidos → Nuevo pedido**.
2. Elige **proveedor** y **bodega destino**.
3. Agrega productos con su **unidad**, **cantidad** y **precio**.
4. (Opcional) Agrega **costos adicionales** (flete, gasolina…). Se reparten entre los productos.
5. Guarda el pedido.

## Recibir el pedido
En el detalle del pedido toca **Recibir e ingresar a inventario**:
- El inventario sube y se recalcula el **costo promedio ponderado**.
- Se genera la **cuenta por pagar** al proveedor.
`,
  },
  {
    slug: "inventario",
    titulo: "Inventario",
    descripcion: "Existencias, kardex, traslados y ajustes.",
    icon: Boxes,
    modulo: "inventario",
    contenido: `# Inventario

## Existencias
**Inventario** muestra el stock por bodega, valorizado al **costo promedio**. Toca un producto para ver su **kardex** (todos los movimientos).

## Traslados entre bodegas
1. **Traslados → Nuevo traslado**: bodega origen, destino y productos.
2. **Enviar**: descuenta de la bodega origen.
3. **Recibir**: ingresa a la bodega destino.

## Notas de inventario (ajustes)
Usa **Notas de inventario** para registrar **mermas, daños o diferencias**. El tipo define si suma o resta existencias.
`,
  },
  {
    slug: "cartera",
    titulo: "Cartera",
    descripcion: "Cuentas por cobrar/pagar, recaudos y pagos.",
    icon: Wallet,
    modulo: "cuentas_cobrar",
    contenido: `# Cartera

## Cuentas por cobrar
Se crean al **facturar a crédito**. En **Cuentas por cobrar** verás el saldo y el estado (pendiente, vencida, pagada). Toca **Recaudar** para registrar un abono del cliente.

## Cuentas por pagar
Se crean al **recibir un pedido**. En **Cuentas por pagar** toca **Pagar** para registrar un pago al proveedor.

> Los abonos no pueden superar el saldo pendiente. El historial queda en **Recaudos** y **Pagos a proveedor**.
`,
  },
  {
    slug: "productos",
    titulo: "Productos y unidades",
    descripcion: "Catálogo, categorías y presentaciones.",
    icon: Package,
    modulo: "productos",
    contenido: `# Productos y unidades

## Crear un producto
**Productos → Nuevo producto**: SKU, nombre, **unidad base** (la que se lleva en inventario) y categoría.

## Presentaciones (unidades)
Al editar un producto agrega **presentaciones** (p. ej. bulto, caja) con su **factor de conversión** (cuántas unidades base equivale 1 presentación) y su precio. El sistema sugiere el precio proporcional.

## Categorías
Organiza el catálogo con **Categorías**, que pueden ser jerárquicas (una categoría padre).
`,
  },
  {
    slug: "recaudo",
    titulo: "Cobrar en ruta",
    descripcion: "Programar el cobro (computador) y cobrar en la calle (celular).",
    icon: Route,
    modulo: "ruta_recaudo",
    contenido: `# Cobrar en ruta

La **ruta de recaudo** te ayuda a cobrarle a tus clientes a crédito de forma ordenada. Se usa de dos maneras: en el **computador** para organizar, y en el **celular** para cobrar en la calle.

## En el computador — programar la ruta
Necesitas el permiso para programar (rol Admin o superior).

1. Entra a **Ruta de recaudo** y toca **Programar ruta**.
2. Elige los **clientes** y asígnales un **recaudador** y un **día de cobro** (lunes a domingo).
3. Guarda. Desde ese momento, a cada recaudador le aparecen sus clientes el día que les toca.

> ¿Quién ve qué? Si tienes permiso de usuarios, puedes elegir de qué recaudador ver la ruta. Si eres recaudador, ves solo la tuya.

## En el celular — cobrar en la calle
El recaudador abre **Ruta de recaudo** en su celular. Arriba ve **cuánto lleva recaudado hoy**, cuántos clientes tiene con saldo y cuántos ya visitó.

En **"Hoy te toca"** aparece cada cliente como una tarjeta. En cada una puede:

- **Recaudar** — registrar el pago: **valor**, **cómo pagó** (efectivo, transferencia…) y una **referencia** si aplica. Al guardar, baja la deuda del cliente y suma a lo recaudado del día.
- **Marcar visita** — cuando no cobró: elige **"No estaba"** o **"No quiso pagar"**, puede tomar una **foto de evidencia** y dejar una **observación**. Así queda registro de que sí pasó por el cliente.

> Necesita el permiso de recaudar. El pago queda en el historial de **Recaudos** y la foto se guarda como evidencia de la visita.
`,
  },
  {
    slug: "pagar-proveedor",
    titulo: "Pagar a un proveedor",
    descripcion: "Cuentas bancarias del proveedor, factura y pago con retención.",
    icon: Banknote,
    modulo: "cuentas_pagar",
    contenido: `# Pagar a un proveedor

Cuando recibes un pedido, Vertex crea una **cuenta por pagar** al proveedor. Aquí está todo lo necesario para pagarle bien.

## 1. Guarda las cuentas bancarias del proveedor
Para no escribir el número de cuenta cada vez, guárdalo una vez:

1. Entra a **Terceros**, abre el proveedor.
2. En el panel de **Beneficiarios** toca **Agregar cuenta**.
3. Elige el **banco** (de la lista), el **tipo** y el **N° de cuenta**.
4. Por defecto la cuenta es **del mismo proveedor**. Si la cuenta está a nombre de otro (factoring o cesión), pon el **NIT y nombre del titular**.

Esas cuentas aparecerán al momento de pagar.

## 2. Registra la factura del proveedor
En **Cuentas por pagar**, sobre el documento, registra el **número de factura** del proveedor (y marca si es **electrónica**). Esto deja la compra lista para pagar y para que el contador la cruce.

## 3. Paga
En **Cuentas por pagar** toca **Pagar**:

1. Escribe el **monto** a pagar.
2. Elige **de qué cuenta sale** la plata (tus cuentas de tesorería).
3. Para proveedores con **factura electrónica**, elige la **cuenta beneficiaria** (a dónde va el dinero) — una guardada o una nueva.
4. Si tienes **retenciones** configuradas, se calculan solas sobre las compras electrónicas y verás el **neto a pagar** (monto − retención).
5. Confirma. El pago baja la cuenta por pagar y queda en **Pagos a proveedor**.

→ Para configurar retenciones, ver [Retenciones](/manuales/retenciones).
`,
  },
  {
    slug: "retenciones",
    titulo: "Retenciones",
    descripcion: "Cómo se crean y cómo se aplican al pagar.",
    icon: Percent,
    modulo: "retenciones",
    contenido: `# Retenciones

Las retenciones se descuentan del pago a un proveedor según la ley. En Vertex se configuran una vez y se aplican solas.

## Crear una retención
1. Entra a **Retenciones → Nueva**.
2. Define:
   - **Nombre** (p. ej. "Retefuente compras").
   - **Porcentaje** a retener.
   - **Base mínima** — si la compra es menor a este valor, no se retiene.
   - **Aplica a todas** — si la retención aplica a todos los proveedores/compras o no.
3. Guarda. Puedes activarla o desactivarla cuando quieras.

## Cómo se aplican
Las retenciones se calculan **automáticamente al pagar a un proveedor**, sobre las compras marcadas como **factura electrónica**, y solo cuando la base supera la **base mínima**.

- El sistema calcula la retención por documento y la resta del pago.
- Verás el **neto a pagar** = monto − retención.
- Cada retención aplicada queda registrada en el pago, para el contador.

→ Ver el flujo completo en [Pagar a un proveedor](/manuales/pagar-proveedor).
`,
  },
];

export function getManual(slug: string): Manual | null {
  return MANUALES.find((m) => m.slug === slug) ?? null;
}

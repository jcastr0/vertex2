import type { LucideIcon } from "lucide-react";
import { Rocket, ShoppingBag, ShoppingCart, Boxes, Wallet, Package } from "lucide-react";
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
];

export function getManual(slug: string): Manual | null {
  return MANUALES.find((m) => m.slug === slug) ?? null;
}

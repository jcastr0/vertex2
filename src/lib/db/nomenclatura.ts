/**
 * Catálogo maestro del sistema (vx00_nomenclatura).
 *
 * REGLA: toda tabla del sistema usa nomenclatura `vxNN_descripcion` y DEBE estar
 * registrada aquí. Al crear una tabla nueva, agrega su entrada a este catálogo
 * (la numeración continúa: la siguiente es vx33).
 */
export interface EntradaNomenclatura {
  codigo: string;
  nombreModelo: string;
  descripcion: string;
  modulo: string;
  tieneEmpresaId: boolean;
  esCatalogo: boolean;
}

export const CATALOGO: EntradaNomenclatura[] = [
  { codigo: "vx00", nombreModelo: "Nomenclatura", descripcion: "Catálogo maestro de tablas", modulo: "Sistema", tieneEmpresaId: false, esCatalogo: true },
  { codigo: "vx01", nombreModelo: "Rol", descripcion: "Roles del sistema", modulo: "Sistema", tieneEmpresaId: false, esCatalogo: true },
  { codigo: "vx02", nombreModelo: "Usuario", descripcion: "Usuarios y autenticación", modulo: "Sistema", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx03", nombreModelo: "Auditoria", descripcion: "Registro de auditoría", modulo: "Sistema", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx04", nombreModelo: "Empresa", descripcion: "Empresas / razones sociales", modulo: "Sistema", tieneEmpresaId: false, esCatalogo: false },
  { codigo: "vx05", nombreModelo: "UsuarioEmpresa", descripcion: "Asignación usuario-empresa-rol", modulo: "Sistema", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx06", nombreModelo: "Bodega", descripcion: "Bodegas / almacenes", modulo: "Maestros", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx07", nombreModelo: "Tercero", descripcion: "Proveedores y clientes", modulo: "Maestros", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx08", nombreModelo: "CategoriaProducto", descripcion: "Categorías de productos", modulo: "Maestros", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx09", nombreModelo: "UnidadMedida", descripcion: "Unidades de medida", modulo: "Maestros", tieneEmpresaId: false, esCatalogo: true },
  { codigo: "vx10", nombreModelo: "Producto", descripcion: "Catálogo de productos", modulo: "Maestros", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx11", nombreModelo: "ProductoUnidad", descripcion: "Presentaciones / conversiones", modulo: "Maestros", tieneEmpresaId: false, esCatalogo: false },
  { codigo: "vx13", nombreModelo: "Pedido", descripcion: "Pedidos a proveedores", modulo: "Compras", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx14", nombreModelo: "PedidoDetalle", descripcion: "Detalle de pedidos", modulo: "Compras", tieneEmpresaId: false, esCatalogo: false },
  { codigo: "vx15", nombreModelo: "PedidoCosto", descripcion: "Costos adicionales de pedidos", modulo: "Compras", tieneEmpresaId: false, esCatalogo: false },
  { codigo: "vx16", nombreModelo: "Inventario", descripcion: "Existencias por bodega", modulo: "Inventario", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx17", nombreModelo: "MovimientoInventario", descripcion: "Movimientos de inventario", modulo: "Inventario", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx18", nombreModelo: "NotaInventario", descripcion: "Notas / ajustes de inventario", modulo: "Inventario", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx19", nombreModelo: "TrasladoBodega", descripcion: "Traslados entre bodegas", modulo: "Inventario", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx20", nombreModelo: "TrasladoDetalle", descripcion: "Detalle de traslados", modulo: "Inventario", tieneEmpresaId: false, esCatalogo: false },
  { codigo: "vx21", nombreModelo: "Factura", descripcion: "Facturas de venta", modulo: "Ventas", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx22", nombreModelo: "FacturaDetalle", descripcion: "Detalle de facturas", modulo: "Ventas", tieneEmpresaId: false, esCatalogo: false },
  { codigo: "vx23", nombreModelo: "Devolucion", descripcion: "Devoluciones", modulo: "Ventas", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx24", nombreModelo: "DevolucionDetalle", descripcion: "Detalle de devoluciones", modulo: "Ventas", tieneEmpresaId: false, esCatalogo: false },
  { codigo: "vx25", nombreModelo: "NotaCredito", descripcion: "Notas crédito", modulo: "Ventas", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx26", nombreModelo: "CuentaPorPagar", descripcion: "Cuentas por pagar", modulo: "Cartera", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx27", nombreModelo: "PagoProveedor", descripcion: "Pagos a proveedores", modulo: "Cartera", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx28", nombreModelo: "CuentaPorCobrar", descripcion: "Cuentas por cobrar", modulo: "Cartera", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx29", nombreModelo: "RecaudoCliente", descripcion: "Recaudos de clientes", modulo: "Cartera", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx30", nombreModelo: "VisitaRecaudo", descripcion: "Visitas de ruta de recaudo", modulo: "Cartera", tieneEmpresaId: true, esCatalogo: false },
  { codigo: "vx31", nombreModelo: "Retencion", descripcion: "Retenciones parametrizables", modulo: "Cartera", tieneEmpresaId: true, esCatalogo: true },
  { codigo: "vx32", nombreModelo: "PagoRetencion", descripcion: "Retenciones aplicadas en pagos", modulo: "Cartera", tieneEmpresaId: true, esCatalogo: false },
];

/**
 * Esquema de base de datos Vertex (Supabase / Postgres) vía Drizzle ORM.
 *
 * Nomenclatura vxNN conservada del proyecto Laravel original. Cada tabla mantiene
 * su código lógico. La multitenencia se aplica en capa de servidor mediante
 * `empresa_id`; no se depende de RLS.
 *
 * Convenciones:
 *  - id: bigserial PK
 *  - dinero/cantidades: numeric(p,s) (string en JS para preservar precisión)
 *  - estados/tipos: varchar con default (validados con Zod en la app)
 *  - timestamps: created_at / updated_at
 */
import {
  pgTable,
  pgEnum,
  bigserial,
  bigint,
  varchar,
  char,
  text,
  numeric,
  integer,
  boolean,
  jsonb,
  timestamp,
  date,
  unique,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// ──────────────────────────────────────────────────────────────────────────
// Enums estables
// ──────────────────────────────────────────────────────────────────────────
export const terceroTipoEnum = pgEnum("vx_tercero_tipo", ["proveedor", "cliente", "ambos"]);
export const tipoIdentificacionEnum = pgEnum("vx_tipo_identificacion", [
  "NIT",
  "CC",
  "CE",
  "PASAPORTE",
  "OTRO",
]);
export const tipoPersonaEnum = pgEnum("vx_tipo_persona", ["natural", "juridica"]);

// Helpers de columnas reutilizables
const money = (name: string) => numeric(name, { precision: 15, scale: 2 });
const qty = (name: string) => numeric(name, { precision: 12, scale: 4 });
const price = (name: string) => numeric(name, { precision: 12, scale: 2 });

// ──────────────────────────────────────────────────────────────────────────
// vx04 — Empresas (raíz multi-tenant)
// ──────────────────────────────────────────────────────────────────────────
export const empresas = pgTable("vx04_empresas", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  nombre: varchar("nombre", { length: 150 }).notNull().unique(),
  razonSocial: varchar("razon_social", { length: 200 }).notNull(),
  nit: varchar("nit", { length: 50 }).notNull(),
  email: varchar("email", { length: 150 }).notNull(),
  telefono: varchar("telefono", { length: 30 }),
  direccion: varchar("direccion", { length: 255 }),
  ciudad: varchar("ciudad", { length: 100 }),
  pais: varchar("pais", { length: 100 }).default("Colombia"),
  logoUrl: varchar("logo_url", { length: 500 }),
  temaColor: varchar("tema_color", { length: 20 }),
  activa: boolean("activa").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────────────────────────────────────────────────────────────────────────
// vx00 — Nomenclatura del sistema
// ──────────────────────────────────────────────────────────────────────────
export const nomenclatura = pgTable("vx00_nomenclatura", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  codigo: varchar("codigo", { length: 10 }).notNull().unique(),
  nombreModelo: varchar("nombre_modelo", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  modulo: varchar("modulo", { length: 50 }),
  tieneEmpresaId: boolean("tiene_empresa_id").notNull().default(true),
  esCatalogo: boolean("es_catalogo").notNull().default(false),
  orden: integer("orden"),
  activa: boolean("activa").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────────────────────────────────────────────────────────────────────────
// vx01 — Roles (globales)
// ──────────────────────────────────────────────────────────────────────────
export const roles = pgTable("vx01_roles", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull().unique(),
  descripcion: text("descripcion"),
  permisos: jsonb("permisos").$type<string[]>(),
  activa: boolean("activa").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────────────────────────────────────────────────────────────────────────
// vx02 — Usuarios (auth custom con bloqueo por intentos)
// ──────────────────────────────────────────────────────────────────────────
export const usuarios = pgTable(
  "vx02_usuarios",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" }).references(() => empresas.id),
    nombre: varchar("nombre", { length: 150 }).notNull(),
    email: varchar("email", { length: 150 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    intentosFallidos: integer("intentos_fallidos").notNull().default(0),
    bloqueadoHasta: timestamp("bloqueado_hasta", { withTimezone: true }),
    ultimoIntentoAt: timestamp("ultimo_intento_at", { withTimezone: true }),
    ultimaIp: varchar("ultima_ip", { length: 64 }),
    ipsBloqueadas: jsonb("ips_bloqueadas").$type<string[]>(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    activo: boolean("activo").notNull().default(true),
    esSuperadmin: boolean("es_superadmin").notNull().default(false),
    ultimoLoginAt: timestamp("ultimo_login_at", { withTimezone: true }),
    ultimoLogoutAt: timestamp("ultimo_logout_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vx02_empresa_idx").on(t.empresaId),
    index("vx02_bloqueado_idx").on(t.bloqueadoHasta),
  ],
);

// ──────────────────────────────────────────────────────────────────────────
// vx05 — Usuario ↔ Empresa ↔ Rol
// ──────────────────────────────────────────────────────────────────────────
export const usuariosEmpresas = pgTable(
  "vx05_usuarios_empresas",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    usuarioId: bigint("usuario_id", { mode: "number" })
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    empresaId: bigint("empresa_id", { mode: "number" }).references(() => empresas.id, {
      onDelete: "cascade",
    }),
    rolId: bigint("rol_id", { mode: "number" })
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    activo: boolean("activo").notNull().default(true),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx05_usuario_empresa_uq").on(t.usuarioId, t.empresaId),
    index("vx05_empresa_idx").on(t.empresaId),
    index("vx05_rol_idx").on(t.rolId),
  ],
);

// ──────────────────────────────────────────────────────────────────────────
// vx03 — Auditoría
// ──────────────────────────────────────────────────────────────────────────
export const auditoria = pgTable(
  "vx03_auditoria",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" }).references(() => empresas.id),
    usuarioId: bigint("usuario_id", { mode: "number" }).references(() => usuarios.id),
    tablaAfectada: varchar("tabla_afectada", { length: 100 }).notNull(),
    modelId: bigint("model_id", { mode: "number" }),
    modelType: varchar("model_type", { length: 100 }),
    accion: varchar("accion", { length: 20 }).notNull(), // CREAR | ACTUALIZAR | ELIMINAR
    registroAnterior: jsonb("registro_anterior"),
    registroNuevo: jsonb("registro_nuevo"),
    ipOrigen: varchar("ip_origen", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vx03_empresa_idx").on(t.empresaId),
    index("vx03_usuario_idx").on(t.usuarioId),
    index("vx03_tabla_model_idx").on(t.tablaAfectada, t.modelId),
    index("vx03_created_idx").on(t.createdAt),
  ],
);

// ──────────────────────────────────────────────────────────────────────────
// vx06 — Bodegas
// ──────────────────────────────────────────────────────────────────────────
export const bodegas = pgTable(
  "vx06_bodegas",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    codigo: varchar("codigo", { length: 20 }).notNull(),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    direccion: text("direccion"),
    responsable: varchar("responsable", { length: 100 }),
    telefono: varchar("telefono", { length: 20 }),
    esPrincipal: boolean("es_principal").notNull().default(false),
    activo: boolean("activo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx06_empresa_codigo_uq").on(t.empresaId, t.codigo),
    index("vx06_empresa_activo_idx").on(t.empresaId, t.activo),
  ],
);

// ──────────────────────────────────────────────────────────────────────────
// vx07 — Terceros (proveedores / clientes)
// ──────────────────────────────────────────────────────────────────────────
export const terceros = pgTable(
  "vx07_terceros",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    tipo: terceroTipoEnum("tipo").notNull(),
    codigo: varchar("codigo", { length: 50 }).notNull(),
    razonSocial: varchar("razon_social", { length: 200 }).notNull(),
    nombreComercial: varchar("nombre_comercial", { length: 200 }),
    tipoIdentificacion: tipoIdentificacionEnum("tipo_identificacion").notNull().default("NIT"),
    identificacion: varchar("identificacion", { length: 50 }).notNull(),
    digitoVerificacion: char("digito_verificacion", { length: 1 }),
    tipoPersona: tipoPersonaEnum("tipo_persona").notNull().default("juridica"),
    email: varchar("email", { length: 100 }),
    telefono: varchar("telefono", { length: 20 }),
    celular: varchar("celular", { length: 20 }),
    direccion: text("direccion"),
    ciudad: varchar("ciudad", { length: 100 }),
    departamento: varchar("departamento", { length: 100 }),
    pais: varchar("pais", { length: 100 }).default("Colombia"),
    contactoNombre: varchar("contacto_nombre", { length: 150 }),
    contactoCargo: varchar("contacto_cargo", { length: 100 }),
    contactoTelefono: varchar("contacto_telefono", { length: 20 }),
    contactoEmail: varchar("contacto_email", { length: 100 }),
    condicionesPago: varchar("condiciones_pago", { length: 100 }),
    diasCreditoProveedor: integer("dias_credito_proveedor").notNull().default(0),
    cupoCredito: money("cupo_credito").notNull().default("0"),
    diasCreditoCliente: integer("dias_credito_cliente").notNull().default(0),
    requiereFacturaElectronica: boolean("requiere_factura_electronica").notNull().default(false),
    observaciones: text("observaciones"),
    activo: boolean("activo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx07_empresa_codigo_uq").on(t.empresaId, t.codigo),
    unique("vx07_empresa_ident_uq").on(t.empresaId, t.identificacion),
    index("vx07_empresa_tipo_idx").on(t.empresaId, t.tipo),
    index("vx07_razon_idx").on(t.razonSocial),
  ],
);

// ──────────────────────────────────────────────────────────────────────────
// vx08 — Categorías de productos (jerárquica)
// ──────────────────────────────────────────────────────────────────────────
export const categoriasProductos = pgTable(
  "vx08_categorias_productos",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    descripcion: text("descripcion"),
    padreId: bigint("padre_id", { mode: "number" }).references(
      (): AnyPgColumn => categoriasProductos.id,
    ),
    activo: boolean("activo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vx08_empresa_idx").on(t.empresaId),
    index("vx08_padre_idx").on(t.padreId),
  ],
);

// ──────────────────────────────────────────────────────────────────────────
// vx09 — Unidades de medida (catálogo global)
// ──────────────────────────────────────────────────────────────────────────
export const unidadesMedida = pgTable("vx09_unidades_medida", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  nombre: varchar("nombre", { length: 50 }).notNull(),
  abreviatura: varchar("abreviatura", { length: 10 }).notNull(),
  tipo: varchar("tipo", { length: 20 }),
  descripcion: text("descripcion"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────────────────────────────────────────────────────────────────────────
// vx10 — Productos
// ──────────────────────────────────────────────────────────────────────────
export const productos = pgTable(
  "vx10_productos",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    sku: varchar("sku", { length: 50 }).notNull(),
    nombre: varchar("nombre", { length: 200 }).notNull(),
    descripcion: text("descripcion"),
    categoriaId: bigint("categoria_id", { mode: "number" }).references(
      () => categoriasProductos.id,
      { onDelete: "set null" },
    ),
    unidadBaseId: bigint("unidad_base_id", { mode: "number" })
      .notNull()
      .references(() => unidadesMedida.id),
    precioCompraSugerido: price("precio_compra_sugerido"),
    stockMinimo: qty("stock_minimo").notNull().default("0"),
    stockMaximo: qty("stock_maximo"),
    clasificacionAbc: char("clasificacion_abc", { length: 1 }),
    imagenUrl: varchar("imagen_url", { length: 500 }),
    activo: boolean("activo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx10_empresa_sku_uq").on(t.empresaId, t.sku),
    index("vx10_empresa_cat_idx").on(t.empresaId, t.categoriaId),
    index("vx10_nombre_idx").on(t.nombre),
  ],
);

// ──────────────────────────────────────────────────────────────────────────
// vx11 — Producto · unidades (conversiones / precios)
// ──────────────────────────────────────────────────────────────────────────
export const productoUnidades = pgTable(
  "vx11_producto_unidades",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    productoId: bigint("producto_id", { mode: "number" })
      .notNull()
      .references(() => productos.id, { onDelete: "cascade" }),
    unidadId: bigint("unidad_id", { mode: "number" })
      .notNull()
      .references(() => unidadesMedida.id),
    factorConversion: numeric("factor_conversion", { precision: 12, scale: 6 }).notNull(),
    precioVenta: price("precio_venta"),
    esPrecioCalculado: boolean("es_precio_calculado").notNull().default(true),
    permiteCompra: boolean("permite_compra").notNull().default(true),
    permiteVenta: boolean("permite_venta").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx11_producto_unidad_uq").on(t.productoId, t.unidadId),
    index("vx11_producto_idx").on(t.productoId),
  ],
);

// ──────────────────────────────────────────────────────────────────────────
// vx13 — Pedidos a proveedores
// ──────────────────────────────────────────────────────────────────────────
export const pedidos = pgTable(
  "vx13_pedidos",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    proveedorId: bigint("proveedor_id", { mode: "number" })
      .notNull()
      .references(() => terceros.id),
    bodegaId: bigint("bodega_id", { mode: "number" })
      .notNull()
      .references(() => bodegas.id),
    numero: varchar("numero", { length: 20 }).notNull(),
    fecha: date("fecha").notNull(),
    estado: varchar("estado", { length: 20 }).notNull().default("borrador"),
    subtotal: money("subtotal").notNull().default("0"),
    costosAdicionales: money("costos_adicionales").notNull().default("0"),
    total: money("total").notNull().default("0"),
    observaciones: text("observaciones"),
    usuarioCreaId: bigint("usuario_crea_id", { mode: "number" })
      .notNull()
      .references(() => usuarios.id),
    usuarioRecibeId: bigint("usuario_recibe_id", { mode: "number" }).references(() => usuarios.id),
    fechaRecepcion: timestamp("fecha_recepcion", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx13_empresa_numero_uq").on(t.empresaId, t.numero),
    index("vx13_proveedor_idx").on(t.proveedorId),
    index("vx13_empresa_estado_idx").on(t.empresaId, t.estado),
  ],
);

// vx14 — Detalle de pedidos
export const pedidoDetalles = pgTable(
  "vx14_pedido_detalles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    pedidoId: bigint("pedido_id", { mode: "number" })
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    productoId: bigint("producto_id", { mode: "number" })
      .notNull()
      .references(() => productos.id),
    unidadId: bigint("unidad_id", { mode: "number" })
      .notNull()
      .references(() => unidadesMedida.id),
    cantidad: qty("cantidad").notNull(),
    precioUnitario: price("precio_unitario").notNull(),
    subtotal: money("subtotal").notNull(),
    cantidadRecibida: qty("cantidad_recibida").notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vx14_pedido_idx").on(t.pedidoId), index("vx14_producto_idx").on(t.productoId)],
);

// vx15 — Costos adicionales de pedidos
export const pedidoCostos = pgTable(
  "vx15_pedido_costos",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    pedidoId: bigint("pedido_id", { mode: "number" })
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    tipo: varchar("tipo", { length: 50 }).notNull(),
    descripcion: varchar("descripcion", { length: 200 }),
    valor: money("valor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vx15_pedido_idx").on(t.pedidoId)],
);

// ──────────────────────────────────────────────────────────────────────────
// vx16 — Inventario (stock por bodega/producto con costo promedio)
// ──────────────────────────────────────────────────────────────────────────
export const inventario = pgTable(
  "vx16_inventario",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    bodegaId: bigint("bodega_id", { mode: "number" })
      .notNull()
      .references(() => bodegas.id),
    productoId: bigint("producto_id", { mode: "number" })
      .notNull()
      .references(() => productos.id),
    cantidadActual: qty("cantidad_actual").notNull().default("0"),
    costoPromedio: price("costo_promedio").notNull().default("0"),
    valorTotal: money("valor_total").notNull().default("0"),
    ultimaActualizacion: timestamp("ultima_actualizacion", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx16_empresa_bodega_producto_uq").on(t.empresaId, t.bodegaId, t.productoId),
    index("vx16_empresa_bodega_idx").on(t.empresaId, t.bodegaId),
    index("vx16_producto_idx").on(t.productoId),
  ],
);

// vx17 — Movimientos de inventario
export const movimientosInventario = pgTable(
  "vx17_movimientos_inventario",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    bodegaId: bigint("bodega_id", { mode: "number" })
      .notNull()
      .references(() => bodegas.id),
    productoId: bigint("producto_id", { mode: "number" })
      .notNull()
      .references(() => productos.id),
    pedidoId: bigint("pedido_id", { mode: "number" }).references(() => pedidos.id),
    facturaId: bigint("factura_id", { mode: "number" }).references((): AnyPgColumn => facturas.id),
    trasladoId: bigint("traslado_id", { mode: "number" }).references(
      (): AnyPgColumn => trasladosBodega.id,
    ),
    tipo: varchar("tipo", { length: 50 }).notNull(),
    cantidad: qty("cantidad").notNull(),
    costoUnitario: price("costo_unitario"),
    referencia: varchar("referencia", { length: 100 }),
    observaciones: text("observaciones"),
    usuarioId: bigint("usuario_id", { mode: "number" })
      .notNull()
      .references(() => usuarios.id),
    fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vx17_ebpf_idx").on(t.empresaId, t.bodegaId, t.productoId, t.fecha),
    index("vx17_empresa_fecha_idx").on(t.empresaId, t.fecha),
    index("vx17_pedido_idx").on(t.pedidoId),
    index("vx17_factura_idx").on(t.facturaId),
  ],
);

// vx18 — Notas de inventario (ajustes)
export const notasInventario = pgTable(
  "vx18_notas_inventario",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    bodegaId: bigint("bodega_id", { mode: "number" })
      .notNull()
      .references(() => bodegas.id),
    productoId: bigint("producto_id", { mode: "number" })
      .notNull()
      .references(() => productos.id),
    pedidoId: bigint("pedido_id", { mode: "number" }).references(() => pedidos.id),
    proveedorId: bigint("proveedor_id", { mode: "number" }).references(() => terceros.id),
    numero: varchar("numero", { length: 20 }).notNull(),
    tipo: varchar("tipo", { length: 50 }).notNull(),
    cantidad: qty("cantidad").notNull(),
    motivo: text("motivo").notNull(),
    adjuntos: jsonb("adjuntos").$type<string[]>(),
    usuarioId: bigint("usuario_id", { mode: "number" })
      .notNull()
      .references(() => usuarios.id),
    fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx18_empresa_numero_uq").on(t.empresaId, t.numero),
    index("vx18_empresa_bodega_fecha_idx").on(t.empresaId, t.bodegaId, t.fecha),
  ],
);

// vx19 — Traslados entre bodegas
export const trasladosBodega = pgTable(
  "vx19_traslados_bodega",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    numero: varchar("numero", { length: 20 }).notNull(),
    bodegaOrigenId: bigint("bodega_origen_id", { mode: "number" })
      .notNull()
      .references(() => bodegas.id),
    bodegaDestinoId: bigint("bodega_destino_id", { mode: "number" })
      .notNull()
      .references(() => bodegas.id),
    fechaCreacion: timestamp("fecha_creacion", { withTimezone: true }).notNull().defaultNow(),
    fechaEnvio: timestamp("fecha_envio", { withTimezone: true }),
    fechaRecepcion: timestamp("fecha_recepcion", { withTimezone: true }),
    estado: varchar("estado", { length: 20 }).notNull().default("pendiente"),
    observaciones: text("observaciones"),
    usuarioCreaId: bigint("usuario_crea_id", { mode: "number" })
      .notNull()
      .references(() => usuarios.id),
    usuarioEnviaId: bigint("usuario_envia_id", { mode: "number" }).references(() => usuarios.id),
    usuarioRecibeId: bigint("usuario_recibe_id", { mode: "number" }).references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx19_empresa_numero_uq").on(t.empresaId, t.numero),
    index("vx19_empresa_estado_idx").on(t.empresaId, t.estado),
  ],
);

// vx20 — Detalle de traslados
export const trasladoDetalles = pgTable(
  "vx20_traslado_detalles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    trasladoId: bigint("traslado_id", { mode: "number" })
      .notNull()
      .references(() => trasladosBodega.id, { onDelete: "cascade" }),
    productoId: bigint("producto_id", { mode: "number" })
      .notNull()
      .references(() => productos.id),
    cantidad: qty("cantidad").notNull(),
    costoUnitario: price("costo_unitario").notNull(),
    cantidadRecibida: qty("cantidad_recibida").notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vx20_traslado_idx").on(t.trasladoId)],
);

// ──────────────────────────────────────────────────────────────────────────
// vx21 — Facturas de venta
// ──────────────────────────────────────────────────────────────────────────
export const facturas = pgTable(
  "vx21_facturas",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    bodegaId: bigint("bodega_id", { mode: "number" })
      .notNull()
      .references(() => bodegas.id),
    clienteId: bigint("cliente_id", { mode: "number" })
      .notNull()
      .references(() => terceros.id),
    numero: varchar("numero", { length: 20 }).notNull(),
    fecha: date("fecha").notNull(),
    tipoVenta: varchar("tipo_venta", { length: 20 }).notNull().default("contado"),
    subtotal: money("subtotal").notNull().default("0"),
    impuestos: money("impuestos").notNull().default("0"),
    total: money("total").notNull().default("0"),
    estado: varchar("estado", { length: 20 }).notNull().default("borrador"),
    esElectronica: boolean("es_electronica").notNull().default(false),
    observaciones: text("observaciones"),
    usuarioId: bigint("usuario_id", { mode: "number" })
      .notNull()
      .references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx21_empresa_numero_uq").on(t.empresaId, t.numero),
    index("vx21_cliente_idx").on(t.clienteId),
    index("vx21_empresa_estado_idx").on(t.empresaId, t.estado),
  ],
);

// vx22 — Detalle de facturas
export const facturaDetalles = pgTable(
  "vx22_factura_detalles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    facturaId: bigint("factura_id", { mode: "number" })
      .notNull()
      .references(() => facturas.id, { onDelete: "cascade" }),
    productoId: bigint("producto_id", { mode: "number" })
      .notNull()
      .references(() => productos.id),
    unidadId: bigint("unidad_id", { mode: "number" })
      .notNull()
      .references(() => unidadesMedida.id),
    cantidad: qty("cantidad").notNull(),
    cantidadBase: qty("cantidad_base").notNull(),
    precioUnitario: price("precio_unitario").notNull(),
    costoUnitario: price("costo_unitario").notNull(),
    subtotal: money("subtotal").notNull(),
    esPrecioBajoCosto: boolean("es_precio_bajo_costo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vx22_factura_idx").on(t.facturaId), index("vx22_producto_idx").on(t.productoId)],
);

// vx23 — Devoluciones (clientes / proveedores)
export const devoluciones = pgTable(
  "vx23_devoluciones",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    bodegaId: bigint("bodega_id", { mode: "number" })
      .notNull()
      .references(() => bodegas.id),
    tipo: varchar("tipo", { length: 20 }).notNull(), // cliente | proveedor
    clienteId: bigint("cliente_id", { mode: "number" }).references(() => terceros.id),
    facturaId: bigint("factura_id", { mode: "number" }).references(() => facturas.id),
    pedidoId: bigint("pedido_id", { mode: "number" }).references(() => pedidos.id),
    numero: varchar("numero", { length: 20 }).notNull(),
    fecha: date("fecha").notNull(),
    motivo: text("motivo").notNull(),
    total: money("total").notNull().default("0"),
    estado: varchar("estado", { length: 20 }).notNull().default("pendiente"),
    usuarioId: bigint("usuario_id", { mode: "number" })
      .notNull()
      .references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx23_empresa_numero_uq").on(t.empresaId, t.numero),
    index("vx23_empresa_tipo_idx").on(t.empresaId, t.tipo),
    index("vx23_factura_idx").on(t.facturaId),
  ],
);

// vx24 — Detalle de devoluciones
export const devolucionDetalles = pgTable(
  "vx24_devolucion_detalles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    devolucionId: bigint("devolucion_id", { mode: "number" })
      .notNull()
      .references(() => devoluciones.id, { onDelete: "cascade" }),
    productoId: bigint("producto_id", { mode: "number" })
      .notNull()
      .references(() => productos.id),
    cantidad: qty("cantidad").notNull(),
    precioUnitario: price("precio_unitario").notNull(),
    subtotal: money("subtotal").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vx24_devolucion_idx").on(t.devolucionId)],
);

// vx25 — Notas crédito
export const notasCredito = pgTable(
  "vx25_notas_credito",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    clienteId: bigint("cliente_id", { mode: "number" })
      .notNull()
      .references(() => terceros.id),
    facturaId: bigint("factura_id", { mode: "number" }).references(() => facturas.id),
    devolucionId: bigint("devolucion_id", { mode: "number" }).references(() => devoluciones.id),
    numero: varchar("numero", { length: 20 }).notNull(),
    fecha: date("fecha").notNull(),
    motivo: text("motivo").notNull(),
    valor: money("valor").notNull(),
    usuarioId: bigint("usuario_id", { mode: "number" })
      .notNull()
      .references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx25_empresa_numero_uq").on(t.empresaId, t.numero),
    index("vx25_cliente_idx").on(t.clienteId),
    index("vx25_factura_idx").on(t.facturaId),
  ],
);

// vx26 — Cuentas por pagar
export const cuentasPorPagar = pgTable(
  "vx26_cuentas_por_pagar",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    proveedorId: bigint("proveedor_id", { mode: "number" })
      .notNull()
      .references(() => terceros.id),
    pedidoId: bigint("pedido_id", { mode: "number" }).references(() => pedidos.id),
    numeroFactura: varchar("numero_factura", { length: 50 }).notNull(),
    fechaFactura: date("fecha_factura").notNull(),
    fechaVencimiento: date("fecha_vencimiento").notNull(),
    valorTotal: money("valor_total").notNull(),
    saldoPendiente: money("saldo_pendiente").notNull(),
    esSaldoInicial: boolean("es_saldo_inicial").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vx26_empresa_proveedor_idx").on(t.empresaId, t.proveedorId),
    index("vx26_venc_saldo_idx").on(t.fechaVencimiento, t.saldoPendiente),
  ],
);

// vx27 — Pagos a proveedores
export const pagosProveedor = pgTable(
  "vx27_pagos_proveedor",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    proveedorId: bigint("proveedor_id", { mode: "number" })
      .notNull()
      .references(() => terceros.id),
    cuentaPorPagarId: bigint("cuenta_por_pagar_id", { mode: "number" })
      .notNull()
      .references(() => cuentasPorPagar.id),
    numero: varchar("numero", { length: 20 }).notNull(),
    fecha: date("fecha").notNull(),
    valor: money("valor").notNull(),
    metodoPago: varchar("metodo_pago", { length: 30 }).notNull(),
    referencia: varchar("referencia", { length: 100 }),
    observaciones: text("observaciones"),
    estado: varchar("estado", { length: 20 }).notNull().default("activo"),
    usuarioId: bigint("usuario_id", { mode: "number" })
      .notNull()
      .references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx27_empresa_numero_uq").on(t.empresaId, t.numero),
    index("vx27_empresa_proveedor_idx").on(t.empresaId, t.proveedorId),
    index("vx27_cxp_idx").on(t.cuentaPorPagarId),
  ],
);

// vx28 — Cuentas por cobrar
export const cuentasPorCobrar = pgTable(
  "vx28_cuentas_por_cobrar",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    clienteId: bigint("cliente_id", { mode: "number" })
      .notNull()
      .references(() => terceros.id),
    facturaId: bigint("factura_id", { mode: "number" })
      .notNull()
      .references(() => facturas.id),
    fechaFactura: date("fecha_factura").notNull(),
    fechaVencimiento: date("fecha_vencimiento").notNull(),
    valorTotal: money("valor_total").notNull(),
    saldoPendiente: money("saldo_pendiente").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vx28_empresa_cliente_idx").on(t.empresaId, t.clienteId),
    index("vx28_cliente_saldo_idx").on(t.clienteId, t.saldoPendiente),
    index("vx28_factura_idx").on(t.facturaId),
  ],
);

// vx29 — Recaudos de clientes
export const recaudosClientes = pgTable(
  "vx29_recaudos_clientes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: bigint("empresa_id", { mode: "number" })
      .notNull()
      .references(() => empresas.id),
    clienteId: bigint("cliente_id", { mode: "number" })
      .notNull()
      .references(() => terceros.id),
    cuentaPorCobrarId: bigint("cuenta_por_cobrar_id", { mode: "number" })
      .notNull()
      .references(() => cuentasPorCobrar.id),
    numero: varchar("numero", { length: 20 }).notNull(),
    fecha: date("fecha").notNull(),
    valor: money("valor").notNull(),
    metodoPago: varchar("metodo_pago", { length: 30 }).notNull(),
    referencia: varchar("referencia", { length: 100 }),
    observaciones: text("observaciones"),
    estado: varchar("estado", { length: 20 }).notNull().default("activo"),
    usuarioId: bigint("usuario_id", { mode: "number" })
      .notNull()
      .references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("vx29_empresa_numero_uq").on(t.empresaId, t.numero),
    index("vx29_empresa_cliente_idx").on(t.empresaId, t.clienteId),
    index("vx29_cxc_idx").on(t.cuentaPorCobrarId),
  ],
);

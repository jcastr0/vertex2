CREATE TYPE "public"."vx_tercero_tipo" AS ENUM('proveedor', 'cliente', 'ambos');--> statement-breakpoint
CREATE TYPE "public"."vx_tipo_identificacion" AS ENUM('NIT', 'CC', 'CE', 'PASAPORTE', 'OTRO');--> statement-breakpoint
CREATE TYPE "public"."vx_tipo_persona" AS ENUM('natural', 'juridica');--> statement-breakpoint
CREATE TABLE "vx03_auditoria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint,
	"usuario_id" bigint,
	"tabla_afectada" varchar(100) NOT NULL,
	"model_id" bigint,
	"model_type" varchar(100),
	"accion" varchar(20) NOT NULL,
	"registro_anterior" jsonb,
	"registro_nuevo" jsonb,
	"ip_origen" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx06_bodegas" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"direccion" text,
	"responsable" varchar(100),
	"telefono" varchar(20),
	"es_principal" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx06_empresa_codigo_uq" UNIQUE("empresa_id","codigo")
);
--> statement-breakpoint
CREATE TABLE "vx08_categorias_productos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"padre_id" bigint,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx28_cuentas_por_cobrar" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"cliente_id" bigint NOT NULL,
	"factura_id" bigint NOT NULL,
	"fecha_factura" date NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"valor_total" numeric(15, 2) NOT NULL,
	"saldo_pendiente" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx26_cuentas_por_pagar" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"proveedor_id" bigint NOT NULL,
	"pedido_id" bigint,
	"numero_factura" varchar(50) NOT NULL,
	"fecha_factura" date NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"valor_total" numeric(15, 2) NOT NULL,
	"saldo_pendiente" numeric(15, 2) NOT NULL,
	"es_saldo_inicial" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx24_devolucion_detalles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"devolucion_id" bigint NOT NULL,
	"producto_id" bigint NOT NULL,
	"cantidad" numeric(12, 4) NOT NULL,
	"precio_unitario" numeric(12, 2) NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx23_devoluciones" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"bodega_id" bigint NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"factura_id" bigint,
	"pedido_id" bigint,
	"numero" varchar(20) NOT NULL,
	"fecha" date NOT NULL,
	"motivo" text NOT NULL,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"usuario_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx23_empresa_numero_uq" UNIQUE("empresa_id","numero")
);
--> statement-breakpoint
CREATE TABLE "vx04_empresas" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"razon_social" varchar(200) NOT NULL,
	"nit" varchar(50) NOT NULL,
	"email" varchar(150) NOT NULL,
	"telefono" varchar(30),
	"direccion" varchar(255),
	"ciudad" varchar(100),
	"pais" varchar(100) DEFAULT 'Colombia',
	"logo_url" varchar(500),
	"tema_color" varchar(20),
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx04_empresas_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "vx22_factura_detalles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"factura_id" bigint NOT NULL,
	"producto_id" bigint NOT NULL,
	"unidad_id" bigint NOT NULL,
	"cantidad" numeric(12, 4) NOT NULL,
	"cantidad_base" numeric(12, 4) NOT NULL,
	"precio_unitario" numeric(12, 2) NOT NULL,
	"costo_unitario" numeric(12, 2) NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"es_precio_bajo_costo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx21_facturas" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"bodega_id" bigint NOT NULL,
	"cliente_id" bigint NOT NULL,
	"numero" varchar(20) NOT NULL,
	"fecha" date NOT NULL,
	"tipo_venta" varchar(20) DEFAULT 'contado' NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"impuestos" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"estado" varchar(20) DEFAULT 'borrador' NOT NULL,
	"es_electronica" boolean DEFAULT false NOT NULL,
	"observaciones" text,
	"usuario_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx21_empresa_numero_uq" UNIQUE("empresa_id","numero")
);
--> statement-breakpoint
CREATE TABLE "vx16_inventario" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"bodega_id" bigint NOT NULL,
	"producto_id" bigint NOT NULL,
	"cantidad_actual" numeric(12, 4) DEFAULT '0' NOT NULL,
	"costo_promedio" numeric(12, 2) DEFAULT '0' NOT NULL,
	"valor_total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"ultima_actualizacion" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx16_empresa_bodega_producto_uq" UNIQUE("empresa_id","bodega_id","producto_id")
);
--> statement-breakpoint
CREATE TABLE "vx17_movimientos_inventario" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"bodega_id" bigint NOT NULL,
	"producto_id" bigint NOT NULL,
	"pedido_id" bigint,
	"factura_id" bigint,
	"traslado_id" bigint,
	"tipo" varchar(50) NOT NULL,
	"cantidad" numeric(12, 4) NOT NULL,
	"costo_unitario" numeric(12, 2),
	"referencia" varchar(100),
	"observaciones" text,
	"usuario_id" bigint NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx00_nomenclatura" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"codigo" varchar(10) NOT NULL,
	"nombre_modelo" varchar(100) NOT NULL,
	"descripcion" text,
	"modulo" varchar(50),
	"tiene_empresa_id" boolean DEFAULT true NOT NULL,
	"es_catalogo" boolean DEFAULT false NOT NULL,
	"orden" integer,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx00_nomenclatura_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "vx25_notas_credito" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"cliente_id" bigint NOT NULL,
	"factura_id" bigint,
	"devolucion_id" bigint,
	"numero" varchar(20) NOT NULL,
	"fecha" date NOT NULL,
	"motivo" text NOT NULL,
	"valor" numeric(15, 2) NOT NULL,
	"usuario_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx25_empresa_numero_uq" UNIQUE("empresa_id","numero")
);
--> statement-breakpoint
CREATE TABLE "vx18_notas_inventario" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"bodega_id" bigint NOT NULL,
	"producto_id" bigint NOT NULL,
	"pedido_id" bigint,
	"proveedor_id" bigint,
	"numero" varchar(20) NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"cantidad" numeric(12, 4) NOT NULL,
	"motivo" text NOT NULL,
	"adjuntos" jsonb,
	"usuario_id" bigint NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx18_empresa_numero_uq" UNIQUE("empresa_id","numero")
);
--> statement-breakpoint
CREATE TABLE "vx27_pagos_proveedor" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"proveedor_id" bigint NOT NULL,
	"cuenta_por_pagar_id" bigint NOT NULL,
	"numero" varchar(20) NOT NULL,
	"fecha" date NOT NULL,
	"valor" numeric(15, 2) NOT NULL,
	"metodo_pago" varchar(30) NOT NULL,
	"referencia" varchar(100),
	"observaciones" text,
	"estado" varchar(20) DEFAULT 'activo' NOT NULL,
	"usuario_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx27_empresa_numero_uq" UNIQUE("empresa_id","numero")
);
--> statement-breakpoint
CREATE TABLE "vx15_pedido_costos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"pedido_id" bigint NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"descripcion" varchar(200),
	"valor" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx14_pedido_detalles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"pedido_id" bigint NOT NULL,
	"producto_id" bigint NOT NULL,
	"unidad_id" bigint NOT NULL,
	"cantidad" numeric(12, 4) NOT NULL,
	"precio_unitario" numeric(12, 2) NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"cantidad_recibida" numeric(12, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx13_pedidos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"proveedor_id" bigint NOT NULL,
	"numero" varchar(20) NOT NULL,
	"fecha" date NOT NULL,
	"estado" varchar(20) DEFAULT 'borrador' NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"costos_adicionales" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"observaciones" text,
	"usuario_crea_id" bigint NOT NULL,
	"usuario_recibe_id" bigint,
	"fecha_recepcion" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx13_empresa_numero_uq" UNIQUE("empresa_id","numero")
);
--> statement-breakpoint
CREATE TABLE "vx11_producto_unidades" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"producto_id" bigint NOT NULL,
	"unidad_id" bigint NOT NULL,
	"factor_conversion" numeric(12, 6) NOT NULL,
	"precio_venta" numeric(12, 2),
	"es_precio_calculado" boolean DEFAULT true NOT NULL,
	"permite_compra" boolean DEFAULT true NOT NULL,
	"permite_venta" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx11_producto_unidad_uq" UNIQUE("producto_id","unidad_id")
);
--> statement-breakpoint
CREATE TABLE "vx10_productos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"sku" varchar(50) NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"descripcion" text,
	"categoria_id" bigint,
	"unidad_base_id" bigint NOT NULL,
	"precio_compra_sugerido" numeric(12, 2),
	"stock_minimo" numeric(12, 4) DEFAULT '0' NOT NULL,
	"stock_maximo" numeric(12, 4),
	"clasificacion_abc" char(1),
	"imagen_url" varchar(500),
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx10_empresa_sku_uq" UNIQUE("empresa_id","sku")
);
--> statement-breakpoint
CREATE TABLE "vx29_recaudos_clientes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"cliente_id" bigint NOT NULL,
	"cuenta_por_cobrar_id" bigint NOT NULL,
	"numero" varchar(20) NOT NULL,
	"fecha" date NOT NULL,
	"valor" numeric(15, 2) NOT NULL,
	"metodo_pago" varchar(30) NOT NULL,
	"referencia" varchar(100),
	"observaciones" text,
	"estado" varchar(20) DEFAULT 'activo' NOT NULL,
	"usuario_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx29_empresa_numero_uq" UNIQUE("empresa_id","numero")
);
--> statement-breakpoint
CREATE TABLE "vx01_roles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"descripcion" text,
	"permisos" jsonb,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx01_roles_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "vx07_terceros" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"tipo" "vx_tercero_tipo" NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"razon_social" varchar(200) NOT NULL,
	"nombre_comercial" varchar(200),
	"tipo_identificacion" "vx_tipo_identificacion" DEFAULT 'NIT' NOT NULL,
	"identificacion" varchar(50) NOT NULL,
	"digito_verificacion" char(1),
	"tipo_persona" "vx_tipo_persona" DEFAULT 'juridica' NOT NULL,
	"email" varchar(100),
	"telefono" varchar(20),
	"celular" varchar(20),
	"direccion" text,
	"ciudad" varchar(100),
	"departamento" varchar(100),
	"pais" varchar(100) DEFAULT 'Colombia',
	"contacto_nombre" varchar(150),
	"contacto_cargo" varchar(100),
	"contacto_telefono" varchar(20),
	"contacto_email" varchar(100),
	"condiciones_pago" varchar(100),
	"dias_credito_proveedor" integer DEFAULT 0 NOT NULL,
	"cupo_credito" numeric(15, 2) DEFAULT '0' NOT NULL,
	"dias_credito_cliente" integer DEFAULT 0 NOT NULL,
	"requiere_factura_electronica" boolean DEFAULT false NOT NULL,
	"observaciones" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx07_empresa_codigo_uq" UNIQUE("empresa_id","codigo"),
	CONSTRAINT "vx07_empresa_ident_uq" UNIQUE("empresa_id","identificacion")
);
--> statement-breakpoint
CREATE TABLE "vx20_traslado_detalles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"traslado_id" bigint NOT NULL,
	"producto_id" bigint NOT NULL,
	"cantidad" numeric(12, 4) NOT NULL,
	"costo_unitario" numeric(12, 2) NOT NULL,
	"cantidad_recibida" numeric(12, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx19_traslados_bodega" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"numero" varchar(20) NOT NULL,
	"bodega_origen_id" bigint NOT NULL,
	"bodega_destino_id" bigint NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_envio" timestamp with time zone,
	"fecha_recepcion" timestamp with time zone,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"observaciones" text,
	"usuario_crea_id" bigint NOT NULL,
	"usuario_envia_id" bigint,
	"usuario_recibe_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx19_empresa_numero_uq" UNIQUE("empresa_id","numero")
);
--> statement-breakpoint
CREATE TABLE "vx09_unidades_medida" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"abreviatura" varchar(10) NOT NULL,
	"tipo" varchar(20),
	"descripcion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx09_unidades_medida_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "vx02_usuarios" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint,
	"nombre" varchar(150) NOT NULL,
	"email" varchar(150) NOT NULL,
	"password" varchar(255) NOT NULL,
	"intentos_fallidos" integer DEFAULT 0 NOT NULL,
	"bloqueado_hasta" timestamp with time zone,
	"ultimo_intento_at" timestamp with time zone,
	"ultima_ip" varchar(64),
	"ips_bloqueadas" jsonb,
	"email_verified_at" timestamp with time zone,
	"activo" boolean DEFAULT true NOT NULL,
	"es_superadmin" boolean DEFAULT false NOT NULL,
	"ultimo_login_at" timestamp with time zone,
	"ultimo_logout_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx02_usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vx05_usuarios_empresas" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"usuario_id" bigint NOT NULL,
	"empresa_id" bigint,
	"rol_id" bigint NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx05_usuario_empresa_uq" UNIQUE("usuario_id","empresa_id")
);
--> statement-breakpoint
ALTER TABLE "vx03_auditoria" ADD CONSTRAINT "vx03_auditoria_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx03_auditoria" ADD CONSTRAINT "vx03_auditoria_usuario_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx06_bodegas" ADD CONSTRAINT "vx06_bodegas_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx08_categorias_productos" ADD CONSTRAINT "vx08_categorias_productos_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx08_categorias_productos" ADD CONSTRAINT "vx08_categorias_productos_padre_id_vx08_categorias_productos_id_fk" FOREIGN KEY ("padre_id") REFERENCES "public"."vx08_categorias_productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx28_cuentas_por_cobrar" ADD CONSTRAINT "vx28_cuentas_por_cobrar_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx28_cuentas_por_cobrar" ADD CONSTRAINT "vx28_cuentas_por_cobrar_cliente_id_vx07_terceros_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."vx07_terceros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx28_cuentas_por_cobrar" ADD CONSTRAINT "vx28_cuentas_por_cobrar_factura_id_vx21_facturas_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."vx21_facturas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx26_cuentas_por_pagar" ADD CONSTRAINT "vx26_cuentas_por_pagar_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx26_cuentas_por_pagar" ADD CONSTRAINT "vx26_cuentas_por_pagar_proveedor_id_vx07_terceros_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."vx07_terceros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx26_cuentas_por_pagar" ADD CONSTRAINT "vx26_cuentas_por_pagar_pedido_id_vx13_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."vx13_pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx24_devolucion_detalles" ADD CONSTRAINT "vx24_devolucion_detalles_devolucion_id_vx23_devoluciones_id_fk" FOREIGN KEY ("devolucion_id") REFERENCES "public"."vx23_devoluciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx24_devolucion_detalles" ADD CONSTRAINT "vx24_devolucion_detalles_producto_id_vx10_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10_productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx23_devoluciones" ADD CONSTRAINT "vx23_devoluciones_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx23_devoluciones" ADD CONSTRAINT "vx23_devoluciones_bodega_id_vx06_bodegas_id_fk" FOREIGN KEY ("bodega_id") REFERENCES "public"."vx06_bodegas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx23_devoluciones" ADD CONSTRAINT "vx23_devoluciones_factura_id_vx21_facturas_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."vx21_facturas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx23_devoluciones" ADD CONSTRAINT "vx23_devoluciones_pedido_id_vx13_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."vx13_pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx23_devoluciones" ADD CONSTRAINT "vx23_devoluciones_usuario_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx22_factura_detalles" ADD CONSTRAINT "vx22_factura_detalles_factura_id_vx21_facturas_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."vx21_facturas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx22_factura_detalles" ADD CONSTRAINT "vx22_factura_detalles_producto_id_vx10_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10_productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx22_factura_detalles" ADD CONSTRAINT "vx22_factura_detalles_unidad_id_vx09_unidades_medida_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "public"."vx09_unidades_medida"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx21_facturas" ADD CONSTRAINT "vx21_facturas_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx21_facturas" ADD CONSTRAINT "vx21_facturas_bodega_id_vx06_bodegas_id_fk" FOREIGN KEY ("bodega_id") REFERENCES "public"."vx06_bodegas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx21_facturas" ADD CONSTRAINT "vx21_facturas_cliente_id_vx07_terceros_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."vx07_terceros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx21_facturas" ADD CONSTRAINT "vx21_facturas_usuario_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx16_inventario" ADD CONSTRAINT "vx16_inventario_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx16_inventario" ADD CONSTRAINT "vx16_inventario_bodega_id_vx06_bodegas_id_fk" FOREIGN KEY ("bodega_id") REFERENCES "public"."vx06_bodegas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx16_inventario" ADD CONSTRAINT "vx16_inventario_producto_id_vx10_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10_productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx17_movimientos_inventario" ADD CONSTRAINT "vx17_movimientos_inventario_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx17_movimientos_inventario" ADD CONSTRAINT "vx17_movimientos_inventario_bodega_id_vx06_bodegas_id_fk" FOREIGN KEY ("bodega_id") REFERENCES "public"."vx06_bodegas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx17_movimientos_inventario" ADD CONSTRAINT "vx17_movimientos_inventario_producto_id_vx10_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10_productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx17_movimientos_inventario" ADD CONSTRAINT "vx17_movimientos_inventario_pedido_id_vx13_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."vx13_pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx17_movimientos_inventario" ADD CONSTRAINT "vx17_movimientos_inventario_factura_id_vx21_facturas_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."vx21_facturas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx17_movimientos_inventario" ADD CONSTRAINT "vx17_movimientos_inventario_traslado_id_vx19_traslados_bodega_id_fk" FOREIGN KEY ("traslado_id") REFERENCES "public"."vx19_traslados_bodega"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx17_movimientos_inventario" ADD CONSTRAINT "vx17_movimientos_inventario_usuario_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx25_notas_credito" ADD CONSTRAINT "vx25_notas_credito_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx25_notas_credito" ADD CONSTRAINT "vx25_notas_credito_cliente_id_vx07_terceros_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."vx07_terceros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx25_notas_credito" ADD CONSTRAINT "vx25_notas_credito_factura_id_vx21_facturas_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."vx21_facturas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx25_notas_credito" ADD CONSTRAINT "vx25_notas_credito_devolucion_id_vx23_devoluciones_id_fk" FOREIGN KEY ("devolucion_id") REFERENCES "public"."vx23_devoluciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx25_notas_credito" ADD CONSTRAINT "vx25_notas_credito_usuario_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx18_notas_inventario" ADD CONSTRAINT "vx18_notas_inventario_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx18_notas_inventario" ADD CONSTRAINT "vx18_notas_inventario_bodega_id_vx06_bodegas_id_fk" FOREIGN KEY ("bodega_id") REFERENCES "public"."vx06_bodegas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx18_notas_inventario" ADD CONSTRAINT "vx18_notas_inventario_producto_id_vx10_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10_productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx18_notas_inventario" ADD CONSTRAINT "vx18_notas_inventario_pedido_id_vx13_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."vx13_pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx18_notas_inventario" ADD CONSTRAINT "vx18_notas_inventario_proveedor_id_vx07_terceros_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."vx07_terceros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx18_notas_inventario" ADD CONSTRAINT "vx18_notas_inventario_usuario_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx27_pagos_proveedor" ADD CONSTRAINT "vx27_pagos_proveedor_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx27_pagos_proveedor" ADD CONSTRAINT "vx27_pagos_proveedor_proveedor_id_vx07_terceros_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."vx07_terceros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx27_pagos_proveedor" ADD CONSTRAINT "vx27_pagos_proveedor_cuenta_por_pagar_id_vx26_cuentas_por_pagar_id_fk" FOREIGN KEY ("cuenta_por_pagar_id") REFERENCES "public"."vx26_cuentas_por_pagar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx27_pagos_proveedor" ADD CONSTRAINT "vx27_pagos_proveedor_usuario_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx15_pedido_costos" ADD CONSTRAINT "vx15_pedido_costos_pedido_id_vx13_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."vx13_pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx14_pedido_detalles" ADD CONSTRAINT "vx14_pedido_detalles_pedido_id_vx13_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."vx13_pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx14_pedido_detalles" ADD CONSTRAINT "vx14_pedido_detalles_producto_id_vx10_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10_productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx14_pedido_detalles" ADD CONSTRAINT "vx14_pedido_detalles_unidad_id_vx09_unidades_medida_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "public"."vx09_unidades_medida"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx13_pedidos" ADD CONSTRAINT "vx13_pedidos_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx13_pedidos" ADD CONSTRAINT "vx13_pedidos_proveedor_id_vx07_terceros_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."vx07_terceros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx13_pedidos" ADD CONSTRAINT "vx13_pedidos_usuario_crea_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_crea_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx13_pedidos" ADD CONSTRAINT "vx13_pedidos_usuario_recibe_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_recibe_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx11_producto_unidades" ADD CONSTRAINT "vx11_producto_unidades_producto_id_vx10_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10_productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx11_producto_unidades" ADD CONSTRAINT "vx11_producto_unidades_unidad_id_vx09_unidades_medida_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "public"."vx09_unidades_medida"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx10_productos" ADD CONSTRAINT "vx10_productos_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx10_productos" ADD CONSTRAINT "vx10_productos_categoria_id_vx08_categorias_productos_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."vx08_categorias_productos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx10_productos" ADD CONSTRAINT "vx10_productos_unidad_base_id_vx09_unidades_medida_id_fk" FOREIGN KEY ("unidad_base_id") REFERENCES "public"."vx09_unidades_medida"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx29_recaudos_clientes" ADD CONSTRAINT "vx29_recaudos_clientes_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx29_recaudos_clientes" ADD CONSTRAINT "vx29_recaudos_clientes_cliente_id_vx07_terceros_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."vx07_terceros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx29_recaudos_clientes" ADD CONSTRAINT "vx29_recaudos_clientes_cuenta_por_cobrar_id_vx28_cuentas_por_cobrar_id_fk" FOREIGN KEY ("cuenta_por_cobrar_id") REFERENCES "public"."vx28_cuentas_por_cobrar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx29_recaudos_clientes" ADD CONSTRAINT "vx29_recaudos_clientes_usuario_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx07_terceros" ADD CONSTRAINT "vx07_terceros_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx20_traslado_detalles" ADD CONSTRAINT "vx20_traslado_detalles_traslado_id_vx19_traslados_bodega_id_fk" FOREIGN KEY ("traslado_id") REFERENCES "public"."vx19_traslados_bodega"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx20_traslado_detalles" ADD CONSTRAINT "vx20_traslado_detalles_producto_id_vx10_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10_productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx19_traslados_bodega" ADD CONSTRAINT "vx19_traslados_bodega_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx19_traslados_bodega" ADD CONSTRAINT "vx19_traslados_bodega_bodega_origen_id_vx06_bodegas_id_fk" FOREIGN KEY ("bodega_origen_id") REFERENCES "public"."vx06_bodegas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx19_traslados_bodega" ADD CONSTRAINT "vx19_traslados_bodega_bodega_destino_id_vx06_bodegas_id_fk" FOREIGN KEY ("bodega_destino_id") REFERENCES "public"."vx06_bodegas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx19_traslados_bodega" ADD CONSTRAINT "vx19_traslados_bodega_usuario_crea_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_crea_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx19_traslados_bodega" ADD CONSTRAINT "vx19_traslados_bodega_usuario_envia_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_envia_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx19_traslados_bodega" ADD CONSTRAINT "vx19_traslados_bodega_usuario_recibe_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_recibe_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx02_usuarios" ADD CONSTRAINT "vx02_usuarios_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx05_usuarios_empresas" ADD CONSTRAINT "vx05_usuarios_empresas_usuario_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx05_usuarios_empresas" ADD CONSTRAINT "vx05_usuarios_empresas_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx05_usuarios_empresas" ADD CONSTRAINT "vx05_usuarios_empresas_rol_id_vx01_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."vx01_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vx03_empresa_idx" ON "vx03_auditoria" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "vx03_usuario_idx" ON "vx03_auditoria" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "vx03_tabla_model_idx" ON "vx03_auditoria" USING btree ("tabla_afectada","model_id");--> statement-breakpoint
CREATE INDEX "vx03_created_idx" ON "vx03_auditoria" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "vx06_empresa_activo_idx" ON "vx06_bodegas" USING btree ("empresa_id","activo");--> statement-breakpoint
CREATE INDEX "vx08_empresa_idx" ON "vx08_categorias_productos" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "vx08_padre_idx" ON "vx08_categorias_productos" USING btree ("padre_id");--> statement-breakpoint
CREATE INDEX "vx28_empresa_cliente_idx" ON "vx28_cuentas_por_cobrar" USING btree ("empresa_id","cliente_id");--> statement-breakpoint
CREATE INDEX "vx28_cliente_saldo_idx" ON "vx28_cuentas_por_cobrar" USING btree ("cliente_id","saldo_pendiente");--> statement-breakpoint
CREATE INDEX "vx28_factura_idx" ON "vx28_cuentas_por_cobrar" USING btree ("factura_id");--> statement-breakpoint
CREATE INDEX "vx26_empresa_proveedor_idx" ON "vx26_cuentas_por_pagar" USING btree ("empresa_id","proveedor_id");--> statement-breakpoint
CREATE INDEX "vx26_venc_saldo_idx" ON "vx26_cuentas_por_pagar" USING btree ("fecha_vencimiento","saldo_pendiente");--> statement-breakpoint
CREATE INDEX "vx24_devolucion_idx" ON "vx24_devolucion_detalles" USING btree ("devolucion_id");--> statement-breakpoint
CREATE INDEX "vx23_empresa_tipo_idx" ON "vx23_devoluciones" USING btree ("empresa_id","tipo");--> statement-breakpoint
CREATE INDEX "vx23_factura_idx" ON "vx23_devoluciones" USING btree ("factura_id");--> statement-breakpoint
CREATE INDEX "vx22_factura_idx" ON "vx22_factura_detalles" USING btree ("factura_id");--> statement-breakpoint
CREATE INDEX "vx22_producto_idx" ON "vx22_factura_detalles" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "vx21_cliente_idx" ON "vx21_facturas" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "vx21_empresa_estado_idx" ON "vx21_facturas" USING btree ("empresa_id","estado");--> statement-breakpoint
CREATE INDEX "vx16_empresa_bodega_idx" ON "vx16_inventario" USING btree ("empresa_id","bodega_id");--> statement-breakpoint
CREATE INDEX "vx16_producto_idx" ON "vx16_inventario" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "vx17_ebpf_idx" ON "vx17_movimientos_inventario" USING btree ("empresa_id","bodega_id","producto_id","fecha");--> statement-breakpoint
CREATE INDEX "vx17_empresa_fecha_idx" ON "vx17_movimientos_inventario" USING btree ("empresa_id","fecha");--> statement-breakpoint
CREATE INDEX "vx17_pedido_idx" ON "vx17_movimientos_inventario" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "vx17_factura_idx" ON "vx17_movimientos_inventario" USING btree ("factura_id");--> statement-breakpoint
CREATE INDEX "vx25_cliente_idx" ON "vx25_notas_credito" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "vx25_factura_idx" ON "vx25_notas_credito" USING btree ("factura_id");--> statement-breakpoint
CREATE INDEX "vx18_empresa_bodega_fecha_idx" ON "vx18_notas_inventario" USING btree ("empresa_id","bodega_id","fecha");--> statement-breakpoint
CREATE INDEX "vx27_empresa_proveedor_idx" ON "vx27_pagos_proveedor" USING btree ("empresa_id","proveedor_id");--> statement-breakpoint
CREATE INDEX "vx27_cxp_idx" ON "vx27_pagos_proveedor" USING btree ("cuenta_por_pagar_id");--> statement-breakpoint
CREATE INDEX "vx15_pedido_idx" ON "vx15_pedido_costos" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "vx14_pedido_idx" ON "vx14_pedido_detalles" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "vx14_producto_idx" ON "vx14_pedido_detalles" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "vx13_proveedor_idx" ON "vx13_pedidos" USING btree ("proveedor_id");--> statement-breakpoint
CREATE INDEX "vx13_empresa_estado_idx" ON "vx13_pedidos" USING btree ("empresa_id","estado");--> statement-breakpoint
CREATE INDEX "vx11_producto_idx" ON "vx11_producto_unidades" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "vx10_empresa_cat_idx" ON "vx10_productos" USING btree ("empresa_id","categoria_id");--> statement-breakpoint
CREATE INDEX "vx10_nombre_idx" ON "vx10_productos" USING btree ("nombre");--> statement-breakpoint
CREATE INDEX "vx29_empresa_cliente_idx" ON "vx29_recaudos_clientes" USING btree ("empresa_id","cliente_id");--> statement-breakpoint
CREATE INDEX "vx29_cxc_idx" ON "vx29_recaudos_clientes" USING btree ("cuenta_por_cobrar_id");--> statement-breakpoint
CREATE INDEX "vx07_empresa_tipo_idx" ON "vx07_terceros" USING btree ("empresa_id","tipo");--> statement-breakpoint
CREATE INDEX "vx07_razon_idx" ON "vx07_terceros" USING btree ("razon_social");--> statement-breakpoint
CREATE INDEX "vx20_traslado_idx" ON "vx20_traslado_detalles" USING btree ("traslado_id");--> statement-breakpoint
CREATE INDEX "vx19_empresa_estado_idx" ON "vx19_traslados_bodega" USING btree ("empresa_id","estado");--> statement-breakpoint
CREATE INDEX "vx02_empresa_idx" ON "vx02_usuarios" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "vx02_bloqueado_idx" ON "vx02_usuarios" USING btree ("bloqueado_hasta");--> statement-breakpoint
CREATE INDEX "vx05_empresa_idx" ON "vx05_usuarios_empresas" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "vx05_rol_idx" ON "vx05_usuarios_empresas" USING btree ("rol_id");
CREATE TYPE "public"."vx_tercero_tipo" AS ENUM('proveedor', 'cliente', 'ambos');--> statement-breakpoint
CREATE TYPE "public"."vx_tipo_identificacion" AS ENUM('NIT', 'CC', 'CE', 'PASAPORTE', 'OTRO');--> statement-breakpoint
CREATE TYPE "public"."vx_tipo_persona" AS ENUM('natural', 'juridica');--> statement-breakpoint
CREATE TABLE "vx03" (
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
CREATE TABLE "vx06" (
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
CREATE TABLE "vx08" (
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
CREATE TABLE "vx28" (
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
CREATE TABLE "vx26" (
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
CREATE TABLE "vx24" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"devolucion_id" bigint NOT NULL,
	"producto_id" bigint NOT NULL,
	"cantidad" numeric(12, 4) NOT NULL,
	"precio_unitario" numeric(12, 2) NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx23" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"bodega_id" bigint NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"cliente_id" bigint,
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
CREATE TABLE "vx04" (
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
	CONSTRAINT "vx04_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "vx22" (
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
CREATE TABLE "vx21" (
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
CREATE TABLE "vx16" (
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
CREATE TABLE "vx17" (
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
CREATE TABLE "vx00" (
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
	CONSTRAINT "vx00_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "vx25" (
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
CREATE TABLE "vx18" (
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
CREATE TABLE "vx27" (
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
CREATE TABLE "vx15" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"pedido_id" bigint NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"descripcion" varchar(200),
	"valor" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx14" (
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
CREATE TABLE "vx13" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"proveedor_id" bigint NOT NULL,
	"bodega_id" bigint NOT NULL,
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
CREATE TABLE "vx11" (
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
CREATE TABLE "vx10" (
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
CREATE TABLE "vx29" (
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
CREATE TABLE "vx01" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"descripcion" text,
	"permisos" jsonb,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx01_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "vx07" (
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
	"recaudador_id" bigint,
	"dia_cobro" integer,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx07_empresa_codigo_uq" UNIQUE("empresa_id","codigo"),
	CONSTRAINT "vx07_empresa_ident_uq" UNIQUE("empresa_id","identificacion")
);
--> statement-breakpoint
CREATE TABLE "vx20" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"traslado_id" bigint NOT NULL,
	"producto_id" bigint NOT NULL,
	"cantidad" numeric(12, 4) NOT NULL,
	"costo_unitario" numeric(12, 2) NOT NULL,
	"cantidad_recibida" numeric(12, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx19" (
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
CREATE TABLE "vx09" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"abreviatura" varchar(10) NOT NULL,
	"tipo" varchar(20),
	"descripcion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx09_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "vx02" (
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
	"es_recaudador" boolean DEFAULT false NOT NULL,
	"ultimo_login_at" timestamp with time zone,
	"ultimo_logout_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx02_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vx05" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"usuario_id" bigint NOT NULL,
	"empresa_id" bigint,
	"rol_id" bigint NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx05_usuario_empresa_uq" UNIQUE("usuario_id","empresa_id")
);
--> statement-breakpoint
CREATE TABLE "vx30" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"recaudador_id" bigint NOT NULL,
	"cliente_id" bigint NOT NULL,
	"fecha" date NOT NULL,
	"resultado" varchar(20) NOT NULL,
	"recaudo_id" bigint,
	"foto_url" varchar(500),
	"observaciones" text,
	"usuario_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vx03" ADD CONSTRAINT "vx03_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx03" ADD CONSTRAINT "vx03_usuario_id_vx02_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx06" ADD CONSTRAINT "vx06_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx08" ADD CONSTRAINT "vx08_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx08" ADD CONSTRAINT "vx08_padre_id_vx08_id_fk" FOREIGN KEY ("padre_id") REFERENCES "public"."vx08"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx28" ADD CONSTRAINT "vx28_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx28" ADD CONSTRAINT "vx28_cliente_id_vx07_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."vx07"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx28" ADD CONSTRAINT "vx28_factura_id_vx21_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."vx21"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx26" ADD CONSTRAINT "vx26_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx26" ADD CONSTRAINT "vx26_proveedor_id_vx07_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."vx07"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx26" ADD CONSTRAINT "vx26_pedido_id_vx13_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."vx13"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx24" ADD CONSTRAINT "vx24_devolucion_id_vx23_id_fk" FOREIGN KEY ("devolucion_id") REFERENCES "public"."vx23"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx24" ADD CONSTRAINT "vx24_producto_id_vx10_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx23" ADD CONSTRAINT "vx23_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx23" ADD CONSTRAINT "vx23_bodega_id_vx06_id_fk" FOREIGN KEY ("bodega_id") REFERENCES "public"."vx06"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx23" ADD CONSTRAINT "vx23_cliente_id_vx07_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."vx07"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx23" ADD CONSTRAINT "vx23_factura_id_vx21_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."vx21"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx23" ADD CONSTRAINT "vx23_pedido_id_vx13_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."vx13"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx23" ADD CONSTRAINT "vx23_usuario_id_vx02_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx22" ADD CONSTRAINT "vx22_factura_id_vx21_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."vx21"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx22" ADD CONSTRAINT "vx22_producto_id_vx10_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx22" ADD CONSTRAINT "vx22_unidad_id_vx09_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "public"."vx09"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx21" ADD CONSTRAINT "vx21_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx21" ADD CONSTRAINT "vx21_bodega_id_vx06_id_fk" FOREIGN KEY ("bodega_id") REFERENCES "public"."vx06"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx21" ADD CONSTRAINT "vx21_cliente_id_vx07_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."vx07"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx21" ADD CONSTRAINT "vx21_usuario_id_vx02_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx16" ADD CONSTRAINT "vx16_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx16" ADD CONSTRAINT "vx16_bodega_id_vx06_id_fk" FOREIGN KEY ("bodega_id") REFERENCES "public"."vx06"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx16" ADD CONSTRAINT "vx16_producto_id_vx10_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx17" ADD CONSTRAINT "vx17_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx17" ADD CONSTRAINT "vx17_bodega_id_vx06_id_fk" FOREIGN KEY ("bodega_id") REFERENCES "public"."vx06"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx17" ADD CONSTRAINT "vx17_producto_id_vx10_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx17" ADD CONSTRAINT "vx17_pedido_id_vx13_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."vx13"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx17" ADD CONSTRAINT "vx17_factura_id_vx21_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."vx21"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx17" ADD CONSTRAINT "vx17_traslado_id_vx19_id_fk" FOREIGN KEY ("traslado_id") REFERENCES "public"."vx19"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx17" ADD CONSTRAINT "vx17_usuario_id_vx02_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx25" ADD CONSTRAINT "vx25_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx25" ADD CONSTRAINT "vx25_cliente_id_vx07_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."vx07"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx25" ADD CONSTRAINT "vx25_factura_id_vx21_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."vx21"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx25" ADD CONSTRAINT "vx25_devolucion_id_vx23_id_fk" FOREIGN KEY ("devolucion_id") REFERENCES "public"."vx23"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx25" ADD CONSTRAINT "vx25_usuario_id_vx02_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx18" ADD CONSTRAINT "vx18_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx18" ADD CONSTRAINT "vx18_bodega_id_vx06_id_fk" FOREIGN KEY ("bodega_id") REFERENCES "public"."vx06"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx18" ADD CONSTRAINT "vx18_producto_id_vx10_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx18" ADD CONSTRAINT "vx18_pedido_id_vx13_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."vx13"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx18" ADD CONSTRAINT "vx18_proveedor_id_vx07_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."vx07"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx18" ADD CONSTRAINT "vx18_usuario_id_vx02_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx27" ADD CONSTRAINT "vx27_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx27" ADD CONSTRAINT "vx27_proveedor_id_vx07_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."vx07"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx27" ADD CONSTRAINT "vx27_cuenta_por_pagar_id_vx26_id_fk" FOREIGN KEY ("cuenta_por_pagar_id") REFERENCES "public"."vx26"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx27" ADD CONSTRAINT "vx27_usuario_id_vx02_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx15" ADD CONSTRAINT "vx15_pedido_id_vx13_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."vx13"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx14" ADD CONSTRAINT "vx14_pedido_id_vx13_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."vx13"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx14" ADD CONSTRAINT "vx14_producto_id_vx10_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx14" ADD CONSTRAINT "vx14_unidad_id_vx09_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "public"."vx09"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx13" ADD CONSTRAINT "vx13_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx13" ADD CONSTRAINT "vx13_proveedor_id_vx07_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."vx07"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx13" ADD CONSTRAINT "vx13_bodega_id_vx06_id_fk" FOREIGN KEY ("bodega_id") REFERENCES "public"."vx06"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx13" ADD CONSTRAINT "vx13_usuario_crea_id_vx02_id_fk" FOREIGN KEY ("usuario_crea_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx13" ADD CONSTRAINT "vx13_usuario_recibe_id_vx02_id_fk" FOREIGN KEY ("usuario_recibe_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx11" ADD CONSTRAINT "vx11_producto_id_vx10_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx11" ADD CONSTRAINT "vx11_unidad_id_vx09_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "public"."vx09"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx10" ADD CONSTRAINT "vx10_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx10" ADD CONSTRAINT "vx10_categoria_id_vx08_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."vx08"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx10" ADD CONSTRAINT "vx10_unidad_base_id_vx09_id_fk" FOREIGN KEY ("unidad_base_id") REFERENCES "public"."vx09"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx29" ADD CONSTRAINT "vx29_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx29" ADD CONSTRAINT "vx29_cliente_id_vx07_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."vx07"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx29" ADD CONSTRAINT "vx29_cuenta_por_cobrar_id_vx28_id_fk" FOREIGN KEY ("cuenta_por_cobrar_id") REFERENCES "public"."vx28"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx29" ADD CONSTRAINT "vx29_usuario_id_vx02_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx07" ADD CONSTRAINT "vx07_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx07" ADD CONSTRAINT "vx07_recaudador_id_vx02_id_fk" FOREIGN KEY ("recaudador_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx20" ADD CONSTRAINT "vx20_traslado_id_vx19_id_fk" FOREIGN KEY ("traslado_id") REFERENCES "public"."vx19"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx20" ADD CONSTRAINT "vx20_producto_id_vx10_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx19" ADD CONSTRAINT "vx19_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx19" ADD CONSTRAINT "vx19_bodega_origen_id_vx06_id_fk" FOREIGN KEY ("bodega_origen_id") REFERENCES "public"."vx06"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx19" ADD CONSTRAINT "vx19_bodega_destino_id_vx06_id_fk" FOREIGN KEY ("bodega_destino_id") REFERENCES "public"."vx06"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx19" ADD CONSTRAINT "vx19_usuario_crea_id_vx02_id_fk" FOREIGN KEY ("usuario_crea_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx19" ADD CONSTRAINT "vx19_usuario_envia_id_vx02_id_fk" FOREIGN KEY ("usuario_envia_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx19" ADD CONSTRAINT "vx19_usuario_recibe_id_vx02_id_fk" FOREIGN KEY ("usuario_recibe_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx02" ADD CONSTRAINT "vx02_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx05" ADD CONSTRAINT "vx05_usuario_id_vx02_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx05" ADD CONSTRAINT "vx05_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx05" ADD CONSTRAINT "vx05_rol_id_vx01_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."vx01"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx30" ADD CONSTRAINT "vx30_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx30" ADD CONSTRAINT "vx30_recaudador_id_vx02_id_fk" FOREIGN KEY ("recaudador_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx30" ADD CONSTRAINT "vx30_cliente_id_vx07_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."vx07"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx30" ADD CONSTRAINT "vx30_recaudo_id_vx29_id_fk" FOREIGN KEY ("recaudo_id") REFERENCES "public"."vx29"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx30" ADD CONSTRAINT "vx30_usuario_id_vx02_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vx03_empresa_idx" ON "vx03" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "vx03_usuario_idx" ON "vx03" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "vx03_tabla_model_idx" ON "vx03" USING btree ("tabla_afectada","model_id");--> statement-breakpoint
CREATE INDEX "vx03_created_idx" ON "vx03" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "vx06_empresa_activo_idx" ON "vx06" USING btree ("empresa_id","activo");--> statement-breakpoint
CREATE INDEX "vx08_empresa_idx" ON "vx08" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "vx08_padre_idx" ON "vx08" USING btree ("padre_id");--> statement-breakpoint
CREATE INDEX "vx28_empresa_cliente_idx" ON "vx28" USING btree ("empresa_id","cliente_id");--> statement-breakpoint
CREATE INDEX "vx28_cliente_saldo_idx" ON "vx28" USING btree ("cliente_id","saldo_pendiente");--> statement-breakpoint
CREATE INDEX "vx28_factura_idx" ON "vx28" USING btree ("factura_id");--> statement-breakpoint
CREATE INDEX "vx26_empresa_proveedor_idx" ON "vx26" USING btree ("empresa_id","proveedor_id");--> statement-breakpoint
CREATE INDEX "vx26_venc_saldo_idx" ON "vx26" USING btree ("fecha_vencimiento","saldo_pendiente");--> statement-breakpoint
CREATE INDEX "vx24_devolucion_idx" ON "vx24" USING btree ("devolucion_id");--> statement-breakpoint
CREATE INDEX "vx23_empresa_tipo_idx" ON "vx23" USING btree ("empresa_id","tipo");--> statement-breakpoint
CREATE INDEX "vx23_factura_idx" ON "vx23" USING btree ("factura_id");--> statement-breakpoint
CREATE INDEX "vx22_factura_idx" ON "vx22" USING btree ("factura_id");--> statement-breakpoint
CREATE INDEX "vx22_producto_idx" ON "vx22" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "vx21_cliente_idx" ON "vx21" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "vx21_empresa_estado_idx" ON "vx21" USING btree ("empresa_id","estado");--> statement-breakpoint
CREATE INDEX "vx16_empresa_bodega_idx" ON "vx16" USING btree ("empresa_id","bodega_id");--> statement-breakpoint
CREATE INDEX "vx16_producto_idx" ON "vx16" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "vx17_ebpf_idx" ON "vx17" USING btree ("empresa_id","bodega_id","producto_id","fecha");--> statement-breakpoint
CREATE INDEX "vx17_empresa_fecha_idx" ON "vx17" USING btree ("empresa_id","fecha");--> statement-breakpoint
CREATE INDEX "vx17_pedido_idx" ON "vx17" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "vx17_factura_idx" ON "vx17" USING btree ("factura_id");--> statement-breakpoint
CREATE INDEX "vx25_cliente_idx" ON "vx25" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "vx25_factura_idx" ON "vx25" USING btree ("factura_id");--> statement-breakpoint
CREATE INDEX "vx18_empresa_bodega_fecha_idx" ON "vx18" USING btree ("empresa_id","bodega_id","fecha");--> statement-breakpoint
CREATE INDEX "vx27_empresa_proveedor_idx" ON "vx27" USING btree ("empresa_id","proveedor_id");--> statement-breakpoint
CREATE INDEX "vx27_cxp_idx" ON "vx27" USING btree ("cuenta_por_pagar_id");--> statement-breakpoint
CREATE INDEX "vx15_pedido_idx" ON "vx15" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "vx14_pedido_idx" ON "vx14" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "vx14_producto_idx" ON "vx14" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "vx13_proveedor_idx" ON "vx13" USING btree ("proveedor_id");--> statement-breakpoint
CREATE INDEX "vx13_empresa_estado_idx" ON "vx13" USING btree ("empresa_id","estado");--> statement-breakpoint
CREATE INDEX "vx11_producto_idx" ON "vx11" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "vx10_empresa_cat_idx" ON "vx10" USING btree ("empresa_id","categoria_id");--> statement-breakpoint
CREATE INDEX "vx10_nombre_idx" ON "vx10" USING btree ("nombre");--> statement-breakpoint
CREATE INDEX "vx29_empresa_cliente_idx" ON "vx29" USING btree ("empresa_id","cliente_id");--> statement-breakpoint
CREATE INDEX "vx29_cxc_idx" ON "vx29" USING btree ("cuenta_por_cobrar_id");--> statement-breakpoint
CREATE INDEX "vx07_empresa_tipo_idx" ON "vx07" USING btree ("empresa_id","tipo");--> statement-breakpoint
CREATE INDEX "vx07_razon_idx" ON "vx07" USING btree ("razon_social");--> statement-breakpoint
CREATE INDEX "vx20_traslado_idx" ON "vx20" USING btree ("traslado_id");--> statement-breakpoint
CREATE INDEX "vx19_empresa_estado_idx" ON "vx19" USING btree ("empresa_id","estado");--> statement-breakpoint
CREATE INDEX "vx02_empresa_idx" ON "vx02" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "vx02_bloqueado_idx" ON "vx02" USING btree ("bloqueado_hasta");--> statement-breakpoint
CREATE INDEX "vx05_empresa_idx" ON "vx05" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "vx05_rol_idx" ON "vx05" USING btree ("rol_id");--> statement-breakpoint
CREATE INDEX "vx30_empresa_recaudador_fecha_idx" ON "vx30" USING btree ("empresa_id","recaudador_id","fecha");--> statement-breakpoint
CREATE INDEX "vx30_cliente_idx" ON "vx30" USING btree ("cliente_id");
CREATE TYPE "public"."vx_cuenta_tipo" AS ENUM('ahorros', 'corriente', 'caja');--> statement-breakpoint
CREATE TYPE "public"."vx_mov_origen" AS ENUM('saldo_inicial', 'pago_proveedor', 'recaudo_cliente', 'traslado', 'comision', 'ajuste', 'consignacion', 'retiro');--> statement-breakpoint
CREATE TYPE "public"."vx_mov_tipo" AS ENUM('entrada', 'salida');--> statement-breakpoint
CREATE TABLE "vx34" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"tercero_id" bigint NOT NULL,
	"banco" varchar(100) NOT NULL,
	"tipo" "vx_cuenta_tipo" NOT NULL,
	"numero_cuenta" varchar(50) NOT NULL,
	"titular_nit" varchar(50) NOT NULL,
	"titular_nombre" varchar(200) NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx33" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"tipo" "vx_cuenta_tipo" NOT NULL,
	"banco" varchar(100),
	"numero_cuenta" varchar(50),
	"titular_nit" varchar(50),
	"titular_nombre" varchar(200),
	"saldo_inicial" numeric(15, 2) DEFAULT '0' NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx35" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"cuenta_propia_id" bigint NOT NULL,
	"fecha" date NOT NULL,
	"tipo" "vx_mov_tipo" NOT NULL,
	"origen" "vx_mov_origen" NOT NULL,
	"valor" numeric(15, 2) NOT NULL,
	"descripcion" text,
	"pago_id" bigint,
	"recaudo_id" bigint,
	"contra_cuenta_id" bigint,
	"usuario_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vx27" ADD COLUMN "cuenta_origen_id" bigint;--> statement-breakpoint
ALTER TABLE "vx27" ADD COLUMN "beneficiario_cuenta_id" bigint;--> statement-breakpoint
ALTER TABLE "vx27" ADD COLUMN "beneficiario_banco" varchar(100);--> statement-breakpoint
ALTER TABLE "vx27" ADD COLUMN "beneficiario_cuenta" varchar(50);--> statement-breakpoint
ALTER TABLE "vx27" ADD COLUMN "beneficiario_nit" varchar(50);--> statement-breakpoint
ALTER TABLE "vx27" ADD COLUMN "beneficiario_nombre" varchar(200);--> statement-breakpoint
ALTER TABLE "vx29" ADD COLUMN "cuenta_destino_id" bigint;--> statement-breakpoint
ALTER TABLE "vx34" ADD CONSTRAINT "vx34_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx34" ADD CONSTRAINT "vx34_tercero_id_vx07_id_fk" FOREIGN KEY ("tercero_id") REFERENCES "public"."vx07"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx33" ADD CONSTRAINT "vx33_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx35" ADD CONSTRAINT "vx35_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx35" ADD CONSTRAINT "vx35_cuenta_propia_id_vx33_id_fk" FOREIGN KEY ("cuenta_propia_id") REFERENCES "public"."vx33"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx35" ADD CONSTRAINT "vx35_pago_id_vx27_id_fk" FOREIGN KEY ("pago_id") REFERENCES "public"."vx27"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx35" ADD CONSTRAINT "vx35_recaudo_id_vx29_id_fk" FOREIGN KEY ("recaudo_id") REFERENCES "public"."vx29"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx35" ADD CONSTRAINT "vx35_contra_cuenta_id_vx33_id_fk" FOREIGN KEY ("contra_cuenta_id") REFERENCES "public"."vx33"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx35" ADD CONSTRAINT "vx35_usuario_id_vx02_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vx34_empresa_tercero_idx" ON "vx34" USING btree ("empresa_id","tercero_id");--> statement-breakpoint
CREATE INDEX "vx33_empresa_idx" ON "vx33" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "vx35_cuenta_fecha_idx" ON "vx35" USING btree ("empresa_id","cuenta_propia_id","fecha");--> statement-breakpoint
ALTER TABLE "vx27" ADD CONSTRAINT "vx27_cuenta_origen_id_vx33_id_fk" FOREIGN KEY ("cuenta_origen_id") REFERENCES "public"."vx33"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx27" ADD CONSTRAINT "vx27_beneficiario_cuenta_id_vx34_id_fk" FOREIGN KEY ("beneficiario_cuenta_id") REFERENCES "public"."vx34"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx29" ADD CONSTRAINT "vx29_cuenta_destino_id_vx33_id_fk" FOREIGN KEY ("cuenta_destino_id") REFERENCES "public"."vx33"("id") ON DELETE no action ON UPDATE no action;
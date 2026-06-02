CREATE TABLE "vx40" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"cotizacion_id" bigint NOT NULL,
	"producto_id" bigint NOT NULL,
	"cantidad" numeric(12, 4) NOT NULL,
	"precio_unitario" numeric(12, 2) NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx39" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"cliente_id" bigint NOT NULL,
	"numero" varchar(20) NOT NULL,
	"fecha" date NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"observaciones" text,
	"motivo_anulacion" text,
	"factura_id" bigint,
	"usuario_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx39_empresa_numero_uq" UNIQUE("empresa_id","numero")
);
--> statement-breakpoint
ALTER TABLE "vx40" ADD CONSTRAINT "vx40_cotizacion_id_vx39_id_fk" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."vx39"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx40" ADD CONSTRAINT "vx40_producto_id_vx10_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."vx10"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx39" ADD CONSTRAINT "vx39_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx39" ADD CONSTRAINT "vx39_cliente_id_vx07_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."vx07"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx39" ADD CONSTRAINT "vx39_factura_id_vx21_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."vx21"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx39" ADD CONSTRAINT "vx39_usuario_id_vx02_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vx40_cotizacion_idx" ON "vx40" USING btree ("cotizacion_id");--> statement-breakpoint
CREATE INDEX "vx39_cliente_idx" ON "vx39" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "vx39_empresa_estado_idx" ON "vx39" USING btree ("empresa_id","estado");
CREATE TABLE "vx38" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"cierre_id" bigint NOT NULL,
	"cuenta_propia_id" bigint NOT NULL,
	"tipo" varchar(10) NOT NULL,
	"saldo_esperado" numeric(15, 2) NOT NULL,
	"monto_contado" numeric(15, 2),
	"diferencia" numeric(15, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx37" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"fecha" date NOT NULL,
	"usuario_id" bigint NOT NULL,
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx37_empresa_fecha_uq" UNIQUE("empresa_id","fecha")
);
--> statement-breakpoint
ALTER TABLE "vx21" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "vx21" ADD COLUMN "anulada_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vx38" ADD CONSTRAINT "vx38_cierre_id_vx37_id_fk" FOREIGN KEY ("cierre_id") REFERENCES "public"."vx37"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx38" ADD CONSTRAINT "vx38_cuenta_propia_id_vx33_id_fk" FOREIGN KEY ("cuenta_propia_id") REFERENCES "public"."vx33"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx37" ADD CONSTRAINT "vx37_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx37" ADD CONSTRAINT "vx37_usuario_id_vx02_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vx38_cierre_idx" ON "vx38" USING btree ("cierre_id");
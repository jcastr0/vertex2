CREATE TABLE "vx32" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"pago_id" bigint NOT NULL,
	"retencion_id" bigint NOT NULL,
	"base" numeric(15, 2) NOT NULL,
	"porcentaje" numeric(6, 3) NOT NULL,
	"valor" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vx31" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"porcentaje" numeric(6, 3) NOT NULL,
	"base_minima" numeric(15, 2) DEFAULT '0' NOT NULL,
	"aplica_todas" boolean DEFAULT true NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vx27" ADD COLUMN "retencion_total" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "vx32" ADD CONSTRAINT "vx32_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx32" ADD CONSTRAINT "vx32_pago_id_vx27_id_fk" FOREIGN KEY ("pago_id") REFERENCES "public"."vx27"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx32" ADD CONSTRAINT "vx32_retencion_id_vx31_id_fk" FOREIGN KEY ("retencion_id") REFERENCES "public"."vx31"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx31" ADD CONSTRAINT "vx31_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vx32_pago_idx" ON "vx32" USING btree ("pago_id");--> statement-breakpoint
CREATE INDEX "vx31_empresa_idx" ON "vx31" USING btree ("empresa_id");
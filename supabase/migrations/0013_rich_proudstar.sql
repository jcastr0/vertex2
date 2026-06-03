CREATE TABLE "vx43" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"telefono" varchar(30) NOT NULL,
	"borrador" jsonb,
	"estado" varchar(20) DEFAULT 'recolectando' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx43_empresa_telefono_uq" UNIQUE("empresa_id","telefono")
);
--> statement-breakpoint
CREATE TABLE "vx42" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"telefono" varchar(30) NOT NULL,
	"mensaje" text,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vx43" ADD CONSTRAINT "vx43_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx42" ADD CONSTRAINT "vx42_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vx42_empresa_estado_idx" ON "vx42" USING btree ("empresa_id","estado");
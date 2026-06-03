CREATE TABLE "vx41" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint,
	"clave" varchar(80) NOT NULL,
	"valor" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx41_empresa_clave_uq" UNIQUE("empresa_id","clave")
);
--> statement-breakpoint
ALTER TABLE "vx41" ADD CONSTRAINT "vx41_empresa_id_vx04_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vx41_clave_idx" ON "vx41" USING btree ("clave");
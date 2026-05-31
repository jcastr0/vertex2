ALTER TABLE "vx08" ADD COLUMN "tipo" varchar(20) DEFAULT 'producto' NOT NULL;--> statement-breakpoint
ALTER TABLE "vx15" ADD COLUMN "categoria_id" bigint;--> statement-breakpoint
ALTER TABLE "vx15" ADD CONSTRAINT "vx15_categoria_id_vx08_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."vx08"("id") ON DELETE no action ON UPDATE no action;
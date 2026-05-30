ALTER TYPE "public"."vx_mov_origen" ADD VALUE 'venta' BEFORE 'traslado';--> statement-breakpoint
ALTER TABLE "vx21" ADD COLUMN "metodo_pago" varchar(30);--> statement-breakpoint
ALTER TABLE "vx21" ADD COLUMN "cuenta_destino_id" bigint;--> statement-breakpoint
ALTER TABLE "vx35" ADD COLUMN "factura_id" bigint;--> statement-breakpoint
ALTER TABLE "vx21" ADD CONSTRAINT "vx21_cuenta_destino_id_vx33_id_fk" FOREIGN KEY ("cuenta_destino_id") REFERENCES "public"."vx33"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx35" ADD CONSTRAINT "vx35_factura_id_vx21_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."vx21"("id") ON DELETE no action ON UPDATE no action;
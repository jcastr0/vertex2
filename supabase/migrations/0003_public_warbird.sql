CREATE TABLE "vx30_visitas_recaudo" (
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
ALTER TABLE "vx07_terceros" ADD COLUMN "recaudador_id" bigint;--> statement-breakpoint
ALTER TABLE "vx07_terceros" ADD COLUMN "dia_cobro" integer;--> statement-breakpoint
ALTER TABLE "vx02_usuarios" ADD COLUMN "es_recaudador" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vx30_visitas_recaudo" ADD CONSTRAINT "vx30_visitas_recaudo_empresa_id_vx04_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."vx04_empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx30_visitas_recaudo" ADD CONSTRAINT "vx30_visitas_recaudo_recaudador_id_vx02_usuarios_id_fk" FOREIGN KEY ("recaudador_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx30_visitas_recaudo" ADD CONSTRAINT "vx30_visitas_recaudo_cliente_id_vx07_terceros_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."vx07_terceros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx30_visitas_recaudo" ADD CONSTRAINT "vx30_visitas_recaudo_recaudo_id_vx29_recaudos_clientes_id_fk" FOREIGN KEY ("recaudo_id") REFERENCES "public"."vx29_recaudos_clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vx30_visitas_recaudo" ADD CONSTRAINT "vx30_visitas_recaudo_usuario_id_vx02_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vx30_empresa_recaudador_fecha_idx" ON "vx30_visitas_recaudo" USING btree ("empresa_id","recaudador_id","fecha");--> statement-breakpoint
CREATE INDEX "vx30_cliente_idx" ON "vx30_visitas_recaudo" USING btree ("cliente_id");--> statement-breakpoint
ALTER TABLE "vx07_terceros" ADD CONSTRAINT "vx07_terceros_recaudador_id_vx02_usuarios_id_fk" FOREIGN KEY ("recaudador_id") REFERENCES "public"."vx02_usuarios"("id") ON DELETE no action ON UPDATE no action;
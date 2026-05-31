CREATE TABLE "vx36" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"codigo" varchar(30) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"tipo" varchar(20),
	"activo" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vx36_codigo_unique" UNIQUE("codigo")
);

ALTER TABLE "vx39" ADD COLUMN "origen" varchar(10) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "vx39" ADD COLUMN "requiere_revision" boolean DEFAULT false NOT NULL;
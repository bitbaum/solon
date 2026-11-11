CREATE TABLE "text_translations" (
	"id" text PRIMARY KEY NOT NULL,
	"source_sha256" text NOT NULL,
	"source_lang" text NOT NULL,
	"target_lang" text NOT NULL,
	"text" text NOT NULL,
	"translator" text NOT NULL,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "text_translations_source_target_key" ON "text_translations" USING btree ("source_sha256","target_lang");
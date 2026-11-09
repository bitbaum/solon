ALTER TABLE "facts" ADD COLUMN "quality" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "publisher_flag" text;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_quality_check" CHECK ("facts"."quality" IN ('normal', 'estimated', 'provisional', 'forecast'));
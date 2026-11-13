CREATE TABLE "place_photo_bytes" (
	"key" text PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"url" text NOT NULL,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL
);

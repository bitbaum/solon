-- The chapter and section headings above a provision, outermost first. Additive: existing rows get
-- an empty path until their act is read again.
ALTER TABLE "legal_provisions" ADD COLUMN "heading_path" jsonb DEFAULT '[]'::jsonb NOT NULL;

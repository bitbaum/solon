-- A commune's act was once numbered by the path of its file ("2025/09/Sportparkreglement.pdf",
-- Eschen) before numbers were read from the documents themselves (#501). The register no longer
-- lists that old file, so nothing replaces the number; a file path is not a number. Set it aside
-- (superseded, not deleted).
UPDATE "legal_act_identifiers"
SET "superseded_at" = now()
WHERE "scheme" = 'systematic_number'
  AND "superseded_at" IS NULL
  AND "value" ~* '\.pdf$';

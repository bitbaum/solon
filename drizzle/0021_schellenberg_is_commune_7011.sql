-- Schellenberg is commune 7011 in Liechtenstein's register; 7008 is Mauren.
-- Its regulations were first filed under li7008 and placed on Mauren. They move
-- to li7011 and onto Schellenberg, before Mauren's own regulations arrive.
UPDATE "legal_acts"
SET
  "authority" = 'li7011',
  "jurisdiction_id" = (
    SELECT "jurisdiction_id" FROM "jurisdiction_identifiers"
    WHERE "scheme" = 'li_municipality' AND "value" = '7011' AND "superseded_at" IS NULL
    LIMIT 1
  ),
  "updated_at" = now()
WHERE "authority" = 'li7008';

-- Bootstrap originator_share policy v1 for organization #1 (OrangeCat).
--
-- The rule that routes value back to whoever originated the code a product is
-- built from, by default rather than by favour: 10% of a product's net revenue,
-- split equally per originator of the product's repository and of every shared
-- package it adopts, monthly, in BTC, on a public ledger. Who originated what
-- is read from the fleet's origin register, never typed into a policy.
--
-- Same shape as allocation_policy v1: approved_by_session_id is NULL exactly
-- once, for this baseline; domain code refuses to activate a later version
-- without an APPROVED voting session (category ALLOCATION_POLICY).
--
-- The content below is byte-identical to ORIGINATOR_SHARE_V1 in
-- src/lib/domain/originator-share.ts; its canonical contentHash is pinned there
-- by a unit test so OrangeCat can re-derive it.

INSERT INTO "policies" ("id", "organization_id", "key", "version", "content", "status", "approved_by_session_id")
VALUES (
  '0a1f5c2e-4d3b-4a6e-9f10-6e7d8c9b0a1b',
  '84c9b96e-31a5-4b62-bb2f-0d05a53c31f7',
  'originator_share',
  1,
  '{"base":"net_revenue","beneficiaries":{"register":"https://raw.githubusercontent.com/bitbaum/fleet/main/registers/origin.json","rule":"the originators of the product''s repository and of every shared package it adopts (fleet registers/packages.json adopters); an originator is the first-commit author recorded in the origin register","weighting":"equal_per_originator"},"minimum_payout_sats":10000,"settlement":{"cadence":"monthly","currency":"BTC","ledger":"public"},"share_bps":1000}',
  'ACTIVE',
  NULL
)
ON CONFLICT ("organization_id", "key", "version") DO NOTHING;

INSERT INTO "audit_events" ("id", "organization_id", "event_type", "subject_type", "subject_id", "payload")
VALUES (
  '11c0ffee-0003-4000-8000-000000000003',
  '84c9b96e-31a5-4b62-bb2f-0d05a53c31f7',
  'POLICY_ACTIVATED',
  'policy',
  '0a1f5c2e-4d3b-4a6e-9f10-6e7d8c9b0a1b',
  '{"key": "originator_share", "version": 1, "note": "bootstrap version — value routing to originators by default; every later version requires an APPROVED Solon voting session"}'
)
ON CONFLICT ("id") DO NOTHING;

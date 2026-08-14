-- Seed organization #1: the OrangeCat platform, Solon's first governed workload.
-- Reference data ships as a migration so a deploy can never leave prod empty
-- ("deployed" must equal "working"). Idempotent via ON CONFLICT DO NOTHING.

INSERT INTO "organizations" ("id", "slug", "name", "description")
VALUES (
  '84c9b96e-31a5-4b62-bb2f-0d05a53c31f7',
  'orangecat',
  'OrangeCat',
  'The OrangeCat platform — economic layer of the stack. Solon governs its platform-level allocation policy; the first governed artifact is the Cat''s own spending ceiling.'
)
ON CONFLICT ("slug") DO NOTHING;

-- Bootstrap allocation policy v1. approved_by_session_id is NULL exactly once:
-- this version establishes the baseline, and domain code refuses to activate
-- any later version without an APPROVED voting session.
INSERT INTO "policies" ("id", "organization_id", "key", "version", "content", "status", "approved_by_session_id")
VALUES (
  'f3b3ac5e-9f34-4f6e-9c8a-7b8f2a3d4e5f',
  '84c9b96e-31a5-4b62-bb2f-0d05a53c31f7',
  'allocation_policy',
  1,
  '{"max_cat_daily_spend_btc": 0.001, "max_cat_btc_per_action": 0.00025}',
  'ACTIVE',
  NULL
)
ON CONFLICT ("organization_id", "key", "version") DO NOTHING;

-- Genesis audit trail — the public record starts at the beginning.
INSERT INTO "audit_events" ("id", "organization_id", "event_type", "subject_type", "subject_id", "payload")
VALUES
  (
    '11c0ffee-0001-4000-8000-000000000001',
    '84c9b96e-31a5-4b62-bb2f-0d05a53c31f7',
    'ORG_CREATED',
    'organization',
    '84c9b96e-31a5-4b62-bb2f-0d05a53c31f7',
    '{"slug": "orangecat", "note": "seeded as Solon organization #1"}'
  ),
  (
    '11c0ffee-0002-4000-8000-000000000002',
    '84c9b96e-31a5-4b62-bb2f-0d05a53c31f7',
    'POLICY_ACTIVATED',
    'policy',
    'f3b3ac5e-9f34-4f6e-9c8a-7b8f2a3d4e5f',
    '{"key": "allocation_policy", "version": 1, "note": "bootstrap version — every later version requires an APPROVED Solon voting session"}'
  )
ON CONFLICT ("id") DO NOTHING;

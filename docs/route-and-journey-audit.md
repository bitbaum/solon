# Solon route and user-journey audit

Audit date: 2026-08-12

This document is the product-path inventory for the current MVP. `src/lib/site-config.ts` is the code-level route SSOT; `npm run verify:routes` fails when the catalog and filesystem pages drift or when a static internal link points outside the catalog.

## Static page inventory

| Route | Audience | Primary outcome | State/data boundary |
|---|---|---|---|
| `/` | Evaluator, member, auditor | Understand the model and choose treasury or voting | All figures and ledger rows are explicitly illustrative |
| `/features` | Evaluator, buyer | Separate implemented capabilities from roadmap work | “Available now” and “Roadmap” are visually separated |
| `/security` | Security reviewer, operator | Understand concrete controls and deployment responsibilities | No zero-knowledge, on-chain anchoring, auth, or key-custody claims |
| `/integration` | Developer, operator | Discover the three implemented API surfaces and payload shape | Requires a configured PostgreSQL database for organization data/writes |
| `/about` | Evaluator, contributor | Understand mission, principles, MVP scope, and source | No fabricated team or contact workflow |
| `/governance/voting` | Public observer, prospective member | Explore proposals and choose a sample position | Explicit illustrative data; selection continues to the signed-vote workspace |
| `/treasury/bitcoin` | Public observer, treasury reviewer | Learn the treasury information hierarchy | Explicit illustrative values; no fake live/USD claims |
| `/dashboard` | Member, steward | Choose the next treasury or voting task | Guided task cards; no false sign-in state |
| `/dashboard/treasury` | Treasury steward, auditor | Review the recorded net total and transaction evidence | Shows a prominent sample/offline state when DB access fails; only valid 64-hex transaction IDs link externally |
| `/dashboard/voting` | Registered voting member | Enter an address, select a choice, understand signing requirement | Shows sample/offline state as needed; UI submission stays disabled until wallet signing exists |

## Static API inventory

| Method and route | Outcome | Required state |
|---|---|---|
| `GET /api/bitcoin/wallet/[orgId]` | Address, balance/source, recent transactions | Existing organization; PostgreSQL; optional mempool.space access |
| `GET /api/solon/transparency?orgId=…` | Organization identity, net total of signed recorded amounts, and raw treasury/governance record counts | Existing organization and PostgreSQL |
| `GET /api/voting/[sessionId]/cryptographic-vote` | Weighted tally serialized as exact decimal strings | Existing voting session/database |
| `POST /api/voting/[sessionId]/cryptographic-vote` | Verify and store a signed member choice | Active session/member plus valid Bitcoin signed-message signature |

## Persona and state journeys

### Public evaluator

1. Land on `/` and immediately see the product promise, sample-data label, and two concrete outcomes.
2. Use `/features` to distinguish working capabilities from roadmap ideas.
3. Use `/security` to assess implemented controls and explicit production gaps.
4. Choose `/treasury/bitcoin` or `/governance/voting`, then continue into the matching dashboard task.

Success: the evaluator reaches working evidence or an honestly bounded sample without encountering a 404, inert CTA, or unpublished product claim.

### Public treasury observer / independent auditor

1. Open `/treasury/bitcoin` for the guided explanation.
2. Continue to `/dashboard/treasury`.
3. If live database state exists, inspect recorded amounts and valid transaction links; if not, see the sample/offline banner.
4. A real 64-character hexadecimal transaction ID may open mempool.space in a new tab. Sample IDs remain plain text.
5. A technical auditor can call `GET /api/bitcoin/wallet/[orgId]` and `GET /api/solon/transparency?orgId=…`.

Success: real evidence is distinguishable from sample state, and no fabricated transaction link is presented.

### Registered voting member

1. Review the sample proposal hierarchy on `/governance/voting`.
2. Select Yes or No and receive visible status feedback.
3. Continue to `/dashboard/voting`.
4. Enter a registered Bitcoin address; the address survives the navigation state and is shown back for confirmation.
5. Select Yes, No, or Abstain.
6. Read the canonical signing requirement. The MVP UI does not claim success or submit an unsigned vote.
7. Until wallet-assisted signing ships, use the documented POST endpoint with `choice`, `address`, and a valid standard Bitcoin signed-message `signature`.

Success: the member understands every required step and cannot accidentally create a false-positive “vote submitted” state.

### Treasury steward

1. Open `/dashboard` and choose “Review treasury.”
2. Confirm organization identity and the net total of signed recorded amounts. Positive amounts add to the total; negative amounts subtract from it.
3. Review the mobile card list or desktop table without sideways document scrolling.
4. Follow only validated transaction references to the explorer.
5. Treat categorization as read-only in this build; no treasury mutation is exposed until organization-scoped authorization exists.

Success: the steward can extract the current recorded state and verify evidence, with offline/sample state called out.

### Developer / integrator

1. Open `/integration` and start with the read-only curl request.
2. Choose the treasury, transparency, or vote API based on the desired outcome.
3. Consult the linked source repository for canonical message construction and database setup.
4. Treat responses from an unconfigured database as errors; the UI fallback is not an API success fixture.

Success: the developer uses only endpoints present in this repository—no fictional hosted API, SDK, webhook, or marketplace endpoint.

### Deployment operator / administrator

1. Install dependencies and run `npm run prisma:generate`.
2. Configure `DATABASE_URL`, provision the schema manually per repository guidance, and create organization/member/session state.
3. Configure HTTPS, authentication/authorization, rate limiting, backups, monitoring, and secret handling outside this MVP.
4. Run `npm run verify`, `npm run build`, and the Playwright route/journey suite before deployment.

Success: the operator does not mistake demo fallback behavior for production readiness.

### Procurement participant / vendor

There is no complete marketplace journey in this build. The Prisma schema includes service request and bid records, but the UI/API workflow is roadmap-only. Navigation intentionally does not advertise marketplace destinations.

## Accessibility and responsive coverage

- Every static page was browser-rendered at 375×812, 390×844, and 1440×900.
- The route suite checks one visible `h1`, HTTP 200, no document-level horizontal overflow, and no browser console/page errors on every page.
- Mobile navigation is bounded to the viewport, scrolls internally when needed, closes on navigation/Escape, and uses at least 44px-high targets.
- Dashboard treasury uses stacked transaction cards below `sm`; the desktop table remains available at larger widths.
- Navigation has current-page state, keyboard focus treatment, outside-click/Escape dismissal, a skip link, and reduced-motion handling.

## Known blockers and intentionally incomplete paths

- No authentication or authorization layer is present. “Sign in” language was removed rather than implying a protected session.
- Treasury writes are intentionally absent until organization-scoped steward authorization and an audit log exist.
- Signed-vote requests enforce session windows, bounded inputs, and a process-local abuse brake. A production deployment still requires a shared rate limiter.
- Wallet-assisted vote signing is not implemented, so UI submission is intentionally disabled. The cryptographic POST API remains the real submission path.
- Organization/member/session creation has no administration UI.
- Procurement, decision-management, audit-trail, reports, privacy/terms, support, and contact pages are not implemented and therefore are not linked.
- Live database and mempool behavior depends on deployment configuration and could not be validated against production data during the local audit.
- The schema migration in `prisma/migrations/20260812233000_vote_integrity` makes member Bitcoin addresses unique per organization and removes the stale denormalized vote-count column; apply it before deploying this revision.
- Before applying that migration to an existing database, resolve any duplicate non-null member Bitcoin addresses within the same organization; the unique index intentionally refuses ambiguous voting identities.

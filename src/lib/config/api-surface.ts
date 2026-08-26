/**
 * The public API surface, in one place. The integration page renders this
 * rather than hand-repeating each row, so an endpoint cannot be documented
 * twice with two different descriptions — or shipped and never listed.
 *
 * `sample` is the concrete URL a reader can open right now; GET rows are all
 * public and auth-free, so the docs can link straight at live data instead of
 * describing it. Writes carry no sample: they need a Bitcoin signature.
 */
export interface ApiEndpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  /** Live URL for GET endpoints, resolved against the real organization. */
  sample?: (orgSlug: string) => string;
}

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/orgs/[slug]",
    description: "organization and its public member roster",
    sample: (s) => `/api/orgs/${s}`,
  },
  {
    method: "GET",
    path: "/api/orgs/[slug]/proposals",
    description: "every proposal with its session state",
    sample: (s) => `/api/orgs/${s}/proposals`,
  },
  {
    method: "GET",
    path: "/api/orgs/[slug]/audit",
    description: "the append-only audit stream",
    sample: (s) => `/api/orgs/${s}/audit`,
  },
  {
    method: "GET",
    path: "/api/orgs/[slug]/treasury",
    description: "live on-chain treasury balances",
    sample: (s) => `/api/orgs/${s}/treasury`,
  },
  {
    method: "GET",
    path: "/api/orgs/[slug]/policies/[key]",
    description: "policy version history",
    sample: (s) => `/api/orgs/${s}/policies/allocation_policy`,
  },
  {
    method: "GET",
    path: "/api/orgs/[slug]/allocation",
    description: "contribution split across local, state and federal, with every declaration behind it",
    sample: (s) => `/api/orgs/${s}/allocation`,
  },
  {
    method: "GET",
    path: "/api/orgs/[slug]/allocation/[address]",
    description: "one member's declarations, every version, each with its signature",
  },
  {
    method: "GET",
    path: "/api/sessions/[sessionId]",
    description: "session, its snapshotted rules, and the live tally",
  },
  {
    method: "GET",
    path: "/api/v1/decisions/[sessionId]",
    description: "self-verifying decision document — re-verify it, don't trust it",
  },
  {
    method: "GET",
    path: "/api/health",
    description: "service health",
    sample: () => "/api/health",
  },
  {
    method: "POST",
    path: "/api/members/register",
    description: "claim a member seat by signing with a Bitcoin key",
  },
  {
    method: "POST",
    path: "/api/orgs/[slug]/allocation",
    description: "declare your own contribution split — only your key can write it",
  },
  { method: "POST", path: "/api/proposals", description: "file a signed proposal" },
  {
    method: "POST",
    path: "/api/proposals/[proposalId]/open",
    description: "open the voting session and freeze the rules",
  },
  { method: "POST", path: "/api/sessions/[sessionId]/votes", description: "cast a signed vote" },
  {
    method: "POST",
    path: "/api/sessions/[sessionId]/close",
    description: "close after the window and decide the outcome",
  },
];

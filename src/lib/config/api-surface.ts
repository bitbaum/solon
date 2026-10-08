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
    sample: (s) => `/api/orgs/${s}/policies/allocation_policy`, // also: originator_share
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
    path: "/api/v1/places?q=",
    description: "places by postcode or name; a postcode spanning several places returns each",
    sample: () => "/api/v1/places?q=8053",
  },
  {
    method: "GET",
    path: "/api/v1/places/[...path]",
    description: "one official place: what it is part of, whether it levies tax, and its sources",
    sample: () => "/api/v1/places/switzerland/zurich/bezirk-zurich/zurich",
  },
  {
    method: "GET",
    path: "/api/v1/places/map?pack=",
    description:
      "every place a boundary file draws, with the tax figures along its chain, for maps that estimate in the browser",
    sample: () => "/api/v1/places/map?pack=switzerland",
  },
  {
    method: "GET",
    path: "/api/v1/places/compare?p=",
    description:
      "what /compare shows, as data: each place's chain, the facts its tax model reads and the model — estimate wherever the income is; no income is sent here",
    sample: () => "/api/v1/places/compare?p=switzerland/zurich/bezirk-zurich/zurich",
  },
  {
    method: "GET",
    path: "/api/v1/places/geography",
    description: "boundary files for maps, as a @bitbaum/geo-kit manifest with each file's sha256",
    sample: () => "/api/v1/places/geography",
  },
  {
    method: "GET",
    path: "/api/v1/places/geography/[sha256].topojson",
    description: "one boundary file, immutable: its name is its content",
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

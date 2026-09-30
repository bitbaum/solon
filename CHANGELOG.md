# Changelog

What changed for the people who use Solon, newest first. Every entry comes
from a merged pull request in this repository; the number in brackets is the
one to read for the detail. Fixes get the same weight as features.

## 2026-09-30

### Added

- **What Places covers, counted from the data**, at `/places/coverage`: for
  each country, how many places each level holds, how many of them have each
  figure the tax estimate needs, and when each source was last fetched. A
  missing figure shows as a low count, not as silence. Place pages no longer
  claim to be untranslated in German, French, Italian and Russian. (#220)

### Fixed

- **Signing in when your OrangeCat account got its email later.** Solon said
  "Add an email to continue" to accounts that had one, and "Sign in again"
  led straight back to the same page. OrangeCat now tells Solon the email
  your account has. If sign-in ever does stop, the page is in your language,
  says what to do, and every button on it works. (#221)
- **Tax estimates on 31 December.** A year's tariffs and multipliers ended a
  day early, so an estimate on the last day of the year came out incomplete,
  and a commune that merged away looked gone the day before it did. Every
  period now ends on the day after its last day, as the rest of Solon counts
  time. (#219)

## 2026-09-29

### Added

- **Switzerland, as the official register has it.** Every canton, district
  and commune, with the mergers since 2021 (the old communes stay, marked as
  ended, and point to the one they joined), and the City of Zürich's districts
  and statistical quarters, each with a page at its place in the chain:
  `/places/switzerland/zurich/bezirk-zurich/zurich/kreis-7/witikon`. Everything
  comes from the Federal Statistical Office and the city's open data, with the
  source kept for every row. Taxes, postcodes and the map come next. (#215)
- **Each Zürich commune's tax multiplier, every year since 2021**, from the
  canton's own statistics. A commune whose school communities levy different
  rates (Uster, Turbenthal) shows none rather than a wrong one, until the
  address decides which applies. (#216)
- **Federal and Zürich income-tax tariffs, and the canton's own multiplier,
  every year since 2021**, from the Federal Tax Administration. Together with
  the commune multipliers they give the same income tax as the
  administration's own calculator for the City of Zürich and Küsnacht (checked
  at CHF 100,000, single and married; church tax and the CHF 24 personal tax
  are not counted yet). (#217)
- **A new kind of body: charter city.** A city with its own charter, founded
  by agreement with the state that hosts it — or proposed, before that
  agreement. Like a town, it cannot be founded without a place; picking it
  suggests elected delegates to decide. Same word as on OrangeCat. (#214)

## 2026-09-28

### Added

- **An organization says what kind of body it is, and where.** Founding now
  asks the one question it never asked: what ARE you — a circle, a family, an
  association, a cooperative, a collective, a company, a guild, a DAO, a town,
  a network state or a local fund. The list is the same one OrangeCat uses
  (bitbaum/orangecat `packages/collective-kinds`), so the word here is the word
  there. A town or a local fund cannot be founded without a place (country,
  region, locality); everything else may name one. Picking a kind suggests how
  it decides; the founder can still choose otherwise. The organization page
  names the kind, the place and — when it is more than informal — the legal
  status.
- **One body, two records: bind an organization to its OrangeCat organisation.**
  Give its OrangeCat address at founding; OrangeCat confirms the founder owns
  it, and its kind and place fill in what was left blank. The wallet lives
  there, the decisions live here, and the page links across.
- **What you can do — the map.** `/what-you-can-do` lists everything Solon does
  in plain words, with an example, three steps and a start for each, and opens
  with a box: type the question you want decided and a proposal is drafted
  from it. Linked from the footer.
- **Public roadmap and changelog.** `/roadmap` and `/changelog` render this
  repository's `ROADMAP.md` and `CHANGELOG.md` through the fleet map, without
  signing in, and are linked from the footer.
- **Who decides: one person, everyone, or elected delegates.** Profiles used
  to vary only how votes were counted; every member always voted. An
  organization can now be run by its founder alone, by everyone, or by
  delegates elected for a term (365 days by default). Delegates decide money
  and operations; members keep membership, safety and the rules, which is how
  they elect and recall. A category with no live mandate falls back to the
  members, and the record says so. (#195)
- **Founding chooses how the organization decides.** Every organization
  founded so far became a town meeting silently. The founder now picks a
  governance profile at founding, the choice is bound into the signed text, and
  the organization page names it ("Association (Verein)", not an id). (#194)

### Fixed

- **Founding no longer says a Bitcoin key is required.** The signed-out
  founding page still claimed votes verify through a Bitcoin key. A key is
  optional; the page now says so, and says what a key adds. (#196)

## 2026-09-25

### Added

- **Solon's own sign-up and sign-in.** `/sign-up` and `/sign-in` in Solon's
  design, in all five languages: email first, then Google, GitHub or an
  existing OrangeCat account. One account underneath for Solon, OrangeCat and
  Loki. The header's Sign in remembers the page you were on. (#191)
- **Use cases, the ideas behind Solon, a new era, and the platform.** `/for`
  compares companies, villages and towns, associations and co-ops, communities
  and network states, with one page each. `/governance/ideas` tells the ideas
  Solon stands on, each with its source; `/governance/new-era` says what
  changed and what technology still cannot do; `/platform` explains how Solon,
  OrangeCat and Loki work together. A four-panel menu describes every page in
  one line. (#190)
- **Five languages.** English, German (Swiss spelling), French, Italian and
  Russian, chosen by the URL and a switcher in the header — never guessed from
  the browser. Pages not yet translated say so in the reader's language. (#189)
- **A new front door.** Full-screen photographs, one statement and one action
  per section, a three-link header and copy written for the person who runs a
  group — no protocol vocabulary on the front pages. New `/hire` (free for
  pilot groups in beta) and `/credits`. (#188)

### Fixed

- **Every header control is a 44px touch target.** Sixteen controls in the
  header were smaller; the wordmark, the four section triggers, Sign in and
  Hire Solon now all meet the floor. (#193)
- **Phone layouts no longer scroll sideways, and the mobile menu opens.** Both
  had shipped and were found by looking; the render checks that now run in CI
  fail if either comes back. (#188)

## 2026-09-24

### Added

- **Govern with one click — Bitcoin is optional.** A seat no longer needs a
  wallet. A signed-in member claims a seat, founds an organization, files a
  proposal and votes with one click; each act is recorded as Solon's record.
  Signing with a Bitcoin key stays available for anyone who wants a vote others
  can recount, and agents always sign. Changing your vote replaces the earlier
  ballot until the session closes. (#184)

### Fixed

- **The site no longer claims every vote is Bitcoin-signed.** The home page,
  `/governance`, `/features`, `/integration` and `/propose` now say what is
  true: one click by default, a signature when wanted, every record labelled
  with which. (#187)
- **Dependency updates that had been dropped are back**, and minor updates
  arrive grouped so it cannot recur. (#185)

## 2026-09-20

### Added

- **A link that carries context lands on a form that kept it.** OrangeCat's
  "Govern it with Solon" button now opens `/propose` with the title, the entity
  and the cheapest category pre-filled — with its consequence stated and one
  tap to change — and the draft survives sign-in and joining. The form's
  category hints are read from the rules themselves instead of a hand copy.
  (#172)
- **A rules change shows whether it was decided.** Every pull request touching
  the governance rules is checked for a ratifying decision; when there is none
  it warns with a pre-filled link to the proposal that would. It records; it
  never blocks. (#172)

### Changed

- **Loki's plane is Execution, not Engineering.** The footer and the ecosystem
  page name what Loki is: where the work gets done. (#173)

## 2026-09-17

### Added

- **Anyone may found an organization.** The only way to create one used to be
  a database migration. Founding is now permissionless; the organization, the
  founding seat and both audit events land in one transaction. One identity
  holds one seat per organization, and an organization is attributed to a Loki
  project only through a grant Loki signed — never because the names match.
  (#166)
- **Governance, taught from the product's own code.** Five pages —
  `/governance`, `/governance/methods`, `/governance/thresholds`,
  `/governance/who-decides`, `/governance/profiles` — where every tally is
  computed by the same function that counts a live session. (#168)

### Fixed

- **The approval floor is visible.** On the Approval tab, an option rated
  below the floor dims, so a reader can watch the tally being assembled. (#169)
- **A localization that was never wired up is gone.** Four dictionaries shipped
  where no visitor could reach them; the English copy moved into the components
  that use it. (#170)

## 2026-09-14

### Added

- **Value routing to originators.** `originator_share` v1: 10% of a product's
  net revenue, by default, to the originators of the code it is built from —
  equal per originator, monthly, in Bitcoin, on a public ledger. The split is
  deterministic and anyone can recount it; every later version needs an
  approved allocation-policy vote. (#164)

### Changed

- **One signature step** for claiming a seat and filing a proposal. (#165)
- **FleetCrown is now called Loki** everywhere on the site. (#157)

## 2026-09-07

### Changed

- **Green pull requests merge and deploy themselves** through the fleet's
  shared sweep instead of a stale local copy, and the sweep no longer stalls on
  workflow changes. (#154, #155)
- Node, React, Next, Vitest and other dependencies updated. (#140–#153)

## 2026-09-05

### Changed

- **Design tokens come from the published package** `@bitbaum/design-tokens`
  instead of a git tag, so Solon, OrangeCat and Loki share one source. (#139)

## 2026-09-02

### Changed

- **Prisma replaced by Drizzle** — the fleet has one ORM. Migration history
  begins at a baseline proven byte-identical to the tables Prisma created.
  (#136)
- **One package manager (pnpm)** across the fleet. (#137)
- **Moved to the bitbaum organization**, and `verify` made honest again.
  (#135)

## 2026-08-31

### Fixed

- **The footer promised pages only the navigation could keep.** Footer and
  navigation now render one list. (#122)

### Changed

- A formatter (Prettier) with `format:check` in `verify`; TypeScript 6; CI and
  the deploy follow the box to Node 24. (#123, #133, #134)

## 2026-08-25

### Added

- **Feedback from any page.** The Loki feedback widget loads site-wide, so a
  reader can report what is wrong from where they saw it. (#114)

## 2026-08-15

Earlier history, in one entry. The spine of the product shipped in this week:

- **Six ways to decide, one way to prove it.** Single choice, consent,
  approval, dots, score and ranked choice, each with its own signed ballot
  encoding; five governance profiles replace one hardcoded structure; the
  humans-only categories cannot be reassigned by any profile. (#92)
- **From reader to member to vote.** `/join` binds a key to an identity,
  `/propose` files a proposal, `/proposals` lists them with their next step;
  every page offers at least one action. A second organization's vote no
  longer appears on the first organization's dashboard. (#90)
- **Treasury honesty.** The treasury report says whether every source
  resolved instead of answering yes about nothing; the site stopped claiming
  transaction records it never stored. Still watch-only. (#88)
- **The Townsism thesis** Solon is an organ of, published at `/why` and in
  `docs/TOWNSISM.md`. (#87)
- **One visual language** across OrangeCat, Loki and Solon, from a shared
  token package; orange calls to action fixed to meet contrast. (#77–#93)

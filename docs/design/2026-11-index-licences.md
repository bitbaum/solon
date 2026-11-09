# Published freedom indexes: may Solon load them?

Read on 2026-11-09 (by an AI agent, from the publishers' own pages where they could be
fetched; several sites answered 403 to every request, noted below). Solon loads data only
under a licence that allows redistribution of per-country values and derived charts,
including commercial use, and is not share-alike. "Free to download" is not a licence.

| Index | What governs the data | Verdict |
|---|---|---|
| World Bank Worldwide Governance Indicators | CC BY 4.0 on the catalogue record (datacatalog.worldbank.org, dataset 0038026); aggregate file `wgidataset_with_sourcedata-2026.xlsx`, 200+ economies, 1996–2025 | **Loadable** (aggregate file only; the underlying third-party source data is not clearly covered) |
| OECD fiscal decentralisation / subnational finance | OECD's default since 1 July 2024 is CC BY 4.0, per its open-by-default policy as quoted by search results; the terms page itself answered 403 | **Unclear, likely loadable**: read the terms page before loading. SDMX flows exist under `OECD.CFE.RDG` |
| V-Dem | CC BY-SA 4.0 (v-dem.net) | **Not loadable**: share-alike |
| Fraser, Economic Freedom of the World | "All rights reserved" on the 2025 report; no data licence found (fraserinstitute.org answered 403) | **Not loadable** without written permission |
| Cato/Fraser, Human Freedom Index | "All rights reserved" (2023 edition, via a mirror; cato.org answered 403); also incorporates V-Dem (BY-SA) indicators | **Not loadable** |
| Heritage, Index of Economic Freedom | "All rights reserved" on the 2025 report; the data file states no licence | **Not loadable** without permission |
| Freedom House, Freedom in the World | Content permissions: non-commercial use with citation; commercial use needs prior approval | **Not loadable** (non-commercial) |
| Regional Authority Index (Hooghe, Marks) | No licence stated; "contact … with data queries" | **Needs permission**: ask the authors for CC BY |
| Henley Passport Index | Website terms: all rights reserved, no scraping | **Not loadable** |
| RSF World Press Freedom Index | Terms forbid any extraction or reuse of the database | **Not loadable** |

What follows for the roadmap (`{#stats-indexes}`):

- Load WGI (Regulatory Quality, Rule of Law, Voice and Accountability, Government
  Effectiveness) as statistics, credited "Worldwide Governance Indicators, 2026 Update, World
  Bank". They are expert-perception composites, not measurements of law; their pages must
  say so.
- Confirm the OECD terms, then load subnational revenue and spending shares for the
  centralisation axis.
- Ask Fraser, Heritage, Cato and the Regional Authority Index authors for a licence; until
  one is granted their figures are not shown.
- No open source was found for freedom of movement and exit. Those stay coded from the law
  (`exit` dimension), which is Solon's own work and needs no one's permission.

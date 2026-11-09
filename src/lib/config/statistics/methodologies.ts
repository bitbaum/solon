/**
 * The rankings and ratings Solon describes (src/lib/statistics/methodologies.ts).
 * Terms and components were read on 2026-11-09; the full licence reading is
 * docs/design/2026-11-index-licences.md. Pages that answer a program with 403
 * or build themselves in JavaScript are marked `unchecked`.
 */
import { defineMethodologies } from "@/lib/statistics/methodologies";

const READ = "2026-11-09";
const ev = (publisher: string, url: string, expect: string[], unchecked = false) => ({
  publisher,
  url,
  read: READ,
  expect,
  ...(unchecked ? { unchecked: true as const } : {}),
});

export const METHODOLOGIES = defineMethodologies([
  {
    key: "wgi",
    name: "Worldwide Governance Indicators",
    publisher: "World Bank",
    homepage: "https://www.worldbank.org/en/publication/worldwide-governance-indicators",
    claims: {
      en: "Six broad dimensions of governance for more than 200 economies since 1996, as estimates and 0–100 scores.",
    },
    kinds: ["composite", "perception"],
    layers: ["perception", "de_facto"],
    components: [],
    coverage: { en: "More than 200 economies, 1996 to 2025 (the 2026 update)." },
    draws_on: ["Underlying data from many third-party sources (published as a separate file)"],
    licence: {
      verdict: "loadable",
      terms:
        "License: Creative Commons Attribution 4.0 … This dataset is licensed under Creative Commons Attribution 4.0.",
      why: {
        en: "CC BY 4.0 allows showing and charting the aggregate figures with attribution. The third-party source data is a separate file the licence does not clearly cover.",
      },
    },
    unread: [
      "The names and definitions of the six dimensions, from the methodology page",
      "How the sources are weighted in the aggregate",
    ],
    evidence: [
      ev(
        "World Bank Data Catalog: Worldwide Governance Indicators",
        "https://datacatalog.worldbank.org/search/dataset/0038026",
        ["Creative Commons Attribution 4.0"],
        true,
      ),
    ],
  },
  {
    key: "vdem",
    name: "Varieties of Democracy (V-Dem)",
    publisher: "V-Dem Institute, University of Gothenburg",
    homepage: "https://v-dem.net/",
    claims: {
      en: "Indicators of democracy and civil liberties, including freedom of movement, country by country and year by year.",
    },
    kinds: ["expert_scoring"],
    layers: ["de_facto"],
    components: [],
    licence: {
      verdict: "not_loadable",
      terms:
        "published under a Creative Commons Attribution-ShareAlike (CC BY-SA) 4.0 license… provided that appropriate attribution is given and that any derivative products are distributed under the same license terms.",
      why: {
        en: "Share-alike: anything made from it must carry the same licence, which Solon's policy excludes.",
      },
    },
    unread: ["The list of indicators and how experts are recruited and aggregated (the codebook)"],
    evidence: [
      ev("V-Dem Institute: the V-Dem dataset", "https://v-dem.net/data/the-v-dem-dataset/", [
        "Creative Commons Attribution-ShareAlike",
      ]),
    ],
  },
  {
    key: "fraser_efw",
    name: "Economic Freedom of the World",
    publisher: "Fraser Institute",
    homepage: "https://www.fraserinstitute.org/economic-freedom",
    claims: {
      en: "How far a country's policies and institutions support economic freedom, in five areas, for up to 165 jurisdictions back to 1970.",
    },
    kinds: ["composite"],
    layers: ["de_jure", "de_facto"],
    components: [
      "Size of government",
      "Legal system and property rights",
      "Sound money",
      "Freedom to trade internationally",
      "Regulation",
    ],
    coverage: { en: "Up to 165 jurisdictions, from 1970." },
    licence: {
      verdict: "permission",
      terms:
        "Copyright © 2025 by the Fraser Institute. All rights reserved. No part of this book may be reproduced in any manner whatsoever without written permission…",
      why: {
        en: "Free to download is not a licence to republish: showing its figures needs the Institute's written permission.",
      },
    },
    unread: [
      "The data page's own terms (it builds itself in JavaScript; fraserinstitute.org refused the request)",
    ],
    evidence: [
      ev(
        "Economic Freedom of the World: 2025 Annual Report (PDF, as mirrored by the Liberales Institut)",
        "https://www.libinst.ch/wp-content/uploads/2025/09/EFOTW-2025.pdf",
        ["All rights reserved"],
        true,
      ),
    ],
  },
  {
    key: "cato_hfi",
    name: "Human Freedom Index",
    publisher: "Cato Institute and Fraser Institute",
    homepage: "https://www.cato.org/human-freedom-index",
    claims: {
      en: "Personal, civil and economic freedom together, the economic half being Economic Freedom of the World.",
    },
    kinds: ["composite"],
    layers: ["de_jure", "de_facto"],
    components: [
      "Rule of law",
      "Security and safety",
      "Movement",
      "Religion",
      "Association, assembly and civil society",
      "Expression and information",
      "Relationships",
      "Economic freedom (the five areas of Economic Freedom of the World)",
    ],
    draws_on: ["Economic Freedom of the World", "V-Dem indicators (CC BY-SA)"],
    licence: {
      verdict: "not_loadable",
      terms:
        "Copyright © 2023 by the Cato Institute and the Fraser Institute. All rights reserved.",
      why: {
        en: "All rights reserved, and part of it is V-Dem's share-alike data.",
      },
    },
    unread: ["The 2025 edition and its data page (cato.org refused the request)"],
    evidence: [
      ev(
        "Cato Institute: Human Freedom Index 2023 (this page refused a program; the copyright line was read in the 2023 report's PDF on a third-party mirror)",
        "https://www.cato.org/human-freedom-index/2023",
        ["Human Freedom Index"],
        true,
      ),
    ],
  },
  {
    key: "heritage_ief",
    name: "Index of Economic Freedom",
    publisher: "The Heritage Foundation",
    homepage: "https://www.heritage.org/index/",
    claims: {
      en: "Economic freedom in twelve factors grouped as rule of law, government size, regulatory efficiency and open markets, for 184 countries.",
    },
    kinds: ["composite"],
    layers: ["de_jure", "de_facto"],
    components: [
      "Property Rights",
      "Judicial Effectiveness",
      "Government Integrity",
      "Tax Burden",
      "Government Spending",
      "Fiscal Health",
      "Business Freedom",
      "Labor Freedom",
      "Monetary Freedom",
      "Trade Freedom",
      "Investment Freedom",
      "Financial Freedom",
    ],
    coverage: { en: "184 countries in the 2026 data file." },
    licence: {
      verdict: "permission",
      terms: "© 2025 by The Heritage Foundation … All rights reserved.",
      why: { en: "All rights reserved; the data file states no licence." },
    },
    unread: ["How the twelve factors are scored and weighted (the methodology chapter)"],
    evidence: [
      ev(
        "The Heritage Foundation: 2026 Index of Economic Freedom data file",
        "https://static.heritage.org/index/data/2026/2026_indexofeconomicfreedom_data.xlsx",
        [],
        true,
      ),
    ],
  },
  {
    key: "freedom_house_fiw",
    name: "Freedom in the World",
    publisher: "Freedom House",
    homepage: "https://freedomhouse.org/report/freedom-world",
    claims: { en: "Political rights and civil liberties, country by country, each year." },
    kinds: ["expert_scoring"],
    layers: ["de_facto"],
    components: [],
    licence: {
      verdict: "not_loadable",
      terms:
        "All use of Freedom House content for commercial purposes must be formally approved by Freedom House prior to publication or any other use. Use of Freedom House content for noncommercial purposes is permitted, but the work must be acknowledged with a citation…",
      why: { en: "Non-commercial use only without prior approval." },
    },
    unread: ["The categories and questions, from the methodology page"],
    evidence: [
      ev("Freedom House: content permissions", "https://freedomhouse.org/content-permissions", [
        "noncommercial purposes",
      ]),
    ],
  },
  {
    key: "rsf_wpfi",
    name: "World Press Freedom Index",
    publisher: "Reporters Without Borders (RSF)",
    homepage: "https://rsf.org/en/index",
    claims: {
      en: "The freedom of journalists in 180 countries, as a score and five context scores.",
    },
    kinds: ["expert_scoring"],
    layers: ["de_jure", "de_facto"],
    components: [
      "Political context",
      "Economic context",
      "Legal context",
      "Social context",
      "Safety",
    ],
    coverage: { en: "180 countries (2026 file)." },
    licence: {
      verdict: "not_loadable",
      terms:
        "Toute extraction et toute réutilisation… de la totalité ou d'une partie du contenu d'une base de données… sont strictement interdites.",
      why: { en: "The terms forbid extracting or reusing the database." },
    },
    evidence: [
      ev("RSF: conditions générales d'utilisation", "https://rsf.org/cgu", [
        "strictement interdites",
      ]),
    ],
  },
  {
    key: "rai",
    name: "Regional Authority Index",
    publisher: "Liesbet Hooghe, Gary Marks and colleagues",
    homepage: "https://garymarks.web.unc.edu/data/regional-authority-2/",
    claims: {
      en: "How much authority regional governments hold, as self rule and shared rule, for 96 countries from 1950 to 2018.",
    },
    kinds: ["expert_scoring", "coded_from_law"],
    layers: ["de_jure"],
    components: ["Self rule", "Shared rule"],
    coverage: { en: "96 countries, 1950 to 2018 (version 3.1, 2021)." },
    licence: {
      verdict: "permission",
      terms: "Please contact Liesbet Hooghe or Arjan Schakel with data queries.",
      why: { en: "No licence is stated, so its figures need the authors' permission." },
    },
    evidence: [
      ev(
        "Gary Marks: Regional Authority Index",
        "https://garymarks.web.unc.edu/data/regional-authority-2/",
        ["Regional Authority"],
      ),
    ],
  },
  {
    key: "oecd_fiscal_decentralisation",
    name: "Fiscal Decentralisation Database",
    publisher: "OECD",
    homepage: "https://www.oecd.org/en/data/datasets/oecd-fiscal-decentralisation-database.html",
    claims: {
      en: "How revenue, spending, tax autonomy and debt are shared between central and sub-central government in OECD countries.",
    },
    kinds: ["official_statistics"],
    layers: ["outcome", "de_jure"],
    components: [],
    licence: {
      verdict: "unclear",
      terms:
        "The default licence applied by the OECD is CC BY 4.0 (open-by-default policy, as quoted).",
      why: {
        en: "Likely CC BY 4.0, but the terms page refused a program; it must be read before anything is loaded.",
      },
    },
    unread: ["The OECD terms page", "The database's tables and definitions"],
    evidence: [
      ev(
        "OECD: terms and conditions",
        "https://www.oecd.org/en/about/terms-conditions.html",
        ["CC BY 4.0"],
        true,
      ),
    ],
  },
]);

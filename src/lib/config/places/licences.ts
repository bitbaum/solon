import type { Licence } from "./schema";

/**
 * The licence policy: which source licences the register accepts. An importer
 * whose source's licence is not listed here does not run (§8.1).
 *
 * Decided 2026-09-29 (§13): public domain, CC0 and CC BY. No share-alike source
 * (ODbL) before a Register decision admits one, which comes before any
 * OpenStreetMap-derived data.
 *
 * Swiss public bodies publish under terms of use rather than licences, because
 * raw data is mostly not protected by copyright there. The `LicenseRef-`
 * entries are those terms, each the equivalent of a class the decision admits.
 */
export const LICENCES = [
  { spdx: "CC0-1.0", requiresAttribution: false, shareAlike: false },
  { spdx: "PDDL-1.0", requiresAttribution: false, shareAlike: false },
  { spdx: "CC-BY-4.0", requiresAttribution: true, shareAlike: false },
  // Eurostat: "Reuse of statistical data, metadata, publications, and other dissemination
  // tools published on this website for commercial or non-commercial purposes is
  // authorised provided the source is acknowledged" (read 2026-11-10).
  // https://ec.europa.eu/eurostat/web/main/help/copyright-notice
  { spdx: "LicenseRef-eurostat-reuse", requiresAttribution: true, shareAlike: false },
  // Bank of Russia: "Все материалы сайта Банка России могут быть воспроизведены [...] без
  // каких-либо ограничений по объему и срокам публикации"; the one condition is a link to the
  // source ("ссылки на источник"). Read 2026-11-10. https://www.cbr.ru/about/
  { spdx: "LicenseRef-cbr-reuse", requiresAttribution: true, shareAlike: false },
  // Unicode's CLDR (country names in each language) and its permissive licence, which asks for the notice.
  // https://www.unicode.org/license.txt
  { spdx: "Unicode-3.0", requiresAttribution: true, shareAlike: false },
  // opendata.swiss "Open use" (terms_open): free use, citing the source recommended.
  // https://opendata.swiss/en/terms-of-use
  { spdx: "LicenseRef-opendata-swiss-open", requiresAttribution: false, shareAlike: false },
  // opendata.swiss "Open use. Must provide the source." (terms_by): CC BY's obligation.
  { spdx: "LicenseRef-opendata-swiss-by", requiresAttribution: true, shareAlike: false },
  // Swiss official acts, decisions and their official figures (tax tariffs, rates set
  // by a canton or commune) are not protected: Art. 5 URG, SR 231.1. Public domain.
  { spdx: "LicenseRef-ch-official-act", requiresAttribution: false, shareAlike: false },
  // Liechtenstein's laws and official acts are not protected either: URG Art. 5
  // (LR 231.1). The same class as the Swiss ones above, under its own name.
  { spdx: "LicenseRef-li-official-act", requiresAttribution: false, shareAlike: false },
  // Law a US legislature enacts is public domain under the government edicts doctrine:
  // Georgia v. Public.Resource.Org, Inc., 590 U.S. 255 (2020).
  { spdx: "LicenseRef-public-domain-edicts", requiresAttribution: false, shareAlike: false },
  // Estonian legislation and other legal acts are not protected: Autoriõiguse
  // seadus (Copyright Act) § 5 p 1. The same class as the Swiss and Liechtenstein ones.
  { spdx: "LicenseRef-ee-official-act", requiresAttribution: false, shareAlike: false },
  // Estonia's administrative units (EHAK): "the use of administrative and settlement units
  // data is not restricted, but the reference to the data source (i.e. Estonian Land Board)
  // and validity date must be made". CC BY's obligation, in the Land Board's own words.
  // https://geoportaal.maaamet.ee/eng/spatial-data/administrative-and-settlement-division-p312.html
  { spdx: "LicenseRef-ee-maaamet-by", requiresAttribution: true, shareAlike: false },
  // A work of the United States Government (its Census Bureau's codes and boundaries, the
  // IRS's revenue procedures) is not protected by copyright: 17 U.S.C. § 105. Public domain.
  { spdx: "LicenseRef-us-federal-work", requiresAttribution: false, shareAlike: false },
  // EUR-Lex content (the Official Journal and the consolidated texts): reuse is authorised,
  // for any purpose, provided the source is acknowledged ("© European Union,
  // https://eur-lex.europa.eu"), under Commission Decision 2011/833/EU of 12 December 2011 on
  // the reuse of Commission documents (OJ L 330, 14.12.2011, p. 39). CC BY's obligation.
  { spdx: "LicenseRef-eu-reuse-2011-833", requiresAttribution: true, shareAlike: false },
  // legislation.gov.uk: the Open Government Licence v3.0 (SPDX OGL-UK-3.0) lets the information be
  // copied, published, adapted and used commercially, provided the source is acknowledged with the
  // notice the licence gives. Not share-alike.
  // https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
  { spdx: "OGL-UK-3.0", requiresAttribution: true, shareAlike: false },
  // German statutes, ordinances, official notices and other official works ("amtliche Werke")
  // are not protected by copyright: § 5 Urheberrechtsgesetz. The portal's own notice asks
  // only that the source be named; the same class as the Swiss, Liechtenstein and Estonian ones.
  { spdx: "LicenseRef-de-official-work", requiresAttribution: false, shareAlike: false },
  // South Ossetia's own acts and publications. No copyright or terms-of-use statement was found
  // on parliamentrso.org, presidentruo.org or rsogov.org (docs/research/2026-11-south-ossetia-sources.md,
  // §6), so this entry admits only what a source here states as fact (an administrative
  // structure, names, identifiers, official figures with their publisher). Admitting the full
  // text of acts is a Register decision still to be taken; no law-text source names this class yet.
  { spdx: "LicenseRef-so-official-facts", requiresAttribution: true, shareAlike: false },
  // The President of South Ossetia's site: "Все материалы Официального сайта Президента Республики
  // Южная Осетия могут быть воспроизведены в любых средствах массовой информации, на серверах сети
  // Интернет или на любых иных носителях без каких-либо ограничений по объему и срокам публикации
  // … Единственным условием перепечатки и ретрансляции является ссылка на первоисточник."
  // Read 2026-11-10 through the site's REST API (page "Об использовании информации сайта",
  // modified 2022-01-03). CC BY's obligation, in the site's own words.
  { spdx: "LicenseRef-so-president-site-reuse", requiresAttribution: true, shareAlike: false },
  // South Ossetia's own laws and other official documents are not objects of copyright: Law of the
  // Republic "Об авторском праве и смежных правах" (adopted 12 December 2012, № 64), Art. 8: "Не
  // являются объектами авторского права: 1) официальные документы (законы, судебные решения, иные
  // тексты законодательного, административного и судебного характера), а также их официальные
  // переводы". Read 2026-11-10 at https://parliamentrso.org/node/3256. The same class as the Swiss,
  // Liechtenstein and Estonian ones.
  { spdx: "LicenseRef-so-official-act", requiresAttribution: false, shareAlike: false },
] satisfies readonly Licence[];

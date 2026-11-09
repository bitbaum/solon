/**
 * The curated statistics records: links from a series to the law it is about,
 * events for timelines that are not acts Solon holds, and statements about
 * enforcement. Each is checked against a page that was opened (its
 * `evidence`), and `pnpm run statistics:sync` writes it into the append-only
 * `statistic_records`; a record removed here is retracted there by a new row,
 * never deleted.
 *
 * Add a record only with a source someone read. A causal claim is never a
 * record: an event says what happened and when, and its caveat says what a
 * reader should keep in mind before reading a cause into the line.
 */
import { ACT_IDENTIFIER_SCHEMES, LAW_AUTHORITIES } from "@/lib/config/law";
import { placesConfig } from "@/lib/config/places";
import { defineCuratedRecords, type CuratedRecordInput } from "@/lib/statistics/records";
import { ASSESSMENT_RECORDS } from "./assessments";
import { HEALTH_ASSESSMENTS } from "./assessments-health";
import { EVENT_RECORDS } from "./events";
import { RUBRICS } from "./rubrics";

const FEDLEX = "Fedlex, the Federal Chancellery's publication platform";
const RIIGI_TEATAJA = "Riigi Teataja (State Gazette)";

const RECORDS: readonly CuratedRecordInput[] = [
  ...EVENT_RECORDS,
  ...ASSESSMENT_RECORDS,
  ...HEALTH_ASSESSMENTS,
  {
    // Read 2026-11-08: DBG (SR 642.11) Art. 36 in the version in force from
    // 2026-09-02 states the federal income tax tariff for a single person.
    key: "law_link:ch:tax.income.top_rate:dbg-art-36",
    kind: "law_link",
    metric: "tax.income.top_rate",
    body: {
      place: { scheme: "iso_3166_1", value: "CH" },
      act: { authority: "ch", scheme: "systematic_number", value: "642.11" },
      provision: "art_36",
      why: {
        en: "This article sets the federal income tax tariff, the federal part of the top rate. Cantonal and communal income taxes add to it, so the OECD's rate is higher than the federal one alone.",
        de: "Dieser Artikel legt den Tarif der direkten Bundessteuer fest, den Bundesanteil am Höchstsatz. Kantons- und Gemeindesteuern kommen hinzu; deshalb liegt der Satz der OECD über dem des Bundes allein.",
        fr: "Cet article fixe le barème de l'impôt fédéral direct, la part fédérale du taux maximal. Les impôts cantonaux et communaux s'y ajoutent ; c'est pourquoi le taux de l'OCDE dépasse le seul taux fédéral.",
        it: "Questo articolo fissa la tariffa dell'imposta federale diretta, la parte federale dell'aliquota massima. Le imposte cantonali e comunali vi si aggiungono; perciò l'aliquota dell'OCSE supera quella federale da sola.",
        ru: "Эта статья устанавливает шкалу прямого федерального налога — федеральную часть максимальной ставки. К ней добавляются налоги кантонов и общин, поэтому ставка ОЭСР выше одной федеральной.",
      },
      evidence: [
        {
          publisher: FEDLEX,
          url: "https://www.fedlex.admin.ch/eli/cc/1991/1184_1184_1184/de#art_36",
          read: "2026-11-08",
          expect: [],
          unchecked: true as const,
        },
        {
          publisher: `${FEDLEX}, the version in force from 2026-09-02, as read`,
          url: "https://fedlex.data.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/1991/1184_1184_1184/20260902/de/html/fedlex-data-admin-ch-eli-cc-1991-1184_1184_1184-20260902-de-html-1.html",
          read: "2026-11-08",
          expect: ["Art. 36", "Die Steuer für ein Steuerjahr beträgt"],
        },
      ],
    },
  },
  {
    // Read 2026-11-08: Tulumaksuseadus (Riigi Teataja group 161969) § 4 lg 1
    // in the version in force from 2026-10-01: the rate is 22%, since 2025-01-01.
    key: "law_link:ee:tax.income.top_rate:tums-para-4",
    kind: "law_link",
    metric: "tax.income.top_rate",
    body: {
      place: { scheme: "iso_3166_1", value: "EE" },
      act: { authority: "ee", scheme: "publisher_ref", value: "riigiteataja:161969" },
      provision: "para4",
      why: {
        en: "Estonia taxes income at one rate, and this section sets it. Municipalities levy no rate of their own, so the top rate is this rate.",
        de: "Estland besteuert Einkommen mit einem einzigen Satz, und dieser Paragraf legt ihn fest. Die Gemeinden erheben keinen eigenen Satz; der Höchstsatz ist also dieser Satz.",
        fr: "L'Estonie impose le revenu à un taux unique, que fixe ce paragraphe. Les municipalités ne prélèvent aucun taux propre ; le taux maximal est donc ce taux.",
        it: "L'Estonia tassa il reddito con un'aliquota unica, fissata da questo paragrafo. I comuni non prelevano un'aliquota propria; l'aliquota massima è dunque questa.",
        ru: "Эстония облагает доход по единой ставке, и этот параграф её устанавливает. Самоуправления собственной ставки не взимают, так что максимальная ставка — эта.",
      },
      evidence: [
        {
          publisher: RIIGI_TEATAJA,
          url: "https://www.riigiteataja.ee/akt/109072026066#para4",
          read: "2026-11-08",
          expect: [],
          unchecked: true as const,
        },
        {
          publisher: `${RIIGI_TEATAJA}, machine-readable text of the version in force from 2026-10-01, as read`,
          url: "https://www.riigiteataja.ee/public-api/api/v1/akt/109072026066/blob-xml",
          read: "2026-11-08",
          expect: [
            "Tulumaksu määr, välja arvatud lõigetes 2 ja 5 ning § 43 lõikes 4 nimetatud juhtudel, on 22%",
          ],
        },
      ],
    },
  },
  {
    // Read 2026-11-08: StGB (SR 311.0) Art. 111, intentional killing, in the
    // version in force from 2026-11-01.
    key: "law_link:ch:crime.homicide.rate:stgb-art-111",
    kind: "law_link",
    metric: "crime.homicide.rate",
    body: {
      place: { scheme: "iso_3166_1", value: "CH" },
      act: { authority: "ch", scheme: "systematic_number", value: "311.0" },
      provision: "art_111",
      why: {
        en: "This article makes intentional killing a crime. The series counts the deaths, not the convictions under it, and UNODC's definition is its own, not the code's.",
        de: "Dieser Artikel stellt die vorsätzliche Tötung unter Strafe. Die Reihe zählt die Todesfälle, nicht die Verurteilungen danach, und die Definition des UNODC ist seine eigene, nicht die des Gesetzbuchs.",
        fr: "Cet article réprime le meurtre. La série compte les décès, non les condamnations prononcées en vertu de cet article, et la définition de l'ONUDC est la sienne, non celle du code.",
        it: "Questo articolo punisce l'omicidio intenzionale. La serie conta i decessi, non le condanne pronunciate in base a esso, e la definizione dell'UNODC è sua, non del codice.",
        ru: "Эта статья делает умышленное убийство преступлением. Ряд считает смерти, а не приговоры по ней, и определение УНП ООН — его собственное, а не кодекса.",
      },
      evidence: [
        {
          publisher: FEDLEX,
          url: "https://www.fedlex.admin.ch/eli/cc/54/757_781_799/de#art_111",
          read: "2026-11-08",
          expect: [],
          unchecked: true as const,
        },
        {
          publisher: `${FEDLEX}, the version in force from 2026-11-01, as read`,
          url: "https://fedlex.data.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/54/757_781_799/20261101/de/html/fedlex-data-admin-ch-eli-cc-54-757_781_799-20261101-de-html-2.html",
          read: "2026-11-08",
          expect: ["Art. 111", "Wer vorsätzlich einen Menschen tötet"],
        },
      ],
    },
  },
];

export const STATISTIC_RECORDS = defineCuratedRecords(RECORDS, {
  metrics: new Set(placesConfig.metrics.map((m) => m.key)),
  authorities: new Set(LAW_AUTHORITIES.map((a) => a.key)),
  schemes: new Set<string>(ACT_IDENTIFIER_SCHEMES),
  rubrics: new Map(
    RUBRICS.map((r) => [r.key, { version: r.version, values: r.scale.map((p) => p.value) }]),
  ),
});

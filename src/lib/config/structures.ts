/**
 * The register of structures (design: docs/design/2026-10-structures-as-data.md):
 * each legal form a jurisdiction offers for holding wealth, and the facts that
 * decide between them. Every fact cites the provision it comes from, by act and
 * anchor, with the words that state it and the sha256 of the provision's text
 * as it was read. The comparison checks those words against the law Solon
 * holds whenever it renders, so a fact whose provision no longer says it is
 * shown as missing, never as true.
 *
 * The world is here; the mechanism (src/lib/structures/) names no
 * jurisdiction and no legal form.
 */

/** The rows every structure has, in this order; a row a structure lacks is shown as missing. */
export const STRUCTURE_ROWS = [
  "founders",
  "minimumCapital",
  "register",
  "supervision",
  "liability",
  "profitTax",
  "minimumTax",
  "privateWealth",
] as const;
export type StructureRow = (typeof STRUCTURE_ROWS)[number];

/** A provision, the words in it that state the fact, and the sha256 of its text when read. */
export interface StructureCitation {
  act: string;
  path: string;
  sha256: string;
  quote: string;
}

export type StructureValue =
  | { kind: "amount"; amount: number; currency: string }
  /** `scope` names whose rate it is when it is not the jurisdiction's only one ("federal"). */
  | { kind: "rate"; percent: number; scope?: "federal" }
  /** A message key under `Structures.values`. */
  | { kind: "text"; key: string };

export interface StructureFact {
  row: StructureRow;
  value: StructureValue;
  cites: StructureCitation[];
}

export interface StructureKind {
  /** Also the key of its name under `Structures.kinds`. */
  key: string;
  /** The Places path of the jurisdiction whose law creates it. */
  place: string;
  /** The act that creates the form, a `legal_acts` id. */
  act: string;
  facts: StructureFact[];
}

const cite = (act: string, path: string, sha256: string, quote: string): StructureCitation => ({
  act,
  path,
  sha256,
  quote,
});
const amount = (value: number, currency: string): StructureValue => ({
  kind: "amount",
  amount: value,
  currency,
});
const rate = (percent: number, scope?: "federal"): StructureValue =>
  scope ? { kind: "rate", percent, scope } : { kind: "rate", percent };
const text = (key: string): StructureValue => ({ kind: "text", key });

export const STRUCTURE_KINDS: StructureKind[] = [
  {
    key: "liFoundation",
    place: "liechtenstein",
    act: "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
    facts: [
      {
        row: "founders",
        value: text("naturalOrLegalPersons"),
        cites: [
          cite(
            "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
            "par_4",
            "3725ac60e23cd64e4a00cbc91bba12daab5962eba020b14230cc3cb1b03ba220",
            "Stifter können eine oder mehrere natürliche oder juristische Personen sein.",
          ),
        ],
      },
      {
        row: "minimumCapital",
        value: amount(30_000, "CHF"),
        cites: [
          cite(
            "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
            "par_13",
            "ce4bb2187f6daf9a462d0754bc4844c11b70d45cc6c8efcb67e55c2e527b7c55",
            "Das Mindestkapital der Stiftung beträgt 30 000 Franken.",
          ),
        ],
      },
      {
        row: "register",
        value: text("registeredOrNoticeDeposited"),
        cites: [
          cite(
            "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
            "par_19",
            "4c0718b973248e4b95886eab88163e6736d81ef2a6fcb0f680a1426436330d02",
            "Unterliegt die Stiftung der Eintragungspflicht",
          ),
          cite(
            "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
            "par_21",
            "e1600e715ba91049f12706aa4eeaf99890aaa4f45f4bfb1acac4a6c71f0140eb",
            "die Richtigkeit der hinterlegten Gründungs- und Änderungsanzeigen zu überprüfen",
          ),
        ],
      },
      {
        row: "supervision",
        value: text("charitableOrByChoice"),
        cites: [
          cite(
            "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
            "par_29",
            "df43fa7856113315bf0672f625299daa4fba001bb4db12f935735a7dcf8d301a",
            "Gemeinnützige Stiftungen stehen unter der Aufsicht der Stiftungs- und Trustaufsichtsbehörde. Dasselbe gilt für privatnützige Stiftungen, die durch eine Bestimmung der Stiftungsurkunde der Aufsicht unterstellt sind.",
          ),
        ],
      },
      {
        row: "liability",
        value: text("ownAssetsOnly"),
        cites: [
          cite(
            "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
            "par_37",
            "69acf19c2c0865e820d65ab2fbb2ef53798ae5f36aa700f8aadb537f0d0218ea",
            "Für die Schulden der Stiftung haftet den Gläubigern gegenüber nur das Stiftungsvermögen.",
          ),
        ],
      },
      {
        row: "profitTax",
        value: rate(12.5),
        cites: [
          cite(
            "587d6ca3-f18f-4e73-bfdf-0dc0408692af",
            "art_61",
            "125bd93e8127ef37500f4f4dc6d8cce509953cd665ca6458d239eaacebb5bb77",
            "Die Ertragssteuer beträgt 12,5 % des steuerpflichtigen Reinertrags.",
          ),
        ],
      },
      {
        row: "minimumTax",
        value: amount(1_800, "CHF"),
        cites: [
          cite(
            "587d6ca3-f18f-4e73-bfdf-0dc0408692af",
            "art_62",
            "d87fa65f9dcb15ca32e1ec6e84165a15bd3e50c0cdda109c0ca04476ddf40b22",
            "Die Mindestertragssteuer beträgt 1 800 Franken.",
          ),
        ],
      },
      {
        row: "privateWealth",
        value: text("minimumTaxOnly"),
        cites: [
          cite(
            "587d6ca3-f18f-4e73-bfdf-0dc0408692af",
            "art_64",
            "b908c6073b0df8c6e26217963de1e3438d48e0e85f1da3ece91cfd616b10739b",
            "Als Privatvermögensstrukturen gelten alle juristischen Personen",
          ),
          cite(
            "587d6ca3-f18f-4e73-bfdf-0dc0408692af",
            "art_64",
            "b908c6073b0df8c6e26217963de1e3438d48e0e85f1da3ece91cfd616b10739b",
            "Privatvermögensstrukturen unterliegen ausschliesslich der Mindestertragssteuer nach Massgabe von Art. 62 Abs. 1 und 2 und werden nicht veranlagt.",
          ),
        ],
      },
    ],
  },
  {
    key: "liEstablishment",
    place: "liechtenstein",
    act: "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
    facts: [
      {
        row: "founders",
        value: text("oneOrMoreFounders"),
        cites: [
          cite(
            "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
            "art_536",
            "7c27789a7e1518eed7ec0bf436a954b3371f7125f3cd15b8ae2355102ecda3ff",
            "Zur Gründung einer Anstalt bedarf es schriftlicher und von einem oder mehreren Gründern unterzeichneter Statuten.",
          ),
        ],
      },
      {
        row: "minimumCapital",
        value: amount(30_000, "CHF"),
        cites: [
          cite(
            "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
            "art_122",
            "ccc42b68c6d504d9f5140f8e0f606cf2bdaddadfc973c24e83edd8e34e75ecbd",
            "bei Verbandspersonen, deren Kapital nicht in Anteile zerlegt ist, mindestens 30 000 Franken",
          ),
        ],
      },
      {
        row: "register",
        value: text("registered"),
        cites: [
          cite(
            "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
            "art_534",
            "45012ebfa0d50ab8c78eaee2056a91928318b4297822f7541e276651ba5cf828",
            "ins Handelsregister als Anstaltsregister eingetragenes Unternehmen",
          ),
        ],
      },
      {
        row: "liability",
        value: text("ownAssetsOnly"),
        cites: [
          cite(
            "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
            "art_548",
            "299e7818bc3da786d76fd045b6de4cbd37bf29d1f65fac35ef421323edf77f5e",
            "Für die Schulden der Anstalt haftet in allen Fällen nur das Anstaltsvermögen.",
          ),
        ],
      },
      {
        row: "profitTax",
        value: rate(12.5),
        cites: [
          cite(
            "587d6ca3-f18f-4e73-bfdf-0dc0408692af",
            "art_61",
            "125bd93e8127ef37500f4f4dc6d8cce509953cd665ca6458d239eaacebb5bb77",
            "Die Ertragssteuer beträgt 12,5 % des steuerpflichtigen Reinertrags.",
          ),
        ],
      },
      {
        row: "minimumTax",
        value: amount(1_800, "CHF"),
        cites: [
          cite(
            "587d6ca3-f18f-4e73-bfdf-0dc0408692af",
            "art_62",
            "d87fa65f9dcb15ca32e1ec6e84165a15bd3e50c0cdda109c0ca04476ddf40b22",
            "Die Mindestertragssteuer beträgt 1 800 Franken.",
          ),
        ],
      },
      {
        row: "privateWealth",
        value: text("minimumTaxOnly"),
        cites: [
          cite(
            "587d6ca3-f18f-4e73-bfdf-0dc0408692af",
            "art_64",
            "b908c6073b0df8c6e26217963de1e3438d48e0e85f1da3ece91cfd616b10739b",
            "Als Privatvermögensstrukturen gelten alle juristischen Personen",
          ),
          cite(
            "587d6ca3-f18f-4e73-bfdf-0dc0408692af",
            "art_64",
            "b908c6073b0df8c6e26217963de1e3438d48e0e85f1da3ece91cfd616b10739b",
            "Privatvermögensstrukturen unterliegen ausschliesslich der Mindestertragssteuer nach Massgabe von Art. 62 Abs. 1 und 2 und werden nicht veranlagt.",
          ),
        ],
      },
    ],
  },
  {
    key: "liCompany",
    place: "liechtenstein",
    act: "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
    facts: [
      {
        row: "minimumCapital",
        value: amount(50_000, "CHF"),
        cites: [
          cite(
            "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
            "art_122",
            "ccc42b68c6d504d9f5140f8e0f606cf2bdaddadfc973c24e83edd8e34e75ecbd",
            "bei der Aktiengesellschaft und anderen Verbandspersonen, deren Kapital in Anteile zerlegt ist, mindestens 50 000 Franken",
          ),
        ],
      },
      {
        row: "register",
        value: text("registered"),
        cites: [
          cite(
            "aec6cc20-bb2a-4a89-bb0e-e56530d928a0",
            "art_291",
            "7db32791c5dfd757c4238148b16416d33256fc6dc6585aac8661e37581961c76",
            "In das Handelsregister sind einzutragen",
          ),
        ],
      },
      {
        row: "profitTax",
        value: rate(12.5),
        cites: [
          cite(
            "587d6ca3-f18f-4e73-bfdf-0dc0408692af",
            "art_61",
            "125bd93e8127ef37500f4f4dc6d8cce509953cd665ca6458d239eaacebb5bb77",
            "Die Ertragssteuer beträgt 12,5 % des steuerpflichtigen Reinertrags.",
          ),
        ],
      },
      {
        row: "minimumTax",
        value: amount(1_800, "CHF"),
        cites: [
          cite(
            "587d6ca3-f18f-4e73-bfdf-0dc0408692af",
            "art_62",
            "d87fa65f9dcb15ca32e1ec6e84165a15bd3e50c0cdda109c0ca04476ddf40b22",
            "Die Mindestertragssteuer beträgt 1 800 Franken.",
          ),
        ],
      },
      {
        row: "privateWealth",
        value: text("minimumTaxOnly"),
        cites: [
          cite(
            "587d6ca3-f18f-4e73-bfdf-0dc0408692af",
            "art_64",
            "b908c6073b0df8c6e26217963de1e3438d48e0e85f1da3ece91cfd616b10739b",
            "Als Privatvermögensstrukturen gelten alle juristischen Personen",
          ),
          cite(
            "587d6ca3-f18f-4e73-bfdf-0dc0408692af",
            "art_64",
            "b908c6073b0df8c6e26217963de1e3438d48e0e85f1da3ece91cfd616b10739b",
            "Privatvermögensstrukturen unterliegen ausschliesslich der Mindestertragssteuer nach Massgabe von Art. 62 Abs. 1 und 2 und werden nicht veranlagt.",
          ),
        ],
      },
    ],
  },
  {
    key: "chCompany",
    place: "switzerland",
    act: "75a0a640-b32c-4336-a670-fa4d3aa67826",
    facts: [
      {
        row: "founders",
        value: text("oneOrMorePersonsOrCompanies"),
        cites: [
          cite(
            "75a0a640-b32c-4336-a670-fa4d3aa67826",
            "art_620",
            "47dcf4701df56727914acc63b8879121ee5a604b3a8b7b1cd877621298cdabd8",
            "an der eine oder mehrere Personen oder Handelsgesellschaften beteiligt sind",
          ),
        ],
      },
      {
        row: "minimumCapital",
        value: amount(100_000, "CHF"),
        cites: [
          cite(
            "75a0a640-b32c-4336-a670-fa4d3aa67826",
            "art_621",
            "c42e93f6b35b460678fc6599a153eba599c349ee18be8d044412a47cec5fb027",
            "Das Aktienkapital beträgt mindestens 100 000 Franken.",
          ),
        ],
      },
      {
        row: "register",
        value: text("existsOnceRegistered"),
        cites: [
          cite(
            "75a0a640-b32c-4336-a670-fa4d3aa67826",
            "art_640",
            "a28e54d7ae104af3e2dd410e1027a5c6adc8f610dd71c07b3253b3f535cb8331",
            "Die Gesellschaft ist ins Handelsregister des Ortes einzutragen, an dem sie ihren Sitz hat.",
          ),
          cite(
            "75a0a640-b32c-4336-a670-fa4d3aa67826",
            "art_643",
            "4ba89a90a101ded812cd2bd3e87b1b182271ef2fdaa67980206e72f91b6df883",
            "Die Gesellschaft erlangt das Recht der Persönlichkeit erst durch die Eintragung in das Handelsregister.",
          ),
        ],
      },
      {
        row: "liability",
        value: text("ownAssetsOnly"),
        cites: [
          cite(
            "75a0a640-b32c-4336-a670-fa4d3aa67826",
            "art_620",
            "47dcf4701df56727914acc63b8879121ee5a604b3a8b7b1cd877621298cdabd8",
            "Für ihre Verbindlichkeiten haftet nur das Gesellschaftsvermögen.",
          ),
        ],
      },
      {
        row: "profitTax",
        value: rate(8.5, "federal"),
        cites: [
          cite(
            "1bfb20fa-bc75-4960-9cdd-ddddc90d67c0",
            "art_68",
            "80d4dd6d76cdc4892c9ac1896086fbe284137eb4b47d574378cbc0df59abba39",
            "Die Gewinnsteuer der Kapitalgesellschaften und Genossenschaften beträgt 8,5 Prozent des Reingewinns.",
          ),
        ],
      },
    ],
  },
];

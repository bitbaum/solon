/**
 * The P0 acceptance test of the Places design (§11): a made-up country pack
 * imports, validates, renders a place page and evaluates a tax model, with
 * nothing but its pack and fixtures. Testland's register goes through the real
 * importer into a real database; the tax estimate is computed by hand below;
 * the page is the real component, rendered from those rows.
 *
 * One story, in order. Safe to rerun on the same database: the first import
 * then finds Testland already there and restores the 2025 register.
 *
 * Runs only with INTEGRATION=1 against a migrated database. Plain `pnpm test`
 * skips it.
 */
import { describe, expect, it } from "vitest";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import PlaceProfile from "@/components/places/place-profile";
import en from "../../../../messages/en.json";
import de from "../../../../messages/de.json";
import { placesConfig } from "@/lib/config/places";
import type { PlacesConfig } from "@/lib/config/places/schema";
import { db } from "@/lib/db/client";
import {
  facts,
  jurisdictionIdentifiers,
  jurisdictionNames,
  jurisdictions,
  placeImportRuns,
  sources,
} from "@/lib/db/places-schema";
import { evaluate, taxingLevels } from "@/lib/tax-model";
import { evaluatorFacts, loadChain, loadFacts } from "../chain";
import type { ImportBatch } from "../importer/batch";
import { runImport } from "../importer/run";
import { loadPlacePage } from "../place-page";
import type { SnapshotStore } from "../importer/snapshots";
import { TESTLAND_TAX, withTestland } from "./fixtures/testland/config";
import { OAK_HOLLOW, encode, register, testlandBatch } from "./fixtures/testland/batch";

const RUN = process.env.INTEGRATION === "1";
const testland = withTestland(placesConfig);
const ON = "2025-06-01";

async function renderPlacePage(slugPath: string, locale: "en" | "de"): Promise<string> {
  const view = await loadPlacePage(db, testland, slugPath, ON, locale);
  expect(view, slugPath).not.toBeNull();
  const messages = locale === "en" ? en : de;
  const t = createTranslator({ locale, messages, namespace: "Places" });
  return renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      { locale, messages } as ComponentProps<typeof NextIntlClientProvider>,
      createElement(PlaceProfile, { view: view!, t }),
    ),
  );
}

const snapshots: SnapshotStore & { keys: Set<string> } = {
  keys: new Set(),
  async put(sha) {
    this.keys.add(sha);
    return `memory/${sha}`;
  },
  async get() {
    throw new Error("not needed here");
  },
};

const importBatch = (batch: ImportBatch, extra: { config?: PlacesConfig; dryRun?: boolean } = {}) =>
  runImport(db, {
    config: extra.config ?? testland,
    sourceKey: "testland-register",
    retrieval: {
      bytes: encode(batch),
      url: "https://register.testland.invalid/2025.json",
      retrievedAt: new Date(),
    },
    snapshots,
    dryRun: extra.dryRun,
    gitSha: null,
  });

async function placeId(ref: { scheme: string; value: string }): Promise<string> {
  const [row] = await db
    .select({ id: jurisdictionIdentifiers.jurisdictionId })
    .from(jurisdictionIdentifiers)
    .where(
      and(
        eq(jurisdictionIdentifiers.scheme, ref.scheme),
        eq(jurisdictionIdentifiers.value, ref.value),
        isNull(jurisdictionIdentifiers.supersededAt),
      ),
    );
  if (!row) {
    throw new Error(`no place ${ref.scheme}:${ref.value}`);
  }
  return row.id;
}

async function estimate(
  ref: { scheme: string; value: string },
  values: Record<string, number | boolean>,
  variant = "alone",
) {
  const chain = await loadChain(db, await placeId(ref), ON);
  const chainFacts = await loadFacts(
    db,
    chain.map((p) => p.id),
    ON,
  );
  return evaluate(TESTLAND_TAX, evaluatorFacts(chain, chainFacts), { values, variant });
}

async function currentMultiplier(value: string): Promise<number> {
  const rows = await db
    .select({ value: facts.valueNumeric })
    .from(facts)
    .where(
      and(
        eq(facts.jurisdictionId, await placeId(register(value))),
        eq(facts.metricKey, "test.multiplier"),
        isNull(facts.supersededAt),
      ),
    );
  expect(rows).toHaveLength(1);
  return Number(rows[0]!.value);
}

/** How many retrievals with these bytes were ever recorded. */
const recordedRetrievals = async (sha: string | null) =>
  (
    await db
      .select({ n: sql<number>`count(*)::int` })
      .from(sources)
      .where(eq(sources.contentSha256, sha ?? ""))
  )[0]!.n;

const factRows = async (value: string) =>
  (
    await db
      .select({ n: sql<number>`count(*)::int` })
      .from(facts)
      .where(eq(facts.jurisdictionId, await placeId(register(value))))
  )[0]!.n;

describe.runIf(RUN)("Testland, through the importer", () => {
  it("imports the 2025 register: places, paths, names, identifiers, relations, facts", async () => {
    const fresh =
      (
        await db
          .select({ id: jurisdictionIdentifiers.id })
          .from(jurisdictionIdentifiers)
          .where(
            and(
              eq(jurisdictionIdentifiers.scheme, "testland_register"),
              eq(jurisdictionIdentifiers.value, "T100"),
            ),
          )
      ).length === 0;

    const report = await importBatch(testlandBatch());
    expect(report.problems).toEqual([]);
    expect(report.status).toBe("applied");
    expect(report.sourceId).not.toBeNull();
    expect(snapshots.keys.has(report.contentSha256!)).toBe(true);
    if (fresh) {
      expect(report.counts).toMatchObject({
        placesInserted: 8,
        identifiersInserted: 8,
        namesInserted: 11,
        relationsInserted: 8,
        factsInserted: 10,
      });
    }

    const paths = await db
      .select({ slugPath: jurisdictions.slugPath })
      .from(jurisdictions)
      .where(and(eq(jurisdictions.countryPack, "testland"), isNull(jurisdictions.validTo)));
    expect(paths.map((p) => p.slugPath).sort()).toEqual([
      "testland",
      "testland/northshire",
      "testland/northshire/ashford",
      "testland/northshire/millbrook",
      "testland/northshire/millbrook/oak-hollow",
      "testland/southshire",
      "testland/southshire/fenwick",
      "testland/weavers-guild",
    ]);

    const [run] = await db
      .select()
      .from(placeImportRuns)
      .where(eq(placeImportRuns.id, report.runId));
    expect(run).toMatchObject({ status: "applied", sourceId: report.sourceId });
    expect(run!.finishedAt).not.toBeNull();
  });

  it("changes nothing when the same register is imported again", async () => {
    const report = await importBatch(testlandBatch());
    expect(report.status).toBe("applied");
    expect(Object.values(report.counts).every((n) => n === 0)).toBe(true);
    expect(report.missingFromSource).toEqual([]);
  });

  it("builds a hamlet's chain: its parish, shire and realm, and the guild over its parish", async () => {
    const chain = await loadChain(db, await placeId(OAK_HOLLOW), ON);
    expect(chain.map((p) => [p.levelKey, p.depth])).toEqual([
      ["hamlet", 0],
      ["parish", 1],
      ["shire", 2],
      ["realm", 3],
      ["guild", null],
    ]);
    expect(chain[2]!.names).toEqual(
      expect.arrayContaining([
        { locale: "en", script: null, name: "Northshire", nameType: "self" },
        { locale: "de", script: null, name: "Nordgrafschaft", nameType: "self" },
      ]),
    );
  });

  it("estimates the tax of someone in the hamlet, as computed by hand", async () => {
    // Crown: (60,000 − 20,000) × 5% + (100,000 − 60,000) × 10% = 6,000.
    // Shire basic: (50,000 − 10,000) × 4% + (100,000 − 50,000) × 8% = 5,600,
    // times Northshire 1.0 + Millbrook 1.2 = 12,320. Oak Hollow adds nothing.
    const alone = await estimate(OAK_HOLLOW, { taxable_income: 100_000, guild_member: false });
    expect(alone.complete).toBe(true);
    expect(alone.currency).toBe("XTS");
    expect(alone.total).toBeCloseTo(18_320, 6);
    expect(alone.effectiveRate).toBeCloseTo(0.1832, 10);

    // A guild member adds the guild's 0.1: 5,600 × 2.3 = 12,880.
    const member = await estimate(OAK_HOLLOW, { taxable_income: 100_000, guild_member: true });
    expect(member.total).toBeCloseTo(18_880, 6);

    // Couples: the crown's "together" tariff, (80,000 − 30,000) × 4% + 20,000 × 9% = 3,800;
    // the shire has no couples' tariff, so its general one applies.
    const together = await estimate(
      OAK_HOLLOW,
      { taxable_income: 100_000, guild_member: false },
      "together",
    );
    expect(together.total).toBeCloseTo(16_120, 6);
  });

  it("knows the hamlet takes no tax: the tax model reads no hamlet fact", async () => {
    const chain = await loadChain(db, await placeId(OAK_HOLLOW), ON);
    const levels = taxingLevels(
      TESTLAND_TAX,
      evaluatorFacts(
        chain,
        await loadFacts(
          db,
          chain.map((p) => p.id),
          ON,
        ),
      ),
    );
    expect(levels).toEqual(expect.arrayContaining(["realm", "shire", "parish", "guild"]));
    expect(levels).not.toContain("hamlet");
  });

  it("supersedes a changed rate and a renaming, and keeps what they replaced", async () => {
    const batch = testlandBatch();
    batch.facts.find(
      (f) => f.jurisdiction.value === "T111" && f.metricKey === "test.multiplier",
    )!.value = 1.25;
    batch.jurisdictions.find((j) => j.ref.value === "T121")!.names[0]!.name = "Fenwick-on-Sea";

    const report = await importBatch(batch);
    expect(report.status).toBe("applied");
    expect(report.counts).toMatchObject({
      placesInserted: 0,
      factsSuperseded: 1,
      factsInserted: 1,
      namesSuperseded: 1,
      namesInserted: 1,
      relationsInserted: 0,
    });
    expect(await currentMultiplier("T111")).toBe(1.25);

    const history = await db
      .select({ value: facts.valueNumeric })
      .from(facts)
      .where(
        and(
          eq(facts.jurisdictionId, await placeId(register("T111"))),
          eq(facts.metricKey, "test.multiplier"),
          isNotNull(facts.supersededAt),
        ),
      );
    expect(history.map((h) => Number(h.value))).toContain(1.2);

    const fenwick = await placeId(register("T121"));
    const [place] = await db.select().from(jurisdictions).where(eq(jurisdictions.id, fenwick));
    expect(place!.slugPath).toBe("testland/southshire/fenwick");
    const names = await db
      .select({ name: jurisdictionNames.name })
      .from(jurisdictionNames)
      .where(
        and(eq(jurisdictionNames.jurisdictionId, fenwick), isNull(jurisdictionNames.supersededAt)),
      );
    expect(names.map((n) => n.name).sort()).toEqual(["Fenwic", "Fenwick-on-Sea"]);

    expect(
      (await estimate(OAK_HOLLOW, { taxable_income: 100_000, guild_member: false })).total,
    ).toBeCloseTo(18_600, 6);
  });

  it("refuses a hierarchy the pack forbids, and writes nothing of it", async () => {
    const batch = testlandBatch();
    batch.jurisdictions.push({
      ref: register("T130"),
      levelKey: "parish",
      identifiers: [],
      names: [
        {
          locale: "en",
          script: null,
          name: "Stray",
          nameType: "self",
          usedBy: null,
          validFrom: null,
          validTo: null,
        },
      ],
      validFrom: null,
      validTo: null,
    });
    batch.relations.push({
      from: register("T130"),
      to: register("T100"),
      relation: "part_of",
      validFrom: null,
      validTo: null,
    });

    const report = await importBatch(batch);
    expect(report.status).toBe("failed");
    expect(report.problems).toEqual([
      expect.stringContaining("a parish is part of a shire, not of a realm"),
    ]);
    await expect(placeId(register("T130"))).rejects.toThrow("no place");
    const strays = await db
      .select({ id: jurisdictions.id })
      .from(jurisdictions)
      .where(eq(jurisdictions.slugPath, "testland/stray"));
    expect(strays).toEqual([]);
    expect(await recordedRetrievals(report.contentSha256)).toBe(0);

    const [run] = await db
      .select()
      .from(placeImportRuns)
      .where(eq(placeImportRuns.id, report.runId));
    expect(run!.status).toBe("failed");
    expect(run!.report).toMatchObject({ problems: report.problems });
  });

  it("quarantines an implausible value and publishes the rest", async () => {
    const batch = testlandBatch();
    batch.facts.find(
      (f) => f.jurisdiction.value === "T121" && f.metricKey === "test.multiplier",
    )!.value = 9.5;
    const report = await importBatch(batch);
    expect(report.status).toBe("applied");
    expect(report.quarantined).toEqual([
      {
        fact: "testland_register:T121 test.multiplier 2025-04-01",
        reason: '9.5 is outside the plausible band [0, 5] of "test.multiplier"',
      },
    ]);
    expect(await currentMultiplier("T121")).toBe(1.1);
    expect(await currentMultiplier("T111")).toBe(1.2);
  });

  it("reports the exact diff of a dry run, and writes nothing", async () => {
    const factsBefore = await factRows("T112");
    const batch = testlandBatch();
    batch.facts.find(
      (f) => f.jurisdiction.value === "T112" && f.metricKey === "test.multiplier",
    )!.value = 0.85;
    const report = await importBatch(batch, { dryRun: true });
    expect(report.status).toBe("dry_run");
    expect(report.sourceId).toBeNull();
    expect(report.counts).toMatchObject({ factsSuperseded: 1, factsInserted: 1 });
    expect(await factRows("T112")).toBe(factsBefore);
    expect(await recordedRetrievals(report.contentSha256)).toBe(0);
    expect(await currentMultiplier("T112")).toBe(0.8);
  });

  it("renders the hamlet's place page from the pack alone", async () => {
    const html = await renderPlacePage("testland/northshire/millbrook/oak-hollow", "en");
    expect(html).toContain("<h1");
    expect(html).toContain("Oak Hollow");
    expect(html).toContain("Hamlet · Testland");
    const crumbs = [
      "/places/testland",
      "/places/testland/northshire",
      "/places/testland/northshire/millbrook",
    ];
    const positions = crumbs.map((href) => html.indexOf(`href="${href}"`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html).toContain('href="/places/testland/weavers-guild"');
    expect(html).toContain(en.Places.tax.none);
    expect(html).toContain("Hamlet code");
    expect(html).toContain("Testland Office of Registers: Register of places and rates");
    expect(html).toContain("Licence: CC0-1.0");
  });

  it("renders a parish that levies tax, and a shire in German", async () => {
    const parish = await renderPlacePage("testland/northshire/millbrook", "en");
    expect(parish).toContain(en.Places.tax.levies.replace("{pack}", "Testland"));
    expect(parish).toContain('href="https://register.testland.invalid/T111"');

    const shire = await renderPlacePage("testland/northshire", "de");
    expect(shire).toContain("Nordgrafschaft");
    expect(shire).toContain("Grafschaft · Testland");
    expect(shire).toContain(">Northshire <");
  });

  it("has no page for a path nobody holds, or a pack the config lacks", async () => {
    expect(await loadPlacePage(db, testland, "testland/nowhere", ON, "en")).toBeNull();
    expect(await loadPlacePage(db, placesConfig, "testland/northshire", ON, "en")).toBeNull();
  });

  it("does not run a source whose licence is not on the policy", async () => {
    const report = await importBatch(testlandBatch(), { config: { ...testland, licences: [] } });
    expect(report.status).toBe("failed");
    expect(report.problems).toEqual([
      'licence "CC0-1.0" is not on the licence policy; the importer does not run',
    ]);
    expect(report.contentSha256).toBeNull();
  });
});

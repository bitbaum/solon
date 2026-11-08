/**
 * Load the text of the law from its publisher (design: docs/design/2026-10-law-as-data.md, L1).
 *
 *   pnpm run law:text fedlex [--lang de] [--limit 200] [--day YYYY-MM-DD] [--dry-run]
 *   pnpm run law:text lilex [--limit 200] [--lr 210.0] [--dry-run]
 *   pnpm run law:text cantons [--authority zh] [--limit 200] [--dry-run]
 *   pnpm run law:text legilux [--limit 200] [--dry-run]   (Luxembourg: the register and each act's applicable text)
 *   pnpm run law:text riigiteataja [--limit 500] [--dry-run]   (Estonia: the national acts in force, and each one's text)
 *   pnpm run law:text eurlex [--limit 1000] [--year 2016,2024] [--dry-run]   (European Union: regulations and directives in force, in English; a dry run reads and cuts `limit` texts and stores nothing)
 *   pnpm run law:text ukleg [--limit 1000] [--type ukpga,uksi] [--year 2018,2024] [--dry-run]   (United Kingdom: Public General Acts and Statutory Instruments from legislation.gov.uk, a year at a time, newest first; paced by the site's robots.txt crawl-delay, 5 seconds when checked)
 *   pnpm run law:text ris [--limit 500] [--act 10001622,10000138] [--dry-run]   (Austria: the consolidated federal acts in force from the RIS, in German; a dry run reads and cuts `limit` texts and stores nothing)
 *   pnpm run law:text gii [--limit 1500] [--again] [--act bgb,gg] [--dry-run]   (Germany: the federal acts in force, each act's XML cut into paragraphs, articles and annexes; about a request a second; an act read this week is skipped unless --again, and a new version is stored only when the text changed)
 *   pnpm run law:text wyoleg [--limit 50] [--again] [--title 15] [--dry-run]   (Wyoming: each title of the statutes and the Constitution)
 *   pnpm run law:text gcnh [--limit 1000] [--again] [--title III] [--chapter 39] [--dry-run]   (New Hampshire: each chapter of the RSA, about 11 seconds apart)
 *   pnpm run law:text lexwork [--host zug.tlex.ch] [--limit 500] [--dry-run]   (communes' LexWork collections: acts and their dated versions)
 *   pnpm run law:text refresh [--limit 500] [--dry-run]   (read held cantonal and Lilex documents again, oldest first; a changed one becomes a new version)
 *   pnpm run law:text recut [--authority lu] [--limit 2000] [--dry-run]   (cut the held cantonal acts again, from their snapshots)
 *   pnpm run law:text recut-eurlex [--limit 5000] [--dry-run]   (the same for the EU acts held)
 *   pnpm run law:text recut-municipal [--authority ch-ne-neuchatel] [--limit 5000] [--dry-run]   (the same for the communes' PDFs held)
 *   pnpm run law:text recut-gii [--limit 5000] [--dry-run]   (the same for the German federal acts held)
 *   pnpm run law:text recut-ukleg [--limit 5000] [--dry-run]   (the same for the UK acts held)
 *   pnpm run law:text zhlex [--limit 200] [--dry-run]
 *   pnpm run law:text municipal --publisher zurich-city|all [--history] [--limit 200] [--dry-run]
 *
 * Resumable: acts whose version is already held are skipped, so a run limited to
 * N continues where the last stopped. Exit 1 when an act failed, so a runner alerts.
 */
import {
  recutCantonalText,
  recutEurLexText,
  recutGiiText,
  recutPublisherText,
  recutUkLegText,
} from "@/lib/law/text/recut";
import { importLegilux } from "@/lib/law/text/import-legilux";
import { importWyoleg } from "@/lib/law/text/import-wyoleg";
import { importGcnh } from "@/lib/law/text/import-gcnh";
import { importRiigiTeataja } from "@/lib/law/text/import-riigiteataja";
import { importEurLex } from "@/lib/law/text/import-eurlex";
import { importUkLeg } from "@/lib/law/text/import-ukleg";
import { importRis } from "@/lib/law/text/import-ris";
import { importGii } from "@/lib/law/text/import-gii";
import { importLexwork } from "@/lib/law/text/import-lexwork";
import { refreshText } from "@/lib/law/text/refresh";
import { FEDLEX, LILEX } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { defaultSnapshotStore } from "@/lib/places/importer/snapshots";
import { importFedlexText } from "@/lib/law/text/import";
import { importCantonalText } from "@/lib/law/text/import-cantonal";
import { importLilexText } from "@/lib/law/text/import-lilex";
import { PUBLISHERS } from "@/lib/law/publishers";
import { loadPublisher } from "@/lib/law/publishers/load";
import { importZhlexText } from "@/lib/law/text/import-zhlex";

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};
const [sourceKey] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));

async function main(): Promise<number> {
  if (sourceKey === "municipal") {
    // `--publisher all` reads every commune in config, one after another; one that fails does not stop the rest.
    const which = flag("publisher") ?? "";
    const adapters =
      which === "all" ? Object.values(PUBLISHERS) : [PUBLISHERS[which]].filter(Boolean);
    if (adapters.length === 0) {
      console.error(`--publisher is all, or one of: ${Object.keys(PUBLISHERS).join(", ")}`);
      return 2;
    }
    let failures = 0;
    for (const adapter of adapters) {
      try {
        const report = await loadPublisher(db, adapter!, {
          today: new Date().toISOString().slice(0, 10),
          history: args.includes("--history"),
          limit: flag("limit") ? Number(flag("limit")) : undefined,
          snapshots: defaultSnapshotStore(),
          dryRun: args.includes("--dry-run"),
          onProgress: (message) => console.error(message),
        });
        failures += report.failures.length;
        console.log(
          JSON.stringify(
            {
              publisher: adapter!.key,
              ...report,
              failures: report.failures.slice(0, 30),
              failureCount: report.failures.length,
            },
            null,
            2,
          ),
        );
      } catch (error) {
        failures++;
        console.log(JSON.stringify({ publisher: adapter!.key, error: String(error) }));
      }
    }
    return failures > 0 ? 1 : 0;
  }
  if (sourceKey === "refresh") {
    const report = await refreshText(db, {
      today: new Date().toISOString().slice(0, 10),
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      snapshots: defaultSnapshotStore(),
      dryRun: args.includes("--dry-run"),
      onProgress: (message) => console.error(message),
    });
    console.log(
      JSON.stringify(
        { ...report, failures: report.failures.slice(0, 30), failureCount: report.failures.length },
        null,
        2,
      ),
    );
    return report.failures.length > report.checked / 2 ? 1 : 0;
  }
  if (sourceKey === "lexwork") {
    const report = await importLexwork(db, {
      today: new Date().toISOString().slice(0, 10),
      host: flag("host"),
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      snapshots: defaultSnapshotStore(),
      dryRun: args.includes("--dry-run"),
      onProgress: (message) => console.error(message),
    });
    console.log(
      JSON.stringify(
        { ...report, failures: report.failures.slice(0, 30), failureCount: report.failures.length },
        null,
        2,
      ),
    );
    return report.failures.length > 0 ? 1 : 0;
  }
  if (sourceKey === "legilux") {
    const report = await importLegilux(db, {
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      snapshots: defaultSnapshotStore(),
      dryRun: args.includes("--dry-run"),
      onProgress: (message) => console.error(message),
    });
    console.log(
      JSON.stringify(
        { ...report, failures: report.failures.slice(0, 30), failureCount: report.failures.length },
        null,
        2,
      ),
    );
    return report.failures.length > 0 ? 1 : 0;
  }
  if (sourceKey === "riigiteataja") {
    const report = await importRiigiTeataja(db, {
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      snapshots: defaultSnapshotStore(),
      dryRun: args.includes("--dry-run"),
      onProgress: (message) => console.error(message),
    });
    console.log(
      JSON.stringify(
        { ...report, failures: report.failures.slice(0, 5), failureCount: report.failures.length },
        null,
        2,
      ),
    );
    return report.failures.length > 0 ? 1 : 0;
  }
  if (sourceKey === "eurlex") {
    const years = flag("year")
      ?.split(",")
      .map(Number)
      .filter((y) => Number.isInteger(y) && y > 1900);
    const report = await importEurLex(db, {
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      years: years?.length ? years : undefined,
      snapshots: defaultSnapshotStore(),
      dryRun: args.includes("--dry-run"),
      onProgress: (message) => console.error(message),
    });
    console.log(
      JSON.stringify(
        { ...report, failures: report.failures.slice(0, 10), failureCount: report.failures.length },
        null,
        2,
      ),
    );
    return report.failures.length > 0 ? 1 : 0;
  }
  if (sourceKey === "ukleg") {
    const numbers = (value: string | undefined) =>
      value
        ?.split(",")
        .map(Number)
        .filter((y) => Number.isInteger(y) && y > 1200);
    const report = await importUkLeg(db, {
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      types: flag("type")?.split(",").filter(Boolean),
      years: numbers(flag("year"))?.length ? numbers(flag("year")) : undefined,
      snapshots: defaultSnapshotStore(),
      dryRun: args.includes("--dry-run"),
      onProgress: (message) => console.error(message),
    });
    console.log(
      JSON.stringify(
        { ...report, failures: report.failures.slice(0, 10), failureCount: report.failures.length },
        null,
        2,
      ),
    );
    return report.failures.length > 0 ? 1 : 0;
  }
  if (sourceKey === "ris") {
    const report = await importRis(db, {
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      only: flag("act")
        ?.split(",")
        .filter((n) => /^\d+$/.test(n)),
      snapshots: defaultSnapshotStore(),
      dryRun: args.includes("--dry-run"),
      onProgress: (message) => console.error(message),
    });
    console.log(
      JSON.stringify(
        { ...report, failures: report.failures.slice(0, 10), failureCount: report.failures.length },
        null,
        2,
      ),
    );
    return report.failures.length > 0 ? 1 : 0;
  }
  if (sourceKey === "gii") {
    const only = flag("act")
      ?.split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    const report = await importGii(db, {
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      only: only?.length ? only : undefined,
      again: args.includes("--again"),
      snapshots: defaultSnapshotStore(),
      dryRun: args.includes("--dry-run"),
      onProgress: (message) => console.error(message),
    });
    console.log(
      JSON.stringify(
        { ...report, failures: report.failures.slice(0, 10), failureCount: report.failures.length },
        null,
        2,
      ),
    );
    return report.failures.length > 0 ? 1 : 0;
  }
  if (sourceKey === "wyoleg") {
    const report = await importWyoleg(db, {
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      again: args.includes("--again"),
      only: flag("title") ? [flag("title")!] : undefined,
      snapshots: defaultSnapshotStore(),
      dryRun: args.includes("--dry-run"),
      onProgress: (message) => console.error(message),
    });
    console.log(JSON.stringify({ ...report, failureCount: report.failures.length }, null, 2));
    return report.failures.length > 0 ? 1 : 0;
  }
  if (sourceKey === "gcnh") {
    const report = await importGcnh(db, {
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      again: args.includes("--again"),
      titles: flag("title") ? [flag("title")!] : undefined,
      chapters: flag("chapter") ? [flag("chapter")!] : undefined,
      snapshots: defaultSnapshotStore(),
      dryRun: args.includes("--dry-run"),
      onProgress: (message) => console.error(message),
    });
    console.log(
      JSON.stringify(
        { ...report, failures: report.failures.slice(0, 30), failureCount: report.failures.length },
        null,
        2,
      ),
    );
    return report.failures.length > 0 ? 1 : 0;
  }
  if (
    sourceKey === "recut" ||
    sourceKey === "recut-eurlex" ||
    sourceKey === "recut-gii" ||
    sourceKey === "recut-ukleg" ||
    sourceKey === "recut-municipal"
  ) {
    const recut =
      sourceKey === "recut"
        ? recutCantonalText
        : sourceKey === "recut-ukleg"
          ? recutUkLegText
          : sourceKey === "recut-gii"
            ? recutGiiText
            : sourceKey === "recut-municipal"
              ? recutPublisherText
              : recutEurLexText;
    const report = await recut(db, {
      authority: flag("authority"),
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      snapshots: defaultSnapshotStore(),
      dryRun: args.includes("--dry-run"),
      onProgress: (message) => console.error(message),
    });
    console.log(
      JSON.stringify(
        { ...report, failures: report.failures.slice(0, 30), failureCount: report.failures.length },
        null,
        2,
      ),
    );
    return report.failures.length > 0 ? 1 : 0;
  }
  if (sourceKey === "zhlex") {
    const report = await importZhlexText(db, {
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      snapshots: defaultSnapshotStore(),
      dryRun: args.includes("--dry-run"),
      onProgress: (message) => console.error(message),
    });
    console.log(
      JSON.stringify(
        { ...report, failures: report.failures.slice(0, 30), failureCount: report.failures.length },
        null,
        2,
      ),
    );
    return report.failures.length > 0 ? 1 : 0;
  }
  if (sourceKey === "cantons") {
    const report = await importCantonalText(db, {
      today: new Date().toISOString().slice(0, 10),
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      authority: flag("authority"),
      snapshots: defaultSnapshotStore(),
      dryRun: args.includes("--dry-run"),
      onProgress: (message) => console.error(message),
    });
    console.log(
      JSON.stringify(
        { ...report, failures: report.failures.slice(0, 30), failureCount: report.failures.length },
        null,
        2,
      ),
    );
    return report.refusedForSpace || report.failures.length > 0 ? 1 : 0;
  }
  if (sourceKey === LILEX.key) {
    const report = await importLilexText(db, {
      today: new Date().toISOString().slice(0, 10),
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      lr: flag("lr"),
      snapshots: defaultSnapshotStore(),
      dryRun: args.includes("--dry-run"),
      onProgress: (message) => console.error(message),
    });
    console.log(
      JSON.stringify(
        {
          ...report,
          noPageId: report.noPageId.slice(0, 20),
          noPageIdCount: report.noPageId.length,
          failures: report.failures.slice(0, 30),
          failureCount: report.failures.length,
        },
        null,
        2,
      ),
    );
    return report.stoppedByChallenge || report.failures.length > 0 ? 1 : 0;
  }
  if (sourceKey !== FEDLEX.key) {
    console.error(
      `usage: pnpm run law:text ${FEDLEX.key}|${LILEX.key}|cantons|zhlex|municipal [--lang de] [--limit N] [--day YYYY-MM-DD] [--dry-run]`,
    );
    return 2;
  }
  const report = await importFedlexText(db, {
    lang: flag("lang") ?? "de",
    day: flag("day") ?? new Date().toISOString().slice(0, 10),
    limit: flag("limit") ? Number(flag("limit")) : undefined,
    snapshots: defaultSnapshotStore(),
    dryRun: args.includes("--dry-run"),
    onProgress: (message) => console.error(message),
  });
  console.log(
    JSON.stringify(
      {
        ...report,
        notInRegister: report.notInRegister.slice(0, 20),
        notInRegisterCount: report.notInRegister.length,
      },
      null,
      2,
    ),
  );
  return report.failures.length > 0 ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);

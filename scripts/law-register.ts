/**
 * Read a law register and import it (design: docs/design/2026-10-law-as-data.md, L0 and L2).
 *
 *   pnpm run law:register [lexfind|liechtenstein|links] [--dry-run] [--file <snapshot>]
 *
 * lexfind (the default) lists the Confederation, the cantons and the
 * intercantonal agreements; about two minutes of polite requests. links reads,
 * for each of those acts, the address of its page at the authority that
 * publishes it (about half an hour of polite requests).
 * liechtenstein reads the Government's Systematic Register, a PDF on
 * gesetze.li. --file imports a snapshot a previous run stored. Exit 1 on a
 * failed run, so a runner alerts.
 */
import { readFileSync } from "node:fs";
import { LEXFIND, LI_SYSTEMATIC_REGISTER } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { defaultSnapshotStore } from "@/lib/places/importer/snapshots";
import { importRegister } from "@/lib/law/register/import";
import { fetchOfficialLinks, importOfficialLinks } from "@/lib/law/register/official-links";
import { fetchRegister, importLexfindRegister } from "@/lib/law/register/lexfind";
import {
  fetchLiechtensteinRegister,
  readLiechtensteinRegister,
} from "@/lib/law/register/li-systematic";

const args = process.argv.slice(2);
const fileAt = args.indexOf("--file");
const file = fileAt >= 0 ? args[fileAt + 1] : undefined;
const [source = "lexfind"] = args.filter(
  (a, i) => !a.startsWith("--") && (fileAt < 0 || i !== fileAt + 1),
);

async function main(): Promise<number> {
  const common = {
    retrievedAt: new Date(),
    snapshots: defaultSnapshotStore(),
    dryRun: args.includes("--dry-run"),
  };
  const fileUrl = file ? `file:${file.replace(/^.*\//, "")}` : null;
  let report;
  if (source === "lexfind") {
    let bytes: Uint8Array;
    if (file) {
      bytes = new Uint8Array(readFileSync(file));
    } else {
      const snapshot = await fetchRegister(fetch, (code, acts) =>
        console.error(`read ${code}: ${acts} acts`),
      );
      bytes = new TextEncoder().encode(JSON.stringify(snapshot));
    }
    report = await importLexfindRegister(db, {
      ...common,
      bytes,
      url: fileUrl ?? LEXFIND.homepage,
    });
  } else if (source === "links") {
    let bytes: Uint8Array;
    if (file) {
      bytes = new Uint8Array(readFileSync(file));
    } else {
      const snapshot = await fetchOfficialLinks(fetch, (code, links) =>
        console.error(`read ${code}: ${links} links`),
      );
      bytes = new TextEncoder().encode(JSON.stringify(snapshot));
    }
    report = await importOfficialLinks(db, { ...common, bytes, url: fileUrl ?? LEXFIND.homepage });
  } else if (source === "liechtenstein") {
    const fetched = file
      ? { bytes: new Uint8Array(readFileSync(file)), url: fileUrl! }
      : await fetchLiechtensteinRegister();
    report = await importRegister(db, {
      ...common,
      register: {
        key: LI_SYSTEMATIC_REGISTER.key,
        licenceSpdx: LI_SYSTEMATIC_REGISTER.licenceSpdx,
        identityScheme: LI_SYSTEMATIC_REGISTER.identityScheme,
      },
      bytes: fetched.bytes,
      url: fetched.url,
      read: () => readLiechtensteinRegister(fetched.bytes),
    });
  } else {
    console.error(
      "usage: pnpm run law:register [lexfind|liechtenstein|links] [--dry-run] [--file <snapshot>]",
    );
    return 2;
  }
  console.log(JSON.stringify(report, null, 2));
  return report.status === "failed" ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);

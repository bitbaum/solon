/**
 * A photograph for every place: the picture on its profile and on the card a
 * link to it shows when shared (docs/design/2026-11-world-of-jurisdictions.md,
 * "Photographs").
 *
 *   pnpm run places:photos                     every place of the world list
 *   pnpm run places:photos --from-db           and every place in the database whose identifier
 *                                              Wikidata holds (ISO 3166-2, FIPS, FSO numbers, …)
 *   pnpm run places:photos --scheme iso_3166_2 --values US-WY,CH-ZH
 *   pnpm run places:photos --all               and every place Wikidata holds under any scheme
 *                                              that names a property: every ISO 3166-2
 *                                              subdivision, every Swiss commune, US county
 *
 * A place is found on Wikidata by its item or by the property its identifier
 * scheme names (`wikidataProperty`). Its photograph, best first: the full
 * photograph its Wikivoyage banner (P948) was cut from; its image (P18), when
 * that is a landscape photograph at least 1600 pixels wide and not a map or a
 * flag; the banner itself. Only free licences: public domain, CC0, CC BY and
 * CC BY-SA, shown unchanged with the author and the licence.
 *
 * Writes data/world/photos.json: photographs by Wikidata item, and an index
 * from `scheme:value` to the item. Keeps what an earlier run found for places
 * this run does not read.
 */
import { WORLD_PHOTOS_FILE } from "@/lib/config/world/kinds";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { placesConfig } from "@/lib/config/places";
import { WORLD_PROFILES_FILE } from "@/lib/config/world/kinds";
import { PHOTO_CHOICES } from "@/lib/config/world/photo-choices";
import {
  PHOTO_WIDTH as WIDTH,
  bannerSource,
  free,
  fullPhoto,
  strip,
  thumbAt,
  type PhotoInfo as Info,
} from "@/lib/places/photo-rules";

const UA = "SolonPlacePhotos/1.0 (https://solon.orangecat.ch/credits; place photographs)";
const OUT = join(process.cwd(), WORLD_PHOTOS_FILE);
const COMMONS = "https://commons.wikimedia.org/w/api.php";

interface PlacePhoto {
  file: string;
  page: string;
  src: string;
  width: number;
  height: number;
  author: string;
  license: string;
  licenseUrl: string | null;
  /** photo: a full photograph; banner: a Wikivoyage banner strip, shown as one. */
  shape: "photo" | "banner";
  /** Where the photograph is anchored when cropped, when a person said so. */
  position?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const flag = (name: string) =>
  args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined;

async function politeJson(url: string, accept = "application/json"): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept },
      signal: AbortSignal.timeout(180_000),
    });
    if (r.ok) return r.json();
    if ((r.status !== 429 && r.status !== 503) || attempt >= 8)
      throw new Error(`${url.slice(0, 120)}: HTTP ${r.status}`);
    const asked = Number(r.headers.get("retry-after"));
    await sleep(
      Math.min(120_000, Number.isFinite(asked) && asked > 0 ? asked * 1000 + 500 : 5000 * attempt),
    );
  }
}

async function sparql(query: string): Promise<Record<string, string>[]> {
  const body = (await politeJson(
    `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`,
    "application/sparql-results+json",
  )) as { results: { bindings: Record<string, { value: string }>[] } };
  return body.results.bindings.map((b) =>
    Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])),
  );
}

const fileOf = (filePath: string) =>
  decodeURIComponent(filePath.replace(/^.*Special:FilePath\//, "")).replace(/_/g, " ");
const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function commonsInfo(
  files: readonly string[],
  withText: boolean,
): Promise<Map<string, Info>> {
  const out = new Map<string, Info>();
  const unique = [...new Set(files)];
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      redirects: "1",
      titles: chunk.map((f) => `File:${f}`).join("|"),
      prop: withText ? "imageinfo|revisions" : "imageinfo",
      iiprop: "url|size|mime|extmetadata",
      iiurlwidth: String(WIDTH),
      iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
      ...(withText ? { rvprop: "content", rvslots: "main" } : {}),
    });
    const body = (await politeJson(`${COMMONS}?${params}`)) as {
      query?: {
        pages: {
          title: string;
          imageinfo?: {
            width: number;
            height: number;
            mime: string;
            thumburl?: string;
            url: string;
            thumbwidth?: number;
            thumbheight?: number;
            extmetadata?: Record<string, { value: string }>;
          }[];
          revisions?: { slots: { main: { content: string } } }[];
        }[];
        normalized?: { from: string; to: string }[];
        redirects?: { from: string; to: string }[];
      };
    };
    for (const page of body.query?.pages ?? []) {
      const ii = page.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata ?? {};
      const file = page.title.replace(/^File:/, "");
      out.set(file, {
        file,
        width: ii.thumbwidth ?? ii.width,
        height: ii.thumbheight ?? ii.height,
        mime: ii.mime,
        src: thumbAt(ii.thumburl ?? ii.url, ii.width),
        author: textOf(m.Artist?.value ?? "") || "Unknown",
        license: textOf(m.LicenseShortName?.value ?? ""),
        licenseUrl: m.LicenseUrl?.value ?? null,
        wikitext: page.revisions?.[0]?.slots.main.content,
      });
    }
    // A file asked for under another spelling answers under its own: keep both.
    for (const n of [...(body.query?.normalized ?? []), ...(body.query?.redirects ?? [])]) {
      const to = out.get(n.to.replace(/^File:/, ""));
      if (to) out.set(n.from.replace(/^File:/, ""), to);
    }
    console.error(`commons ${Math.min(i + 50, unique.length)}/${unique.length}`);
    await sleep(2000);
  }
  return out;
}

const photoOf = (i: Info, shape: "photo" | "banner"): PlacePhoto => ({
  file: i.file,
  page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(i.file.replace(/ /g, "_"))}`,
  src: i.src,
  width: i.width,
  height: i.height,
  author: i.author,
  license: i.license,
  licenseUrl: i.licenseUrl,
  shape,
});

/** One entry per line, sorted: thousands of places, and a rerun's diff shows what changed. */
function serialise(
  read: string,
  photos: Record<string, PlacePhoto>,
  index: Record<string, string>,
) {
  const block = (o: Record<string, unknown>) =>
    Object.keys(o)
      .sort()
      .map((k) => `    ${JSON.stringify(k)}: ${JSON.stringify(o[k])}`)
      .join(",\n");
  return `{\n  "read": ${JSON.stringify(read)},\n  "photos": {\n${block(photos)}\n  },\n  "index": {\n${block(index)}\n  }\n}\n`;
}

async function main() {
  const previous = existsSync(OUT)
    ? (JSON.parse(readFileSync(OUT, "utf8")) as {
        photos: Record<string, PlacePhoto>;
        index: Record<string, string>;
      })
    : { photos: {}, index: {} };
  const index: Record<string, string> = { ...previous.index };

  // The world list, by the item each profile names.
  const profiles = JSON.parse(readFileSync(join(process.cwd(), WORLD_PROFILES_FILE), "utf8")) as {
    places: Record<string, { wikidata: string }>;
  };
  for (const [slug, p] of Object.entries(profiles.places)) index[`world:${slug}`] = p.wikidata;

  // Places by an identifier Wikidata holds.
  const wanted = new Map<string, Set<string>>();
  const scheme = flag("scheme");
  if (scheme) wanted.set(scheme, new Set((flag("values") ?? "").split(",").filter(Boolean)));
  if (args.includes("--from-db")) {
    const { db } = await import("@/lib/db/client");
    const { sql } = await import("drizzle-orm");
    const { rowsOf } = await import("@/lib/db/rows");
    const rows = rowsOf<{ scheme: string; value: string }>(
      await db.execute(
        sql`SELECT DISTINCT scheme, value FROM jurisdiction_identifiers WHERE superseded_at IS NULL`,
      ),
    );
    for (const r of rows) wanted.set(r.scheme, (wanted.get(r.scheme) ?? new Set()).add(r.value));
  }
  if (args.includes("--all")) {
    for (const entry of placesConfig.identifierSchemes) {
      // Countries come from the world list, by the item each profile names.
      if (!entry.wikidataProperty || entry.key === "iso_3166_1") continue;
      const rows = await sparql(
        `SELECT ?i ?v WHERE { ?i wdt:${entry.wikidataProperty} ?v . FILTER NOT EXISTS { ?i wdt:P576 ?end } }`,
      );
      for (const r of rows) index[`${entry.key}:${r.v}`] = r.i!.replace(/^.*\//, "");
      console.error(`${entry.key}: ${rows.length} places`);
    }
  }
  for (const [key, values] of wanted) {
    if (key === "wikidata") {
      for (const v of values) index[`wikidata:${v}`] = v;
      continue;
    }
    const entry = placesConfig.identifierSchemes.find((s) => s.key === key);
    const property = entry?.wikidataProperty;
    if (!property) continue;
    const list = [...values];
    for (let i = 0; i < list.length; i += 200) {
      const rows = await sparql(
        `SELECT ?i ?v WHERE { VALUES ?v { ${list
          .slice(i, i + 200)
          .map((v) => JSON.stringify(v))
          .join(" ")} } ?i wdt:${property} ?v . FILTER NOT EXISTS { ?i wdt:P576 ?end } }`,
      );
      for (const r of rows) index[`${key}:${r.v}`] = r.i!.replace(/^.*\//, "");
    }
    console.error(`${key}: ${list.length} codes`);
  }

  // `--scheme` alone reads only the places it names; any other run reads every place indexed.
  const asked = scheme && !args.includes("--all") && !args.includes("--from-db");
  const items = asked
    ? [
        ...new Set(
          [...(wanted.get(scheme) ?? [])].flatMap((v) => {
            const item = index[`${scheme}:${v}`];
            return item ? [item] : [];
          }),
        ),
      ]
    : [...new Set(Object.values(index))];
  const files = new Map<
    string,
    { image?: string; banner?: string; aerial?: string; night?: string }
  >();
  for (let i = 0; i < items.length; i += 200) {
    const rows = await sparql(
      `SELECT ?i ?img ?banner ?aerial ?night WHERE { VALUES ?i { ${items
        .slice(i, i + 200)
        .map((q) => `wd:${q}`)
        .join(
          " ",
        )} } OPTIONAL { ?i wdt:P18 ?img } OPTIONAL { ?i wdt:P948 ?banner } OPTIONAL { ?i wdt:P8592 ?aerial } OPTIONAL { ?i wdt:P3451 ?night } }`,
    );
    for (const r of rows) {
      const q = r.i!.replace(/^.*\//, "");
      const f = files.get(q) ?? {};
      f.image ??= r.img ? fileOf(r.img) : undefined;
      f.banner ??= r.banner ? fileOf(r.banner) : undefined;
      f.aerial ??= r.aerial ? fileOf(r.aerial) : undefined;
      f.night ??= r.night ? fileOf(r.night) : undefined;
      files.set(q, f);
    }
  }

  const banners = await commonsInfo(
    [...files.values()].flatMap((f) => (f.banner ? [f.banner] : [])),
    true,
  );
  const sources = new Map<string, string>();
  for (const [file, info] of banners) {
    const source = bannerSource(info.wikitext);
    if (source) sources.set(file, source);
  }
  const photos = await commonsInfo(
    [
      ...[...files.values()].flatMap((f) =>
        [f.image, f.aerial, f.night].filter((x): x is string => !!x),
      ),
      ...sources.values(),
      ...Object.values(PHOTO_CHOICES).map((c) => c.file),
    ],
    false,
  );

  const out: Record<string, PlacePhoto> = { ...previous.photos };
  let found = 0;
  for (const [q, f] of files) {
    const original = f.banner ? photos.get(sources.get(f.banner) ?? "") : undefined;
    const image = f.image ? photos.get(f.image) : undefined;
    const banner = f.banner ? banners.get(f.banner) : undefined;
    const aerial = f.aerial ? photos.get(f.aerial) : undefined;
    const night = f.night ? photos.get(f.night) : undefined;
    const person = PHOTO_CHOICES[q] ? photos.get(PHOTO_CHOICES[q].file) : undefined;
    const chosen = free(person)
      ? {
          ...photoOf(person, person.width / person.height > 2.4 ? "banner" : "photo"),
          ...(PHOTO_CHOICES[q]!.position ? { position: PHOTO_CHOICES[q]!.position } : {}),
        }
      : fullPhoto(original)
        ? photoOf(original, "photo")
        : fullPhoto(image)
          ? photoOf(image, "photo")
          : fullPhoto(aerial)
            ? photoOf(aerial, "photo")
            : fullPhoto(night)
              ? photoOf(night, "photo")
              : strip(original)
                ? photoOf(original, "banner")
                : strip(banner)
                  ? photoOf(banner, "banner")
                  : null;
    if (chosen) {
      out[q] = chosen;
      found++;
    }
  }
  writeFileSync(OUT, serialise(new Date().toISOString().slice(0, 10), out, index));
  console.log(`${items.length} places; ${found} with a photograph`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

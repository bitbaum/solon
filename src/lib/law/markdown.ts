/**
 * An act as Markdown, for a reader that is a model: front matter that says what
 * the act is, who made it, where it was read and the hash that proves the copy,
 * then one heading per provision, its anchor on the heading's line so a citation
 * (`#art_64`) is never guessed.
 */
import { authorityOf, chainOf } from "./places";
import type { ActView } from "./view";

export function actToMarkdown(act: ActView, site: string): string {
  const { version } = act;
  const place = authorityOf(act.authority)?.name ?? act.authority;
  const front = [
    "---",
    `title: ${JSON.stringify(act.title ?? act.systematicNumber ?? act.id)}`,
    `id: ${act.id}`,
    `authority: ${act.authority}`,
    `place: ${JSON.stringify(place)}`,
    `applies_also_from: [${chainOf(act.authority)
      .slice(1)
      .map((a) => a.key)
      .join(", ")}]`,
    `kind: ${act.kind}`,
    `in_force: ${act.inForce}`,
    ...(act.systematicNumber ? [`number: ${JSON.stringify(act.systematicNumber)}`] : []),
    ...(act.officialUrl ? [`publisher_url: ${act.officialUrl}`] : []),
    `solon_url: ${site}/law/${act.id}`,
    ...(version
      ? [
          `language: ${version.lang}`,
          `in_force_from: ${version.inForceFrom}`,
          `date_basis: ${version.dateBasis}`,
          `status: ${version.status}`,
          ...(version.sourceUrl ? [`source_url: ${version.sourceUrl}`] : []),
          `read_on: ${version.retrievedOn}`,
          `sha256: ${version.contentSha256}`,
          `provisions: ${version.provisionCount}`,
        ]
      : ["text: not held"]),
    "---",
  ];
  const body = act.provisions.map(
    (p) => `## ${p.heading || p.path} {#${p.path}}\n\n${p.text.trim()}`,
  );
  return [front.join("\n"), `# ${act.title ?? act.id}`, ...body].join("\n\n") + "\n";
}

import { LAW_AUTHORITIES } from "@/lib/config/law";
import { SITE } from "@/lib/law/site";
import { chainOf, levelOf } from "@/lib/law/places";

export const dynamic = "force-static";

/**
 * The map for a model that reads the web: what Solon holds, the one MCP
 * endpoint that searches and reads it, the plain URLs for each kind of page,
 * and how to cite. Written from the configuration, so a new place appears here
 * the day it is added.
 */
export function GET() {
  const lines = [
    "# Solon",
    "",
    "> The published law of Switzerland (Confederation, 26 cantons, communes) and Liechtenstein, held as data: every act with its publisher, the date it applies from, the page it was read from and the SHA-256 of that copy. Text is the publisher's, never summarised.",
    "",
    "## Use the tools, not the pages",
    "",
    `- [MCP server](${SITE}/api/mcp): tools law_authorities, law_search, law_find_acts, law_read_act, law_read_provision, law_changes. Start with law_authorities for the keys.`,
    `- [REST](${SITE}/api/v1/law/search?q=Mietzins): JSON twins of the same tools under /api/v1/law/{acts,search,provisions,changes,coverage}.`,
    "",
    "## Plain URLs",
    "",
    `- ${SITE}/law : search by title or by words of the text, and browse by place`,
    `- ${SITE}/law/place/{authority key} : every act of one place, and the places above it whose law applies there`,
    `- ${SITE}/law/{act id} : an act; ?at={anchor} opens a provision, e.g. ?at=art_64`,
    `- ${SITE}/api/v1/law/acts/{act id}?format=md : the whole act as Markdown, provenance in the front matter`,
    "",
    "## Which law applies where",
    "",
    "Federal law applies in every canton and commune of Switzerland. A canton's law applies in its communes. A commune's law applies only there. The European Union's law applies in each of its member states, above the state's own (Estonia and Luxembourg among those Solon holds). Each place page and each act's front matter lists the places above it.",
    "",
    "## Places",
    "",
    ...LAW_AUTHORITIES.filter((a) => levelOf(a) !== "commune").map(
      (a) =>
        `- [${a.label}](${SITE}/law/place/${a.key}) (${a.key})${
          chainOf(a.key).length > 1 ? `, within ${chainOf(a.key)[1]!.label}` : ""
        }`,
    ),
    `- ${LAW_AUTHORITIES.filter((a) => levelOf(a) === "commune").length} communes: ${SITE}/law/place/{key}, keys from law_authorities`,
    "",
    "## Citing",
    "",
    "Cite the act's title and number, the anchor, and the sha256 from the response. If a version's date_basis is `retrieved`, the publisher did not state when it applies from; say it was read on that date.",
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * A Drupal site's listing of acts, the format the Parliament of the Republic
 * of South Ossetia publishes its laws in (PARLIAMENTRSO in src/lib/config/law):
 * a taxonomy term page of ten rows, each a title linked to `/node/<id>`, the
 * day the page was created on the site and the start of the text. A format
 * reader only: which terms, which authority and which kinds are config.
 *
 * The listing page of a taxonomy term is the one place the rows are: the
 * menus and "latest news" blocks of the same page also link to nodes, so only
 * links inside a views row's title field count.
 */
import { decodeEntities } from "./html-text";

export interface ListedNode {
  /** The node number: `/node/5546` is `5546`. */
  id: string;
  title: string;
  /** The day the site created the page, `DD/MM/YY` as printed ("воскресенье, 25/10/26"); not the day the act was adopted. */
  listed: string | null;
}

const TITLE = /<h3 class="field-content"><a href="\/node\/(\d+)">([\s\S]*?)<\/a><\/h3>/;
const CREATED = /views-field-created">\s*<span class="field-content">([^<]*)<\/span>/;

/** The acts a listing page holds, in page order. A page past the last holds none. */
export function parseListing(html: string): ListedNode[] {
  const rows: ListedNode[] = [];
  for (const chunk of html.split('<div class="views-row').slice(1)) {
    const title = TITLE.exec(chunk);
    if (!title) continue;
    rows.push({
      id: title[1]!,
      title: decodeEntities(title[2]!.replace(/<[^>]+>/g, ""))
        .replace(/\s+/g, " ")
        .trim(),
      listed: /(\d{2}\/\d{2}\/\d{2})/.exec(CREATED.exec(chunk)?.[1] ?? "")?.[1] ?? null,
    });
  }
  return rows;
}

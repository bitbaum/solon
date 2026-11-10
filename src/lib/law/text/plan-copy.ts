/**
 * Reading a copy of a law the plan chose (src/lib/law/plan): a Wikisource page
 * or a document someone other than the publisher keeps. Pure: bytes in, text
 * and articles out, for any language the article words below cover.
 *
 * A copy is checked before it is kept: it must cut into articles, and where
 * the index records the year of the last amendment, the copy must mention that
 * year or a later one somewhere. A copy that names no year since is an older
 * edition, and storing it would show a reader a law that no longer applies.
 */
import { WHOLE_ACT, type Provision } from "./fedlex";
import { blockText } from "./html-text";

/** The REST address that serves a Wikisource page's rendered HTML. */
export function wikisourceRestUrl(pageUrl: string): string {
  const url = new URL(pageUrl);
  const title = url.pathname.replace(/^\/wiki\//, "");
  return `${url.origin}/api/rest_v1/page/html/${title}`;
}

/** A Wikisource page's own title, from its address: "Конституция Российской Федерации". */
export const wikisourceTitle = (pageUrl: string) =>
  decodeURIComponent(new URL(pageUrl).pathname.replace(/^\/wiki\//, "")).replace(/_/g, " ");

/**
 * The words of a Wikisource page, without what Wikisource adds around them: the header box,
 * the parts marked not for export, footnote markers and the notes, links to other projects.
 */
export function wikisourceText(html: string): string {
  const body = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<sup\b[^>]*class="[^"]*\b(?:reference|mw-ref)\b[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, "")
    .replace(/<ol\b[^>]*class="[^"]*\b(?:references|mw-references)\b[^"]*"[\s\S]*?<\/ol>/gi, "")
    // An inserted article is numbered with a superscript (Статья 67<sup>1</sup>): it is 67.1.
    .replace(/(\d)\s*<sup\b[^>]*>\s*(\d+)\s*(\*?)\s*<\/sup>/gi, "$1.$2$3");
  return dropMarked(body, [
    "headertemplate",
    "ws-noexport",
    "ws-source",
    "navbox",
    "licenseContainer",
  ]);
}

/** Removes every element whose class names one of `classes`, with all it contains. */
function dropMarked(html: string, classes: readonly string[]): string {
  let out = html;
  for (const name of classes) {
    for (;;) {
      const open = new RegExp(`<(\\w+)\\b[^>]*class="[^"]*\\b${name}\\b[^"]*"[^>]*>`, "i").exec(
        out,
      );
      if (!open) break;
      const tag = open[1]!.toLowerCase();
      // Find the matching close tag, counting nested elements of the same name.
      const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
      re.lastIndex = open.index + open[0].length;
      let depth = 1;
      let end = out.length;
      for (let m = re.exec(out); m; m = re.exec(out)) {
        depth += m[1] ? -1 : m[0].endsWith("/>") ? 0 : 1;
        if (depth === 0) {
          end = m.index + m[0].length;
          break;
        }
      }
      out = out.slice(0, open.index) + out.slice(end);
    }
  }
  return blockText(out);
}

/**
 * The words that begin an article, in the languages constitutions are written in, each before
 * its number: Статья 1, Стаття 1, Artikel 1, Art. 1, Článek 1, მუხლი 1. Hungarian writes the
 * number first ("1. cikk").
 */
const ARTICLE_WORDS = [
  "Статья",
  "Стаття",
  "Артыкул",
  "Член",
  "Чл\\.",
  "Članak",
  "Član",
  "Člen",
  "Článek",
  "Článok",
  "Čl\\.",
  "Artykuł",
  "Art\\.",
  "Article",
  "Artikel",
  "Artikkel",
  "Artículo",
  "Articolo",
  "Artigo",
  "Articolul",
  "Artikla",
  "Straipsnis",
  "Pants",
  "Section",
  "Madde",
  "Pasal",
  "Neni",
  "Hoofdstuk",
  "მუხლი",
  "Հոդված",
  "Maddə",
  "Модда",
  "Бап",
  "Зүйл",
];
const ARTICLE = new RegExp(
  `^(?:(?:${ARTICLE_WORDS.join("|")})\\s*(\\d+(?:[.-]\\d+)?)|(\\d+(?:[.-]\\d+)?)\\.\\s*(?:cikk|straipsnis|pants))(?=[\\s.:)*]|$)`,
  "iu",
);
const CHAPTER =
  /^(Глава|Розділ|Раздел|Раздзел|Chapter|Chapitre|Titre|Title|Kapitel|Abschnitt|Titolo|Capitolo|Título|Capítulo|Rozdział|Hlava|Poglavlje|Glava|Fejezet|Bölüm|Bab|თავი|Գլուխ)\s+([IVXLCDM\d]+)\b/iu;

/** A copy's text cut into its articles, chapters as headings between them. */
export function cutArticles(text: string): Provision[] {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const out: Provision[] = [];
  const used = new Map<string, number>();
  const unique = (path: string) => {
    const n = (used.get(path) ?? 0) + 1;
    used.set(path, n);
    return n === 1 ? path : `${path}-${n}`;
  };
  let current: Provision | null = null;
  const flush = () => {
    if (current && current.text.trim()) out.push(current);
    current = null;
  };
  for (const line of lines) {
    const article = ARTICLE.exec(line);
    const chapter = article ? null : CHAPTER.exec(line);
    if (article) {
      flush();
      const number = (article[1] ?? article[2])!.replace(/[.-]/g, "_");
      current = { path: unique(`art_${number}`), heading: line, text: line };
    } else if (chapter) {
      flush();
      current = { path: unique(`ch_${chapter[2]!.toLowerCase()}`), heading: line, text: line };
    } else {
      current ??= { path: "preamble", heading: "", text: "" };
      current.text = current.text ? `${current.text}\n${line}` : line;
    }
  }
  flush();
  if (!out.some((p) => p.path.startsWith("art_"))) {
    return lines.length ? [{ path: WHOLE_ACT, heading: lines[0]!, text: lines.join("\n") }] : [];
  }
  return out;
}

/** The latest year a text mentions, 1800 to 2099; null when it names none. */
export function latestYear(text: string): number | null {
  const years = (text.match(/(?<!\d)(1[89]\d\d|20\d\d)(?!\d)/g) ?? []).map(Number);
  return years.length ? Math.max(...years) : null;
}

/** Why a copy cannot be kept, or null when it can. */
export function refuseCopy(
  provisions: readonly Provision[],
  text: string,
  amended: number | null,
): string | null {
  const articles = provisions.filter((p) => p.path.startsWith("art_")).length;
  if (articles < 5) return `only ${articles} articles found: not a whole constitution`;
  const latest = latestYear(text);
  if (amended && (latest === null || latest < amended)) {
    return `the copy names no year since ${latest ?? "any"}, and the index records amendments in ${amended}: an older edition`;
  }
  return null;
}

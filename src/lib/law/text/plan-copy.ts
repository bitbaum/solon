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
  // The REST API takes the title as one segment: a subpage's "/" is encoded.
  const title = decodeURIComponent(url.pathname.replace(/^\/wiki\//, ""));
  return `${url.origin}/api/rest_v1/page/html/${encodeURIComponent(title)}`;
}

/** The address of a page of the same wiki, by its title. */
export const wikisourcePageUrl = (origin: string, title: string) =>
  `${origin}/wiki/${encodeURIComponent(title.replace(/ /g, "_")).replace(/%2F/g, "/")}`;

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
 * its number: Статья 1, Стаття 1, Artikel 1, Art. 1º, Article premier, Article I, § 1, Článek 1,
 * მუხლი 1, المادة 1. Hungarian writes the number first ("1. cikk"); Chinese and Japanese
 * write 第一条.
 */
const ARTICLE_WORDS = [
  "Статья",
  "Стаття",
  "Артыкул",
  "Член",
  "Члан",
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
  "Madde",
  "Pasal",
  "Neni",
  "მუხლი",
  "Հոդված",
  "Maddə",
  "Модда",
  "Бап",
  "Зүйл",
  "المادة",
  "مادة",
  "الفصل",
  "فصل",
];
/**
 * Words that number an article only in a text that has no article word of its own: "§ 1" in
 * Norway's Grunnlov, "Section 1" in a constitution of sections. Where the text has articles,
 * its sections are parts of them (Liberland's Article 1, Section 2).
 */
const SECONDARY_WORDS = ["Section", "§"];
const NUMBER =
  "(\\d+(?:[.-]\\d+)?|premier|première|primo|[IVXLC]+)(?:\\s?(?:º|°|ª|er|ᵉʳ|bis|ter))?";
const ARTICLE = new RegExp(
  `^(?:(?:${ARTICLE_WORDS.join("|")})\\s*\\(?${NUMBER}\\)?|(\\d+(?:[.-]\\d+)?)\\.\\s*(?:cikk|straipsnis|pants))(?=[\\s.:)*—–-]|$)`,
  "iu",
);
const SECONDARY = new RegExp(
  `^(?:(?:${SECONDARY_WORDS.join("|")})\\s*\\(?${NUMBER}\\)?|(\\d+(?:[.-]\\d+)?)\\.\\s*(?:cikk|straipsnis|pants))(?=[\\s.:)*—–-]|$)`,
  "iu",
);
/** 第一条, 第十二條, 第3条: the CJK article, its number in figures or in kanji. */
const CJK_ARTICLE = /^第([0-9０-９]+|[〇一二三四五六七八九十百千]+)[条條]/u;

const CHAPTER =
  /^(Глава|Розділ|Раздел|Раздзел|Chapter|Chapitre|Titre|Title|Kapitel|Abschnitt|Titolo|Capitolo|Título|Capítulo|Rozdział|Hlava|Poglavlje|Glava|Fejezet|Bölüm|Bab|თავი|Գլուխ)\s+([IVXLCDM\d]+)\b/iu;

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
function romanValue(text: string): number | null {
  if (!/^[IVXLC]+$/i.test(text)) return null;
  let total = 0;
  const digits = text
    .toUpperCase()
    .split("")
    .map((c) => ROMAN[c]!);
  digits.forEach((d, i) => (total += d < (digits[i + 1] ?? 0) ? -d : d));
  return total;
}
const KANJI: Record<string, number> = {
  〇: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};
function kanjiValue(text: string): number {
  const ascii = text.replace(/[０-９]/g, (d) => String(d.charCodeAt(0) - 0xff10));
  if (/^\d+$/.test(ascii)) return Number(ascii);
  let total = 0;
  let current = 0;
  for (const ch of text) {
    if (ch === "千" || ch === "百" || ch === "十") {
      total += (current || 1) * (ch === "千" ? 1000 : ch === "百" ? 100 : 10);
      current = 0;
    } else current = KANJI[ch] ?? 0;
  }
  return total + current;
}

/** An article's number as a path segment: 67.1 → 67_1, premier → 1, XIV → 14. */
function articleNumber(raw: string): string {
  const arabic = raw.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  if (/^(premier|première|primo)$/i.test(arabic)) return "1";
  const roman = romanValue(arabic);
  if (roman !== null) return String(roman);
  return arabic.replace(/[.-]/g, "_");
}

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
  // Sections and paragraphs number the articles only where the text has no article word.
  const primary = lines.some((l) => ARTICLE.test(l) || CJK_ARTICLE.test(l));
  let current: Provision | null = null;
  const flush = () => {
    if (current && current.text.trim()) out.push(current);
    current = null;
  };
  for (const line of lines) {
    const western = line.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
    const article = ARTICLE.exec(western) ?? (primary ? null : SECONDARY.exec(western));
    const cjk = article ? null : CJK_ARTICLE.exec(line);
    const chapter = article || cjk ? null : CHAPTER.exec(line);
    if (article || cjk) {
      // Article 1 again, after others: a second printing of the same text begins (Japan's page
      // holds three). The first is the text; the rest is not read.
      if (
        out.some((p) => p.path === "art_1") &&
        (cjk ? String(kanjiValue(cjk[1]!)) : articleNumber((article![1] ?? article![2])!)) ===
          "1" &&
        (current?.path ?? "").startsWith("art_")
      ) {
        flush();
        break;
      }
      flush();
      const number = cjk
        ? String(kanjiValue(cjk[1]!))
        : articleNumber((article![1] ?? article![2])!);
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

/**
 * Where a Wikisource page that is an index of editions leads: a full text among its subpages
 * ("Gehele tekst", "full text"), else the edition whose title names the latest year. Null when
 * the page names neither. Pure: the page's HTML and its own title in, a title out.
 */
function linksOf(html: string, title: string) {
  return [...html.matchAll(/<a\b[^>]*href="\.\/([^"#?]+)"[^>]*>([^<]*)<\/a>/g)]
    .map((m) => ({ target: decodeURIComponent(m[1]!).replace(/_/g, " "), label: m[2]!.trim() }))
    .filter((l) => !/^[^/]*:/.test(l.target) && l.target !== title);
}

/** The words of five letters or more in a title: what an edition of the same document shares with it. */
const significant = (text: string) =>
  new Set((text.toLowerCase().match(/[\p{L}]{5,}/gu) ?? []).filter((w) => !/^\d+$/.test(w)));

/**
 * A page's own subpages, in the order the page lists them (the chapters of a constitution split
 * across pages). Three or more: the text is theirs, read one after the other.
 */
export function subpagesOf(html: string, title: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of linksOf(html, title)) {
    if (l.target.startsWith(`${title}/`) && !seen.has(l.target)) {
      seen.add(l.target);
      out.push(l.target);
    }
  }
  return out;
}

export function editionToFollow(html: string, title: string): string | null {
  // An edition of the same document shares a word with its title; a link to a law about
  // something else (a copyright act a page cites) does not, and is never followed.
  const own = significant(title);
  const links = linksOf(html, title).filter(
    (l) => l.target.startsWith(`${title}/`) || [...significant(l.target)].some((w) => own.has(w)),
  );
  const full = links.find(
    (l) =>
      l.target.startsWith(`${title}/`) &&
      /gehele tekst|full text|texte intégral|texto (?:integral|completo)|volltext|全文|полный текст/i.test(
        `${l.target} ${l.label}`,
      ),
  );
  if (full) return full.target;
  const dated = links
    .map((l) => ({ ...l, year: latestYear(`${l.target} ${l.label}`) }))
    .filter((l) => l.year !== null);
  if (dated.length === 0) return null;
  dated.sort((a, b) => b.year! - a.year!);
  return dated[0]!.target;
}

/** A Markdown document's words: its heading marks, emphasis and link syntax taken away. */
export function markdownText(markdown: string): string {
  return markdown
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, "$1$2")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\r\n?/g, "\n");
}

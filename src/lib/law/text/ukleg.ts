/**
 * The United Kingdom's legislation from legislation.gov.uk (UKLEG in
 * src/lib/config/law), The National Archives' official service: the register
 * read from its Atom feeds, a year of one type at a time (`/ukpga/2018/data.feed`),
 * and each item's current ("revised") version as Crown Legislation Markup
 * Language (CLML) XML (`/ukpga/2018/12/data.xml`), cut into its sections and
 * schedules under the ids the XML gives them (`section-3`, `schedule-1`).
 *
 * What "in force" means here. UK law is amended in place: an act can be partly
 * repealed, and the revised version states it provision by provision
 * (`Status="Repealed"`, or `"Prospective"` for a provision not yet commenced).
 * The register therefore lists every item the feeds list and keeps it in force
 * until its text says otherwise. The text read is the revised version as it
 * stands on the day it is read: repealed and prospective provisions are left
 * out of the provisions (the snapshot keeps every word as published), and an
 * item every one of whose provisions is repealed (or, for a statutory
 * instrument, revoked) is out of force, which the importer records on the act
 * and does not store a text for.
 *
 * The version's first day is the publisher's: the revised version's own start
 * date, else its point-in-time date, else the day it came into force, else the
 * day it was enacted or made. See `versionDateOf`.
 */
import { UKLEG } from "@/lib/config/law";
import type { Provision } from "./fedlex";
import { WHOLE_ACT } from "./fedlex";
import { decodeEntities } from "./html-text";

/* -------------------------------------------------------------------- XML -- */

/** An element of an XML document: its qualified name, attributes and children (elements and text). */
export interface XNode {
  name: string;
  attrs: Record<string, string>;
  children: (XNode | string)[];
}

const TOKEN =
  /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE(?:[^>[]|\[[\s\S]*?\])*>|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)|</y;

const ATTRIBUTE = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/** A non-validating parse: enough for CLML and Atom, both well-formed. Throws when there is no element. */
export function parseXml(xml: string): XNode {
  const root: XNode = { name: "#document", attrs: {}, children: [] };
  const stack: XNode[] = [root];
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while (TOKEN.lastIndex < xml.length && (m = TOKEN.exec(xml))) {
    const top = stack[stack.length - 1]!;
    if (m[1] !== undefined) top.children.push(m[1]);
    else if (m[2] !== undefined) {
      // A closing tag closes the nearest open element of that name; a stray one is ignored.
      const at = stack.map((n) => n.name).lastIndexOf(m[2]);
      if (at > 0) stack.length = at;
    } else if (m[3] !== undefined) {
      const attrs: Record<string, string> = {};
      for (const a of m[4]!.matchAll(ATTRIBUTE)) attrs[a[1]!] = decodeEntities(a[2] ?? a[3] ?? "");
      const node: XNode = { name: m[3], attrs, children: [] };
      top.children.push(node);
      if (m[5] !== "/") stack.push(node);
    } else if (m[6] !== undefined) top.children.push(decodeEntities(m[6]));
    // A lone "<" that starts no token is skipped by the sticky regex's last alternative.
  }
  const element = root.children.find((c): c is XNode => typeof c !== "string");
  if (!element) throw new Error("not XML");
  return element;
}

const local = (name: string) => name.slice(name.indexOf(":") + 1);
const isNode = (c: XNode | string): c is XNode => typeof c !== "string";

/** The child elements of `node`, optionally only those named `name` (by local name). */
const kids = (node: XNode, name?: string): XNode[] =>
  node.children.filter(isNode).filter((c) => !name || local(c.name) === name);

/** The first descendant (or the node itself) named `name`, depth first. */
function find(node: XNode, name: string): XNode | null {
  if (local(node.name) === name) return node;
  for (const child of kids(node)) {
    const found = find(child, name);
    if (found) return found;
  }
  return null;
}

/* ---------------------------------------------------------------- the feed -- */

/** One item a feed lists. */
export interface UkAct {
  /** The item's address: `ukpga/2018/12`. */
  path: string;
  /** The type in the address: `ukpga`. */
  type: string;
  /** Its title as the feed gives it, in English (the short title). */
  title: string;
  /** The day the feed says the item was last updated, when it says. */
  updated: string | null;
}

export interface UkFeed {
  acts: UkAct[];
  skipped: { row: string; reason: string }[];
  /** Whether the feed says a further page follows. */
  more: boolean;
  /** How many entries the page held, listed or not. */
  entries: number;
}

const SITE = /^https?:\/\/www\.legislation\.gov\.uk\/(?:id\/)?/;
/** type, year (or regnal year, `Geo5/15-16`), number. */
const ADDRESS = /^[a-z]+(?:\/[A-Za-z0-9-]+)+\/\d+$/;

const text = (node: XNode | null | undefined): string =>
  node
    ? node.children
        .map((c) => (isNode(c) ? text(c) : c))
        .join("")
        .replace(/\s+/g, " ")
        .trim()
    : "";

const dayOf = (value: string | undefined | null) =>
  value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;

/** `http://www.legislation.gov.uk/id/ukpga/2018/12` → `ukpga/2018/12`; null for anything that is not an item's address. */
export function addressOf(uri: string | undefined): string | null {
  if (!uri) return null;
  const path = uri
    .trim()
    .replace(SITE, "")
    .replace(/[?#].*$/, "")
    .replace(/(?:\/(?:contents|enacted|made|data\.\w+))+$/, "")
    .replace(/\/$/, "");
  return ADDRESS.test(path) ? path : null;
}

/**
 * The items of one page of an Atom feed. An item of a type that is not read, or
 * without a title or an address, is left out with why. Throws when the bytes
 * are not a feed, saying what they are.
 */
export function parseFeed(
  xml: string,
  kinds: readonly string[] = Object.keys(UKLEG.kinds),
): UkFeed {
  let root: XNode;
  try {
    root = parseXml(xml);
  } catch {
    throw new Error(`not a feed: ${xml.slice(0, 120).replace(/\s+/g, " ")}`);
  }
  if (local(root.name) !== "feed") {
    throw new Error(`not a feed: <${root.name}> ${text(root).slice(0, 100)}`);
  }
  const acts: UkAct[] = [];
  const skipped: { row: string; reason: string }[] = [];
  const entries = kids(root, "entry");
  for (const entry of entries) {
    const links = kids(entry, "link");
    const path =
      addressOf(text(kids(entry, "id")[0])) ??
      links.map((l) => addressOf(l.attrs.href)).find(Boolean) ??
      null;
    const title = text(kids(entry, "title")[0]);
    if (!path) skipped.push({ row: title || "(no title)", reason: "no address" });
    else if (!title) skipped.push({ row: path, reason: "no title" });
    else if (!kinds.includes(path.split("/")[0]!)) {
      skipped.push({ row: path, reason: "a type not read" });
    } else {
      acts.push({
        path,
        type: path.split("/")[0]!,
        title,
        updated: dayOf(text(kids(entry, "updated")[0])),
      });
    }
  }
  const number = (name: string) => {
    const word = text(kids(root, name)[0]);
    return word !== "" && Number.isFinite(Number(word)) ? Number(word) : null;
  };
  const next = kids(root, "link").some((l) => l.attrs.rel === "next");
  const morePages = number("morePages");
  const page = number("page");
  const total = number("totalResults");
  const per = number("itemsPerPage");
  const more = next
    ? true
    : morePages !== null
      ? morePages > 0
      : total !== null && per
        ? (page ?? 1) * per < total
        : entries.length >= 20;
  return { acts, skipped, more, entries: entries.length };
}

export const listUrlOf = (type: string, year: number, page: number) =>
  UKLEG.listUrl
    .replace("{type}", type)
    .replace("{year}", String(year))
    .replace("{page}", String(page));
export const xmlUrlOf = (path: string) => UKLEG.xmlUrl.replace("{path}", path);
export const pageUrlOf = (path: string) => UKLEG.pageUrl.replace("{path}", path);

/**
 * The seconds between requests robots.txt asks for the robot named `agent`
 * (else for every robot), in milliseconds; null when it names none.
 */
export function crawlDelayMs(robots: string, agent = "solon-law-text"): number | null {
  let group: string[] = [];
  let inRules = false;
  const delays = new Map<string, number>();
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const field = m[1]!.toLowerCase();
    if (field === "user-agent") {
      if (inRules) group = [];
      group.push(m[2]!.toLowerCase());
      inRules = false;
    } else {
      inRules = true;
      if (field === "crawl-delay" && Number.isFinite(Number(m[2]))) {
        for (const a of group) delays.set(a, Number(m[2]) * 1000);
      }
    }
  }
  const own = [...delays].find(([a]) => a !== "*" && agent.toLowerCase().includes(a));
  return own?.[1] ?? delays.get("*") ?? null;
}

/* -------------------------------------------------------------------- CLML -- */

/** Elements whose words run on inside a line. Anything else is a block of its own lines. */
const INLINE = new Set([
  "Emphasis",
  "Strong",
  "Underline",
  "SmallCaps",
  "Uppercase",
  "Lowercase",
  "Term",
  "Abbreviation",
  "Acronym",
  "Citation",
  "CitationSubRef",
  "CitationListRef",
  "Addition",
  "Substitution",
  "Repeal",
  "Span",
  "Character",
  "Superior",
  "Inferior",
  "InlineAmendment",
  "Definition",
  "Expanded",
  "ExternalLink",
  "InternalLink",
  "Underlined",
  "Proviso",
  "SignedBy",
  "DateText",
  "Day",
  "Month",
  "Year",
]);

/** The publisher's apparatus, not words of the law: notes, markers and metadata. */
const APPARATUS = new Set([
  "CommentaryRef",
  "FootnoteRef",
  "MarginNoteRef",
  "Commentaries",
  "Footnotes",
  "MarginNotes",
  "Metadata",
  "Contents",
  "ExplanatoryNotes",
  "EarlierOrders",
  "Figure",
  "Image",
]);

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

/** True for an element the revised version marks as no longer, or not yet, law. */
function outOfForce(node: XNode, today: string): boolean {
  const status = node.attrs.Status;
  if (status && /^(repealed|revoked|prospective)$/i.test(status)) return true;
  const start = dayOf(node.attrs.RestrictStartDate);
  return Boolean(start && start > today);
}

/** The words of an inline element, on one line. */
function inlineText(node: XNode, today: string): string {
  return node.children
    .map((c) => {
      if (!isNode(c)) return c;
      const name = local(c.name);
      if (APPARATUS.has(name) || outOfForce(c, today)) return "";
      const inner = inlineText(c, today);
      return name === "Superior" ? [...inner].map((d) => SUPERSCRIPT[d] ?? d).join("") : inner;
    })
    .join("");
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * The lines of a fragment: one per paragraph, per sub-paragraph and per table
 * row; a number ("(1)", "(a)") stands at the head of the line it numbers.
 */
function linesOf(node: XNode, today: string): string[] {
  const out: string[] = [];
  let current = "";
  let prefix = "";
  const push = (line: string) => {
    out.push(prefix ? `${prefix} ${line}` : line);
    prefix = "";
  };
  const flush = () => {
    const line = clean(current);
    current = "";
    if (line) push(line);
  };
  const elements = kids(node);
  for (const child of node.children) {
    if (!isNode(child)) {
      current += child;
      continue;
    }
    const name = local(child.name);
    if (APPARATUS.has(name) || outOfForce(child, today)) continue;
    if (name === "Pnumber") {
      flush();
      // CLML keeps a number's brackets in attributes: <Pnumber PuncBefore="(" PuncAfter=")">1</Pnumber>.
      prefix = clean(
        `${child.attrs.PuncBefore ?? ""}${inlineText(child, today)}${child.attrs.PuncAfter ?? ""}`,
      );
    } else if (
      name === "Number" &&
      local(elements[elements.indexOf(child) + 1]?.name ?? "") === "Title"
    ) {
      // A part's or schedule's number stands with its title: "PART 1 Conditions".
      flush();
      prefix = clean(inlineText(child, today));
    } else if (INLINE.has(name)) {
      current += inlineText({ ...node, children: [child] }, today);
    } else if (name === "tr") {
      flush();
      const cells = kids(child)
        .map((cell) => linesOf(cell, today).join(" "))
        .filter(Boolean);
      if (cells.length > 0) push(cells.join(" | "));
    } else {
      flush();
      const inner = linesOf(child, today);
      if (inner.length > 0) push(inner.shift()!);
      out.push(...inner);
    }
  }
  flush();
  if (prefix) out.push(prefix);
  return out;
}

/** Plain text of a fragment of CLML: one line per paragraph. */
export const clmlText = (node: XNode, today = "9999-12-31"): string =>
  linesOf(node, today).join("\n");

/** What a provision's number and title make: "3 Terms used in this Act". */
const headingOf = (number: string, title: string) => [number, title].filter(Boolean).join(" ");

interface Cut {
  provisions: Provision[];
  /** Sections and schedules in the document that are in force. */
  live: number;
  /** Sections and schedules the revised version marks repealed, revoked or not yet in force. */
  omitted: number;
}

/**
 * The sections of the main body and the schedules, in order, under the ids
 * the XML gives them. Parts, chapters and cross-headings group sections and
 * are not provisions of their own; a schedule is one provision, its
 * paragraphs inside it.
 */
function cut(legislation: XNode, today: string): Cut {
  const provisions: Provision[] = [];
  let live = 0;
  let omitted = 0;
  const prelims = kids(legislation)
    .flatMap((c) => kids(c))
    .find((c) => /Prelims$/.test(local(c.name)));
  if (prelims) {
    const intro = clmlText(prelims, today);
    if (intro)
      provisions.push({ path: "prelims", heading: "Title and introductory text", text: intro });
  }

  const section = (p1: XNode, groupTitle: string) => {
    if (outOfForce(p1, today)) {
      omitted++;
      return;
    }
    const number = clean(
      inlineText(kids(p1, "Pnumber")[0] ?? { name: "", attrs: {}, children: [] }, today),
    );
    const body: XNode = {
      ...p1,
      children: p1.children.filter((c) => !(isNode(c) && local(c.name) === "Pnumber")),
    };
    const title =
      groupTitle ||
      clean(inlineText(kids(p1, "Title")[0] ?? { name: "", attrs: {}, children: [] }, today));
    const content = clmlText(body, today);
    live++;
    provisions.push({
      path: p1.attrs.id || `section-${number || provisions.length}`,
      heading: headingOf(number, title) || p1.attrs.id || "",
      text: content,
    });
  };
  /** Sections under `node`, each with the title of the group it sits in. */
  const sections = (node: XNode, groupTitle: string) => {
    for (const child of kids(node)) {
      const name = local(child.name);
      if (name === "P1") section(child, groupTitle);
      else if (name === "P1group") {
        if (outOfForce(child, today)) {
          omitted += kids(child, "P1").length;
          continue;
        }
        sections(child, clean(inlineText(kids(child, "Title")[0] ?? child, today)));
      } else if (!APPARATUS.has(name)) sections(child, "");
    }
  };
  const body = find(legislation, "Body");
  if (body) sections(body, "");

  const schedules = find(legislation, "Schedules");
  if (schedules) {
    kids(schedules, "Schedule").forEach((schedule, i) => {
      if (outOfForce(schedule, today)) {
        omitted++;
        return;
      }
      const number = clean(inlineText(kids(schedule, "Number")[0] ?? schedule, today));
      const titleBlock = kids(schedule, "TitleBlock")[0];
      const title = titleBlock ? clean(inlineText(titleBlock, today)) : "";
      const rest: XNode = {
        ...schedule,
        children: schedule.children.filter(
          (c) => !(isNode(c) && ["Number", "TitleBlock"].includes(local(c.name))),
        ),
      };
      live++;
      provisions.push({
        path: schedule.attrs.id || `schedule-${i + 1}`,
        heading: headingOf(kids(schedule, "Number").length ? number : `Schedule ${i + 1}`, title),
        text: clmlText(rest, today),
      });
    });
  }
  return { provisions, live, omitted };
}

/** Every path once: a second use of an id is `section-5-2`. */
function unique(provisions: Provision[]): Provision[] {
  const seen = new Map<string, number>();
  return provisions.map((p) => {
    const n = (seen.get(p.path) ?? 0) + 1;
    seen.set(p.path, n);
    return n === 1 ? p : { ...p, path: `${p.path}-${n}` };
  });
}

export type DateBasis = "restrict-start" | "valid" | "coming-into-force" | "enacted" | "made";

/**
 * The first day of the version the XML is, as the publisher states it: the
 * `RestrictStartDate` of the document (the day this revised version begins), else
 * the point-in-time date in its metadata (`dct:valid`), else the day the item came
 * into force, else the day it was enacted (an act) or made (an instrument). A
 * start date after `today` is a version still to come and is not the one in force.
 */
export function versionDateOf(
  legislation: XNode,
  today: string,
): { date: string; basis: DateBasis } | null {
  const past = (d: string | null) => (d && d <= today ? d : null);
  const valid = (name: string) => find(legislation, name);
  const candidates: [string | null, DateBasis][] = [
    [past(dayOf(legislation.attrs.RestrictStartDate)), "restrict-start"],
    [past(dayOf(text(valid("valid")))), "valid"],
    [past(dayOf(valid("DateTime")?.attrs.Date)), "coming-into-force"],
    [past(dayOf(valid("EnactmentDate")?.attrs.Date)), "enacted"],
    [past(dayOf(valid("Made")?.attrs.Date)), "made"],
  ];
  const hit = candidates.find(([d]) => d);
  return hit ? { date: hit[0]!, basis: hit[1] } : null;
}

export interface ParsedClml {
  /** The title, from the XML's metadata. */
  title: string;
  provisions: Provision[];
  /** True when the item has provisions and every one is repealed, revoked or not yet in force. */
  outOfForce: boolean;
  /** Provisions left out because they are repealed, revoked or not yet in force. */
  omitted: number;
  version: { date: string; basis: DateBasis } | null;
}

/** True when the bytes are an item's CLML, not an error or a page in its place. */
export const isClml = (xml: string) => /<(?:\w+:)?Legislation\b/.test(xml.slice(0, 20_000));

/**
 * The provisions of an item as legislation.gov.uk serves its XML. Throws
 * "not CLML" (with the first words) when the bytes are something else. An item
 * with no sections or schedules is one provision, `text`, so none of its words are lost.
 */
export function parseClml(xml: string, today: string): ParsedClml {
  if (!isClml(xml)) throw new Error(`not CLML: ${xml.slice(0, 120).replace(/\s+/g, " ")}`);
  const root = parseXml(xml);
  const legislation = find(root, "Legislation");
  if (!legislation) throw new Error("not CLML: no Legislation element");
  const { provisions, live, omitted } = cut(legislation, today);
  const title = text(find(legislation, "title") ?? find(legislation, "Title"));
  const version = versionDateOf(legislation, today);
  const out = omitted > 0 && live === 0;
  if (provisions.filter((p) => p.path !== "prelims").length > 0 || out) {
    return { title, provisions: unique(provisions), outOfForce: out, omitted, version };
  }
  const whole = clmlText(legislation, today);
  return {
    title,
    provisions: whole ? [{ path: WHOLE_ACT, heading: "", text: whole }] : [],
    outOfForce: false,
    omitted,
    version,
  };
}

/**
 * A place's tax deadlines as a calendar file (RFC 5545), made on the reader's
 * device: one all-day event per action that has a deadline, on its next date,
 * with a reminder two weeks before, the authority's own page as its link and
 * the page that states the date in its description. Nothing is sent anywhere.
 */
import type { PlaceAction } from "./place-view";

/** The next date (UTC) a yearly `MM-DD` falls on, today counting as still to come. */
export function nextOccurrence(monthDay: string, now: Date): Date {
  const [month, day] = monthDay.split("-").map(Number);
  const year = now.getUTCFullYear();
  const today = Date.UTC(year, now.getUTCMonth(), now.getUTCDate());
  const thisYear = Date.UTC(year, month! - 1, day!);
  return new Date(thisYear >= today ? thisYear : Date.UTC(year + 1, month! - 1, day!));
}

const ymd = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");
const stamp = (d: Date) => `${d.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;

/** Text escaped for an iCalendar value (§3.3.11). */
const text = (s: string) =>
  s.replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replaceAll("\n", "\\n");

/** A content line folded at 75 octets (§3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let start = 0;
  let width = 75;
  while (start < bytes.length) {
    let end = Math.min(start + width, bytes.length);
    // Never cut a UTF-8 character in two.
    while (end < bytes.length && (bytes[end]! & 0xc0) === 0x80) end--;
    out.push(new TextDecoder().decode(bytes.slice(start, end)));
    start = end;
    width = 74; // a continuation line starts with a space
  }
  return out.join("\r\n ");
}

export function deadlineCalendar(
  actions: readonly PlaceAction[],
  {
    now,
    summary,
    sourceLabel,
  }: {
    now: Date;
    /** "File your tax return: Canton of Zürich". */
    summary: (action: PlaceAction) => string;
    /** "Where the date is stated". */
    sourceLabel: string;
  },
): string | null {
  const dated = actions.filter((a) => a.deadline);
  if (dated.length === 0) return null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Solon//Places//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const action of dated) {
    const day = nextOccurrence(action.deadline!.monthDay, now);
    const next = new Date(day.getTime() + 86_400_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${action.kind}-${(action.offeredBy.slugPath ?? action.offeredBy.name).replaceAll("/", ".")}-${ymd(day)}@solon`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${ymd(day)}`,
      `DTEND;VALUE=DATE:${ymd(next)}`,
      `SUMMARY:${text(summary(action))}`,
      `URL:${action.url}`,
      `DESCRIPTION:${text(`${action.url}\n${sourceLabel}: ${action.deadline!.source}`)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${text(summary(action))}`,
      "TRIGGER:-P14D",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

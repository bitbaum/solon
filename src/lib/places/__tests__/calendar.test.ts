import { describe, expect, it } from "vitest";
import { deadlineCalendar, nextOccurrence } from "../calendar";
import type { PlaceAction } from "../place-view";

const action = (kind: string, monthDay: string | null): PlaceAction => ({
  kind,
  label: kind,
  url: "https://tax.example/file",
  offeredBy: { slugPath: "testland/northshire", name: "Northshire", levelName: "Shire" },
  deadline: monthDay ? { monthDay, source: "https://tax.example/deadline" } : null,
});
const opts = (now: Date) => ({
  now,
  summary: (a: PlaceAction) => `File your tax return, ${a.offeredBy.name}; by mail`,
  sourceLabel: "Where the date is stated",
});

describe("tax deadlines as a calendar file", () => {
  it("puts a deadline on its next date, today counting as still to come", () => {
    expect(nextOccurrence("03-31", new Date("2026-03-31T18:00:00Z")).toISOString()).toMatch(
      /^2026-03-31/,
    );
    expect(nextOccurrence("03-31", new Date("2026-10-31T09:00:00Z")).toISOString()).toMatch(
      /^2027-03-31/,
    );
  });

  it("makes one all-day event per dated action, with a reminder two weeks before", () => {
    const ics = deadlineCalendar(
      [action("tax_return", "03-31"), action("tax_payment", null)],
      opts(new Date("2026-10-31T09:00:00Z")),
    )!;
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("DTSTART;VALUE=DATE:20270331");
    expect(ics).toContain("DTEND;VALUE=DATE:20270401");
    expect(ics).toContain("TRIGGER:-P14D");
    // Commas and semicolons are escaped, as RFC 5545 asks.
    const unfolded = ics.replaceAll("\r\n ", "");
    expect(unfolded).toContain("SUMMARY:File your tax return\\, Northshire\\; by mail");
    for (const line of ics.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("makes no file when nothing has a date", () => {
    expect(deadlineCalendar([action("tax_payment", null)], opts(new Date()))).toBeNull();
  });
});

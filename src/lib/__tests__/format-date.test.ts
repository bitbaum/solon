import { describe, expect, it } from "vitest";
import { formatDay } from "../format-date";

describe("formatDay", () => {
  it("writes a day the way the reader's language does", () => {
    expect(formatDay("2026-10-23", "de")).toBe("23.10.2026");
    expect(formatDay("2026-10-23", "fr")).toBe("23/10/2026");
    expect(formatDay("2026-10-23", "it")).toBe("23/10/2026");
    expect(formatDay("2026-10-23", "ru")).toBe("23.10.2026");
  });

  it("keeps English in the unambiguous ISO form", () => {
    expect(formatDay("2026-10-23", "en")).toBe("2026-10-23");
  });

  it("does not move a day across midnight and leaves what is not a day alone", () => {
    expect(formatDay("2026-01-01", "de")).toBe("01.01.2026");
    expect(formatDay("2026-12-31", "de")).toBe("31.12.2026");
    expect(formatDay("2026-02-31", "de")).toBe("2026-02-31");
    expect(formatDay("soon", "de")).toBe("soon");
  });
});

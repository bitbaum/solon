/** The law tools against a real, migrated database. Runs only with INTEGRATION=1. */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { runLawTool } from "../tools";

const RUN = process.env.INTEGRATION === "1";

describe.skipIf(!RUN)("law tools", () => {
  it("lists every authority with what is held", async () => {
    const out = await runLawTool("law_authorities", {}, { db });
    expect(out.ok).toBe(true);
    if (out.ok)
      expect((out.result.authorities as { key: string }[]).map((a) => a.key)).toEqual(
        LAW_AUTHORITIES.map((a) => a.key),
      );
  });

  it("searches, finds and reads without inventing anything", async () => {
    const none = await runLawTool("law_search", { query: "qzxwvkjh" }, { db });
    expect(none).toEqual({ ok: true, result: { hits: [] } });
    const acts = await runLawTool("law_find_acts", { number: "no-such-number" }, { db });
    expect(acts).toEqual({ ok: true, result: { acts: [] } });
    const missing = await runLawTool(
      "law_read_provision",
      { act: "00000000-0000-0000-0000-000000000000", path: "art_1" },
      { db },
    );
    expect(missing).toEqual({ ok: false, error: "No such provision in force on that day." });
  });
});

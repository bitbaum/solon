import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/db/client";
import type { ProvisionHit } from "../../search";
import type { Plan } from "../plan";
import { research, webLookupConfigured, type ToolCaller } from "../research";

const plan: Plan = {
  question: "Wie hoch ist die Mindestertragssteuer?",
  authorities: ["ch", "li"],
  terms: [],
  acts: [],
  groups: [["Mindestertragssteuer"]],
  language: "English",
};
const hit = { actId: "a", path: "art_62", heading: "Art. 62", authority: "li" } as ProvisionHit;
const noDb = {} as Database;

describe("looking further before answering", () => {
  it("keeps what the search found when the model needs nothing more, or no model can call tools", async () => {
    const done: ToolCaller = async () => ({ text: "DONE", toolCalls: [] });
    const out = await research({ db: noDb, turns: [], plan, hits: [hit], call: done, env: {} });
    expect(out).toEqual({ hits: [hit], web: [] });
    const broken: ToolCaller = async () => {
      throw new Error("every link failed");
    };
    expect(
      await research({ db: noDb, turns: [], plan, hits: [hit], call: broken, env: {} }),
    ).toEqual({ hits: [hit], web: [] });
  });

  it("offers the web only when a search backend is configured, and the law tools always", async () => {
    const offered: string[][] = [];
    const spy: ToolCaller = async ({ tools }) => {
      offered.push((tools as { function: { name: string } }[]).map((t) => t.function.name));
      return { text: "DONE", toolCalls: [] };
    };
    await research({ db: noDb, turns: [], plan, hits: [], call: spy, env: {} });
    await research({
      db: noDb,
      turns: [],
      plan,
      hits: [],
      call: spy,
      env: { SEARXNG_URL: "http://s" },
    });
    expect(offered[0]).toEqual([
      "law_authorities",
      "law_search",
      "law_find_acts",
      "law_read_act",
      "law_read_provision",
    ]);
    expect(offered[1]).toEqual([...offered[0]!, "web_search", "web_read"]);
    expect(webLookupConfigured({ BRAVE_SEARCH_API_KEY: " " })).toBe(false);
  });

  it("stops after two rounds however much the model asks", async () => {
    let rounds = 0;
    const greedy: ToolCaller = async () => {
      rounds++;
      return { text: "", toolCalls: [{ id: "1", name: "law_nope", args: "{}" }] };
    };
    await research({ db: noDb, turns: [], plan, hits: [], call: greedy, env: {} });
    expect(rounds).toBe(2);
  });
});

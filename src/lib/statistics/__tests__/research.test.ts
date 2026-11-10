import { describe, expect, it, vi } from "vitest";
import { gather, MAX_SOURCES, writeReport, type ResearchTools, type ToolCall } from "../research";

const tools = (): ResearchTools => ({
  specs: [],
  run: vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === "read_series")
      return {
        summary: "2 facts",
        sources: [
          { text: "Estonia, 2025: 22%.", href: "https://solon.test/s" },
          { text: "Switzerland, 2025: 41.4%." },
        ],
      };
    if (name === "boom") throw new Error("database down");
    return { summary: `no tool ${String(args.x)}` };
  }),
});

const asks = (rounds: { name: string; args?: object }[][]): ToolCall => {
  let i = 0;
  return vi.fn(async () => {
    const round = rounds[i++] ?? [];
    return {
      text: round.length ? "" : "DONE",
      toolCalls: round.map((c, n) => ({
        id: `${i}-${n}`,
        name: c.name,
        args: JSON.stringify(c.args ?? {}),
      })),
    };
  });
};

describe("gathering sources", () => {
  it("numbers every fact a tool finds, in order, and tells the model what was added", async () => {
    const t = tools();
    const call = asks([[{ name: "read_series", args: { metric: "tax.income.top_rate" } }], []]);
    const run = await gather({ question: "Q?", call, tools: t, web: false });
    expect(run.sources).toEqual([
      { id: "F1", text: "Estonia, 2025: 22%.", href: "https://solon.test/s" },
      { id: "F2", text: "Switzerland, 2025: 41.4%." },
    ]);
    expect(run.steps).toEqual([{ name: "read_series", args: { metric: "tax.income.top_rate" } }]);
    const second = (
      call as unknown as { mock: { calls: { messages: { content: string }[] }[][] } }
    ).mock.calls[1]![0]!.messages.at(-1)!.content;
    expect(second).toContain("[F1] Estonia, 2025: 22%.");
  });

  it("does not number the same fact twice, and a failing tool does not stop the run", async () => {
    const call = asks([[{ name: "read_series" }, { name: "boom" }, { name: "read_series" }], []]);
    const run = await gather({ question: "Q?", call, tools: tools(), web: false });
    expect(run.sources.map((s) => s.id)).toEqual(["F1", "F2"]);
    expect(run.steps).toHaveLength(3);
  });

  it("stops after the model says DONE, and when no model can call tools, keeps what it has", async () => {
    const done = asks([[]]);
    expect(
      (await gather({ question: "Q?", call: done, tools: tools(), web: false })).sources,
    ).toEqual([]);
    const broken: ToolCall = async () => {
      throw new Error("no model");
    };
    expect(
      (await gather({ question: "Q?", call: broken, tools: tools(), web: false })).steps,
    ).toEqual([]);
  });

  it("caps the sources", async () => {
    const many: ResearchTools = {
      specs: [],
      run: async () => ({
        summary: "many",
        sources: Array.from({ length: 60 }, (_, i) => ({ text: `fact ${i}` })),
      }),
    };
    const run = await gather({
      question: "Q?",
      call: asks([[{ name: "x" }], []]),
      tools: many,
      web: false,
    });
    expect(run.sources).toHaveLength(MAX_SOURCES);
  });
});

describe("writing the report", () => {
  const sources = [
    { id: "F1", text: "Estonia, 2025: 22%." },
    { id: "F2", text: "Switzerland, 2025: 41.4%." },
  ];

  it("returns a report that stays inside its sources", async () => {
    const write = vi.fn().mockResolvedValue({
      text: "Estonia's rate was 22% [F1]; Switzerland's 41.4% [F2].",
      model: "m",
    });
    const out = await writeReport({ question: "Q?", sources, language: "en", write });
    expect(out).toMatchObject({ ok: true, cited: ["F1", "F2"], attempts: 1 });
  });

  it("asks again with the problems named, and drops a report that still invents a figure", async () => {
    const write = vi.fn().mockResolvedValue({ text: "Estonia's rate was 25% [F1]." });
    const out = await writeReport({ question: "Q?", sources, language: "en", write });
    expect(out.ok).toBe(false);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write.mock.calls[1]![0].at(-1).content).toContain("numbers that are in no fact: 25");
    expect(JSON.stringify(out)).not.toContain("25%");
  });

  it("gives the model only the sources, and says so when there are none", async () => {
    const write = vi.fn().mockResolvedValue({ text: "x" });
    await writeReport({ question: "Q?", sources: [], language: "de", write });
    expect(write.mock.calls[0]![0][0].content).toContain("(none found)");
    expect(write.mock.calls[0]![0][0].content).toContain("German");
  });
});

import { describe, expect, it } from "vitest";
import { chainOf } from "../places";
import { withParts } from "../place-law";

describe("the law on a country's page", () => {
  const held = new Map<string, number>([
    ["li", 3412],
    ["li7001", 40],
    ["li7011", 7],
  ]);

  it("lists each of Liechtenstein's eleven communes under the nation, with its own count", () => {
    const [nation, ...above] = withParts(chainOf("li"), held);
    expect(above).toEqual([]);
    expect(nation).toMatchObject({ key: "li", acts: 3412 });
    expect(nation!.parts).toHaveLength(11);
    expect(nation!.parts!.map((p) => p.key).sort()).toEqual(
      Array.from({ length: 11 }, (_, i) => `li${7001 + i}`),
    );
    expect(nation!.parts!.find((p) => p.key === "li7001")!.acts).toBe(40);
    expect(nation!.parts!.find((p) => p.key === "li7011")!.acts).toBe(7);
    // A commune with no texts yet is still listed, at none.
    expect(nation!.parts!.find((p) => p.key === "li7005")!.acts).toBe(0);
  });

  it("lists the communes by name", () => {
    const names = withParts(chainOf("li"), held)[0]!.parts!.map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("gives a commune's own page no list of parts, and keeps the nation above it", () => {
    const [commune, nation] = withParts(chainOf("li7001"), held);
    expect(commune).toEqual({ key: "li7001", name: "Vaduz", acts: 40, registered: 40 });
    expect(nation).toMatchObject({ key: "li", acts: 3412 });
    expect(nation!.parts).toBeUndefined();
  });

  it("counts what the register holds apart from what Solon holds the text of", () => {
    const registered = new Map([
      ["rso", 1849],
      ["li", 3412],
    ]);
    const [rso] = withParts(
      [{ key: "rso", label: "South Ossetia" }],
      new Map(),
      undefined,
      registered,
    );
    expect(rso).toMatchObject({ key: "rso", acts: 0, registered: 1849 });
    const [li] = withParts(chainOf("li"), new Map([["li", 3412]]), undefined, registered);
    expect(li).toMatchObject({ acts: 3412, registered: 3412 });
  });

  it("never reports fewer registered than held", () => {
    const [li] = withParts(chainOf("li"), new Map([["li", 10]]), undefined, new Map([["li", 3]]));
    expect(li!.registered).toBe(10);
  });
});

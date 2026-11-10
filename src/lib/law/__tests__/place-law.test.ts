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
    expect(commune).toEqual({ key: "li7001", name: "Vaduz", acts: 40 });
    expect(nation).toMatchObject({ key: "li", acts: 3412 });
    expect(nation!.parts).toBeUndefined();
  });
});
